import { useEffect, useMemo, useState } from 'react';
import { controlDeHueco, huecosDeControl, teclasLcd } from '../../utils/superficies/disposicion';
import { rotacionDeSuperficie } from '../../utils/superficies/ajustesSuperficie';
import { generarResumenControles } from './BarraHardwareActivo';
import { botonesResueltos } from '../../utils/botonesFijos';
import {
  brilloDePagina,
  idsDelControl,
  obtenerDisposicionActiva,
  obtenerTodosDispositivos,
  usePaginaDispositivo,
} from './logicaDispositivos';
import type { DeckConfig, ModoPerilla } from '../../types';
import type { PresetHueco } from '../../data/presetsDock';
import { huecosDePerfil, type PerfilDock } from '../../data/perfilesDock';
import type { DisposicionSuperficie, InfoSuperficie } from '../../types/superficies';

interface UseDockHardwareStateProps {
  config: DeckConfig;
  superficies: InfoSuperficie[];
  modelos: Record<string, DisposicionSuperficie>;
  paginasActivas: Record<string, string>;
  /** Modo activo de cada perilla multimodo (lo guarda `useSuperficies`, en memoria). */
  modosActivos: Record<string, number>;
  t: (k: string, p?: Record<string, string | number>) => string;
  onBrilloVivo: (serial: string, valor: number) => void;
  onBrillo: (serial: string, valor: number) => void;
  onRotacion: (serial: string, grados: number) => void;
  onActivarPagina: (serial: string, paginaId: string) => void;
  onEditarBoton: (id: string) => void;
  onRellenarHuecos: (ids: string[], contenidos: PresetHueco[], nombre: string) => void;
  /** Escribir los modos de una perilla (con historial). */
  onFijarModosPerilla: (botonId: string, modos: ModoPerilla[], nombre: string) => void;
}

