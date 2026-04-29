import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, FileText, Wallet } from "lucide-react"
import Link from "next/link"

type Status = "paid" | "pending" | "overdue"

interface Invoice{
  invoiceId: string
  customerName: string
  amount: number
  date: string
  status: Status
}

export default function Home() {
  const mainCards = [
    {
      title: "Total Invoices",
      value: "128",
      icon: FileText,
      iconColor: "#E35912",
      iconBg: "#FDD296",
    },
    {
      title: "Total Amount",
      value: "₹2,45,680",
      icon: Wallet,
      iconColor: "#D97706",
      iconBg: "#f6e39c",
    },
    {
      title: "Paid Amount",
      value: "₹1,75,420",
      icon: CheckCircle,
      iconColor: "#16A34A",
      iconBg: "#DCFCE7",
    },
    {
      title: "Outstanding",
      value: "₹70,260",
      icon: Clock,
      iconColor: "#DC2626",
      iconBg: "#e99f9f",
    },
  ]

  const recentInvoices : Invoice[] = [
  {
    invoiceId: "INV001",
    customerName: "Bilal Ahmed",
    amount: 12010,
    date: "12-06-2025",
    status: "paid",
  },
  {
    invoiceId: "INV002",
    customerName: "Ayesha Khan",
    amount: 8450,
    date: "14-06-2025",
    status: "pending",
  },
  {
    invoiceId: "INV003",
    customerName: "Rahul Sharma",
    amount: 15600,
    date: "16-06-2025",
    status: "paid",
  },
  {
    invoiceId: "INV004",
    customerName: "Zara Ali",
    amount: 7200,
    date: "18-06-2025",
    status: "overdue",
  },
  {
    invoiceId: "INV005",
    customerName: "Arjun Mehta",
    amount: 13400,
    date: "20-06-2025",
    status: "pending",
  },
  {
    invoiceId: "INV006",
    customerName: "Fatima Noor",
    amount: 9800,
    date: "22-06-2025",
    status: "paid",
  },
]
const statusStyles = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
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
          <Link href="/" className="text-primary">View All</Link>
        </div>

        {
          recentInvoices.map((item, index) => (
            <div key={index} className="my-3 flex flex-col gap-1">
              <div className="flex justify-between font-semibold">
                <div>
                  {item.invoiceId}
                </div>
                <div>
                  ${item.amount}
                </div>
              </div>
              <div className="flex justify-between text-muted-foreground items-center">
                <div>
                  <div>
                  {item.customerName}
                  </div>
                  <div>
                    {item.date}
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