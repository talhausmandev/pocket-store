"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Filter } from "lucide-react"
import Link from "next/link"

type Status = "paid" | "pending" | "overdue"

interface Invoice {
    invoiceId: string
    customerName: string
    amount: number
    date: string
    status: Status
}

const invoices: Invoice[] = [
    {
        invoiceId: "INV-2024-00128",
        customerName: "Tech Solutions Pvt. Ltd.",
        amount: 24800,
        date: "12 May 2024",
        status: "paid",
    },
    {
        invoiceId: "INV-2024-00127",
        customerName: "Creative Studio",
        amount: 18600,
        date: "10 May 2024",
        status: "paid",
    },
    {
        invoiceId: "INV-2024-00126",
        customerName: "Bright Developers",
        amount: 36400,
        date: "08 May 2024",
        status: "pending",
    },
    {
        invoiceId: "INV-2024-00125",
        customerName: "NextGen Systems",
        amount: 52000,
        date: "05 May 2024",
        status: "overdue",
    },
]

const statusStyles: Record<Status, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    overdue: "bg-red-100 text-red-700",
}

export default function InvoicesPage() {
    return (
        <main className="w-full text-xs">

            <div className="w-[90%] flex justify-between my-2">

                <div className="text-xl mx-10 font-bold">
                    Invoices
                </div>

                <Link href={"/invoices/create-invoice"} className="h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow hidden md:flex">
                    <Plus className="h-5 w-5" />
                </Link>
            </div>

            {/* SEARCH + FILTER */}
            <section className="w-[90%] flex gap-2">
                <Input
                    placeholder="Search invoices..."
                    className="text-xs h-9"
                />
                <Button variant="outline" size="icon" className="h-9 w-9">
                    <Filter className="h-4 w-4" />
                </Button>
            </section>

            {/* FILTER TABS */}
            <section className="w-[90%] mt-3 flex gap-2">
                {["all", "paid", "pending", "overdue"].map((tab) => (
                    <button
                        key={tab}
                        className={`px-3 py-1 rounded-full text-xs capitalize ${tab === "all"
                            ? "bg-orange-500 text-white"
                            : "bg-muted text-muted-foreground"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </section>

            {/* INVOICE LIST */}
            <section className="w-[90%] mt-4 space-y-3 mb-24">
                {invoices.map((item, index) => (
                    <div
                        key={index}
                        className="p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                    >
                        {/* TOP ROW */}
                        <div className="flex justify-between items-center">
                            <div className="font-semibold">
                                {item.invoiceId}
                            </div>

                            <div className="font-semibold">
                                ₹{item.amount.toLocaleString()}
                            </div>
                        </div>

                        {/* BOTTOM ROW */}
                        <div className="flex justify-between items-center mt-1 text-muted-foreground">
                            <div className="min-w-0">
                                <p className="truncate">{item.customerName}</p>
                                <p className="text-[10px]">{item.date}</p>
                            </div>

                            <Badge className={statusStyles[item.status]}>
                                {item.status}
                            </Badge>
                        </div>
                    </div>
                ))}
            </section>
        </main>
    )
}