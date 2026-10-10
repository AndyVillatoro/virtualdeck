/**
 * VirtualDeck Companion - Offscreen Frame Processor
 * Consume el MediaStream de la pestaña, extrae fotogramas en canvas y los transmite
 * empaquetados en binario (protocolo VDCM) directamente por WebSocket a VirtualDeck.
 */

(() => {
  const video = document.getElementById('video-captura');
  const canvas = document.getElementById('canvas-captura');
  const ctx = canvas.getContext('2d', { alpha: false });

  const MAGIC_VDCM = 0x5644434d; // 'VDCM'
  const ANCHO_MAX = 1280; // resolución HD nativa para máxima nitidez (escalado automático en panel)
  const INTERVALO_MS = 50; // ~20 FPS: óptimo para preview fluido con carga mínima

  // Rectángulo del vídeo en la pestaña capturada, reportado por content.js como
  // fracción del viewport (0..1). Uno por pestaña (`tabId` → rect): si no llega el
  // de la que se está capturando, se pide en vez de rendirse y mandar la pestaña
  // entera, que es lo que se veía cuando la sincronización se perdía.
  const rectsPorTab = new Map();
  let tabCapturada = null;
  let ultimoRectUsado = null;
  let pedidoEn = 0;

  const REPETICION_PEDIDO_MS = 3000;

  function rectDeLaTab(tabId) {
    if (typeof tabId === 'number') return rectsPorTab.get(tabId) || null;
    // Sin `tabId` conocido: si solo hay un rect en juego, ese es el bueno.
    return rectsPorTab.size === 1 ? rectsPorTab.values().next().value : null;
  }

  function pedirRect() {
    const ahora = Date.now();
    if (ahora - pedidoEn < REPETICION_PEDIDO_MS) return;
    pedidoEn = ahora;
    chrome.runtime.sendMessage({ tipo: 'video_rect_pedido', tabId: tabCapturada }).catch(() => {});
  }

  /**
   * Rectángulo a recortar ahora mismo. Si falta el de la pestaña capturada se pide
   * (sin rendirse a la pestaña entera) y se reutiliza el último bueno mientras
   * llega: sale la imagen anterior un momento mejor que dar un salto al cuadro entero.
   */
  function rectParaDibujar() {
    const guardado = rectDeLaTab(tabCapturada);
    if (guardado) {
      ultimoRectUsado = guardado;
      return guardado;
    }
    pedirRect();
    return ultimoRectUsado;
  }

  /**
   * Dibuja en el canvas solo la zona del vídeo (o la pestaña entera si aún no ha
   * llegado su rectángulo). Conserva la relación de aspecto y devuelve las
   * dimensiones finales del fotograma.
   */
  function dibujarRecorte() {
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    let sx = 0;
    let sy = 0;
    let cw = sw;
    let ch = sh;

    const rect = rectParaDibujar();
    if (rect) {
      // El rect viene en fracciones del viewport, así que se aplica tal cual al
      // cuadro capturado: da igual el devicePixelRatio, el zoom o la escala de la
      // ventana. `x + w` se acota para no salirse si el vídeo toca el borde.
      const fx = Math.max(0, Math.min(0.999, Number(rect.x) || 0));
      const fy = Math.max(0, Math.min(0.999, Number(rect.y) || 0));
      const fw = Math.max(0.001, Math.min(1 - fx, Number(rect.w) || 0));
      const fh = Math.max(0.001, Math.min(1 - fy, Number(rect.h) || 0));
      sx = Math.round(fx * sw);
      sy = Math.round(fy * sh);
      cw = Math.max(1, Math.min(sw - sx, Math.round(fw * sw)));
      ch = Math.max(1, Math.min(sh - sy, Math.round(fh * sh)));
    }

    const ancho = Math.min(ANCHO_MAX, cw);
    const alto = Math.max(1, Math.round((ancho * ch) / cw));
    if (canvas.width !== ancho) canvas.width = ancho;
    if (canvas.height !== alto) canvas.height = alto;
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, ancho, alto);
    return { ancho, alto };
  }

  let streamActual = null;
  let ws = null;
  let frameId = 0;
  let temporizador = null;
  let enviando = false;

  function limpiarCaptura() {
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
    if (streamActual) {
      streamActual.getTracks().forEach((t) => t.stop());
      streamActual = null;
    }
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
    video.srcObject = null;
    enviando = false;
    rectsPorTab.clear();
    ultimoRectUsado = null;
    pedidoEn = 0;
  }

  async function iniciarCaptura(streamId, puerto, token, tabId) {
    limpiarCaptura();
    tabCapturada = typeof tabId === 'number' ? tabId : null;

    try {
      streamActual = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId,
          },
        },
      });

      video.srcObject = streamActual;
      await video.play();

      // Abrir conexión WebSocket local para streaming de frames binarios
      const urlWs = `ws://127.0.0.1:${puerto || 48201}/companion?token=${encodeURIComponent(token || '')}&rol=stream`;
      ws = new WebSocket(urlWs);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        iniciarBucleFrames();
      };

      ws.onerror = (e) => {
        console.error('[companion-offscreen] Error en WebSocket:', e);
      };

      ws.onclose = () => {
        limpiarCaptura();
        chrome.runtime.sendMessage({ tipo: 'captura_cerrada' });
      };

      // Si la pista de vídeo se detiene o silencia desde la pestaña
      const track = streamActual.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          limpiarCaptura();
          chrome.runtime.sendMessage({ tipo: 'captura_finalizada' });
        };
      }
    } catch (err) {
      console.error('[companion-offscreen] Error al capturar stream:', err);
      limpiarCaptura();
      chrome.runtime.sendMessage({ tipo: 'captura_error', error: err.message });
    }
  }

  function iniciarBucleFrames() {
    if (temporizador) clearInterval(temporizador);

    temporizador = setInterval(async () => {
      if (enviando || !ws || ws.readyState !== WebSocket.OPEN) return;
      if (!video.videoWidth || !video.videoHeight) return;

      enviando = true;
      try {
        const destino = dibujarRecorte();

        canvas.toBlob(async (blob) => {
          try {
            if (!blob || !ws || ws.readyState !== WebSocket.OPEN) {
              enviando = false;
              return;
            }

            const payloadBytes = new Uint8Array(await blob.arrayBuffer());
            const longitudPayload = payloadBytes.byteLength;
            frameId = (frameId + 1) >>> 0;

            // Construir cabecera binaria de 16 bytes:
            // [0..3]   0x5644434D ('VDCM' uint32 BE)
            // [4..5]   Ancho (uint16 LE)
            // [6..7]   Alto (uint16 LE)
            // [8..11]  Frame ID (uint32 LE)
            // [12..15] Longitud del Payload (uint32 LE)
            const bufferCompleto = new Uint8Array(16 + longitudPayload);
            const view = new DataView(bufferCompleto.buffer);

            view.setUint32(0, MAGIC_VDCM, false); // Big-Endian
            view.setUint16(4, destino.ancho, true); // Little-Endian
            view.setUint16(6, destino.alto, true);
            view.setUint32(8, frameId, true);
            view.setUint32(12, longitudPayload, true);

            bufferCompleto.set(payloadBytes, 16);

            ws.send(bufferCompleto.buffer);
          } catch (err) {
            console.error('[companion-offscreen] Error al empaquetar frame:', err);
          } finally {
            enviando = false;
          }
        }, 'image/jpeg', 0.85);
      } catch {
        enviando = false;
      }
    }, INTERVALO_MS);
  }

  chrome.runtime.onMessage.addListener((mensaje, _sender, responder) => {
    if (mensaje.tipo === 'start_capture') {
      iniciarCaptura(mensaje.streamId, mensaje.port, mensaje.token, mensaje.tabId);
      responder({ ok: true });
    } else if (mensaje.tipo === 'stop_capture') {
      limpiarCaptura();
      responder({ ok: true });
    } else if (mensaje.tipo === 'video_rect_offscreen' && mensaje.rect) {
      const clave = typeof mensaje.tabId === 'number' ? mensaje.tabId : (tabCapturada ?? 0);
      rectsPorTab.set(clave, mensaje.rect);
      responder({ ok: true });
    } else {
      responder({ ok: false });
    }
    return true;
  });
})();
