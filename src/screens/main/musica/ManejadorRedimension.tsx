import React, { useState } from 'react';

export function ManejadorRedimension({
  lado,
  accent,
  anchoActual,
  onCambiarAncho,
  onFinalizar,
}: {
  lado: 'left' | 'right';
  accent: string;
  anchoActual: number;
  onCambiarAncho: (nuevoAncho: number) => void;
  onFinalizar?: (anchoFinal: number) => void;
}) {
  const [arrastrando, setArrastrando] = useState(false);
  const [hover, setHover] = useState(false);

  const alPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(true);
    const startX = e.clientX;
    const startAncho = anchoActual;
    let ultimoAncho = startAncho;

    const alMover = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX;
      // Si el panel está a la izquierda, arrastrar hacia la derecha amplía
      // Si el panel está a la derecha, arrastrar hacia la izquierda amplía
      const diff = lado === 'left' ? deltaX : -deltaX;
      const nuevo = Math.max(180, Math.min(760, startAncho + diff));
      ultimoAncho = nuevo;
      onCambiarAncho(nuevo);
    };

    const alSubir = () => {
      setArrastrando(false);
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSubir);
      window.removeEventListener('pointercancel', alSubir);
      onFinalizar?.(ultimoAncho);
    };

    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSubir);
    window.addEventListener('pointercancel', alSubir);
  };

  const estiloPosicion = lado === 'left'
    ? { right: -4, top: 0, bottom: 0 }
    : { left: -4, top: 0, bottom: 0 };

  return (
    <div
      onPointerDown={alPointerDown}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        ...estiloPosicion,
        width: 8,
        cursor: 'col-resize',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 2,
          height: '100%',
          background: arrastrando || hover ? accent : 'transparent',
          opacity: arrastrando ? 1 : 0.6,
          transition: 'background 0.15s, opacity 0.15s',
        }}
      />
    </div>
  );
}
