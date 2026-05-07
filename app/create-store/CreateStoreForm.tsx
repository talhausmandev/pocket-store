"use client"

import { useState, type SubmitEvent } from "react"
import { useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type FormState = {
  name: string
  address: string
  contact: string
}

export default function CreateStoreForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    contact: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError("Store name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          address: form.address.trim(),
          contact: form.contact.trim(),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to create store")
        return
      }

      router.replace("/")
      router.refresh()
    } catch {
      setError("Failed to create store")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-3">
      <div className="space-y-1">
        <div className="text-xl font-bold">Create your store</div>
        <div className="text-muted-foreground text-xs">
          Add your store details to start using Pocket Store.
        </div>
      </div>

      <Input
        placeholder="Store name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        disabled={isSubmitting}
      />
      <Input
        placeholder="Address"
        value={form.address}
        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
        disabled={isSubmitting}
      />
      <Input
        placeholder="Contact"
        value={form.contact}
        onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
        disabled={isSubmitting}
      />

      {error ? <div className="text-xs text-red-600">{error}</div> : null}

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create store"}
      </Button>
    </form>
  )
}
