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

  var metadata = parseMetadata(rawScript)
  var scriptBody = extractScriptBody(rawScript)

  var codeToObfuscate = buildScriptBody(scriptBody, {
    scriptId,
    accessToken,
    version,
    appUrl,
  })

  var obfuscatedCode = obfuscateScript(codeToObfuscate, { level: obfuscationLevel })
  var metadataBlock = buildMetadataBlock(metadata, version, appUrl, scriptId)
  var finalScript = metadataBlock + '\n\n' + obfuscatedCode

  return {
    obfuscatedScript: obfuscatedCode,
    metadata: metadata,
    finalScript: finalScript,
  }
}

function buildScriptBody(
  originalBody: string,
  config: { scriptId: string; accessToken: string; version: number; appUrl: string }
): string {
  var accessToken = config.accessToken
  var version = config.version
  var appUrl = config.appUrl
  var scriptId = config.scriptId
  var checkUrl = appUrl + '/api/check-update/' + accessToken

  return '(function () {\n' +
    '  \'use strict\';\n' +
    '\n' +
    '  var SCRIPT_ID      = "' + scriptId + '";\n' +
    '  var ACCESS_TOKEN   = "' + accessToken + '";\n' +
    '  var CURRENT_VER    = ' + version + ';\n' +
    '  var CHECK_URL      = "' + checkUrl + '";\n' +
    '  var SERVE_URL      = "' + appUrl + '/api/scripts/' + scriptId + '/serve";\n' +
    '\n' +
    '  var _notifKey   = "_sa_update_" + SCRIPT_ID;\n' +
    '  var _notified  = false;\n' +
    '\n' +
    '  try {\n' +
    '    _notified = sessionStorage.getItem(_notifKey) === "yes";\n' +
    '  } catch (_e) {}\n' +
    '\n' +
    '  function reportAlive() {\n' +
    '    try {\n' +
    '      GM_xmlhttpRequest({\n' +
    '        method : "POST",\n' +
    '        url    : CHECK_URL + "/ping",\n' +
    '        headers: {\n' +
    '          "Content-Type"   : "application/json",\n' +
    '          "X-Script-Token" : ACCESS_TOKEN\n' +
    '        },\n' +
    '        data   : JSON.stringify({\n' +
    '          version   : CURRENT_VER,\n' +
    '          url       : window.location.hostname,\n' +
    '          timestamp : Date.now()\n' +
    '        }),\n' +
    '        onerror  : function () {},\n' +
    '        ontimeout: function () {},\n' +
    '      });\n' +
    '    } catch (_e) {}\n' +
    '  }\n' +
    '\n' +
    '  function checkVersion() {\n' +
    '    if (_notified) return;\n' +
    '\n' +
    '    try {\n' +
    '      GM_xmlhttpRequest({\n' +
    '        method : "GET",\n' +
    '        url    : CHECK_URL + "?v=" + CURRENT_VER + "&t=" + Date.now(),\n' +
    '        headers: { "X-Script-Token": ACCESS_TOKEN },\n' +
    '        timeout: 15000,\n' +
    '        onload: function (response) {\n' +
    '          try {\n' +
    '            var data = JSON.parse(response.responseText);\n' +
    '\n' +
    '            if (data && data.active === false) {\n' +
    '              console.warn("[Admin] Script disabled by administrator.");\n' +
    '              return;\n' +
    '            }\n' +
    '\n' +
    '            if (data && data.hasUpdate && !_notified) {\n' +
    '              _notified = true;\n' +
    '              try { sessionStorage.setItem(_notifKey, "yes"); } catch (_e2) {}\n' +
    '              showUpdateNotification(data.version);\n' +
    '            }\n' +
    '          } catch (_e3) {}\n' +
    '        },\n' +
    '        onerror  : function () {},\n' +
    '        ontimeout: function () {},\n' +
    '      });\n' +
    '    } catch (_e4) {}\n' +
    '  }\n' +
    '\n' +
    '  function showUpdateNotification(newVersion) {\n' +
    '    console.log(\n' +
    '      "%c[Admin] %cUpdate available! %cv" + CURRENT_VER + " -> v" + newVersion,\n' +
    '      "color:#7c3aed;font-weight:bold;",\n' +
    '      "color:#10b981;font-weight:bold;",\n' +
    '      "color:#f59e0b;font-weight:bold;"\n' +
    '    );\n' +
    '    console.log("Install: " + SERVE_URL);\n' +
    '\n' +
    '    if (typeof GM_notification === "function") {\n' +
    '      GM_notification({\n' +
    '        title  : "New Version Available",\n' +
    '        text   : "v" + newVersion + " ready. Click to install.",\n' +
    '        timeout: 0,\n' +
    '        onclick: openInstallPage\n' +
    '      });\n' +
    '    }\n' +
    '  }\n' +
    '\n' +
    '  function openInstallPage() {\n' +
    '    if (typeof GM_openInTab === "function") {\n' +
    '      GM_openInTab(SERVE_URL, { active: true });\n' +
    '    } else {\n' +
    '      window.open(SERVE_URL, "_blank");\n' +
    '    }\n' +
    '  }\n' +
    '\n' +
    '  function checkActive(callback) {\n' +
    '    try {\n' +
    '      GM_xmlhttpRequest({\n' +
    '        method : "GET",\n' +
    '        url    : CHECK_URL + "?v=" + CURRENT_VER,\n' +
    '        headers: { "X-Script-Token": ACCESS_TOKEN },\n' +
    '        timeout: 10000,\n' +
    '        onload: function (response) {\n' +
    '          try {\n' +
    '            var data = JSON.parse(response.responseText);\n' +
    '            if (data && data.active === false) {\n' +
    '              console.warn("[Admin] Script deactivated.");\n' +
    '              return;\n' +
    '            }\n' +
    '            callback();\n' +
    '          } catch (_e5) { callback(); }\n' +
    '        },\n' +
    '        onerror  : function () { callback(); },\n' +
    '        ontimeout: function () { callback(); },\n' +
    '      });\n' +
    '    } catch (_e6) { callback(); }\n' +
    '  }\n' +
    '\n' +
    '  checkActive(function () {\n' +
    '    reportAlive();\n' +
    '    checkVersion();\n' +
    '    setInterval(checkVersion, 600000);\n' +
    '    setInterval(reportAlive, 900000);\n' +
    originalBody +
    '\n' +
    '  });\n' +
    '\n' +
    '})();'
}

