# Galería de perfiles

Esta hoja de ruta documenta cómo se publica un perfil en la galería pública de VirtualDeck y cómo lo consume la app.

---

## Modelo de hosting

La galería vive como JSONs estáticos en un repo público (idealmente GitHub Pages):

```
https://<owner>.github.io/virtualdeck-gallery/
  manifest.json           — índice (id, label, descripción, autor, URL del perfil)
  profiles/<id>.json      — DeckConfig serializado, listo para importar
```

`manifest.json` ejemplo:

```json
{
  "version": 1,
  "profiles": [
    {
      "id": "obs-streamer",
      "label": "OBS Streamer",
      "author": "@example",
      "description": "Setup completo para streaming en OBS — escenas, mute, brightness.",
      "url": "https://example.github.io/virtualdeck-gallery/profiles/obs-streamer.json",
      "tags": ["streaming", "obs"]
    }
  ]
}
```

## Importar desde URL en VirtualDeck

La app expone `api.config.import()` para JSONs locales. Para galería remota, el flujo equivalente:

1. UI muestra `manifest.json` en una pestaña "Galería" del flyout de configuración.
2. Al seleccionar un perfil, fetch del `url`, validación con `validateConfig`, y `api.config.save` si pasa.
3. Se mantiene el perfil actual antes del import como rollback (el sistema de backups de 3.1 ya lo cubre).

Por ahora la app solo importa archivos locales — extender a galería remota es un cambio acotado en `App.tsx:handleConfigImport` para aceptar URL en lugar de archivo.

## Validación

Cualquier perfil descargado pasa por `validateConfig`. Los errores se muestran como toast en la UI principal.

## Convenciones para autores

- Mantener `accent` y `wallpaper` neutros para no chocar con la preferencia del usuario.
- No incluir `imageData` con base64 grande — usar `brandIcon` o `customGlyph57` en su lugar (más livianos y coherentes con la firma).
- Documentar en `description` qué prerequisitos asume el perfil (ej. "requiere OBS instalado en `C:\Program Files\obs-studio\`").
- Para acciones con `globalHotkey`, sugerir sin imponer — el usuario debe revisar conflictos.

## Lo que ya hace la aplicación

⚙ → **GALERÍA DE PERFILES**: se pega la dirección de un `manifest.json`, sale la
lista, y al elegir uno se enseña **qué va a ejecutar** antes de importar.

La descarga la hace el proceso principal (`electron/main/galeria.ts`), no la
pantalla: la CSP del renderer solo deja conectar con `self` y los dos servicios
del clima, y un `fetch` desde la interfaz tumbaba la ventana.

Restricciones de la descarga, todas comprobadas:

- **Solo `https`.** Nada de `http` en claro.
- **Nada que apunte al propio equipo ni a la red interna**: `localhost`, `127.*`,
  `10.*`, `192.168.*`, `172.16-31.*`, `169.254.*` (esta última es donde viven los
  metadatos de las nubes). Sin esto, una entrada del manifiesto podría hacer que
  VirtualDeck pidiera cosas a la red interna en nombre del usuario.
- **Tope de 2 MB** y 10 s de espera.
- Las entradas del manifiesto con una `url` que no pase el filtro se descartan.

### El paso que de verdad importa

Un perfil **no son datos**: es código que se ejecutará cuando el usuario pulse
un botón. Antes de importar se muestra, sin recortar:

- cuántos botones trae,
- **cada programa** que abre,
- **cada script** que ejecuta, con su texto completo,
- los atajos globales que registrará en todo el sistema.

Se importa **como perfil**, nunca como configuración: el deck que ya está montado
no se toca, y para probarlo hay que cargarlo a mano.

### Ejemplo

En `docs/galeria-ejemplo/` hay un manifiesto y un perfil de muestra con la
estructura correcta. Una vez publicado el repositorio, sirven para probar el
flujo entero.

---

## Estado actual

- Repo de galería: **pendiente de crear** — es lo único que falta, y es una
  decisión del dueño del proyecto: qué perfiles se publican y con qué criterio.
- UI de "Importar desde URL": **hecha** (⚙ → Galería de perfiles).
- Manifest schema: **estable** desde la spec inicial (este doc).

### Lo que no se ha podido comprobar todavía

El camino completo —manifiesto real, elegir un perfil, importarlo— **no se ha
probado contra un servidor de verdad**, porque no hay ninguno publicado. Lo que
sí está medido: el rechazo de `http`, de `127.0.0.1`, de las tres redes privadas
y de `169.254.169.254`; una descarga `https` real que llega y se rechaza por
forma; y el resumen de riesgo sobre un JSON descargado de verdad.

En cuanto el repositorio exista, la prueba es pegar su `manifest.json` en el
campo y comprobar que la lista sale y que el aviso enseña los scripts.
