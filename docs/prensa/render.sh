#!/usr/bin/env bash
# Convierte docs/prensa/hero.svg en el vídeo de la ficha de la Store.
#
# ffmpeg NO sabe rasterizar un SVG animado: solo ve un archivo de texto. Hace
# falta un navegador que lo dibuje fotograma a fotograma, y de ahí ffmpeg junta
# los PNG. Por eso el SVG lleva la variable `--seek`: este script pausa las
# animaciones y le pone el instante de cada fotograma, así que el muestreo es
# exacto y reproducible (no depende de que el navegador vaya al día).
#
# Uso:  bash docs/prensa/render.sh [ruta-de-chromium]
#
# Salidas:  docs/prensa/hero.mp4  (1920×1080, H.264, 12 s)
#           docs/prensa/miniatura.png  (1920×1080)
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# FPS y SEGUNDOS se pueden bajar por entorno para una prueba rapida.
FPS="${FPS:-30}"
SEGUNDOS="${SEGUNDOS:-12}"
TOTAL=$((FPS * SEGUNDOS))
MINIATURA_EN=6.4        # segundo del que sale la miniatura: la pulsación
CUADROS="$AQUI/.cuadros"

CHROMIUM="${1:-${CHROMIUM:-}}"
if [ -z "$CHROMIUM" ]; then
  for c in chromium chromium-browser google-chrome google-chrome-stable \
           /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
    if command -v "$c" >/dev/null 2>&1; then CHROMIUM="$(command -v "$c")"; break; fi
    if [ -x "$c" ]; then CHROMIUM="$c"; break; fi
  done
fi
[ -n "$CHROMIUM" ] || { echo "No encuentro Chromium. Pasalo como argumento." >&2; exit 1; }

FFMPEG="${FFMPEG:-ffmpeg}"
command -v "$FFMPEG" >/dev/null 2>&1 || {
  echo "No encuentro ffmpeg (probá FFMPEG=/ruta/a/ffmpeg)." >&2; exit 1; }

rm -rf "$CUADROS"; mkdir -p "$CUADROS"

# El envoltorio existe solo para el render: mete el SVG en línea, para las
# animaciones y expone el instante por la URL. El SVG entregado no lleva ni una
# línea de JavaScript.
{
  cat <<'HTML'
<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0}
  svg{display:block;width:1920px;height:1080px}
  /* Pausadas: con --seek puesto, cada animacion se queda en ese instante
     porque su retardo pasa a ser negativo. */
  [data-vd-hero] *{animation-play-state:paused !important}
</style>
HTML
  cat "$AQUI/hero.svg"
  cat <<'HTML'
<script>
  const q = new URLSearchParams(location.search);
  const svg = document.querySelector('[data-vd-hero]');
  if (q.get('tema')) svg.setAttribute('data-theme', q.get('tema'));
  svg.style.setProperty('--seek', (q.get('t') || '0') + 's');
</script>
HTML
} > "$CUADROS/cuadro.html"

# Chromium se niega a arrancar como root con el sandbox puesto, y en un
# contenedor de CI se es root. Solo se abre un archivo local, asi que no hay
# nada que aislar; en una sesion normal no se toca.
EXTRA=()
[ "$(id -u)" = "0" ] && EXTRA+=(--no-sandbox)

TEMA="${TEMA:-dark}"
echo "Dibujando $TOTAL fotogramas (tema $TEMA)…"
for i in $(seq 0 $((TOTAL - 1))); do
  T=$(awk -v i="$i" -v f="$FPS" 'BEGIN{printf "%.4f", i/f}')
  "$CHROMIUM" --headless=new "${EXTRA[@]}" --disable-gpu --hide-scrollbars \
    --force-color-profile=srgb --window-size=1920,1120 \
    --virtual-time-budget=1500 \
    --screenshot="$(printf '%s/f%04d.png' "$CUADROS" "$i")" \
    "file://$CUADROS/cuadro.html?t=$T&tema=$TEMA" >/dev/null 2>&1 \
    || { echo; echo "Chromium fallo en el fotograma $i. Repetilo sin >/dev/null para ver por que." >&2; exit 1; }
  [ -s "$(printf '%s/f%04d.png' "$CUADROS" "$i")" ] \
    || { echo; echo "El fotograma $i salio vacio." >&2; exit 1; }
  printf '\r  %d/%d' "$((i + 1))" "$TOTAL"
done
echo

# 1920×1080 exactos, H.264, 12 s (el máximo de la Store son 60 s).
# El `crop` no es cosmetico: Chromium en headless descuenta ~40 px de la ventana
# para el viewport y rellena la captura por abajo, asi que la PNG viene 1920x1120
# con una franja. Por eso se pide la ventana 40 px mas alta y se recorta: el
# fotograma sale 1:1 con el viewBox, sin reescalar.
# yuv420p + profile high/level 4.0 es lo que aceptan los reproductores de la
# ficha; faststart pone el índice al principio para que empiece sin descargarlo
# entero.
"$FFMPEG" -y -framerate $FPS -i "$CUADROS/f%04d.png" \
  -vf "crop=1920:1080:0:0,format=yuv420p" \
  -c:v libx264 -profile:v high -level:v 4.0 -preset slow -crf 20 \
  -movflags +faststart -r $FPS -an \
  "$AQUI/hero.mp4"

# Miniatura: el mismo fotograma que se ve con prefers-reduced-motion.
"$FFMPEG" -y -ss $MINIATURA_EN -i "$AQUI/hero.mp4" -frames:v 1 \
  "$AQUI/miniatura.png"

echo "Listo: hero.mp4 y miniatura.png en $AQUI"
"$FFMPEG" -hide_banner -i "$AQUI/hero.mp4" 2>&1 | grep -E 'Duration|Stream'
