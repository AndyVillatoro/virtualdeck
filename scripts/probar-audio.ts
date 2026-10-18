/**
 * Pruebas puras de audio (T-AUD-01 + T-AUD-03 Fase 1): se corren con
 * `npx tsx scripts/probar-audio.ts`, sin app abierta ni hardware.
 *
 * Cubre la resolución de dispositivo (`src/utils/acciones/audio.ts`), el
 * reintento por nombre cuando el id guardado se queda viejo, el estado
 * activo (`botonActivo` en `src/utils/estadoSistema.ts`) y el switch de
 * audio (modos `cycle-all` / `cycle-list`).
 */
import {
  AUDIO,
  buscarDispositivoPorNombre,
  disponiblesDeListaAudio,
  idPredeterminadoAudio,
  mismoDispositivoAudio,
  normalizarNombreAudio,
  ordenarDispositivosAudio,
  siguienteDispositivoAudio,
  sinExcluidosAudio,
} from '../src/utils/acciones/audio.js';
import { botonActivo } from '../src/utils/estadoSistema.js';
import {
  aplicarAspectoAudio,
  heuristicaAudioDispositivo,
  resolverAspectoAudio,
} from '../src/comun/audioIcono.js';

let fallos = 0;
function afirman(cond: boolean, nombre: string, detalle?: unknown): void {
  if (cond) {
    console.log(`  ok: ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO: ${nombre}`, detalle ?? '');
  }
}

const t = (k: string): string => k;

interface FakeApi {
  audio: {
    list: () => Promise<Array<{ id: string; name: string; isDefault: boolean }>>;
    setDefault: (id: string) => Promise<boolean>;
  };
}

function apiFake(
  devices: Array<{ id: string; name: string; isDefault: boolean }>,
  fallaIds: Set<string> = new Set(),
): { api: FakeApi; llamadas: string[] } {
  const llamadas: string[] = [];
  const api: FakeApi = {
    audio: {
      list: () => Promise.resolve(devices),
      setDefault: (id: string) => {
        llamadas.push(id);
        return Promise.resolve(!fallaIds.has(id));
      },
    },
  };
  return { api, llamadas };
}

const DEV_A = { id: '{0.0.0.00000000}.{AAAA}', name: 'Altavoces (Realtek)', isDefault: false };
const DEV_B = { id: '{0.0.0.00000000}.{BBBB}', name: 'Auriculares (Arctis)', isDefault: true };

