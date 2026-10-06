// Polling centralizado de medios. Antes MainB y FullscreenB tenían su propio
// interval — duplicaban el query a PowerShell cada 5s. Un único provider en App
// comparte el estado entre vistas.
//
// La activación es **por consumidor**, no un booleano único: `MainB` la apaga
// según su barra lateral (si está oculta no hay nada que enseñe la canción),
// `FloatingBarB` la enciende solo si tiene un widget de reproducción y la tecla
// física del dock pide la suya. Con un solo booleano, el último que hablaba
// apagaba el sondeo de los demás: el dock dejaba de tener canción en cuanto la
// barra lateral se ocultaba.
//
// Y el dock vive **fuera** de `<NowPlayingProvider>` (`useSuperficies` corre en
// el cuerpo de `App`, y `App` es quien renderiza el proveedor), así que el
// valor se publica además en un almacén de módulo. El proveedor sigue siendo el
// único que sondea; fuera solo se lee y se pide activación.

import React, { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { NowPlaying } from '../types';

interface NowPlayingContextValue {
  nowPlaying: NowPlaying | null;
  /** Vuelve a preguntar ya, sin esperar al siguiente sondeo. */
  refrescar: () => void;
}

const NowPlayingContext = createContext<NowPlayingContextValue>({
  nowPlaying: null,
  refrescar: () => {},
});

let _globalRefresh = () => {};

/**
 * Permite a acciones de transporte de medios (ej. media-play-pause) forzar
 * un refresco inmediato del estado de reproducción sin depender de React Context.
 */
export function refrescarNowPlayingGlobal(): void {
  _globalRefresh();
}

const POLL_INTERVAL_MS = 5000;

/**
 * Las claves de los consumidores que necesitan el sondeo ahora mismo.
 *
 * Es un `Set` de claves estables (`main`, `kiosko`, `barra`, `dock`) y no un
 * booleano porque varios consumidores conviven: cada uno enciende la suya y el
 * sondeo corre mientras quede alguna. Los avisos de cambio llegan al proveedor
 * por `oyentesActivacion`.
 */
const clavesActivas = new Set<string>();
const oyentesActivacion = new Set<() => void>();

function suscribirActivacion(oyente: () => void): () => void {
  oyentesActivacion.add(oyente);
  return () => { oyentesActivacion.delete(oyente); };
}

function hayConsumidorActivo(): boolean {
  return clavesActivas.size > 0;
}

/**
 * El último valor publicado, para quien vive fuera del proveedor.
 *
 * El proveedor lo actualiza en cada consulta; la identidad solo cambia cuando
 * cambia algo que un widget enseña (título, artista o estado), para no
 * repintar la tecla cinco veces por minuto con el mismo texto.
 */
let sonandoCache: NowPlaying | null = null;
const oyentesSonando = new Set<() => void>();

function suscribirSonando(oyente: () => void): () => void {
  oyentesSonando.add(oyente);
  return () => { oyentesSonando.delete(oyente); };
}

function sonandoPublicado(): NowPlaying | null {
  return sonandoCache;
}

function publicarSonando(np: NowPlaying | null): void {
  if (
    sonandoCache?.title === np?.title
    && sonandoCache?.artist === np?.artist
    && sonandoCache?.status === np?.status
  ) return;
  sonandoCache = np;
  oyentesSonando.forEach((f) => f());
}

export function NowPlayingProvider({ children }: { children: React.ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const activo = useSyncExternalStore(suscribirActivacion, hayConsumidorActivo);
  const pedir = useCallback(() => {
    const api = window.electronAPI;
    if (!api) return;
    api.media.nowPlaying()
      .then((np) => {
        setNowPlaying(np);
        publicarSonando(np);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activo) return;
    pedir();
    const t = window.setInterval(pedir, POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [activo, pedir]);

  // Tras pulsar pausa, SMTC tarda un momento en reflejarlo, asi que no sirve
  // preguntar en el mismo instante. Se pregunta dos veces: pronto, para que el
  // icono cambie enseguida, y otra vez por si la primera llego demasiado
  // temprano. Sin esto habia que esperar al siguiente sondeo —hasta 5 s— y el
  // icono seguia diciendo «reproduciendo» despues de pausar.
  const refrescar = useCallback(() => {
    window.setTimeout(() => pedir(), 250);
    window.setTimeout(() => pedir(), 900);
  }, [pedir]);

  useEffect(() => {
    _globalRefresh = refrescar;
    return () => {
      _globalRefresh = () => {};
    };
  }, [refrescar]);

  return (
    <NowPlayingContext.Provider value={{ nowPlaying, refrescar }}>
      {children}
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying(): NowPlaying | null {
  return useContext(NowPlayingContext).nowPlaying;
}

/**
 * La activación de un consumidor. Devuelve el mismo encendedor/apagador de
 * antes (`setActive(boolean)`), pero cada uno lleva su clave: apagar la propia
 * no apaga la de los demás, y el sondeo para solo cuando no queda ninguna.
 *
 * No usa el contexto a propósito: así lo puede pedir también quien vive fuera
 * del proveedor (la tecla física del dock), que es justo el caso que un
 * booleano único no cubría.
 */
export function useNowPlayingActivation(clave: string): (active: boolean) => void {
  return useCallback((active: boolean) => {
    const antes = hayConsumidorActivo();
    if (active) clavesActivas.add(clave);
    else clavesActivas.delete(clave);
    if (antes !== hayConsumidorActivo()) oyentesActivacion.forEach((f) => f());
  }, [clave]);
}

/** Volver a preguntar ya. Se usa justo despues de mandar una orden de medios. */
export function useNowPlayingRefresh(): () => void {
  return useContext(NowPlayingContext).refrescar;
}

/**
 * La reproducción actual para quien está fuera del proveedor (el dock).
 *
 * Se suscribe al almacén de módulo que actualiza el proveedor: no crea otro
 * sondeo. Quien lo use debe pedir antes su activación, o el valor se queda
 * congelado en el último publicado.
 */
export function useNowPlayingExterno(): NowPlaying | null {
  return useSyncExternalStore(suscribirSonando, sonandoPublicado);
}
