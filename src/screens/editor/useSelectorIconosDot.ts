import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogoDot, IndiceDot, EntradaIndice, NombreCatalogo } from '../../data/iconosDot/tipos';
import { CAT_ACCIONES } from './constantesCatalogo';

export const ITEMS_POR_PAGINA = 72;
export const MAX_RESULTADOS_BUSQUEDA = 300;

function coincideBusqueda(entrada: EntradaIndice, terminos: string[]): boolean {
  const id = entrada[0].toLowerCase();
  const nombre = entrada[1].toLowerCase();
  const etiquetas = entrada[2];
  for (let i = 0; i < terminos.length; i++) {
    const t = terminos[i];
    const coincide =
      id.includes(t) ||
      nombre.includes(t) ||
      etiquetas.some((e) => e.toLowerCase().includes(t));
    if (!coincide) return false;
  }
  return true;
}

export function useSelectorIconosDot(catalogoInicial: NombreCatalogo = CAT_ACCIONES) {
  const [catalogoActivo, setCatalogoActivo] = useState<NombreCatalogo>(catalogoInicial);
  const [indice, setIndice] = useState<IndiceDot | null>(null);
  const [catalogos, setCatalogos] = useState<Partial<Record<NombreCatalogo, CatalogoDot>>>({});
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [debouncedBusqueda, setDebouncedBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [hovered, setHovered] = useState<[string, string] | null>(null);
  const [tiempoCargaPrimeraPagina, setTiempoCargaPrimeraPagina] = useState<number | null>(null);

  const t0Ref = useRef<number>(performance.now());
  const medidoRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusqueda(busqueda);
      setPagina(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      try {
        const { cargarIndice, cargarCatalogo } = await import('../../data/iconosDot');
        const [idx, cat] = await Promise.all([
          cargarIndice(),
          cargarCatalogo(catalogoActivo),
        ]);
        if (cancelado) return;
        setIndice(idx);
        setCatalogos((prev) => ({ ...prev, [catalogoActivo]: cat }));
        if (!medidoRef.current) {
          const tFin = performance.now();
          const ms = Math.round(tFin - t0Ref.current);
          setTiempoCargaPrimeraPagina(ms);
          medidoRef.current = true;
          console.info(`[SelectorIconosDot] Ready in ${ms} ms`);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [catalogoActivo]);

  const cambiarCatalogo = (cat: NombreCatalogo) => {
    if (cat === catalogoActivo) return;
    setCatalogoActivo(cat);
    setPagina(1);
    setHovered(null);
  };

  const resultados = useMemo(() => {
    if (!indice) return [];
    const lista = indice[catalogoActivo] || [];
    const q = debouncedBusqueda.trim().toLowerCase();
    if (!q) return lista;
    const terminos = q.split(/\s+/).filter(Boolean);
    const res: EntradaIndice[] = [];
    for (let i = 0; i < lista.length; i++) {
      const entrada = lista[i];
      if (coincideBusqueda(entrada, terminos)) {
        res.push(entrada);
        if (res.length >= MAX_RESULTADOS_BUSQUEDA) break;
      }
    }
    return res;
  }, [indice, catalogoActivo, debouncedBusqueda]);

  const mapaBits = useMemo(() => {
    const cat = catalogos[catalogoActivo];
    if (!cat) return new Map<string, string>();
    return new Map(cat.iconos);
  }, [catalogos, catalogoActivo]);

  const totalResultados = resultados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalResultados / ITEMS_POR_PAGINA));
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaValida - 1) * ITEMS_POR_PAGINA;
  const itemsPagina = useMemo(
    () => resultados.slice(inicio, inicio + ITEMS_POR_PAGINA),
    [resultados, inicio]
  );

  return {
    catalogoActivo,
    cambiarCatalogo,
    cargando,
    busqueda,
    setBusqueda,
    pagina: paginaValida,
    setPagina,
    totalPaginas,
    totalResultados,
    itemsPagina,
    mapaBits,
    hovered,
    setHovered,
    tiempoCargaPrimeraPagina,
  };
}
