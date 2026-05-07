import connectDB from "@/lib/connectDB"
import { Invoice } from "@/models/Invoice"
import { Product } from "@/models/Product"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"
import { Types } from "mongoose"

export const dynamic = "force-dynamic"

type InvoiceStatus = "paid" | "pending" | "overdue"

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
  status: InvoiceStatus
  isEstimate: boolean
  dueDate?: Date
}): InvoiceStatus => {
  if (invoice.isEstimate) return "pending"
  if (invoice.status === "paid") return "paid"
  if (invoice.status === "overdue") return "overdue"
  if (invoice.dueDate && invoice.dueDate < startOfToday()) return "overdue"
  return "pending"
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
    | { status?: unknown; makeReal?: unknown; dueDate?: unknown }
    | null
  const nextStatus = body?.status
  const makeReal = body?.makeReal === true
  const dueDateStr = typeof body?.dueDate === "string" ? body.dueDate : ""

  const isStatusUpdate = nextStatus === "paid" || nextStatus === "pending" || nextStatus === "overdue"
  if (!isStatusUpdate && !makeReal) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) return Response.json({ error: "Store not set up" }, { status: 403 })

  const invoice = await Invoice.findOne({ _id: new Types.ObjectId(id), storeId })
  if (!invoice) {
    return Response.json({ error: "Invoice not found" }, { status: 404 })
  }

  if (makeReal) {
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
      invoice.paidAmount = nextStatus === "paid" ? invoice.totalAmount : 0
    }
  }

  await invoice.save()

  const computedStatus = computeInvoiceStatus({
    status: invoice.status,
    isEstimate: invoice.isEstimate,
    dueDate: invoice.dueDate ?? undefined,
  })

  return Response.json({
    invoice: {
      id: invoice._id.toString(),
      isEstimate: invoice.isEstimate,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
      status: computedStatus,
      storedStatus: invoice.status,
      paidAmount: invoice.paidAmount,
    },
  })
}