async function main(): Promise<void> {
  console.log('normalizarNombreAudio:');
  afirman(normalizarNombreAudio('  Auriculares (Arctis) ') === 'auriculares (arctis)', 'recorta y minúsculas');
  afirman(normalizarNombreAudio(undefined) === '', 'undefined es cadena vacía');
  afirman(normalizarNombreAudio(null) === '', 'null es cadena vacía');

  console.log('buscarDispositivoPorNombre:');
  afirman(buscarDispositivoPorNombre([DEV_A, DEV_B], 'auriculares (arctis)') === DEV_B, 'exacto sin caja');
  afirman(buscarDispositivoPorNombre([DEV_A, DEV_B], '  Auriculares ') === DEV_B, 'parcial recortado');
  afirman(buscarDispositivoPorNombre([DEV_A, DEV_B], 'altavoces') === DEV_A, 'parcial al primero');
  afirman(buscarDispositivoPorNombre([DEV_A, DEV_B], 'inexistente') === undefined, 'sin coincidencia');
  afirman(buscarDispositivoPorNombre([DEV_A, DEV_B], '') === undefined, 'nombre vacío');
  afirman(buscarDispositivoPorNombre([], 'altavoces') === undefined, 'lista vacía');

  console.log('mismoDispositivoAudio:');
  afirman(mismoDispositivoAudio('{0.0.0.00000000}.{AAAA}', '{0.0.0.00000000}.{aaaa}'), 'ignora caja');
  afirman(mismoDispositivoAudio('  {X} ', '{x}') === true, 'ignora espacios');
  afirman(!mismoDispositivoAudio('{A}', '{B}'), 'distintos');
  afirman(!mismoDispositivoAudio('', '{B}'), 'vacío nunca coincide');
  afirman(!mismoDispositivoAudio(undefined, undefined), 'undefined nunca coincide');

  console.log('manejador audio-device:');
  {
    // Id fresco: un solo setDefault, sin listar.
    let listo = false;
    const { api, llamadas } = apiFake([DEV_A, DEV_B]);
    const apiEspia: FakeApi = { audio: { list: () => { listo = true; return api.audio.list(); }, setDefault: api.audio.setDefault } };
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', deviceId: DEV_A.id, deviceName: DEV_A.name }, api: apiEspia, t });
    afirman(r.ok && llamadas.length === 1 && llamadas[0] === DEV_A.id && !listo, 'id fresco va directo', llamadas);
  }
  {
    // Id viejo (USB reconectado) + nombre de respaldo: reintenta por nombre.
    const { api, llamadas } = apiFake([DEV_A, DEV_B], new Set(['{0.0.0.00000000}.{VIEJO}']));
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', deviceId: '{0.0.0.00000000}.{VIEJO}', deviceName: DEV_B.name }, api, t });
    afirman(r.ok && llamadas.length === 2 && llamadas[1] === DEV_B.id, 'id viejo reintenta por nombre', llamadas);
  }
  {
    // Id viejo sin nombre que resuelva: falla sin reintento inútil.
    const { api, llamadas } = apiFake([DEV_A, DEV_B], new Set(['{0.0.0.00000000}.{VIEJO}']));
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', deviceId: '{0.0.0.00000000}.{VIEJO}', deviceName: 'Otro' }, api, t });
    afirman(!r.ok && llamadas.length === 1, 'sin respaldo no reintenta', llamadas);
  }
  {
    // Solo nombre (config vieja o escrita a mano).
    const { api, llamadas } = apiFake([DEV_A, DEV_B]);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', deviceName: 'auriculares' }, api, t });
    afirman(r.ok && llamadas.length === 1 && llamadas[0] === DEV_B.id, 'solo nombre resuelve parcial', llamadas);
  }
  {
    // Nombre desconocido.
    const { api, llamadas } = apiFake([DEV_A, DEV_B]);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', deviceName: 'Bocina BT' }, api, t });
    afirman(!r.ok && llamadas.length === 0, 'nombre desconocido no llama a setDefault');
  }
  {
    // Sin nada.
    const { api, llamadas } = apiFake([DEV_A, DEV_B]);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device' }, api, t });
    afirman(!r.ok && llamadas.length === 0, 'sin id ni nombre falla');
  }

  console.log('botonActivo:');
  const estadoB = { rgbStatus: null, activeAudioDeviceId: DEV_B.id, runningProcesses: new Set<string>() };
  const btn = (action: { type: 'audio-device'; deviceId?: string; deviceName?: string }) => ({ id: 'b1', page: 0, label: 'x', action });
  afirman(botonActivo(btn({ type: 'audio-device', deviceId: DEV_B.id }), estadoB), 'marca el dispositivo activo');
  afirman(!botonActivo(btn({ type: 'audio-device', deviceId: DEV_A.id }), estadoB), 'desmarca el anterior');
  afirman(botonActivo(btn({ type: 'audio-device', deviceId: DEV_B.id.toUpperCase() }), estadoB), 'activo sin distinguir caja');
  afirman(!botonActivo(btn({ type: 'audio-device', deviceName: DEV_B.name }), estadoB), 'solo nombre no marca (sin id)');

  console.log('orden y ciclo (T-AUD-03, Fase 1):');
  const desorden = [
    { id: '{3}', name: 'USB DAC' },
    { id: '{1}', name: 'altavoces' },
    { id: '{2}', name: 'Cascos' },
  ];
  afirman(ordenarDispositivosAudio(desorden).map((d) => d.name).join('|') === 'altavoces|Cascos|USB DAC', 'ordena por nombre', ordenarDispositivosAudio(desorden).map((d) => d.name));
  afirman(sinExcluidosAudio(desorden, undefined).length === 3, 'sin excluidos no quita');
  afirman(sinExcluidosAudio(desorden, ['{3}']).length === 2, 'excluye por id sin caja', sinExcluidosAudio(desorden, ['{3}']).map((d) => d.id));
  afirman(sinExcluidosAudio(desorden, ['usb dac']).length === 2, 'excluye por nombre', sinExcluidosAudio(desorden, ['usb dac']).map((d) => d.name));
  afirman(sinExcluidosAudio(desorden, ['  ']).length === 3, 'excluida vacía no quita');
  const ordenados = ordenarDispositivosAudio(desorden);
  afirman(siguienteDispositivoAudio(ordenados, '{1}')?.id === '{2}', 'siguiente al actual');
  afirman(siguienteDispositivoAudio(ordenados, '{3}')?.id === '{1}', 'envuelve al final');
  afirman(siguienteDispositivoAudio(ordenados, '{desconocido}')?.id === '{1}', 'actual fuera empieza por el primero');
  afirman(siguienteDispositivoAudio([], '{1}') === undefined, 'sin candidatos no hay siguiente');
  const conDefecto = [
    { ...DEV_A, isDefault: false },
    { ...DEV_B, isDefault: true },
  ];
  afirman(idPredeterminadoAudio(conDefecto) === DEV_B.id, 'lee el predeterminado de la lista');
  afirman(idPredeterminadoAudio([{ ...DEV_A, isDefault: false }]) === null, 'sin predeterminado es null');
  const lista = [
    { deviceId: DEV_B.id, deviceName: DEV_B.name },
    { deviceId: '{VIEJO}', deviceName: DEV_A.name },
    { deviceId: '{AUSENTE}', deviceName: 'Desconectado' },
  ];
  const disponibles = disponiblesDeListaAudio(lista, [DEV_A, DEV_B]);
  afirman(disponibles.map((d) => d.id).join('|') === `${DEV_B.id}|${DEV_A.id}`, 'lista en su orden, por id y por nombre', disponibles.map((d) => d.id));
  afirman(disponiblesDeListaAudio(undefined, [DEV_A, DEV_B]).length === 0, 'sin lista no hay disponibles');
  afirman(disponiblesDeListaAudio([], [DEV_A, DEV_B]).length === 0, 'lista vacía no hay disponibles');

  console.log('manejador audio-device en ciclo:');
  {
    // cycle-all desde B (predeterminado): en orden alfabético
    // 'Altavoces (Realtek)' < 'Auriculares (Arctis)', así que toca A.
    const { api, llamadas } = apiFake(conDefecto);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', audioMode: 'cycle-all' }, api, t });
    afirman(r.ok && llamadas.length === 1 && llamadas[0] === DEV_A.id, 'cycle-all pasa al siguiente', llamadas);
    afirman(r.detalle?.texto === DEV_A.name, 'cycle-all devuelve el nombre para el aviso', r.detalle);
  }
  {
    // cycle-all con una excluida: de A (predeterminado), saltando B, toca C.
    const tres = [
      { id: '{0.0.0.00000000}.{AAAA}', name: 'Altavoces (Realtek)', isDefault: true },
      { id: '{0.0.0.00000000}.{BBBB}', name: 'Auriculares (Arctis)', isDefault: false },
      { id: '{0.0.0.00000000}.{CCCC}', name: 'USB DAC', isDefault: false },
    ];
    const { api, llamadas } = apiFake(tres);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', audioMode: 'cycle-all', excludedDeviceIds: [tres[1].id] }, api, t });
    afirman(r.ok && llamadas.length === 1 && llamadas[0] === tres[2].id, 'cycle-all salta excluidas', llamadas);
  }
  {
    // cycle-all con un solo dispositivo: aviso claro, sin llamar.
    const { api, llamadas } = apiFake([{ ...DEV_A, isDefault: true }]);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', audioMode: 'cycle-all' }, api, t });
    afirman(!r.ok && llamadas.length === 0, 'una sola salida no rota');
  }
  {
    // cycle-all sin salidas: aviso claro.
    const { api, llamadas } = apiFake([]);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', audioMode: 'cycle-all' }, api, t });
    afirman(!r.ok && llamadas.length === 0, 'sin salidas no rota');
  }
  {
    // cycle-list en su orden: lista [C, A, B] con A predeterminado → toca B.
    const tres = [
      { id: '{0.0.0.00000000}.{AAAA}', name: 'Altavoces (Realtek)', isDefault: true },
      { id: '{0.0.0.00000000}.{BBBB}', name: 'Auriculares (Arctis)', isDefault: false },
      { id: '{0.0.0.00000000}.{CCCC}', name: 'USB DAC', isDefault: false },
    ];
    const { api, llamadas } = apiFake(tres);
    const r = await AUDIO['audio-device']({
      action: {
        type: 'audio-device', audioMode: 'cycle-list',
        audioCandidates: [
          { deviceId: tres[2].id, deviceName: tres[2].name },
          { deviceId: tres[0].id, deviceName: tres[0].name },
          { deviceId: tres[1].id, deviceName: tres[1].name },
        ],
      }, api, t,
    });
    afirman(r.ok && llamadas.length === 1 && llamadas[0] === tres[1].id, 'cycle-list sigue el orden de la lista', llamadas);
  }
  {
    // cycle-list salta la desconectada: solo queda A.
    const { api, llamadas } = apiFake(conDefecto);
    const r = await AUDIO['audio-device']({
      action: {
        type: 'audio-device', audioMode: 'cycle-list',
        audioCandidates: [
          { deviceId: DEV_A.id, deviceName: DEV_A.name },
          { deviceId: '{AUSENTE}', deviceName: 'Desconectado' },
        ],
      }, api, t,
    });
    afirman(!r.ok && llamadas.length === 0, 'lista con una conectada no rota');
  }
  {
    // cycle-list sin candidatas: aviso claro.
    const { api, llamadas } = apiFake(conDefecto);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', audioMode: 'cycle-list' }, api, t });
    afirman(!r.ok && llamadas.length === 0, 'lista vacía no rota');
  }
  {
    // El modo fijo también devuelve el nombre para el aviso de la tecla.
    const { api } = apiFake([DEV_A, DEV_B]);
    const r = await AUDIO['audio-device']({ action: { type: 'audio-device', deviceId: DEV_A.id, deviceName: DEV_A.name }, api, t });
    afirman(r.ok && r.detalle?.texto === DEV_A.name, 'fijo devuelve el nombre para el aviso', r.detalle);
  }

  console.log('heurística y aspecto reactivo (T-AUD-03, Fase 2):');
  afirman(heuristicaAudioDispositivo('Auriculares (Arctis Nova Pro)').corto === 'CASCO', 'cascos por nombre');
  afirman(heuristicaAudioDispositivo('auriculares con micro').glifo === 'AUDIO_WAVE', 'cascos en español');
  afirman(heuristicaAudioDispositivo('LG UltraGear HDMI').corto === 'MONIT', 'monitor por nombre');
  afirman(heuristicaAudioDispositivo('USB DAC Scarlett').corto === 'USB', 'usb por nombre');
  afirman(heuristicaAudioDispositivo('Altavoces (Realtek)').corto === 'ALTAV', 'altavoces por defecto');
  afirman(heuristicaAudioDispositivo('Realtek HD Audio').glifo === 'SPEAKER', 'genérico a altavoz');
  {
    // fixed: aspecto solo cuando su salida es la activa.
    const aspecto = resolverAspectoAudio(
      { type: 'audio-device', deviceId: DEV_A.id, deviceName: DEV_A.name }, DEV_A.id, DEV_A.name);
    afirman(aspecto?.sublabel === 'ALTAV' && aspecto?.icon === 'SPEAKER', 'fijo activo da icono y corto', aspecto);
    afirman(resolverAspectoAudio(
      { type: 'audio-device', deviceId: DEV_A.id, deviceName: DEV_A.name }, DEV_B.id, DEV_B.name) === null,
      'fijo inactivo no da aspecto');
  }
  {
    // cycle-list: manda el candidato activo con su etiqueta e icono propios.
    const action = {
      type: 'audio-device' as const, audioMode: 'cycle-list' as const,
      audioCandidates: [
        { deviceId: DEV_A.id, deviceName: DEV_A.name },
        { deviceId: DEV_B.id, deviceName: DEV_B.name, label: 'CASQUITOS', icon: 'MIC' },
      ],
    };
    const aspecto = resolverAspectoAudio(action, DEV_B.id);
    afirman(aspecto?.sublabel === 'CASQUITOS' && aspecto?.icon === 'MIC', 'lista respeta etiqueta e icono', aspecto);
    afirman(resolverAspectoAudio(action, '{AUSENTE}') === null, 'lista sin la activa no da aspecto');
  }
  {
    // cycle-all: con nombre resuelve; sin nombre no hay heurística.
    const action = { type: 'audio-device' as const, audioMode: 'cycle-all' as const };
    afirman(resolverAspectoAudio(action, DEV_B.id, DEV_B.name)?.sublabel === 'CASCO', 'todo con nombre resuelve');
    afirman(resolverAspectoAudio(action, DEV_B.id) === null, 'todo sin nombre no resuelve');
    afirman(resolverAspectoAudio({ type: 'mute' }, DEV_B.id, DEV_B.name) === null, 'no-audio no da aspecto');
  }
  {
    // aplicarAspectoAudio: lo explícito manda; el ciclo hereda pulso 'onda'.
    const base = { id: 'b1', page: 0, label: 'x', action: { type: 'audio-device' as const, audioMode: 'cycle-all' as const } };
    const conOnda = aplicarAspectoAudio(base, null);
    afirman(conOnda.efectoPulsar === 'onda', 'ciclo sin aspecto hereda onda');
    const conSub = aplicarAspectoAudio(
      { ...base, sublabel: 'Mío', icon: 'PLAY' }, { icon: 'SPEAKER', sublabel: 'ALTAV' });
    afirman(conSub.sublabel === 'Mío' && conSub.icon === 'PLAY', 'lo explícito no se pisa', conSub);
    const sinSub = aplicarAspectoAudio({ ...base }, { icon: 'SPEAKER', sublabel: 'ALTAV' });
    afirman(sinSub.sublabel === 'ALTAV' && sinSub.icon === 'SPEAKER', 'rellena lo que falta', sinSub);
    const fijo = aplicarAspectoAudio(
      { id: 'b1', page: 0, label: 'x', action: { type: 'audio-device' as const } }, null);
    afirman(!('efectoPulsar' in fijo), 'fijo sin aspecto no cambia');
  }

  if (fallos > 0) {
    console.error(`${fallos} prueba(s) fallaron`);
    process.exitCode = 1;
  } else {
    console.log('todas las pruebas de audio en verde');
  }
}

void main();
