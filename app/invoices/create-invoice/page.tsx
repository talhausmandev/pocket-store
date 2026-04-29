"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function CreateInvoicePage() {
  return (
    <main className="w-full text-xs">

      <div className="text-xl mx-10 font-bold my-2">
        Create Invoice
      </div>

      {/* BILL TO */}
      <section className="w-[90%] p-4 rounded-xl border bg-white shadow-sm space-y-3">
        <h2 className="font-semibold">Bill To</h2>

        <div className="flex gap-2">
          <Input placeholder="Select Client" className="h-9 text-xs" />

          <Button size="icon" className="h-9 w-9">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Input type="date" className="h-9 text-xs" />
          <Input type="date" className="h-9 text-xs" />
        </div>
      </section>

      {/* ITEMS */}
      <section className="w-[90%] mt-4 p-4 rounded-xl border bg-white shadow-sm space-y-3">
        <h2 className="font-semibold">Items</h2>

        {/* ITEM ROW */}
        <div className="grid grid-cols-4 gap-2 items-center">
          <Input placeholder="Item" className="col-span-2 h-9 text-xs" />
          <Input placeholder="Qty" type="number" className="h-9 text-xs" />
          <Input placeholder="Rate" type="number" className="h-9 text-xs" />
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs gap-1">
            <Plus className="h-3 w-3" />
            Add Item
          </Button>
        </div>
      </section>

      {/* SUMMARY */}
      <section className="w-[90%] mt-4 p-4 rounded-xl border bg-white shadow-sm space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹0</span>

        </div>

        <div className="flex justify-between">
          <span>Tax (18%)</span>
          <span>₹0</span>
          
        </div>

        <div className="flex justify-between">
          <span>Discount</span>
          <span>₹0</span>
        </div>

        <div className="flex justify-between font-semibold text-sm">
          <span>Total Amount</span>
          <span className="text-orange-600">₹0</span>
        </div>
      </section>

      {/* ACTION */}
      <div className="w-[90%] my-6 mb-24">
        <Button className="w-full bg-orange-500 hover:bg-orange-600">
          Save & Preview
        </Button>
      </div>
    </main>
  )
}