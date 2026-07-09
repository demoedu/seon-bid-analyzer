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

  const handleExport = () =>
    exportDocx({ bidTitle: bid.title ?? '공고명 미확인', company, projects, engineers })

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
