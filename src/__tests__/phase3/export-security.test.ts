import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { createCsv, sanitizeDownloadFilename } from '@/lib/export-security'
import { createXlsxDownload } from '@/lib/xlsx-export'

describe('shared export security', () => {
  it('neutralizes formulas before quoting while preserving numeric values', () => {
    const csv = createCsv([['payload', 'number'], ['=2+2', 42], ['\tcmd', -7], ['safe, text', 'plain']])
    expect(csv).toContain("'=2+2,42")
    expect(csv).toContain("'\tcmd,-7")
    expect(csv).toContain('"safe, text",plain')
  })

  it('sanitizes download filenames', () => {
    expect(sanitizeDownloadFilename('../student\r\n.csv')).toBe('..-student.csv')
  })

  it('stores untrusted XLSX strings as text, never formulas', async () => {
    const response = await createXlsxDownload({
      filename: 'test.xlsx',
      sheetName: 'Test',
      title: 'Export',
      columns: [{ header: 'Name', key: 'name' }],
      rows: [{ name: '=HYPERLINK("https://invalid")' }],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()) as never)
    const value = workbook.getWorksheet('Test')?.getCell('A5').value
    expect(typeof value).toBe('string')
    expect(value).toMatch(/^'=HYPERLINK/)
  })
})
