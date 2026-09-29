import JavaScriptObfuscator from 'javascript-obfuscator'

export type ObfuscationLevel = 'low' | 'medium' | 'high' | 'maximum'

function getObfuscationConfig(level: ObfuscationLevel) {
  switch (level) {
    case 'low':
      return {
        compact: true,
        identifierNamesGenerator: 'hexadecimal' as const,
        rotateStringArray: true,
        shuffleStringArray: true,
        stringArray: true,
        stringArrayThreshold: 0.5,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
      }
    case 'medium':
      return {
        compact: true,
        identifierNamesGenerator: 'hexadecimal' as const,
        renameGlobals: true,
        rotateStringArray: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayEncoding: ['base64'] as const,
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        debugProtection: false,
        disableConsoleOutput: true,
      }
    case 'high':
      return {
        compact: true,
        identifierNamesGenerator: 'hexadecimal' as const,
        renameGlobals: true,
        rotateStringArray: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayEncoding: ['rc4'] as const,
        stringArrayThreshold: 0.85,
        unicodeEscapeSequence: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        numbersToExpressions: true,
        simplify: true,
        transformObjectKeys: true,
      }
    case 'maximum':
      return {
        compact: true,
        selfDefending: true,
        identifierNamesGenerator: 'mangled-shuffled' as const,
        renameGlobals: true,
        rotateStringArray: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 3,
        stringArray: true,
        stringArrayEncoding: ['rc4'] as const,
        stringArrayThreshold: 1,
        unicodeEscapeSequence: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.5,
        debugProtection: true,
        debugProtectionInterval: 1000,
        disableConsoleOutput: true,
        numbersToExpressions: true,
        simplify: true,
        transformObjectKeys: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 5,
        stringArrayWrappersType: 'function' as const,
      }
  }
}

export function obfuscateScript(code: string, options: { level: ObfuscationLevel }): string {
  try {
    const config = getObfuscationConfig(options.level)
    const result = JavaScriptObfuscator.obfuscate(code, config)
    return result.getObfuscatedCode()
  } catch (error) {
    throw new Error(`Obfuscation failed: ${error}`)
  }
}

export function parseMetadata(script: string): Record<string, string | string[]> {
  const metadataBlock = script.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/)?.[1] || ''
  const metadata: Record<string, string | string[]> = {}
  const lines = metadataBlock.split('\n')

  for (const line of lines) {
    const match = line.match(/\/\/ @(\S+)\s+(.+)/)
    if (match) {
      const [, key, value] = match
      if (metadata[key]) {
        if (Array.isArray(metadata[key])) {
          (metadata[key] as string[]).push(value.trim())
        } else {
          metadata[key] = [metadata[key] as string, value.trim()]
        }
      } else {
        metadata[key] = value.trim()
      }
    }
  }
  return metadata
}

export function extractScriptBody(script: string): string {
  return script.replace(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/, '').trim()
}