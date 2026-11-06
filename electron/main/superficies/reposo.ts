/**
 * Máquina de estados de reposo/sueño de los docks físicos. Módulo puro: no
 * importa `node-hid` ni `electron`, así se prueba con `npx tsx`.
 */

type EstadoReposoDock = 'despierto' | 'atenuado' | 'dormido';

export interface ConfigReposoDock {
  activo: boolean;
  atenuarTrasMs: number;
  dormirTrasMs: number;
  porcentajeAtenuado: number;
  dormirAlBloquear: boolean;
  despertarSinEjecutar: boolean;
}

export interface CallbacksReposo {
  aplicarBrillo: (serial: string, valor: number) => void;
  ahora?: () => number;
}

const CONFIG_REPOSO_DEFECTO: ConfigReposoDock = {
  activo: true,
  atenuarTrasMs: 0,
  dormirTrasMs: 10 * 60_000,
  porcentajeAtenuado: 15,
  dormirAlBloquear: true,
  despertarSinEjecutar: true,
};

const BRILLO_DEFECTO = 70;

interface Dock {
  estado: EstadoReposoDock;
  brilloUsuario: number;
  ultimaActividad: number;
}

export interface GestorReposo {
  registrarDispositivo: (serial: string, brilloInicial?: number) => void;
  retirarDispositivo: (serial: string) => void;
  fijarBrilloUsuario: (serial: string, valor: number) => void;
  brilloUsuarioDe: (serial: string) => number;
  estadoDe: (serial: string) => EstadoReposoDock;
  registrarActividad: (serial: string) => { consumirEntrada: boolean };
  evaluarInactividad: () => void;
  alBloquearSesion: () => void;
  alDesbloquearSesion: () => void;
  configurar: (parcial: Partial<ConfigReposoDock>) => void;
  limpiar: () => void;
}

function acotar(valor: number): number {
  if (!Number.isFinite(valor)) return BRILLO_DEFECTO;
  return Math.max(0, Math.min(100, Math.round(valor)));
}

export function crearGestorReposo(
  callbacks: CallbacksReposo,
  configInicial: Partial<ConfigReposoDock> = {},
): GestorReposo {
  const ahora = callbacks.ahora ?? Date.now;
  const docks = new Map<string, Dock>();
  let config: ConfigReposoDock = { ...CONFIG_REPOSO_DEFECTO, ...configInicial };
  let sesionBloqueada = false;

  function dormir(serial: string, dock: Dock): void {
    dock.estado = 'dormido';
    callbacks.aplicarBrillo(serial, 0);
  }

  function despertar(serial: string, dock: Dock): void {
    dock.estado = 'despierto';
    dock.ultimaActividad = ahora();
    callbacks.aplicarBrillo(serial, dock.brilloUsuario);
  }

  return {
    registrarDispositivo(serial, brilloInicial) {
      docks.set(serial, {
        estado: 'despierto',
        brilloUsuario: brilloInicial === undefined ? BRILLO_DEFECTO : acotar(brilloInicial),
        ultimaActividad: ahora(),
      });
    },

    retirarDispositivo(serial) {
      docks.delete(serial);
    },

    fijarBrilloUsuario(serial, valor) {
      const dock = docks.get(serial);
      if (!dock) return;
      dock.brilloUsuario = acotar(valor);
      dock.ultimaActividad = ahora();
      dock.estado = 'despierto';
    },

    brilloUsuarioDe(serial) {
      return docks.get(serial)?.brilloUsuario ?? BRILLO_DEFECTO;
    },

    estadoDe(serial) {
      return docks.get(serial)?.estado ?? 'despierto';
    },

    registrarActividad(serial) {
      const dock = docks.get(serial);
      if (!dock) return { consumirEntrada: false };
      const previo = dock.estado;
      dock.ultimaActividad = ahora();
      if (previo === 'despierto') return { consumirEntrada: false };
      despertar(serial, dock);
      return { consumirEntrada: previo === 'dormido' && config.despertarSinEjecutar };
    },

    evaluarInactividad() {
      if (!config.activo || sesionBloqueada) return;
      const t = ahora();
      for (const [serial, dock] of docks) {
        const inactivoMs = t - dock.ultimaActividad;
        if (config.dormirTrasMs > 0 && inactivoMs >= config.dormirTrasMs) {
          if (dock.estado !== 'dormido') dormir(serial, dock);
        } else if (
          config.atenuarTrasMs > 0 &&
          inactivoMs >= config.atenuarTrasMs &&
          dock.estado === 'despierto'
        ) {
          dock.estado = 'atenuado';
          callbacks.aplicarBrillo(serial, Math.min(dock.brilloUsuario, config.porcentajeAtenuado));
        }
      }
    },

    alBloquearSesion() {
      if (!config.dormirAlBloquear) return;
      sesionBloqueada = true;
      for (const [serial, dock] of docks) dormir(serial, dock);
    },

    alDesbloquearSesion() {
      sesionBloqueada = false;
      for (const [serial, dock] of docks) despertar(serial, dock);
    },

    configurar(parcial) {
      config = { ...config, ...parcial };
    },

    limpiar() {
      docks.clear();
      sesionBloqueada = false;
    },
  };
}
