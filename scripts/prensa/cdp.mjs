// Cliente CDP mínimo sobre el WebSocket global de Node 22.
//
// Vive aquí y no en `node_modules` porque las capturas se sacan con lo que ya
// hay: `npm i` no instala un cliente de CDP, y añadir uno solo para esto
// mete una dependencia de desarrollo en el árbol de todo el mundo.

export async function conectar(puerto = 9222) {
  const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
  const pagina = lista.find((t) => t.type === 'page');
  if (!pagina) throw new Error('no hay ninguna página en el depurador');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });

  let id = 0;
  const pendientes = new Map();
  const oyentes = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendientes.has(m.id)) {
      const { ok, mal } = pendientes.get(m.id);
      pendientes.delete(m.id);
      m.error ? mal(new Error(`${m.error.message} (${JSON.stringify(m.error.data ?? '')})`)) : ok(m.result);
      return;
    }
    (oyentes.get(m.method) ?? []).forEach((f) => f(m.params));
  };

  const enviar = (method, params = {}) => new Promise((ok, mal) => {
    const n = ++id;
    pendientes.set(n, { ok, mal });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

  return {
    enviar,
    al: (method, fn) => { oyentes.set(method, [...(oyentes.get(method) ?? []), fn]); },
    cerrar: () => ws.close(),
  };
}

/** Ejecuta una expresión en la página y devuelve el valor ya deserializado. */
export async function evaluar(cdp, expresion) {
  const r = await cdp.enviar('Runtime.evaluate', {
    expression: expresion, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(`en la página: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`);
  return r.result.value;
}

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
