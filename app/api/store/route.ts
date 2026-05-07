import connectDB from "@/lib/connectDB"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic"

const findStoreForUser = async (userId: string) => {
  const byClerkId = await Store.findOne({ clerkUserId: userId })
  if (byClerkId) return byClerkId
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()
  const store = await findStoreForUser(userId).then((doc) => doc?.toObject() ?? null)

  return Response.json({ hasStore: !!store, store })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const address = typeof body?.address === "string" ? body.address.trim() : ""
  const contact = typeof body?.contact === "string" ? body.contact.trim() : ""

  if (!name) {
    return Response.json({ error: "Store name is required" }, { status: 400 })
  }

  await connectDB()
  const existing = await findStoreForUser(userId)
  if (existing) {
    return Response.json({ store: existing })
  }

  const store = await Store.create({
    clerkUserId: userId,
    name,
    address,
    contact,
  })

  return Response.json({ store })
}
