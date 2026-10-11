import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { CAT_ACCIONES, CAT_MARCAS, PREFIJO_MARCAS } from './constantesCatalogo';
import type { IconoElegido, SeccionCatalogo } from './constantesCatalogo';
import { resolverIconoCatalogo } from '../../data/iconosDot';
import type { NombreCatalogo } from '../../data/iconosDot/tipos';
import { resolverIconoInicial, type TipoIcono } from './tiposIcono';
import { subButtonsIniciales } from './subButtonsIniciales';
import { usePegarImagen } from './usePegarImagen';
import type { estiloInicial } from './valoresIniciales';
import type { ButtonConfig, SubButtonConfig } from '../../types';

/** A qué icono del editor va lo que se elija en el catálogo (roadmap 93). */
export type DestinoCatalogo = 'principal' | 'encendido' | { cuadrante: number };

interface UseEstadoIconoOpciones {
  button: ButtonConfig;
  est: ReturnType<typeof estiloInicial>;
  subButtons: SubButtonConfig[];
  setSubButtons: Dispatch<SetStateAction<SubButtonConfig[]>>;
  /**
   * Los dos campos de icono del aspecto encendido (estado de
   * `useEstadoApariencia`): elegir en el catálogo con destino «encendido» deja
   * de ser un icono suelto y pasa a ser el que se ve con el botón encendido.
   */
  setEncendidoIcon: Dispatch<SetStateAction<string>>;
  setEncendidoIconoPuntos: Dispatch<SetStateAction<{ bits: string; origen: string } | undefined>>;
}

/**
 * El icono del botón: glifo, mapa de puntos, marca, imagen o glifo 5×7, y el
 * catálogo de iconos que los elige. Vive aparte de `useEstadoEditor` porque es
 * el bloque más grande del formulario y el único con estado propio (`iconoRef`)
 * que hay que leer desde las promesas de resolución del catálogo.
 */
