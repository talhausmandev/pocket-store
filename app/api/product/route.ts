import connectDB from "@/lib/connectDB"
import { Product } from "@/models/Product"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"
import { Types } from "mongoose"

export const dynamic = "force-dynamic"

const NAME_COLLATION = { locale: "en", strength: 2 } as const

const nameKey = (name: string) => name.trim().toLocaleLowerCase()

const isDuplicateKeyError = (e: unknown) => {
  const code = (e as { code?: unknown } | null)?.code
  if (code === 11000) return true
  const msg = (e as { message?: unknown } | null)?.message
  return typeof msg === "string" && msg.includes("E11000")
}

const getStoreIdForUser = async (userId: string) => {
  const store = await Store.findOne({ clerkUserId: userId })
  return store?._id ?? null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const products = await Product.find({ storeId })
    .sort({ createdAt: -1 })
    .select({ name: 1, price: 1, stock: 1 })
    .lean()

  return Response.json({
    products: products.map((p) => ({
      id: String((p)._id),
      name: p.name,
      price: p.price,
      stock: p.stock ?? 0,
    })),
  })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const bulkProducts = Array.isArray(body?.products) ? (body.products as unknown[]) : null
  const appendStock = !!body?.appendStock

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  if (bulkProducts) {
    const normalized = bulkProducts
      .map((p) => {
        const name = typeof (p as { name?: unknown })?.name === "string" ? (p as { name: string }).name.trim() : ""
        const price = typeof (p as { price?: unknown })?.price === "number"
          ? (p as { price: number }).price
          : Number((p as { price?: unknown })?.price)
        const stock = typeof (p as { stock?: unknown })?.stock === "number"
          ? (p as { stock: number }).stock
          : Number((p as { stock?: unknown })?.stock)
        return { name, price, stock }
      })
      .filter((p) => p.name)

    if (normalized.length === 0) {
      return Response.json({ error: "Add at least one valid product" }, { status: 400 })
    }

    const uniqueByKey = new Map<string, { name: string; price: number; stock: number }>()
    const duplicateNames = new Set<string>()
    for (const p of normalized) {
      const key = nameKey(p.name)
      const existing = uniqueByKey.get(key)
      if (existing) {
        duplicateNames.add(p.name)
        if (appendStock) {
          existing.stock += Number.isFinite(p.stock) ? p.stock : 0
          if (Number.isFinite(p.price)) existing.price = p.price
        }
      } else {
        uniqueByKey.set(key, {
          name: p.name,
          price: Number.isFinite(p.price) ? p.price : 0,
          stock: Number.isFinite(p.stock) ? p.stock : 0,
        })
      }
    }

    if (!appendStock && duplicateNames.size > 0) {
      return Response.json(
        { error: "Product names must be unique", duplicates: Array.from(duplicateNames) },
        { status: 400 }
      )
    }

    const consolidated = Array.from(uniqueByKey.values())

    for (const p of consolidated) {
      if (!p.name) return Response.json({ error: "Product name is required" }, { status: 400 })
      if (!Number.isFinite(p.price) || p.price < 0) {
        return Response.json({ error: `Valid price is required for ${p.name}` }, { status: 400 })
      }
      if (!Number.isFinite(p.stock) || p.stock < 0) {
        return Response.json({ error: `Valid stock is required for ${p.name}` }, { status: 400 })
      }
    }

    if (appendStock) {
      try {
        const result = await Product.bulkWrite(
          consolidated.map((p) => ({
            updateOne: {
              filter: { storeId, name: p.name },
              update: {
                $setOnInsert: { storeId, name: p.name },
                $set: { price: p.price },
                $inc: { stock: p.stock },
              },
              upsert: true,
              collation: NAME_COLLATION,
            },
          })),
          { ordered: false }
        )

        return Response.json({
          insertedCount: result.upsertedCount ?? 0,
          updatedCount: result.matchedCount ?? 0,
          appendedStock: true,
        })
      } catch (e) {
        if (isDuplicateKeyError(e)) {
          return Response.json({ error: "Product name must be unique" }, { status: 409 })
        }
        throw e
      }
    }

    const uniqueNames = consolidated.map((p) => p.name)
    const existing = await Product.find({ storeId, name: { $in: uniqueNames } })
      .collation(NAME_COLLATION)
      .select({ name: 1 })
      .lean<{ name: string }[]>()

    if (existing.length > 0) {
      return Response.json(
        { error: "Product name must be unique", existing: existing.map((p) => p.name) },
        { status: 409 }
      )
    }

    const docs = consolidated.map((p) => ({
      storeId,
      name: p.name,
      price: p.price,
      stock: p.stock,
    }))

    let inserted: Array<{ _id: Types.ObjectId; name: string; price: number; stock?: number }> = []
    try {
      inserted = await Product.insertMany(docs, { ordered: false })
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        return Response.json({ error: "Product name must be unique" }, { status: 409 })
      }
      throw e
    }
    return Response.json({
      insertedCount: inserted.length,
      products: inserted.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        stock: p.stock ?? 0,
      })),
    })
  }

  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const price = typeof body?.price === "number" ? body.price : Number(body?.price)
  const stock = typeof body?.stock === "number" ? body.stock : Number(body?.stock)

  if (!name) {
    return Response.json({ error: "Product name is required" }, { status: 400 })
  }
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Valid price is required" }, { status: 400 })
  }

  const stockValue = Number.isFinite(stock) && stock >= 0 ? stock : 0

  if (appendStock) {
    const existing = await Product.findOne({ storeId, name }).collation(NAME_COLLATION).lean<{ _id: Types.ObjectId } | null>()

    if (existing?._id) {
      const updated = await Product.findOneAndUpdate(
        { _id: existing._id, storeId },
        { $set: { price }, $inc: { stock: stockValue } },
        { new: true }
      )
        .select({ name: 1, price: 1, stock: 1 })
        .lean<{ _id: Types.ObjectId; name: string; price: number; stock?: number } | null>()

      if (!updated) {
        return Response.json({ error: "Product not found" }, { status: 404 })
      }

      return Response.json({
        product: {
          id: updated._id.toString(),
          name: updated.name,
          price: updated.price,
          stock: updated.stock ?? 0,
        },
        appendedStock: true,
      })
    }
  }

  const existing = await Product.findOne({ storeId, name })
    .collation(NAME_COLLATION)
    .select({ _id: 1 })
    .lean()

  if (existing) {
    return Response.json({ error: "Product name must be unique" }, { status: 409 })
  }

  let product: { _id: Types.ObjectId; name: string; price: number; stock?: number }
  try {
    product = await Product.create({
      storeId,
      name,
      price,
      stock: stockValue,
    })
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      return Response.json({ error: "Product name must be unique" }, { status: 409 })
    }
    throw e
  }

  return Response.json({
    product: {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      stock: product.stock ?? 0,
    },
  })
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: unknown
        name?: unknown
        price?: unknown
        stock?: unknown
        stockDelta?: unknown
      }
    | null

  const id = typeof body?.id === "string" ? body.id : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const price = typeof body?.price === "number" ? body.price : Number(body?.price)
  const stock = typeof body?.stock === "number" ? body.stock : Number(body?.stock)
  const stockDeltaRaw = typeof body?.stockDelta === "number" ? body.stockDelta : Number(body?.stockDelta)
  const hasStockDelta = body?.stockDelta !== undefined

  if (!id || !Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid product id" }, { status: 400 })
  }
  if (!name) {
    return Response.json({ error: "Product name is required" }, { status: 400 })
  }
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Valid price is required" }, { status: 400 })
  }
  if (hasStockDelta) {
    if (!Number.isFinite(stockDeltaRaw)) {
      return Response.json({ error: "Valid stock change is required" }, { status: 400 })
    }
  } else {
    if (!Number.isFinite(stock) || stock < 0) {
      return Response.json({ error: "Valid stock is required" }, { status: 400 })
    }
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const objectId = new Types.ObjectId(id)

  const conflict = await Product.findOne({ storeId, name, _id: { $ne: objectId } })
    .collation(NAME_COLLATION)
    .select({ _id: 1 })
    .lean()

  if (conflict) {
    return Response.json({ error: "Product name must be unique" }, { status: 409 })
  }

  let updated: { _id: Types.ObjectId; name: string; price: number; stock?: number } | null = null
  try {
    if (hasStockDelta) {
      updated = await Product.findOneAndUpdate(
        { _id: objectId, storeId },
        [
          { $set: { name, price } },
          {
            $set: {
              stock: {
                $max: [0, { $add: [{ $ifNull: ["$stock", 0] }, stockDeltaRaw] }],
              },
            },
          },
        ],
        { new: true }
      )
        .select({ name: 1, price: 1, stock: 1 })
        .lean<{ _id: Types.ObjectId; name: string; price: number; stock?: number } | null>()
    } else {
      updated = await Product.findOneAndUpdate(
        { _id: objectId, storeId },
        { $set: { name, price, stock } },
        { new: true }
      )
        .select({ name: 1, price: 1, stock: 1 })
        .lean<{ _id: Types.ObjectId; name: string; price: number; stock?: number } | null>()
    }
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      return Response.json({ error: "Product name must be unique" }, { status: 409 })
    }
    throw e
  }

  if (!updated) {
    return Response.json({ error: "Product not found" }, { status: 404 })
  }

  return Response.json({
    product: {
      id: updated._id.toString(),
      name: updated.name,
      price: updated.price,
      stock: updated.stock ?? 0,
    },
  })
}

