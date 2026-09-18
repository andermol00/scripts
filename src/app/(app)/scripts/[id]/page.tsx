import { notFound } from "next/navigation";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq } from "drizzle-orm";
import ScriptEditor from "@/components/script-editor";
import GeneratePanel from "@/components/generate-panel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [row] = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Volver a mis scripts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">{row.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Edita los metadatos o el código y guarda los cambios cuando quieras.
        </p>
      </div>

      <GeneratePanel scriptId={row.id} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <ScriptEditor
          mode="edit"
          scriptId={row.id}
          initial={{
            name: row.name,
            description: row.description,
            code: row.code,
            namespace: row.namespace,
            version: row.version,
            author: row.author,
            matches: row.matches,
            grants: row.grants,
            runAt: row.runAt,
            updateUrl: row.updateUrl,
            downloadUrl: row.downloadUrl,
            obfuscateByDefault: row.obfuscateByDefault,
          }}
        />
      </div>
    </div>
  );
}
