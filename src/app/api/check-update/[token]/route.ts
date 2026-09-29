import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Script-Token',
  'Cache-Control'               : 'no-cache, no-store',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const script = await prisma.script.findUnique({
      where : { accessToken: params.token },
      select: { id: true, version: true, isActive: true, name: true },
    })

    if (!script) return NextResponse.json({ hasUpdate: false, active: false, version: 0 }, { headers: CORS })

    if (!script.isActive) {
      await log(script.id, 'killed', req)
      return NextResponse.json({ hasUpdate: false, active: false, version: script.version }, { headers: CORS })
    }

    const clientVersion = parseInt(new URL(req.url).searchParams.get('v') || '0', 10)
    const hasUpdate     = script.version > clientVersion

    await log(script.id, hasUpdate ? 'update_available' : 'up_to_date', req)

    return NextResponse.json(
      { hasUpdate, version: script.version, clientVersion, name: script.name, active: true },
      { headers: CORS }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ hasUpdate: false, active: true }, { status: 500, headers: CORS })
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const script = await prisma.script.findUnique({
      where : { accessToken: params.token },
      select: { id: true, isActive: true },
    })
    if (!script) return NextResponse.json({ ok: false }, { headers: CORS })

    await log(script.id, 'ping', req)
    return NextResponse.json({ ok: true, active: script.isActive }, { headers: CORS })
  } catch {
    return NextResponse.json({ ok: false }, { headers: CORS })
  }
}

async function log(scriptId: string, action: string, req: NextRequest) {
  await prisma.checkLog.create({
    data: {
      scriptId,
      action,
      ip       : req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
    },
  }).catch(() => {})
}