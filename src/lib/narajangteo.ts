/**
 * 조달청 나라장터 입찰공고정보서비스(용역) 연동
 * https://apis.data.go.kr/1230000/ad/BidPublicInfoService
 *
 * 서버 전용 모듈. ServiceKey를 다루므로 클라이언트 컴포넌트에서 import 금지.
 */

const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService'

function getServiceKey(): string {
  const key = process.env.NARA_JANGTEO_SERVICE_KEY
  if (!key) throw new Error('NARA_JANGTEO_SERVICE_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

async function callApi(operation: string, params: Record<string, string | undefined>): Promise<Record<string, string>[]> {
  const url = new URL(`${BASE_URL}/${operation}`)
  url.searchParams.set('ServiceKey', getServiceKey())
  url.searchParams.set('type', 'json')
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }

  const res = await fetch(url, { cache: 'no-store' })
  const raw = await res.text()

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error(`나라장터 API 응답을 해석할 수 없습니다: ${raw.slice(0, 200)}`)
  }

  const response = (json as { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: unknown } } })?.response
  if (!response?.header || response.header.resultCode !== '00') {
    throw new Error(`나라장터 API 오류: ${response?.header?.resultMsg ?? raw.slice(0, 200)}`)
  }

  const items = response.body?.items
  if (!items || typeof items === 'string') return []
  return (Array.isArray(items) ? items : [items]) as Record<string, string>[]
}

export interface BidSearchResult {
  bidNtceNo: string
  bidNtceOrd: string
  title: string
  organization: string | null
  cntrctMethod: string | null
  deadline: string | null
  estimatedAmount: string | null
}

/** 공고게시일시 범위 + 키워드/기관명으로 용역 공고 검색 */
export async function searchServiceBids(params: {
  bidNtceNm?: string
  dminsttNm?: string
  inqryBgnDt: string
  inqryEndDt: string
  pageNo?: number
  numOfRows?: number
}): Promise<BidSearchResult[]> {
  const items = await callApi('getBidPblancListInfoServcPPSSrch', {
    inqryDiv: '1',
    inqryBgnDt: params.inqryBgnDt,
    inqryEndDt: params.inqryEndDt,
    bidNtceNm: params.bidNtceNm,
    dminsttNm: params.dminsttNm,
    pageNo: String(params.pageNo ?? 1),
    numOfRows: String(params.numOfRows ?? 30),
  })

  const seen = new Set<string>()
  const results: BidSearchResult[] = []
  for (const item of items) {
    if (seen.has(item.bidNtceNo)) continue
    seen.add(item.bidNtceNo)
    results.push({
      bidNtceNo: item.bidNtceNo,
      bidNtceOrd: item.bidNtceOrd,
      title: item.bidNtceNm,
      organization: item.dminsttNm || item.ntceInsttNm || null,
      cntrctMethod: item.cntrctCnclsMthdNm || null,
      deadline: toDateOnly(item.bidClseDt),
      estimatedAmount: formatWon(item.presmptPrce),
    })
  }
  return results
}

export interface ImportedBidFields {
  fileName: string
  title: string | null
  organization: string | null
  estimatedAmount: string | null
  servicePeriod: string | null
  deadline: string | null
  qualification: string | null
  source: 'api'
  bidNtceNo: string
  bidNtceOrd: string
  baseAmount: string | null
  participationRegions: string[] | null
  licenseLimits: string[] | null
}

/** 공고번호 하나의 상세 정보(기초금액·참가가능지역·면허제한 포함)를 모두 가져와 BidAnnouncement 필드로 변환 */
export async function importServiceBid(bidNtceNo: string): Promise<ImportedBidFields> {
  const detailItems = await callApi('getBidPblancListInfoServc', {
    inqryDiv: '2',
    bidNtceNo,
    pageNo: '1',
    numOfRows: '10',
  })
  const detail = detailItems[0]
  if (!detail) throw new Error(`공고번호 ${bidNtceNo}를 찾을 수 없습니다.`)

  const bidNtceOrd = detail.bidNtceOrd || '000'

  const [baseAmountItems, regionItems, licenseItems] = await Promise.all([
    callApi('getBidPblancListInfoServcBsisAmount', { inqryDiv: '2', bidNtceNo, pageNo: '1', numOfRows: '10' }),
    callApi('getBidPblancListInfoPrtcptPsblRgn', { inqryDiv: '2', bidNtceNo, bidNtceOrd, pageNo: '1', numOfRows: '50' }),
    callApi('getBidPblancListInfoLicenseLimit', { inqryDiv: '2', bidNtceNo, bidNtceOrd, pageNo: '1', numOfRows: '50' }),
  ])

  return {
    fileName: `[나라장터] ${detail.bidNtceNm}`,
    title: detail.bidNtceNm || null,
    organization: detail.dminsttNm || detail.ntceInsttNm || null,
    estimatedAmount: formatWon(detail.presmptPrce),
    servicePeriod: null,
    deadline: toDateOnly(detail.bidClseDt),
    qualification: buildQualificationSummary(detail),
    source: 'api',
    bidNtceNo,
    bidNtceOrd,
    baseAmount: formatWon(baseAmountItems[0]?.bssamt),
    participationRegions: regionItems.length > 0 ? regionItems.map(i => i.prtcptPsblRgnNm) : null,
    licenseLimits: licenseItems.length > 0 ? licenseItems.map(i => i.lcnsLmtNm) : null,
  }
}

export interface BidChange {
  changedAt: string
  itemName: string
  before: string
  after: string
}

export interface ChangeCheckResult {
  latestDeadline: string | null
  latestTitle: string | null
  changes: BidChange[]
}

/** 마감일 등 변경 여부 확인: 최신 상세정보 + 변경이력을 함께 반환 */
export async function checkServiceBidChanges(bidNtceNo: string): Promise<ChangeCheckResult> {
  const [detailItems, historyItems] = await Promise.all([
    callApi('getBidPblancListInfoServc', { inqryDiv: '2', bidNtceNo, pageNo: '1', numOfRows: '10' }),
    callApi('getBidPblancListInfoChgHstryServc', { inqryDiv: '2', bidNtceNo, pageNo: '1', numOfRows: '50' }),
  ])

  const detail = detailItems[0]

  return {
    latestDeadline: toDateOnly(detail?.bidClseDt),
    latestTitle: detail?.bidNtceNm || null,
    changes: historyItems.map(item => ({
      changedAt: item.chgDt,
      itemName: item.chgItemNm,
      before: item.bfchgVal,
      after: item.afchgVal,
    })),
  }
}

function toDateOnly(raw?: string): string | null {
  if (!raw) return null
  return raw.slice(0, 10)
}

function formatWon(raw?: string): string | null {
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return `${n.toLocaleString('ko-KR')}원`
}

function buildQualificationSummary(item: Record<string, string>): string | null {
  const parts: string[] = []
  if (item.cntrctCnclsMthdNm) parts.push(`계약체결방법: ${item.cntrctCnclsMthdNm}`)
  if (item.indstrytyLmtYn) parts.push(`업종제한: ${item.indstrytyLmtYn === 'Y' ? '있음' : '없음'}`)
  if (item.intrbidYn) parts.push(`국제입찰: ${item.intrbidYn === 'Y' ? '대상' : '비대상'}`)
  return parts.length > 0 ? parts.join(' · ') : null
}
