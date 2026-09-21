export type ScriptRecord = {
  id: number;
  userId: number;
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  matches: string; // JSON array
  grants: string; // JSON array
  runAt: string;
  code: string;
  obfuscate: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScriptForm = {
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  matches: string; // newline separated
  grants: string; // newline separated
  runAt: string;
  code: string;
  obfuscate: boolean;
};
