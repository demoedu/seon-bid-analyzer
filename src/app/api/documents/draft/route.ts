import { NextRequest, NextResponse } from 'next/server'
import { generateIntroDraft } from '@/lib/gemini'
import type { BidAnnouncement, CompanyInfo, Engineer, SimilarProject } from '@/types/bid'

const ERROR_MESSAGES: Record<string, string> = {
  EMPTY_INPUT: '회사명을 먼저 입력해주세요.',
  RATE_LIMIT: 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  GEMINI_EMPTY_RESPONSE: 'AI가 응답을 생성하지 못했습니다. 다시 시도해주세요.',
}

export async function POST(request: NextRequest) {
  const { bid, company, projects, engineers } = (await request.json()) as {
    bid: BidAnnouncement
    company: CompanyInfo
    projects: SimilarProject[]
    engineers: Engineer[]
  }

  try {
    const draft = await generateIntroDraft(bid, company, projects ?? [], engineers ?? [])
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('[documents/draft]', err)
    const code = err instanceof Error ? err.message : ''
    const message = ERROR_MESSAGES[code] ?? '초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    const status = code === 'EMPTY_INPUT' ? 400 : code === 'RATE_LIMIT' ? 429 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
