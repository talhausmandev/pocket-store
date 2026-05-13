"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import InvoicePDF from "@/components/InvoicePDF"
import { Check, ChevronsUpDown, DollarSign, Download, Edit2, Percent, Plus, Printer, Save, Trash2, X, Eye } from "lucide-react"
import { PDFDownloadLink, PDFViewer, pdf } from "@react-pdf/renderer"

type Status = "paid" | "pending" | "overdue" | "estimate" | "partial"

type InvoiceItem = {
  productId: string
  name: string
  price: number
  quantity: number
  total: number
  discountEnabled?: boolean
  discountType?: "percent" | "amount"
  discountValue?: number
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
  partial: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  estimate: "bg-gray-100 text-gray-700",
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

type Product = { id: string; name: string; price: number; stock: number }

type EditRow = {
  rowId: string
  productId: string
  name: string
  rate: string
  quantity: string
  discountEnabled: boolean
  discountType: "percent" | "amount"
  discountValue: string
}

const makeRowId = () => {
  const c = globalThis.crypto as Crypto | undefined
  if (c && "randomUUID" in c && typeof c.randomUUID === "function") return c.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isValidObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value)

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
  const [paymentAmount, setPaymentAmount] = useState("")
  const [isPaying, setIsPaying] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)



  const [discountRowId, setDiscountRowId] = useState<string | null>(null)
  const [tempDiscountEnabled, setTempDiscountEnabled] = useState(false)
  const [tempDiscountType, setTempDiscountType] = useState<"percent" | "amount">("percent")
  const [tempDiscountValue, setTempDiscountValue] = useState("")

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

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/product", { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) return
      const list: Product[] = Array.isArray(data?.products) ? data.products : []
      setProducts(list)
    } catch {
      setProducts([])
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

  const pdfItems = (invoice?.items ?? []).map((it: InvoiceItem) => ({
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
          isEstimate={invoice.isEstimate}
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

  const openEdit = async () => {
    if (!invoice) return
    setError(null)
    setEditMode(true)
    setEditRows(
      (invoice.items ?? []).map((it) => ({
        rowId: makeRowId(),
        productId: it.productId ?? "",
        name: it.name ?? "",
        rate: String(Number.isFinite(it.price) ? it.price : 0),
        quantity: String(Number.isFinite(it.quantity) ? it.quantity : 1),
        discountEnabled: !!it.discountEnabled,
        discountType: it.discountType === "amount" ? "amount" : "percent",
        discountValue: String(Number(it.discountValue) || 0),
      }))
    )
    await loadProducts()
  }

  const cancelEdit = () => {
    setEditMode(false)
    setEditRows([])
  }

  const updateRow = (rowId: string, patch: Partial<EditRow>) => {
    setEditRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setEditRows((prev) => [
      ...prev,
      {
        rowId: makeRowId(),
        productId: "",
        name: "",
        rate: "0",
        quantity: "1",
        discountEnabled: false,
        discountType: "percent",
        discountValue: "0",
      },
    ])
  }

  const removeRow = (rowId: string) => {
    setEditRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  const onProductSelected = (rowId: string, productId: string) => {
    const p = products.find((x) => x.id === productId)
    if (!p) {
      updateRow(rowId, { productId })
      return
    }
    updateRow(rowId, {
      productId: p.id,
      name: p.name,
      rate: String(Number.isFinite(p.price) ? p.price : 0),
    })
  }


  

  

  

  const saveEdits = async () => {
    if (!invoice) return
    setError(null)
    if (editRows.length === 0) {
      setError("Add at least one item")
      return
    }

    const normalized = editRows
      .map((r) => {
        const productId = (r.productId || "").trim()
        const name = (r.name || "").trim()
        const rate = Number(r.rate)
        const quantity = Number(r.quantity)
        const discountValue = Number(r.discountValue)
        return {
          productId,
          name,
          rate,
          quantity,
          discountEnabled: !!r.discountEnabled,
          discountType: r.discountType === "amount" ? "amount" : "percent",
          discountValue: Number.isFinite(discountValue) ? discountValue : 0,
        }
      })
      .filter((x) => x.name || x.productId)

    for (const it of normalized) {
      if (!it.productId || !isValidObjectId(it.productId)) {
        setError("Select valid products for all items")
        return
      }
      if (!it.name) {
        setError("Each item must have a name")
        return
      }
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        setError("Invalid quantity")
        return
      }
      if (!Number.isFinite(it.rate) || it.rate < 0) {
        setError("Invalid rate")
        return
      }
    }

    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/invoice/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalized }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to update invoice")
        return
      }
      setInvoice((prev) => (prev ? { ...prev, ...data.invoice } : prev))
      setEditMode(false)
      setEditRows([])
      router.refresh()
    } catch {
      setError("Failed to update invoice")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const addPayment = async () => {
    if (!invoice) return
    setError(null)

    const amount = Number(paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount")
      return
    }

    setIsPaying(true)
    try {
      const res = await fetch(`/api/invoice/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAmount: amount }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to add payment")
        return
      }
      setInvoice((prev) => (prev ? { ...prev, ...data.invoice } : prev))
      setPaymentAmount("")
      router.refresh()
    } catch {
      setError("Failed to add payment")
    } finally {
      setIsPaying(false)
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
                    isEstimate={invoice.isEstimate}
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
                    isEstimate={invoice.isEstimate}
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
                  Paid: Rs {Number(invoice.paidAmount || 0).toLocaleString()} • Balance: Rs {Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)).toLocaleString()}
                </div>
              </div>
            </div>

            {!invoice.isEstimate ? (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="font-medium">Payments</div>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-8"
                    placeholder="Payment amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={isPaying || invoice.status === "paid"}
                  />
                  <Button
                    className="h-8 bg-orange-500 hover:bg-orange-600"
                    disabled={isPaying || invoice.status === "paid"}
                    onClick={() => void addPayment()}
                  >
                    {isPaying ? "Adding..." : "Add Payment"}
                  </Button>
                </div>
                {invoice.status === "paid" ? (
                  <div className="text-[10px] text-muted-foreground">Invoice is fully paid.</div>
                ) : null}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground">Payments are disabled for estimate invoices.</div>
            )
            }

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
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">Items</div>
                <Button
                  variant="outline"
                  className="h-8"
                  disabled={isUpdating || isSavingEdit || invoice.status === "paid"}
                  onClick={editMode ? cancelEdit : () => void openEdit()}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {editMode ? "Cancel Edit" : "Edit Items"}
                </Button>
              </div>

              {invoice.status === "paid" ? (
                <div className="text-[10px] text-muted-foreground">Paid invoices cannot be edited.</div>
              ) : null}

              {editMode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" className="h-8" onClick={addRow} disabled={isSavingEdit}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                    <Button className="h-8 bg-orange-500 hover:bg-orange-600" onClick={() => void saveEdits()} disabled={isSavingEdit}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingEdit ? "Saving..." : "Save"}
                    </Button>
                  </div>

                  {editRows.map((row) => {
                    const qty = Number(row.quantity) || 0
                    const rate = Number(row.rate) || 0
                    const lineTotal = qty * rate
                    const hasInList = !!products.find((p) => p.id === row.productId)
                    return (
                      <div key={row.rowId} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_44px] gap-2 p-2 rounded-lg border bg-muted/20">
                        <div className="space-y-1">
                          <select
                            className="h-9 w-full rounded-md border bg-white px-2 text-xs"
                            value={row.productId}
                            onChange={(e) => onProductSelected(row.rowId, e.target.value)}
                            disabled={isSavingEdit}
                          >
                            <option value="">Select product</option>
                            {!hasInList && row.productId ? (
                              <option value={row.productId}>{row.name || "Current product"}</option>
                            ) : null}
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            className="h-9 text-xs bg-white"
                            placeholder="Item name"
                            value={row.name}
                            onChange={(e) => updateRow(row.rowId, { name: e.target.value })}
                            disabled={isSavingEdit}
                          />
                          <div className="text-[10px] text-muted-foreground">Line total: Rs {Number(lineTotal).toLocaleString()}</div>
                        </div>
                        <Input
                          className="h-9 text-xs bg-white"
                          placeholder="Qty"
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => updateRow(row.rowId, { quantity: e.target.value })}
                          disabled={isSavingEdit}
                        />
                        <Input
                          className="h-9 text-xs bg-white"
                          placeholder="Price"
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.rate}
                          onChange={(e) => updateRow(row.rowId, { rate: e.target.value })}
                          disabled={isSavingEdit}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-600 hover:text-red-700"
                          onClick={() => removeRow(row.rowId)}
                          disabled={isSavingEdit}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
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
              )}
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
