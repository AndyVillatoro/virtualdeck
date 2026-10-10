/**
 * VirtualDeck Companion - Service Worker (Background)
 * Coordina la conexión WebSocket de control, el ciclo de vida del documento Offscreen
 * y el enrutamiento de comandos y metadatos entre pestañas y VirtualDeck.
 */

const PUERTO_POR_DEFECTO = 48201;
const REINTENTO_MS = 2500;

/**
 * El service worker de MV3 se apaga solo y al volver pierde las variables de
 * módulo. Si la pestaña capturada solo viviera en memoria, un reinicio dejaba la
 * captura Zombie: el offscreen seguía emitiendo (pantalla completa) pero nadie
 * reenviaba el rectángulo del vídeo, y eso es justo lo que se veía.
 */
const CLAVE_TAB_CAPTURADA = 'tabCapturada';

let wsControl = null;
let conectado = false;
let tabCapturada = null;
let reintentoTimer = null;
let pingTimer = null;

/** Último rectángulo de vídeo recibido por pestaña (`tabId` → rect en fracciones). */
const rectsPorTab = new Map();

let ajustes = {
  puerto: PUERTO_POR_DEFECTO,
  token: '',
  autoStreaming: true,
};

// Cargar ajustes guardados al arrancar
chrome.storage.local.get(['puerto', 'token', 'autoStreaming'], (res) => {
  if (res.puerto) ajustes.puerto = Number(res.puerto);
  if (res.token) ajustes.token = String(res.token);
  if (typeof res.autoStreaming === 'boolean') ajustes.autoStreaming = res.autoStreaming;
  restaurarTabCapturada();
  conectarVirtualDeck();
});

/** Recupera la pestaña capturada tras un reinicio del service worker. */
function restaurarTabCapturada() {
  if (tabCapturada) return;
  chrome.storage.local.get([CLAVE_TAB_CAPTURADA], (res) => {
    const id = res && res[CLAVE_TAB_CAPTURADA];
    if (typeof id !== 'number') return;
    chrome.tabs.get(id, (tab) => {
      // Si la pestaña ya no existe, `lastError` viene puesto: se limpia sola.
      if (chrome.runtime.lastError || !tab) {
        olvidarTabCapturada();
        return;
      }
      tabCapturada = id;
      actualizarBadge();
      sincronizarRect(id);
    });
  });
}

function guardarTabCapturada(id) {
  tabCapturada = id;
  chrome.storage.local.set({ [CLAVE_TAB_CAPTURADA]: id });
}

function olvidarTabCapturada() {
  tabCapturada = null;
  chrome.storage.local.remove(CLAVE_TAB_CAPTURADA);
}

/** Manda al offscreen lo que ya se sabe de esa pestaña y le pide que se lo reenvíe. */
function sincronizarRect(tabId) {
  const rect = rectsPorTab.get(tabId);
  if (rect) {
    chrome.runtime.sendMessage({ tipo: 'video_rect_offscreen', tabId, rect }).catch(() => {});
  }
  try {
    chrome.tabs.sendMessage(tabId, { tipo: 'pedir_rect' }, () => {
      // Sin respuesta solo significa que esa pestaña no tiene el content script.
    });
  } catch {
    // Pestaña no capturable
  }
}

function reenviarRectAOffscreen(tabId, rect) {
  chrome.runtime.sendMessage({ tipo: 'video_rect_offscreen', tabId, rect }).catch(() => {});
}