export async function PUT(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        updates?: unknown
        appendStock?: unknown
      }
    | null

  const appendStock = !!body?.appendStock

  const updatesRaw = Array.isArray(body?.updates) ? (body?.updates as unknown[]) : []
  if (updatesRaw.length === 0) {
    return Response.json({ error: "Add at least one product" }, { status: 400 })
  }

  const normalized = updatesRaw
    .map((p) => {
      const id = typeof (p as { id?: unknown })?.id === "string" ? (p as { id: string }).id : ""
      const name = typeof (p as { name?: unknown })?.name === "string" ? (p as { name: string }).name.trim() : ""
      const price = typeof (p as { price?: unknown })?.price === "number"
        ? (p as { price: number }).price
        : Number((p as { price?: unknown })?.price)
      const stock = typeof (p as { stock?: unknown })?.stock === "number"
        ? (p as { stock: number }).stock
        : Number((p as { stock?: unknown })?.stock)
      return { id, name, price, stock }
    })
    .filter((p) => p.id || p.name)

  if (normalized.length === 0) {
    return Response.json({ error: "Add at least one product" }, { status: 400 })
  }

  for (const p of normalized) {
    if (!p.id || !Types.ObjectId.isValid(p.id)) return Response.json({ error: "Invalid product id" }, { status: 400 })
    if (!p.name) return Response.json({ error: "Product name is required" }, { status: 400 })
    if (!Number.isFinite(p.price) || p.price < 0) return Response.json({ error: "Valid price is required" }, { status: 400 })
    if (!Number.isFinite(p.stock) || (!appendStock && p.stock < 0)) {
      return Response.json({ error: "Valid stock is required" }, { status: 400 })
    }
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const ids = normalized.map((p) => new Types.ObjectId(p.id))
  const uniqueNamesByKey = new Map<string, string>()
  const duplicateNames = new Set<string>()
  for (const p of normalized) {
    const key = nameKey(p.name)
    if (uniqueNamesByKey.has(key)) duplicateNames.add(p.name)
    else uniqueNamesByKey.set(key, p.name)
  }
  if (duplicateNames.size > 0) {
    return Response.json(
      { error: "Product names must be unique", duplicates: Array.from(duplicateNames) },
      { status: 400 }
    )
  }

  const names = Array.from(uniqueNamesByKey.values())
  const conflicts = await Product.find({
    storeId,
    name: { $in: names },
    _id: { $nin: ids },
  })
    .collation(NAME_COLLATION)
    .select({ name: 1 })
    .lean<{ name: string }[]>()

  if (conflicts.length > 0) {
    return Response.json(
      { error: "Product name must be unique", existing: conflicts.map((p) => p.name) },
      { status: 409 }
    )
  }

  try {
    const result = await Product.bulkWrite(
      normalized.map((p) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(p.id), storeId },
          update: appendStock
            ? [
              { $set: { name: p.name, price: p.price } },
              {
                $set: {
                  stock: {
                    $max: [0, { $add: [{ $ifNull: ["$stock", 0] }, p.stock] }],
                  },
                },
              },
            ]
            : { $set: { name: p.name, price: p.price, stock: p.stock } },
          collation: NAME_COLLATION,
        },
      })),
      { ordered: false }
    )

    return Response.json({
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0,
    })
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      return Response.json({ error: "Product name must be unique" }, { status: 409 })
    }
    throw e
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: unknown
        ids?: unknown
      }
    | null

  const idsRaw = Array.isArray(body?.ids) ? (body?.ids as unknown[]) : null
  const id = typeof body?.id === "string" ? body.id : ""

  const ids = idsRaw
    ? Array.from(
        new Set(
          idsRaw
            .filter((x): x is string => typeof x === "string")
            .filter((x) => Types.ObjectId.isValid(x))
        )
      )
    : []

  if (idsRaw && ids.length === 0) {
    return Response.json({ error: "Invalid product ids" }, { status: 400 })
  }

  if (!idsRaw && (!id || !Types.ObjectId.isValid(id))) {
    return Response.json({ error: "Invalid product id" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  if (idsRaw) {
    const objectIds = ids.map((x) => new Types.ObjectId(x))
    const result = await Product.deleteMany({ _id: { $in: objectIds }, storeId })
    return Response.json({ ok: true, deletedCount: result.deletedCount ?? 0, ids })
  }

  const deleted = await Product.findOneAndDelete({ _id: new Types.ObjectId(id), storeId })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId } | null>()

  if (!deleted) {
    return Response.json({ error: "Product not found" }, { status: 404 })
  }

  return Response.json({ ok: true, id: deleted._id.toString() })
}