export type ChecklistStatus = 'not-started' | 'in-progress' | 'done'

export interface ChecklistItem {
  id: string
  label: string
  status: ChecklistStatus
}

export interface BidAnnouncement {
  id: string
  fileName: string
  uploadedAt: string
  title: string | null
  organization: string | null
  estimatedAmount: string | null
  servicePeriod: string | null
  deadline: string | null
  qualification: string | null
  checklist: ChecklistItem[]
  /** 'pdf': PDF 업로드로 추출, 'api': 나라장터 공고 검색으로 가져옴 */
  source: 'pdf' | 'api'
  /** 나라장터 입찰공고번호 (API로 가져온 공고만 존재) */
  bidNtceNo: string | null
  bidNtceOrd: string | null
  baseAmount: string | null
  participationRegions: string[] | null
  licenseLimits: string[] | null
}

export interface CompanyInfo {
  name: string
  bizNumber: string
}

export interface SimilarProject {
  id: string
  projectName: string
  client: string
  amount: string
  period: string
  role: string
}

export interface Engineer {
  id: string
  name: string
  license: string
  acquiredDate: string
  affiliation: string
  field: string
}
