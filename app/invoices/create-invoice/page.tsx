"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Check, ChevronsUpDown, Trash2, Percent, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Link from "next/link"

interface Product {
  id: string
  name: string
  price: number
}

interface Client {
  id: string
  name: string
  email: string
}

interface InvoiceItem {
  id: string
  name: string
  quantity: number
  rate: number
}

const sampleProducts: Product[] = [
  { id: "1", name: "Laptop", price: 999.99 },
  { id: "2", name: "Wireless Mouse", price: 29.99 },
  { id: "3", name: "Keyboard", price: 79.99 },
  { id: "4", name: "Monitor", price: 299.99 },
  { id: "5", name: "USB Cable", price: 9.99 },
]

const sampleClients: Client[] = [
  { id: "1", name: "Tech Solutions Pvt. Ltd.", email: "contact@techsolutions.com" },
  { id: "2", name: "Creative Studio", email: "hello@creativestudio.com" },
  { id: "3", name: "Bright Developers", email: "info@brightdevs.com" },
  { id: "4", name: "NextGen Systems", email: "support@nextgensystems.com" },
]

export default function CreateInvoicePage() {
  const [openProduct, setOpenProduct] = useState(false)
  const [openClient, setOpenClient] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isEstimate, setIsEstimate] = useState(false)
  const [customItemName, setCustomItemName] = useState("")
  const [customClientName, setCustomClientName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [rate, setRate] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [applyTax, setApplyTax] = useState(false)
  const [taxRate, setTaxRate] = useState("18")
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent")
  const [discountValue, setDiscountValue] = useState("")

  const addItem = () => {
    const itemName = isEstimate ? customItemName : selectedProduct?.name
    const itemRate = isEstimate ? parseFloat(rate) || 0 : selectedProduct?.price || 0
    const itemQuantity = parseFloat(quantity) || 0

    if (!itemName || itemQuantity <= 0) return

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      name: itemName,
      quantity: itemQuantity,
      rate: itemRate,
    }

    setItems([...items, newItem])
    setCustomItemName("")
    setSelectedProduct(null)
    setQuantity("")
    setRate("")
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.rate), 0)
  }

  const calculateTax = () => {
    if (!applyTax) return 0
    return calculateSubtotal() * (parseFloat(taxRate) / 100)
  }

  const calculateDiscount = () => {
    if (!applyDiscount) return 0
    const subtotal = calculateSubtotal()
    const discountNum = parseFloat(discountValue) || 0
    if (discountType === "percent") {
      return subtotal * (discountNum / 100)
    } else {
      return discountNum
    }
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - calculateDiscount()
  }

  return (
    <main className="w-full text-xs">

      <div className="text-xl mx-10 font-bold my-2">
        Create Invoice
      </div>

      {/* BILL TO */}
      <section className="w-[90%] p-4 rounded-xl border bg-white shadow-sm space-y-3">
        <div className="flex justify-center gap-2 font-semibold">
          <span>Real Bill</span>
          <Switch 
            className="cursor-pointer" 
            checked={isEstimate}
            onCheckedChange={setIsEstimate}
          />
          <span>Estimate Bill</span>
        </div>

        <h2 className="font-semibold">Bill To</h2>

        <div className="flex gap-2">
          {isEstimate ? (
            <Input
              placeholder="Client name"
              value={customClientName}
              onChange={(e) => setCustomClientName(e.target.value)}
              className="flex-1 h-9 text-xs"
            />
          ) : (
            <Popover open={openClient} onOpenChange={setOpenClient}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openClient}
                  className="flex-1 h-9 text-xs justify-between"
                >
                  {selectedClient ? selectedClient.name : "Select Client..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-100 p-0">
                <Command>
                  <CommandInput placeholder="Search client..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {sampleClients.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => {
                            setSelectedClient(client)
                            setOpenClient(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {client.name}
                          <span className="ml-auto text-muted-foreground text-[10px]">
                            {client.email}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          <Link href="/clients" className="h-9 w-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </Link>
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
        <div className="grid grid-cols-5 gap-2 items-center">
          {isEstimate ? (
            <Input
              placeholder="Item name"
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
              className="col-span-2 h-9 text-xs"
            />
          ) : (
            <Popover open={openProduct} onOpenChange={setOpenProduct}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProduct}
                  className="col-span-2 h-9 text-xs justify-between"
                >
                  {selectedProduct ? selectedProduct.name : "Select Item..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-100 p-0">
                <Command>
                  <CommandInput placeholder="Search item..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No item found.</CommandEmpty>
                    <CommandGroup>
                      {sampleProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.name}
                          onSelect={() => {
                            setSelectedProduct(product)
                            setRate(product.price.toString())
                            setOpenProduct(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {product.name}
                          <span className="ml-auto text-muted-foreground">
                            ${product.price.toFixed(2)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <Input 
            placeholder="Qty" 
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-9 text-xs" 
          />
          <Input 
            placeholder="Rate" 
            type="number" 
            value={isEstimate ? rate : (selectedProduct?.price || "")}
            onChange={(e) => setRate(e.target.value)}
            className="h-9 text-xs" 
          />
          <Button 
            onClick={addItem} 
            size="icon" 
            className="h-9 w-9 bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* ITEMS LIST */}
        {items.length > 0 && (
          <div className="space-y-2 mt-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {item.quantity} x ${item.rate.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    ${(item.quantity * item.rate).toFixed(2)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SUMMARY */}
      <section className="w-[90%] mt-4 p-4 rounded-xl border bg-white shadow-sm space-y-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${calculateSubtotal().toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch 
              checked={applyTax} 
              onCheckedChange={setApplyTax}
              className="cursor-pointer"
            />
            <span>Apply Tax</span>
          </div>
          {applyTax && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Tax %"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-20 h-7 text-xs"
              />
              <span>${calculateTax().toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch 
              checked={applyDiscount} 
              onCheckedChange={setApplyDiscount}
              className="cursor-pointer"
            />
            <span>Apply Discount</span>
          </div>
          {applyDiscount && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg overflow-hidden">
                <button
                  onClick={() => setDiscountType("percent")}
                  className={cn(
                    "px-3 py-1 text-xs flex items-center gap-1 transition-colors",
                    discountType === "percent" ? "bg-orange-500 text-white" : "text-muted-foreground"
                  )}
                >
                  <Percent className="h-3 w-3" />
                  %
                </button>
                <button
                  onClick={() => setDiscountType("amount")}
                  className={cn(
                    "px-3 py-1 text-xs flex items-center gap-1 transition-colors",
                    discountType === "amount" ? "bg-orange-500 text-white" : "text-muted-foreground"
                  )}
                >
                  <DollarSign className="h-3 w-3" />
                  $
                </button>
              </div>
              <Input
                type="number"
                placeholder={discountType === "percent" ? "0%" : "$0"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-20 h-7 text-xs"
              />
              <span>-${calculateDiscount().toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between font-semibold text-sm pt-2 border-t">
          <span>Total Amount</span>
          <span className="text-orange-600">
            ${calculateTotal().toFixed(2)}
          </span>
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
