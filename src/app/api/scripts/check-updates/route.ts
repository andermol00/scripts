import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const { scriptIds } = await req.json();

    let scriptsToCheck;
    if (scriptIds && scriptIds.length > 0) {
      scriptsToCheck = await db.query.scripts.findMany({
        where: (sc, { inArray }) => inArray(sc.id, scriptIds),
      });
    } else {
      scriptsToCheck = await db.query.scripts.findMany();
      scriptsToCheck = scriptsToCheck.filter((s) => s.sourceUrl);
    }

    const updates = [];

    for (const script of scriptsToCheck) {
      if (!script.sourceUrl) continue;

      try {
        const response = await fetch(script.sourceUrl, {
          timeout: 10000,
        });

        if (!response.ok) {
          console.error(
            `Error fetching ${script.sourceUrl}: ${response.statusText}`
          );
          continue;
        }

        const newCode = await response.text();
        const newHash = hashCode(newCode);

        if (newHash !== script.codeHash) {
          await db
            .update(scripts)
            .set({
              code: newCode,
              codeHash: newHash,
              lastCheckAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(scripts.id, script.id));

          updates.push({
            id: script.id,
            name: script.name,
            status: "updated",
            newSize: newCode.length,
          });
        } else {
          updates.push({
            id: script.id,
            name: script.name,
            status: "unchanged",
          });
        }
      } catch (error) {
        console.error(`Error checking ${script.name}:`, error);
        updates.push({
          id: script.id,
          name: script.name,
          status: "error",
          error: (error as Error).message,
        });
      }
    }

    return NextResponse.json({
      checked: scriptsToCheck.length,
      updates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check updates error:", error);
    return NextResponse.json(
      { error: "Error verificando actualizaciones" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de script requerido" },
        { status: 400 }
      );
    }

    const script = await db.query.scripts.findFirst({
      where: eq(scripts.id, parseInt(id)),
    });

    if (!script || !script.sourceUrl) {
      return NextResponse.json(
        { error: "Script no encontrado o sin URL de origen" },
        { status: 404 }
      );
    }

    try {
      const response = await fetch(script.sourceUrl, { timeout: 10000 });
      if (!response.ok) {
        return NextResponse.json(
          { error: `No se pudo descargar: ${response.statusText}` },
          { status: 500 }
        );
      }

      const newCode = await response.text();
      const newHash = hashCode(newCode);
      const hasUpdate = newHash !== script.codeHash;

      if (hasUpdate) {
        await db
          .update(scripts)
          .set({
            code: newCode,
            codeHash: newHash,
            lastCheckAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(scripts.id, script.id));
      }

      return NextResponse.json({
        id: script.id,
        name: script.name,
        hasUpdate,
        oldHash: script.codeHash,
        newHash,
        newCodeSize: newCode.length,
        lastCheck: new Date().toISOString(),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: `Error descargando: ${(error as Error).message}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("GET check updates error:", error);
    return NextResponse.json(
      { error: "Error en la solicitud" },
      { status: 500 }
    );
  }
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
