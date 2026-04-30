"use client"


import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import Link from "next/link"

interface Product {
    id: number
    name: string
    price: number
    description: string
}

export default function ProductsPage() {
    const products : Product[] = [
        {
            id: 1,
            name: "Laptop",
            price: 999.99,
            description: "High-performance laptop for work and gaming",
        },
        {
            id: 2,
            name: "Wireless Mouse",
            price: 29.99,
            description: "Ergonomic wireless mouse with long battery life",
        },
    ]



    return (
        <main className="w-full">
            <div className="w-full max-w-7xl mx-auto px-4 my-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-xl font-bold">
                        Products / Services
                    </div>

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
                                        {product.description}
                                    </p>
                                </div>
                            </div>

                            {/* RIGHT */}
                            <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-orange-600">
                                    ${product.price.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </main>
    )
}
