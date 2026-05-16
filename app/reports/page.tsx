"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"

type Status = "paid" | "pending" | "overdue" | "estimate" | "partial"

type Summary = {
  totalInvoices: number
  totalAmount: number
  paidAmount: number
  outstanding: number
  overdueCount: number
}

type InvoiceRow = {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  issueDate: string | null
  status: Status
}

const statusStyles: Record<Status, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  estimate: "bg-gray-100 text-gray-700",
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary>({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstanding: 0,
    overdueCount: 0,
  })
  const [overdue, setOverdue] = useState<InvoiceRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)
      try {
        const reportRes = await fetch("/api/report", { cache: "no-store" })
        const reportData = await reportRes.json().catch(() => null)
        if (!reportRes.ok) {
          setError(typeof reportData?.error === "string" ? reportData.error : "Failed to load report")
          return
        }
        setSummary(reportData?.summary ?? summary)

        const invoicesRes = await fetch("/api/invoice", { cache: "no-store" })
        const invoicesData = await invoicesRes.json().catch(() => null)
        if (!invoicesRes.ok) {
          setError(typeof invoicesData?.error === "string" ? invoicesData.error : "Failed to load invoices")
          setOverdue([])
          return
        }
        const allInvoices: InvoiceRow[] = Array.isArray(invoicesData?.invoices) ? invoicesData.invoices : []
        setOverdue(allInvoices.filter((inv) => inv.status === "overdue").slice(0, 50))
      } catch {
        setError("Failed to load report")
      }
    }

    const t = setTimeout(() => {
      void load()
    }, 0)

    return () => clearTimeout(t)
  }, [summary])

  return (
    <main className="w-full text-xs">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg sm:text-xl font-bold leading-tight">Reports</div>
          <Link href="/invoices" className="text-primary whitespace-nowrap">Invoices</Link>
        </div>

        {error ? <div className="text-xs text-red-600 mt-2">{error}</div> : null}

        <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-3 rounded-xl border bg-white shadow-sm">
            <div className="text-muted-foreground text-[10px]">Total Invoices</div>
            <div className="text-sm font-semibold">{summary.totalInvoices}</div>
          </div>
          <div className="p-3 rounded-xl border bg-white shadow-sm">
            <div className="text-muted-foreground text-[10px]">Total Amount</div>
            <div className="text-sm font-semibold">Rs {summary.totalAmount.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-xl border bg-white shadow-sm">
            <div className="text-muted-foreground text-[10px]">Paid</div>
            <div className="text-sm font-semibold">Rs {summary.paidAmount.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-xl border bg-white shadow-sm">
            <div className="text-muted-foreground text-[10px]">Outstanding</div>
            <div className="text-sm font-semibold">Rs {summary.outstanding.toLocaleString()}</div>
          </div>
        </section>

        <section className="mt-4 space-y-3 mb-24">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Overdue Invoices</div>
            <div className="text-muted-foreground text-[10px] whitespace-nowrap">{summary.overdueCount} overdue</div>
          </div>

          {overdue.length === 0 ? (
            <div className="text-muted-foreground text-xs">No overdue invoices.</div>
          ) : null}

          {overdue.map((inv) => (
            <div key={inv.id} className="p-2 sm:p-3 rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 font-semibold truncate">{inv.invoiceNumber}</div>
                <div className="shrink-0 font-semibold">Rs {inv.amount.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1 text-muted-foreground">
                <div className="min-w-0">
                  <div className="truncate">{inv.customerName}</div>
                  <div className="text-[10px]">
                    {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"}
                  </div>
                </div>
                <Badge className={statusStyles[inv.status]}>{inv.status}</Badge>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
