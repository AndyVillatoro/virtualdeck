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

## Manifiesto v2: páginas sueltas y versiones (T-P4)

Una entrada puede traer una **página suelta** en vez de un deck completo, con
versión y requisitos. Los campos nuevos son opcionales: sin `kind` la entrada
es un perfil, como en v1.

```json
{
  "id": "obs-mini",
  "kind": "page",
  "label": "OBS Mini",
  "author": "@example",
  "description": "Una página para OBS: grabar, mute y reloj.",
  "url": "https://example.github.io/virtualdeck-gallery/pages/obs-mini.json",
  "tags": ["obs"],
  "targetApp": "obs64",
  "version": "1.0.0",
  "minAppVersion": "0.12.0",
  "requires": ["OBS instalado"]
}
```

- `kind`: `"profile"` (deck completo) o `"page"` (una página para agregar
  sin tocar el deck). El archivo de una página trae `{ "page": {...},
  "buttons": [...] }`, igual que una página exportada desde la app.
- `version`: versión del contenido. La app guarda de dónde vino cada
  perfil/página para avisar updates.
- `minAppVersion`: la app bloquea la instalación con un aviso si es más vieja.
- `targetApp`: proceso destino (ej. `"obs64"`); al instalar, la página hereda
  el auto-perfil si coincide.
- `requires`: requisitos en texto libre que se enseñan antes de instalar.

Al agregar una página, los atajos globales que choquen con los que ya hay se
quitan y se avisa cuántos fueron. El aviso de riesgo enseña además lo que se
ejecuta solo (temporizadores, sensores) y otros efectos al pulsar (voz, cierre
de apps, portapapeles, Discord/Spotify).

- `readme`: nota del autor en texto plano, se enseña tal cual en la ficha.
- `readmeUrl`: dirección de un texto del autor (mismo filtro `https` y tope de
  64 KiB que el resto; se trae al abrir la ficha).

## Tienda en ventana propia (T-P4 Fase 2)

⚙ → **GALERÍA** → **ABRIR TIENDA**: el manifiesto en ventana aparte
(`index.html#tienda`, patrón de la barra flotante), con buscador por
nombre/autor/texto, filtros por tipo (perfil/página), app destino y etiquetas,
ficha con nota del autor + riesgo completo, e insignias de **INSTALADO** y
**UPDATE → vX** comparando cada entrada con el `origen` sellado al instalar.

La tienda no escribe configuración: pide instalar por `tienda:import` y la
ventana principal valida (forma + tipos de acción conocidos, igual que la
galería empotrada) y aplica con las mismas funciones. La respuesta vuelve por
`tienda:hecho`; cada guardado reavisa a la tienda para que las insignias se
actualicen solas.

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

- Repo de galería: **existe** (`github.com/AndyVillatoro/virtualdeck-gallery`,
  `manifest.json` con 4 perfiles en formato v1: esencial, streaming, trabajo, rgb).
  Los 4 validan en verde con `npm run check:galeria` (tipos, widgets, presets).
- UI de "Importar desde URL": **hecha** (⚙ → Galería de perfiles) y tienda `#tienda`.
- Manifest schema: **estable** desde la spec inicial (este doc) + v2 (páginas,
  versiones, README) soportado por la app.
- Diferido a otra versión por decisión del dueño: dejar la galería bien completa
  (versionado v2 de las entradas para activar los avisos UPDATE, más perfiles).

### Lo comprobado contra el servidor de verdad

El manifiesto se baja, las 4 entradas pasan el filtro y cada perfil valida su
forma y sus tipos con el guardián en vivo. Lo que falta por clicar en la app:
pegar la URL, ver la lista, abrir la ficha y comprobar que el aviso enseña los
scripts.
