import { tiposDesconocidos } from './configMigration';
import type {
  ButtonConfig, DeckConfig, OrigenInstalacion, PageConfig, PedidoTienda, Profile, ResultadoTienda,
} from '../types';

/**
 * Lo que la ventana principal hace con un pedido de la tienda.
 *
 * La tienda manda el contenido ya descargado; aquí se valida igual que en la
 * galería empotrada (forma de deck o de página + tipos de acción conocidos)
 * y se aplica con las mismas funciones (`appendPagesFromProfile`,
 * `appendPageFromGallery`). La respuesta vuelve por `tienda:resultado` para
 * que la tienda enseñe el error o marque lo instalado.
 */

interface ContextoTienda {
  config: DeckConfig;
  guardar: (siguiente: DeckConfig) => void;
  agregarPaginasDePerfil: (p: Profile) => void;
  agregarPagina: (page: PageConfig, buttons: ButtonConfig[], origen?: OrigenInstalacion) => number;
  t: (k: string, v?: Record<string, string | number>) => string;
}

/** El perfil trae páginas y botones con la forma de un deck. */
function esDeck(p: unknown): p is { pages: unknown[]; buttons: unknown[]; accent?: string; wallpaper?: unknown } {
  const j = p as { pages?: unknown; buttons?: unknown };
  return !!j && Array.isArray(j.pages) && Array.isArray(j.buttons);
}

/** La página suelta trae {page, buttons}. */
function esPaginaSuelta(perfil: unknown): { page: PageConfig; buttons: ButtonConfig[] } | null {
  const j = perfil as { page?: unknown; buttons?: unknown };
  if (!j || typeof j.page !== 'object' || !j.page || !Array.isArray(j.buttons)) return null;
  return { page: j.page as PageConfig, buttons: j.buttons as ButtonConfig[] };
}

function aplicarPerfil(
  pedido: Extract<PedidoTienda, { kind: 'profile' }>, ctx: ContextoTienda,
): ResultadoTienda {
  const { profile, origen, agregarAlDeck } = pedido;
  if (!esDeck(profile)) return { ok: false, error: ctx.t('gal.notADeck') };
  const malos = tiposDesconocidos(profile.buttons);
  if (malos.length > 0) return { ok: false, error: ctx.t('gal.unknownTypes', { tipos: malos.join(', ') }) };
  const p: Profile = {
    id: `gal_${origen?.entryId ?? 'tienda'}_${Date.now()}`,
    name: pedido.label ?? 'TIENDA',
    pages: profile.pages as Profile['pages'],
    buttons: profile.buttons as Profile['buttons'],
    accent: (profile as { accent?: string }).accent ?? ctx.config.accent,
    wallpaper: (profile as { wallpaper?: Profile['wallpaper'] }).wallpaper,
    ...(origen ? { origen } : {}),
  };
  ctx.guardar({ ...ctx.config, profiles: [...(ctx.config.profiles ?? []), p] });
  if (agregarAlDeck) ctx.agregarPaginasDePerfil(p);
  return { ok: true };
}

function aplicarPagina(
  page: unknown, buttons: unknown, origen: OrigenInstalacion | undefined, ctx: ContextoTienda,
): ResultadoTienda {
  const suelta = esPaginaSuelta({ page, buttons });
  if (!suelta) return { ok: false, error: ctx.t('gal.notAPage') };
  const malos = tiposDesconocidos(suelta.buttons);
  if (malos.length > 0) return { ok: false, error: ctx.t('gal.unknownTypes', { tipos: malos.join(', ') }) };
  const limpiados = ctx.agregarPagina(suelta.page, suelta.buttons, origen);
  return { ok: true, limpiados };
}

/** Valida y aplica un pedido de la tienda. Nunca revienta: todo cabe en el resultado. */
export function aplicarPedidoTienda(pedido: PedidoTienda, ctx: ContextoTienda): ResultadoTienda {
  if (!pedido || typeof pedido !== 'object') return { ok: false, error: ctx.t('gal.notADeck') };
  if (pedido.kind === 'page') {
    return aplicarPagina(pedido.page, pedido.buttons, pedido.origen, ctx);
  }
  return aplicarPerfil(pedido, ctx);
}
