/**
 * El CSS de la página del mando móvil.
 *
 * Vive aparte de `paginaMando.ts` porque ese archivo está en el tope de 600
 * líneas y el pintado de la marca le añade código: la página interpola esta
 * cadena dentro de su `<style>` con nonce, igual que los bloques JS de
 * `tactilMandoPagina.ts` o `vivoMandoPagina.ts`. Es CSS, no texto de interfaz.
 */

/** El bloque entero, con el acento ya interpolado. Sin línea inicial ni final de más. */
export function estiloPaginaMando(acento: string): string {
  return `  :root {
    --bg: #070809; --sup: #111315; --alt: #181b1e; --bor: #26292e;
    --txt: #e6e8eb; --ten: #8e929b; --ac: ${acento}; --ac-bg: ${acento}26; --btn-txt: #070809;
    --rotulo-bg: rgba(7, 8, 9, 0.85); --rotulo-bor: rgba(255, 255, 255, 0.08);
    --sub-bg: rgba(255, 255, 255, 0.05); --sub-bor: rgba(255, 255, 255, 0.08);
  }
  :root[data-theme="light"] {
    --bg: #d8dbe0; --sup: #cbcfd5; --alt: #c0c5cc; --bor: #9da4ae;
    --txt: #111418; --ten: #4d5560; --btn-txt: #111418;
    --rotulo-bg: rgba(203, 207, 213, 0.88); --rotulo-bor: rgba(0, 0, 0, 0.12);
    --sub-bg: rgba(0, 0, 0, 0.05); --sub-bor: rgba(0, 0, 0, 0.10);
  }
  :root[data-theme="dark"] {
    --bg: #070809; --sup: #111315; --alt: #181b1e; --bor: #26292e;
    --txt: #e6e8eb; --ten: #8e929b; --btn-txt: #070809;
    --rotulo-bg: rgba(7, 8, 9, 0.85); --rotulo-bor: rgba(255, 255, 255, 0.08);
    --sub-bg: rgba(255, 255, 255, 0.05); --sub-bor: rgba(255, 255, 255, 0.08);
  }
  @media (prefers-color-scheme: light) {
    :root[data-theme="system"] {
      --bg: #d8dbe0; --sup: #cbcfd5; --alt: #c0c5cc; --bor: #9da4ae;
      --txt: #111418; --ten: #4d5560; --btn-txt: #111418;
      --rotulo-bg: rgba(203, 207, 213, 0.88); --rotulo-bor: rgba(0, 0, 0, 0.12);
      --sub-bg: rgba(0, 0, 0, 0.05); --sub-bor: rgba(0, 0, 0, 0.10);
    }
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; background: var(--bg); color: var(--txt);
    font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
    min-height: 100vh; display: flex; flex-direction: column; text-transform: uppercase;
  }
  input, button { font-family: inherit; text-transform: uppercase; }
  header { display: flex; align-items: center; justify-content: space-between; padding: 4px 0 12px; border-bottom: 1px solid var(--bor); margin-bottom: 12px; }
  .logo { display: flex; align-items: center; gap: 8px; letter-spacing: 2px; font-size: 12px; font-weight: 700; }
  .punto { width: 8px; height: 8px; border-radius: 50%; background: var(--ac); box-shadow: 0 0 8px var(--ac); }
  .cab-btn {
    background: var(--sup); border: 1px solid var(--bor); border-radius: 4px;
    color: var(--txt); font-size: 10px; padding: 4px 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    min-width: 28px; min-height: 28px; transition: background 0.12s, border-color 0.12s;
  }
  .cab-btn:active { background: var(--alt); border-color: var(--ac); }
  .cab-acciones { display: flex; gap: 8px; align-items: center; }
  .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; padding-bottom: 24px; width: 100%; }
  .celda {
    aspect-ratio: 1; background: var(--alt); border: 1px solid var(--bor); border-radius: 4px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; overflow: hidden; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.35);
    transition: transform 0.08s ease, border-color 0.12s, box-shadow 0.12s;
  }
  .celda:active { transform: scale(0.94); border-color: var(--ac); box-shadow: 0 0 12px var(--ac); }
  .celda.ok { border-color: #22c55e !important; box-shadow: 0 0 12px rgba(34, 197, 94, 0.5) !important; }
  .celda.mal { border-color: #ef4444 !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.5) !important; }
  /* 100 — Confirmación de pulsación, la misma en las cinco superficies: el
     destello sube el brillo por encima del color; la onda lanza un anillo. */
  .celda.pulso-destello { animation: vd-mando-destello 440ms cubic-bezier(0.15, 0.75, 0.25, 1); }
  @keyframes vd-mando-destello {
    0% { filter: brightness(1); }
    22% { filter: brightness(1.5) saturate(1.15); }
    100% { filter: brightness(1); }
  }
  .celda.pulso-onda::after {
    content: ''; position: absolute; inset: 0; border-radius: 4px; border: 2px solid var(--ac);
    pointer-events: none; animation: vd-mando-onda 680ms cubic-bezier(0.1, 0.7, 0.2, 1) forwards;
  }
  @keyframes vd-mando-onda {
    0% { transform: scale(0.3); opacity: 0; }
    15% { opacity: 0.9; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  /* Con «reducir movimiento» se quita lo decorativo (el anillo); el destello
     corto se queda como confirmación. */
  @media (prefers-reduced-motion: reduce) {
    .celda.pulso-onda::after { display: none; }
    .celda.pulso-destello { animation-duration: 220ms; }
  }
  .pin-insignia { position: absolute; top: 4px; right: 4px; font-size: 8px; z-index: 3; opacity: 0.85; pointer-events: none; letter-spacing: 1px; color: var(--ac); font-weight: 700; }
  .mosaico-2x2 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; width: 100%; height: 100%; padding: 4px; }
  .sub-celda {
    background: var(--sub-bg); border: 1px solid var(--sub-bor); border-radius: 4px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; overflow: hidden; cursor: pointer; position: relative; user-select: none;
    padding: 2px; transition: transform 0.08s ease, border-color 0.12s, box-shadow 0.12s;
  }
  .sub-celda:active { transform: scale(0.92); border-color: var(--ac); }
  .sub-celda.ok { border-color: #22c55e !important; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4) !important; }
  .sub-celda.mal { border-color: #ef4444 !important; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4) !important; }
  .sub-txt { font-size: 8px; font-weight: 700; max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; pointer-events: none; letter-spacing: 0.5px; }
  .slider-celda { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 8px; }
  .slider-cab { display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 8px; font-weight: 700; color: var(--ten); gap: 4px; }
  .slider-eti { display: inline-flex; align-items: center; gap: 4px; }
  .slider-val { font-size: 8px; font-weight: 700; color: var(--ac); }
  .slider-control { width: 100%; -webkit-appearance: none; appearance: none; height: 8px; border-radius: 4px; background: var(--sup); outline: none; margin: 8px 0; }
  .slider-control::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 4px; background: var(--ac); cursor: pointer; box-shadow: 0 0 8px var(--ac); }
  .slider-control::-moz-range-thumb { width: 16px; height: 16px; border-radius: 4px; background: var(--ac); cursor: pointer; border: none; box-shadow: 0 0 8px var(--ac); }
  .fondo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.88; border-radius: inherit; pointer-events: none; }
  .marca-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; border-radius: inherit; pointer-events: none; }
  .icono-centro { font-size: 20px; line-height: 1; z-index: 1; font-weight: 700; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); pointer-events: none; }
  .rotulo {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 4px; background: var(--rotulo-bg);
    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border-top: 1px solid var(--rotulo-bor);
    border-radius: 0 0 4px 4px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; pointer-events: none; z-index: 2;
  }
  .label-txt { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sublabel-txt { font-size: 8px; color: var(--ten); letter-spacing: 0.5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .widget-vivo { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; z-index: 1; pointer-events: none; max-width: 100%; padding: 2px; }
  .wl1 { font-size: 12px; font-weight: 700; letter-spacing: 0.5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .wl2 { font-size: 8px; color: var(--ten); letter-spacing: 0.5px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  input { width: 100%; background: var(--sup); border: 1px solid var(--bor); border-radius: 4px; color: var(--txt); font-size: 24px; letter-spacing: 8px; text-align: center; padding: 12px; outline: none; margin-top: 12px; }
  input:focus { border-color: var(--ac); box-shadow: 0 0 8px var(--ac); }
  button.principal {
    width: 100%; margin-top: 12px; padding: 12px; background: var(--ac); border: none; border-radius: 4px;
    color: var(--btn-txt); font-size: 12px; font-weight: 700; letter-spacing: 2px; cursor: pointer; box-shadow: 0 4px 12px var(--ac-bg);
  }
  button.principal:active { transform: scale(0.98); }
  .pestanas { display: flex; gap: 8px; overflow-x: auto; padding: 0 0 12px; scrollbar-width: none; }
  .pestanas::-webkit-scrollbar { display: none; }
  .pest {
    flex: 0 0 auto; padding: 4px 12px; border: 1px solid var(--bor); background: var(--sup);
    border-radius: 4px; font-size: 8px; letter-spacing: 1px; color: var(--ten); cursor: pointer;
    font-weight: 700; transition: border-color 0.12s, color 0.12s, background 0.12s;
  }
  .pest.viva { border-color: var(--ac); color: var(--ac); background: var(--ac-bg); }
  p { font-size: 12px; line-height: 1.5; color: var(--ten); margin: 8px 0; }
  .mal { color: #ef4444; }
  #btn-olvidar { display: none; }
`;
}
