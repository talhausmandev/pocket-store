"use client"


interface Customer {
  name: string
  contact: string
}

interface InvoiceItem {
  name: string
  quantity: number
  price: number
}

interface InvoiceViewProps {
  invoiceNumber: string
  date: string
  customer: Customer
  items: InvoiceItem[]
  subtotal: number
  tax: number
  taxRate: number
  discount: number
  discountType: "percent" | "amount"
  total: number
  companyName?: string
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export default function InvoiceView({
  invoiceNumber,
  date,
  customer,
  items,
  subtotal,
  tax,
  taxRate,
  discount,
  discountType,
  total,
  companyName = "Pocket Store",
}: InvoiceViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg print:shadow-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="h-12 w-24 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">
            {companyName.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-orange-600">INVOICE</h2>
          <p className="text-gray-500 mt-1">#{invoiceNumber}</p>
          <p className="text-gray-500">{date}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-1">Bill To:</p>
        <p className="font-semibold text-gray-800">{customer.name}</p>
        <p className="text-gray-600">{customer.contact}</p>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <div className="grid grid-cols-12 gap-2 border-b border-gray-200 pb-2 mb-2">
          <div className="col-span-6 font-semibold text-gray-600">Item</div>
          <div className="col-span-2 font-semibold text-gray-600 text-center">Qty</div>
          <div className="col-span-2 font-semibold text-gray-600 text-right">Price</div>
          <div className="col-span-2 font-semibold text-gray-600 text-right">Total</div>
        </div>
        {items.map((item: InvoiceItem, index: number) => (
          <div key={index} className="grid grid-cols-12 gap-2 py-2 border-b border-gray-100">
            <div className="col-span-6 text-gray-800">{item.name}</div>
            <div className="col-span-2 text-gray-600 text-center">{item.quantity}</div>
            <div className="col-span-2 text-gray-600 text-right">{formatCurrency(item.price)}</div>
            <div className="col-span-2 font-semibold text-gray-800 text-right">
              {formatCurrency(item.quantity * item.price)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="ml-auto w-64 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-800">{formatCurrency(subtotal)}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tax ({taxRate}%)</span>
            <span className="text-gray-800">{formatCurrency(tax)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">
              Discount ({discountType === "percent" ? `${discount}%` : formatCurrency(discount)})
            </span>
            <span className="text-red-600">-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold text-lg">
          <span className="text-gray-800">Total</span>
          <span className="text-orange-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
