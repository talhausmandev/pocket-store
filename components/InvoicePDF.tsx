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
  isEstimate?: boolean
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
    paddingTop: 28,
    paddingBottom: 64,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  typeBanner: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeBannerText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  infoLeft: {
    flex: 1,
    marginRight: 10,
  },
  infoRight: {
    flex: 1,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 10,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 12,
    color: "#111827",
  },
  infoValueStrong: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  table: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  cellItem: {
    flex: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
  },
  cellQty: {
    flex: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
  },
  cellPrice: {
    flex: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
  },
  cellTotal: {
    flex: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  headerTextCenter: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
  },
  headerTextRight: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "right",
  },
  bodyText: {
    fontSize: 11,
    color: "#111827",
  },
  bodyTextCenter: {
    fontSize: 11,
    color: "#111827",
    textAlign: "center",
  },
  bodyTextRight: {
    fontSize: 11,
    color: "#111827",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  totals: {
    marginTop: 14,
    marginLeft: "auto",
    width: 240,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    padding: 10,
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
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
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
    color: "#111827",
  },
  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 24,
    textAlign: "center",
    fontSize: 10,
    color: "#6b7280",
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
  isEstimate = false,
}: InvoicePDFProps) {
  const safeCompanyName = toPdfSafeText(companyName)
  const safeInvoiceNumber = toPdfSafeText(invoiceNumber)
  const safeDate = toPdfSafeText(date)
  const safeCustomerName = toPdfSafeText(customer?.name)
  const safeCustomerContact = toPdfSafeText(customer?.contact)
  const typeLabel = isEstimate ? "ESTIMATE" : "SALES INVOICE"
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.companyName}>{safeCompanyName}</Text>
        <View style={styles.typeBanner}>
          <Text style={styles.typeBannerText}>{typeLabel}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>BILL TO</Text>
              <Text style={styles.infoValueStrong}>{safeCustomerName}</Text>
              <Text style={styles.infoValue}>{safeCustomerContact}</Text>
            </View>
          </View>
          <View style={styles.infoRight}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>INVOICE DETAILS</Text>
              <View style={styles.totalRow}>
                <Text style={styles.infoValue}>Invoice No</Text>
                <Text style={styles.infoValueStrong}>#{safeInvoiceNumber}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.infoValue}>Invoice Date</Text>
                <Text style={styles.infoValueStrong}>{safeDate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.cellItem}>
              <Text style={styles.headerText}>Item</Text>
            </View>
            <View style={styles.cellQty}>
              <Text style={styles.headerTextCenter}>Qty</Text>
            </View>
            <View style={styles.cellPrice}>
              <Text style={styles.headerTextRight}>Price</Text>
            </View>
            <View style={styles.cellTotal}>
              <Text style={styles.headerTextRight}>Total</Text>
            </View>
          </View>
          {items.map((item: InvoiceItem, index: number) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.cellItem}>
                <Text style={styles.bodyText}>{toPdfSafeText(item.name)}</Text>
              </View>
              <View style={styles.cellQty}>
                <Text style={styles.bodyTextCenter}>{item.quantity}</Text>
              </View>
              <View style={styles.cellPrice}>
                <Text style={styles.bodyTextRight}>{formatCurrency(item.price)}</Text>
              </View>
              <View style={styles.cellTotal}>
                <Text style={styles.bodyTextRight}>{formatCurrency(item.quantity * item.price)}</Text>
              </View>
            </View>
          ))}
        </View>

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

        <Text style={styles.footer}>Thanks to customer.</Text>
      </Page>
    </Document>
  )
}
