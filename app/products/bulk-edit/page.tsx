"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Save } from "lucide-react"

type DraftProduct = {
  id?: string
  name: string
  price: string
  stock: string
}

const STORAGE_KEY = "pocket-store.bulkProductsDraft"

const toNumber = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const formatBulkImportError = (res: Response, data: unknown, fallback: string) => {
  const error = (data as { error?: unknown } | null)?.error
  const message = typeof error === "string" ? error : ""
  const duplicates = (data as { duplicates?: unknown } | null)?.duplicates
  const existing = (data as { existing?: unknown } | null)?.existing

  if (message === "Product names must be unique" && Array.isArray(duplicates) && duplicates.length > 0) {
    const names = duplicates.filter((x) => typeof x === "string").slice(0, 12).join(", ")
    return `Duplicate product names found: ${names}. Please rename them.`
  }

  if (res.status === 409 && (message === "Product name must be unique" || message.includes("unique"))) {
    if (Array.isArray(existing) && existing.length > 0) {
      const names = existing.filter((x) => typeof x === "string").slice(0, 12).join(", ")
      return `These products already exist: ${names}. Please rename them.`
    }
    return "Some product names already exist. Please rename them."
  }

  return message || fallback
}

export default function BulkEditProductsPage() {
  const router = useRouter()
  const [items, setItems] = useState<DraftProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [appendStock, setAppendStock] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return
      const normalized: DraftProduct[] = parsed
        .map((p) => {
          const id = typeof (p as { id?: unknown })?.id === "string" ? (p as { id: string }).id : undefined
          const name = typeof (p as { name?: unknown })?.name === "string" ? (p as { name: string }).name : ""
          const price = typeof (p as { price?: unknown })?.price === "number"
            ? String((p as { price: number }).price)
            : typeof (p as { price?: unknown })?.price === "string"
              ? (p as { price: string }).price
              : "0"
          const stock = typeof (p as { stock?: unknown })?.stock === "number"
            ? String((p as { stock: number }).stock)
            : typeof (p as { stock?: unknown })?.stock === "string"
              ? (p as { stock: string }).stock
              : "0"
          return { id, name, price, stock }
        })
        .filter((p) => p.name.trim())
      setTimeout(() => {
        setItems(normalized)
        const editMode = normalized.some((p) => typeof p.id === "string" && p.id.trim())
        setIsEditMode(editMode)
        if (editMode) setAppendStock(false)
      }, 0);

      
    } catch {
      setTimeout(() => {
        setItems([])
      }, 0);
    }
  }, [])

  const updateRow = (index: number, patch: Partial<DraftProduct>) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setItems((prev) => [...prev, { name: "", price: "0", stock: "0" }])
  }

  const saveAll = async () => {
    setError(null)
    const normalized = items
      .map((p) => ({
        id: typeof p.id === "string" ? p.id : "",
        name: p.name.trim(),
        price: toNumber(p.price),
        stock: toNumber(p.stock),
      }))
      .filter((p) => p.name)

    if (normalized.length === 0) {
      setError("Add at least one product")
      return
    }

    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const p of normalized) {
      const key = p.name.toLocaleLowerCase()
      if (seen.has(key)) duplicates.add(p.name)
      else seen.add(key)
    }
    if (duplicates.size > 0) {
      setError(`Duplicate product names found: ${Array.from(duplicates).slice(0, 12).join(", ")}. Please rename them.`)
      return
    }

    const allowNegativeStock = isEditMode && appendStock

    for (const p of normalized) {
      if (!p.name) {
        setError("Product name is required")
        return
      }
      if (!Number.isFinite(p.price) || p.price < 0) {
        setError(`Valid price is required for ${p.name}`)
        return
      }
      if (!Number.isFinite(p.stock) || (!allowNegativeStock && p.stock < 0)) {
        setError(`Valid stock is required for ${p.name}`)
        return
      }
      if (isEditMode && !p.id) {
        setError("Invalid product selection")
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await fetch("/api/product", isEditMode
        ? {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: normalized.map(({ id, name, price, stock }) => ({ id, name, price, stock })),
            appendStock,
          }),
        }
        : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: normalized.map(({ name, price, stock }) => ({ name, price, stock })), appendStock }),
        })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(formatBulkImportError(res, data, isEditMode ? "Failed to update products" : "Failed to import products"))
        return
      }

      sessionStorage.removeItem(STORAGE_KEY)
      router.push("/products")
      router.refresh()
    } catch {
      setError(isEditMode ? "Failed to update products" : "Failed to import products")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="w-full text-xs">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg sm:text-xl font-bold leading-tight">Bulk Edit Products</div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 text-xs" onClick={() => router.push("/products")}>
              Back
            </Button>
          </div>
        </div>

        <section className="mt-3 space-y-3 mb-24">
          {error ? <div className="text-xs text-red-600">{error}</div> : null}

          <div className="p-3 sm:p-4 rounded-xl border bg-white shadow-sm space-y-3">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex items-center gap-2">
              <Switch checked={appendStock} onCheckedChange={setAppendStock} disabled={isSaving} />
              <div className="text-[10px] text-muted-foreground">
                {isEditMode ? "Append stock (treat Stock as change)" : "Append stock for existing products (same name)"}
              </div>
            </div>
            {!isEditMode ? (
              <Button variant="outline" className="h-9 text-xs" onClick={addRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            ) : null}
            <Button className="h-9 text-xs bg-orange-500 hover:bg-orange-600" onClick={saveAll} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? (isEditMode ? "Saving..." : "Importing...") : isEditMode ? "Save Changes" : "Import Products"}
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="text-muted-foreground">No imported products yet.</div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_140px_140px_44px] gap-2 text-[10px] text-muted-foreground px-1">
                <div>Name</div>
                <div>Price</div>
                <div>Stock</div>
                <div />
              </div>
              {items.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_44px] gap-2 p-2 rounded-lg border bg-muted/20"
                >
                  <Input
                    className="h-9 text-xs bg-white"
                    placeholder="Product name"
                    value={row.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                  />
                  <Input
                    className="h-9 text-xs bg-white"
                    placeholder="Price"
                    type="number"
                    value={row.price}
                    onChange={(e) => updateRow(idx, { price: e.target.value })}
                  />
                  <Input
                    className="h-9 text-xs bg-white"
                    placeholder={isEditMode && appendStock ? "Stock change" : "Stock"}
                    type="number"
                    min={isEditMode && appendStock ? undefined : 0}
                    value={row.stock}
                    onChange={(e) => updateRow(idx, { stock: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-600 hover:text-red-700"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          </div>
        </section>
      </div>
    </main>
  )
}
