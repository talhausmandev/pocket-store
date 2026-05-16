"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, FileText, Wallet } from "lucide-react"
import Link from "next/link"

type Status = "paid" | "pending" | "overdue" | "estimate" | "partial"

interface Invoice {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  issueDate: string | null
  status: Status
}

export default function Home() {
  const [summary, setSummary] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstanding: 0,
    overdueCount: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)
      try {
        const res = await fetch("/api/report", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setError(typeof data?.error === "string" ? data.error : "Failed to load report")
          return
        }
        setSummary(data?.summary ?? summary)
        setRecentInvoices(Array.isArray(data?.recentInvoices) ? data.recentInvoices : [])
      } catch {
        setError("Failed to load report")
      }
    }

    const t = setTimeout(() => {
      void load()
    }, 0)

    return () => clearTimeout(t)
  }, [])

  const mainCards = [
    {
      title: "Total Invoices",
      value: String(summary.totalInvoices),
      icon: FileText,
      iconColor: "#E35912",
      iconBg: "#FDD296",
    },
    {
      title: "Total Amount",
      value: `Rs ${summary.totalAmount.toLocaleString()}`,
      icon: Wallet,
      iconColor: "#D97706",
      iconBg: "#f6e39c",
    },
    {
      title: "Paid Amount",
      value: `Rs ${summary.paidAmount.toLocaleString()}`,
      icon: CheckCircle,
      iconColor: "#16A34A",
      iconBg: "#DCFCE7",
    },
    {
      title: "Outstanding",
      value: `Rs ${summary.outstanding.toLocaleString()}`,
      icon: Clock,
      iconColor: "#DC2626",
      iconBg: "#e99f9f",
    },
  ]

  const statusStyles: Record<Status, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  estimate: "bg-gray-100 text-gray-700",
}

  return (
    <main className="w-full text-xs">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="text-lg sm:text-xl font-bold leading-tight">Dashboard</div>

        <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mainCards.map((card, index) => {
            const Icon = card.icon

            return (
              <div
                key={index}
                className="flex items-center justify-between gap-4 rounded-2xl border p-4 bg-white shadow-sm hover:shadow-md transition min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{card.title}</p>
                  <h2 className="text-sm font-semibold truncate">{card.value}</h2>
                  <p className="text-[10px] text-muted-foreground mt-1">This Month</p>
                </div>

                <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: card.iconBg }}>
                  <Icon className="h-4 w-4" style={{ color: card.iconColor }} />
                </div>
              </div>
            )
          })}
        </section>

        <section className="mt-4 p-4 bg-white shadow-md rounded-xl mb-20">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Recent Invoices</h2>
            <Link href="/invoices" className="text-primary whitespace-nowrap">View All</Link>
          </div>

          {error ? <div className="text-xs text-red-600 mt-2">{error}</div> : null}

          {recentInvoices.length === 0 ? (
            <div className="text-xs text-muted-foreground mt-3">No invoices yet.</div>
          ) : (
            recentInvoices.map((item) => (
              <div key={item.id} className="mt-3 space-y-1">
                <div className="flex items-center justify-between gap-3 font-semibold">
                  <div className="min-w-0 truncate">{item.invoiceNumber}</div>
                  <div className="shrink-0">Rs {item.amount.toLocaleString()}</div>
                </div>
                <div className="flex items-center justify-between gap-3 text-muted-foreground">
                  <div className="min-w-0">
                    <div className="truncate">{item.customerName}</div>
                    <div className="text-[10px]">
                      {item.issueDate ? new Date(item.issueDate).toLocaleDateString() : "-"}
                    </div>
                  </div>
                  <Badge className={statusStyles[item.status]}>{item.status}</Badge>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
