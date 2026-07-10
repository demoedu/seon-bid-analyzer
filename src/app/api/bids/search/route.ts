import { NextRequest, NextResponse } from 'next/server'
import { searchServiceBids } from '@/lib/narajangteo'

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') ?? undefined
  const org = searchParams.get('org') ?? undefined
  const days = Number(searchParams.get('days') ?? '30')

  const now = new Date()
  const from = new Date(now.getTime() - days * 86400000)

  try {
    const results = await searchServiceBids({
      bidNtceNm: keyword,
      dminsttNm: org,
      inqryBgnDt: formatDateTime(from),
      inqryEndDt: formatDateTime(now),
    })
    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.' }, { status: 502 })
  }
}
