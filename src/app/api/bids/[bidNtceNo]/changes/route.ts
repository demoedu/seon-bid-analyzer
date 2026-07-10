import { NextRequest, NextResponse } from 'next/server'
import { checkServiceBidChanges } from '@/lib/narajangteo'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ bidNtceNo: string }> }) {
  const { bidNtceNo } = await params

  try {
    const result = await checkServiceBidChanges(bidNtceNo)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '변경 확인 중 오류가 발생했습니다.' }, { status: 502 })
  }
}
