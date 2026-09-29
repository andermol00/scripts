import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromCookies } from '@/lib/auth'
import { generateTamperMonkeyScript } from '@/lib/scriptGenerator'
import { ObfuscationLevel } from '@/lib/obfuscator'

export async function GET() {
  const adminId = await getSessionFromCookies()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scripts = await prisma.script.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, description: true, version: true,
      isActive: true, obfuscationLevel: true, accessToken: true,
      createdAt: true, updatedAt: true, metadata: true,
    },
  })
  return NextResponse.json({ scripts })
}

export async function POST(req: NextRequest) {
  const adminId = await getSessionFromCookies()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, description, rawScript, obfuscationLevel } = await req.json()
    if (!name || !rawScript)
      return NextResponse.json({ error: 'Name and script required' }, { status: 400 })

    const appUrl = process.env.APP_URL || 'https://tamperapp.vercel.app'

    const record = await prisma.script.create({
      data: {
        name, description: description || '',
        rawScript, obfuscatedScript: '', metadata: {},
        obfuscationLevel: obfuscationLevel || 'high', version: 1,
      },
    })

    const { finalScript, metadata } = generateTamperMonkeyScript({
      scriptId: record.id, accessToken: record.accessToken,
      version: 1, rawScript,
      obfuscationLevel: (obfuscationLevel || 'high') as ObfuscationLevel,
      appUrl,
    })

    const updated = await prisma.script.update({
      where: { id: record.id },
      data : { obfuscatedScript: finalScript, metadata: metadata as any },
    })

    return NextResponse.json({ script: updated }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: `${error}` }, { status: 500 })
  }
}