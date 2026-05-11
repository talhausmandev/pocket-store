"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Edit2, Plus, Trash2 } from "lucide-react"
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
    const [search, setSearch] = useState("")

    const [editOpen, setEditOpen] = useState(false)
    const [editProductId, setEditProductId] = useState("")
    const [editName, setEditName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editPrice, setEditPrice] = useState("")
    const [editStock, setEditStock] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

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

    const getFilteredProducts = (list: Product[], q: string) => {
        const query = q.trim().toLowerCase()
        if (!query) return list
        return list.filter((p) => {
            const name = (p.name ?? "").toLowerCase()
            const desc = (p.description ?? "").toLowerCase()
            return name.includes(query) || desc.includes(query)
        })
    }

    const filteredProducts = getFilteredProducts(products, search)

    const openEditProduct = (p: Product) => {
        setError(null)
        setEditProductId(p.id)
        setEditName(p.name ?? "")
        setEditDescription(p.description ?? "")
        setEditPrice(String(Number.isFinite(p.price) ? p.price : 0))
        setEditStock(String(Number.isFinite(p.stock) ? p.stock : 0))
        setEditOpen(true)
    }

    const saveProductEdit = async () => {
        setError(null)
        const id = editProductId
        const name = editName.trim()
        const description = editDescription.trim()
        const price = Number(editPrice)
        const stock = Number(editStock)

        if (!id) return
        if (!name) {
            setError("Product name is required")
            return
        }
        if (!Number.isFinite(price) || price < 0) {
            setError("Valid price is required")
            return
        }
        if (!Number.isFinite(stock) || stock < 0) {
            setError("Valid stock is required")
            return
        }

        setIsEditing(true)
        try {
            const res = await fetch("/api/product", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name, description, price, stock }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to update product")
                return
            }

            const updated: Product | null = data?.product ?? null
            if (updated) {
                setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            } else {
                const refresh = await fetch("/api/product", { cache: "no-store" })
                const refreshData = await refresh.json().catch(() => null)
                setProducts(Array.isArray(refreshData?.products) ? refreshData.products : [])
            }

            setEditOpen(false)
        } catch {
            setError("Failed to update product")
        } finally {
            setIsEditing(false)
        }
    }

    const requestDeleteProduct = (product: Product) => {
        setError(null)
        if (!product?.id) return
        setDeleteTarget(product)
        setDeleteOpen(true)
    }

    const deleteProduct = async () => {
        setError(null)
        if (!deleteTarget?.id) return
        const productId = deleteTarget.id

        setDeletingId(productId)
        try {
            const res = await fetch("/api/product", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: productId }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to delete product")
                return
            }
            setProducts((prev) => prev.filter((p) => p.id !== productId))
            setDeleteOpen(false)
            setDeleteTarget(null)
        } catch {
            setError("Failed to delete product")
        } finally {
            setDeletingId(null)
        }
    }

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
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </section>

                {/* PRODUCT LIST */}
                <section className="w-full mt-4 space-y-3 mb-24">
                    {error ? <div className="text-xs text-red-600">{error}</div> : null}
                    {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
                    {!isLoading && filteredProducts.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                            {products.length === 0 ? "No products yet." : "No matching products."}
                        </div>
                    ) : null}
                    {filteredProducts.map((product) => (
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
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                    <p className="font-semibold text-orange-600">
                                        Rs {product.price.toFixed(2)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Stock: {product.stock}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditProduct(product)}
                                    disabled={deletingId === product.id}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => requestDeleteProduct(product)}
                                    disabled={deletingId === product.id}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </section>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="text-xs">
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                            Update product details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            placeholder="Product Name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                        <Input
                            placeholder="Description"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                        />
                        <Input
                            placeholder="Price"
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                        />
                        <Input
                            placeholder="Stock"
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                        />
                        <Button
                            className="w-full bg-orange-500 hover:bg-orange-600"
                            disabled={isEditing}
                            onClick={saveProductEdit}
                        >
                            {isEditing ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open)
                    if (!open) setDeleteTarget(null)
                }}
            >
                <DialogContent className="text-xs">
                    <DialogHeader>
                        <DialogTitle>Delete Product</DialogTitle>
                        <DialogDescription>
                            This will permanently delete {deleteTarget?.name ? `"${deleteTarget.name}"` : "this product"}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteOpen(false)
                                setDeleteTarget(null)
                            }}
                            disabled={!!deletingId}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => void deleteProduct()}
                            disabled={!!deletingId}
                        >
                            {deletingId ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}
