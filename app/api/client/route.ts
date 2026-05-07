import connectDB from "@/lib/connectDB"
import { Client } from "@/models/Client"
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

  const clients = await Client.find({ storeId })
    .sort({ createdAt: -1 })
    .select({ name: 1, contact: 1 })
    .lean()

  return Response.json({
    clients: clients.map((c) => ({
      id: String((c)._id),
      name: c.name,
      contact: c.contact ?? "",
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
  const contact = typeof body?.contact === "string" ? body.contact.trim() : ""

  if (!name) {
    return Response.json({ error: "Client name is required" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const client = await Client.create({
    storeId,
    name,
    contact,
  })

  return Response.json({
    client: {
      id: client._id.toString(),
      name: client.name,
      contact: client.contact ?? "",
    },
  })
}