function conectarVirtualDeck() {
  if (wsControl && (wsControl.readyState === WebSocket.OPEN || wsControl.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = `ws://127.0.0.1:${ajustes.puerto}/companion?token=${encodeURIComponent(ajustes.token || '')}`;

  try {
    wsControl = new WebSocket(url);

    wsControl.onopen = () => {
      conectado = true;
      if (reintentoTimer) clearTimeout(reintentoTimer);

      // Si no tenemos token pero conectamos, enviar solicitud de autenticación
      if (ajustes.token) {
        wsControl.send(JSON.stringify({ tipo: 'auth', token: ajustes.token }));
      }

      iniciarHeartbeat();
      actualizarBadge();
    };

    wsControl.onmessage = (event) => {
      try {
        const datos = JSON.parse(event.data);
        manejarMensajeServidor(datos);
      } catch {}
    };

    wsControl.onclose = () => {
      desconectarVirtualDeck();
    };

    wsControl.onerror = () => {
      desconectarVirtualDeck();
    };
  } catch {
    desconectarVirtualDeck();
  }
}

function desconectarVirtualDeck() {
  conectado = false;
  if (wsControl) {
    try { wsControl.close(); } catch {}
    wsControl = null;
  }
  detenerHeartbeat();
  actualizarBadge();

  // Reintento continuo en bucle local
  if (!reintentoTimer) {
    reintentoTimer = setTimeout(() => {
      reintentoTimer = null;
      conectarVirtualDeck();
    }, REINTENTO_MS);
  }
}

function iniciarHeartbeat() {
  detenerHeartbeat();
  pingTimer = setInterval(() => {
    if (wsControl && wsControl.readyState === WebSocket.OPEN) {
      wsControl.send(JSON.stringify({ tipo: 'ping' }));
    }
  }, 15000);
}

function detenerHeartbeat() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function manejarMensajeServidor(mensaje) {
  if (!mensaje || typeof mensaje !== 'object') return;

  if (mensaje.tipo === 'pair' && mensaje.ok && mensaje.token) {
    ajustes.token = mensaje.token;
    chrome.storage.local.set({ token: mensaje.token });
    actualizarBadge();
    return;
  }

  if (mensaje.tipo === 'auth' && mensaje.ok) {
    actualizarBadge();
    return;
  }

  if (mensaje.comando === 'start_capture' || mensaje.comando === 'iniciar_captura') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = mensaje.tabId || (tabs[0] && tabs[0].id);
      if (tabId) iniciarCapturaTab(tabId);
    });
    return;
  }
  if (mensaje.comando === 'stop_capture' || mensaje.comando === 'detener_captura') {
    detenerCapturaTab();
    return;
  }

  // Comandos de transporte multimedia enviados desde VirtualDeck
  if (mensaje.comando) {
    enviarComandoATab(mensaje);
  }
}

async function enviarComandoATab(cmd) {
  const tabs = await chrome.tabs.query({});
  // Priorizar pestaña en captura o pestañas de YouTube/Spotify/Twitch
  let tabDestino = null;

  if (tabCapturada) {
    tabDestino = tabs.find((t) => t.id === tabCapturada);
  }

  if (!tabDestino) {
    tabDestino = tabs.find((t) =>
      t.url && (t.url.includes('youtube.com/watch') || t.url.includes('spotify.com') || t.url.includes('twitch.tv'))
    );
  }

  if (!tabDestino && tabs.length > 0) {
    tabDestino = tabs.find((t) => t.active) || tabs[0];
  }

  if (tabDestino && tabDestino.id) {
    try {
      chrome.tabs.sendMessage(tabDestino.id, {
        tipo: 'ejecutar_comando',
        comando: cmd,
      });
    } catch {}
  }
}

async function asegurarOffscreen() {
  const tieneDocumento = await chrome.offscreen.hasDocument();
  if (tieneDocumento) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Captura de fotogramas de pestañas para VirtualDeck',
  });
}

async function enviarMensajeOffscreen(mensaje, maxIntentos = 10, intervaloMs = 100) {
  for (let i = 0; i < maxIntentos; i++) {
    try {
      const resp = await chrome.runtime.sendMessage(mensaje);
      if (resp && resp.ok) return true;
    } catch {
      // Offscreen listener aún no registrado o receptor ocupado
    }
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  return false;
}

/** Evita arrancar dos veces la misma captura: cada metadato nuevo la volvía a pedir mientras la anterior seguía en marcha. */
let capturaEnCurso = false;
/** Marca de la última parada: la captura automática espera un poco antes de reintentar. */
let ultimaParadaEn = 0;
const ESPERA_AUTOCAPTURA_MS = 5000;

async function iniciarCapturaTab(tabId) {
  if (capturaEnCurso) return { ok: true };
  if (tabCapturada === tabId) return { ok: true };
  capturaEnCurso = true;
  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    await asegurarOffscreen();

    const enviado = await enviarMensajeOffscreen({
      tipo: 'start_capture',
      streamId,
      tabId,
      port: ajustes.puerto,
      token: ajustes.token,
    });

    if (!enviado) {
      console.warn('[companion-background] No se pudo confirmar start_capture en offscreen tras reintentos');
    }

    guardarTabCapturada(tabId);
    // El offscreen arranca sin saber dónde está el vídeo. Se le pasa lo último
    // conocido y se le pide a la pestaña que lo vuelva a mandar ahora.
    sincronizarRect(tabId);
    actualizarBadge();
    return { ok: true };
  } catch (err) {
    console.error('[companion-background] Error al capturar pestaña:', err);
    return { ok: false, error: err.message };
  } finally {
    capturaEnCurso = false;
  }
}

