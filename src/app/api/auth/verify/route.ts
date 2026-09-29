import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyTOTP, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { totpCode } = await req.json()
    if (!totpCode || totpCode.length !== 6)
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

    const admin = await prisma.admin.findFirst({ where: { isSetup: true } })
    if (!admin) return NextResponse.json({ error: 'Admin not configured' }, { status: 404 })

    if (!verifyTOTP(totpCode, admin.totpSecret))
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })

    const token    = await createSession(admin.id)
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure  : process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge  : 86400,
      path    : '/',
    })
    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}