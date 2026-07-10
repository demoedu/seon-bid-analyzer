'use client'

import { useEffect, useState } from 'react'
import type { BidAnnouncement, ChecklistItem } from '@/types/bid'
import { loadBids, saveBid, deleteBid as deleteBidFromDb } from '@/lib/storage'
import { extractTextFromPdf } from '@/lib/parsePdf'
import { extractFields } from '@/lib/extractFields'
import { WarningBanner } from '@/components/WarningBanner'
import { UploadZone } from '@/components/UploadZone'
import { BidSidebarRow } from '@/components/BidSidebarRow'
import { BidDetailPanel } from '@/components/BidDetailPanel'
import { LogoutButton } from '@/components/LogoutButton'
import { SearchBidPanel } from '@/components/SearchBidPanel'

export default function Home() {
  const [bids, setBids] = useState<BidAnnouncement[]>([])
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    loadBids().then(setBids)
  }, [])

  const handleUpload = async (file: File) => {
    setLoading(true)
    try {
      const text = await extractTextFromPdf(file)
      const fields = extractFields(text, file.name)
      const bid: BidAnnouncement = { id: crypto.randomUUID(), uploadedAt: new Date().toISOString(), ...fields }
      await saveBid(bid)
      setBids(prev => [...prev, bid].sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      }))
      setSelectedBidId(bid.id)
    } finally {
      setLoading(false)
    }
  }

  const handleImportBid = async (bidNtceNo: string) => {
    const existing = bids.find(b => b.bidNtceNo === bidNtceNo)
    if (existing) {
      setSelectedBidId(existing.id)
      return
    }

    const res = await fetch(`/api/bids/${bidNtceNo}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? '공고를 가져오지 못했습니다.')

    const bid: BidAnnouncement = {
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
      checklist: [],
      ...data.fields,
    }
    await saveBid(bid)
    setBids(prev => [...prev, bid].sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    }))
    setSelectedBidId(bid.id)
  }

  const handleCheckChanges = async (bid: BidAnnouncement) => {
    if (!bid.bidNtceNo) return

    const res = await fetch(`/api/bids/${bid.bidNtceNo}/changes`)
    const data = await res.json()
    if (!res.ok) {
      alert(data.error ?? '변경 확인에 실패했습니다.')
      return
    }

    const deadlineChanged = data.latestDeadline && data.latestDeadline !== bid.deadline
    const titleChanged = data.latestTitle && data.latestTitle !== bid.title
    if (!deadlineChanged && !titleChanged) {
      alert('변경된 내용이 없습니다.')
      return
    }

    const lines: string[] = []
    if (deadlineChanged) lines.push(`마감일: ${bid.deadline ?? '미확인'} → ${data.latestDeadline}`)
    if (titleChanged) lines.push(`공고명: ${bid.title ?? '미확인'} → ${data.latestTitle}`)
    if (!confirm(`나라장터에서 변경사항이 확인되었습니다.\n\n${lines.join('\n')}\n\n반영할까요?`)) return

    const updated: BidAnnouncement = {
      ...bid,
      deadline: data.latestDeadline ?? bid.deadline,
      title: data.latestTitle ?? bid.title,
    }
    await saveBid(updated)
    setBids(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  const handleDelete = async (id: string) => {
    await deleteBidFromDb(id)
    setBids(prev => prev.filter(b => b.id !== id))
    setSelectedBidId(null)
  }

  const updateChecklist = async (bidId: string, checklist: ChecklistItem[]) => {
    const updated = bids.map(b => b.id === bidId ? { ...b, checklist } : b)
    setBids(updated)
    const bid = updated.find(b => b.id === bidId)
    if (bid) await saveBid(bid)
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + 공고 검색
          </button>
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
          <LogoutButton />
        </div>
      </header>

      {showSearch && (
        <SearchBidPanel onImport={handleImportBid} onClose={() => setShowSearch(false)} />
      )}

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
              onDelete={() => handleDelete(selectedBid.id)}
              onCheckChanges={() => handleCheckChanges(selectedBid)}
            />
          ) : (
            <UploadZone onUpload={handleUpload} loading={loading} />
          )}
        </main>
      </div>
    </div>
  )
}
