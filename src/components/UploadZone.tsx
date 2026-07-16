'use client'

import { useRef, useState } from 'react'

interface Props {
  onUpload: (file: File) => void
  loading: boolean
}

export function UploadZone({ onUpload, loading }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') onUpload(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={loading ? -1 : 0}
      aria-disabled={loading}
      onKeyDown={e => {
        if (loading) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors select-none ${
        loading ? 'opacity-50 cursor-not-allowed border-gray-200' :
        dragging ? 'border-blue-400 bg-blue-50 cursor-copy' :
        'border-gray-300 hover:border-gray-400 cursor-pointer'
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleChange} />
      {loading ? (
        <p className="text-gray-500 text-sm">PDF 분석 중...</p>
      ) : (
        <>
          <p className="text-gray-600 font-medium">공고 PDF를 드래그하거나 클릭해서 업로드</p>
          <p className="text-xs text-gray-400 mt-1">여러 공고를 순서대로 업로드할 수 있습니다</p>
        </>
      )}
    </div>
  )
}
