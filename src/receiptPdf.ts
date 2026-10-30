import { getReportProfile } from "./resultsData"

export const money = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 }).format(amount)

const METHODS: Record<string, string> = { cash: "Cash", mpesa: "M-Pesa", bank: "Bank", cheque: "Cheque", other: "Other" }
export const methodLabel = (method?: string) => METHODS[method ?? ""] ?? method ?? ""

/** A receipt for one payment. The balance shown is the learner's balance when the receipt is printed. */
export async function downloadReceipt(options: {
  schoolName: string
  payment: { receiptNumber?: string; paidAt: string; amount: number; method?: string; reference?: string | null; note?: string | null }
  learner: { name: string; admission: string; className: string }
  balance: number
}) {
  const { jsPDF } = await import("jspdf")
  const { schoolName, payment, learner, balance } = options
  const profile = getReportProfile()
  const doc = new jsPDF()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(schoolName.toUpperCase(), 105, 20, { align: "center" })
  const contact = [profile.address?.replace(/\s*\n\s*/g, ", "), profile.phone, profile.email].filter(Boolean).join("  |  ")
  if (contact) {
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(contact, 105, 25, { align: "center" })
    doc.setFont("helvetica", "bold")
  }
  doc.setFontSize(14)
  doc.text("PAYMENT RECEIPT", 105, 34, { align: "center" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.line(20, 40, 190, 40)
  const rows: [string, string][] = [
    ["Receipt number", payment.receiptNumber ?? ""],
    ["Date paid", payment.paidAt.slice(0, 10)],
    ["Received from / for", `${learner.name} (${learner.admission})`],
    ["Class", learner.className || "—"],
    ["Payment method", methodLabel(payment.method)],
    ...(payment.reference ? ([["Reference", payment.reference]] as [string, string][]) : []),
    ...(payment.note ? ([["Note", payment.note]] as [string, string][]) : []),
  ]
  rows.forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold")
    doc.text(label, 20, 52 + index * 9)
    doc.setFont("helvetica", "normal")
    doc.text(value, 80, 52 + index * 9)
  })
  const y = 52 + rows.length * 9 + 6
  doc.line(20, y, 190, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(`Amount received: ${money(payment.amount)}`, 20, y + 12)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Balance on the account today: ${money(balance)}${balance < 0 ? " (credit)" : ""}`, 20, y + 22)
  doc.text("Thank you. Please keep this receipt.", 20, y + 38)
  doc.text(`Printed ${new Date().toLocaleDateString("en-KE")}`, 20, 280)
  doc.save(`${payment.receiptNumber ?? "receipt"}.pdf`)
}