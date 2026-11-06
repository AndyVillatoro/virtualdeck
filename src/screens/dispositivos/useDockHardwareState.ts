import { useCallback, useEffect, useMemo, useState } from 'react';
import { controlDeHueco, huecosDeControl, teclasLcd, type GestoHueco } from '../../utils/superficies/disposicion';
import { rotacionDeSuperficie } from '../../utils/superficies/ajustesSuperficie';
import { generarResumenControles } from './BarraHardwareActivo';
import { botonesResueltos } from '../../utils/botonesFijos';
import { construirHuecosSoltarPlugin, type CargaArrastrePlugin } from '../../utils/plugins/arrastrePlugin';
import {
  brilloDePagina,
  idsDelControl,
  obtenerDisposicionActiva,
  obtenerTodosDispositivos,
  usePaginaDispositivo,
} from './logicaDispositivos';
import type { BotonConCatalogo } from './TeclaLcdHardware';
import type { DeckConfig, ModoPerilla, ButtonConfig } from '../../types';
import type { PresetHueco } from '../../data/presetsDock';
import { huecosDePerfil, type PerfilDock } from '../../data/perfilesDock';
import type { ControlFisico, DisposicionSuperficie, InfoSuperficie } from '../../types/superficies';

interface HermanoControl {
  gesto: 'izq' | 'pulsar' | 'der';
  hueco: number | undefined;
  boton: ButtonConfig | undefined;
  esActual: boolean;
}

function hermanosDeTira(
  disposicionActiva: DisposicionSuperficie,
  controlSeleccionado: { indice: number; gesto?: GestoHueco },
  botonesPagina: ButtonConfig[],
): HermanoControl[] {
  const ctrl = disposicionActiva.controles.find(
    (c) => c.tipo === 'swipe' && c.indice === controlSeleccionado.indice,
  );
  if (!ctrl) return [];
  const huecos = huecosDeControl(disposicionActiva, ctrl);
  const gestos: Array<'izq' | 'der'> = ['izq', 'der'];
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
}

function fusionarHuecoEnBoton(base: ButtonConfig, preset: PresetHueco): BotonConCatalogo {
  return {
    id: base.id,
    page: base.page,
    label: preset.label,
    icon: preset.icon,
    bgColor: preset.bgColor,
    fgColor: preset.fgColor,
    action: preset.action,
    ...(preset.isToggle ? { isToggle: true } : {}),
    ...(preset.actionToggleOff ? { actionToggleOff: preset.actionToggleOff } : {}),
    ...(preset.fijo ? { fijo: true } : {}),
    ...(preset.modosPerilla ? { modosPerilla: preset.modosPerilla } : {}),
    ...(preset.iconoCatalogo ? { iconoCatalogo: preset.iconoCatalogo } : {}),
  };
}

interface UseDockHardwareStateProps {
  config: DeckConfig;
  superficies: InfoSuperficie[];
  modelos: Record<string, DisposicionSuperficie>;
  paginasActivas: Record<string, string>;
  modosActivos: Record<string, number>;
  t: (k: string, p?: Record<string, string | number>) => string;
  onBrilloVivo: (serial: string, valor: number) => void;
  onBrillo: (serial: string, valor: number) => void;
  onRotacion: (serial: string, grados: number) => void;
  onActivarPagina: (serial: string, paginaId: string) => void;
  onEditarBoton: (id: string) => void;
  onRellenarHuecos: (ids: string[], contenidos: PresetHueco[], nombre: string) => void;
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

  const botonesPaginaBase = useMemo(() => {
    if (indicePagina < 0) return [];
    return botonesResueltos(config, indicePagina);
  }, [config, indicePagina]);

  const disposicionActiva = useMemo(() => {
    return obtenerDisposicionActiva(dispositivoActivo, superficies, paginaConfig, modelos);
  }, [dispositivoActivo, superficies, paginaConfig, modelos]);

  const [selectedHueco, setSelectedHueco] = useState<number | null>(null);
  const [previaEntrada, setPreviaEntrada] = useState<PresetHueco[] | PerfilDock | null>(null);

  useEffect(() => {
    setSelectedHueco(null);
    setPreviaEntrada(null);
  }, [paginaEditadaId]);

  useEffect(() => {
    setPreviaEntrada(null);
  }, [selectedHueco]);

  const controlSeleccionado = useMemo(() => {
    if (selectedHueco === null || !disposicionActiva) return null;
    return controlDeHueco(disposicionActiva, selectedHueco);
  }, [selectedHueco, disposicionActiva]);

