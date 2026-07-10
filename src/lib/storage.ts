import { createClient } from '@/lib/supabase/client'
import type { BidAnnouncement, CompanyInfo } from '@/types/bid'

export async function loadBids(): Promise<BidAnnouncement[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(dbRowToBid)
}

export async function saveBid(bid: BidAnnouncement): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('bids').upsert(bidToDbRow(bid))
  if (error) console.error(error)
}

export async function deleteBid(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('bids').delete().eq('id', id)
  if (error) console.error(error)
}

export async function loadCompanyInfo(): Promise<CompanyInfo> {
  const supabase = createClient()
  const { data, error } = await supabase.from('company_info').select('*').eq('id', 1).single()
  if (error) { console.error(error); return { name: '', bizNumber: '' } }
  return { name: data.name, bizNumber: data.biz_number }
}

export async function saveCompanyInfo(info: CompanyInfo): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('company_info')
    .update({ name: info.name, biz_number: info.bizNumber })
    .eq('id', 1)
  if (error) console.error(error)
}

function bidToDbRow(bid: BidAnnouncement) {
  return {
    id: bid.id,
    file_name: bid.fileName,
    uploaded_at: bid.uploadedAt,
    title: bid.title,
    organization: bid.organization,
    estimated_amount: bid.estimatedAmount,
    service_period: bid.servicePeriod,
    deadline: bid.deadline,
    qualification: bid.qualification,
    checklist: bid.checklist,
    source: bid.source,
    bid_ntce_no: bid.bidNtceNo,
    bid_ntce_ord: bid.bidNtceOrd,
    base_amount: bid.baseAmount,
    participation_regions: bid.participationRegions,
    license_limits: bid.licenseLimits,
  }
}

function dbRowToBid(row: Record<string, unknown>): BidAnnouncement {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    uploadedAt: row.uploaded_at as string,
    title: row.title as string | null,
    organization: row.organization as string | null,
    estimatedAmount: row.estimated_amount as string | null,
    servicePeriod: row.service_period as string | null,
    deadline: row.deadline as string | null,
    qualification: row.qualification as string | null,
    checklist: row.checklist as BidAnnouncement['checklist'],
    source: (row.source as BidAnnouncement['source']) ?? 'pdf',
    bidNtceNo: row.bid_ntce_no as string | null,
    bidNtceOrd: row.bid_ntce_ord as string | null,
    baseAmount: row.base_amount as string | null,
    participationRegions: row.participation_regions as string[] | null,
    licenseLimits: row.license_limits as string[] | null,
  }
}
