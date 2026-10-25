// CSV export helpers. Pure functions so they can later be pointed at real,
// authorized records returned by the backend.

const FORMULA_START = /^[=+\-@\t\r]/

function escapeCell(value) {
  let s = value == null ? '' : String(value)
  // Prevent spreadsheet formula injection when the file is opened in Excel/Sheets.
  if (FORMULA_START.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** columns: [{ header: 'Name', value: (row) => row.name }] */
export function toCsv(columns, rows) {
  const head = columns.map((c) => escapeCell(c.header)).join(',')
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(','))
  return [head, ...body].join('\r\n')
}

export function downloadCsv(filename, csv) {
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
