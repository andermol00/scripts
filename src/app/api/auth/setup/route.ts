import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateTOTPSecret, getTOTPUri, verifyTOTP, createSession } from '@/lib/auth'
import QRCode from 'qrcode'

export async function GET() {
  try {
    const admin = await prisma.admin.findFirst()
    return NextResponse.json({ isSetup: admin?.isSetup || false })
  } catch {
    return NextResponse.json({ isSetup: false })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { setupKey, requestQR, secret, totpCode } = body

    if (setupKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 401 })
    }

    const username = process.env.ADMIN_USERNAME || 'admin'

    if (requestQR) {
      const newSecret = generateTOTPSecret()
      const uri       = getTOTPUri(newSecret, username)
      const qrCode    = await QRCode.toDataURL(uri)

      await prisma.admin.upsert({
        where : { username },
        create: { username, totpSecret: newSecret, isSetup: false },
        update: { totpSecret: newSecret, isSetup: false },
      })

      return NextResponse.json({ qrCode, secret: newSecret })
    }

    if (secret && totpCode) {
      const admin = await prisma.admin.findFirst({ where: { username } })
      if (!admin) return NextResponse.json({ error: 'Request QR first' }, { status: 400 })

      if (!verifyTOTP(totpCode, admin.totpSecret)) {
        return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 401 })
      }

      await prisma.admin.update({ where: { id: admin.id }, data: { isSetup: true } })

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
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}