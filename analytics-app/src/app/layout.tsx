import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '響鳴-Kyoumei- Analytics',
  description: 'Kyoumei NFT アクセス解析ダッシュボード（管理者専用）',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="dark">
      <body className="font-display antialiased">
        {children}
      </body>
    </html>
  )
}
