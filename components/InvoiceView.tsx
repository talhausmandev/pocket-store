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
  isEstimate?: boolean
}

const formatCurrency = (amount: number) => {
  const value = Number.isFinite(amount) ? amount : 0
  return `Rs ${value.toFixed(2)}`
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
  isEstimate = false,
}: InvoiceViewProps) {
  const typeLabel = isEstimate ? "ESTIMATE" : "SALES INVOICE"
  return (
    <div className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:w-auto print:min-h-0">
      <div className="p-10 print:p-0">
        <div className="text-2xl font-bold text-gray-900">{companyName}</div>

        <div className="mt-3 w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-center font-semibold tracking-wide text-gray-900">
          {typeLabel}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-300 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Bill To</div>
            <div className="mt-2 font-semibold text-gray-900">{customer.name || "-"}</div>
            <div className="text-gray-600">{customer.contact || "-"}</div>
          </div>
          <div className="rounded-lg border border-gray-300 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Invoice Details</div>
            <div className="mt-2 flex justify-between gap-4">
              <span className="text-gray-600">Invoice No</span>
              <span className="font-semibold text-gray-900">#{invoiceNumber}</span>
            </div>
            <div className="mt-1 flex justify-between gap-4">
              <span className="text-gray-600">Invoice Date</span>
              <span className="font-semibold text-gray-900">{date}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-300 overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-100 text-gray-700 font-semibold text-xs">
            <div className="col-span-6 px-3 py-2 border-r border-gray-300">Item</div>
            <div className="col-span-2 px-3 py-2 border-r border-gray-300 text-center">Qty</div>
            <div className="col-span-2 px-3 py-2 border-r border-gray-300 text-right">Price</div>
            <div className="col-span-2 px-3 py-2 text-right">Total</div>
          </div>
          {items.map((item: InvoiceItem, index: number) => (
            <div key={index} className="grid grid-cols-12 text-xs border-t border-gray-200">
              <div className="col-span-6 px-3 py-2 border-r border-gray-200 text-gray-900">
                {item.name || "-"}
              </div>
              <div className="col-span-2 px-3 py-2 border-r border-gray-200 text-center text-gray-700">
                {item.quantity}
              </div>
              <div className="col-span-2 px-3 py-2 border-r border-gray-200 text-right text-gray-700">
                {formatCurrency(item.price)}
              </div>
              <div className="col-span-2 px-3 py-2 text-right font-semibold text-gray-900">
                {formatCurrency(item.quantity * item.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 ml-auto w-full sm:w-72 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span className="text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 ? (
            <div className="mt-1 flex justify-between text-gray-700">
              <span>Tax ({taxRate}%)</span>
              <span className="text-gray-900">{formatCurrency(tax)}</span>
            </div>
          ) : null}
          {discount > 0 ? (
            <div className="mt-1 flex justify-between">
              <span className="text-gray-700">
                Discount ({discountType === "percent" ? `${discount}%` : formatCurrency(discount)})
              </span>
              <span className="text-red-600">-{formatCurrency(discount)}</span>
            </div>
          ) : null}
          <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between font-semibold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">Thanks to customer.</div>
      </div>
    </div>
  )
}
