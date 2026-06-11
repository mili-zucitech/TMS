import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number }
  }
}
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

// ── Public column definition ──────────────────────────────────────────────────
export interface ExportColumn {
  key: string
  label: string
}

export interface ExportChartData {
  title: string
  type: 'bar' | 'line' | 'pie'
  data: { name: string; value: number }[]
  valueLabel?: string
}

export interface ExportSection {
  title: string
  data: object[]
  columns: ExportColumn[]
  charts?: ExportChartData[]
}

interface ExportButtonsProps {
  filename?: string
  reportTitle?: string
  className?: string
  // single-dataset mode
  data?: object[]
  columns?: ExportColumn[]
  // multi-section mode (overrides single-dataset)
  sections?: ExportSection[]
}

// ── Internal IDs that should never appear in exports ─────────────────────────
const HIDDEN_KEYS = new Set(['userId', 'departmentId', 'projectId', 'leaveTypeId'])

// ── Derive columns from object keys when none provided ───────────────────────
function deriveColumns(row: object): ExportColumn[] {
  return Object.keys(row)
    .filter((k) => !HIDDEN_KEYS.has(k))
    .map((k) => ({
      key: k,
      label: k
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim(),
    }))
}

// ── Format a single cell value ────────────────────────────────────────────────
function fmt(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(2)
  return String(val)
}

// ── Build header + 2-D array from data + columns ─────────────────────────────
function buildMatrix(
  data: object[],
  cols: ExportColumn[],
): { headers: string[]; rows: string[][] } {
  const headers = cols.map((c) => c.label)
  const rows = data.map((row) =>
    cols.map((c) => fmt((row as Record<string, unknown>)[c.key])),
  )
  return { headers, rows }
}

// ── CSV export ────────────────────────────────────────────────────────────────
function csvCell(val: string): string {
  return val.includes(',') || val.includes('"') || val.includes('\n')
    ? `"${val.replace(/"/g, '""')}"`
    : val
}

function exportCSV(data: object[], filename: string, cols: ExportColumn[]) {
  if (!data.length) return
  const { headers, rows } = buildMatrix(data, cols)
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ]
  downloadBlob(
    new Blob(['\uFEFF' + lines.join('\n'), ], { type: 'text/csv;charset=utf-8;' }),
    `${filename}.csv`,
  )
}

function exportCSVSections(sections: ExportSection[], filename: string) {
  const lines: string[] = []
  for (const section of sections) {
    const hasData   = section.data.length > 0
    const validCharts = (section.charts ?? []).filter((c) => c.data.length > 0)
    if (!hasData && !validCharts.length) continue

    lines.push(`# ${section.title}`)

    // ── Main data table ──────────────────────────────────────────────────────
    if (hasData) {
      const { headers, rows } = buildMatrix(section.data, section.columns)
      lines.push(headers.map(csvCell).join(','))
      rows.forEach((r) => lines.push(r.map(csvCell).join(',')))
    }

    // ── Chart / aggregated data ───────────────────────────────────────────────
    if (validCharts.length) {
      lines.push('')
      lines.push('## Aggregated Chart Data')
      for (const chart of validCharts) {
        lines.push('')
        lines.push(`### ${chart.title}`)
        const valHeader = chart.valueLabel ?? 'Value'
        lines.push([csvCell('Name'), csvCell(valHeader), csvCell('% of Total')].join(','))
        const total = chart.data.reduce((s, d) => s + d.value, 0)
        chart.data.forEach((pt) => {
          const pct = total > 0 ? ((pt.value / total) * 100).toFixed(1) + '%' : '—'
          lines.push([csvCell(String(pt.name)), csvCell(fmt(pt.value)), csvCell(pct)].join(','))
        })
      }
    }

    lines.push('')
  }
  downloadBlob(
    new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
    `${filename}.csv`,
  )
}

