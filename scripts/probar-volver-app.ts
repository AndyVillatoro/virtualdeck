/**
 * Pruebas puras de la tecla automática «VOLVER» (roadmap 86): se corren con
 * `npx tsx scripts/probar-volver-app.ts`, sin app abierta ni hardware.
 *
 * Cubre `aplicarBotonVolverApp` (`src/utils/useDeck/volverApp.ts`): colocarla
 * al vincular una página a una app, respetar las teclas con pantalla de un
 * dock, no duplicar ni pisar `page-nav` del usuario, no tocar una página llena
 * y retirarla al desvincular.
 */
import { aplicarBotonVolverApp, esBotonVolverApp } from '../src/utils/useDeck/volverApp.js';
import type { ButtonConfig } from '../src/types/index.js';

let fallos = 0;
function afirman(cond: boolean, nombre: string, detalle?: unknown): void {
  if (cond) {
    console.log(`  ok: ${nombre}`);
  } else {
    fallos++;
    console.error(`  FALLO: ${nombre}`, detalle ?? '');
  }
}

/** Bits de mentira: el helper no interpreta el base64, solo lo copia. */
const BITS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const BITS_NUEVOS = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=';

function boton(page: number, slot: number, extra: Partial<ButtonConfig> = {}): ButtonConfig {
  return { id: `b${page}_${slot}`, page, label: '', icon: '', action: { type: 'none' }, ...extra };
}

function rejilla4x4(page: number): ButtonConfig[] {
  return Array.from({ length: 16 }, (_, slot) => boton(page, slot));
}

function dePagina(buttons: ButtonConfig[], page: number): ButtonConfig[] {
  return buttons.filter((b) => b.page === page);
}

function volverDe(buttons: ButtonConfig[], page: number): ButtonConfig | undefined {
  return dePagina(buttons, page).find(esBotonVolverApp);
}

