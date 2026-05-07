import { redirect } from "next/navigation"

import connectDB from "@/lib/connectDB"
import { Store } from "@/models/Store"
import CreateStoreForm from "@/app/create-store/CreateStoreForm"
import { auth } from "@clerk/nextjs/server"

export default async function CreateStorePage() {
  const { userId } = await auth.protect()

  await connectDB()
  const existingStore =
    (await Store.findOne({ clerkUserId: userId })) ?? (await Store.findOne({ UserId: userId }))

  if (existingStore) {
    if (!existingStore.clerkUserId || existingStore.UserId !== userId) {
      existingStore.clerkUserId = userId
      existingStore.UserId = existingStore.UserId ?? userId
      await existingStore.save()
    }
    redirect("/")
  }

  return (
    <main className="w-full min-h-[70vh] flex items-center justify-center px-4">
      <CreateStoreForm />
    </main>
  )
}
