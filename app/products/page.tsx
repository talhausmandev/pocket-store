"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import Link from "next/link"

interface Product {
    id: string
    name: string
    price: number
    description: string
    stock: number
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadProducts = async () => {
            setError(null)
            setIsLoading(true)
            try {
                const res = await fetch("/api/product", { cache: "no-store" })
                const data = await res.json().catch(() => null)
                if (!res.ok) {
                    setError(typeof data?.error === "string" ? data.error : "Failed to load products")
                    setProducts([])
                    return
                }
                setProducts(Array.isArray(data?.products) ? data.products : [])
            } catch {
                setError("Failed to load products")
                setProducts([])
            } finally {
                setIsLoading(false)
            }
        }

        const t = setTimeout(() => {
            void loadProducts()
        }, 0)

        return () => clearTimeout(t)
    }, [])
    return (
        <main className="w-[90%]">
            <div className="w-full max-w-7xl mx-auto px-4 my-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-xl font-bold"> Products / Services</div>
                    <Link href="/products/create-product" className="h-10 w-10 flex items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition">
                        <Plus className="h-5 w-5" />
                    </Link>


                </div>

                {/* SEARCH */}
                <section className="w-full mb-4">
                    <Input
                        placeholder="Search products..."
                        className="h-9 text-xs"
                    />
                </section>

                {/* PRODUCT LIST */}
                <section className="w-full mt-4 space-y-3 mb-24">
                    {error ? <div className="text-xs text-red-600">{error}</div> : null}
                    {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
                    {!isLoading && products.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No products yet.</div>
                    ) : null}
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                        >
                            {/* LEFT */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold flex-shrink-0">
                                    {product.name.charAt(0)}
                                </div>

                                <div className="min-w-0">
                                    <p className="font-medium truncate">
                                        {product.name}
                                    </p>
                                    <p className="text-muted-foreground truncate text-[10px]">
                                        {product.description || "-"}
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-orange-600">
                                    Rs {product.price.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Stock: {product.stock}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </main>
    )
}
