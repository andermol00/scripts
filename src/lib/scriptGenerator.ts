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
