import { authenticator } from 'otplib'
import { prisma } from './db'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-this-please'
)

export function generateTOTPSecret(): string {
  return authenticator.generateSecret()
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    authenticator.options = { window: 1 }
    return authenticator.verify({ token, secret })
  } catch {
    return false
  }
}

export function getTOTPUri(secret: string, username: string): string {
  return authenticator.keyuri(username, 'TamperMonkey Admin', secret)
}

export async function createSession(adminId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const token = await new SignJWT({ adminId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(SECRET)

  await prisma.session.create({ data: { token, adminId, expiresAt } })
  return token
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    await jwtVerify(token, SECRET)
    const session = await prisma.session.findUnique({
      where: { token },
      include: { admin: true },
    })
    if (!session || session.expiresAt < new Date()) return null
    return session.adminId
  } catch {
    return null
  }
}

export async function getSessionFromCookies(): Promise<string | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}