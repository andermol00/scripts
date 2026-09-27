import { NextResponse } from "next/server";
import JSZip from "jszip";
import { listBundleFiles, readBundleFile } from "@/lib/bundle";

export const dynamic = "force-dynamic";

/** GET /api/download/zip -> tampervault-repo.zip con todos los archivos. */
export async function GET() {
  try {
    const files = await listBundleFiles();
    const zip = new JSZip();

    for (const file of files) {
      const content = await readBundleFile(file.path);
      if (content) zip.file(file.path, content.content);
    }

    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": 'attachment; filename="tampervault-repo.zip"',
        "content-length": String(buffer.byteLength),
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[download/zip]", error);
    return NextResponse.json({ error: "No se pudo generar el ZIP" }, { status: 500 });
  }
}
