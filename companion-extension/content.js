/**
 * VirtualDeck Companion - Content Script
 * Extrae metadatos precisos de reproducción e interactúa con los controles DOM de los reproductores.
 */

(() => {
  let ultimoEnvio = 0;
  let ultimoEstado = '';

  /**
   * Cada cuánto se mira si hay algo nuevo que contar.
   *
   * `MutationObserver` sobre `document.body` con `subtree` dispara **cientos**
   * de veces por segundo en YouTube, y `extraerMetadatos()` recorre los
   * `<video>` midiendo cajas. Con 400 ms de respiro dentro del envío el trabajo
   * se hacía las mismas veces de todos modos: el guarda solo evitaba el
   * `sendMessage`, no la medición. Aquí el throttling va **antes**, en el
   * observador, que es donde estaba el gasto.
   */
  const INTERVALO_META_MS = 500;
  let pendienteMeta = 0;

  function obtenerFuente() {
    const host = window.location.hostname;
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('twitch.tv')) return 'twitch';
    if (host.includes('spotify.com')) return 'spotify';
    if (host.includes('soundcloud.com')) return 'soundcloud';
    return 'browser';
  }

  /** Por debajo de esto el elemento no se ve: no sirve para recortar. */
  const MINIMO_VISIBLE = 64;

  /** Zona del rectángulo que queda dentro del viewport, en px². */
  function areaVisible(r) {
    const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    return w * h;
  }

  /**
   * Puntúa un `<video>`/`<audio>` como destino. `-1` lo descarta. Reproduciéndose
   * pesa más que grande, porque en YouTube conviven el vídeo principal, los anuncios
   * y las vistas previas que salen al pasar el ratón por los resultados.
   *
   * `exigirVisible` se usa solo para el recorte: los metadatos y los comandos de
   * transporte tienen que seguir llegando aunque el reproductor esté oculto (en el
   * reproductor web de Spotify el `<audio>` no se ve nunca).
   */
  function puntuarMedia(el, exigirVisible) {
    if (!el.isConnected) return -1;
    if (el instanceof HTMLVideoElement && el.videoWidth === 0) return -1;
    let puntos = areaVisible(el.getBoundingClientRect());
    if (exigirVisible) {
      if (puntos < MINIMO_VISIBLE) return -1;
    } else {
      puntos = Math.max(puntos, 1);
    }
    return puntos + (!el.paused && !el.ended ? 1e7 : 0);
  }

  function mejorDe(tipo, exigirVisible) {
    let mejor = null;
    let mejorPuntos = 0;
    const candidatos = document.querySelectorAll(tipo);
    for (const el of candidatos) {
      const puntos = puntuarMedia(el, exigirVisible);
      if (puntos > mejorPuntos) {
        mejorPuntos = puntos;
        mejor = el;
      }
    }
    return mejor;
  }

  /**
   * El `<video>` (o `<audio>`) que manda, con una caché muy corta.
   * `emitirMetadatos` corre con cada mutación del DOM (en YouTube son cientos por
   * segundo) y recorrer todos los `<video>` midiendo cajas en cada una no es gratis.
   */
  let mediaCache = null;
  let mediaCacheT = 0;
  function obtenerElementoVideo() {
    const ahora = Date.now();
    if (mediaCache && ahora - mediaCacheT < 200 && mediaCache.isConnected) return mediaCache;
    mediaCache = mejorDe('video', false) || mejorDe('audio', false);
    mediaCacheT = ahora;
    return mediaCache;
  }

  /**
   * El `<video>` que se está viendo de verdad, para saber dónde recortar. Si no hay
   * ninguno a la vista no se manda rectángulo: es preferible capturar la pestaña
   * entera a recortar un anuncio o una miniatura del ratón.
   */
  function videoVisible() {
    return mejorDe('video', true);
  }

  function extraerYouTube() {
    const elTitulo = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, .ytp-title-link');
    const elCanal = document.querySelector('#channel-name yt-formatted-string a, #owner-name a, .ytp-title-channel-name');
    const titulo = elTitulo?.textContent?.trim() || document.title.replace(' - YouTube', '').trim();
    const artista = elCanal?.textContent?.trim() || '';
    const matchId = window.location.search.match(/[?&]v=([^&]+)/);
    const caratulaUrl = matchId && matchId[1] ? `https://img.youtube.com/vi/${matchId[1]}/hqdefault.jpg` : '';
    return { titulo, artista, caratulaUrl };
  }

  function extraerSpotify() {
    const elTitulo = document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-info-title"] a');
    const elArtista = document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-info-artist"] a');
    const elImg = document.querySelector('[data-testid="now-playing-widget"] img');
    return {
      titulo: elTitulo?.textContent?.trim() || '',
      artista: elArtista?.textContent?.trim() || '',
      caratulaUrl: elImg?.src || '',
    };
  }

  function extraerTwitch() {
    const elTitulo = document.querySelector('[data-a-target="stream-title"]');
    const elCanal = document.querySelector('[data-a-target="user-channel-name-link"]');
    return {
      titulo: elTitulo?.textContent?.trim() || document.title,
      artista: elCanal?.textContent?.trim() || '',
      caratulaUrl: '',
    };
  }

  function extraerSoundCloud() {
    const elTitulo = document.querySelector('.playbackSoundBadge__titleLink');
    const elArtista = document.querySelector('.playbackSoundBadge__lightLink');
    return {
      titulo: elTitulo?.getAttribute('title') || elTitulo?.textContent?.trim() || '',
      artista: elArtista?.getAttribute('title') || elArtista?.textContent?.trim() || '',
      caratulaUrl: '',
    };
  }

  function obtenerDatosPlataforma(fuente) {
    if (fuente === 'youtube') return extraerYouTube();
    if (fuente === 'spotify') return extraerSpotify();
    if (fuente === 'twitch') return extraerTwitch();
    if (fuente === 'soundcloud') return extraerSoundCloud();
    return { titulo: '', artista: '', caratulaUrl: '' };
  }

  function extraerMetadatos() {
    const fuente = obtenerFuente();
    const media = obtenerElementoVideo();
    const info = obtenerDatosPlataforma(fuente);

    const titulo = info.titulo || (media ? document.title || 'Reproducción multimedia' : 'VirtualDeck Stream');
    const artista = info.artista || fuente.toUpperCase();
    const posicionMs = media ? Math.floor(media.currentTime * 1000) : 0;
    const duracionMs = media && Number.isFinite(media.duration) ? Math.floor(media.duration * 1000) : 0;
    const reproduciendo = media ? !media.paused && !media.ended : false;
    const volumen = media ? media.volume : 1;
    const silenciado = media ? media.muted : false;
    const tieneVideo = media instanceof HTMLVideoElement && media.videoWidth > 0;

    return {
      tipo: 'meta',
      titulo,
      artista,
      album: '',
      posicionMs,
      duracionMs,
      reproduciendo,
      volumen,
      silenciado,
      caratulaUrl: info.caratulaUrl,
      tieneVideo,
      fuente,
    };
  }

  function emitirMetadatos(forzar = false) {
    const ahora = Date.now();
    if (!forzar && ahora - ultimoEnvio < INTERVALO_META_MS) return;

    const datos = extraerMetadatos();
    const firma = `${datos.titulo}:${datos.artista}:${datos.reproduciendo}:${Math.floor(datos.posicionMs / 2000)}`;

    if (!forzar && firma === ultimoEstado) return;
    ultimoEstado = firma;
    ultimoEnvio = ahora;

    try {
      chrome.runtime.sendMessage({
        tipo: 'media_update',
        metadata: datos,
      });
    } catch {
      // Ignorar desconexión de runtime si la extensión se recargó
    }
  }

  /**
   * Revisa los metadatos como mucho una vez cada `INTERVALO_META_MS`.
   *
   * Con `forzado` no espera: los eventos de `play`/`pause`/`volumechange`
   * llaman directamente a `emitirMetadatos(true)`, y ese camino sigue siendo
   * inmediato, que es lo que hace falta para que el panel reaccione al pulsar.
   */
  function revisarMetadatos() {
    if (pendienteMeta) return;
    pendienteMeta = setTimeout(() => {
      pendienteMeta = 0;
      emitirMetadatos();
      registrarEventosMedia();
    }, INTERVALO_META_MS);
  }

  function ejecutarPlayPause(media, accion) {
    if (!media) {
      const btn = document.querySelector('.ytp-play-button, [data-testid="control-button-playpause"]');
      if (btn) btn.click();
      return;
    }
    if (accion === 'pause') {
      if (!media.paused) media.pause();
    } else if (accion === 'play') {
      if (media.paused) media.play().catch(() => {});
    } else {
      if (media.paused) media.play().catch(() => {});
      else media.pause();
    }
  }

  function ejecutarComando(cmd) {
    const media = obtenerElementoVideo();

    if (cmd.comando === 'play' || cmd.comando === 'pause' || cmd.comando === 'playPause') {
      ejecutarPlayPause(media, cmd.comando);
    } else if (cmd.comando === 'next') {
      const btn = document.querySelector('.ytp-next-button, [data-testid="control-button-skip-forward"], .skipControl__next');
      if (btn) btn.click();
    } else if (cmd.comando === 'previous') {
      const btn = document.querySelector('.ytp-prev-button, [data-testid="control-button-skip-back"], .skipControl__previous');
      if (btn) btn.click();
    } else if (cmd.comando === 'seek' && typeof cmd.posicionMs === 'number' && media) {
      media.currentTime = Math.max(0, cmd.posicionMs / 1000);
    } else if (cmd.comando === 'volumen' && typeof cmd.nivel === 'number' && media) {
      media.volume = Math.max(0, Math.min(1, cmd.nivel));
      if (media.volume > 0 && media.muted) media.muted = false;
    }

    setTimeout(() => emitirMetadatos(true), 100);
  }

  /**
   * Posición del vídeo en el viewport, en fracciones 0..1 de la zona visible.
   *
   * En fracciones y no en píxeles CSS a propósito: el offscreen recorta un cuadro
   * cuyo tamaño no es `ancho × alto × devicePixelRatio` de esta página (zoom del
   * navegador, escalado de la ventana, barra de desplazamiento), así que la
   * conversión a píxeles nunca era exacta. La fracción es lo único que se
   * conserva, y además vale igual en modo normal, teatro y pantalla completa.
   *
   * El denominador es `clientWidth/clientHeight` (sin barra de scroll) porque es
   * el mismo origen que usa `getBoundingClientRect()`. Al equivocarse, se equivoca
   * hacia el lado de más: el recorte entra un poco de scrollbar, nunca se come
   * borde del vídeo.
   */
  function medirVideo(media) {
    const de = document.documentElement;
    const vw = de.clientWidth || window.innerWidth;
    const vh = de.clientHeight || window.innerHeight;
    if (vw <= 0 || vh <= 0) return null;
    const r = media.getBoundingClientRect();
    const x = Math.max(0, r.left);
    const y = Math.max(0, r.top);
    const w = Math.min(r.width, vw - x);
    const h = Math.min(r.height, vh - y);
    if (w < 8 || h < 8) return null;
    return {
      x: +(x / vw).toFixed(5),
      y: +(y / vh).toFixed(5),
      w: +(w / vw).toFixed(5),
      h: +(h / vh).toFixed(5),
      vw,
      vh,
      dpr: window.devicePixelRatio,
    };
  }

  let ultimoRect = '';
  let ticsRect = 0;
  let observado = null;

  const observadorCaja = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => emitirRectVideo(true))
    : null;

  function enviarRect(rect) {
    try {
      chrome.runtime.sendMessage({ tipo: 'video_rect', rect });
    } catch {
      // Runtime invalidado tras recargar la extensión
    }
  }

  function emitirRectVideo(forzar = false) {
    const media = observarMedia();
    if (!media) {
      // No hay vídeo a la vista (entre anuncio y anuncio, página en cola,
      // SPA a media carga): se dice que el recorte es la página entera en vez de
      // dejar un rectángulo viejo clavado en el fotograma.
      if (ultimoRect !== 'entera') {
        ultimoRect = 'entera';
        enviarRect({ x: 0, y: 0, w: 1, h: 1 });
      }
      return;
    }
    const rect = medirVideo(media);
    if (!rect) return;
    const firma = `${rect.x},${rect.y},${rect.w},${rect.h},${rect.vw},${rect.vh}`;
    ticsRect += 1;
    // Con la misma firma se reenvía cada 16 tics (~4 s): si el service worker o el
    // documento offscreen se han reiniciado por dentro, converge sin esperar a que
    // el vídeo se mueva.
    if (!forzar && firma === ultimoRect && ticsRect < 16) return;
    ticsRect = 0;
    ultimoRect = firma;
    enviarRect(rect);
  }

  /** Observa el `<video>` visible: si cambia de tamaño, el recorte va con él. */
  function observarMedia() {
    const media = videoVisible();
    if (media === observado) return media;
    if (observadorCaja && observado) observadorCaja.unobserve(observado);
    observado = media;
    if (observadorCaja && media) observadorCaja.observe(media);
    return media;
  }

  // El rect cambia sin que el DOM se mueva: pantalla completa, teatro, scroll,
