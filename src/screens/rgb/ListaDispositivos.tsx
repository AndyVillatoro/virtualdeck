import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { estiloBotonSecundario } from './piezas';
import type { RGBDeviceInfo } from '../../types';

/**
 * La columna izquierda del gestor RGB: qué dispositivos hay y las tres
 * acciones que se aplican a todos a la vez.
 *
 * Sale de `RGBManagerB` junto con el panel de perfiles (roadmap #14). La
 * pantalla se queda con lo que de verdad es suyo —la conexión y el estado— y
 * cada columna con lo que pinta.
 */
export function ListaDispositivos({
  devices, selectedId, accent, conectado, ocupado,
  onSelect, onTodoApagado, onTodoColor,
}: {
  devices: RGBDeviceInfo[];
  selectedId: number | null;
  accent: string;
  conectado: boolean;
  ocupado: boolean;
  onSelect: (id: number) => void;
  onTodoApagado: () => void;
  onTodoColor: (hex: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const btnSecondary = estiloBotonSecundario(VD);

  return (
    <div style={{ width: 240, borderRight: `1px solid ${VD.border}`, background: VD.surface, padding: 10, overflowY: 'auto', flexShrink: 0 }}>
      <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{t('rgb.devices')}</DotLabel>
      {devices.length === 0 && (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
          {t(conectado ? 'rgb.noDevices' : 'rgb.connectToSee')}
        </div>
      )}
      {devices.map((d) => (
        <div
          key={d.id}
          onClick={() => onSelect(d.id)}
          style={{
            padding: '8px 10px', marginBottom: 4, cursor: 'pointer',
            background: selectedId === d.id ? VD.accentBg : VD.elevated,
            border: `1px solid ${selectedId === d.id ? accent : VD.border}`,
            borderRadius: VD.radius.md,
          }}
        >
          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: 0.5 }}>{d.name}</div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 3, letterSpacing: 1 }}>
            {/* «ZONA»/«ZONAS» estaba escrito aquí en español: con la app en
                inglés, un teclado salía como «KEYBOARD · 3 ZONAS · 104 LEDS». */}
            {d.typeLabel.toUpperCase()} · {t(d.zones.length === 1 ? 'rgb.zoneCount' : 'rgb.zoneCountN', { n: d.zones.length })} · {t('rgb.ledCount', { n: d.colors.length })}
          </div>
        </div>
      ))}

      {conectado && devices.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${VD.border}` }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{t('rgb.quickActions')}</DotLabel>
          <button onClick={onTodoApagado} disabled={ocupado} style={{ ...btnSecondary, width: '100%', marginBottom: 4 }}>{t('rgb.allOff')}</button>
          <button onClick={() => onTodoColor('#ffffff')} disabled={ocupado} style={{ ...btnSecondary, width: '100%', marginBottom: 4 }}>{t('rgb.allWhite')}</button>
          <button onClick={() => onTodoColor(accent)} disabled={ocupado} style={{ ...btnSecondary, width: '100%' }}>{t('rgb.accentColor')}</button>
        </div>
      )}
    </div>
  );
}
