'use client'

import { useState } from 'react'

interface SearchResult {
  bidNtceNo: string
  bidNtceOrd: string
  title: string
  organization: string | null
  cntrctMethod: string | null
  deadline: string | null
  estimatedAmount: string | null
}

interface Props {
  onImport: (bidNtceNo: string) => Promise<void>
  onClose: () => void
}

export function SearchBidPanel({ onImport, onClose }: Props) {
  const [keyword, setKeyword] = useState('')
  const [org, setOrg] = useState('')
  const [days, setDays] = useState(30)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importingNo, setImportingNo] = useState<string | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ days: String(days) })
      if (keyword.trim()) params.set('keyword', keyword.trim())
      if (org.trim()) params.set('org', org.trim())
      const res = await fetch(`/api/bids/search?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '검색에 실패했습니다.')
      setResults(data.results)
    } catch (e) {
      setError(e instanceof Error ? e.message : '검색에 실패했습니다.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (bidNtceNo: string) => {
    setImportingNo(bidNtceNo)
    setError(null)
    try {
      await onImport(bidNtceNo)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오기에 실패했습니다.')
    } finally {
      setImportingNo(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">나라장터 공고 검색으로 가져오기</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">닫기 ✕</button>
        </div>

        <div className="px-5 py-4 border-b flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="공고명 키워드 (예: 측량 용역)"
              className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              value={org}
              onChange={e => setOrg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="수요기관명 (선택)"
              className="w-40 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500 flex items-center gap-1.5">
              최근
              <select
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="border rounded px-1.5 py-1 text-xs"
              >
                <option value={7}>7일</option>
                <option value={30}>30일</option>
                <option value={90}>90일</option>
              </select>
              간 공고된 건
            </label>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>
        </div>

        {error && <p className="px-5 py-2 text-sm text-red-600 bg-red-50">{error}</p>}

        <div className="flex-1 overflow-y-auto">
          {results === null && !loading && (
            <p className="p-6 text-sm text-gray-400 text-center">키워드나 기관명으로 검색해 보세요.</p>
          )}
          {results?.length === 0 && (
            <p className="p-6 text-sm text-gray-400 text-center">검색 결과가 없습니다.</p>
          )}
          {results?.map(r => (
            <div key={r.bidNtceNo} className="px-5 py-3 border-b flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.organization ?? '발주기관 미확인'}
                  {r.cntrctMethod && ` · ${r.cntrctMethod}`}
                  {r.deadline && ` · 마감 ${r.deadline}`}
                  {r.estimatedAmount && ` · ${r.estimatedAmount}`}
                </p>
              </div>
              <button
                onClick={() => handleImport(r.bidNtceNo)}
                disabled={importingNo !== null}
                className="shrink-0 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
              >
                {importingNo === r.bidNtceNo ? '가져오는 중...' : '가져오기'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
