"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import InvoicePDF from "@/components/InvoicePDF"
import { Download, Eye, Printer, X } from "lucide-react"
import { PDFDownloadLink, PDFViewer, pdf } from "@react-pdf/renderer"

type Status = "paid" | "pending" | "overdue"

type InvoiceItem = {
  productId: string
  name: string
  price: number
  quantity: number
  total: number
}

type Invoice = {
  id: string
  storeName: string
  invoiceNumber: string
  issueDate: string | null
  dueDate: string | null
  isEstimate: boolean
  clientName: string
  clientContact: string
  items: InvoiceItem[]
  subtotalAmount: number
  taxRate: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  status: Status
  storedStatus: Status
}

const statusStyles: Record<Status, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
}

const getDefaultMakeRealDueDate = (inv: Invoice | null) => {
  if (!inv || !inv.isEstimate) return ""
  if (inv.dueDate) {
    const d = new Date(inv.dueDate)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  const now = new Date()
  const todayLocalIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
  const due = new Date(todayLocalIso)
  due.setDate(due.getDate() + 7)
  const dueLocalIso = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
  return dueLocalIso
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const invoiceId = params?.id

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [makeRealDueDate, setMakeRealDueDate] = useState("")

  const loadInvoice = async (id: string) => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/invoice/${id}`, { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to load invoice")
        setInvoice(null)
        return
      }
      setInvoice(data?.invoice ?? null)
    } catch {
      setError("Failed to load invoice")
      setInvoice(null)
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (nextStatus: Status) => {
    if (!invoice) return
    setIsUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoice/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to update status")
        return
      }
      setInvoice((prev) => (prev ? { ...prev, ...data.invoice } : prev))
      router.refresh()
    } catch {
      setError("Failed to update status")
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    if (!invoiceId) return
    const t = setTimeout(() => {
      setMakeRealDueDate("")
      void loadInvoice(invoiceId)
    }, 0)
    return () => clearTimeout(t)
  }, [invoiceId])

  const effectiveMakeRealDueDate = makeRealDueDate || getDefaultMakeRealDueDate(invoice)

  const pdfCustomer = invoice
    ? { name: invoice.clientName, contact: invoice.clientContact || "" }
    : { name: "Customer", contact: "" }

  const pdfItems = (invoice?.items ?? []).map((it) => ({
    name: it.name,
    quantity: it.quantity,
    price: it.price,
  }))

  const printPdf = async () => {
    if (!invoice) return
    setIsPrinting(true)
    setError(null)
    try {
      const blob = await pdf(
        <InvoicePDF
          invoiceNumber={invoice.invoiceNumber}
          date={invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "-"}
          customer={pdfCustomer}
          items={pdfItems}
          subtotal={invoice.subtotalAmount}
          tax={invoice.taxAmount}
          taxRate={invoice.taxRate}
          discount={invoice.discountAmount}
          discountType="amount"
          total={invoice.totalAmount}
          companyName={invoice.storeName}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const w = window.open(url, "_blank")
      if (!w) {
        setError("Popup blocked. Allow popups to print.")
        URL.revokeObjectURL(url)
        return
      }

      w.addEventListener("load", () => {
        w.focus()
        w.print()
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      })
    } catch {
      setError("Failed to generate PDF")
    } finally {
      setIsPrinting(false)
    }
  }

  const makeRealBill = async () => {
    if (!invoice) return
    setIsUpdating(true)
    setError(null)
    try {
      const dueDateToSend = makeRealDueDate || getDefaultMakeRealDueDate(invoice)
      if (!dueDateToSend) {
        setError("Due date is required")
        return
      }
      const res = await fetch(`/api/invoice/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makeReal: true, dueDate: dueDateToSend }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to convert invoice")
        return
      }
      setInvoice((prev) => (prev ? { ...prev, ...data.invoice } : prev))
      router.refresh()
    } catch {
      setError("Failed to convert invoice")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <main className="w-full text-xs">
      <div className="w-[90%] flex justify-between my-2">
        <div className="text-xl mx-10 font-bold">Invoice</div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-8" onClick={() => router.push("/invoices")}>
            Back
          </Button>
        </div>
      </div>

      <section className="w-[90%] space-y-3 mb-24">
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
        {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
        {!isLoading && !invoice ? (
          <div className="text-xs text-muted-foreground">Invoice not found.</div>
        ) : null}

        {invoice ? (
          <div className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{invoice.invoiceNumber}</div>
                <div className="text-[10px] text-muted-foreground">
                  Issue: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "-"}
                  {invoice.dueDate ? ` • Due: ${new Date(invoice.dueDate).toLocaleDateString()}` : ""}
                </div>
              </div>
              <Badge className={statusStyles[invoice.status]}>{invoice.status}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                className="h-8 bg-orange-500 hover:bg-orange-600"
                disabled={!invoice || isPrinting}
                onClick={printPdf}
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? "Printing..." : "Print PDF"}
              </Button>
              <PDFDownloadLink
                document={
                  <InvoicePDF
                    invoiceNumber={invoice.invoiceNumber}
                    date={invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "-"}
                    customer={pdfCustomer}
                    items={pdfItems}
                    subtotal={invoice.subtotalAmount}
                    tax={invoice.taxAmount}
                    taxRate={invoice.taxRate}
                    discount={invoice.discountAmount}
                    discountType="amount"
                    total={invoice.totalAmount}
                    companyName={invoice.storeName}
                  />
                }
                fileName={`${invoice.invoiceNumber}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" className="h-8" disabled={loading}>
                    <Download className="h-4 w-4 mr-2" />
                    {loading ? "Generating..." : "Download PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
              <Button
                variant="outline"
                className="h-8"
                disabled={!invoice}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? <X className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? "Hide Preview" : "Preview PDF"}
              </Button>
            </div>

            {showPreview ? (
              <div className="border rounded-lg overflow-hidden h-[700px]">
                <PDFViewer width="100%" height="100%">
                  <InvoicePDF
                    invoiceNumber={invoice.invoiceNumber}
                    date={invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "-"}
                    customer={pdfCustomer}
                    items={pdfItems}
                    subtotal={invoice.subtotalAmount}
                    tax={invoice.taxAmount}
                    taxRate={invoice.taxRate}
                    discount={invoice.discountAmount}
                    discountType="amount"
                    total={invoice.totalAmount}
                    companyName={invoice.storeName}
                  />
                </PDFViewer>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-[10px] text-muted-foreground">Client</div>
                <div className="font-medium truncate">{invoice.clientName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{invoice.clientContact || "-"}</div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="text-[10px] text-muted-foreground">Bill Type</div>
                <div className="font-medium">{invoice.isEstimate ? "Estimate" : "Real"}</div>
                <div className="text-[10px] text-muted-foreground">
                  Paid: Rs {Number(invoice.paidAmount || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {invoice.isEstimate ? (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="font-medium">Convert to Real Bill</div>
                <div className="text-[10px] text-muted-foreground">
                  This will reduce product stock based on invoice items.
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input
                    type="date"
                    className="h-8 px-2 rounded-md border bg-white text-xs"
                    value={effectiveMakeRealDueDate}
                    onChange={(e) => setMakeRealDueDate(e.target.value)}
                  />
                  <Button
                    className="h-8 bg-orange-500 hover:bg-orange-600"
                    disabled={isUpdating || !effectiveMakeRealDueDate}
                    onClick={makeRealBill}
                  >
                    {isUpdating ? "Converting..." : "Make Real"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-8"
                disabled={isUpdating || invoice.isEstimate}
                onClick={() => updateStatus("pending")}
              >
                Pending
              </Button>
              <Button
                className="h-8 bg-orange-500 hover:bg-orange-600"
                disabled={isUpdating || invoice.isEstimate}
                onClick={() => updateStatus("paid")}
              >
                Mark Paid
              </Button>
              <Button
                variant="outline"
                className="h-8"
                disabled={isUpdating || invoice.isEstimate}
                onClick={() => updateStatus("overdue")}
              >
                Mark Overdue
              </Button>
            </div>
            {invoice.isEstimate ? (
              <div className="text-[10px] text-muted-foreground">
                Status changes are disabled for estimate invoices.
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="font-semibold">Items</div>
              <div className="space-y-2">
                {invoice.items.map((it, idx) => (
                  <div key={`${it.productId}-${idx}`} className="flex justify-between border rounded-lg p-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Qty {it.quantity} × Rs {it.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="font-semibold">Rs {Number(it.total).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs {Number(invoice.subtotalAmount).toLocaleString()}</span>
              </div>
              {invoice.taxAmount > 0 ? (
                <div className="flex justify-between">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>Rs {Number(invoice.taxAmount).toLocaleString()}</span>
                </div>
              ) : null}
              {invoice.discountAmount > 0 ? (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="text-red-600">-Rs {Number(invoice.discountAmount).toLocaleString()}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span>Rs {Number(invoice.totalAmount).toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Stored status: {invoice.storedStatus}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