// ── Excel export (real XLSX via SheetJS) ──────────────────────────────────────
function exportExcel(
  data: object[],
  filename: string,
  cols: ExportColumn[],
  title?: string,
) {
  if (!data.length) return
  const { headers, rows } = buildMatrix(data, cols)
  const sheetData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  // Bold the header row
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[cellRef]) ws[cellRef].s = { font: { bold: true } }
  }

  // Auto column widths
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.max(h.length + 2, ...rows.map((r) => (r[i] ?? '').length), 10),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, (title ?? 'Report').slice(0, 31))
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function exportExcelSections(sections: ExportSection[], filename: string, title?: string) {
  const wb = XLSX.utils.book_new()

  for (const section of sections) {
    const hasData     = section.data.length > 0
    const validCharts = (section.charts ?? []).filter((c) => c.data.length > 0)
    if (!hasData && !validCharts.length) continue

    // Build one big array-of-arrays for this sheet
    const aoa: (string | number | null)[][] = []
    const boldRows: number[] = []
    const grayRows: number[]  = []

    // ── Main data table ──────────────────────────────────────────────────────
    if (hasData) {
      const { headers, rows } = buildMatrix(section.data, section.columns)
      boldRows.push(aoa.length)   // header is bold
      aoa.push(headers)
      rows.forEach((r) => aoa.push(r))
    }

    // ── Appended chart tables ─────────────────────────────────────────────────
    for (const chart of validCharts) {
      aoa.push([])  // blank spacer
      // Chart title row
      grayRows.push(aoa.length)
      aoa.push([`▶ ${chart.title}`])
      // Column header
      boldRows.push(aoa.length)
      const valHeader = chart.valueLabel ?? 'Value'
      aoa.push(['Rank', 'Name', valHeader, '% of Total'])
      // Data rows
      const total = chart.data.reduce((s, d) => s + d.value, 0)
      chart.data.forEach((pt, i) => {
        const pct = total > 0 ? +((pt.value / total) * 100).toFixed(2) : 0
        aoa.push([i + 1, String(pt.name), pt.value, pct])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    // Apply bold to header rows
    boldRows.forEach((r) => {
      const rowEnd = aoa[r]?.length ?? 0
      for (let c = 0; c < rowEnd; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        if (ws[ref]) ws[ref].s = { font: { bold: true } }
      }
    })
    // Apply italic+gray to chart title rows
    grayRows.forEach((r) => {
      const ref = XLSX.utils.encode_cell({ r, c: 0 })
      if (ws[ref]) ws[ref].s = { font: { bold: true, italic: true }, alignment: { vertical: 'center' } }
    })

    // Column widths: fit main data + chart data
    const allStrLengths: number[][] = aoa.map((row) =>
      row.map((cell) => String(cell ?? '').length)
    )
    const maxCols = Math.max(...aoa.map((r) => r.length))
    ws['!cols'] = Array.from({ length: maxCols }, (_, ci) => ({
      wch: Math.max(10, ...allStrLengths.map((row) => row[ci] ?? 0)) + 2,
    }))

    XLSX.utils.book_append_sheet(wb, ws, section.title.slice(0, 31))
  }

  // ── Charts Summary sheet ─────────────────────────────────────────────────
  const allCharts = sections.flatMap((s) =>
    (s.charts ?? []).filter((c) => c.data.length > 0).map((c) => ({ sectionTitle: s.title, chart: c }))
  )
  if (allCharts.length > 0) {
    const summaryAoa: (string | number | null)[][] = []
    const summaryBold: number[] = []
    const summaryGray: number[] = []
    summaryBold.push(0)
    summaryAoa.push([
      `${title ?? 'Report'} — Charts Summary`,
      null, null,
      `Generated: ${new Date().toLocaleString()}`,
    ])
    summaryAoa.push([])

    for (const { sectionTitle, chart } of allCharts) {
      summaryGray.push(summaryAoa.length)
      summaryAoa.push([`${sectionTitle} › ${chart.title}`])
      summaryBold.push(summaryAoa.length)
      const valHeader = chart.valueLabel ?? 'Value'
      summaryAoa.push(['Rank', 'Name', valHeader, '% of Total'])
      const total = chart.data.reduce((s, d) => s + d.value, 0)
      chart.data.forEach((pt, i) => {
        const pct = total > 0 ? +((pt.value / total) * 100).toFixed(2) : 0
        summaryAoa.push([i + 1, String(pt.name), pt.value, pct])
      })
      summaryAoa.push([])
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa)
    summaryBold.forEach((r) => {
      const rowLen = summaryAoa[r]?.length ?? 0
      for (let c = 0; c < rowLen; c++) {
        const ref = XLSX.utils.encode_cell({ r, c })
        if (summaryWs[ref]) summaryWs[ref].s = { font: { bold: true } }
      }
    })
    summaryGray.forEach((r) => {
      const ref = XLSX.utils.encode_cell({ r, c: 0 })
      if (summaryWs[ref]) summaryWs[ref].s = { font: { bold: true, italic: true } }
    })
    summaryWs['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 18 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Charts Summary')
  }

  if (wb.SheetNames.length === 0) return
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ── PDF export (jspdf + autotable) ────────────────────────────────────────────
function exportPDF(
  data: object[],
  filename: string,
  cols: ExportColumn[],
  title?: string,
) {
  if (!data.length) return
  const { headers, rows } = buildMatrix(data, cols)
  const displayTitle = title ?? filename
  const generated = new Date().toLocaleString()

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text(displayTitle, 14, 16)

  // Subtitle
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generated: ${generated}  |  ${rows.length} record(s)`, 14, 23)

  // Separator line
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.4)
  doc.line(14, 26, doc.internal.pageSize.getWidth() - 14, 26)

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.1,
    didDrawPage: (hookData) => {
      // Footer
      const pageH = doc.internal.pageSize.getHeight()
      const pageW = doc.internal.pageSize.getWidth()
      const pageNum = hookData.pageNumber
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(`TMS Report — ${displayTitle}`, 14, pageH - 6)
      doc.text(`Page ${pageNum}`, pageW - 14, pageH - 6, { align: 'right' })
    },
  })

  doc.save(`${filename}.pdf`)
}

// ── PDF chart drawing helpers ─────────────────────────────────────────────────
const CHART_COLORS: [number, number, number][] = [
  [59, 130, 246],  [16, 185, 129],  [245, 158, 11],  [239, 68, 68],
  [99, 102, 241],  [236, 72, 153],  [20, 184, 166],  [249, 115, 22],
  [139, 92, 246],  [6, 182, 212],
]

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

/** Draws a horizontal bar chart. Returns the Y position after the chart. */
function drawBarChartPDF(doc: jsPDF, chart: ExportChartData, x: number, y: number, w: number): number {
  const items = chart.data.slice(0, 18)
  if (!items.length) return y
  const maxVal = Math.max(...items.map((d) => d.value), 1)
  const LABEL_W = Math.min(w * 0.38, 52)
  const VAL_W = 14
  const BAR_W = w - LABEL_W - VAL_W - 2
  const BAR_H = 5.5
  const GAP   = 2.5

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text(chart.title, x, y + 5)
  y += 9

  items.forEach((item, i) => {
    const filled = maxVal > 0 ? Math.max((item.value / maxVal) * BAR_W, 0.5) : 0
    const color  = CHART_COLORS[i % CHART_COLORS.length]
    // label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(71, 85, 105)
    doc.text(truncate(item.name, 16), x + LABEL_W - 1, y + BAR_H - 1.2, { align: 'right' })
    // bg track
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(x + LABEL_W, y, BAR_W, BAR_H, 1, 1, 'F')
    // filled bar
    doc.setFillColor(...color)
    doc.roundedRect(x + LABEL_W, y, filled, BAR_H, 1, 1, 'F')
    // value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(30, 41, 59)
    doc.text(fmt(item.value), x + LABEL_W + BAR_W + 2, y + BAR_H - 1.2)
    y += BAR_H + GAP
  })

  if (chart.valueLabel) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(5.5)
    doc.setTextColor(148, 163, 184)
    doc.text(chart.valueLabel, x + LABEL_W + BAR_W / 2, y + 3, { align: 'center' })
    y += 6
  }
  return y + 2
}

/** Draws a line chart. Returns Y after the chart. */
function drawLineChartPDF(doc: jsPDF, chart: ExportChartData, x: number, y: number, w: number): number {
  const items = chart.data
  if (items.length < 2) return y
  const H       = 36
  const L_PAD   = 18
  const R_PAD   = 6
  const chartW  = w - L_PAD - R_PAD
  const chartX  = x + L_PAD
  const maxVal  = Math.max(...items.map((d) => d.value), 1)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text(chart.title, x, y + 5)
  y += 9

  const top = y
  const bot = y + H

  // Grid lines (4 horizontal)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.15)
  for (let i = 0; i <= 4; i++) {
    const gy = bot - (i / 4) * H
    doc.line(chartX, gy, chartX + chartW, gy)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(148, 163, 184)
    const lbl = Math.round((i / 4) * maxVal).toString()
    doc.text(lbl, chartX - 1, gy + 1.5, { align: 'right' })
  }

  // Area fill (light)
  const pts = items.map((it, i) => ({
    px: chartX + (i / (items.length - 1)) * chartW,
    py: bot     - (it.value / maxVal) * H,
  }))

  // Shaded area under line
  doc.setFillColor(219, 234, 254)
  const areaPath: [number, number][] = [
    [chartX, bot], ...pts.map((p) => [p.px, p.py] as [number, number]), [chartX + chartW, bot],
  ]
  // use doc.lines for area - approximate with rect fill behind line
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1]
    doc.setFillColor(219, 234, 254)
    doc.lines(
      [[p2.px - p1.px, p2.py - p1.py],[0, bot - p2.py],[(p1.px - p2.px), 0],[0, p1.py - bot]],
      p1.px, p1.py, [1, 1], 'F', false
    )
  }
  void areaPath  // used indirectly above

  // Line
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.7)
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(pts[i].px, pts[i].py, pts[i + 1].px, pts[i + 1].py)
  }

  // Dots
  doc.setFillColor(59, 130, 246)
  pts.forEach((p) => doc.circle(p.px, p.py, 0.9, 'F'))

  // X axis labels (sparse)
  const step = Math.max(1, Math.ceil(items.length / 7))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(100, 116, 139)
  items.forEach((it, i) => {
    if (i % step === 0 || i === items.length - 1) {
      const px = chartX + (i / (items.length - 1)) * chartW
      doc.text(truncate(it.name, 6), px, bot + 4.5, { align: 'center' })
    }
  })

  // Axes
  doc.setDrawColor(100, 116, 139)
  doc.setLineWidth(0.3)
  doc.line(chartX, top, chartX, bot)
  doc.line(chartX, bot, chartX + chartW, bot)

  y = bot + 8
  if (chart.valueLabel) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(5.5)
    doc.setTextColor(148, 163, 184)
    doc.text(chart.valueLabel, chartX + chartW / 2, y, { align: 'center' })
    y += 5
  }
  return y
}

/** Draws a distribution bar (pie). Returns Y after the chart. */
function drawPieChartPDF(doc: jsPDF, chart: ExportChartData, x: number, y: number, w: number): number {
  const items = chart.data.filter((d) => d.value > 0)
  if (!items.length) return y
  const total = items.reduce((s, d) => s + d.value, 0)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text(chart.title, x, y + 5)
  y += 9

  // Stacked horizontal bar
  const BAR_H = 9
  let bx = x
  items.forEach((item, i) => {
    const segW = (item.value / total) * w
    doc.setFillColor(...CHART_COLORS[i % CHART_COLORS.length])
    doc.rect(bx, y, segW, BAR_H, 'F')
    // percent label if wide enough
    if (segW > 10) {
      const pct = Math.round((item.value / total) * 100)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(255, 255, 255)
      doc.text(`${pct}%`, bx + segW / 2, y + BAR_H - 2.5, { align: 'center' })
    }
    bx += segW
  })
  y += BAR_H + 3

  // Legend (3 per row)
  const COLS = Math.min(3, items.length)
  const colW = w / COLS
  items.forEach((item, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const lx  = x + col * colW
    const ly  = y + row * 7
    doc.setFillColor(...CHART_COLORS[i % CHART_COLORS.length])
    doc.rect(lx, ly, 4, 4, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(51, 65, 85)
    const pct = Math.round((item.value / total) * 100)
    doc.text(`${truncate(item.name, 14)}: ${item.value} (${pct}%)`, lx + 5.5, ly + 3.5)
  })
  const rows = Math.ceil(items.length / COLS)
  return y + rows * 7 + 4
}

/** Draw one chart (dispatch by type). Returns new Y. */
function drawChartPDF(doc: jsPDF, chart: ExportChartData, x: number, y: number, w: number): number {
  switch (chart.type) {
    case 'bar':  return drawBarChartPDF(doc, chart, x, y, w)
    case 'line': return drawLineChartPDF(doc, chart, x, y, w)
    case 'pie':  return drawPieChartPDF(doc, chart, x, y, w)
    default:     return y
  }
}

/** Draw all charts for a section in a 2-column grid. Returns new Y. */
function drawSectionChartsPDF(
  doc: jsPDF,
  charts: ExportChartData[],
  startX: number,
  startY: number,
  totalW: number,
): number {
  const COL_W   = (totalW - 8) / 2
  const pageH   = doc.internal.pageSize.getHeight()
  let y = startY

  for (let i = 0; i < charts.length; i += 2) {
    const c1 = charts[i]
    const c2 = charts[i + 1]

    // Estimate height for current row (rough estimate to decide page break)
    const estimateH = c1.type === 'line' ? 56 : Math.min(c1.data.length, 18) * 8 + 20
    if (y + estimateH > pageH - 22) {
      doc.addPage()
      y = 16
    }

    const y1 = drawChartPDF(doc, c1, startX, y, COL_W)
    const y2 = c2 ? drawChartPDF(doc, c2, startX + COL_W + 8, y, COL_W) : y
    y = Math.max(y1, y2) + 6
  }
  return y
}

function exportPDFSections(sections: ExportSection[], filename: string, title?: string) {
  const displayTitle = title ?? filename
  const generated = new Date().toLocaleString()
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const MARGIN = 14
  const usableW = pageW - MARGIN * 2

  // Cover title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(displayTitle, MARGIN, 16)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Generated: ${generated}  |  ${sections.filter((s) => s.data.length).length} section(s)`, MARGIN, 23)
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, 26, pageW - MARGIN, 26)

  let startY = 32

  for (const section of sections) {
    if (!section.data.length && !section.charts?.some((c) => c.data.length)) continue
    const { headers, rows } = buildMatrix(section.data, section.columns)

    // Section heading — ensure enough space
    const pageH = doc.internal.pageSize.getHeight()
    if (startY > pageH - 50) {
      doc.addPage()
      startY = 16
    }

    // Section title bar
    doc.setFillColor(30, 41, 59)
    doc.rect(MARGIN, startY - 1, usableW, 8, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(section.title, MARGIN + 3, startY + 5)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    if (rows.length > 0) doc.text(`${rows.length} record(s)`, pageW - MARGIN - 3, startY + 5, { align: 'right' })
    startY += 12

    // ── Charts ──────────────────────────────────────────────────────────────
    if (section.charts?.length) {
      const validCharts = section.charts.filter((c) => c.data.length > 0)
      if (validCharts.length) {
        startY = drawSectionChartsPDF(doc, validCharts, MARGIN, startY, usableW)
        startY += 4
        // page-break check before table
        if (startY > pageH - 40) {
          doc.addPage()
          startY = 16
        }
      }
    }

    // ── Data table ───────────────────────────────────────────────────────────
    if (rows.length > 0) {
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.1,
        didDrawPage: (hookData) => {
          const ph = doc.internal.pageSize.getHeight()
          doc.setFontSize(7)
          doc.setTextColor(148, 163, 184)
          doc.text(`TMS Report — ${displayTitle}`, MARGIN, ph - 6)
          doc.text(`Page ${hookData.pageNumber}`, pageW - MARGIN, ph - 6, { align: 'right' })
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY = doc.lastAutoTable.finalY + 16
    }
  }

  doc.save(`${filename}.pdf`)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ExportButtons({
  data = [],
  filename = 'report',
  columns,
  reportTitle,
  sections,
  className,
}: ExportButtonsProps) {
  const [open, setOpen] = useState(false)

  const hasData = sections
    ? sections.some((s) => s.data.length > 0)
    : data.length > 0

  if (!hasData) return null

  const cols = columns ?? (data.length > 0 ? deriveColumns(data[0]) : [])
  const title = reportTitle ?? filename

  const handleCSV = () => {
    if (sections) exportCSVSections(sections, filename)
    else exportCSV(data, filename, cols)
    setOpen(false)
  }

  const handleExcel = () => {
    if (sections) exportExcelSections(sections, filename, title)
    else exportExcel(data, filename, cols, title)
    setOpen(false)
  }

  const handlePDF = () => {
    if (sections) exportPDFSections(sections, filename, title)
    else exportPDF(data, filename, cols, title)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export Report
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-white shadow-lg">
            <button
              onClick={handleCSV}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <FileText className="h-4 w-4 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={handleExcel}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Export Excel
            </button>
            <button
              onClick={handlePDF}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <File className="h-4 w-4 text-red-500" />
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
