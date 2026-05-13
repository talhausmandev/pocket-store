import connectDB from "@/lib/connectDB"
import { Invoice } from "@/models/Invoice"
import { Product } from "@/models/Product"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"
import { Types } from "mongoose"

export const dynamic = "force-dynamic"

type InvoiceStatus = "paid" | "pending" | "overdue" | "estimate" | "partial"

type InvoiceForStatus = {
  status: "paid" | "pending" | "overdue"
  isEstimate?: boolean
  dueDate?: Date | null
  paidAmount?: number
  totalAmount?: number
}

type InvoiceLean = {
  _id: Types.ObjectId
  invoiceNumber: string
  clientName?: string
  clientContact?: string
  totalAmount: number
  paidAmount?: number
  issueDate?: Date
  dueDate?: Date
  status: "paid" | "pending" | "overdue"
  isEstimate?: boolean
}

type ProductStockLean = {
  _id: Types.ObjectId
  stock?: number
}

const getStoreIdForUser = async (userId: string): Promise<Types.ObjectId | null> => {
  const store = await Store.findOne({ clerkUserId: userId })
  return store?._id ?? null
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const computeInvoiceStatus = (invoice: InvoiceForStatus): InvoiceStatus => {
  if (invoice.isEstimate) return "estimate"

  const paidAmount = Number(invoice.paidAmount ?? 0) || 0
  const totalAmount = Number(invoice.totalAmount ?? 0) || 0

  if (totalAmount > 0 && paidAmount >= totalAmount) return "paid"
  if (paidAmount > 0) return "partial"

  if (invoice.status === "paid") return "paid"
  if (invoice.status === "overdue") return "overdue"
  if (invoice.dueDate && invoice.dueDate < startOfToday()) return "overdue"
  return "pending"
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) return Response.json({ error: "Store not set up" }, { status: 403 })

  const invoices = await Invoice.find({ storeId })
    .sort({ createdAt: -1 })
    .lean<InvoiceLean[]>()

  const mapped = invoices
    .map((inv) => {
      const computedStatus = computeInvoiceStatus({
        status: inv.status,
        isEstimate: !!inv.isEstimate,
        dueDate: inv.dueDate ? new Date(inv.dueDate) : null,
        paidAmount: inv.paidAmount ?? 0,
        totalAmount: inv.totalAmount,
      })
      return {
        id: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.clientName ?? "Customer",
        amount: inv.totalAmount,
        paidAmount: inv.paidAmount ?? 0,
        issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString() : null,
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
        status: computedStatus,
        isEstimate: !!inv.isEstimate,
      }
    })

  return Response.json({ invoices: mapped })
}

type IncomingItem = {
  productId?: string
  name?: string
  rate?: number
  quantity?: number
  discountEnabled?: boolean
  discountType?: "percent" | "amount"
  discountValue?: number
}

type NormalizedItem = {
  productId: string
  name: string
  quantity: number
  rate: number
  discountEnabled: boolean
  discountType: "percent" | "amount"
  discountValue: number
}

