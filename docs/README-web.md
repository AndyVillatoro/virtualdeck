# La página de promoción

`docs/index.html` es la página pública. Se sirve con **GitHub Pages desde
`main` / carpeta `/docs`**, así que se actualiza sola con cada `git push`: no hay
rama aparte que mantener ni paso de publicación que se pueda olvidar.

`.nojekyll` está para que Pages sirva la carpeta tal cual. Sin él, Jekyll intenta
procesar los `.md` de al lado y puede tardar o fallar en el despliegue.

**Efecto lateral que conviene saber:** con este montaje, los documentos de
`docs/` (ARQUITECTURA, ROADMAP, el staging del wiki) quedan también accesibles
por URL. No es un problema —el repositorio es público y ya se leen en GitHub—
pero si algún día hay que evitarlo, la alternativa es una rama `gh-pages` con
solo el HTML dentro.

Los enlaces de descarga apuntan a `/releases/latest`, no a un número de versión:
publicar una versión nueva no obliga a tocar la página.
