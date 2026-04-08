import jsPDF from 'jspdf'
import type { InvoiceItem, InvoiceWithRelations, Profile } from '../types'

export interface GenerateInvoicePDFArgs {
  invoice: InvoiceWithRelations
  items: InvoiceItem[]
  profile: Profile | null
}

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0))
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

export function generateInvoicePDF({ invoice, items, profile }: GenerateInvoicePDFArgs): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const accent = hexToRgb(profile?.invoice_accent_color || '#E11D48')
  const pageW = 210
  const margin = 20
  let y = 25

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(accent[0], accent[1], accent[2])
  doc.text('INVOICE', margin, y)

  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.number, margin, y + 6)

  // Company info right
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20)
  const companyName = profile?.company || profile?.full_name || 'ClientPulse'
  doc.text(companyName, pageW - margin, y, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  let rightY = y + 5
  if (profile?.address) {
    const lines = profile.address.split('\n')
    lines.forEach((line) => {
      doc.text(line, pageW - margin, rightY, { align: 'right' })
      rightY += 4
    })
  }
  if (profile?.vat_id) {
    doc.text(`VAT: ${profile.vat_id}`, pageW - margin, rightY, { align: 'right' })
    rightY += 4
  }

  y = Math.max(y + 20, rightY + 5)

  // Bill to + dates
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.text('BILL TO', margin, y)
  doc.text('INVOICE DATE', pageW - margin - 50, y)
  doc.text('DUE DATE', pageW - margin, y, { align: 'right' })

  y += 5
  doc.setFontSize(11)
  doc.setTextColor(20)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.clients?.name || '—', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  let billY = y + 4
  if (invoice.clients?.company) {
    doc.text(invoice.clients.company, margin, billY)
    billY += 4
  }
  if (invoice.clients?.email) {
    doc.text(invoice.clients.email, margin, billY)
    billY += 4
  }

  doc.setTextColor(20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(fmtDate(invoice.issue_date), pageW - margin - 50, y)
  doc.text(fmtDate(invoice.due_date), pageW - margin, y, { align: 'right' })

  y = Math.max(billY, y + 4) + 12

  // Items table
  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)

  y += 5
  doc.setFontSize(8)
  doc.setTextColor(140)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', margin, y)
  doc.text('QTY', pageW - margin - 70, y, { align: 'right' })
  doc.text('UNIT', pageW - margin - 35, y, { align: 'right' })
  doc.text('AMOUNT', pageW - margin, y, { align: 'right' })

  y += 3
  doc.setDrawColor(220)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30)

  items.forEach((it) => {
    const descLines = doc.splitTextToSize(it.description || '', 95) as string[]
    doc.text(descLines, margin, y)
    doc.text(String(it.quantity || 0), pageW - margin - 70, y, { align: 'right' })
    doc.text(fmt(it.unit_price), pageW - margin - 35, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(fmt(it.amount), pageW - margin, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += Math.max(6, descLines.length * 5)
    doc.setDrawColor(240)
    doc.line(margin, y - 2, pageW - margin, y - 2)
  })

  y += 4

  // Totals
  const totalsX = pageW - margin - 60
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Subtotal', totalsX, y)
  doc.setTextColor(30)
  doc.text(fmt(invoice.subtotal), pageW - margin, y, { align: 'right' })
  y += 5

  doc.setTextColor(100)
  doc.text(`Tax (${invoice.tax_rate}%)`, totalsX, y)
  doc.setTextColor(30)
  doc.text(fmt(invoice.tax_amount), pageW - margin, y, { align: 'right' })
  y += 6

  doc.setDrawColor(accent[0], accent[1], accent[2])
  doc.setLineWidth(0.6)
  doc.line(totalsX, y, pageW - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30)
  doc.text('TOTAL', totalsX, y)
  doc.setTextColor(accent[0], accent[1], accent[2])
  doc.setFontSize(14)
  doc.text(fmt(invoice.total), pageW - margin, y, { align: 'right' })

  // Notes
  if (invoice.notes) {
    y += 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text('NOTES', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80)
    const lines = doc.splitTextToSize(invoice.notes, pageW - margin * 2) as string[]
    doc.text(lines, margin, y)
    y += lines.length * 4
  }

  // Footer
  if (profile?.invoice_footer) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140)
    const lines = doc.splitTextToSize(profile.invoice_footer, pageW - margin * 2) as string[]
    doc.text(lines, pageW / 2, 280, { align: 'center' })
  }

  doc.save(`invoice-${invoice.number}.pdf`)
}
