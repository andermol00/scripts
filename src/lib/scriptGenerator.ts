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

  // CAMBIO 4: Sistema de verificación instantánea SIN loop infinito
  const codeToObfuscate = buildScriptBody(scriptBody, {
    scriptId,
    accessToken,
    version,
    appUrl,
  })

  const obfuscatedCode = obfuscateScript(codeToObfuscate, { level: obfuscationLevel })
  
  // CAMBIO 1+2: Construir header respetando original + agregar @noframes si falta
  const metadataBlock = buildMetadataBlock(metadata, version, appUrl, scriptId)
  const finalScript = `${metadataBlock}\n\n${obfuscatedCode}`

  return {
    obfuscatedScript: obfuscatedCode,
    metadata,
    finalScript,
  }
}

// =============================================================================
// CONSTRUIR CUERPO DEL SCRIPT (con sistema de update arreglado)
// =============================================================================

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

  // Evitar spam: recordar si ya notificamos en esta sesión
  var _notifKey   = '_sa_update_' + SCRIPT_ID;
  var _notified  = false;

  try {
    _notified = sessionStorage.getItem(_notifKey) === 'yes';
  } catch (_e) {}

  // Enviar ping al servidor (estadísticas básicas)
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

  // Verificar versión SIN recargar página (evita loop infinito)
  function checkVersion() {
    // Si ya avisó hoy, no molestar más
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

            // KILL SWITCH: script desactivado remotamente
            if (data && data.active === false) {
              console.warn('[Admin] Script disabled by administrator.');
              return;
            }

            // Hay nueva versión → notificar UNA sola vez
            if (data && data.hasUpdate && !_notified) {
              _notified = true;
              
              // Marcar para no mostrar de nuevo esta sesión
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

  // Mostrar notificación elegante (una vez por sesión)
  function showUpdateNotification(newVersion) {
    console.log(
      '%c[Admin] %cUpdate available! %cv' + CURRENT_VER + ' → v' + newVersion,
      'color:#7c3aed;font-weight:bold;',
      'color:#10b981;font-weight:bold;',
      'color:#f59e0b;font-weight:bold;'
    );
    console.log('Install: ' + SERVE_URL);

    if (typeof GM_notification === 'function') {
      GM_notification({
        title  : '⬆️ New Version Available',
        text   : 'v' + newVersion + ' ready.\nClick to install.',
        timeout: 0,           // No desaparece sola
        onclick: openInstallPage
      });
    }
  }

  // Abrir página de instalación cuando usuario haga click
  function openInstallPage() {
    if (typeof GM_openInTab === 'function') {
      GM_openInTab(SERVE_URL, { active: true });
    } else {
      window.open(SERVE_URL, '_blank');
    }
  }

  // Verificar activación antes de ejecutar código
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
              return; // No ejecutar nada
            }
            callback();
          } catch (_e5) { callback(); }
        },

        onerror  : function () { callback(); },
        ontimeout: function () { callback(); },
      });
    } catch (_e6) { callback(); }
  }

  // ========================================
  // INICIO DEL SCRIPT
  // ========================================
  checkActive(function () {

    // Reportar que estamos vivos
    reportAlive();

    // Primera verificación INMEDIATA (sin esperar)
    checkVersion();

    // Luego verificar cada 10 minutos (no cada 30 ni cada 2)
    setInterval(checkVersion, 600000);     // 10 min

    // Ping al servidor cada 15 minutos
    setInterval(reportAlive, 900000);      // 15 min

    // ==========================================
    // CÓDIGO ORIGINAL DEL USUARIO AQUÍ
    // ==========================================
    ${originalBody}
    // ==========================================

  });

})();
`.trim()
}

// =============================================================================
// CONSTRUIR HEADER (preservar original + agregar campos necesarios)
// =============================================================================

function buildMetadataBlock(
  metadata: Record<string, string | string[]>,
  version: number,
  appUrl: string,
  scriptId: string
): string {

  // Función helper para añadir líneas formateadas
  const add = (key: string, value: string) =>
    `// @${key.padEnd(16)} ${value}\n`

  let block = '// ==UserScript==\n'

  // ==========================================================================
  // CAMBIO 1: PRESERVAR EXACTAMENTE LO QUE ESCRIBIÓ EL USUARIO
  // Mantenemos orden natural, solo agregamos lo indispensable al final
  // ==========================================================================

  // Campos comunes en el orden típico de UserScripts
  const standardKeys = [
    'name', 'namespace', 'version', 'description', 'author',
    'match', 'include', 'exclude', 'matchAboutBlank',
    'run-at', 'grant', 'require', 'icon',
    'homepage', 'homepageURL', 'supportURL', 'website',
    'resource', 'connect', 'noframes'
  ]

  // 1) Escribir primero todas las claves estándar que tenga el usuario
  for (const key of standardKeys) {
    const val = metadata[key]
    if (!val) continue
    
    if (Array.isArray(val)) {
      val.forEach(v => { block += add(key, v) })
    } else {
      block += add(key, val as string)
    }
  }

  // 2) Escribir cualquier OTRA clave extra que el usuario añadiera
  for (const [key, val] of Object.entries(metadata)) {
    if (standardKeys.includes(key)) continue  // Ya escrita arriba
    
    if (Array.isArray(val)) {
      val.forEach(v => { block += add(key, v) })
    } else {
      block += add(key, val as string)
    }
  }

  // ==========================================================================
  // CAMBIO 2: AGREGAR @noframes SI EL USUARIO NO LA PUSO
  // ==========================================================================
  const hasNoframes = Array.isArray(metadata['noframes'])
    ? true
    : typeof metadata['noframes'] === 'string'
    
  if (!hasNoframes) {
    block += add('noframes', '')
  }

  // ==========================================================================
  // SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA (solo si no tiene ya URLs custom)
  // ==========================================================================
  
  // Actualizar versión interna (sin sobrescribir la del usuario si existe)
  if (!metadata['version']) {
    block += add('version', String(version))
  }

  // Agregar URLs de update/download si no las puso manualmente
  const hasCustomUpdate = Array.isArray(metadata['updateurl'] || metadata['updateURL'])
    ? (metadata['updateurl'] || metadata['updateURL'] as string[]).some(u => u.includes(appUrl))
    : String(metadata['updateurl'] || metadata['updateURL'] || '').includes(appUrl)

  if (!hasCustomUpdate) {
    block += add('updateURL', `${appUrl}/api/scripts/${scriptId}/serve`)
    block += add('downloadURL', `${appUrl}/api/scripts/${scriptId}/serve`)
  }

  // ==========================================================================
  // GRANTS: combinar originales + los necesarios para el sistema
  // ==========================================================================
  const existingGrants = Array.isArray(metadata['grant'])
    ? [...metadata['grant']]
    : (metadata['grant'] ? [metadata['grant']] : [])

  const requiredGrants = ['GM_xmlhttpRequest', 'GM_notification', 'GM_openInTab']
  
  // Combinar sin duplicados (método compatible con target antiguo)
  const allGrants = existingGrants.concat(requiredGrants).filter(function(item, pos, self) {
    return self.indexOf(item) === pos;
  })

  allGrants.forEach(g => { block += add('grant', g) })

  // Conectar con servidor para GM_xmlhttpRequest
  try {
    var serverHost = new URL(appUrl).hostname
    var existingConnects = Array.isArray(metadata['connect'])
      ? metadata['connect']
      : (metadata['connect'] ? [metadata['connect']] : [])
      
    var hasServerConnect = existingConnects.some(c => c.includes(serverHost))
    
    if (!hasServerConnect) {
      block += add('connect', serverHost)
    }
  } catch (_err) {
    // Si falla URL, ignorar
  }

  // Cerrar bloque UserScript
  block += '// ==/UserScript=='
  
  return block
}
