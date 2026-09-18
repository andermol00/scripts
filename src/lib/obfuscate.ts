import JavaScriptObfuscator from "javascript-obfuscator";

export type ObfuscationLevel = "none" | "basic" | "strong";

export function obfuscateCode(code: string, level: ObfuscationLevel): string {
  if (level === "none") return code;

  if (level === "basic") {
    const result = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      stringArray: true,
      stringArrayThreshold: 0.6,
      stringArrayEncoding: ["base64"],
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,
      selfDefending: false,
      disableConsoleOutput: false,
    });
    return result.getObfuscatedCode();
  }

  // "strong"
  const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    stringArray: true,
    stringArrayThreshold: 1,
    stringArrayEncoding: ["rc4"],
    stringArrayRotate: true,
    stringArrayShuffle: true,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    selfDefending: true,
    disableConsoleOutput: false,
    splitStrings: true,
    splitStringsChunkLength: 8,
    numbersToExpressions: true,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
  });
  return result.getObfuscatedCode();
}
