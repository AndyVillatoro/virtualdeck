import { useTheme } from '../utils/theme';

// Banner de actualización lista. Extraído como componente para que pueda usar
// useTheme() (App renderiza el ThemeProvider, así que su cuerpo queda fuera del
// contexto de tema; sus hijos sí lo tienen). Movido tal cual desde `App.tsx`.
export function PantallaCargando() {
  const VD = useTheme();
  return (
    <div style={{ width: '100vw', height: '100vh', background: VD.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: VD.textMuted, fontFamily: VD.mono, fontSize: 12, letterSpacing: 2 }}>
      CARGANDO...
    </div>
  );
}
