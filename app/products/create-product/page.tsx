"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function CreateProductPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        quantity: "",
        tax: false,
        taxRate: "",
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Product data:", formData)
        router.push("/products")
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
        <main className="w-full">
            <div className="w-[90%] mx-auto my-2">
                <div className="mb-6">
                    
                    <h1 className="text-xl font-bold mx-4">Create Product / Service</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 w-[90%] flex flex-col  justify-center bg-white p-6 rounded-lg shadow-md shadow-black">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Product / Service Name</label>
                        <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter product or service name"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter description"
                            rows={4}
                            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price</label>
                            <Input
                                name="price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantity</label>
                            <Input
                                name="quantity"
                                type="number"
                                value={formData.quantity}
                                onChange={handleChange}
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                            <Save className="h-4 w-4 mr-2" />
                            Save Product
                        </Button>
                        <Link href="/products">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    )
}
