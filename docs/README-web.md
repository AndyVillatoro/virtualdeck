# La página de promoción

`docs/index.html` es la página pública, bilingüe ES/EN en el mismo archivo
(se cambia con `data-es` / `data-en`). `docs/privacidad.html` es la política de
privacidad que pide la Microsoft Store.

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
sumar su bloque al registro `FEATURES` del script (hoy llega hasta la v0.13.0).
Lo que sí se queda viejo es el texto, y ya pasó dos veces:

- decía **«LibreHardwareMonitor, que viene incluido»**, y se dejó de empaquetar
  hace tiempo (ver CLAUDE.md);
- decía **36 tipos de acción** cuando ya eran 37.

Al añadir o quitar una capacidad, mírela.
