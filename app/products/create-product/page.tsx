"use client"

import { useState, type SubmitEvent } from "react"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

const formatProductApiError = (res: Response, data: unknown, fallback: string) => {
    const error = (data as { error?: unknown } | null)?.error
    const message = typeof error === "string" ? error : ""
    const existing = (data as { existing?: unknown } | null)?.existing

    if (res.status === 409 && (message === "Product name must be unique" || message.includes("unique"))) {
        if (Array.isArray(existing) && existing.length > 0) {
            const names = existing.filter((x) => typeof x === "string").slice(0, 8).join(", ")
            return `Product name already exists (${names}). Please rename the product.`
        }
        return "Product name already exists. Please rename the product."
    }

    return message || fallback
}

export default function CreateProductPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        stock: "",
    })
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [appendStock, setAppendStock] = useState(true)

    const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)

        const name = formData.name.trim()
        const price = Number(formData.price)
        const stock = Number(formData.stock)

        if (!name) {
            setError("Product name is required")
            return
        }
        if (!Number.isFinite(price) || price < 0) {
            setError("Valid price is required")
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch("/api/product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    price,
                    stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
                    appendStock,
                }),
            })

            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(formatProductApiError(res, data, "Failed to create product"))
                return
            }

            router.push("/products")
            router.refresh()
        } catch {
            setError("Failed to create product")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement
        const { name, value, type } = target
        const checked = (target as HTMLInputElement).checked
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }))
    }

    return (
        <main className="w-full text-xs">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h1 className="text-lg sm:text-xl font-bold leading-tight">Create Product / Service</h1>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 w-full max-w-xl bg-white p-4 sm:p-6 rounded-lg shadow-md shadow-black/20"
                >
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Product / Service Name</label>
                        <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter product or service name"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Price</label>
                            <Input
                                name="price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium">Stock</label>
                            <Input
                                name="stock"
                                type="number"
                                value={formData.stock}
                                onChange={handleChange}
                                placeholder="0"
                                required
                                disabled={isSubmitting}
                            />
                            <div className="flex items-center gap-2 pt-1">
                                <Switch checked={appendStock} onCheckedChange={setAppendStock} />
                                <div className="text-[10px] text-muted-foreground">
                                    If product already exists, add to its stock
                                </div>
                            </div>
                        </div>
                    </div>

                    {error ? <div className="text-xs text-red-600">{error}</div> : null}

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                        <Button
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600"
                            disabled={isSubmitting}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSubmitting ? "Saving..." : "Save Product"}
                        </Button>
                        <Link href="/products">
                            <Button type="button" variant="outline" className="w-full sm:w-auto">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    )
}
