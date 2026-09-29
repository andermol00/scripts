import { redirect } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const adminId = await getSessionFromCookies()
  if (!adminId) redirect('/login')
  return <>{children}</>
}