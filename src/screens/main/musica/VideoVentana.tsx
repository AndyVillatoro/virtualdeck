import React, { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import type { ElectronAPI, PistaCaptura } from '../../../types';
import { useStreamVentana } from './useStreamVentana';
import { useTamanoPedido } from './useTamanoPedido';
import { useVentanasCaptura } from './useVentanasCaptura';
import { SelectorVentanas } from './SelectorVentanas';
import { BarraVideo } from './BarraVideo';
import {
  ajustarAlAspecto, cajaContenida, cajaRecorte, claveRecorte, puntoEnCuadro, rectanguloEntre,
  type Recorte,
} from './recorteVideo';

/**
 * Vídeo de la ventana que suena, dentro del panel de música (formato barra).
 *
 * Ocupa el sitio de la carátula y el título. Sin filtro DOT: es la imagen tal
 * cual. La captura vive mientras el componente existe; desmontarlo (plegar,
 * cerrar, cambiar de formato, apagar VÍDEO) para la captura.
 *
 * Recorte: se congela un cuadro, se arrastra el área y se guarda por app. La
 * imagen recortada se pinta con CSS (`cajaRecorte`), sin recodificar.
 */

/** Ajustes del vídeo que vienen de `config.musicPanel`. */
export interface AjustesVideo {
  activo: boolean;
  recortes: Record<string, Recorte>;
  onActivo: (activo: boolean) => void;
  onRecortes: (recortes: Record<string, Recorte>) => void;
}

interface Tamano { ancho: number; alto: number }

/** Tamaño del contenedor, al día con el redimensionado. */
function useTamano(ref: RefObject<HTMLElement>): Tamano {
  const [tamano, setTamano] = useState<Tamano>({ ancho: 0, alto: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      const r = entrada.contentRect;
      setTamano({ ancho: r.width, alto: r.height });
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return tamano;
}

/** Estilo del `<video>`: entero (contain) o recortado (caja calculada). */
function estiloVideo(recorte: Recorte | undefined, tamano: Tamano, aspecto: number): CSSProperties {
  if (recorte && tamano.ancho > 0) {
    return { position: 'absolute', objectFit: 'fill', ...cajaRecorte(recorte, tamano.ancho, tamano.alto, aspecto) };
  }
  return { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' };
}

/** Foto del cuadro actual como JPEG, para congelarla mientras se recorta. */
function fotografiar(video: HTMLVideoElement): string | null {
  if (video.videoWidth === 0) return null;
  const lienzo = document.createElement('canvas');
  lienzo.width = video.videoWidth;
  lienzo.height = video.videoHeight;
  lienzo.getContext('2d')?.drawImage(video, 0, 0);
  return lienzo.toDataURL('image/jpeg', 0.85);
}

export function VideoVentana({ api, pista, accent, ajustes }: {
  api: ElectronAPI | undefined;
  pista: PistaCaptura;
  accent: string;
  ajustes: AjustesVideo;
}) {
  const VD = useTheme();
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);

  const { ventanas, candidata, cargando, recargar } = useVentanasCaptura(api, pista);
  const [elegida, setElegida] = useState<string | null>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [aspecto, setAspecto] = useState(16 / 9);
  const [recortando, setRecortando] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [marca, setMarca] = useState<{ a: { u: number; v: number }; b: { u: number; v: number } } | null>(null);

  const tamano = useTamano(contenedorRef);
  const sourceId = elegida ?? candidata;
  const nombreVentana = ventanas.find((v) => v.id === sourceId)?.nombre ?? '';
  const clave = claveRecorte(pista.fuente, nombreVentana);
  const recorte = ajustes.recortes[clave];
  const pedido = useTamanoPedido(tamano.ancho, tamano.alto, recorte);
  const estado = useStreamVentana(sourceId, videoRef, pedido);
  const mostrarSelector = !sourceId || selectorAbierto;
  const cuadro = cajaContenida(tamano.ancho, tamano.alto, aspecto);
  const rectangulo = marca ? rectanguloEntre(marca.a, marca.b) : null;

  const salirDelRecorte = () => {
    setRecortando(false);
    setFoto(null);
    setMarca(null);
  };

  const empezarRecorte = () => {
    const video = videoRef.current;
    const imagen = video ? fotografiar(video) : null;
    if (!imagen) return;
    setFoto(imagen);
    setMarca(null);
    setRecortando(true);
  };

  const guardarRecorte = () => {
    if (rectangulo && tamano.alto > 0) {
      const relacion = (tamano.ancho / tamano.alto) / aspecto;
      ajustes.onRecortes({ ...ajustes.recortes, [clave]: ajustarAlAspecto(rectangulo, relacion) });
    }
    salirDelRecorte();
  };

  const verEntera = () => {
    const resto = { ...ajustes.recortes };
    delete resto[clave];
    ajustes.onRecortes(resto);
  };

  const elegirVentana = (id: string) => {
    setElegida(id);
    setSelectorAbierto(false);
    salirDelRecorte();
  };

  const abrirSelector = () => {
    if (!selectorAbierto) recargar();
    setSelectorAbierto(!selectorAbierto);
  };

  const puntoDelPuntero = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return puntoEnCuadro(e.clientX - r.left, e.clientY - r.top, r);
  };

  const pulsarCuadro = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastrando.current = true;
    const p = puntoDelPuntero(e);
    setMarca({ a: p, b: p });
  };

  const moverCuadro = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrando.current || !marca) return;
    setMarca({ a: marca.a, b: puntoDelPuntero(e) });
  };

  const soltarCuadro = () => { arrastrando.current = false; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div
        ref={contenedorRef}
        style={{
          position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden',
          borderRadius: VD.radius.lg, background: VD.overlay, border: `1px solid ${VD.border}`,
        }}
      >
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          onResize={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth > 0 && v.videoHeight > 0) setAspecto(v.videoWidth / v.videoHeight);
          }}
          style={estiloVideo(recortando ? undefined : recorte, tamano, aspecto)}
        />

        {recortando && foto && (
          <div
            onPointerDown={pulsarCuadro}
            onPointerMove={moverCuadro}
            onPointerUp={soltarCuadro}
            onPointerCancel={soltarCuadro}
            style={{
              position: 'absolute', ...cuadro, cursor: 'crosshair', touchAction: 'none', userSelect: 'none',
            }}
          >
            <img
              src={foto}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
            />
            {rectangulo && (
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                left: `${rectangulo.x * 100}%`, top: `${rectangulo.y * 100}%`,
                width: `${rectangulo.w * 100}%`, height: `${rectangulo.h * 100}%`,
                border: `1px solid ${accent}`, boxShadow: '0 0 0 9999px rgba(7,8,9,0.55)',
              }} />
            )}
          </div>
        )}

        {mostrarSelector && (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 8, background: VD.surface }}>
            <SelectorVentanas
              ventanas={ventanas}
              seleccionada={sourceId}
              cargando={cargando}
              onElegir={elegirVentana}
            />
          </div>
        )}

        {!mostrarSelector && estado === 'error' && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
            <DotLabel size={8} color={VD.textDim} spacing={1}>{t('music.videoError')}</DotLabel>
          </div>
        )}

        {/* El navegador tapado no pinta: el cuadro se queda parado y se dice por qué. */}
        {!mostrarSelector && estado === 'congelado' && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, padding: '4px 8px',
            background: VD.overlay, borderTop: `1px solid ${VD.border}`,
          }}>
            <DotLabel size={8} color={VD.textMuted} spacing={1}>{t('music.videoCongelado')}</DotLabel>
          </div>
        )}
      </div>

      <BarraVideo
        recortando={recortando}
        hayRecorte={recorte !== undefined}
        puedeRecortar={estado === 'ok' && !mostrarSelector}
        accent={accent}
        onSelector={abrirSelector}
        onRecortar={empezarRecorte}
        onEntera={verEntera}
        onGuardar={guardarRecorte}
        onCancelar={salirDelRecorte}
      />
    </div>
  );
}
