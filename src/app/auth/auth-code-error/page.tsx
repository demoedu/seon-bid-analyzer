import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-lg font-semibold text-gray-900">로그인 링크가 만료됐거나 잘못됐어요</h1>
        <p className="text-sm text-gray-500">
          링크를 다시 요청해 주세요. 이메일의 링크는 한 번만 사용할 수 있고, 시간이 지나면 만료됩니다.
        </p>
        <Link href="/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          로그인 페이지로 돌아가기
        </Link>
      </div>
    </div>
  )
}
