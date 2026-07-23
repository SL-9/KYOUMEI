import { redirect } from 'next/navigation'

// ルートページは /admin/analytics にリダイレクト
export default function Home() {
  redirect('/admin/analytics')
}
