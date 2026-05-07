import connectDB from "@/lib/connectDB"
import { Product } from "@/models/Product"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

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
    .select({ name: 1, description: 1, price: 1, stock: 1 })
    .lean()

  return Response.json({
    products: products.map((p) => ({
      id: String((p)._id),
      name: p.name,
      description: p.description ?? "",
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
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const price = typeof body?.price === "number" ? body.price : Number(body?.price)
  const stock = typeof body?.stock === "number" ? body.stock : Number(body?.stock)

  if (!name) {
    return Response.json({ error: "Product name is required" }, { status: 400 })
  }
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Valid price is required" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const product = await Product.create({
    storeId,
    name,
    description,
    price,
    stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
  })

  return Response.json({
    product: {
      id: product._id.toString(),
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      stock: product.stock ?? 0,
    },
  })
}
