import connectDB from "@/lib/connectDB"
import { Invoice } from "@/models/Invoice"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

const getStoreIdForUser = async (userId: string) => {
  const store = await Store.findOne({ clerkUserId: userId })
  return store?._id ?? null
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) return Response.json({ error: "Store not set up" }, { status: 403 })

  const today = startOfToday()
  const summaryAgg = await Invoice.aggregate([
    { $match: { storeId } },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ["$isEstimate", false] }, { $ifNull: ["$paidAmount", 0] }, 0],
          },
        },
        outstanding: {
          $sum: {
            $cond: [
              { $eq: ["$isEstimate", false] },
              {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $ifNull: ["$totalAmount", 0] },
                      { $ifNull: ["$paidAmount", 0] },
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$isEstimate", false] },
                  { $lt: [{ $ifNull: ["$paidAmount", 0] }, { $ifNull: ["$totalAmount", 0] }] },
                  { $lt: [{ $ifNull: ["$dueDate", new Date(8640000000000000)] }, today] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ])

  const summary = summaryAgg?.[0] ?? {
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstanding: 0,
    overdueCount: 0,
  }

  const recent = await Invoice.find({ storeId }).sort({ createdAt: -1 }).limit(6).lean()
  const recentInvoices = recent.map((inv) => {
    const isEstimate = !!inv.isEstimate
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
    const paidAmount = Number(inv.paidAmount ?? 0) || 0
    const totalAmount = Number(inv.totalAmount ?? 0) || 0

    const status =
      isEstimate
        ? "estimate"
        : totalAmount > 0 && paidAmount >= totalAmount
          ? "paid"
          : paidAmount > 0
            ? "partial"
            : inv.status === "overdue" || (dueDate && dueDate < today)
              ? "overdue"
              : "pending"

    return {
      id: String(inv._id),
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.clientName ?? "Customer",
      amount: totalAmount,
      paidAmount,
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString() : null,
      status,
      isEstimate,
    }
  })

  return Response.json({
    summary: {
      totalInvoices: summary.totalInvoices ?? 0,
      totalAmount: summary.totalAmount ?? 0,
      paidAmount: summary.paidAmount ?? 0,
      outstanding: summary.outstanding ?? 0,
      overdueCount: summary.overdueCount ?? 0,
    },
    recentInvoices,
  })
}