async function detenerCapturaTab() {
  ultimaParadaEn = Date.now();
  olvidarTabCapturada();
  rectsPorTab.clear();
  const tieneDocumento = await chrome.offscreen.hasDocument();
  if (tieneDocumento) {
    try {
      chrome.runtime.sendMessage({ tipo: 'stop_capture' });
      await chrome.offscreen.closeDocument();
    } catch {}
  }
  actualizarBadge();
  return { ok: true };
}

function actualizarBadge() {
  if (tabCapturada) {
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#38bdf8' }); // OLED Cyan
  } else if (conectado) {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' }); // Green
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function manejarMensajePopup(mensaje, responder) {
  if (mensaje.tipo === 'obtener_estado') {
    responder({
      conectado,
      tabCapturada,
      puerto: ajustes.puerto,
      token: ajustes.token,
      autoStreaming: ajustes.autoStreaming,
    });
    return true;
  }
  if (mensaje.tipo === 'iniciar_captura') {
    iniciarCapturaTab(mensaje.tabId).then(responder);
    return true;
  }
  if (mensaje.tipo === 'detener_captura') {
    detenerCapturaTab().then(responder);
    return true;
  }
  if (mensaje.tipo === 'emparejar') {
    if (wsControl && wsControl.readyState === WebSocket.OPEN) {
      wsControl.send(JSON.stringify({ tipo: 'pair', code: mensaje.code }));
      responder({ ok: true });
    } else {
      responder({ ok: false, error: 'VirtualDeck no está conectado en el puerto especificado.' });
    }
    return true;
  }
  if (mensaje.tipo === 'guardar_ajustes') {
    if (mensaje.puerto) ajustes.puerto = Number(mensaje.puerto);
    if (typeof mensaje.token === 'string') ajustes.token = mensaje.token;
    if (typeof mensaje.autoStreaming === 'boolean') ajustes.autoStreaming = mensaje.autoStreaming;

    chrome.storage.local.set(ajustes, () => {
      desconectarVirtualDeck();
      conectarVirtualDeck();
      responder({ ok: true });
    });
    return true;
  }
  return false;
}

function manejarMensajeMedia(mensaje, sender) {
  if (mensaje.tipo !== 'media_update' || !mensaje.metadata) return false;
  if (wsControl && wsControl.readyState === WebSocket.OPEN) {
    const meta = { ...mensaje.metadata };
    if (sender.tab && sender.tab.id) meta.tabId = sender.tab.id;
    wsControl.send(JSON.stringify(meta));
  }

  if (
    ajustes.autoStreaming &&
    sender.tab?.id &&
    !tabCapturada &&
    !capturaEnCurso &&
    Date.now() - ultimaParadaEn > ESPERA_AUTOCAPTURA_MS &&
    mensaje.metadata.tieneVideo &&
    mensaje.metadata.reproduciendo
  ) {
    iniciarCapturaTab(sender.tab.id);
  }
  return true;
}

/**
 * El rectángulo viaja siempre, de cualquier pestaña y con su `tabId`: el offscreen
 * elige el de la que está capturando. Antes solo se reenviaba el de `tabCapturada`,
 * que durante el arranque de la captura todavía era `null` y tras un reinicio del
 * service worker se quedaba en `null` para siempre; en los dos casos el recorte se
 * perdía y salía la pantalla completa.
 */
function manejarMensajeRect(mensaje, sender) {
  if (mensaje.tipo === 'video_rect_pedido') {
    const tabId = tabCapturada || mensaje.tabId;
    if (tabId) sincronizarRect(tabId);
    return true;
  }
  if (mensaje.tipo !== 'video_rect' || !mensaje.rect) return false;
  const tabId = sender.tab?.id;
  if (typeof tabId !== 'number') return true;
  rectsPorTab.set(tabId, mensaje.rect);
  reenviarRectAOffscreen(tabId, mensaje.rect);
  return true;
}

// Escuchar mensajes internos desde content.js y popup.js
chrome.runtime.onMessage.addListener((mensaje, sender, responder) => {
  if (manejarMensajeMedia(mensaje, sender)) {
    responder({ ok: true });
    return true;
  }

  if (manejarMensajeRect(mensaje, sender)) {
    responder({ ok: true });
    return true;
  }

  if (manejarMensajePopup(mensaje, responder)) {
    return true;
  }

  if (mensaje.tipo === 'captura_finalizada' || mensaje.tipo === 'captura_cerrada') {
    ultimaParadaEn = Date.now();
    olvidarTabCapturada();
    actualizarBadge();
    responder({ ok: true });
    return true;
  }
  return false;
});

// Limpieza si la pestaña capturada se cierra
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabCapturada === tabId) {
    detenerCapturaTab();
  }
});
