/* Puente del protocolo de Stream Deck para los plugins HTML de VirtualDeck.
 *
 * El anfitrion (`electron/main/plugins/anfitrion.ts`) llama a
 * `connectElgatoStreamDeckSocket(puerto, identificador, registro, info, accion)`
 * en la ventana oculta y espera `registerPlugin`; el Property Inspector se
 * registra con `registerPropertyInspector` y el mismo puerto. Eso es todo lo
 * que hace falta del SDK oficial, asi que esta aqui a mano: un `WebSocket` a
 * `ws://127.0.0.1:<puerto>`, el primer mensaje con el evento que toca y el
 * reparto del resto a quien se apunto con `StreamDeck.addEventListener`.
 *
 * Sin dependencias y sin `require`: el plugin es su carpeta y nada mas. Los
 * seis plugins de `docs/galeria-ejemplo/plugins/` llevan una copia de este
 * archivo, igual que hace el SDK oficial con cada paquete.
 *
 * Detalles del anfitrion que condicionan esto:
 * - `setSettings` manda los ajustes **como payload**, no envueltos: el anfitrion
 *   guarda `msg.payload ?? {}` tal cual.
 * - `setImage` solo acepta `data:image/...;base64` (`validacion.ts`); el texto
 *   plano de un SVG se rechaza.
 * - Toda orden visual necesita un `context` ya registrado (`willAppear`).
 */
(function (global) {
  const escuchas = new Map();
  let salida = null;
  let identificador = '';

  /** Un mensaje al anfitrion. Sin tunel, se pierde: no hay a donde mandarlo. */
  function enviar(mensaje) {
    if (!salida) return;
    try {
      salida(JSON.stringify(mensaje));
    } catch {
      /* el tunel se cayo entre medias */
    }
  }

  function repartir(mensaje) {
    const para = escuchas.get(mensaje.event);
    if (para) for (const fn of para.slice()) fn(mensaje);
  }

  function addEventListener(tipo, fn) {
    const lista = escuchas.get(tipo) || [];
    lista.push(fn);
    escuchas.set(tipo, lista);
  }

  /** Reintentos acotados: si el anfitrion muere, el plugin no se queda insistiendo. */
  const MAX_INTENTOS = 30;

  function conectar(puerto, id, registro) {
    identificador = id;
    let intento = 0;
    function abrir() {
      const ws = new WebSocket('ws://127.0.0.1:' + puerto);
      salida = (texto) => {
        if (ws.readyState === 1) ws.send(texto);
      };
      ws.onopen = () => {
        intento = 0;
        ws.send(JSON.stringify({ event: registro, uuid: id }));
      };
      ws.onmessage = (evento) => {
        let mensaje;
        try {
          mensaje = JSON.parse(evento.data);
        } catch {
          return;
        }
        repartir(mensaje);
      };
      ws.onclose = () => {
        salida = null;
        intento += 1;
        if (intento <= MAX_INTENTOS) setTimeout(abrir, Math.min(4000, 300 * intento));
      };
    }
    abrir();
  }

  /** Un evento al anfitrion: el contexto sale del boton o, en un PI, del registro. */
  function mandar(evento, contexto, payload) {
    const mensaje = { event: evento };
    const ctx = contexto === undefined ? identificador : contexto;
    if (ctx) mensaje.context = ctx;
    if (payload !== undefined) mensaje.payload = payload;
    enviar(mensaje);
  }

  global.StreamDeck = {
    addEventListener,
    setImage: (contexto, imagen) => mandar('setImage', contexto, { image: imagen }),
    setTitle: (contexto, titulo) => mandar('setTitle', contexto, { title: titulo }),
    setState: (contexto, estado) => mandar('setState', contexto, { state: estado }),
    setSettings: (contexto, ajustes) => mandar('setSettings', contexto, ajustes),
    getSettings: (contexto) => mandar('getSettings', contexto),
    openUrl: (url) => mandar('openUrl', undefined, { url }),
    logMessage: (mensaje) => mandar('logMessage', undefined, { message: mensaje }),
  };

  global.connectElgatoStreamDeckSocket = conectar;
  global.Vd = { mandar };
})(typeof window !== 'undefined' ? window : globalThis);