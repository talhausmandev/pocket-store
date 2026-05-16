"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { doneTopLoadingBar, startTopLoadingBar } from "@/components/TopLoadingBar"
import { Plus, Filter } from "lucide-react"
import Link from "next/link"

type Status = "paid" | "pending" | "overdue" | "estimate" | "partial"

interface Invoice {
    id: string
    invoiceNumber: string
    customerName: string
    amount: number
    paidAmount: number
    issueDate: string | null
    status: Status
    isEstimate: boolean
}

const statusStyles: Record<Status, string> = {
    paid: "bg-green-100 text-green-700",
    partial: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    overdue: "bg-red-100 text-red-700",
    estimate: "bg-gray-100 text-gray-700",
}

export default function InvoicesPage() {
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState<"all" | Status>("all")
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadInvoices = async () => {
        setError(null)
        setIsLoading(true)
        startTopLoadingBar()
        try {
            const url = new URL("/api/invoice", window.location.origin)
            url.searchParams.set("status", "all")

            const res = await fetch(url.toString(), { cache: "no-store" })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to load invoices")
                setInvoices([])
                return
            }
            setInvoices(Array.isArray(data?.invoices) ? data.invoices : [])
        } catch {
            setError("Failed to load invoices")
            setInvoices([])
        } finally {
            setIsLoading(false)
            doneTopLoadingBar()
        }
    }

    const getFilteredInvoices = (list: Invoice[], q: string, status: "all" | Status) => {
        const query = q.trim().toLowerCase()
        return list.filter((inv) => {
            if (status !== "all" && inv.status !== status) return false
            if (!query) return true

            return (
                inv.invoiceNumber.toLowerCase().includes(query) ||
                inv.customerName.toLowerCase().includes(query)
            )
        })
    }

    const filteredInvoices = getFilteredInvoices(invoices, search, activeTab)

    useEffect(() => {
        const t = setTimeout(() => void loadInvoices(), 0)
        return () => clearTimeout(t)
    }, [])

    return (
        <main className="w-full text-xs">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-lg sm:text-xl font-bold leading-tight">Invoices</div>
                    <Link
                        href="/invoices/create-invoice"
                        className="h-9 w-9 flex items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition shrink-0"
                    >
                        <Plus className="h-5 w-5" />
                    </Link>
                </div>

                <section className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Input
                        placeholder="Search invoices..."
                        className="text-xs h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                        <Filter className="h-4 w-4" />
                    </Button>
                </section>

                <section className="mt-3 flex gap-2 flex-wrap">
                    {(["all", "estimate", "pending", "partial", "overdue", "paid"] as const).map((tab) => (
                        <button
                            key={tab}
                            className={`px-3 py-1 rounded-full text-xs capitalize ${tab === activeTab
                                ? "bg-orange-500 text-white"
                                : "bg-muted text-muted-foreground"
                                }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </section>

                <section className="mt-4 space-y-2 sm:space-y-3 mb-24">
                    {error ? <div className="text-xs text-red-600">{error}</div> : null}
                    {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
                    {!isLoading && filteredInvoices.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                            {invoices.length === 0 ? "No invoices yet." : "No matching invoices."}
                        </div>
                    ) : null}
                    {filteredInvoices.map((item) => (
                        <Link
                            key={item.id}
                            href={`/invoices/${item.id}`}
                            className="block p-2 sm:p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 font-semibold truncate">{item.invoiceNumber}</div>
                                <div className="shrink-0 font-semibold">Rs {item.amount.toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between gap-3 mt-1 text-muted-foreground">
                                <div className="min-w-0">
                                    <p className="truncate">{item.customerName}</p>
                                    <p className="text-[10px]">
                                        {item.issueDate ? new Date(item.issueDate).toLocaleDateString() : "-"}
                                        {item.status === "partial" ? ` • Paid Rs ${Number(item.paidAmount || 0).toLocaleString()}` : ""}
                                    </p>
                                </div>

                                <Badge className={statusStyles[item.status]}>{item.status}</Badge>
                            </div>
                        </Link>
                    ))}
                </section>
            </div>
        </main>
    )
}