// redimensionado de la ventana, cambio de dispositivo con pantalla táctil.
// Con retardo corto porque el scroll dispara miles de eventos por segundo y
// medir obliga a releer la disposición.
  let pendienteRect = 0;
  function alCambiarViewport() {
    if (pendienteRect) return;
    pendienteRect = setTimeout(() => {
      pendienteRect = 0;
      emitirRectVideo(true);
    }, 80);
  }

  window.addEventListener('resize', alCambiarViewport, { passive: true });
  window.addEventListener('scroll', alCambiarViewport, { passive: true, capture: true });
  document.addEventListener('fullscreenchange', alCambiarViewport);
  document.addEventListener('webkitfullscreenchange', alCambiarViewport);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', alCambiarViewport, { passive: true });
  }

  // Sondeo de seguridad del rectángulo: el `ResizeObserver` y los escuchas de
  // `resize`/`scroll` ya cubren el caso normal, así que 500 ms bastan.
  setInterval(() => emitirRectVideo(), 500);

  // Escuchar comandos desde background.js
  chrome.runtime.onMessage.addListener((mensaje, _sender, responder) => {
    if (mensaje.tipo === 'ejecutar_comando' && mensaje.comando) {
      ejecutarComando(mensaje.comando);
      responder({ ok: true });
    } else if (mensaje.tipo === 'pedir_metadatos') {
      responder({ metadata: extraerMetadatos() });
    } else if (mensaje.tipo === 'pedir_rect') {
      emitirRectVideo(true);
      responder({ ok: true });
    }
  });

  // Suscribirse a eventos de elementos multimedia. El `MutationObserver` llama a
  // esta función en cada cambio del DOM con el mismo elemento: sin esta guarda
  // se acumulaban miles de escuchadores idénticos sobre el mismo `<video>`.
  const conEventos = new WeakSet();
  function registrarEventosMedia() {
    const media = obtenerElementoVideo();
    if (!media || conEventos.has(media)) return;
    conEventos.add(media);

    media.addEventListener('play', () => emitirMetadatos(true));
    media.addEventListener('pause', () => emitirMetadatos(true));
    media.addEventListener('timeupdate', () => emitirMetadatos());
    media.addEventListener('volumechange', () => emitirMetadatos(true));
    media.addEventListener('loadedmetadata', () => emitirMetadatos(true));
  }

  // Observador de mutaciones del DOM para capturar cambios de título o navegación SPA.
  // **No** se llama a `emitirMetadatos` en cada mutación: en una página con
  // vídeo eso son cientos por segundo y no cambian los metadatos. Se avisa a
  // `revisarMetadatos`, que consolida en uno cada 500 ms.
  const observador = new MutationObserver(() => {
    revisarMetadatos();
  });

  observador.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
  });

  registrarEventosMedia();
  // Red de seguridad para lo que no pasa por mutaciones ni por eventos del
  // `<video>`: el reloj avanza solo con este temporizador.
  setInterval(revisarMetadatos, 1000);
})();
