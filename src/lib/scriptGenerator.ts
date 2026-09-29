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

  const metadata   = parseMetadata(rawScript)
  const scriptBody = extractScriptBody(rawScript)

  const codeToObfuscate = buildScriptBody(scriptBody, {
    scriptId,
    accessToken,
    version,
    appUrl,
  })

  const obfuscatedCode = obfuscateScript(codeToObfuscate, { level: obfuscationLevel })
  const metadataBlock  = buildMetadataBlock(metadata, version, appUrl, scriptId)
  const finalScript    = `${metadataBlock}\n\n${obfuscatedCode}`

  return { obfuscatedScript: obfuscatedCode, metadata, finalScript }
}

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
            }
          } catch (e) {}
        },
        onerror  : function () {},
        ontimeout: function () {},
      });
    } catch (e) {}
  }

  function notifyUpdate(newVersion) {
    try {
      if (typeof GM_notification === 'function') {
        GM_notification({
          title  : 'Script Update Available',
          text   : 'Version ' + newVersion + ' is ready. TamperMonkey will update automatically.',
          timeout: 8000,
          onclick: function () {
            if (typeof GM_openInTab === 'function') GM_openInTab(SERVE_URL, false);
          },
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
    setTimeout(checkVersion, 5000);
    setInterval(checkVersion, 30 * 60 * 1000);
    setInterval(reportAlive, 15 * 60 * 1000);

    ${originalBody}
  });

})();
`.trim()
}

function buildMetadataBlock(
  metadata: Record<string, string | string[]>,
  version: number,
  appUrl: string,
  scriptId: string
): string {
  const add = (key: string, value: string) =>
    `// @${key.padEnd(16)} ${value}\n`

  let block = '// ==UserScript==\n'

  const originalKeys = [
    'name','namespace','description','author',
    'match','include','exclude','run-at','icon',
    'homepage','homepageURL',
  ]

  for (const key of originalKeys) {
    const val = metadata[key]
    if (!val) continue
    if (Array.isArray(val)) val.forEach(v => { block += add(key, v) })
    else block += add(key, val)
  }

  block += add('version',     String(version))
  block += add('updateURL',   `${appUrl}/api/scripts/${scriptId}/serve`)
  block += add('downloadURL', `${appUrl}/api/scripts/${scriptId}/serve`)

  const originalGrants = Array.isArray(metadata.grant)
    ? metadata.grant
    : metadata.grant ? [metadata.grant] : []

  const requiredGrants = ['GM_xmlhttpRequest','GM_notification','GM_openInTab']
  const allGrants = Array.from(new Set([...originalGrants, ...requiredGrants]))
  allGrants.forEach(g => { block += add('grant', g) })

  try {
    const hostname = new URL(appUrl).hostname
    block += add('connect', hostname)
    block += add('connect', 'localhost')
  } catch {}

  const processed = new Set([...originalKeys,'version','grant','connect'])
  for (const [key, val] of Object.entries(metadata)) {
    if (processed.has(key)) continue
    if (Array.isArray(val)) val.forEach(v => { block += add(key, v) })
    else block += add(key, val)
  }

  block += '// ==/UserScript=='
  return block
}