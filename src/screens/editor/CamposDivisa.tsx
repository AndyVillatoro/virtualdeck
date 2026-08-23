import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { estiloEntrada } from './comunes';
import type { ButtonConfig } from '../../types';

/**
 * Los tres campos del widget de divisas: de qué moneda, a cuál y cuánto.
 *
 * La lista de monedas sale de las **tasas de verdad**, no de una constante
 * escrita a mano: el servicio trae 166 y cualquier lista propia se quedaría
 * corta o desfasada. Si todavía no han llegado —primer arranque sin conexión—
 * los dos campos siguen siendo escribibles, así que se puede configurar el
 * botón igual y el valor aparece cuando haya red.
 */

/** Con lo que se arranca antes de que responda el servicio. */
const BASE_POR_DEFECTO = 'USD';

interface Props {
  accent: string;
  valor: ButtonConfig['currencyWidget'];
  onChange: React.Dispatch<React.SetStateAction<ButtonConfig['currencyWidget']>>;
}

export function CamposDivisa({ accent, valor, onChange }: Props) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);
  const [monedas, setMonedas] = useState<string[]>([]);
  const [actualizado, setActualizado] = useState('');

  const de = valor?.from ?? BASE_POR_DEFECTO;
  const a = valor?.to ?? '';
  const cuanto = valor?.amount ?? 1;

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await window.electronAPI?.currency.rates(de);
        if (cancelado || !r?.ok || !r.datos) return;
        setMonedas([r.datos.base, ...Object.keys(r.datos.rates)].sort());
        setActualizado(r.datos.actualizado);
      } catch { /* sin red: los campos siguen escribibles */ }
    })();
    return () => { cancelado = true; };
  }, [de]);

  const poner = (parte: Partial<NonNullable<ButtonConfig['currencyWidget']>>) =>
    onChange((prev) => ({ from: de, to: a, amount: cuanto, ...prev, ...parte }));

  return (
    <div style={{
      marginTop: 8, padding: 10, background: VD.elevated,
      border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          min={0}
          step="any"
          value={cuanto}
          onChange={(e) => poner({ amount: Number(e.target.value) || 1 })}
          style={{ ...inputStyle, width: 70 }}
        />
        <input
          list="vd-monedas"
          value={de}
          onChange={(e) => poner({ from: e.target.value.toUpperCase().slice(0, 3) })}
          placeholder={tf('DE')}
          style={{ ...inputStyle, width: 70, textTransform: 'uppercase' }}
        />
        <span style={{ color: VD.textMuted, fontFamily: VD.mono, fontSize: 12 }}>→</span>
        <input
          list="vd-monedas"
          value={a}
          onChange={(e) => poner({ to: e.target.value.toUpperCase().slice(0, 3) })}
          placeholder={tf('A')}
          style={{ ...inputStyle, width: 70, textTransform: 'uppercase', borderColor: a ? accent : VD.border }}
        />
        <datalist id="vd-monedas">
          {monedas.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.4 }}>
        {tf('La tasa se actualiza una vez al día y se guarda, así que el botón sigue mostrando la última aunque no haya conexión.')}
        {actualizado ? ` · ${actualizado}` : ''}
      </div>
    </div>
  );
}