  const { botonesPagina, huecosEnPrevia } = useMemo(() => {
    const enPrevia = new Set<number>();
    if (!previaEntrada || !disposicionActiva || botonesPaginaBase.length === 0) {
      return { botonesPagina: botonesPaginaBase as BotonConCatalogo[], huecosEnPrevia: enPrevia };
    }
    if (!Array.isArray(previaEntrada)) {
      const huecosPerfil = huecosDePerfil(previaEntrada, disposicionActiva);
      if (!huecosPerfil || huecosPerfil.length !== botonesPaginaBase.length) {
        return { botonesPagina: botonesPaginaBase as BotonConCatalogo[], huecosEnPrevia: enPrevia };
      }
      const vista = botonesPaginaBase.map((b, idx) => {
        enPrevia.add(idx);
        return fusionarHuecoEnBoton(b, huecosPerfil[idx]);
      });
      return { botonesPagina: vista, huecosEnPrevia: enPrevia };
    }
    if (!controlSeleccionado) {
      return { botonesPagina: botonesPaginaBase as BotonConCatalogo[], huecosEnPrevia: enPrevia };
    }
    const ctrl = disposicionActiva.controles.find(
      (c) => c.tipo === controlSeleccionado.control && c.indice === controlSeleccionado.indice,
    );
    if (!ctrl) {
      return { botonesPagina: botonesPaginaBase as BotonConCatalogo[], huecosEnPrevia: enPrevia };
    }
    const huecosCtrl = huecosDeControl(disposicionActiva, ctrl);
    if (huecosCtrl.length !== previaEntrada.length) {
      return { botonesPagina: botonesPaginaBase as BotonConCatalogo[], huecosEnPrevia: enPrevia };
    }
    const porHueco = new Map<number, PresetHueco>();
    huecosCtrl.forEach((h, i) => {
      porHueco.set(h, previaEntrada[i]);
      enPrevia.add(h);
    });
    const vista = botonesPaginaBase.map((b, idx) => {
      const p = porHueco.get(idx);
      return p ? fusionarHuecoEnBoton(b, p) : b;
    });
    return { botonesPagina: vista, huecosEnPrevia: enPrevia };
  }, [previaEntrada, disposicionActiva, botonesPaginaBase, controlSeleccionado]);

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

  const botonSeleccionado = selectedHueco !== null ? botonesPagina[selectedHueco] : undefined;

  const hermanosPerilla = useMemo(() => {
    if (!disposicionActiva || !controlSeleccionado) {
      return [];
    }
    if (controlSeleccionado.control === 'swipe') {
      return hermanosDeTira(disposicionActiva, controlSeleccionado, botonesPagina);
    }
    if (controlSeleccionado.control !== 'knob') {
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

  const aplicarPerfilPagina = (perfil: PerfilDock) => {
    if (!disposicionActiva || indicePagina < 0) return;
    const huecos = huecosDePerfil(perfil, disposicionActiva);
    if (!huecos) return;
    const ids = config.buttons.filter((b) => b.page === indicePagina).map((b) => b.id);
    if (ids.length !== huecos.length) return;
    setPreviaEntrada(null);
    onRellenarHuecos(ids, huecos, t(perfil.nombre));
  };

  const handleAplicarPreset = (entrada: PresetHueco[] | PerfilDock) => {
    setPreviaEntrada(null);
    if (!Array.isArray(entrada)) {
      aplicarPerfilPagina(entrada);
      return;
    }
    const ids = idsDelControl(disposicionActiva, controlSeleccionado, botonesPaginaBase);
    if (ids.length === entrada.length) onRellenarHuecos(ids, entrada, entrada.map((h) => h.label).join(' / '));
  };

  const handlePrevisualizarPreset = useCallback((entrada: PresetHueco[] | PerfilDock | null) => {
    setPreviaEntrada(entrada);
  }, []);

  const handleSoltarPluginControl = useCallback((
    control: ControlFisico,
    indiceHuecoEnControl: number,
    carga: CargaArrastrePlugin,
    enEjeCentral?: boolean,
  ) => {
    if (!disposicionActiva || botonesPaginaBase.length === 0) return;
    const huecos = huecosDeControl(disposicionActiva, control);
    if (huecos.length === 0) return;
    const huecoDestino = huecos[indiceHuecoEnControl] ?? huecos[0];
    setSelectedHueco(huecoDestino);
    const ids = huecos.flatMap((h) => (botonesPaginaBase[h] ? [botonesPaginaBase[h].id] : []));
    if (ids.length !== huecos.length) return;
    const botonesControl = huecos.map((h) => botonesPaginaBase[h]);
    const aplicarATodos = Boolean(control.tipo === 'knob' && enEjeCentral && carga.esEncoder);
    const contenidos = construirHuecosSoltarPlugin(
      botonesControl,
      indiceHuecoEnControl,
      carga,
      aplicarATodos,
    );
    onRellenarHuecos(ids, contenidos, carga.nombre);
  }, [disposicionActiva, botonesPaginaBase, onRellenarHuecos]);

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
    huecosEnPrevia,
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
    handlePrevisualizarPreset,
    handleSoltarPluginControl,
    perilla,
    modoActivo,
    handleFijarModos,
    resumenControles,
  };
}
