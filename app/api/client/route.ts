import connectDB from "@/lib/connectDB"
import { Client } from "@/models/Client"
import { Store } from "@/models/Store"
import { auth } from "@clerk/nextjs/server"
import { Types } from "mongoose"

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

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: unknown
        name?: unknown
        contact?: unknown
      }
    | null

  const id = typeof body?.id === "string" ? body.id : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const contact = typeof body?.contact === "string" ? body.contact.trim() : ""

  if (!id || !Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid client id" }, { status: 400 })
  }
  if (!name) {
    return Response.json({ error: "Client name is required" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const updated = await Client.findOneAndUpdate(
    { _id: new Types.ObjectId(id), storeId },
    { $set: { name, contact } },
    { new: true }
  )
    .select({ name: 1, contact: 1 })
    .lean<{ _id: Types.ObjectId; name: string; contact?: string } | null>()

  if (!updated) {
    return Response.json({ error: "Client not found" }, { status: 404 })
  }

  return Response.json({
    client: {
      id: updated._id.toString(),
      name: updated.name,
      contact: updated.contact ?? "",
    },
  })
}

export async function DELETE(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: unknown
      }
    | null

  const id = typeof body?.id === "string" ? body.id : ""
  if (!id || !Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid client id" }, { status: 400 })
  }

  await connectDB()
  const storeId = await getStoreIdForUser(userId)
  if (!storeId) {
    return Response.json({ error: "Store not set up" }, { status: 403 })
  }

  const deleted = await Client.findOneAndDelete({ _id: new Types.ObjectId(id), storeId })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId } | null>()

  if (!deleted) {
    return Response.json({ error: "Client not found" }, { status: 404 })
  }

  return Response.json({ ok: true, id: deleted._id.toString() })
}
