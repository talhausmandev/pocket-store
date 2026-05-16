"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, ArrowRight } from "lucide-react"

type ParsedProduct = {
  name: string
  price: number
  stock: number
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") return reject(new Error("Invalid file result"))
      const commaIndex = result.indexOf(",")
      if (commaIndex === -1) return reject(new Error("Invalid base64 data"))
      resolve(result.slice(commaIndex + 1))
    }
    reader.readAsDataURL(file)
  })

const guessMimeType = (file: File) => {
  if (file.type) return file.type
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf")) return "application/pdf"
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (name.endsWith(".xls")) return "application/vnd.ms-excel"
  if (name.endsWith(".csv")) return "text/csv"
  return "application/octet-stream"
}

export default function AiPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [context, setContext] = useState("")
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const run = async () => {
    setError(null)
    setProducts([])
    if (!file) {
      setError("Select a file first")
      return
    }

    setIsRunning(true)
    try {
      const dataBase64 = await fileToBase64(file)
      const mimeType = guessMimeType(file)
      const res = await fetch("/api/ai/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType, dataBase64, context }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "AI request failed")
        return
      }
      const list: ParsedProduct[] = Array.isArray(data?.products) ? data.products : []
      setProducts(list)
      if (list.length === 0) setError("No products found")
    } catch {
      setError("AI request failed")
    } finally {
      setIsRunning(false)
    }
  }

  const openBulkEdit = () => {
    sessionStorage.setItem("pocket-store.bulkProductsDraft", JSON.stringify(products))
    router.push("/products/bulk-edit")
  }

  return (
    <main className="w-full text-xs">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="text-lg sm:text-xl font-bold leading-tight">AI</div>

        <section className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 mb-24">
        <div className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
          <div className="font-semibold">Extract Products</div>
          <div className="text-[10px] text-muted-foreground">
            Upload a PDF, image, or Excel file and extract products (name, price, stock). Add context to normalize names.
          </div>

          {error ? <div className="text-xs text-red-600">{error}</div> : null}

          <Input
            type="file"
            className="h-9"
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xls,.xlsx,application/pdf,image/*,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            placeholder='Custom AI context (example: "If same product has multiple qualities, rename like Rice (A), Rice (B)")'
          />

          <div className="flex gap-2">
            <Button className="h-8 bg-orange-500 hover:bg-orange-600" onClick={() => void run()} disabled={isRunning}>
              <Sparkles className="h-4 w-4 mr-2" />
              {isRunning ? "Thinking..." : "Run AI"}
            </Button>
            <Button variant="outline" className="h-8" onClick={() => setContext("")} disabled={isRunning}>
              Clear
            </Button>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Extracted Products</div>
            <Button
              className="h-8 bg-orange-500 hover:bg-orange-600"
              onClick={openBulkEdit}
              disabled={products.length === 0}
            >
              Bulk Edit
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-muted-foreground">No results yet.</div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_120px_120px] gap-2 text-[10px] text-muted-foreground px-1">
                <div>Name</div>
                <div>Price</div>
                <div>Stock</div>
              </div>
              {products.slice(0, 50).map((p, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px] gap-1 sm:gap-2 p-2 rounded-lg border bg-muted/20">
                  <div className="truncate font-medium sm:col-span-1">{p.name}</div>
                  <div className="flex items-center justify-between sm:block">
                    <span className="text-[10px] text-muted-foreground sm:hidden">Price</span>
                    <span>Rs {Number(p.price || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between sm:block">
                    <span className="text-[10px] text-muted-foreground sm:hidden">Stock</span>
                    <span>{Number(p.stock || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {products.length > 50 ? (
                <div className="text-[10px] text-muted-foreground">
                  Showing first 50 items. Use Bulk Edit to review all.
                </div>
              ) : null}
            </div>
          )}
        </div>
        </section>
      </div>
    </main>
  )
}
