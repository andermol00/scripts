import { obfuscateScript, parseMetadata, extractScriptBody, ObfuscationLevel } from './obfuscator'

interface ScriptGeneratorOptions {
  scriptId: string
  accessToken: string
  version: number
  rawScript: string
  obfuscationLevel: ObfuscationLevel
  appUrl: string
}

export function generateTamperMonkeyScript(options: ScriptGeneratorOptions): {
  obfuscatedScript: string
  metadata: Record<string, string | string[]>
  finalScript: string
} {
  const { scriptId, accessToken, version, rawScript, obfuscationLevel, appUrl } = options

  // CAMBIO 1: Extraer metadata ORIGINAL tal cual viene
  const metadata = parseMetadata(rawScript)
  const scriptBody = extractScriptBody(rawScript)

  // CAMBIO 4: Sistema de verificación INSTANTÁNEA
  const codeToObfuscate = buildScriptBody(scriptBody, {
    scriptId,
    accessToken,
    version,
    appUrl,
  })

  const obfuscatedCode = obfuscateScript(codeToObfuscate, { level: obfuscationLevel })
  
  // CAMBIO 1+2: Construir header respetando original + agregar @noframes solo si no existe
  const metadataBlock = buildMetadataBlock(metadata, version, appUrl, scriptId)
  const finalScript = `${metadataBlock}\n\n${obfuscatedCode}`

  return {
    obfuscatedScript: obfuscatedCode,
    metadata,
    finalScript,
  }
}

// CAMBIO 4: Verificación inmediata al cargar + cada 2 minutos (no 30)
function buildScriptBody(
  originalBody: string,
  config: { scriptId: string; accessToken: string; version: number; appUrl: string }
): string {
  const { accessToken, version, appUrl, scriptId } = config
  const checkUrl = `${appUrl}/api/check-update/${accessToken}`

  return `
(function () {
  'use strict';

  var SCRIPT_ID    = "${scriptId}";
  var ACCESS_TOKEN = "${accessToken}";
  var CURRENT_VER  = ${version};
  var CHECK_URL    = "${checkUrl}";
  var SERVE_URL    = "${appUrl}/api/scripts/${scriptId}/serve";

  function reportAlive() {
    try {
      GM_xmlhttpRequest({
        method : 'POST',
        url    : CHECK_URL + '/ping',
        headers: { 'Content-Type': 'application/json', 'X-Script-Token': ACCESS_TOKEN },
        data   : JSON.stringify({ version: CURRENT_VER, url: window.location.hostname, timestamp: Date.now() }),
        onerror  : function () {},
        ontimeout: function () {},
      });
    } catch (e) {}
  }

  // CAMBIO 4: Verificación INMEDIATA al cargar
  function checkVersion() {
    try {
      GM_xmlhttpRequest({
        method : 'GET',
        url    : CHECK_URL + '?v=' + CURRENT_VER + '&t=' + Date.now(),
        headers: { 'X-Script-Token': ACCESS_TOKEN },
        timeout: 10000,
        onload: function (response) {
          try {
            var data = JSON.parse(response.responseText);
            if (data && data.active === false) {
              console.warn('[ScriptAdmin] Script disabled remotely.');
              return;
            }
            if (data && data.hasUpdate) {
              notifyUpdate(data.version);
              forceUpdate(data.version);
            }
          } catch (e) {}
        },
        onerror  : function () {},
        ontimeout: function () {},
      });
    } catch (e) {}
  }

  // CAMBIO 4: Forzar actualización inmediata si hay nueva versión
  function forceUpdate(newVersion) {
    try {
      GM_xmlhttpRequest({
        method : 'GET',
        url    : SERVE_URL + '?force=1',
        headers: { 'X-Script-Token': ACCESS_TOKEN },
        onload: function () {
          if (typeof GM_notification === 'function') {
            GM_notification({
              title  : 'Updating...',
              text   : 'Downloading version ' + newVersion,
              timeout: 5000,
            });
          }
          location.reload();
        },
        onerror: function () {}
      });
    } catch (e) {}
  }

  function notifyUpdate(newVersion) {
    try {
      if (typeof GM_notification === 'function') {
        GM_notification({
          title  : 'Update Available!',
          text   : 'Version ' + newVersion + ' ready. Reloading...',
          timeout: 5000,
          onclick: function () { forceUpdate(newVersion); },
        });
      }
    } catch (e) {}
  }

  function checkActive(callback) {
    try {
      GM_xmlhttpRequest({
        method : 'GET',
        url    : CHECK_URL + '?v=' + CURRENT_VER,
        headers: { 'X-Script-Token': ACCESS_TOKEN },
        timeout: 8000,
        onload: function (response) {
          try {
            var data = JSON.parse(response.responseText);
            if (data && data.active === false) {
              console.warn('[ScriptAdmin] Script disabled remotely.');
              return;
            }
            callback();
          } catch (e) { callback(); }
        },
        onerror  : function () { callback(); },
        ontimeout: function () { callback(); },
      });
    } catch (e) { callback(); }
  }

  checkActive(function () {
    reportAlive();

    // CAMBIO 4: Inmediato al cargar (0 segundos), luego cada 2 minutos (120000ms)
    checkVersion();
    
    setInterval(checkVersion, 120000);  // Cada 2 min, no 30 min
    setInterval(reportAlive, 300000);  // Ping cada 5 min

    ${originalBody}
  });

})();
`.trim()
}