function main(): void {
  console.log('vincular con huecos libres:');
  {
    const pagina = rejilla4x4(0);
    const res = aplicarBotonVolverApp(pagina, 0, 'code', BITS);
    const volver = volverDe(res, 0);
    afirman(volver?.action.type === 'page-nav' && volver?.action.pageNav === 'first', 'la tecla navega a la primera página', volver?.action);
    afirman(volver?.label === 'VOLVER' && volver?.icon === 'ARROW_LEFT', 'rótulo VOLVER y glifo de flecha', volver);
    afirman(volver?.iconoPuntos?.bits === BITS && volver?.iconoPuntos?.origen === 'app:code', 'icono de la app y origen app:code', volver?.iconoPuntos);
    afirman(volver?.id === 'b0_15', 'ocupa el último hueco vacío', volver?.id);
    afirman(res.length === pagina.length, 'no añade ni quita botones');
    afirman(dePagina(res, 0).filter((b) => b.action.type === 'page-nav').length === 1, 'una sola tecla de navegación');
  }

  console.log('sin icono del núcleo:');
  {
    const primera = aplicarBotonVolverApp(rejilla4x4(0), 0, 'code');
    const sinIcono = volverDe(primera, 0);
    afirman(sinIcono?.icon === 'ARROW_LEFT' && sinIcono?.iconoPuntos === undefined, 'se crea con el glifo de respaldo', sinIcono);
    afirman(!!sinIcono && esBotonVolverApp(sinIcono), 'se reconoce como automática sin icono');
    const conIcono = aplicarBotonVolverApp(primera, 0, 'code', BITS);
    const actualizada = volverDe(conIcono, 0);
    afirman(actualizada?.iconoPuntos?.bits === BITS && actualizada?.iconoPuntos?.origen === 'app:code', 'el icono que llega después se copia', actualizada?.iconoPuntos);
    afirman(dePagina(conIcono, 0).filter((b) => b.action.type === 'page-nav').length === 1, 'no duplica al actualizar el icono');
    const otraApp = aplicarBotonVolverApp(conIcono, 0, 'spotify', BITS_NUEVOS);
    afirman(volverDe(otraApp, 0)?.iconoPuntos?.origen === 'app:spotify', 'cambiar de app actualiza el origen del icono');
  }

  console.log('dock con teclas con pantalla:');
  {
    // 6 teclas con LCD + 3 perillas de 3 huecos = 15 huecos; las perillas van
    // detrás en el orden de `controles`.
    const dock = [
      ...Array.from({ length: 6 }, (_, slot) => boton(1, slot)),
      ...Array.from({ length: 9 }, (_, slot) => boton(1, 6 + slot)),
    ];
    const res = aplicarBotonVolverApp(dock, 1, 'code', BITS, 6);
    afirman(volverDe(res, 1)?.id === 'b1_5', 'elige el último hueco de las teclas, no una perilla', volverDe(res, 1)?.id);
    const perillas = dePagina(res, 1).filter((b) => Number(b.id.split('_')[1]) >= 6);
    afirman(perillas.every((b) => b.action.type === 'none'), 'las perillas siguen vacías');

    // Si las 6 teclas están ocupadas, cae al último hueco de toda la página.
    const teclasOcupadas = dock.map((b, i) => i < 6
      ? { ...b, label: 'T', action: { type: 'hotkey' as const, hotkey: 'F1' } }
      : b);
    const respaldo = aplicarBotonVolverApp(teclasOcupadas, 1, 'code', BITS, 6);
    afirman(volverDe(respaldo, 1)?.id === 'b1_14', 'sin hueco en las teclas cae al último de la página', volverDe(respaldo, 1)?.id);
  }

  console.log('page-nav que ya estaba:');
  {
    const conNav = rejilla4x4(0).map((b, i) => (i === 3
      ? { ...b, label: 'SIG', action: { type: 'page-nav' as const, pageNav: 'next' as const } }
      : b));
    const res = aplicarBotonVolverApp(conNav, 0, 'code', BITS);
    const navs = dePagina(res, 0).filter((b) => b.action.type === 'page-nav');
    afirman(navs.length === 1, 'no añade un segundo page-nav', navs.length);
    afirman(navs[0]?.id === 'b0_3' && navs[0]?.action.type === 'page-nav' && navs[0]?.action.pageNav === 'next', 'el page-nav del usuario sigue a lo suyo');
    afirman(navs[0]?.iconoPuntos?.origen === 'app:code', 'al page-nav sin icono se le pone el de la app');
  }
  {
    const conNavPropio = rejilla4x4(0).map((b, i) => (i === 2
      ? {
          ...b,
          label: 'ATRÁS',
          action: { type: 'page-nav' as const, pageNav: 'first' as const },
          iconoPuntos: { bits: 'PROPIO', origen: 'acciones:arrow-left' },
        }
      : b));
    const res = aplicarBotonVolverApp(conNavPropio, 0, 'code', BITS);
    const nav = dePagina(res, 0).find((b) => b.action.type === 'page-nav');
    afirman(nav?.iconoPuntos?.origen === 'acciones:arrow-left', 'un page-nav con icono propio no se toca', nav?.iconoPuntos);
    afirman(dePagina(res, 0).filter((b) => b.action.type === 'page-nav').length === 1, 'tampoco se duplica');
  }

  console.log('página llena:');
  {
    const llenos = rejilla4x4(0).map((b, i) => ({
      ...b,
      label: `B${i}`,
      action: { type: 'hotkey' as const, hotkey: 'F1' },
    }));
    const res = aplicarBotonVolverApp(llenos, 0, 'code', BITS);
    afirman(res === llenos, 'devuelve el mismo array: no pisa nada');
    afirman(res.every((b, i) => b.action.type === 'hotkey' && b.label === `B${i}`), 'ningún botón del usuario cambia');
  }

  console.log('desvincular:');
  {
    const conUsuario = rejilla4x4(0).map((b, i) => (i === 0
      ? { ...b, label: 'MÍA', icon: 'PLAY', action: { type: 'hotkey' as const, hotkey: 'F1' } }
      : b));
    const vinculada = aplicarBotonVolverApp(conUsuario, 0, 'code', BITS);
    const volver = volverDe(vinculada, 0);
    const res = aplicarBotonVolverApp(vinculada, 0, '');
    const limpio = res.find((b) => b.id === volver?.id);
    afirman(limpio?.action.type === 'none', 'la tecla vuelve a quedar vacía', limpio?.action);
    afirman(limpio?.label === '' && limpio?.icon === '' && limpio?.iconoPuntos === undefined, 'sin rótulo, glifo ni puntos');
    afirman(res.find((b) => b.id === 'b0_0')?.label === 'MÍA', 'el botón del usuario no se toca');
    afirman(dePagina(res, 0).filter(esBotonVolverApp).length === 0, 'no queda ninguna tecla automática');

    const conNavUsuario = rejilla4x4(0).map((b, i) => (i === 4
      ? { ...b, label: 'SIG', action: { type: 'page-nav' as const, pageNav: 'next' as const } }
      : b));
    const sinVinculo = aplicarBotonVolverApp(conNavUsuario, 0, '');
    afirman(dePagina(sinVinculo, 0).some((b) => b.id === 'b0_4' && b.action.type === 'page-nav'), 'un page-nav del usuario sobrevive al desvincular');
  }

  console.log('otras páginas:');
  {
    const dosPaginas = [...rejilla4x4(0), ...rejilla4x4(1)];
    const res = aplicarBotonVolverApp(dosPaginas, 1, 'code', BITS);
    afirman(volverDe(res, 0) === undefined, 'la página 0 no recibe tecla');
    afirman(dePagina(res, 0).every((b, i) => b === dePagina(dosPaginas, 0)[i]), 'los botones de la página 0 son los mismos objetos');
  }

  if (fallos > 0) {
    console.error(`${fallos} prueba(s) fallaron`);
    process.exitCode = 1;
  } else {
    console.log('todas las pruebas de la tecla VOLVER en verde');
  }
}

main();
