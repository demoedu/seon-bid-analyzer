import { NextRequest, NextResponse } from 'next/server'
import { importServiceBid } from '@/lib/narajangteo'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ bidNtceNo: string }> }) {
  const { bidNtceNo } = await params

  try {
    const fields = await importServiceBid(bidNtceNo)
    return NextResponse.json({ fields })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '공고 조회 중 오류가 발생했습니다.' }, { status: 502 })
  }
}
