import connectDB from "@/lib/connectDB"
import { Invoice } from "@/models/Invoice"
import { Product } from "@/models/Product"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"
import { Types } from "mongoose"

export const dynamic = "force-dynamic"

type InvoiceStatus = "paid" | "pending" | "overdue" | "estimate" | "partial"

type InvoiceLeanItem = {
  productId: Types.ObjectId
  name: string
  price: number
  quantity: number
  total: number
  discountEnabled?: boolean
  discountType?: "percent" | "amount"
  discountValue?: number
}

type InvoiceLean = {
  _id: Types.ObjectId
  storeId: Types.ObjectId
  invoiceNumber: string
  issueDate: Date
  dueDate?: Date
  isEstimate: boolean
  clientName?: string
  clientContact?: string
  items: InvoiceLeanItem[]
  subtotalAmount: number
  taxRate?: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
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

const computeInvoiceStatus = (invoice: {
  status: "paid" | "pending" | "overdue" | "estimate" | "partial",
  isEstimate: boolean
  dueDate?: Date
  paidAmount?: number
  totalAmount?: number
}): InvoiceStatus => {
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

type IncomingEditItem = {
  productId?: string
  name?: string
  rate?: number
  price?: number
  quantity?: number
  discountEnabled?: boolean
  discountType?: "percent" | "amount"
  discountValue?: number
}

type NormalizedEditItem = {
  productId: string
  name: string
  quantity: number
  rate: number
  discountEnabled: boolean
  discountType: "percent" | "amount"
  discountValue: number
}

const calculateItemTotal = (item: NormalizedEditItem) => {
  const lineTotal = item.quantity * item.rate
  if (!item.discountEnabled) return lineTotal
  const discountValue = Number(item.discountValue) || 0
  if (item.discountType === "percent") {
    return lineTotal * (1 - discountValue / 100)
  }
  return lineTotal - discountValue
}

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid invoice id" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) return Response.json({ error: "Store not set up" }, { status: 403 })

  const store = await Store.findById(storeId).select({ name: 1 }).lean<{ name?: string } | null>()

  const invoice = await Invoice.findOne({ _id: new Types.ObjectId(id), storeId }).lean<InvoiceLean | null>()
  if (!invoice) {
    return Response.json({ error: "Invoice not found" }, { status: 404 })
  }

  const computedStatus = computeInvoiceStatus({
    status: invoice.status,
    isEstimate: !!invoice.isEstimate,
    dueDate: invoice.dueDate,
    paidAmount: invoice.paidAmount,
    totalAmount: invoice.totalAmount,
  })

  return Response.json({
    invoice: {
      id: invoice._id.toString(),
      storeName: store?.name ?? "Pocket Store",
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString() : null,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
      isEstimate: !!invoice.isEstimate,
      clientName: invoice.clientName ?? "Customer",
      clientContact: invoice.clientContact ?? "",
      items: (invoice.items ?? []).map((it) => ({
        productId: it.productId?.toString?.() ?? "",
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        discountEnabled: !!it.discountEnabled,
        discountType: it.discountType === "amount" ? "amount" : "percent",
        discountValue: Number(it.discountValue) || 0,
      })),
      subtotalAmount: invoice.subtotalAmount,
      taxRate: invoice.taxRate ?? 0,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      status: computedStatus,
      storedStatus: invoice.status,
    },
  })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid invoice id" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as
    | { status?: unknown; makeReal?: unknown; dueDate?: unknown; items?: unknown; paymentAmount?: unknown }
    | null
  const editItemsRaw: IncomingEditItem[] = Array.isArray(body?.items) ? (body?.items as IncomingEditItem[]) : []
  const isEditItems = Array.isArray(body?.items)
  const nextStatus = body?.status
  const makeReal = body?.makeReal === true
  const dueDateStr = typeof body?.dueDate === "string" ? body.dueDate : ""

  const paymentAmountRaw = typeof body?.paymentAmount === "number" ? body.paymentAmount : Number(body?.paymentAmount)
  const isPayment = body?.paymentAmount !== undefined

  const isStatusUpdate = nextStatus === "paid" || nextStatus === "pending" || nextStatus === "overdue"
  if (!isEditItems && !isStatusUpdate && !makeReal && !isPayment) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) return Response.json({ error: "Store not set up" }, { status: 403 })

  const invoice = await Invoice.findOne({ _id: new Types.ObjectId(id), storeId })
  if (!invoice) {
    return Response.json({ error: "Invoice not found" }, { status: 404 })
  }

  if (isPayment) {
    if (invoice.isEstimate) {
      return Response.json({ error: "Estimate invoices cannot be paid" }, { status: 400 })
    }
    if (!Number.isFinite(paymentAmountRaw) || paymentAmountRaw <= 0) {
      return Response.json({ error: "Valid payment amount is required" }, { status: 400 })
    }

    const nextPaidAmount = Math.min(Number(invoice.totalAmount || 0) || 0, (Number(invoice.paidAmount || 0) || 0) + paymentAmountRaw)
    invoice.paidAmount = nextPaidAmount

    if (nextPaidAmount >= invoice.totalAmount) {
      invoice.status = "paid"
    } else {
      invoice.status = invoice.dueDate && invoice.dueDate < startOfToday() ? "overdue" : "pending"
    }
  } else if (isEditItems) {
    if (invoice.status === "paid") {
      return Response.json({ error: "Paid invoices cannot be edited" }, { status: 400 })
    }

    const normalizedItems: NormalizedEditItem[] = editItemsRaw.map((it): NormalizedEditItem => {
      const quantity = Number(it.quantity) || 0
      const rate = Number(typeof it.rate === "number" ? it.rate : it.price) || 0
      return {
        productId: typeof it.productId === "string" ? it.productId : "",
        name: typeof it.name === "string" ? it.name.trim() : "",
        quantity,
        rate,
        discountEnabled: !!it.discountEnabled,
        discountType: it.discountType === "amount" ? "amount" : "percent",
        discountValue: Number(it.discountValue) || 0,
      }
    })

    if (normalizedItems.length === 0) {
      return Response.json({ error: "Add at least one item" }, { status: 400 })
    }

    for (const it of normalizedItems) {
      if (!it.productId) return Response.json({ error: "Each item must have productId" }, { status: 400 })
      if (!Types.ObjectId.isValid(it.productId)) return Response.json({ error: "Invalid productId" }, { status: 400 })
      if (!it.name) return Response.json({ error: "Each item must have name" }, { status: 400 })
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) return Response.json({ error: "Invalid quantity" }, { status: 400 })
      if (!Number.isFinite(it.rate) || it.rate < 0) return Response.json({ error: "Invalid rate" }, { status: 400 })
    }

    const oldItemDiscounts = (invoice.items ?? []).reduce((sum: number, it: InvoiceLeanItem) => {
      const qty = Number(it.quantity) || 0
      const rate = Number(it.price) || 0
      const lineTotal = qty * rate
      if (!it.discountEnabled) return sum
      const dv = Number(it.discountValue) || 0
      const discounted =
        it.discountType === "amount" ? lineTotal - dv : lineTotal * (1 - dv / 100)
      return sum + (lineTotal - discounted)
    }, 0)

    const invoiceLevelDiscount = Math.max(0, Number(invoice.discountAmount || 0) - oldItemDiscounts)

    const subtotalAmount = normalizedItems.reduce((sum, it) => sum + it.quantity * it.rate, 0)
    const newItemDiscounts = normalizedItems.reduce((sum, it) => sum + (it.quantity * it.rate - calculateItemTotal(it)), 0)
    const taxRate = Number(invoice.taxRate ?? 0) || 0
    const taxAmount = taxRate > 0 ? subtotalAmount * (taxRate / 100) : 0
    const discountAmount = invoiceLevelDiscount + newItemDiscounts
    const totalAmount = subtotalAmount + taxAmount - discountAmount

    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return Response.json({ error: "Invalid total amount" }, { status: 400 })
    }

    if (!invoice.isEstimate) {
      const oldQtyByProductId = new Map<string, number>()
      for (const it of invoice.items ?? []) {
        const pid = it.productId?.toString?.() ?? ""
        if (!pid || !Types.ObjectId.isValid(pid)) continue
        oldQtyByProductId.set(pid, (oldQtyByProductId.get(pid) ?? 0) + Number(it.quantity ?? 0))
      }

      const newQtyByProductId = new Map<string, number>()
      const nameByProductId = new Map<string, string>()
      for (const it of normalizedItems) {
        newQtyByProductId.set(it.productId, (newQtyByProductId.get(it.productId) ?? 0) + it.quantity)
        if (!nameByProductId.has(it.productId)) nameByProductId.set(it.productId, it.name)
      }

      const productIds = new Set<string>([...oldQtyByProductId.keys(), ...newQtyByProductId.keys()])
      const deltas: Array<{ productId: string; delta: number }> = []
      const needMore: Array<{ productId: string; need: number }> = []

      for (const pid of productIds) {
        const oldQty = oldQtyByProductId.get(pid) ?? 0
        const newQty = newQtyByProductId.get(pid) ?? 0
        const diff = newQty - oldQty
        if (!diff) continue
        deltas.push({ productId: pid, delta: diff })
        if (diff > 0) needMore.push({ productId: pid, need: diff })
      }

      if (needMore.length > 0) {
        const pids = needMore.map((x) => new Types.ObjectId(x.productId))
        const products = await Product.find({ _id: { $in: pids }, storeId })
          .select({ _id: 1, stock: 1 })
          .lean<{ _id: Types.ObjectId; stock?: number }[]>()

        const stockById = new Map(products.map((p) => [p._id.toString(), p.stock ?? 0]))
        for (const x of needMore) {
          const current = stockById.get(x.productId) ?? 0
          if (current < x.need) {
            const label = nameByProductId.get(x.productId) ?? "product"
            return Response.json({ error: `Not enough stock for ${label}` }, { status: 400 })
          }
        }
      }

      if (deltas.length > 0) {
        await Product.bulkWrite(
          deltas.map((d) => ({
            updateOne: {
              filter: { _id: new Types.ObjectId(d.productId), storeId },
              update: { $inc: { stock: -d.delta } },
            },
          })),
          { ordered: false }
        )
      }

      invoice.status = invoice.dueDate && invoice.dueDate < startOfToday() ? "overdue" : "pending"
      invoice.paidAmount = 0
    } else {
      invoice.status = "pending"
      invoice.paidAmount = 0
    }

    invoice.items = normalizedItems.map((it) => ({
      productId: new Types.ObjectId(it.productId),
      name: it.name,
      price: it.rate,
      quantity: it.quantity,
      total: calculateItemTotal(it),
      discountEnabled: it.discountEnabled,
      discountType: it.discountType,
      discountValue: it.discountValue,
    }))

    invoice.subtotalAmount = subtotalAmount
    invoice.taxAmount = taxAmount
    invoice.discountAmount = discountAmount
    invoice.totalAmount = totalAmount
  } else if (makeReal) {
    if (!invoice.isEstimate) {
      return Response.json({ error: "Invoice is already real" }, { status: 400 })
    }

    const dueDate = dueDateStr ? new Date(dueDateStr) : invoice.dueDate ?? null
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return Response.json({ error: "Valid due date is required" }, { status: 400 })
    }

    const qtyByProductId = new Map<string, number>()
    for (const it of invoice.items ?? []) {
      const pid = it.productId?.toString?.()
      if (!pid || !Types.ObjectId.isValid(pid)) {
        return Response.json({ error: "Invalid product on invoice" }, { status: 400 })
      }
      qtyByProductId.set(pid, (qtyByProductId.get(pid) ?? 0) + Number(it.quantity ?? 0))
    }

    const productIds = Array.from(qtyByProductId.keys()).map((pid) => new Types.ObjectId(pid))
    const products = await Product.find({ _id: { $in: productIds }, storeId })
      .select({ _id: 1, stock: 1 })
      .lean<{ _id: Types.ObjectId; stock?: number }[]>()

    const stockById = new Map(products.map((p) => [p._id.toString(), p.stock ?? 0]))
    for (const [pid, qty] of qtyByProductId.entries()) {
      const current = stockById.get(pid) ?? 0
      if (current < qty) {
        return Response.json({ error: "Not enough stock to convert to real bill" }, { status: 400 })
      }
    }

    await Product.bulkWrite(
      Array.from(qtyByProductId.entries()).map(([pid, qty]) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(pid), storeId },
          update: { $inc: { stock: -qty } },
        },
      }))
    )

    invoice.isEstimate = false
    invoice.dueDate = dueDate
    invoice.paidAmount = 0
    invoice.status = dueDate < startOfToday() ? "overdue" : "pending"
  } else if (isStatusUpdate) {
    if (invoice.isEstimate) {
      invoice.status = "pending"
      invoice.paidAmount = 0
    } else {
      invoice.status = nextStatus
      if (nextStatus === "paid") invoice.paidAmount = invoice.totalAmount
    }
  }

  await invoice.save()

  const computedStatus = computeInvoiceStatus({
    status: invoice.status,
    isEstimate: invoice.isEstimate,
    dueDate: invoice.dueDate ?? undefined,
    paidAmount: invoice.paidAmount,
    totalAmount: invoice.totalAmount,
  })

  return Response.json({
    invoice: {
      id: invoice._id.toString(),
      isEstimate: invoice.isEstimate,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
      status: computedStatus,
      storedStatus: invoice.status,
      paidAmount: invoice.paidAmount,
      items: (invoice.items ?? []).map((it: InvoiceLeanItem) => ({
        productId: it.productId?.toString?.() ?? "",
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        discountEnabled: !!it.discountEnabled,
        discountType: it.discountType === "amount" ? "amount" : "percent",
        discountValue: Number(it.discountValue) || 0,
      })),
      subtotalAmount: invoice.subtotalAmount,
      taxRate: invoice.taxRate ?? 0,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
    },
  })
}