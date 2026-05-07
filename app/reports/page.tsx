"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"

type Status = "paid" | "pending" | "overdue"

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
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
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

        const overdueRes = await fetch("/api/invoice?status=overdue&limit=50", { cache: "no-store" })
        const overdueData = await overdueRes.json().catch(() => null)
        if (!overdueRes.ok) {
          setError(typeof overdueData?.error === "string" ? overdueData.error : "Failed to load overdue invoices")
          setOverdue([])
          return
        }
        setOverdue(Array.isArray(overdueData?.invoices) ? overdueData.invoices : [])
      } catch {
        setError("Failed to load report")
      }
    }

    const t = setTimeout(() => {
      void load()
    }, 0)

    return () => clearTimeout(t)
  }, [])

  return (
    <main className="w-full text-xs">
      <div className="w-[90%] flex justify-between my-2">
        <div className="text-xl mx-10 font-bold">Reports</div>
        <Link href="/invoices" className="text-primary">Invoices</Link>
      </div>

      {error ? <div className="w-[90%] text-xs text-red-600">{error}</div> : null}

      <section className="w-[90%] grid grid-cols-2 gap-3 my-4">
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

      <section className="w-[90%] mt-4 space-y-3 mb-24">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Overdue Invoices</div>
          <div className="text-muted-foreground text-[10px]">{summary.overdueCount} overdue</div>
        </div>

        {overdue.length === 0 ? (
          <div className="text-muted-foreground text-xs">No overdue invoices.</div>
        ) : null}

        {overdue.map((inv) => (
          <div key={inv.id} className="p-3 rounded-xl border bg-white shadow-sm">
            <div className="flex justify-between items-center">
              <div className="font-semibold">{inv.invoiceNumber}</div>
              <div className="font-semibold">Rs {inv.amount.toLocaleString()}</div>
            </div>
            <div className="flex justify-between items-center mt-1 text-muted-foreground">
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
    </main>
  )
}
