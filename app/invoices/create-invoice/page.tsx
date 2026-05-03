"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Check, ChevronsUpDown, Trash2, Percent, DollarSign, Download, Eye, MoreVertical, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import InvoiceView from "@/components/InvoiceView"
import InvoicePDF from "@/components/InvoicePDF"

import {
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer"

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
  ProductId: string
  name: string
  quantity: number
  rate: number
  discountEnabled: boolean
  discountType: "percent" | "amount"
  discountValue: number
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

const invoiceData = {
  customer: {
    name: "John Doe",
    email: "john@example.com",
  },
  items: [],
}

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
  const [showPreview, setShowPreview] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<InvoiceItem | null>(null)
  const [tempDiscountEnabled, setTempDiscountEnabled] = useState(false)
  const [tempDiscountType, setTempDiscountType] = useState<"percent" | "amount">("percent")
  const [tempDiscountValue, setTempDiscountValue] = useState("")

  useEffect(() => {
    const configInvoiceData = () => {
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`)
      setInvoiceDate(new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }))
    }

    configInvoiceData()
  }, [])

  const addItem = () => {
    const itemName = isEstimate ? customItemName : selectedProduct?.name
    const itemRate = isEstimate ? parseFloat(rate) || 0 : selectedProduct?.price || 0
    const itemQuantity = parseFloat(quantity) || 0

    if (!itemName || itemQuantity <= 0) return

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      ProductId: selectedProduct?.id || "",
      name: itemName,
      quantity: itemQuantity,
      rate: itemRate,
      discountEnabled: false,
      discountType: "percent",
      discountValue: 0,
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

  const openDiscountDialog = (item: InvoiceItem) => {
    setCurrentItem(item)
    setTempDiscountEnabled(item.discountEnabled)
    setTempDiscountType(item.discountType)
    setTempDiscountValue(item.discountValue.toString())
    setDiscountDialogOpen(true)
  }

  const saveItemDiscount = () => {
    if (!currentItem) return

    setItems(items.map(item => 
      item.id === currentItem.id 
        ? {
            ...item,
            discountEnabled: tempDiscountEnabled,
            discountType: tempDiscountType,
            discountValue: parseFloat(tempDiscountValue) || 0,
          }
        : item
    ))

    setDiscountDialogOpen(false)
    setCurrentItem(null)
  }

  const calculateItemTotal = (item: InvoiceItem) => {
    const lineTotal = item.quantity * item.rate
    if (!item.discountEnabled) return lineTotal

    if (item.discountType === "percent") {
      return lineTotal * (1 - (item.discountValue / 100))
    } else {
      return lineTotal - item.discountValue
    }
  }

  const calculateItemDiscountAmount = (item: InvoiceItem) => {
    if (!item.discountEnabled) return 0
    const lineTotal = item.quantity * item.rate
    if (item.discountType === "percent") {
      return lineTotal * (item.discountValue / 100)
    } else {
      return item.discountValue
    }
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.rate), 0)
  }

  const calculateTax = () => {
    if (!applyTax) return 0
    return calculateSubtotal() * (parseFloat(taxRate) / 100)
  }

  const calculateTotalItemDiscounts = () => {
    return items.reduce((total, item) => total + calculateItemDiscountAmount(item), 0)
  }

  const calculateInvoiceDiscount = () => {
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
    return calculateSubtotal() + calculateTax() - calculateTotalItemDiscounts() - calculateInvoiceDiscount()
  }

  const invoiceItemsForPDF = items.map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.rate,
  }))

  const customerForPDF = {
    name: isEstimate ? customClientName || "Customer" : selectedClient?.name || "Customer",
    email: isEstimate ? "" : selectedClient?.email || "",
  }

  return (
    <main className="w-full">
      <div className="w-full max-w-7xl mx-auto px-4 my-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Create Invoice</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <PDFDownloadLink
                  document={
                    <InvoicePDF
                      invoiceNumber={invoiceNumber}
                      date={invoiceDate}
                      customer={customerForPDF}
                      items={invoiceItemsForPDF.length > 0 ? invoiceItemsForPDF : invoiceData.items}
                      subtotal={calculateSubtotal()}
                      tax={calculateTax()}
                      taxRate={parseFloat(taxRate)}
                      discount={calculateTotalItemDiscounts() + calculateInvoiceDiscount()}
                      discountType={discountType}
                      total={calculateTotal()}
                    />
                  }
                  fileName={`invoice-${invoiceNumber}.pdf`}
                >
                  {({ loading }) => (
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? "Generating PDF..." : "Download PDF"}
                    </div>
                  )}
                </PDFDownloadLink>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? "Hide Preview" : "Preview PDF"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showPreview && (
          <div className="mb-8 border rounded-lg overflow-hidden h-[800px]">
            <PDFViewer width="100%" height="100%">
              <InvoicePDF
                invoiceNumber={invoiceNumber}
                date={invoiceDate}
                customer={customerForPDF}
                items={invoiceItemsForPDF.length > 0 ? invoiceItemsForPDF : invoiceData.items}
                subtotal={calculateSubtotal()}
                tax={calculateTax()}
                taxRate={parseFloat(taxRate)}
                discount={calculateTotalItemDiscounts() + calculateInvoiceDiscount()}
                discountType={discountType}
                total={calculateTotal()}
              />
            </PDFViewer>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Invoice Form */}
          <div className="space-y-6">
            {/* BILL TO */}
            <section className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
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
                    <PopoverContent className="w-full sm:w-[400px] p-0">
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

                <Button size="icon" className="h-9 w-9">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex justify-around mt-2">
                <div>Issue Date</div>
                <div>Due Date</div>
              </div>

              <div className="flex gap-2">
                <Input type="date" className="h-9 text-xs" />
                <Input type="date" className="h-9 text-xs" />
              </div>
            </section>

            {/* ITEMS */}
            <section className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
              <h2 className="font-semibold">Items</h2>

              {/* ITEM ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <div className="col-span-1 sm:col-span-2">
                  {isEstimate ? (
                    <Input
                      placeholder="Item name"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  ) : (
                    <Popover open={openProduct} onOpenChange={setOpenProduct}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openProduct}
                          className="w-full h-9 text-xs justify-between"
                        >
                          {selectedProduct ? selectedProduct.name : "Select Item..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
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
                </div>
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
                  className="h-9 w-9 bg-orange-500 hover:bg-orange-600 justify-self-end"
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
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {item.quantity} x ${item.rate.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            {item.discountEnabled && (
                              <p className="text-red-500 text-[10px]">
                                -${calculateItemDiscountAmount(item).toFixed(2)}
                              </p>
                            )}
                            <span className="font-semibold">
                              ${calculateItemTotal(item).toFixed(2)}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDiscountDialog(item)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
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
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SUMMARY */}
            <section className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>

              {calculateTotalItemDiscounts() > 0 && (
                <div className="flex justify-between">
                  <span>Item Discounts</span>
                  <span className="text-red-600">-${calculateTotalItemDiscounts().toFixed(2)}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
                    <span>-${calculateInvoiceDiscount().toFixed(2)}</span>
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
          </div>

          {/* Invoice Preview - Hidden on small screens */}
          <div className="hidden xl:block">
            <InvoiceView
              invoiceNumber={invoiceNumber}
              date={invoiceDate}
              customer={customerForPDF}
              items={invoiceItemsForPDF.length > 0 ? invoiceItemsForPDF : invoiceData.items}
              subtotal={calculateSubtotal()}
              tax={calculateTax()}
              taxRate={parseFloat(taxRate)}
              discount={calculateTotalItemDiscounts() + calculateInvoiceDiscount()}
              discountType={discountType}
              total={calculateTotal()}
            />
          </div>
        </div>
      </div>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Enable Discount</span>
              <Switch 
                checked={tempDiscountEnabled} 
                onCheckedChange={setTempDiscountEnabled}
              />
            </div>
            
            {tempDiscountEnabled && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="font-medium">Discount Type:</span>
                  <div className="flex items-center bg-muted rounded-lg overflow-hidden">
                    <button
                      onClick={() => setTempDiscountType("percent")}
                      className={cn(
                        "px-3 py-1 text-xs flex items-center gap-1 transition-colors",
                        tempDiscountType === "percent" ? "bg-orange-500 text-white" : "text-muted-foreground"
                      )}
                    >
                      <Percent className="h-3 w-3" />
                      %
                    </button>
                    <button
                      onClick={() => setTempDiscountType("amount")}
                      className={cn(
                        "px-3 py-1 text-xs flex items-center gap-1 transition-colors",
                        tempDiscountType === "amount" ? "bg-orange-500 text-white" : "text-muted-foreground"
                      )}
                    >
                      <DollarSign className="h-3 w-3" />
                      $
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium">
                    Discount Value ({tempDiscountType === "percent" ? "%" : "$"})
                  </span>
                  <Input
                    type="number"
                    placeholder={tempDiscountType === "percent" ? "0%" : "$0"}
                    value={tempDiscountValue}
                    onChange={(e) => setTempDiscountValue(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={saveItemDiscount}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
