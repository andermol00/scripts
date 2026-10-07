import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/scripts/[id]/[filename]
 *
 * Sirve el script como .user.js para que Tampermonkey reconozca la URL como
 * instalable / actualizabe. El filename puede ser cualquier cosa (ej. "script.user.js").
 *
 * @updateURL  https://…/api/scripts/<id>/script.user.js
 * @downloadURL https://…/api/scripts/<id>/script.user.js
 *
 * También funciona como link instalador directo: al abrir la URL en el
 * navegador, Tampermonkey intercepta la descarga y muestra la pantalla de
 * instalación/actualización.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; filename: string } }
) {
  try {
    const script = await prisma.script.findUnique({ where: { id: params.id } })

    if (!script) {
      return new NextResponse('// Script not found\n', {
        status: 404,
        headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
      })
    }

    await prisma.checkLog.create({
      data: {
        scriptId : script.id,
        action   : script.isActive ? 'download' : 'download_inactive',
        ip       : req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    }).catch(() => {})

    if (!script.isActive) {
      return new NextResponse(
        `// ==UserScript==\n// @name         ${script.name} [DISABLED]\n// @version      ${script.version}\n// ==/UserScript==\n\n// Script disabled by administrator.\n`,
        {
          status : 200,
          headers: {
            'Content-Type' : 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        }
      )
    }

    // Nombre de archivo limpio con extensión .user.js obligatoria
    const safeName = script.name.replace(/[^a-zA-Z0-9\-_]/g, '_')
    const fileName  = `${safeName}.user.js`

    return new NextResponse(script.obfuscatedScript, {
      status : 200,
      headers: {
        // text/javascript es lo que Tampermonkey detecta para instalar
        'Content-Type'       : 'text/javascript; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control'      : 'no-cache, no-store, must-revalidate',
        'X-Script-Version'   : String(script.version),
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('// Server error\n', {
      status : 500,
      headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
    })
  }
}
