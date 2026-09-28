import { NextResponse, type NextRequest } from "next/server";
import { listBundleFiles, readBundleFile } from "@/lib/bundle";

export const dynamic = "force-dynamic";

/** GET /api/download                -> manifiesto JSON */
/** GET /api/download?path=src/x.ts  -> archivo (attachment) */
/** GET /api/download?path=...&raw=1 -> archivo inline (text/plain) */
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("path");

  if (!requested) {
    const files = await listBundleFiles();
    return NextResponse.json({
      total: files.length,
      bytes: files.reduce((acc, file) => acc + file.size, 0),
      files,
    });
  }

  const file = await readBundleFile(requested);
  if (!file) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const raw = req.nextUrl.searchParams.get("raw") === "1";
  const filename = file.path.split("/").pop() ?? "archivo.txt";

  return new NextResponse(file.content, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": raw
        ? `inline; filename="${filename}"`
        : `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
