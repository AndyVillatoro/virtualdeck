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
  "requires": ["OBS instalado"],
  "icono": "obsstudio"
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
- `icono`: icono DOT de la entrada: id del catálogo 16×16 (`src/data/iconosDot`,
  ej. `"obsstudio"`, `"layout-grid"`) o nombre de glifo 8×8 (ej. `"IMPORT"`).
  Local, sin red: no se descarga nada (se recorta a 64 caracteres).
- `portada`: imagen de portada de la entrada. Solo `https`, con el mismo filtro
  que `url` (nada de `http` en claro, ni localhost ni red interna).
- `capturas`: capturas de pantalla de la entrada. Solo `https` con el mismo
  filtro que `url`; como mucho 6 (el resto se descarta).

## Tienda en ventana propia (T-P4 Fase 2)

⚙ → **TIENDA** → **ABRIR TIENDA**: el manifiesto en ventana aparte
(`index.html#tienda`, patrón de la barra flotante), con buscador por
nombre/autor/texto, filtros por tipo (perfil/página), app destino y etiquetas,
ficha con nota del autor + riesgo completo, e insignias de **INSTALADO** y
**UPDATE → vX** comparando cada entrada con el `origen` sellado al instalar.

La tienda no escribe configuración: pide instalar por `tienda:import` y la
ventana principal valida (forma + tipos de acción conocidos) y aplica con las
mismas funciones. La respuesta vuelve por
`tienda:hecho`; cada guardado reavisa a la tienda para que las insignias se
actualicen solas.

## Importar desde la tienda en VirtualDeck

La app importa JSONs locales con `api.config.import()`, y perfiles/páginas remotos con la tienda:

1. **⚙ → TIENDA → ABRIR TIENDA**: se abre el catálogo en ventana propia (`#tienda`).
   Sirve la galería del proyecto y cualquier otra que usted o alguien de
   confianza aloje: se pega la dirección de su `manifest.json`, sale la lista
   y, al elegir una entrada, se enseña **qué va a ejecutar** antes de importar
   (ver más abajo). Trae además buscador por nombre/autor/texto, filtros por
   tipo (perfil/página), app destino y etiquetas, ficha con nota del autor y
   riesgo completo, e insignias de INSTALADO y UPDATE comparando cada entrada
   con el `origen` sellado al instalar.

Valida con `validateConfig` y aplica como perfil o como página suelta, nunca como configuración (el deck montado no se toca; para probarlo hay que cargarlo a mano). El backup anterior al import lo cubre el sistema de backups.

## Validación

Cualquier perfil descargado pasa por `validateConfig`. Los errores se muestran como toast en la UI principal.

## Convenciones para autores

- Mantener `accent` y `wallpaper` neutros para no chocar con la preferencia del usuario.
- No incluir `imageData` con base64 grande — usar `iconoPuntos` (catálogo 16×16), `brandIcon` o `customGlyph57` en su lugar (más livianos y coherentes con la estética DOT).
- Documentar en `description` qué prerequisitos asume el perfil (ej. "requiere OBS instalado en `C:\Program Files\obs-studio\`").
- Para acciones con `globalHotkey`, sugerir sin imponer — el usuario debe revisar conflictos.

## Lo que ya hace la aplicación

⚙ → **TIENDA** → **ABRIR TIENDA**: se abre el catálogo en ventana propia, sale la
lista, y al elegir una entrada se enseña **qué va a ejecutar** antes de importar.

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
- UI de "Importar desde URL": la galería empotrada de Ajustes se retiró; queda
  solo la tienda `#tienda` (⚙ → TIENDA → ABRIR TIENDA), que también acepta
  pegar la dirección de cualquier `manifest.json`.
- Manifest schema: **estable** desde la spec inicial (este doc) + v2 (páginas,
  versiones, README) soportado por la app.
- Diferido a otra versión por decisión del dueño: dejar la galería bien completa
  (versionado v2 de las entradas para activar los avisos UPDATE, más perfiles).

### Lo comprobado contra el servidor de verdad

El manifiesto se baja, las 4 entradas pasan el filtro y cada perfil valida su
forma y sus tipos con el guardián en vivo. Lo que falta por clicar en la app:
pegar la URL, ver la lista, abrir la ficha y comprobar que el aviso enseña los
scripts.