function buildMetadataBlock(
  metadata: Record<string, string | string[]>,
  version: number,
  appUrl: string,
  scriptId: string
): string {

  function add(key: string, value: string): string {
    return '// @' + key.padEnd(16) + value + '\n'
  }

  var block = '// ==UserScript==\n'

  var standardKeys = [
    'name', 'namespace', 'version', 'description', 'author',
    'match', 'include', 'exclude', 'matchAboutBlank',
    'run-at', 'grant', 'require', 'icon',
    'homepage', 'homepageURL', 'supportURL', 'website',
    'resource', 'connect', 'noframes'
  ]

  var i: number
  var key: string

  for (i = 0; i < standardKeys.length; i++) {
    key = standardKeys[i]
    var val = metadata[key]
    if (!val) continue
    
    if (Array.isArray(val)) {
      for (var j = 0; j < val.length; j++) {
        block += add(key, val[j])
      }
    } else {
      block += add(key, val as string)
    }
  }

  var metaKeys = Object.keys(metadata)
  for (i = 0; i < metaKeys.length; i++) {
    key = metaKeys[i]
    if (standardKeys.indexOf(key) !== -1) continue
    
    var val2 = metadata[key]
    
    if (Array.isArray(val2)) {
      for (var k = 0; k < val2.length; k++) {
        block += add(key, val2[k])
      }
    } else if (typeof val2 === 'string') {
      block += add(key, val2)
    }
  }

  // @noframes
  var hasNoframes = Array.isArray(metadata['noframes']) || typeof metadata['noframes'] === 'string'
  if (!hasNoframes) {
    block += add('noframes', '')
  }

  // version
  if (!metadata['version']) {
    block += add('version', String(version))
  }

  // update URLs - SIN .some(), usando loop normal para evitar error de tipo
  var rawUpdateUrl: any = metadata['updateurl'] || metadata['updateURL']
  var arrUpdateUrl: string[]
  
  if (Array.isArray(rawUpdateUrl)) {
    arrUpdateUrl = rawUpdateUrl
  } else if (typeof rawUpdateUrl === 'string' && rawUpdateUrl.length > 0) {
    arrUpdateUrl = [rawUpdateUrl]
  } else {
    arrUpdateUrl = ['']
  }
  
  var hasCustomUpdate = false
  for (var m = 0; m < arrUpdateUrl.length; m++) {
    if (arrUpdateUrl[m].indexOf(appUrl) !== -1) {
      hasCustomUpdate = true
      break
    }
  }

  if (!hasCustomUpdate) {
    block += add('updateURL', appUrl + '/api/scripts/' + scriptId + '/serve')
    block += add('downloadURL', appUrl + '/api/scripts/' + scriptId + '/serve')
  }

  // grants
  var existingGrants: string[] = []
  var rawGrants = metadata['grant']
  
  if (Array.isArray(rawGrants)) {
    existingGrants = rawGrants.slice()
  } else if (typeof rawGrants === 'string') {
    existingGrants = [rawGrants]
  }

  var requiredGrants = ['GM_xmlhttpRequest', 'GM_notification', 'GM_openInTab']
  var allGrants = existingGrants.concat(requiredGrants)
  
  // deduplicar sin usar Set ni filter (compatibilidad total)
  var uniqueGrants: string[] = []
  for (var n = 0; n < allGrants.length; n++) {
    if (uniqueGrants.indexOf(allGrants[n]) === -1) {
      uniqueGrants.push(allGrants[n])
    }
  }

  for (var p = 0; p < uniqueGrants.length; p++) {
    block += add('grant', uniqueGrants[p])
  }

  // connect
  try {
    var serverHost = new URL(appUrl).hostname
    var existingConnects: any = metadata['connect']
    var connectArr: string[] = []
    
    if (Array.isArray(existingConnects)) {
      connectArr = existingConnects
    } else if (typeof existingConnects === 'string') {
      connectArr = [existingConnects]
    }
    
    var hasServerConnect = false
    for (var c = 0; c < connectArr.length; c++) {
      if (connectArr[c].indexOf(serverHost) !== -1) {
        hasServerConnect = true
        break
      }
    }
    
    if (!hasServerConnect) {
      block += add('connect', serverHost)
    }
  } catch (_err) {}

  block += '// ==/UserScript=='
  
  return block
}
