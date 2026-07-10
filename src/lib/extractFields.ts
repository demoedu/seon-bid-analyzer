import type { BidAnnouncement, ChecklistItem } from '@/types/bid'

/** 분절된 한글 날짜·금액 표현을 정규화 */
function normalizeText(raw: string): string {
  return raw
    // "2026 년" → "2026년", "06 월" → "06월", "18 일" → "18일"
    .replace(/(\d{4})\s+년/g, '$1년')
    .replace(/(\d{1,2})\s+월/g, '$1월')
    .replace(/(\d{1,2})\s+일/g, '$1일')
    // "101,978,182 원" → "101,978,182원"
    .replace(/([\d,]+)\s+원/g, '$1원')
    // 점 구분 날짜 조각 연결: "2026. \n 06." → "2026.06."
    .replace(/(\d{4})\.\s*\n\s*(\d{1,2})\./g, '$1.$2.')
    .replace(/(\d{4}\.\d{1,2})\.\s*\n\s*(\d{1,2})/g, '$1.$2')
}

function match(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = text.match(pattern)
    const val = m?.[1]?.trim()
    if (val) return val
  }
  return null
}

function parseDate(raw: string): string | null {
  // 한글 형식: 2024년 06월 15일
  const kor = raw.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (kor) return `${kor[1]}-${kor[2].padStart(2, '0')}-${kor[3].padStart(2, '0')}`
  // 점 구분 형식: 2026.06.26. 또는 2026. 06. 26.
  const dot = raw.match(/(\d{4})[.\s]+(\d{1,2})[.\s]+(\d{1,2})/)
  if (dot) return `${dot[1]}-${dot[2].padStart(2, '0')}-${dot[3].padStart(2, '0')}`
  // ISO 형식
  const iso = raw.match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : null
}

/** 마감일: 라벨 이후 500자 이내에서 날짜 패턴을 탐색 */
function findDeadline(text: string): string | null {
  const labels = [
    '전자입찰서 접수 마감일시',
    '입찰서 제출마감',
    '입찰마감일시',
    '마감일시',
    '마감일',
    '제출마감',
  ]
  for (const label of labels) {
    const idx = text.indexOf(label)
    if (idx === -1) continue
    const window = text.slice(idx, idx + 500)
    const d = parseDate(window)
    if (d) return d
  }
  return null
}

/** 제목: 공고명 이후 줄에서 연도가 잘린 경우 다음 줄을 이어붙임 */
function extractTitle(text: string): string | null {
  const patterns = [
    /공고명\s*[：:]\s*([^\n]+)/,
    /용역명\s*[：:]\s*([^\n]+)/,
    /사업명\s*[：:]\s*([^\n]+)/,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (!m) continue
    let val = m[1].trim()
    // 값이 4자리 연도로 끝나면 다음 줄이 이어지는 경우 (예: "2026\n년 청주...")
    if (/\d{4}$/.test(val)) {
      const rest = text.slice(m.index! + m[0].length).match(/^\s*\n([^\n]+)/)
      if (rest) val = val + rest[1].trim()
    }
    // 섹션 마커(숫자+점 또는 가나다)에서 잘라 제목만 추출
    return val.replace(/\s+\d+\.\s+[\s\S]*/, '').replace(/\s+[가나다라마바사]\s+[\s\S].*/, '').trim().slice(0, 150)
  }
  return null
}

function extractChecklist(text: string): ChecklistItem[] {
  const sectionMatch = text.match(/(?:제출서류|입찰서류)[^\n]*\n([\s\S]{0,2000})/)
  if (!sectionMatch) return []

  return sectionMatch[1]
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[①②③④⑤⑥⑦⑧⑨⑩\d○●가나다라마바사아자]/.test(l))
    .map(l => l.replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d\.\)\s○●가나다라마바사아자\.\s]+/, '').trim())
    .filter(l => l.length > 2 && l.length < 100)
    .slice(0, 20)
    .map(label => ({ id: crypto.randomUUID(), label, status: 'not-started' as const }))
}

export function extractFields(
  rawText: string,
  fileName: string
): Omit<BidAnnouncement, 'id' | 'uploadedAt'> {
  const text = normalizeText(rawText)

  const title = extractTitle(text)

  const organization = match(text, [
    /발주기관\s*[：:]\s*([^\n]+)/,
    /수요기관\s*[：:]\s*([^\n]+)/,
    /발주처\s*[：:]\s*([^\n]+)/,
    // 나라장터 공고문에서 공사명이 문서 하단 서명란에만 나오는 경우
    /(한국\S+공사\s*\S*지사)/,
  ])

  const estimatedAmount = match(text, [
    /추정가격\s*[：:]\s*([^\n]+)/,
    /예정가격\s*[：:]\s*([^\n]+)/,
    /예정금액\s*[：:]\s*([^\n]+)/,
    // "가 추정가격 ： ₩ 101,978,182원" 형태
    /[가-하]\s*추정가격\s*[：:\s]+([^\n]+)/,
  ])

  const servicePeriod = match(text, [
    /용역기간\s*[：:]\s*([^\n]+)/,
    /계약기간\s*[：:]\s*([^\n]+)/,
    /사업기간\s*[：:]\s*([^\n]+)/,
    // "다 용역기간 착수일로부터 24개월" 형태 (콜론 없음)
    /용역기간\s+(착수일[^\n]{0,50})/,
  ])

  const deadline = findDeadline(text)

  const qualMatch = text.match(/(?:참가자격|자격요건)\s*[：:]?\s*([^\n][\s\S]{0,400})/)
  const qualification = qualMatch
    ? qualMatch[1].trim().split('\n').slice(0, 4).join(' ').slice(0, 300)
    : null

  const checklist = extractChecklist(text)

  return {
    fileName,
    title,
    organization,
    estimatedAmount,
    servicePeriod,
    deadline,
    qualification,
    checklist,
    source: 'pdf',
    bidNtceNo: null,
    bidNtceOrd: null,
    baseAmount: null,
    participationRegions: null,
    licenseLimits: null,
  }
}
