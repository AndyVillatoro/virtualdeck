import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { CompanionStatus } from '../../types';
import {
  estiloBotonMiniAjustes,
  estiloEntradaAjustes,
  SettingLabel,
  ToggleRow,
} from './settingHelpers';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';

/** Cómo se lee el estado del servidor, en una línea. */
function textoDeEstado(estado: CompanionStatus | null, t: (k: string) => string): string {
  if (!estado?.activo) return t('set.companionOff');
  return estado.conectado ? t('set.companionConnected') : t('set.companionWaiting');
}

/**
 * Por qué no hay servidor escuchando.
 *
 * Antes el motivo se quedaba en el registro del proceso principal y la
 * interfaz decía «esperando conexión» indefinidamente: indistinguishable de
 * que nadie hubiera cargado la extensión.
 */
function AvisoFallo({ estado }: { estado: CompanionStatus | null }) {
  const VD = useTheme();
  const t = useT();
  if (!estado?.fallo) return null;
  const clave = estado.fallo === 'puerto-ocupado' ? 'set.companionPortBusy' : 'set.companionPortInvalid';
  return (
    <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.danger, lineHeight: 1.4 }}>
      {t(clave, { port: estado.puerto })}
    </div>
  );
}

/** Punto de estado + texto + FPS. El estado llega del proceso principal. */
function FilaEstado({
  estado, accent, onPedirCodigo,
}: {
  estado: CompanionStatus | null;
  accent: string;
  onPedirCodigo: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);
  const conectado = estado?.conectado ?? false;
  const activo = estado?.activo ?? true;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: conectado ? VD.success : VD.textMuted,
        }} />
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: conectado ? VD.success : VD.textDim, letterSpacing: 0.5 }}>
          {textoDeEstado(estado, t)}
        </span>
        {(estado?.fps ?? 0) > 0 && (
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: accent }}>
            ({estado?.fps} FPS)
          </span>
        )}
      </div>
      <button
        onClick={onPedirCodigo}
        disabled={!activo}
        title={t('set.companionPairBtnHint')}
        style={{ ...miniBtn(accent), opacity: activo ? 1 : 0.5 }}
      >
        {t('set.companionPairBtn')}
      </button>
    </div>
  );
}

/** El código de emparejamiento, en grande, con su botón de copiar. */
function TarjetaCodigo({ codigo, copiado, onCopiar }: { codigo: string; copiado: boolean; onCopiar: () => void }) {
  const VD = useTheme();
  const t = useT();

  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.accent}`,
      borderRadius: VD.radius.md, padding: '8px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    }}>
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>
          {t('set.companionPairCode')}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 16, fontWeight: 700, color: VD.accent, letterSpacing: 4 }}>
          {codigo.slice(0, 3)} {codigo.slice(3)}
        </div>
      </div>
      <button onClick={onCopiar} style={estiloBotonMiniAjustes(VD, VD.accent)}>
        {copiado ? t('set.companionCopied') : t('set.companionCopy')}
      </button>
    </div>
  );
}

/** Token, con el glifo del ojo para verlo o esconderlo, y su regeneración. */
function FilaToken({ token, onRegenerar }: { token: string; onRegenerar: () => void }) {
  const VD = useTheme();
  const t = useT();
  const [ver, setVer] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>
          {t('set.companionToken')}
        </span>
        <button
          type="button"
          onClick={() => setVer(!ver)}
          title={t('set.companionTokenHint')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: VD.textMuted }}
        >
          <DotGlyphIcon glyph={ver ? 'EYE' : 'EYE_OFF'} size={10} color={VD.textMuted} />
        </button>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.text, letterSpacing: 0.5 }}>
          {ver ? (token || '—') : '••••••••••••••••'}
        </span>
      </div>
      <button
        onClick={onRegenerar}
        title={t('set.companionRegenTokenHint')}
        style={estiloBotonMiniAjustes(VD, VD.textMuted)}
      >
        {t('set.companionRegenToken')}
      </button>
    </div>
  );
}

/**
 * Ajustes de la extensión compañera del navegador.
 *
 * El interruptor y el puerto se aplican **contra el servidor**, no contra un
 * borrador: cada cambio se guarda (token, puerto y encendido viven en la
 * configuración del usuario) y lo que se ve aquí es lo que devuelve el proceso
 * principal, que es el único que sabe si el puerto está realmente libre.
 */
export function CompanionSection({ accent }: { accent: string }) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;

  const [estado, setEstado] = useState<CompanionStatus | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [puerto, setPuerto] = useState<number | null>(null);

  useEffect(() => {
    if (!api?.companion) return undefined;
    api.companion.getStatus().then(setEstado).catch(() => {});
    return api.companion.onStatus(setEstado);
  }, [api]);

  // El puerto escrito se muestra tal cual mientras se edita; si no, el `input`
  // de número se pelea con el estado y no deja escribir «4820».
  useEffect(() => {
    setPuerto(null);
  }, [estado?.puerto]);

  const pedirCodigo = useCallback(async () => {
    if (!api?.companion) return;
    try {
      setCodigo(await api.companion.getPairingCode());
      setCopiado(false);
    } catch {}
  }, [api]);

  const copiarCodigo = useCallback(() => {
    if (!codigo) return;
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }).catch(() => {});
  }, [codigo]);

  const regenerar = useCallback(async () => {
    if (!api?.companion) return;
    try {
      await api.companion.regenerateToken();
    } catch {}
  }, [api]);

  const alternar = useCallback(async () => {
    if (!api?.companion || !estado) return;
    try {
      await api.companion.setEnabled(!estado.activo);
    } catch {}
  }, [api, estado]);

  const aplicarPuerto = useCallback(async () => {
    if (puerto === null || !api?.companion) return;
    try {
      await api.companion.setPort(puerto);
    } finally {
      setPuerto(null);
    }
  }, [api, puerto]);

  const activo = estado?.activo ?? true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div title={t('set.companionServerHint')}>
        <ToggleRow
          label={t('set.companionServer')}
          value={activo}
          accent={accent}
          onClick={alternar}
        />
      </div>

      <div>
        <SettingLabel>{t('set.companionPort')}</SettingLabel>
        <input
          type="number"
          min={1024}
          max={65535}
          value={puerto ?? estado?.puerto ?? ''}
          disabled={!activo}
          title={t('set.companionPortHint')}
          onChange={(e) => setPuerto(parseInt(e.target.value, 10))}
          onBlur={aplicarPuerto}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          style={{
            ...estiloEntradaAjustes(VD),
            width: 96,
            marginTop: 4,
            opacity: activo ? 1 : 0.5,
          }}
        />
      </div>

      <AvisoFallo estado={estado} />

      <FilaEstado estado={estado} accent={accent} onPedirCodigo={pedirCodigo} />

      {codigo && <TarjetaCodigo codigo={codigo} copiado={copiado} onCopiar={copiarCodigo} />}

      <div style={{
        background: VD.elevated, border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.4 }}>
          {t('set.companionInstallHint')}
        </div>
      </div>

      <FilaToken token={estado?.token ?? ''} onRegenerar={regenerar} />
    </div>
  );
}