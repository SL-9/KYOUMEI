import { Suspense } from 'react'

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0b1e] flex items-center justify-center">
        <div className="text-[#9b92c9] text-sm">読み込み中...</div>
      </div>
    }>
      {children}
    </Suspense>
  )
}
