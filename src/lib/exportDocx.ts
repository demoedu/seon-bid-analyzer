import type { CompanyInfo, SimilarProject, Engineer } from '@/types/bid'

interface ExportInput {
  bidTitle: string
  company: CompanyInfo
  projects: SimilarProject[]
  engineers: Engineer[]
  draft?: string
}

export async function exportDocx({ bidTitle, company, projects, engineers, draft }: ExportInput) {
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    HeadingLevel,
    WidthType,
  } = await import('docx')

  function headerRow(labels: string[]) {
    return new TableRow({
      children: labels.map(
        text =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
          })
      ),
    })
  }

  function dataRow(values: string[]) {
    return new TableRow({
      children: values.map(
        text => new TableCell({ children: [new Paragraph(text)] })
      ),
    })
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: bidTitle, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun(`회사명: ${company.name}   사업자등록번호: ${company.bizNumber}`),
            ],
          }),
          new Paragraph({ text: '' }),

          ...(draft?.trim()
            ? [
                new Paragraph({ text: '참여의향서 도입부', heading: HeadingLevel.HEADING_2 }),
                ...draft.split('\n').map(line => new Paragraph(line)),
                new Paragraph({ text: '' }),
              ]
            : []),

          new Paragraph({ text: '유사용역 실적', heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['용역명', '발주기관', '계약금액', '용역기간', '담당업무']),
              ...projects.map(p => dataRow([p.projectName, p.client, p.amount, p.period, p.role])),
            ],
          }),
          new Paragraph({ text: '' }),

          new Paragraph({ text: '기술자 경력', heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(['성명', '자격종목', '취득일', '소속', '담당분야']),
              ...engineers.map(e =>
                dataRow([e.name, e.license, e.acquiredDate, e.affiliation, e.field])
              ),
            ],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `자격서류_${bidTitle.slice(0, 20)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