export function useEstadoIcono({
  button,
  est,
  subButtons,
  setSubButtons,
  setEncendidoIcon,
  setEncendidoIconoPuntos,
}: UseEstadoIconoOpciones) {
  const [icon, setIcon] = useState(est.icon);
  const [imageData, setImageData] = useState(est.imageData);
  const [brandIcon, setBrandIcon] = useState(est.brandIcon);
  const [brandIconAlwaysAnimate, setBrandIconAlwaysAnimate] = useState(est.brandIconAlwaysAnimate);
  const [brandIconCustomBitmap, setBrandIconCustomBitmap] = useState(est.brandIconCustomBitmap);
  const [brandIconCustomColor, setBrandIconCustomColor] = useState(est.brandIconCustomColor);
  const [brandIconCustomPalette, setBrandIconCustomPalette] = useState(est.brandIconCustomPalette);
  const [iconoPuntos, setIconoPuntos] = useState(est.iconoPuntos);
  const [destinoCatalogo, setDestinoCatalogo] = useState<DestinoCatalogo>('principal');
  const [catalogoDotAbierto, setCatalogoDotAbierto] = useState<SeccionCatalogo | null>(null);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [customGlyph57, setCustomGlyph57] = useState(est.customGlyph57);
  const [showGlyphEditor, setShowGlyphEditor] = useState(false);
  const [infoIconoIni] = useState(() => resolverIconoInicial(button));
  const [tipoIcono, setTipoIcono] = useState<TipoIcono>(infoIconoIni.tipo);
  const [glifoEncima, setGlifoEncima] = useState<string>(infoIconoIni.glifoEncima);
  const [habiaVariosCamposIcono] = useState<boolean>(infoIconoIni.habiaVarios);

  /** Reflejo mutable del estado de icono para leerlo dentro de promesas de resolución de catálogo. */
  const iconoRef = useRef({
    icon,
    tipoIcono,
    iconoPuntos,
    imageData,
    brandIcon,
    customGlyph57,
  });
  useEffect(() => {
    iconoRef.current = { icon, tipoIcono, iconoPuntos, imageData, brandIcon, customGlyph57 };
  }, [icon, tipoIcono, iconoPuntos, imageData, brandIcon, customGlyph57]);

  usePegarImagen((data) => {
    setImageData(data);
    setTipoIcono('imagen');
  });

  const abrirCatalogoDot = (cat: NombreCatalogo, destino: DestinoCatalogo = 'principal') => {
    setDestinoCatalogo(destino);
    // Con un glifo 8×8 elegido, el catálogo abre en su grupo, no en Tabler.
    const glifoElegido = destino === 'principal' && tipoIcono === 'glifo';
    setCatalogoDotAbierto(glifoElegido && cat === CAT_ACCIONES ? 'glifos' : cat);
  };
  const cerrarCatalogoDot = () => setCatalogoDotAbierto(null);

  /** El catálogo de un cuadrante abre donde tenga sentido según su icono actual. */
  const abrirCatalogoCuadrante = (idx: number) => {
    const origen = subButtons[idx]?.iconoPuntos?.origen;
    const cat = origen?.startsWith(PREFIJO_MARCAS) ? CAT_MARCAS : CAT_ACCIONES;
    abrirCatalogoDot(cat, { cuadrante: idx });
  };

  /** Elegir en el catálogo con un cuadrante de destino (roadmap 93). */
  const seleccionarIconoCuadrante = (idx: number, icono: IconoElegido) => {
    setSubButtons((prev) => {
      const actuales = prev.length === 4 ? prev : subButtonsIniciales(button);
      const patch: Partial<SubButtonConfig> = icono.tipo === 'glifo'
        ? { dotGlyph: icono.icon, icon: icono.icon, iconoPuntos: undefined }
        : { iconoPuntos: { bits: icono.bits, origen: icono.origen }, dotGlyph: undefined, icon: undefined };
      const next = [...actuales];
      next[idx] = { ...actuales[idx], ...patch };
      return next;
    });
    setCatalogoDotAbierto(null);
  };

  const seleccionarIconoCatalogo = (icono: IconoElegido) => {
    if (typeof destinoCatalogo === 'object') {
      seleccionarIconoCuadrante(destinoCatalogo.cuadrante, icono);
      return;
    }
    if (destinoCatalogo === 'encendido') {
      if (icono.tipo === 'puntos') {
        setEncendidoIconoPuntos(icono);
        setEncendidoIcon('');
      } else {
        setEncendidoIcon(icono.icon);
        setEncendidoIconoPuntos(undefined);
      }
      setCatalogoDotAbierto(null);
      return;
    }
    if (icono.tipo === 'glifo') {
      // El glifo 8×8 del catálogo es el mismo que el de la fila rápida.
      setIcon(icono.icon);
      setIconoPuntos(undefined);
      setTipoIcono('glifo');
      setImageData('');
      setBrandIcon('');
      setBrandIconCustomBitmap(undefined);
      setBrandIconCustomColor(undefined);
      setBrandIconCustomPalette(undefined);
      setCustomGlyph57(undefined);
      setCatalogoDotAbierto(null);
      return;
    }
    setIconoPuntos(icono);
    if (icono.origen.startsWith(PREFIJO_MARCAS)) {
      setTipoIcono('marca');
      setBrandIcon('');
      setBrandIconCustomBitmap(undefined);
      setBrandIconCustomColor(undefined);
      setBrandIconCustomPalette(undefined);
      setImageData('');
      setCustomGlyph57(undefined);
    } else {
      setTipoIcono('glifo');
      setIcon('');
      setImageData('');
      setBrandIcon('');
      setBrandIconCustomBitmap(undefined);
      setBrandIconCustomColor(undefined);
      setBrandIconCustomPalette(undefined);
      setCustomGlyph57(undefined);
    }
    setCatalogoDotAbierto(null);
  };

  // Resuelve `iconoCatalogo` y, si el usuario no tocó el icono entretanto,
  // sustituye el glifo de respaldo por el icono de puntos correspondiente.
  const aplicarIconoCatalogo = (origen: string, iconoRespaldo: string) => {
    resolverIconoCatalogo(origen).then((resuelto) => {
      if (!resuelto) return;
      const actual = iconoRef.current;
      const sinCambios = actual.icon === iconoRespaldo && actual.tipoIcono === (iconoRespaldo ? 'glifo' : 'auto') && !actual.iconoPuntos && !actual.imageData && !actual.brandIcon && !actual.customGlyph57;
      if (!sinCambios) return;
      setIconoPuntos(resuelto);
      setIcon('');
      setTipoIcono(resuelto.origen.startsWith(PREFIJO_MARCAS) ? 'marca' : 'glifo');
    });
  };

  const resetIconoPreset = (iconoRespaldo: string) => {
    setIconoPuntos(undefined);
    setImageData('');
    setBrandIcon('');
    setBrandIconCustomBitmap(undefined);
    setBrandIconCustomColor(undefined);
    setBrandIconCustomPalette(undefined);
    setCustomGlyph57(undefined);
    if (iconoRespaldo) {
      setTipoIcono('glifo');
      setGlifoEncima('');
    } else {
      setTipoIcono('auto');
    }
  };

  const pickImage = async () => {
    const api = window.electronAPI;
    if (!api) return;
    const data = await api.dialog.openImage();
    if (data) {
      setImageData(data);
      setTipoIcono('imagen');
    }
  };

  return {
    icon,
    setIcon,
    imageData,
    setImageData,
    brandIcon,
    setBrandIcon,
    brandIconAlwaysAnimate,
    setBrandIconAlwaysAnimate,
    brandIconCustomBitmap,
    setBrandIconCustomBitmap,
    brandIconCustomColor,
    setBrandIconCustomColor,
    brandIconCustomPalette,
    setBrandIconCustomPalette,
    showBrandPicker,
    setShowBrandPicker,
    showBrandEditor,
    setShowBrandEditor,
    customGlyph57,
    setCustomGlyph57,
    showGlyphEditor,
    setShowGlyphEditor,
    tipoIcono,
    setTipoIcono,
    glifoEncima,
    setGlifoEncima,
    habiaVariosCamposIcono,
    iconoPuntos,
    setIconoPuntos,
    destinoCatalogo,
    catalogoDotAbierto,
    setCatalogoDotAbierto,
    abrirCatalogoDot,
    abrirCatalogoCuadrante,
    cerrarCatalogoDot,
    seleccionarIconoCatalogo,
    aplicarIconoCatalogo,
    resetIconoPreset,
    pickImage,
  };
}