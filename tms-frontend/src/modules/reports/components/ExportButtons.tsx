import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface ExportButtonsProps {
  data: object[]
  filename?: string
  className?: string
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(data: object[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = String((row as Record<string, unknown>)[h] ?? '')
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
      })
      .join(','),
  )
  const csv = [headers.join(','), ...rows].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
}

// ── JSON → simple Excel-like TSV (no library dependency) ─────────────────────
function exportTSV(data: object[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => String((row as Record<string, unknown>)[h] ?? '')).join('\t'),
  )
  const tsv = [headers.join('\t'), ...rows].join('\n')
  downloadBlob(
    new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    `${filename}.xls`,
  )
}

// ── Simple printable PDF via browser print dialog ────────────────────────────
function exportPDF(data: object[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const ths = headers.map((h) => `<th>${h}</th>`).join('')
  const trs = data
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td>${String((row as Record<string, unknown>)[h] ?? '')}</td>`).join('')}</tr>`,
    )
    .join('')
  const html = `<!DOCTYPE html><html><head><title>${filename}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:12px;padding:16px}
  h2{margin-bottom:8px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}
  th{background:#f3f4f6;font-weight:600}
  tr:nth-child(even){background:#f9fafb}
</style></head>
<body><h2>${filename}</h2><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ExportButtons({ data, filename = 'report', className }: ExportButtonsProps) {
  const [open, setOpen] = useState(false)

  if (!data.length) return null

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-border bg-white shadow-lg">
            <button
              onClick={() => { exportCSV(data, filename); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <FileText className="h-4 w-4 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={() => { exportTSV(data, filename); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              Export Excel
            </button>
            <button
              onClick={() => { exportPDF(data, filename); setOpen(false) }}
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
