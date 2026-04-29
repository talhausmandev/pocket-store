"use client"

import { useState } from "react"

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
        <main className="w-full text-xs">

            <div className="w-[90%] flex justify-between my-2">
                <div className="text-xl font-bold mx-10">
                    Products / Services
                </div>

                <Link href="/products/create-product" className="h-6 w-6 flex items-center justify-center rounded-full bg-orange-500 text-white shadow">
                    <Plus className="h-4 w-4" />
                </Link>

            </div>

            {/* SEARCH */}
            <section className="w-[90%]">
                <Input
                    placeholder="Search products..."
                    className="h-9 text-xs"
                />
            </section>

            {/* PRODUCT LIST */}
            <section className="w-[90%] mt-4 space-y-3 mb-24">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition"
                    >
                        {/* LEFT */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">
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
                        <div className="text-right">
                            <p className="font-semibold text-orange-600">
                                ${product.price.toFixed(2)}
                            </p>
                        </div>
                    </div>
                ))}
            </section>
        </main>
    )
}