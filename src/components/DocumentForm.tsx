'use client'

import { useEffect, useState } from 'react'
import type { BidAnnouncement, CompanyInfo, Engineer, SimilarProject } from '@/types/bid'
import { loadCompanyInfo, saveCompanyInfo } from '@/lib/storage'
import { exportDocx } from '@/lib/exportDocx'

interface Props {
  bid: BidAnnouncement
}

function newProject(): SimilarProject {
  return { id: crypto.randomUUID(), projectName: '', client: '', amount: '', period: '', role: '' }
}

function newEngineer(): Engineer {
  return { id: crypto.randomUUID(), name: '', license: '', acquiredDate: '', affiliation: '', field: '' }
}

export function DocumentForm({ bid }: Props) {
  const [company, setCompany] = useState<CompanyInfo>({ name: '', bizNumber: '' })
  const [projects, setProjects] = useState<SimilarProject[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [draft, setDraft] = useState('')
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  useEffect(() => { loadCompanyInfo().then(setCompany) }, [])

  const updateCompany = (field: keyof CompanyInfo, value: string) => {
    const updated = { ...company, [field]: value }
    setCompany(updated)
    saveCompanyInfo(updated)
  }

  const updateProject = (id: string, field: keyof SimilarProject, value: string) =>
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))

  const updateEngineer = (id: string, field: keyof Engineer, value: string) =>
    setEngineers(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))

  const generateDraft = async () => {
    setDraftLoading(true)
    setDraftError(null)
    try {
      const res = await fetch('/api/documents/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, company, projects, engineers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '초안 생성에 실패했습니다.')
      setDraft(data.draft)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : '초안 생성 중 오류가 발생했습니다.')
    } finally {
      setDraftLoading(false)
    }
  }

  const handleExport = () =>
    exportDocx({ bidTitle: bid.title ?? '공고명 미확인', company, projects, engineers, draft })

  return (
    <div className="flex flex-col h-full">
      {/* Export button */}
      <div className="px-6 py-3 border-b flex justify-end">
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Word 내보내기
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Company */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">회사 정보</h3>
          <div className="grid grid-cols-2 gap-3">
            {([['name', '회사명'], ['bizNumber', '사업자등록번호']] as const).map(([field, label]) => (
              <div key={field}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input
                  value={company[field]}
                  onChange={e => updateCompany(field, e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
        </section>

        {/* AI intro draft */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">참여의향서 도입부 (AI 초안)</h3>
            <button
              onClick={generateDraft}
              disabled={draftLoading}
              className={`text-xs px-2.5 py-1 rounded text-white transition-colors ${
                draftLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {draftLoading ? 'AI 초안 생성 중...' : 'AI로 초안 생성'}
            </button>
          </div>
          {draftError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
              {draftError}
            </p>
          )}
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="AI로 초안을 생성하거나 직접 작성하세요. 회사 정보·실적·기술자를 입력한 뒤 생성하면 더 정확합니다."
            rows={6}
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 resize-y"
          />
        </section>

        {/* Similar projects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">유사용역 실적</h3>
            <button onClick={() => setProjects(p => [...p, newProject()])} className="text-xs text-blue-600 hover:underline">
              + 행 추가
            </button>
          </div>
          <div className="border rounded-lg overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['용역명', '발주기관', '계약금액', '용역기간', '담당업무', ''].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-gray-400">행 추가 버튼을 눌러주세요</td>
                  </tr>
                )}
                {projects.map(p => (
                  <tr key={p.id} className="border-t">
                    {(['projectName', 'client', 'amount', 'period', 'role'] as const).map(field => (
                      <td key={field} className="px-1 py-1">
                        <input
                          value={p[field]}
                          onChange={e => updateProject(p.id, field, e.target.value)}
                          className="w-full border rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => setProjects(prev => prev.filter(x => x.id !== p.id))}
                        className="text-gray-300 hover:text-red-400"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Engineers */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">기술자 경력</h3>
            <button onClick={() => setEngineers(e => [...e, newEngineer()])} className="text-xs text-blue-600 hover:underline">
              + 행 추가
            </button>
          </div>
          <div className="border rounded-lg overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['성명', '자격종목', '취득일', '소속', '담당분야', ''].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engineers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-gray-400">행 추가 버튼을 눌러주세요</td>
                  </tr>
                )}
                {engineers.map(eng => (
                  <tr key={eng.id} className="border-t">
                    {(['name', 'license', 'acquiredDate', 'affiliation', 'field'] as const).map(field => (
                      <td key={field} className="px-1 py-1">
                        <input
                          value={eng[field]}
                          onChange={e => updateEngineer(eng.id, field, e.target.value)}
                          className="w-full border rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => setEngineers(prev => prev.filter(x => x.id !== eng.id))}
                        className="text-gray-300 hover:text-red-400"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
