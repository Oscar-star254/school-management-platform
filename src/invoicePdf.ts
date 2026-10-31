import { getReportProfile } from "./resultsData"

import { money } from "./receiptPdf"

export type InvoicePdfData = {
  number?: string

  createdAt?: string

  lines?: { description?: string; amount?: number }[]

  total?: number

  carryForward?: number
}

export async function downloadInvoicePdf(options: {
  schoolName: string

  invoice: InvoicePdfData

  learner: { name: string; admission: string; className: string }

  termName: string
}) {
  const { jsPDF } = await import("jspdf")

  const { schoolName, invoice, learner, termName } = options

  const profile = getReportProfile()

  const doc = new jsPDF()

  const hex = (profile.primaryColor ?? "#3478c8").replace("#", "")

  const accent = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))

  if (profile.invoiceTemplate === "modern") {
    doc.setFillColor(accent[0], accent[1], accent[2])

    doc.rect(0, 0, 210, 8, "F")
  }

  doc.setFont("helvetica", "bold")

  doc.setFontSize(18)

  doc.text(schoolName.toUpperCase(), 20, 25)

  doc.setFontSize(11)

  doc.text("SCHOOL FEE INVOICE", 190, 25, { align: "right" })

  doc.setFont("helvetica", "normal")

  doc.setFontSize(9)

  const contact = [profile.address?.replace(/\s*\n\s*/g, ", "), profile.phone, profile.email]
    .filter(Boolean)
    .join("  |  ")

  if (contact) doc.text(doc.splitTextToSize(contact, 170), 20, 32)

  doc.setDrawColor(accent[0], accent[1], accent[2])

  doc.line(20, 42, 190, 42)

  doc.setFontSize(10)

  doc.text(`Invoice: ${invoice.number ?? ""}`, 20, 53)

  doc.text(`Date: ${(invoice.createdAt ?? new Date().toISOString()).slice(0, 10)}`, 120, 53)

  doc.text(`Learner: ${learner.name}`, 20, 63)

  doc.text(`Admission no.: ${learner.admission}`, 120, 63)

  doc.text(`Class: ${learner.className || "—"}`, 20, 73)

  doc.text(`Term: ${termName}`, 120, 73)

  doc.setFillColor(232, 241, 252)

  doc.rect(20, 84, 170, 10, "F")

  doc.setFont("helvetica", "bold")

  doc.text("Description", 24, 91)

  doc.text("Amount (KES)", 186, 91, { align: "right" })

  doc.setFont("helvetica", "normal")

  let y = 103

  for (const line of invoice.lines ?? []) {
    if (y > 245) {
      doc.addPage()

      y = 24
    }

    doc.text(doc.splitTextToSize(line.description ?? "Fee", 120), 24, y)

    doc.text(money(Number(line.amount ?? 0)), 186, y, { align: "right" })

    y += 9
  }

  doc.setDrawColor(190, 201, 214)

  doc.line(20, y + 2, 190, y + 2)

  doc.setFont("helvetica", "bold")

  doc.setFontSize(13)

  doc.text(`Total due: ${money(Number(invoice.total ?? 0))}`, 186, y + 14, {
    align: "right",
  })

  doc.setFont("helvetica", "normal")

  doc.setFontSize(9)

  if (profile.invoiceFooter) doc.text(doc.splitTextToSize(profile.invoiceFooter, 170), 20, 260)

  if (profile.principalName) doc.text(`Authorised by: ${profile.principalName}`, 20, 280)

  doc.save(`${invoice.number ?? "invoice"}.pdf`)
}
