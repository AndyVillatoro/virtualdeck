import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../utils/i18n';
import type { CatalogoDot, IndiceDot, NombreCatalogo } from '../../data/iconosDot/tipos';
import { CAT_ACCIONES } from './constantesCatalogo';
import type { SeccionCatalogo } from './constantesCatalogo';
import {
  GRUPO_GLIFOS,
  GRUPO_RECIENTES,
  GRUPO_SIMPLE,
  GRUPO_TABLER,
  GRUPO_TODAS,
  coincideBusqueda,
  construirItems,
  construirMapaAlias,
  contarGrupos,
  grupoInicial,
  indexarIndice,
  perteneceAGrupo,
  resolverRecientes,
  type ItemCatalogo,
} from './catalogo/grupos';
import { guardarReciente, leerRecientes } from './catalogo/recientes';

export const ITEMS_POR_PAGINA = 72;
export const MAX_RESULTADOS_BUSQUEDA = 300;

export type { ItemCatalogo } from './catalogo/grupos';

export function useSelectorIconosDot(
  catalogoInicial: SeccionCatalogo = CAT_ACCIONES,
  origenActual?: string,
) {
  const [indice, setIndice] = useState<IndiceDot | null>(null);
  const [catalogos, setCatalogos] = useState<Partial<Record<NombreCatalogo, CatalogoDot>>>({});
  const [fallidos, setFallidos] = useState<Set<NombreCatalogo>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [grupoElegido, setGrupoElegido] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [hovered, setHovered] = useState<ItemCatalogo | null>(null);
  const [recientes, setRecientes] = useState<string[]>(leerRecientes);
  // La escritura va en el manejador, no dentro del actualizador de estado: al
  // elegir, el modal se desmonta en el mismo clic y React puede descartar el
  // actualizador sin ejecutarlo (y con él, el `localStorage.setItem`).
  const recientesRef = useRef(recientes);

  useEffect(() => {
    let cancelado = false;
    import('../../data/iconosDot')
      .then((m) => m.cargarIndice())
      .then((idx) => {
        if (!cancelado) setIndice(idx);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, []);

  // El buscador es global: al escribir se suelta el grupo elegido y se enseña
  // "TODAS" con el recuento por grupo en la barra lateral.
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaAplicada(busqueda);
      setPagina(1);
      setGrupoElegido(null);
    }, 150);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const mapas = useMemo(() => indexarIndice(indice), [indice]);
  const items = useMemo(() => (indice ? construirItems(indice) : []), [indice]);
  // Alias traducidos (T-REV-09): una vez por idioma, no una por icono y tecla.
  const t = useT();
  const mapaAlias = useMemo(() => construirMapaAlias(items, t), [items, t]);
  const itemsPorClave = useMemo(() => new Map(items.map((i) => [i.clave, i])), [items]);
  const clavesRecientes = useMemo(() => new Set(recientes), [recientes]);
  const buscando = busquedaAplicada.trim().length > 0;
  const grupoOrigen = useMemo(() => {
    if (indice) return grupoInicial(mapas, origenActual, catalogoInicial);
    if (catalogoInicial === 'glifos') return GRUPO_GLIFOS;
    return catalogoInicial === 'marcas' ? GRUPO_SIMPLE : GRUPO_TABLER;
  }, [indice, mapas, origenActual, catalogoInicial]);
  const grupoActivo = grupoElegido ?? (buscando ? GRUPO_TODAS : grupoOrigen);

  const coincidentes = useMemo(() => {
    if (!buscando) return items;
    const terminos = busquedaAplicada.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const encontrados: ItemCatalogo[] = [];
    for (const item of items) {
      if (!coincideBusqueda(item, terminos, mapaAlias)) continue;
      encontrados.push(item);
      if (encontrados.length >= MAX_RESULTADOS_BUSQUEDA) break;
    }
    return encontrados;
  }, [items, buscando, busquedaAplicada, mapaAlias]);

  const recuentos = useMemo(
    () => contarGrupos(coincidentes, mapas, clavesRecientes),
    [coincidentes, mapas, clavesRecientes],
  );

  const resultados = useMemo(() => {
    if (grupoActivo === GRUPO_RECIENTES) {
      const terminos = buscando
        ? busquedaAplicada.trim().toLowerCase().split(/\s+/).filter(Boolean)
        : [];
      return resolverRecientes(recientes, itemsPorClave)
        .filter((item) => !terminos.length || coincideBusqueda(item, terminos, mapaAlias))
        .slice(0, buscando ? MAX_RESULTADOS_BUSQUEDA : undefined);
    }
    return coincidentes.filter((item) => perteneceAGrupo(item, grupoActivo, mapas, clavesRecientes));
  }, [grupoActivo, buscando, busquedaAplicada, recientes, itemsPorClave, coincidentes, mapas, clavesRecientes, mapaAlias]);

  // Los bitmaps se bajan solo para lo que se está viendo. El nombre del
  // catálogo sale de los propios datos, no de un literal del código.
  const necesarios = useMemo(() => {
    const catalogoAcciones = indice?.acciones[0]?.[3].catalogo;
    const catalogoMarcas = indice?.marcas[0]?.[3].catalogo;
    const set = new Set<NombreCatalogo>();
    for (const item of resultados) {
      if (item.clase === 'tabler' && catalogoAcciones) set.add(catalogoAcciones);
      else if (item.clase === 'simple' && catalogoMarcas) set.add(catalogoMarcas);
    }
    return [...set];
  }, [indice, resultados]);

  useEffect(() => {
    const faltan = necesarios.filter((n) => !catalogos[n] && !fallidos.has(n));
    if (!faltan.length) return;
    let cancelado = false;
    import('../../data/iconosDot')
      .then(async (m) => {
        const cargados = await Promise.all(
          faltan.map(async (n) => [n, await m.cargarCatalogo(n)] as const),
        );
        if (cancelado) return;
        setCatalogos((prev) => {
          const nuevo: Partial<Record<NombreCatalogo, CatalogoDot>> = { ...prev };
          for (const [n, cat] of cargados) nuevo[n] = cat;
          return nuevo;
        });
      })
      .catch(() => {
        if (!cancelado) setFallidos((prev) => new Set([...prev, ...faltan]));
      });
    return () => {
      cancelado = true;
    };
  }, [necesarios, catalogos, fallidos]);

  const mapaBits = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const [nombre, catalogo] of Object.entries(catalogos)) {
      if (!catalogo) continue;
      for (const [id, bits] of catalogo.iconos) mapa.set(`${nombre}:${id}`, bits);
    }
    return mapa;
  }, [catalogos]);

  const cargando = !indice || necesarios.some((n) => !catalogos[n] && !fallidos.has(n));
  const totalResultados = resultados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalResultados / ITEMS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaValida - 1) * ITEMS_POR_PAGINA;
  const itemsPagina = useMemo(
    () => resultados.slice(inicio, inicio + ITEMS_POR_PAGINA),
    [resultados, inicio],
  );

  const elegirGrupo = (grupo: string) => {
    setGrupoElegido(grupo);
    setPagina(1);
    setHovered(null);
  };

  const registrarSeleccion = (item: ItemCatalogo) => {
    const lista = guardarReciente(recientesRef.current, item.clave);
    recientesRef.current = lista;
    setRecientes(lista);
  };

  return {
    indice,
    cargando,
    busqueda,
    setBusqueda,
    buscando,
    grupoActivo,
    elegirGrupo,
    recuentos,
    recientes,
    pagina: paginaValida,
    setPagina,
    totalPaginas,
    totalResultados,
    itemsPagina,
    mapaBits,
    hovered,
    setHovered,
    registrarSeleccion,
  };
}