const calculateItemTotal = (item: NormalizedItem) => {
  const lineTotal = item.quantity * item.rate
  if (!item.discountEnabled) return lineTotal
  const discountValue = Number(item.discountValue) || 0
  if (item.discountType === "percent") {
    return lineTotal * (1 - discountValue / 100)
  }
  return lineTotal - discountValue
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as
    | {
        invoiceNumber?: unknown
        issueDate?: unknown
        dueDate?: unknown
        isEstimate?: unknown
        clientId?: unknown
        clientName?: unknown
        clientContact?: unknown
        items?: unknown
        applyTax?: unknown
        taxRate?: unknown
        applyDiscount?: unknown
        discountType?: unknown
        discountValue?: unknown
      }
    | null

  const invoiceNumber = typeof body?.invoiceNumber === "string" ? body.invoiceNumber.trim() : ""
  const issueDateStr = typeof body?.issueDate === "string" ? body.issueDate : ""
  const dueDateStr = typeof body?.dueDate === "string" ? body.dueDate : ""
  const isEstimate = Boolean(body?.isEstimate)

  const clientId = typeof body?.clientId === "string" ? body.clientId : ""
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : ""
  const clientContact = typeof body?.clientContact === "string" ? body.clientContact.trim() : ""

  const applyTax = Boolean(body?.applyTax)
  const taxRate = Number(body?.taxRate ?? 0) || 0
  const applyDiscount = Boolean(body?.applyDiscount)
  const invoiceDiscountType: "percent" | "amount" =
    body?.discountType === "amount" ? "amount" : "percent"
  const invoiceDiscountValue = Number(body?.discountValue ?? 0) || 0

  const items: IncomingItem[] = Array.isArray(body?.items) ? (body.items as IncomingItem[]) : []

  if (!invoiceNumber) return Response.json({ error: "Invoice number is required" }, { status: 400 })
  if (!issueDateStr) return Response.json({ error: "Issue date is required" }, { status: 400 })
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Add at least one item" }, { status: 400 })
  }

  const issueDate = new Date(issueDateStr)
  if (Number.isNaN(issueDate.getTime())) {
    return Response.json({ error: "Invalid issue date" }, { status: 400 })
  }
  const dueDate = dueDateStr ? new Date(dueDateStr) : null
  if (dueDateStr && dueDate && Number.isNaN(dueDate.getTime())) {
    return Response.json({ error: "Invalid due date" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) return Response.json({ error: "Store not set up" }, { status: 403 })

  const normalizedItems: NormalizedItem[] = items.map((it): NormalizedItem => {
    const quantity = Number(it.quantity) || 0
    const rate = Number(it.rate) || 0
    return {
      productId: typeof it.productId === "string" ? it.productId : "",
      name: typeof it.name === "string" ? it.name : "",
      quantity,
      rate,
      discountEnabled: !!it.discountEnabled,
      discountType: it.discountType === "amount" ? "amount" : "percent",
      discountValue: Number(it.discountValue) || 0,
    }
  })

  for (const it of normalizedItems) {
    if (!it.productId) return Response.json({ error: "Each item must have productId" }, { status: 400 })
    if (!Types.ObjectId.isValid(it.productId)) {
      return Response.json({ error: "Invalid productId" }, { status: 400 })
    }
    if (!it.name) return Response.json({ error: "Each item must have name" }, { status: 400 })
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) return Response.json({ error: "Invalid quantity" }, { status: 400 })
    if (!Number.isFinite(it.rate) || it.rate < 0) return Response.json({ error: "Invalid rate" }, { status: 400 })
  }

  const subtotalAmount = normalizedItems.reduce((sum, it) => sum + it.quantity * it.rate, 0)
  const totalItemDiscounts = normalizedItems.reduce((sum, it) => sum + (it.quantity * it.rate - calculateItemTotal(it)), 0)

  const taxAmount = applyTax ? subtotalAmount * (taxRate / 100) : 0
  const invoiceDiscountAmount = applyDiscount
    ? invoiceDiscountType === "percent"
      ? subtotalAmount * (invoiceDiscountValue / 100)
      : invoiceDiscountValue
    : 0
  const discountAmount = totalItemDiscounts + invoiceDiscountAmount

  const totalAmount = subtotalAmount + taxAmount - discountAmount

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return Response.json({ error: "Invalid total amount" }, { status: 400 })
  }

  if (!isEstimate) {
    const productIds = normalizedItems.map((it) => new Types.ObjectId(it.productId))
    const products = await Product.find({ _id: { $in: productIds }, storeId })
      .select({ _id: 1, stock: 1 })
      .lean<ProductStockLean[]>()

    const stockById = new Map(products.map((p) => [p._id.toString(), p.stock ?? 0]))
    for (const it of normalizedItems) {
      const current = stockById.get(it.productId) ?? 0
      if (current < it.quantity) {
        return Response.json({ error: `Not enough stock for ${it.name}` }, { status: 400 })
      }
    }

    await Product.bulkWrite(
      normalizedItems.map((it) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(it.productId), storeId },
          update: { $inc: { stock: -it.quantity } },
        },
      }))
    )
  }

  const invoiceDoc = await Invoice.create({
    storeId,
    invoiceNumber,
    issueDate,
    dueDate: dueDate ?? undefined,
    isEstimate,
    clientId: clientId && Types.ObjectId.isValid(clientId) ? new Types.ObjectId(clientId) : undefined,
    clientName: clientName || undefined,
    clientContact: clientContact || undefined,
    items: normalizedItems.map((it) => ({
      productId: new Types.ObjectId(it.productId),
      name: it.name,
      price: it.rate,
      quantity: it.quantity,
      total: calculateItemTotal(it),
      discountEnabled: it.discountEnabled,
      discountType: it.discountType,
      discountValue: it.discountValue,
    })),
    subtotalAmount,
    taxRate: applyTax ? taxRate : 0,
    taxAmount,
    discountAmount,
    totalAmount,
    paidAmount: 0,
    status: "pending",
  })

  const savedStatus = computeInvoiceStatus({
    status: invoiceDoc.status,
    isEstimate: invoiceDoc.isEstimate,
    dueDate: invoiceDoc.dueDate ?? null,
  })

  return Response.json({
    invoice: {
      id: invoiceDoc._id.toString(),
      invoiceNumber: invoiceDoc.invoiceNumber,
      totalAmount: invoiceDoc.totalAmount,
      status: savedStatus,
    },
  })
}