// CAMBIO 1: Header respeta TODO lo que el usuario puso originalmente
// CAMBIO 2: Solo agrega @noframes si no existe, y agrega @updateURL/@downloadURL para sistema de updates
function buildMetadataBlock(
  metadata: Record<string, string | string[]>,
  version: number,
  appUrl: string,
  scriptId: string
): string {
  const add = (key: string, value: string) =>
    `// @${key.padEnd(16)} ${value}\n`

  let block = '// ==UserScript==\n'

  // CAMBIO 1: Preservar EXACTAMENTE todo lo que el usuario escribió en orden original
  const keysInOrder = [
    'name', 'namespace', 'version', 'description', 'author',
    'match', 'include', 'exclude', 'matchAboutBlank',
    'run-at', 'grant', 'require', 'icon', 'homepage',
    'homepageURL', 'supportURL', 'website', 'resource',
    'connect', 'noframes'  // Mantener noframes si usuario lo puso
  ]

  // Primero escribir las claves conocidas en orden
  for (const key of keysInOrder) {
    const val = metadata[key]
    if (!val) continue
    if (Array.isArray(val)) val.forEach(v => { block += add(key, v) })
    else block += add(key, val)
  }

  // Luego escribir cualquier otra clave extra que tenga el usuario
  for (const [key, val] of Object.entries(metadata)) {
    if (keysInOrder.includes(key)) continue
    if (Array.isArray(val)) val.forEach(v => { block += add(key, v) })
    else block += add(key, val)
  }

  // CAMBIO 1: NO sobrescribir la versión del usuario con la nuestra, solo usarla interna
  // Si el usuario no puso version, agregamos una
  if (!metadata['version']) {
    block += add('version', String(version))
  }

  // CAMBIO 2: Agregar @noframes si el usuario no la puso
  const hasNoframes = Array.isArray(metadata['noframes']) 
    ? true 
    : !!metadata['noframes']
  
  if (!hasNoframes) {
    block += add('noframes', '')
  }

  // Sistema de actualización - solo si no existen ya
  const hasUpdateUrl = Array.isArray(metadata['updateurl']) 
    ? metadata['updateurl'].some(u => u.includes(appUrl))
    : metadata['updateurl']?.includes(appUrl)

  if (!hasUpdateUrl) {
    block += add('updateURL', `${appUrl}/api/scripts/${scriptId}/serve`)
    block += add('downloadURL', `${appUrl}/api/scripts/${scriptId}/serve`)
  }

  // Grants necesarios para el sistema
  const existingGrants = Array.isArray(metadata['grant'])
    ? metadata['grant']
    : metadata['grant'] ? [metadata['grant']] : []

  const requiredGrants = ['GM_xmlhttpRequest','GM_notification','GM_openInTab']
  const allGrants = [...new Set([...existingGrants, ...requiredGrants])]
  
  // Escribir grants combinados (sin duplicados)
  allGrants.forEach(g => { block += add('grant', g) })

  // Connect al dominio del servidor
  try {
    const hostname = new URL(appUrl).hostname
    const hasConnect = Array.isArray(metadata['connect'])
      ? metadata['connect'].includes(hostname)
      : metadata['connect']?.includes(hostname)
    
    if (!hasConnect) {
      block += add('connect', hostname)
    }
  } catch {}

  block += '// ==/UserScript=='
  return block
}
