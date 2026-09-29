import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromCookies } from '@/lib/auth'
import { generateTamperMonkeyScript } from '@/lib/scriptGenerator'
import { ObfuscationLevel } from '@/lib/obfuscator'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await getSessionFromCookies()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const view   = new URL(req.url).searchParams.get('view')
  const script = await prisma.script.findUnique({ where: { id: params.id } })
  if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (view === 'raw')   return NextResponse.json({ rawScript: script.rawScript })
  if (view === 'final') return NextResponse.json({ finalScript: script.obfuscatedScript })

  const { rawScript, ...safe } = script
  return NextResponse.json({ script: safe })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await getSessionFromCookies()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, description, rawScript, obfuscationLevel } = await req.json()
    const existing = await prisma.script.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newVersion = existing.version + 1
    const appUrl     = process.env.APP_URL || 'https://tamperapp.vercel.app'

    const { finalScript, metadata } = generateTamperMonkeyScript({
      scriptId: existing.id, accessToken: existing.accessToken,
      version: newVersion, rawScript,
      obfuscationLevel: (obfuscationLevel || existing.obfuscationLevel) as ObfuscationLevel,
      appUrl,
    })

    const updated = await prisma.script.update({
      where: { id: params.id },
      data : {
        name, description, rawScript,
        obfuscatedScript: finalScript,
        metadata: metadata as any,
        obfuscationLevel: obfuscationLevel || existing.obfuscationLevel,
        version: newVersion,
      },
    })
    return NextResponse.json({ script: updated })
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await getSessionFromCookies()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data    = await req.json()
  const updated = await prisma.script.update({ where: { id: params.id }, data })
  return NextResponse.json({ script: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const adminId = await getSessionFromCookies()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.checkLog.deleteMany({ where: { scriptId: params.id } })
  await prisma.script.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}