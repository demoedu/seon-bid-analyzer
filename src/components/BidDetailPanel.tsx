'use client'

import { useState } from 'react'
import type { BidAnnouncement, ChecklistItem } from '@/types/bid'
import { DayBadge } from './DayBadge'
import { ChecklistPanel } from './ChecklistPanel'
import { DocumentForm } from './DocumentForm'

type Tab = '개요' | '체크리스트' | '서류작성'

interface Props {
  bid: BidAnnouncement
  onUpdateChecklist: (checklist: ChecklistItem[]) => void
  onDelete: () => void
  onCheckChanges: () => void
}

const OVERVIEW_FIELDS = [
  { label: '예정금액', key: 'estimatedAmount' },
  { label: '용역기간', key: 'servicePeriod' },
  { label: '마감일', key: 'deadline' },
  { label: '참가자격', key: 'qualification' },
  { label: '파일명', key: 'fileName' },
] as const

export function BidDetailPanel({ bid, onUpdateChecklist, onDelete, onCheckChanges }: Props) {
  const [tab, setTab] = useState<Tab>('개요')

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-6 py-4 border-b flex items-start justify-between gap-4 bg-white">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 text-lg leading-tight">
            {bid.title ?? '공고명 미확인'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{bid.organization ?? '발주기관 미확인'}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DayBadge deadline={bid.deadline} />
          {bid.source === 'api' && bid.bidNtceNo && (
            <button
              onClick={onCheckChanges}
              className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded px-2 py-1 transition-colors"
            >
              변경 확인
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 rounded px-2 py-1 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b px-6 flex gap-1 bg-white">
        {(['개요', '체크리스트', '서류작성'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-3 text-sm border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === '개요' && (
          <div className="p-6">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {OVERVIEW_FIELDS.map(({ label, key }) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-3 pr-6 text-gray-500 font-medium w-28 align-top">{label}</td>
                    <td className="py-3 text-gray-900 whitespace-pre-wrap">
                      {bid[key] ?? <span className="text-gray-400 italic">미확인 — 원문 직접 확인</span>}
                    </td>
                  </tr>
                ))}
                {bid.baseAmount && (
                  <tr className="border-b last:border-0">
                    <td className="py-3 pr-6 text-gray-500 font-medium w-28 align-top">기초금액</td>
                    <td className="py-3 text-gray-900">{bid.baseAmount}</td>
                  </tr>
                )}
                {bid.participationRegions && (
                  <tr className="border-b last:border-0">
                    <td className="py-3 pr-6 text-gray-500 font-medium w-28 align-top">참가가능지역</td>
                    <td className="py-3 text-gray-900">{bid.participationRegions.join(', ')}</td>
                  </tr>
                )}
                {bid.licenseLimits && (
                  <tr className="border-b last:border-0">
                    <td className="py-3 pr-6 text-gray-500 font-medium w-28 align-top">면허제한</td>
                    <td className="py-3 text-gray-900">{bid.licenseLimits.join(', ')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === '체크리스트' && (
          <ChecklistPanel bid={bid} onUpdate={onUpdateChecklist} />
        )}
        {tab === '서류작성' && (
          <DocumentForm bid={bid} />
        )}
      </div>
    </div>
  )
}
