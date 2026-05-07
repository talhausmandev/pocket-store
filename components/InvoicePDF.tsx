import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

interface Customer {
  name: string
  contact: string
}

interface InvoiceItem {
  name: string
  quantity: number
  price: number
}

interface InvoicePDFProps {
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
  const value = Number.isFinite(amount) ? amount : 0
  return `Rs ${value.toFixed(2)}`
}

const toPdfSafeText = (value: unknown) => {
  const s = typeof value === "string" ? value : ""
  const cleaned = s.replace(/[^\x20-\x7E]/g, "").trim()
  return cleaned || "-"
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  companyInfo: {
    flexDirection: "column",
  },
  companyLogo: {
    width: 80,
    height: 48,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ea580c",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  invoiceInfo: {
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ea580c",
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  invoiceDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  customerInfo: {
    marginBottom: 40,
  },
  customerLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  customerEmail: {
    fontSize: 12,
    color: "#4b5563",
  },
  table: {
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderItem: {
    flex: 6,
    fontSize: 10,
    fontWeight: "bold",
    color: "#4b5563",
  },
  tableHeaderQty: {
    flex: 2,
    fontSize: 10,
    fontWeight: "bold",
    color: "#4b5563",
    textAlign: "center",
  },
  tableHeaderPrice: {
    flex: 2,
    fontSize: 10,
    fontWeight: "bold",
    color: "#4b5563",
    textAlign: "right",
  },
  tableHeaderTotal: {
    flex: 2,
    fontSize: 10,
    fontWeight: "bold",
    color: "#4b5563",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 8,
  },
  tableItem: {
    flex: 6,
    fontSize: 12,
    color: "#1f2937",
  },
  tableQty: {
    flex: 2,
    fontSize: 12,
    color: "#4b5563",
    textAlign: "center",
  },
  tablePrice: {
    flex: 2,
    fontSize: 12,
    color: "#4b5563",
    textAlign: "right",
  },
  tableTotal: {
    flex: 2,
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "right",
  },
  totals: {
    marginLeft: "auto",
    width: 240,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 12,
    color: "#4b5563",
  },
  totalValue: {
    fontSize: 12,
    color: "#1f2937",
  },
  discountValue: {
    fontSize: 12,
    color: "#dc2626",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ea580c",
  },
})

export default function InvoicePDF({
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
}: InvoicePDFProps) {
  const safeCompanyName = toPdfSafeText(companyName)
  const safeInvoiceNumber = toPdfSafeText(invoiceNumber)
  const safeDate = toPdfSafeText(date)
  const safeCustomerName = toPdfSafeText(customer?.name)
  const safeCustomerContact = toPdfSafeText(customer?.contact)
  const logoLetter = safeCompanyName.charAt(0).toUpperCase() || "P"
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <View
              style={[
                styles.companyLogo,
                { backgroundColor: "#ffedd5", borderRadius: 8 },
              ]}
            >
              <Text style={styles.companyLogoText}>{logoLetter}</Text>
            </View>
            <Text style={styles.companyName}>{safeCompanyName}</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{safeInvoiceNumber}</Text>
            <Text style={styles.invoiceDate}>{safeDate}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Text style={styles.customerLabel}>Bill To:</Text>
          <Text style={styles.customerName}>{safeCustomerName}</Text>
          <Text style={styles.customerEmail}>{safeCustomerContact}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderItem}>Item</Text>
            <Text style={styles.tableHeaderQty}>Qty</Text>
            <Text style={styles.tableHeaderPrice}>Price</Text>
            <Text style={styles.tableHeaderTotal}>Total</Text>
          </View>
          {items.map((item: InvoiceItem, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableItem}>{toPdfSafeText(item.name)}</Text>
              <Text style={styles.tableQty}>{item.quantity}</Text>
              <Text style={styles.tablePrice}>{formatCurrency(item.price)}</Text>
              <Text style={styles.tableTotal}>
                {formatCurrency(item.quantity * item.price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount ({discountType === "percent" ? `${discount}%` : formatCurrency(discount)})
              </Text>
              <Text style={styles.discountValue}>-{formatCurrency(discount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
