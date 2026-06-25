'use client'

import { useEffect, useState } from 'react'
import type { BidAnnouncement, ChecklistItem } from '@/types/bid'
import { loadBids, saveBids } from '@/lib/storage'
import { extractTextFromPdf } from '@/lib/parsePdf'
import { extractFields } from '@/lib/extractFields'
import { WarningBanner } from '@/components/WarningBanner'
import { UploadZone } from '@/components/UploadZone'
import { BidSidebarRow } from '@/components/BidSidebarRow'
import { BidDetailPanel } from '@/components/BidDetailPanel'

export default function Home() {
  const [bids, setBids] = useState<BidAnnouncement[]>([])
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setBids(loadBids()) }, [])

  const updateBids = (next: BidAnnouncement[]) => {
    setBids(next)
    saveBids(next)
  }

  const handleUpload = async (file: File) => {
    setLoading(true)
    try {
      const text = await extractTextFromPdf(file)
      const fields = extractFields(text, file.name)
      const bid: BidAnnouncement = { id: crypto.randomUUID(), uploadedAt: new Date().toISOString(), ...fields }
      updateBids([...bids, bid])
      setSelectedBidId(bid.id)
    } finally {
      setLoading(false)
    }
  }

  const deleteBid = (id: string) => updateBids(bids.filter(b => b.id !== id))

  const updateChecklist = (bidId: string, checklist: ChecklistItem[]) =>
    updateBids(bids.map(b => b.id === bidId ? { ...b, checklist } : b))

  const sortedBids = [...bids].sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline.localeCompare(b.deadline)
  })

  const selectedBid = bids.find(b => b.id === selectedBidId) ?? null

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">선엔지니어링 입찰 공고 분석기</span>
        </div>
        <label className={`cursor-pointer px-3 py-1.5 text-white rounded text-sm transition-colors ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {loading ? '분석 중...' : '+ PDF 업로드'}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            disabled={loading}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ''
            }}
          />
        </label>
      </header>

      <WarningBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r bg-white overflow-y-auto flex-shrink-0">
          {sortedBids.map(bid => (
            <BidSidebarRow
              key={bid.id}
              bid={bid}
              selected={bid.id === selectedBidId}
              onClick={() => setSelectedBidId(bid.id)}
            />
          ))}
          {bids.length === 0 && (
            <p className="p-4 text-sm text-gray-400">
              PDF를 업로드하면 여기에 공고 목록이 표시됩니다.
            </p>
          )}
        </aside>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto bg-white">
          {selectedBid ? (
            <BidDetailPanel
              bid={selectedBid}
              onUpdateChecklist={cl => updateChecklist(selectedBid.id, cl)}
              onDelete={() => { deleteBid(selectedBid.id); setSelectedBidId(null) }}
            />
          ) : (
            <UploadZone onUpload={handleUpload} loading={loading} />
          )}
        </main>
      </div>
    </div>
  )
}
