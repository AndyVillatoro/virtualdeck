# Prensa — animación de cabecera

| Archivo | Qué es |
|---|---|
| `hero.svg` | La animación. Un solo archivo, sin librerías, **sin JavaScript**, 65 KB. Bucle de 12 s. |
| `vista.html` | Lo enseña sobre fondo oscuro y claro a la vez. Se abre a doble clic, no hace falta servidor. |
| `render.sh` | Convierte `hero.svg` en `hero.mp4` + `miniatura.png` para la ficha de la Store. |

Los tres los genera `scripts/generate-hero.mjs` (`npm run build:hero`) — **no se editan a mano**.
La retícula sale de `GLYPHS_5x7` (`src/design.ts`), así que el generador **falla** si la
palabra usa una letra que la fuente de puntos no tiene, en vez de dibujar un hueco en
silencio como hace `DotText`.

## El guion (12 s, en bucle)

| Tramo | Qué pasa |
|---|---|
| 0–3 s | La retícula se enciende, escalonada, y los puntos se juntan hasta componer «VIRTUALDECK». |
| 3–6 s | Los mismos puntos se reordenan en una rejilla de 4×4 botones (cada botón es un anillo de 7×7 puntos). |
| 6–9 s | Se pulsa el botón de la fila 2, columna 2: destello radial y una onda que se propaga hacia fuera. |
| 9–12 s | Todo se dispersa otra vez y vuelve al principio. |

Los 384 puntos son **los mismos** en las cuatro fases: 160 de tinta y 224 de trama (las celdas
apagadas de la matriz, como el `apagado` de `DotText`). Nada aparece ni desaparece; solo se mueve.
El destello usa los mismos números que `vd-flash-pulse` / `vd-flash-radial` en `src/index.css`.

## Accesibilidad

- **Nada parpadea**: cada elemento cambia una vez por ciclo de 12 s (0,08 Hz), muy por debajo
  del límite de 3 Hz que mira la Store.
- **`prefers-reduced-motion: reduce`** apaga todas las animaciones y deja el fotograma de la
  pulsación: la rejilla de 4×4 con el botón encendido. El *último* fotograma del bucle está
  en negro — quieto no diría nada, así que se queda el último que se lee.

## Temas

Los colores son variables CSS con los tokens de `src/design.ts` (`bg`, `text`, `accent`).
Por defecto sigue a `prefers-color-scheme`, y `data-theme="light"` / `data-theme="dark"` en el
`<svg>` lo fuerza — que es lo que hace `vista.html` para enseñar los dos a la vez.

Un `<img src="hero.svg">` es **otro documento**: solo obedece al tema del sistema, no al de la
página. Para forzar el tema hay que incrustar el SVG en línea.

## El vídeo de la ficha de la Store

`ffmpeg` **no sabe rasterizar un SVG animado**: solo ve un archivo de texto, y no tiene motor
de CSS. Hacen falta dos pasos — un navegador dibuja los fotogramas y ffmpeg los junta:

```bash
bash docs/prensa/render.sh            # los dos pasos, de una
TEMA=light bash docs/prensa/render.sh # la variante en claro
```

El SVG lleva una variable `--seek` justo para esto: el script pausa las animaciones y le pone
el instante de cada fotograma, así que el muestreo es exacto y reproducible en vez de depender
de que el navegador vaya al día. Los comandos que ejecuta, si los querés a mano:

```bash
# 1) 360 fotogramas (12 s a 30 fps) con Chromium headless.
#    La ventana se pide 40 px más alta a propósito: en headless, Chromium le
#    descuenta ~40 px al viewport y rellena la captura por abajo. De ahí el crop.
for i in $(seq 0 359); do
  chromium --headless=new --disable-gpu --hide-scrollbars \
    --force-color-profile=srgb --window-size=1920,1120 --virtual-time-budget=1500 \
    --screenshot="$(printf 'cuadros/f%04d.png' "$i")" \
    "file://$PWD/docs/prensa/.cuadros/cuadro.html?t=$(awk -v i=$i 'BEGIN{printf "%.4f", i/30}')&tema=dark"
done

# 2) MP4: 1920x1080 exactos, H.264, 12 s (la Store admite hasta 60 s).
ffmpeg -y -framerate 30 -i cuadros/f%04d.png \
  -vf "crop=1920:1080:0:0,format=yuv420p" \
  -c:v libx264 -profile:v high -level:v 4.0 -preset slow -crf 20 \
  -movflags +faststart -r 30 -an \
  docs/prensa/hero.mp4

# 3) Miniatura 1920x1080: el mismo fotograma que se ve con prefers-reduced-motion.
ffmpeg -y -ss 6.4 -i docs/prensa/hero.mp4 -frames:v 1 docs/prensa/miniatura.png
```

`crop` en vez de `scale`: el fotograma ya viene a 1920×1080 y reescalar solo lo ablandaría.
`yuv420p` y `profile high` / `level 4.0` son lo que aceptan los reproductores de la ficha;
`+faststart` pone el índice al principio para que arranque sin descargarlo entero.

## Una advertencia sobre el encuadre

La composición va **centrada** en el lienzo de 1920×1080. La ficha de la Store puede
superponer cosas en el **tercio de abajo** (ver `docs/MICROSOFT-STORE.md` § 5.4), y ahí cae el
borde inferior de la rejilla. Lo que hay que leer —el nombre y el botón pulsado— queda en el
medio, así que no se pierde nada; pero si en algún momento se añade texto a la animación, no va
abajo.

`hero.mp4` y `miniatura.png` **no están en el repositorio**: son salida, se regeneran con el
script y pesan de más para versionarlos.
