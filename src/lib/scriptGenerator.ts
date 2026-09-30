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

  const metadata = parseMetadata(rawScript)
  const scriptBody = extractScriptBody(rawScript)

  const codeToObfuscate = buildScriptBody(scriptBody, {
    scriptId,
    accessToken,
    version,
    appUrl,
  })

  const obfuscatedCode = obfuscateScript(codeToObfuscate, { level: obfuscationLevel })
  const metadataBlock = buildMetadataBlock(metadata, version, appUrl, scriptId)
  const finalScript = `${metadataBlock}\n\n${obfuscatedCode}`

  return {
    obfuscatedScript: obfuscatedCode,
    metadata,
    finalScript,
  }
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

  var SCRIPT_ID      = "${scriptId}";
  var ACCESS_TOKEN   = "${accessToken}";
  var CURRENT_VER    = ${version};
  var CHECK_URL      = "${checkUrl}";
  var SERVE_URL      = "${appUrl}/api/scripts/${scriptId}/serve";

  var _notifKey   = '_sa_update_' + SCRIPT_ID;
  var _notified  = false;

  try {
    _notified = sessionStorage.getItem(_notifKey) === 'yes';
  } catch (_e) {}

  function reportAlive() {
    try {
      GM_xmlhttpRequest({
        method : 'POST',
        url    : CHECK_URL + '/ping',
        headers: { 
          'Content-Type'   : 'application/json', 
          'X-Script-Token' : ACCESS_TOKEN 
        },
        data   : JSON.stringify({
          version   : CURRENT_VER,
          url       : window.location.hostname,
          timestamp : Date.now()
        }),
        onerror  : function () {},
        ontimeout: function () {},
      });
    } catch (_e) {}
  }

  function checkVersion() {
    if (_notified) return;

    try {
      GM_xmlhttpRequest({
        method : 'GET',
        url    : CHECK_URL + '?v=' + CURRENT_VER + '&t=' + Date.now(),
        headers: { 'X-Script-Token': ACCESS_TOKEN },
        timeout: 15000,
        onload: function (response) {
          try {
            var data = JSON.parse(response.responseText);

            if (data && data.active === false) {
              console.warn('[Admin] Script disabled by administrator.');
              return;
            }

            if (data && data.hasUpdate && !_notified) {
              _notified = true;
              
              try { sessionStorage.setItem(_notifKey, 'yes'); } catch (_e2) {}

              showUpdateNotification(data.version);
            }
          } catch (_e3) {}
        },
        onerror  : function () {},
        ontimeout: function () {},
      });
    } catch (_e4) {}
  }

  function showUpdateNotification(newVersion) {
    console.log(
      '%c[Admin] %cUpdate available! %cv' + CURRENT_VER + ' -> v' + newVersion,
      'color:#7c3aed;font-weight:bold;',
      'color:#10b981;font-weight:bold;',
      'color:#f59e0b;font-weight:bold;'
    );
    console.log('Install: ' + SERVE_URL);

    if (typeof GM_notification === 'function') {
      GM_notification({
        title  : 'New Version Available',
        text   : 'v' + newVersion + ' ready. Click to install.',
        timeout: 0,
        onclick: openInstallPage
      });
    }
  }

  function openInstallPage() {
    if (typeof GM_openInTab === 'function') {
      GM_openInTab(SERVE_URL, { active: true });
    } else {
      window.open(SERVE_URL, '_blank');
    }
  }

  function checkActive(callback) {
    try {
      GM_xmlhttpRequest({
        method : 'GET',
        url    : CHECK_URL + '?v=' + CURRENT_VER,
        headers: { 'X-Script-Token': ACCESS_TOKEN },
        timeout: 10000,
        onload: function (response) {
          try {
            var data = JSON.parse(response.responseText);
            if (data && data.active === false) {
              console.warn('[Admin] Script deactivated.');
              return;
            }
            callback();
          } catch (_e5) { callback(); }
        },
        onerror  : function () { callback(); },
        ontimeout: function () { callback(); },
      });
    } catch (_e6) { callback(); }
  }

  checkActive(function () {
    reportAlive();
    checkVersion();
    setInterval(checkVersion, 600000);
    setInterval(reportAlive, 900000);
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

  const standardKeys = [
    'name', 'namespace', 'version', 'description', 'author',
    'match', 'include', 'exclude', 'matchAboutBlank',
    'run-at', 'grant', 'require', 'icon',
    'homepage', 'homepageURL', 'supportURL', 'website',
    'resource', 'connect', 'noframes'
  ]

  for (const key of standardKeys) {
    const val = metadata[key]
    if (!val) continue
    
    if (Array.isArray(val)) {
      val.forEach(v => { block += add(key, v) })
    } else {
      block += add(key, val as string)
    }
  }

  for (const [key, val] of Object.entries(metadata)) {
    if (standardKeys.includes(key)) continue
    
    if (Array.isArray(val)) {
      val.forEach(v => { block += add(key, v) })
    } else {
      block += add(key, val as string)
    }
  }

  const hasNoframes = Array.isArray(metadata['noframes'])
    ? true
    : typeof metadata['noframes'] === 'string'
    
  if (!hasNoframes) {
    block += add('noframes', '')
  }

  if (!metadata['version']) {
    block += add('version', String(version))
  }

  const hasCustomUpdate = Array.isArray(metadata['updateurl'] || metadata['updateURL'])
    ? (metadata['updateurl'] || metadata['updateURL'] as string[]).some(u => u.includes(appUrl))
    : String(metadata['updateurl'] || metadata['updateURL'] || '').includes(appUrl)

  if (!hasCustomUpdate) {
    block += add('updateURL', `${appUrl}/api/scripts/${scriptId}/serve`)
    block += add('downloadURL', `${appUrl}/api/scripts/${scriptId}/serve`)
  }

  const existingGrants = Array.isArray(metadata['grant'])
    ? [...metadata['grant']]
    : (metadata['grant'] ? [metadata['grant']] : [])

  const requiredGrants = ['GM_xmlhttpRequest', 'GM_notification', 'GM_openInTab']
  
  const allGrants = existingGrants.concat(requiredGrants).filter(function(item, pos, self) {
    return self.indexOf(item) === pos;
  })

  allGrants.forEach(g => { block += add('grant', g) })

  try {
    var serverHost = new URL(appUrl).hostname
    var existingConnects = Array.isArray(metadata['connect'])
      ? metadata['connect']
      : (metadata['connect'] ? [metadata['connect']] : [])
      
    var hasServerConnect = existingConnects.some(c => c.includes(serverHost))
    
    if (!hasServerConnect) {
      block += add('connect', serverHost)
    }
  } catch (_err) {}

  block += '// ==/UserScript=='
  
  return block
}
