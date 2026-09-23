export type ScriptRecord = {
  id: number;
  userId: number;
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  matches: string[];
  grants: string[];
  runAt: string;
  updateUrl: string;
  downloadUrl: string;
  code: string;
  obfuscateByDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Shape used by the editor form and by the POST/PUT API payloads. */
export type ScriptForm = {
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  matches: string[];
  grants: string[];
  runAt: string;
  updateUrl: string;
  downloadUrl: string;
  code: string;
  obfuscateByDefault: boolean;
};

/** Normalizes anything coming from the network into a clean string[]. */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return toStringArray(parsed);
      } catch {
        /* falls through to line splitting */
      }
    }
    return trimmed
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
