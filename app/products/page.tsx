"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit2, FileSpreadsheet, Plus, Sparkles, Trash2 } from "lucide-react"
import Link from "next/link"

interface Product {
    id: string
    name: string
    price: number
    stock: number
}

const BULK_EDIT_STORAGE_KEY = "pocket-store.bulkProductsDraft"

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

export default function ProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    const [editOpen, setEditOpen] = useState(false)
    const [editProductId, setEditProductId] = useState("")
    const [editName, setEditName] = useState("")
    const [editPrice, setEditPrice] = useState("")
    const [editStock, setEditStock] = useState("")
    const [editStockBase, setEditStockBase] = useState("")
    const [editAppendStock, setEditAppendStock] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

    const [importOpen, setImportOpen] = useState(false)
    const [importMode, setImportMode] = useState<"excel" | "json" | "ai">("excel")
    const [importFile, setImportFile] = useState<File | null>(null)
    const [aiContext, setAiContext] = useState("")
    const [isImporting, setIsImporting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)

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
            return name.includes(query)
        })
    }

    const filteredProducts = getFilteredProducts(products, search)

    const toggleSelected = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    const clearSelection = () => setSelectedIds([])

    const selectAllFiltered = () => setSelectedIds(filteredProducts.map((p) => p.id))

    const openBulkEditSelected = () => {
        setError(null)
        const selected = products
            .filter((p) => selectedIds.includes(p.id))
            .map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }))

        if (selected.length === 0) return

        sessionStorage.setItem(BULK_EDIT_STORAGE_KEY, JSON.stringify(selected))
        router.push("/products/bulk-edit")
    }

    const requestBulkDeleteSelected = () => {
        setError(null)
        if (selectedIds.length === 0) return
        setBulkDeleteOpen(true)
    }

    const bulkDeleteSelected = async () => {
        setError(null)
        if (selectedIds.length === 0) return

        setIsBulkDeleting(true)
        try {
            const res = await fetch("/api/product", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(typeof data?.error === "string" ? data.error : "Failed to delete products")
                return
            }

            setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)))
            setBulkDeleteOpen(false)
            clearSelection()
            setSelectMode(false)
        } catch {
            setError("Failed to delete products")
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const openEditProduct = (p: Product) => {
        setError(null)
        setEditProductId(p.id)
        setEditName(p.name ?? "")
        setEditPrice(String(Number.isFinite(p.price) ? p.price : 0))
        const base = String(Number.isFinite(p.stock) ? p.stock : 0)
        setEditStock(base)
        setEditStockBase(base)
        setEditAppendStock(false)
        setEditOpen(true)
    }

    const saveProductEdit = async () => {
        setError(null)
        const id = editProductId
        const name = editName.trim()
        const price = Number(editPrice)
        const stockOrDelta = Number(editStock)

        if (!id) return
        if (!name) {
            setError("Product name is required")
            return
        }
        if (!Number.isFinite(price) || price < 0) {
            setError("Valid price is required")
            return
        }
        if (!Number.isFinite(stockOrDelta) || (editAppendStock ? false : stockOrDelta < 0)) {
            setError(editAppendStock ? "Valid stock to add is required" : "Valid stock is required")
            return
        }
        if (editAppendStock && stockOrDelta < 0) {
            setError("Valid stock to add is required")
            return
        }

        setIsEditing(true)
        try {
            const res = await fetch("/api/product", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    editAppendStock ? { id, name, price, stockDelta: stockOrDelta } : { id, name, price, stock: stockOrDelta }
                ),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setError(formatProductApiError(res, data, "Failed to update product"))
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
        if (name.endsWith(".json")) return "application/json"
        return "application/octet-stream"
    }

    const parseJsonProducts = (raw: unknown) => {
        const arr = Array.isArray(raw) ? raw : Array.isArray((raw as { products?: unknown })?.products) ? (raw as { products: unknown[] }).products : []
        const products = arr
            .map((p) => {
                const name =
                    typeof (p as { name?: unknown })?.name === "string"
                        ? (p as { name: string }).name
                        : typeof (p as { productName?: unknown })?.productName === "string"
                            ? (p as { productName: string }).productName
                            : ""
                const price =
                    typeof (p as { price?: unknown })?.price === "number"
                        ? (p as { price: number }).price
                        : Number((p as { price?: unknown })?.price ?? (p as { rate?: unknown })?.rate ?? 0)
                const stock =
                    typeof (p as { stock?: unknown })?.stock === "number"
                        ? (p as { stock: number }).stock
                        : Number((p as { stock?: unknown })?.stock ?? (p as { qty?: unknown })?.qty ?? 0)
                return {
                    name: String(name).trim(),
                    price: Number.isFinite(price) ? price : 0,
                    stock: Number.isFinite(stock) ? stock : 0,
                }
            })
            .filter((p) => p.name)
        return products
    }

    const parseCsvProducts = (text: string) => {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        if (lines.length === 0) return []

        const delimiter = lines[0].includes("\t") ? "\t" : ","
        const splitRow = (row: string) => row.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""))

        const header = splitRow(lines[0]).map((h) => h.toLowerCase())
        const hasHeader = header.some((h) => ["name", "product", "productname", "price", "rate", "stock", "qty", "quantity"].includes(h))

        const startIndex = hasHeader ? 1 : 0
        const nameIndex = hasHeader ? header.findIndex((h) => h === "name" || h === "product" || h === "productname") : 0
        const priceIndex = hasHeader ? header.findIndex((h) => h === "price" || h === "rate") : 1
        const stockIndex = hasHeader ? header.findIndex((h) => h === "stock" || h === "qty" || h === "quantity") : 2

        const products = lines.slice(startIndex).map((row) => {
            const cols = splitRow(row)
            const name = (cols[nameIndex] ?? "").trim()
            const price = Number(cols[priceIndex] ?? 0)
            const stock = Number(cols[stockIndex] ?? 0)
            return {
                name,
                price: Number.isFinite(price) ? price : 0,
                stock: Number.isFinite(stock) ? stock : 0,
            }
        }).filter((p) => p.name)

        return products
    }

    const openImport = (mode: "excel" | "json" | "ai") => {
        setImportError(null)
        setImportMode(mode)
        setImportFile(null)
        setAiContext("")
        setImportOpen(true)
    }

    const goToBulkEdit = (productsToEdit: Array<{ name: string; price: number; stock: number }>) => {
        sessionStorage.setItem(BULK_EDIT_STORAGE_KEY, JSON.stringify(productsToEdit))
        router.push("/products/bulk-edit")
    }

    const runImport = async () => {
        setImportError(null)
        if (!importFile) {
            setImportError("Select a file first")
            return
        }

        setIsImporting(true)
        try {
            if (importMode === "json") {
                const text = await importFile.text()
                const parsed = JSON.parse(text) as unknown
                const products = parseJsonProducts(parsed)
                if (products.length === 0) {
                    setImportError("No products found in JSON")
                    return
                }
                setImportOpen(false)
                goToBulkEdit(products)
                return
            }

            if (importMode === "excel") {
                const name = importFile.name.toLowerCase()
                if (name.endsWith(".csv")) {
                    const text = await importFile.text()
                    const products = parseCsvProducts(text)
                    if (products.length === 0) {
                        setImportError("No products found in CSV")
                        return
                    }
                    setImportOpen(false)
                    goToBulkEdit(products)
                    return
                }
            }

            const dataBase64 = await fileToBase64(importFile)
            const mimeType = guessMimeType(importFile)
            const res = await fetch("/api/ai/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mimeType, dataBase64, context: aiContext }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) {
                setImportError(typeof data?.error === "string" ? data.error : "Failed to parse file")
                return
            }
            const products = Array.isArray(data?.products) ? data.products : []
            if (products.length === 0) {
                setImportError("No products found in the file")
                return
            }
            setImportOpen(false)
            goToBulkEdit(products)
        } catch {
            setImportError("Import failed")
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <main className="w-[90%]">
            <div className="w-full max-w-7xl mx-auto px-4 my-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-xl font-bold"> Products / Services</div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-10"
                            onClick={() => {
                                setSelectMode((v) => {
                                    const next = !v
                                    if (!next) clearSelection()
                                    return next
                                })
                            }}
                        >
                            {selectMode ? "Done" : "Select"}
                        </Button>

                        {selectMode ? (
                            <>
                                <Button variant="outline" className="h-10" onClick={selectAllFiltered} disabled={filteredProducts.length === 0}>
                                    Select All
                                </Button>
                                <Button
                                    className="h-10 bg-orange-500 hover:bg-orange-600"
                                    onClick={openBulkEditSelected}
                                    disabled={selectedIds.length === 0}
                                >
                                    Bulk Edit ({selectedIds.length})
                                </Button>
                                <Button
                                    className="h-10 bg-red-600 hover:bg-red-700"
                                    onClick={requestBulkDeleteSelected}
                                    disabled={selectedIds.length === 0}
                                >
                                    Bulk Delete ({selectedIds.length})
                                </Button>
                            </>
                        ) : null}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10">
                                    import bulk
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openImport("excel")}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    From Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openImport("json")}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    From JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openImport("ai")}>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    From PDF / Image (AI)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link
                            href="/products/create-product"
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600 transition"
                        >
                            <Plus className="h-5 w-5" />
                        </Link>
                    </div>


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
                                {selectMode ? (
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={selectedIds.includes(product.id)}
                                        onChange={() => toggleSelected(product.id)}
                                        disabled={deletingId === product.id}
                                    />
                                ) : null}
                                <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold flex-shrink-0">
                                    {product.name.charAt(0)}
                                </div>

                                <div className="min-w-0">
                                    <p className="font-medium truncate">
                                        {product.name}
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
                                    disabled={selectMode || deletingId === product.id}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => requestDeleteProduct(product)}
                                    disabled={selectMode || deletingId === product.id}
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
                            placeholder="Price"
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                        />
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-[10px] text-muted-foreground">Append stock</div>
                            <Switch
                                checked={editAppendStock}
                                onCheckedChange={(checked) => {
                                    setEditAppendStock(checked)
                                    setEditStock(checked ? "0" : editStockBase)
                                }}
                            />
                        </div>
                        <Input
                            placeholder="Stock"
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            min={0}
                        />
                        {error ? <div className="text-xs text-red-600">{error}</div> : null}
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
                    {error ? <div className="text-xs text-red-600">{error}</div> : null}
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

            <Dialog
                open={bulkDeleteOpen}
                onOpenChange={(open) => {
                    setBulkDeleteOpen(open)
                }}
            >
                <DialogContent className="text-xs">
                    <DialogHeader>
                        <DialogTitle>Delete Products</DialogTitle>
                        <DialogDescription>
                            This will permanently delete {selectedIds.length} product{selectedIds.length === 1 ? "" : "s"}.
                        </DialogDescription>
                    </DialogHeader>
                    {error ? <div className="text-xs text-red-600">{error}</div> : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={isBulkDeleting}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => void bulkDeleteSelected()}
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="text-xs">
                    <DialogHeader>
                        <DialogTitle>Import Bulk</DialogTitle>
                        <DialogDescription>
                            {importMode === "json"
                                ? "Upload a JSON file with products."
                                : importMode === "excel"
                                    ? "Upload an Excel file. CSV is supported directly, and XLS/XLSX will be parsed using AI."
                                    : "Upload a PDF or image and extract products using AI."}
                        </DialogDescription>
                    </DialogHeader>

                    {importError ? <div className="text-xs text-red-600">{importError}</div> : null}

                    <div className="space-y-2">
                        <Input
                            type="file"
                            className="h-9"
                            accept={
                                importMode === "json"
                                    ? ".json,application/json"
                                    : importMode === "excel"
                                        ? ".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        : ".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
                            }
                            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                        />
                    </div>

                    {importMode !== "json" ? (
                        <div className="space-y-2">
                            <div className="text-[10px] text-muted-foreground">
                                Optional AI context (example: “If product names are repeated, append quality like A/B/C”).
                            </div>
                            <textarea
                                value={aiContext}
                                onChange={(e) => setAiContext(e.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                placeholder="Custom instructions for AI..."
                            />
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportOpen(false)} disabled={isImporting}>
                            Cancel
                        </Button>
                        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => void runImport()} disabled={isImporting}>
                            {isImporting ? "Processing..." : "Next"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}
