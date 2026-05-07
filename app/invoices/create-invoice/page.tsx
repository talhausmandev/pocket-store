"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Check, ChevronsUpDown, Trash2, Percent, DollarSign, Download, Eye, MoreVertical, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
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
import { DialogDescription } from "@radix-ui/react-dialog"

interface Product {
  id: string
  name: string
  price: number
}

interface Client {
  id: string
  name: string
  contact: string
}

interface InvoiceItem {
  id: string
  productId?: string
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

export default function CreateInvoicePage() {
  const router = useRouter()
  const [openProduct, setOpenProduct] = useState(false)
  const [openClient, setOpenClient] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [storeName, setStoreName] = useState("Pocket Store")
  const [clients, setClients] = useState<Client[]>([])
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsError, setProductsError] = useState<string | null>(null)
  const [isEstimate, setIsEstimate] = useState(true)
  const [customClientName, setCustomClientName] = useState("")
  const [customClientContact, setCustomClientContact] = useState("")
  const [quantity, setQuantity] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [applyTax, setApplyTax] = useState(false)
  const [taxRate, setTaxRate] = useState("18")
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent")
  const [discountValue, setDiscountValue] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [issueDateValue, setIssueDateValue] = useState("")
  const [dueDateValue, setDueDateValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<InvoiceItem | null>(null)
  const [tempDiscountEnabled, setTempDiscountEnabled] = useState(false)
  const [tempDiscountType, setTempDiscountType] = useState<"percent" | "amount">("percent")
  const [tempDiscountValue, setTempDiscountValue] = useState("")

  useEffect(() => {
    const configInvoiceData = () => {
      const now = new Date()
      const localIsoToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
      const due = new Date(localIsoToday)
      due.setDate(due.getDate() + 7)
      const localIsoDue = new Date(due.getTime() - due.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)

      setInvoiceNumber(
        `INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
      )
      setIssueDateValue(localIsoToday)
      setDueDateValue(localIsoDue)
      setInvoiceDate(
        new Date(localIsoToday).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )
    }

    configInvoiceData()
  }, [])

  useEffect(() => {
    const loadClients = async () => {
      setClientsError(null)
      try {
        const res = await fetch("/api/client", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setClientsError(typeof data?.error === "string" ? data.error : "Failed to load clients")
          setClients([])
          return
        }

        setClients(Array.isArray(data?.clients) ? data.clients : [])
      } catch {
        setClientsError("Failed to load clients")
        setClients([])
      }
    }

    const t = setTimeout(() => {
      void loadClients()
    }, 0)

    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const loadStore = async () => {
      try {
        const res = await fetch("/api/store", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        const name = typeof data?.store?.name === "string" ? data.store.name.trim() : ""
        if (res.ok && name) {
          setStoreName(name)
        }
      } catch {}
    }

    const t = setTimeout(() => {
      void loadStore()
    }, 0)

    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      setProductsError(null)
      try {
        const res = await fetch("/api/product", { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setProductsError(typeof data?.error === "string" ? data.error : "Failed to load products")
          setProducts([])
          return
        }

        setProducts(Array.isArray(data?.products) ? data.products : [])
      } catch {
        setProductsError("Failed to load products")
        setProducts([])
      }
    }

    const t = setTimeout(() => {
      void loadProducts()
    }, 0)

    return () => clearTimeout(t)
  }, [])

  const addItem = () => {
    if (!selectedProduct) return
    const itemQuantity = parseFloat(quantity) || 0

    if (itemQuantity <= 0) return

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      quantity: itemQuantity,
      rate: selectedProduct.price,
      discountEnabled: false,
      discountType: "percent",
      discountValue: 0,
    }

    setItems([...items, newItem])
    setSelectedProduct(null)
    setQuantity("")

    // Switch to Real Bill when first product is added
    if (items.length === 0) {
      setIsEstimate(false)
    }
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
    name: customClientName || selectedClient?.name || "Customer",
    contact: customClientContact || selectedClient?.contact || "",
  }

  const saveInvoice = async () => {
    setSaveError(null)
    if (items.length === 0) {
      setSaveError("Add at least one item")
      return
    }

    const hasInvalidProduct = items.some((it) => !it.productId || !/^[a-f\d]{24}$/i.test(it.productId))
    if (hasInvalidProduct) {
      setSaveError("Create products first, then add them to the invoice")
      return
    }

    const clientName = (customClientName || selectedClient?.name || "").trim()
    if (!clientName) {
      setSaveError("Select or enter a client")
      return
    }

    if (!issueDateValue) {
      setSaveError("Issue date is required")
      return
    }

    if (!isEstimate && !dueDateValue) {
      setSaveError("Due date is required for real bills")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          issueDate: issueDateValue,
          dueDate: dueDateValue,
          isEstimate,
          clientId: selectedClient?.id ?? "",
          clientName,
          clientContact: (customClientContact || selectedClient?.contact || "").trim(),
          items,
          applyTax,
          taxRate,
          applyDiscount,
          discountType,
          discountValue,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setSaveError(typeof data?.error === "string" ? data.error : "Failed to save invoice")
        return
      }

      router.push("/invoices")
      router.refresh()
    } catch {
      setSaveError("Failed to save invoice")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="w-full">
      <div className="w-full max-w-7xl mx-auto px-4 my-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Create Invoice</h1>
          <div className="flex items-center gap-2">
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={saveInvoice}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Invoice"}
            </Button>
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
                        items={invoiceItemsForPDF}
                        subtotal={calculateSubtotal()}
                        tax={calculateTax()}
                        taxRate={parseFloat(taxRate)}
                        discount={calculateTotalItemDiscounts() + calculateInvoiceDiscount()}
                        discountType={discountType}
                        total={calculateTotal()}
                        companyName={storeName}
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
        </div>
        {saveError ? <div className="text-xs text-red-600 mb-4">{saveError}</div> : null}

        {showPreview && invoiceItemsForPDF.length > 0 && (
          <div className="mb-8 border rounded-lg overflow-hidden h-[800px]">
            <PDFViewer width="100%" height="100%">
              <InvoicePDF
                invoiceNumber={invoiceNumber}
                date={invoiceDate}
                customer={customerForPDF}
                items={invoiceItemsForPDF}
                subtotal={calculateSubtotal()}
                tax={calculateTax()}
                taxRate={parseFloat(taxRate)}
                discount={calculateTotalItemDiscounts() + calculateInvoiceDiscount()}
                discountType={discountType}
                total={calculateTotal()}
                companyName={storeName}
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
                <span className={cn(items.length === 0 ? "text-gray-400" : "")}>Real Bill</span>
                <Switch
                  size="default"
                  className="cursor-pointer border border-black data-[state=unchecked]:bg-transparent data-[state=checked]:bg-orange-500"
                  checked={isEstimate}
                  onCheckedChange={(checked: boolean) => {
                    // Only allow switching to Real Bill if there are items
                    if (!checked && items.length === 0) {
                      return // Don't switch
                    }
                    setIsEstimate(checked)
                  }}
                />
                <span>Estimate Bill</span>
              </div>

              <h2 className="font-semibold">Bill To</h2>

              {/* Select Client */}
              <div className="flex gap-2">
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
                          {clients.map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.name}
                              onSelect={() => {
                                setSelectedClient(client)
                                setCustomClientName("")
                                setCustomClientContact("")
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
                                {client.contact}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Link
                  href="/clients"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-orange-500 text-white hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
              {clientsError ? <div className="text-xs text-red-600">{clientsError}</div> : null}

              {/* OR Custom Client */}
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <span className="border-t flex-1 mr-2"></span>
                OR
                <span className="border-t flex-1 ml-2"></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  placeholder="Client name"
                  value={customClientName}
                  onChange={(e) => {
                    setCustomClientName(e.target.value)
                    setSelectedClient(null)
                  }}
                  className="h-9 text-xs"
                />
                <Input
                  placeholder="Client contact"
                  value={customClientContact}
                  onChange={(e) => {
                    setCustomClientContact(e.target.value)
                    setSelectedClient(null)
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex justify-around mt-2">
                <div>Issue Date</div>
                <div>Due Date</div>
              </div>

              <div className="flex gap-2">
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={issueDateValue}
                  onChange={(e) => {
                    setIssueDateValue(e.target.value)
                    setInvoiceDate(
                      new Date(e.target.value).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    )
                  }}
                />
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={dueDateValue}
                  onChange={(e) => setDueDateValue(e.target.value)}
                />
              </div>
            </section>

            {/* ITEMS */}
            <section className="p-4 rounded-xl border bg-white shadow-sm space-y-3">
              <h2 className="font-semibold">Items</h2>

              {/* ITEM ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <div className="col-span-1 sm:col-span-2">
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
                            {(products.length ? products : sampleProducts).map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => {
                                  setSelectedProduct(product)
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
                                  Rs {product.price.toFixed(2)}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {productsError ? <div className="col-span-1 sm:col-span-5 text-xs text-red-600">{productsError}</div> : null}
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
                  value={selectedProduct?.price || ""}
                  disabled
                  className="h-9 text-xs bg-gray-50"
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
                            {item.quantity} x Rs {item.rate.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            {item.discountEnabled && (
                              <p className="text-red-500 text-[10px]">
                                -Rs {calculateItemDiscountAmount(item).toFixed(2)}
                              </p>
                            )}
                            <span className="font-semibold">
                              Rs {calculateItemTotal(item).toFixed(2)}
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
                <span>Rs {calculateSubtotal().toFixed(2)}</span>
              </div>

              {calculateTotalItemDiscounts() > 0 && (
                <div className="flex justify-between">
                  <span>Item Discounts</span>
                  <span className="text-red-600">-Rs {calculateTotalItemDiscounts().toFixed(2)}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    size="default"
                    checked={applyTax}
                    onCheckedChange={setApplyTax}
                    className="cursor-pointer border border-black data-[state=unchecked]:bg-transparent data-[state=checked]:bg-orange-500"
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
                    <span>Rs {calculateTax().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    size="default"
                    checked={applyDiscount}
                    onCheckedChange={setApplyDiscount}
                    className="cursor-pointer border border-black data-[state=unchecked]:bg-transparent data-[state=checked]:bg-orange-500"
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
                        Rs
                      </button>
                    </div>
                    <Input
                      type="number"
                      placeholder={discountType === "percent" ? "0%" : "Rs 0"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-20 h-7 text-xs"
                    />
                    <span>-Rs {calculateInvoiceDiscount().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between font-semibold text-sm pt-2 border-t">
                <span>Total Amount</span>
                <span className="text-orange-600">
                  Rs {calculateTotal().toFixed(2)}
                </span>
              </div>
            </section>
          </div>

          {/* Invoice Preview - Hidden on small screens */}
          <div className="hidden xl:block">
            {invoiceItemsForPDF.length > 0 ? (
              <InvoiceView
                invoiceNumber={invoiceNumber}
                date={invoiceDate}
                customer={customerForPDF}
                items={invoiceItemsForPDF}
                subtotal={calculateSubtotal()}
                tax={calculateTax()}
                taxRate={parseFloat(taxRate)}
                discount={calculateTotalItemDiscounts() + calculateInvoiceDiscount()}
                discountType={discountType}
                total={calculateTotal()}
                companyName={storeName}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
                <p>Add items to see invoice preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item Discount</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Set up item discounts for your invoice.
          </DialogDescription>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Enable Discount</span>
              <Switch
                size="default"
                className="cursor-pointer border border-black data-[state=unchecked]:bg-transparent data-[state=checked]:bg-orange-500"
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
                      Rs
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-medium">
                    Discount Value ({tempDiscountType === "percent" ? "%" : "Rs"})
                  </span>
                  <Input
                    type="number"
                    placeholder={tempDiscountType === "percent" ? "0%" : "Rs 0"}
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
