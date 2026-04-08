export type CsvValue = string | number | boolean | null | undefined
export type CsvRow = Record<string, CsvValue>

export function toCSV<T extends CsvRow>(rows: T[], columns?: string[]): string {
  if (!rows?.length) return ''
  const cols = columns ?? Object.keys(rows[0])
  const esc = (v: CsvValue): string => {
    if (v == null) return ''
    const s = String(v).replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const header = cols.join(',')
  const body = rows
    .map((r) => cols.map((c) => esc(r[c] as CsvValue)).join(','))
    .join('\n')
  return header + '\n' + body
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
