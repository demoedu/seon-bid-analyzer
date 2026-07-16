import type { BidAnnouncement, CompanyInfo, Engineer, SimilarProject } from '@/types/bid'

export interface BidSummary {
  summary: string
  eligibility: string
  deadline: string
}

const MODEL = 'gemini-3.1-flash-lite'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function buildPrompt(bid: BidAnnouncement): string {
  const lines = [
    `공고명: ${bid.title ?? '미확인'}`,
    `발주기관: ${bid.organization ?? '미확인'}`,
    `예정금액: ${bid.estimatedAmount ?? '미확인'}`,
    `용역기간: ${bid.servicePeriod ?? '미확인'}`,
    `마감일: ${bid.deadline ?? '미확인'}`,
    `참가자격: ${bid.qualification ?? '미확인'}`,
  ]
  if (bid.participationRegions?.length) lines.push(`참가가능지역: ${bid.participationRegions.join(', ')}`)
  if (bid.licenseLimits?.length) lines.push(`면허제한: ${bid.licenseLimits.join(', ')}`)

  return [
    '아래는 입찰 공고 정보다. 이 정보를 바탕으로 다음 JSON 형식으로만 답하라 (다른 텍스트 금지):',
    '{"summary": "핵심 요약 (2~3문장)", "eligibility": "참가 자격 요약 (1~2문장)", "deadline": "마감일 안내 문장 (1문장)"}',
    '',
    ...lines,
  ].join('\n')
}

export async function summarizeBid(bid: BidAnnouncement): Promise<BidSummary> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

  const hasContent = bid.title || bid.organization || bid.qualification || bid.deadline
  if (!hasContent) throw new Error('EMPTY_INPUT')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(bid) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`GEMINI_ERROR_${res.status}`)

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('GEMINI_EMPTY_RESPONSE')

  const parsed = JSON.parse(text)
  if (!parsed.summary || !parsed.eligibility || !parsed.deadline) throw new Error('GEMINI_MALFORMED_RESPONSE')

  return parsed
}

function buildIntroDraftPrompt(
  bid: BidAnnouncement,
  company: CompanyInfo,
  projects: SimilarProject[],
  engineers: Engineer[]
): string {
  const lines = [
    `공고명: ${bid.title ?? '미확인'}`,
    `발주기관: ${bid.organization ?? '미확인'}`,
    `용역기간: ${bid.servicePeriod ?? '미확인'}`,
    `참가자격: ${bid.qualification ?? '미확인'}`,
    `회사명: ${company.name || '미기입'}`,
  ]
  if (projects.length) {
    lines.push('유사용역 실적:')
    projects.forEach(p => lines.push(`- ${p.projectName} (${p.client}, ${p.period}, 담당: ${p.role})`))
  } else {
    lines.push('유사용역 실적: 제공되지 않음')
  }
  if (engineers.length) {
    lines.push('투입 기술자:')
    engineers.forEach(e => lines.push(`- ${e.name} (${e.license}, ${e.affiliation})`))
  } else {
    lines.push('투입 기술자: 제공되지 않음')
  }

  return [
    '너는 엔지니어링 회사의 입찰 참여의향서를 작성하는 담당자다.',
    '아래 정보를 바탕으로 참여의향서 도입부(회사 소개 및 참여 의지)를 3~4문단의 격식체 한국어 산문으로 작성하라.',
    '반드시 제시된 사실(회사명·실적·기술자 목록)만 근거로 담백하게 써라.',
    '"제공되지 않음"으로 표시된 항목(실적, 기술자 등)에 대해서는 보유량·건수·인원수 등을 절대 지어내지 말고, 해당 내용 자체를 언급하지 마라. 예: 실적이 "제공되지 않음"이면 "다수의 실적을 보유" 같은 표현을 쓰지 말 것.',
    '결과는 다른 설명 없이 본문 텍스트만 출력하라.',
    '',
    ...lines,
  ].join('\n')
}

export async function generateIntroDraft(
  bid: BidAnnouncement,
  company: CompanyInfo,
  projects: SimilarProject[],
  engineers: Engineer[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')

  if (!company.name) throw new Error('EMPTY_INPUT')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildIntroDraftPrompt(bid, company, projects, engineers) }] }],
    }),
  })

  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`GEMINI_ERROR_${res.status}`)

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('GEMINI_EMPTY_RESPONSE')

  return text.trim()
}
