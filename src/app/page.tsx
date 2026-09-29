import { redirect } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/auth'

export default async function Home() {
  const adminId = await getSessionFromCookies()
  if (adminId) redirect('/dashboard')
  else redirect('/login')
}