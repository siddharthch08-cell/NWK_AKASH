import ExcelJS from 'exceljs'
import { downloadResponse, neutralizeSpreadsheetValue } from './export-security'

export interface XlsxExportOptions {
  filename: string
  sheetName: string
  title: string
  filters?: string
  columns: Partial<ExcelJS.Column>[]
  rows: Record<string, unknown>[]
}

export async function createXlsxDownload(options: XlsxExportOptions): Promise<Response> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Naya Wallah Kanoon'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(options.sheetName)
  sheet.columns = options.columns.map(column => ({ ...column, header: undefined }))

  sheet.addRow([neutralizeSpreadsheetValue(options.title)])
  sheet.addRow([`Generated: ${new Date().toISOString()}`])
  if (options.filters) sheet.addRow([neutralizeSpreadsheetValue(`Filters: ${options.filters}`)])
  sheet.addRow([])
  sheet.addRow(options.columns.map(column => neutralizeSpreadsheetValue(column.header)))
  for (const source of options.rows) {
    const row: Record<string, string | number | boolean> = {}
    for (const column of options.columns) {
      if (column.key) row[String(column.key)] = neutralizeSpreadsheetValue(source[String(column.key)])
    }
    sheet.addRow(row)
  }

  const headerRow = sheet.getRow(options.filters ? 5 : 4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }

  sheet.columns.forEach(column => {
    let width = String(column.header || '').length || 10
    for (const source of options.rows) {
      const value = String(neutralizeSpreadsheetValue(source[String(column.key)]))
      width = Math.max(width, value.length)
    }
    column.width = Math.min(60, Math.max(Number(column.width) || 0, width + 2))
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return downloadResponse(
    buffer as unknown as BodyInit,
    options.filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}
