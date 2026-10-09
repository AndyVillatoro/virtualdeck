# La página de promoción

`docs/index.html` es la página pública, bilingüe ES/EN en el mismo archivo
(se cambia con `data-es` / `data-en`, se recuerda en `localStorage`).
El estilo vive en `docs/web/site.css`, la lógica en `docs/web/site.js`
(idioma, registro, tráiler, consola) y la galería por scroll en
`docs/web/galeria.js` (lienzo con transición de puntos + zoom leve).
`docs/privacidad.html` es la política de privacidad que pide la Microsoft Store.

## Estructura de la portada

Hero con tráiler (`video/trailer-es|en.mp4`, ruta reservada para los finales;
el reproductor cambia de idioma con la página) y consola DOT → galería por
scroll (11 banners de `docs/prensa/banners/es|en/`, `?v=` contra la caché,
`?foto=N` enlaza a una captura) → características y dispositivos (banners) →
novedades (`FEATURES` en `site.js`) → descarga solo Store → specs → pie.

## Publicar

GitHub Pages desde **`main` / carpeta `/docs`**. Con eso la página se actualiza
sola en cada `git push`: no hay rama aparte que mantener ni paso que olvidar.
`.nojekyll` está para que Pages sirva la carpeta tal cual — sin él, Jekyll
intenta procesar los `.md` de al lado y el despliegue puede tardar o fallar.

Efecto lateral que conviene saber: con este montaje los documentos de `docs/`
(ARQUITECTURA, ROADMAP, el staging del wiki) quedan también accesibles por URL.
No es un problema —el repositorio es público y ya se leen en GitHub— pero si
alguna vez hay que evitarlo, la alternativa es una rama `gh-pages` con solo el
HTML dentro.

## Qué se queda viejo aquí

La página no ofrece descargas: el único botón de instalación apunta a la
Microsoft Store, y la versión que se muestra sale del tag del release de GitHub
(sin adjuntos). Publicar una versión nueva **no** obliga a tocar la página, salvo
sumar su bloque al registro `FEATURES` de `site.js` (hoy llega hasta la v0.14.0).
Lo que sí se queda viejo es el texto, y ya pasó dos veces:

- decía **«LibreHardwareMonitor, que viene incluido»**, y se dejó de empaquetar
  hace tiempo (ver CLAUDE.md);
- decía **36 tipos de acción** cuando ya eran 37.

Al añadir o quitar una capacidad, mírela.
