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
    <main className="w-full">
      <div className="text-xl mx-10 font-bold my-2">
        Dashboard
      </div>

      <section className="w-[90%] my-10 flex flex-wrap gap-4 justify-center">
        {mainCards.map((card, index) => {
          const Icon = card.icon

          return (
            <div
              key={index}
              className="flex items-center w-[46%] gap-5 justify-between rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition min-w-0"
            >
              {/* TEXT */}
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground">
                  {card.title}
                </p>

                <h2 className="text-xs font-semibold truncate">
                  {card.value}
                </h2>

                <p className="text-xs text-muted-foreground mt-1">
                  This Month
                </p>
              </div>

              {/* ICON */}
              <div
                className="p-1 rounded-xl shrink-0"
                style={{ backgroundColor: card.iconBg }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: card.iconColor }}
                />
              </div>
            </div>
          )
        })}
      </section>

      <section className="w-[90%] p-4 bg-white shadow-md shadow-[#816300] rounded-xl text-xs mb-20">
        <div className="flex justify-between">
          <h2 className="font-bold">Recent Invoices</h2>
          <Link href="/invoices" className="text-primary">View All</Link>
        </div>

        {error ? <div className="text-xs text-red-600 mt-2">{error}</div> : null}
        {
          recentInvoices.map((item) => (
            <div key={item.id} className="my-3 flex flex-col gap-1">
              <div className="flex justify-between font-semibold">
                <div>
                  {item.invoiceNumber}
                </div>
                <div>
                  Rs {item.amount.toLocaleString()}
                </div>
              </div>
              <div className="flex justify-between text-muted-foreground items-center">
                <div>
                  <div>
                  {item.customerName}
                  </div>
                  <div>
                    {item.issueDate ? new Date(item.issueDate).toLocaleDateString() : "-"}
                  </div>
                </div>
                <div>
                  <Badge className={statusStyles[item.status]} >{item.status}</Badge>
                </div>
              </div>
            </div>
          ))
        }

      </section>
    </main>
  )
}
