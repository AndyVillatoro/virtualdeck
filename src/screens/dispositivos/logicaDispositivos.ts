import { useEffect, useMemo, useRef, useState } from 'react';
import { controlDeHueco, huecosDeControl } from '../../utils/superficies/disposicion';
import { idPaginaPredeterminada } from '../../utils/superficies/paginaSegunApp';
import { BRILLO_SUPERFICIE_POR_DEFECTO } from '../../utils/superficies/ajustesSuperficie';
import type { ButtonConfig, DeckConfig } from '../../types';
import type { DisposicionSuperficie, InfoSuperficie } from '../../types/superficies';
import type { DispositivoItem } from './ListaDispositivosHardware';

/** Los ids de los botones de todos los huecos del control elegido, en orden (izq, pulsar, der). */
export function idsDelControl(
  disposicion: DisposicionSuperficie | null,
  meta: ReturnType<typeof controlDeHueco>,
  botones: ButtonConfig[],
): string[] {
  if (!disposicion || !meta) return [];
  const control = disposicion.controles.find((c) => c.tipo === meta.control && c.indice === meta.indice);
  if (!control) return [];
  return huecosDeControl(disposicion, control).flatMap((h) => (botones[h] ? [botones[h].id] : []));
}

export function obtenerTodosDispositivos(
  superficies: InfoSuperficie[],
  pages: DeckConfig['pages'],
  modelos: Record<string, DisposicionSuperficie>,
): DispositivoItem[] {
  const mapa = new Map<string, DispositivoItem>();

  for (const sup of superficies) {
    const pag = pages.find((p) => p.superficie?.serial === sup.serial);
    mapa.set(sup.serial, {
      ...sup,
      paginaNombre: pag?.name,
    });
  }

  for (const pag of pages) {
    if (pag.superficie && !mapa.has(pag.superficie.serial)) {
      const modeloId = pag.superficie.modelo;
      const disp = modelos[modeloId];
      const nombreModelo = disp?.nombre ?? modeloId;
      mapa.set(pag.superficie.serial, {
        serial: pag.superficie.serial,
        modelo: modeloId,
        nombre: nombreModelo,
        conectado: false,
        disposicion: disp,
        paginaNombre: pag.name,
      });
    }
  }

  return Array.from(mapa.values());
}

export function obtenerDisposicionActiva(
  dispositivoActivo: DispositivoItem | null,
  superficies: InfoSuperficie[],
  paginaConfig: DeckConfig['pages'][number] | undefined,
  modelos: Record<string, DisposicionSuperficie>,
): DisposicionSuperficie | null {
  if (!dispositivoActivo) return null;
  if (dispositivoActivo.conectado && dispositivoActivo.disposicion) {
    return dispositivoActivo.disposicion;
  }
  const supViva = superficies.find((s) => s.serial === dispositivoActivo.serial);
  if (supViva?.disposicion) return supViva.disposicion;

  const modeloId = paginaConfig?.superficie?.modelo || dispositivoActivo.modelo;
  if (modeloId && modelos[modeloId]) {
    return modelos[modeloId];
  }
  return null;
}

/** El brillo que enseña la pantalla para un dock (el por defecto si no dice). */
export function brilloDePagina(
  cfg: Pick<DeckConfig, 'superficies'>,
  pagina: DeckConfig['pages'][number] | undefined,
): number {
  const serial = pagina?.superficie?.serial;
  if (!serial) return BRILLO_SUPERFICIE_POR_DEFECTO;
  return cfg.superficies?.[serial]?.brillo ?? BRILLO_SUPERFICIE_POR_DEFECTO;
}

/**
 * Qué página del dispositivo se edita y cuál enseña el aparato.
 *
 * Se edita la de la pestaña elegida; la pestaña sigue a lo que enseña el
 * aparato (al cambiar de dispositivo, al cambiar la página sola por la app
 * en primer plano, o al borrar la que se editaba, se vuelve a la activa). Una
 * página recién añadida se estrena editándose y en el aparato.
 */
export function usePaginaDispositivo(
  config: DeckConfig,
  dispositivoActivo: DispositivoItem | null,
  paginasActivas: Record<string, string>,
  onActivarPagina: (serial: string, paginaId: string) => void,
) {
  const paginasDelSerial = useMemo(() => {
    if (!dispositivoActivo) return [];
    return config.pages.filter((p) => p.superficie?.serial === dispositivoActivo.serial);
  }, [config.pages, dispositivoActivo]);

  const paginaActivaId = useMemo(() => {
    if (!dispositivoActivo) return null;
    const activa = paginasActivas[dispositivoActivo.serial] ?? null;
    if (activa && paginasDelSerial.some((p) => p.id === activa)) return activa;
    return idPaginaPredeterminada(config.pages, dispositivoActivo.serial);
  }, [dispositivoActivo, paginasActivas, paginasDelSerial, config.pages]);

  const paginaPredeterminadaId = useMemo(() => {
    if (!dispositivoActivo) return null;
    return idPaginaPredeterminada(config.pages, dispositivoActivo.serial);
  }, [dispositivoActivo, config.pages]);

  const [paginaEditadaId, setPaginaEditadaId] = useState<string | null>(null);

  useEffect(() => {
    setPaginaEditadaId((prev) => {
      if (prev && paginasDelSerial.some((p) => p.id === prev)) {
        return paginaActivaId && paginaActivaId !== prev ? paginaActivaId : prev;
      }
      return paginaActivaId;
    });
  }, [paginasDelSerial, paginaActivaId]);

  const numPaginas = paginasDelSerial.length;
  const numPaginasPrev = useRef(numPaginas);
  useEffect(() => {
    if (numPaginas > numPaginasPrev.current) {
      const ultima = paginasDelSerial[paginasDelSerial.length - 1];
      if (ultima && dispositivoActivo) {
        setPaginaEditadaId(ultima.id);
        onActivarPagina(dispositivoActivo.serial, ultima.id);
      }
    }
    numPaginasPrev.current = numPaginas;
  }, [numPaginas, paginasDelSerial, dispositivoActivo, onActivarPagina]);

  const handleElegirPagina = (id: string) => {
    setPaginaEditadaId(id);
    if (dispositivoActivo) onActivarPagina(dispositivoActivo.serial, id);
  };

  const paginaEditada = paginaEditadaId
    ? paginasDelSerial.find((p) => p.id === paginaEditadaId) ?? null
    : null;

  const indicePagina = paginaEditada
    ? config.pages.findIndex((p) => p.id === paginaEditada.id)
    : -1;

  return {
    paginasDelSerial,
    paginaActivaId,
    paginaPredeterminadaId,
    paginaEditada,
    paginaEditadaId: paginaEditada?.id ?? null,
    indicePagina,
    puedeAgregar: config.pages.length < 8 && paginasDelSerial.length > 0,
    handleElegirPagina,
  };
}