export function useDockHardwareState({
  config,
  superficies,
  modelos,
  paginasActivas,
  modosActivos,
  t,
  onBrilloVivo,
  onBrillo,
  onRotacion,
  onActivarPagina,
  onEditarBoton,
  onRellenarHuecos,
  onFijarModosPerilla,
}: UseDockHardwareStateProps) {
  const todosDispositivos = useMemo(() => {
    return obtenerTodosDispositivos(superficies, config.pages, modelos);
  }, [superficies, config.pages, modelos]);

  const [selectedSerial, setSelectedSerial] = useState<string | null>(() => {
    return todosDispositivos[0]?.serial ?? null;
  });

  const dispositivoActivo = useMemo(() => {
    if (selectedSerial) {
      const encontrado = todosDispositivos.find((d) => d.serial === selectedSerial);
      if (encontrado) return encontrado;
    }
    return todosDispositivos[0] ?? null;
  }, [todosDispositivos, selectedSerial]);

  const pestanas = usePaginaDispositivo(config, dispositivoActivo, paginasActivas, onActivarPagina);
  const { paginaEditada, paginaEditadaId, indicePagina } = pestanas;

  const paginaConfig = paginaEditada ?? undefined;

  const botonesPagina = useMemo(() => {
    if (indicePagina < 0) return [];
    // Lo mismo que enseña el aparato: con los fijos de las otras páginas del dock.
    return botonesResueltos(config, indicePagina);
  }, [config, indicePagina]);

  const disposicionActiva = useMemo(() => {
    return obtenerDisposicionActiva(dispositivoActivo, superficies, paginaConfig, modelos);
  }, [dispositivoActivo, superficies, paginaConfig, modelos]);

  const [selectedHueco, setSelectedHueco] = useState<number | null>(null);

  useEffect(() => {
    setSelectedHueco(null);
  }, [paginaEditadaId]);

  const brilloActual = brilloDePagina(config, paginaConfig);
  const [brilloLocal, setBrilloLocal] = useState<number>(brilloActual);
  const serialActivo = dispositivoActivo?.serial;

  useEffect(() => {
    setBrilloLocal(brilloActual);
  }, [serialActivo, brilloActual]);

  const handleBrilloMoving = (val: number) => {
    setBrilloLocal(val);
    if (dispositivoActivo) {
      onBrilloVivo(dispositivoActivo.serial, val);
    }
  };

  const handleBrilloCommit = () => {
    if (dispositivoActivo) {
      onBrillo(dispositivoActivo.serial, brilloLocal);
    }
  };

  const lcds = useMemo(() => {
    return disposicionActiva ? teclasLcd(disposicionActiva) : [];
  }, [disposicionActiva]);

  const rotacionDefecto = lcds.length > 0 ? lcds[0].lcd.rotacion : 0;
  const rotacionActual = (serialActivo ? rotacionDeSuperficie(config, serialActivo) : undefined) ?? rotacionDefecto;

  const handleCambiarRotacion = (grados: number) => {
    if (dispositivoActivo) {
      onRotacion(dispositivoActivo.serial, grados);
    }
  };

  const controlSeleccionado = useMemo(() => {
    if (selectedHueco === null || !disposicionActiva) return null;
    return controlDeHueco(disposicionActiva, selectedHueco);
  }, [selectedHueco, disposicionActiva]);

  const botonSeleccionado = selectedHueco !== null ? botonesPagina[selectedHueco] : undefined;

  const hermanosPerilla = useMemo(() => {
    if (!disposicionActiva || !controlSeleccionado || controlSeleccionado.control !== 'knob') {
      return [];
    }
    const ctrl = disposicionActiva.controles.find(
      (c) => c.tipo === 'knob' && c.indice === controlSeleccionado.indice,
    );
    if (!ctrl) return [];
    const huecos = huecosDeControl(disposicionActiva, ctrl);
    const gestos: Array<'izq' | 'pulsar' | 'der'> = ['izq', 'pulsar', 'der'];
    return gestos
      .map((gesto, i) => {
        const hueco = huecos[i];
        return {
          gesto,
          hueco,
          boton: hueco !== undefined ? botonesPagina[hueco] : undefined,
          esActual: controlSeleccionado.gesto === gesto,
        };
      })
      .filter((h) => !h.esActual);
  }, [disposicionActiva, controlSeleccionado, botonesPagina]);

  const handleEditarActual = () => {
    if (botonSeleccionado) {
      onEditarBoton(botonSeleccionado.id);
    }
  };

  // Un perfil (roadmap 62) rellena la página entera: sus botones propios, en
  // el orden de hueco (el de `config.buttons` de esa página). Un solo paso.
  const aplicarPerfilPagina = (perfil: PerfilDock) => {
    if (!disposicionActiva || indicePagina < 0) return;
    const huecos = huecosDePerfil(perfil, disposicionActiva);
    if (!huecos) return;
    const ids = config.buttons.filter((b) => b.page === indicePagina).map((b) => b.id);
    if (ids.length !== huecos.length) return;
    onRellenarHuecos(ids, huecos, t(perfil.nombre));
  };

  // Sin control elegido, el inspector ofrece perfiles (vista de la página).
  const handleAplicarPreset = (entrada: PresetHueco[] | PerfilDock) => {
    if (!Array.isArray(entrada)) {
      aplicarPerfilPagina(entrada);
      return;
    }
    const ids = idsDelControl(disposicionActiva, controlSeleccionado, botonesPagina);
    if (ids.length === entrada.length) onRellenarHuecos(ids, entrada, entrada.map((h) => h.label).join(' / '));
  };

  // Los tres botones de la perilla elegida (T-HW-19): los modos viven en el
  // «pulsar» y el modo 0 se enseña con lo de izq/der.
  const perilla = useMemo(() => {
    if (!disposicionActiva || controlSeleccionado?.control !== 'knob') return null;
    const ctrl = disposicionActiva.controles.find(
      (c) => c.tipo === 'knob' && c.indice === controlSeleccionado.indice,
    );
    if (!ctrl) return null;
    const huecos = huecosDeControl(disposicionActiva, ctrl);
    if (huecos[0] === undefined || huecos[1] === undefined || huecos[2] === undefined) return null;
    return {
      izq: botonesPagina[huecos[0]],
      pulsar: botonesPagina[huecos[1]],
      der: botonesPagina[huecos[2]],
    };
  }, [disposicionActiva, controlSeleccionado, botonesPagina]);

  // El modo que el aparato tiene activo, para enseñarlo en el inspector. Sin
  // modos no hay nada que enseñar.
  const modoActivo = useMemo(() => {
    if (!perilla || !dispositivoActivo || controlSeleccionado?.control !== 'knob') return null;
    if ((perilla.pulsar?.modosPerilla?.length ?? 0) === 0) return null;
    return modosActivos[`${dispositivoActivo.serial}:${controlSeleccionado.indice}`] ?? 0;
  }, [perilla, dispositivoActivo, controlSeleccionado, modosActivos]);

  const handleFijarModos = (modos: ModoPerilla[]) => {
    if (!perilla?.pulsar) return;
    onFijarModosPerilla(perilla.pulsar.id, modos, perilla.pulsar.label || perilla.pulsar.action.type);
  };

  const resumenControles = disposicionActiva ? generarResumenControles(disposicionActiva, t) : '';

  return {
    todosDispositivos,
    dispositivoActivo,
    selectedSerial,
    setSelectedSerial,
    pestanas,
    botonesPagina,
    disposicionActiva,
    selectedHueco,
    setSelectedHueco,
    serialActivo,
    brilloLocal,
    handleBrilloMoving,
    handleBrilloCommit,
    lcds,
    rotacionActual,
    handleCambiarRotacion,
    controlSeleccionado,
    botonSeleccionado,
    hermanosPerilla,
    handleEditarActual,
    handleAplicarPreset,
    perilla,
    modoActivo,
    handleFijarModos,
    resumenControles,
  };
}

