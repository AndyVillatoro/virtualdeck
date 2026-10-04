---
name: vd-check
description: Cómo ejecutar, interpretar y reparar `npm run check` en VirtualDeck — la cadena completa (tsc, depcruise, eslint) y los 6 guardianes (check-i18n, check-acciones, check-ipc, check-wiki, check-campos, check-perfiles). Úsalo antes de dar una tarea por terminada, antes de commit, o cuando `npm run check` falle y haya que diagnosticar.
---

# vd-check: interpretar `npm run check` en VirtualDeck

`npm run check` es **obligatorio antes de dar una tarea por terminada y antes de commit** (`CLAUDE.md` § Reglas sagradas del proyecto). Debe pasar con **0 errores**. Este skill explica qué hace cada eslabón, cómo leer su salida y dónde arreglar cada familia de fallos.

## 0. Qué es realmente `npm run check`

La cadena completa es (definida en `package.json`):

```
tsc --noEmit
→ depcruise src electron
→ eslint .
→ node scripts/check-i18n.mjs
→ node scripts/check-acciones.mjs
→ node scripts/check-ipc.mjs
→ node scripts/check-wiki.mjs
→ node scripts/check-campos.mjs
→ node scripts/check-perfiles.mjs docs/galeria-ejemplo/profiles docs/galeria-ejemplo/pages
```

Los 6 guardianes son scripts Node autocontenidos en `scripts/`. Convenciones comunes a todos:

- **Salida con errores**: imprimen `NOMBRE: N problema(s)` en stderr y **terminan con código de salida 1**. El pipeline se corta ahí (cada eslabón usa `&&`).
- **Salida limpia**: `NOMBRE: ok — resumen con contadores` en stdout y código de salida 0.
- Los problemas se listan como `  · <mensaje>` e incluyen siempre la ruta, el identificador o la línea implicados.
- Los guardianes son **lineales y deterministas**: leen archivos en crudo y comparan listas (tipos, claves, canales, páginas). No hay red, no hay estado, no hay flakiness — salvo `check-perfiles` cuando se le pasan URLs (ver §7).

Orden de diagnóstico recomendado: 1) `tsc` → 2) `depcruise` → 3) `eslint` → 4) guardianes en el orden de arriba. Un error de tipos puede ser la causa raíz de un falso positivo en un guardian (p. ej. un tipo renombrado a medias hace que `check-acciones` vea tipos huérfanos).

## 1. `tsc --noEmit` y `depcruise` (eslabones previos)

- **tsc**: errores de tipos TypeScript. Conocidos por fallar cuando se renombra un tipo/campo y no se actualiza un uso. Mensaje típico: `TS2339: Property 'x' does not exist on type '...'`.
- **depcruise** (`npx depcruise src electron`): dependencias circulares y violaciones de capas. Mensaje típico: `cycle: src/a.ts → src/b.ts → src/a.ts`. Arreglo: extraer lo compartido a un módulo de capa inferior, no invertir la flecha.

Los problemas del resto de este skill asumen que estos dos pasan.

## 2. `check-i18n.mjs` — paridad ES/EN y neutralidad de registro

**Qué audita** (6 grupos, en este orden): se lee `src/utils/idiomas/` (fragmentos `esComun/esEditor/esAcciones/esAjustes` + espejos `en*` + `campos.ts` con `FIELDS_EN`), más `electron/main/idioma.ts` y `electron/main/paginaMando.ts`. También se hace un barrido de **todo** `src/` y `electron/` buscando texto español visible que no pase por `t()`/`tf()`.

**Familias de fallos y dónde arreglar**:

| Mensaje | Causa | Dónde se arregla |
|---|---|---|
| `'clave' está N veces (la última gana)` | Clave duplicada en un fragmento | El fragmento ES/EN implicado |
| `EN: falta 'clave' (existe en ES)` / al revés | Clave añadida solo en un idioma | Añadir la misma clave al fragmento espejo |
| `ruta: t('x') no está en el diccionario ES` | Call `t()` con clave inexistente | Añadir la clave, o corregir el typo (cae a la clave literal en pantalla) |
| `ruta: tf('x') no está en FIELDS_EN` | `tf()` con texto sin entrada en `campos.ts` | Añadirlo a `FIELDS_EN`; si no, en inglés se vería el texto en español |
| `"...está en español y no pasa por t() ni tf()"` | Texto visible no envuelto en traductor (heurística: acentos, palabras funcionales, `PALABRAS_SUELTAS`) | Envolverlo en `t()`/`tf()` o añadir la clave al diccionario; **no** meter el literal en `PERMITIDOS` salvo que sea legítimamente bilingüe (p. ej. `VirtualDeck`) |
| `registro ES: "Hacé" (voseo)` / `tuteo` / `ícono` / `grilla` / `acá` / `snapear` | Registro prohibido en diccionarios | Reescribir en neutro formal (usted) |
| `'x' está en es y falta en en` (paginaMando) | Diccionario local del mando móvil desequilibrado | Añadir la clave a la otra mitad (`es`/`en`) de `TEXTOS` en `electron/main/paginaMando.ts` |
| `puntos: onb.N.title usa «X», que no está en GLYPHS_5x7` | Carácter sin glifo en la fuente de puntos (`DotText` dibuja un hueco) | Añadir el glifo a `GLYPHS_5x7` en `src/design.ts` |
| `puntos: <ruta> usa <DotText> y no está declarado en DOTTEXT_DECLARADOS` | Uso nuevo de `DotText` sin declarar | Añadir el archivo a `DOTTEXT_DECLARADOS` (y su clave a `CLAVES_EN_PUNTOS` si dibuja texto libre) |

Notas de interpretación:
- El barrido heurístico excluye `src/utils/i18n.tsx`, los diccionarios, `actionData.ts` y `brandIcons.ts` (datos sembrados que se copian tal cual al botón del usuario) y el `electron/main/idioma.ts`.
- No reporta falsos positivos en **comentarios** (los descarta), en **console.* del proceso principal** (solo el renderer enseña texto) ni en **templates** (mira solo el texto, ignora `${...}`).
- `DATOS_SEMBRADOS` y `PERMITIDOS` son listas cortas **a propósito**: si un mensaje te pide ampliarlas, sospecha del texto antes que de la lista.

## 3. `check-acciones.mjs` — cobertura de tipos de acción

**Qué audita**: cruza 6 inventarios que se escriben a mano:
1. `ActionType` en `src/types/actions.ts` (los tipos declarados).
2. Manejadores en `src/utils/acciones/*.ts` (el mapa que reemplazó al `switch` con `default: return OK` — antes un tipo sin implementar **no hacía nada y decía que había ido bien**).
3. `RESUELTAS_POR_EL_LLAMADOR` en `src/utils/acciones/index.ts` (tipos que resuelve la llamada, sin manejador).
4. `FORMULARIOS` en `src/screens/editor/formularios/index.tsx` (entrada de configuración en el paso 2 del editor).
5. `ACTION_TYPES` en `src/screens/editor/actionData.ts` (elegible en el paso 1 del editor).
6. Presets RGB: `RGB_PRESET_IDS` en `src/data/rgbPresets.ts` contra `SMART_PRESETS` en `electron/main/rgb.ts`, y `ACTION_TYPES` del validador en `src/utils/configMigration.ts`.

**Familias de fallos**:

| Mensaje | Significado | Arreglo |
|---|---|---|
| `'x' está en ActionType y nadie lo ejecuta` | Tipo declarado sin manejador ni resolución por llamador → botón mudo | Implementar manejador en `src/utils/acciones/` o añadirlo a `RESUELTAS_POR_EL_LLAMADOR` |
| `'x' tiene manejador Y está en RESUELTAS_POR_EL_LLAMADOR` | Doble ruta de ejecución | Quitar uno de los dos |
| `'x' tiene manejador pero no está en ActionType` / variantes | Inventarios desalineados | Añadir/eliminar el tipo de `ActionType` según el caso |
| `'x' no tiene entrada en FORMULARIOS` | Tipo ejecutable pero sin formulario → paso 2 del editor en blanco | Añadir entrada en `formularios/index.tsx` |
| `'x' no está en ACTION_TYPES` | No elegible en el paso 1 → no se puede crear desde el editor | Añadir `{ type: 'x', label: ... }` en `actionData.ts` |
| `el preset RGB 'x' ...` | Preset citado en el editor pero ausente en `SMART_PRESETS` (botón muerto) o al revés | Alinear `rgbPresets.ts` ↔ `electron/main/rgb.ts` |
| `'x' es un tipo de accion y falta en ACTION_TYPES` | Validador de importación obsoleto → un deck con ese tipo se **rechazaría entero** al importar | Añadirlo al `Set` en `src/utils/configMigration.ts` |

## 4. `check-ipc.mjs` — sincronía bipolar principal ↔ preload

**Qué audita**: los canales IPC se escriben por separado en los dos lados y solo se encuentran en runtime (son strings: `tsc` no los ve).
- Petición-respuesta: `ipcMain.handle/on('canal')` en `electron/main/` contra `ipcRenderer.invoke/send('canal')` en `electron/preload/index.ts`.
- Eventos principal→renderer: `webContents.send('evt')` contra `ipcRenderer.on('evt')`.
- Identidad de notificaciones: `APP_USER_MODEL_ID` en `electron/main/index.ts` contra `build.appId` de `package.json`.

**Familias de fallos**:
- `'c' tiene manejador pero no puente en el preload — nadie puede llamarlo`: falta el invoker en el preload.
- `'c' se invoca desde el preload y no tiene manejador — reventaría al usarse`: falta `ipcMain.handle/on`.
- `el evento 'x' se emite y el preload no lo escucha` / `el preload escucha 'x' y nadie lo emite`: desalineación de `webContents.send` ↔ `ipcRenderer.on`.
- `APP_USER_MODEL_ID es 'X' y build.appId es 'Y'`: Windows mostraría las notificaciones sin nombre ni icono de la app.

**Regla de oro al añadir un canal**: tocar SIEMPRE los dos lados en el mismo commit — manejador en `electron/main/` y puente en `electron/preload/index.ts`.

## 5. `check-wiki.mjs` — documentación técnica bilingüe

**Qué audita**: `docs/wiki/` (páginas `.md` + `_Sidebar.md`):
1. Ningún enlace interno `[texto](Pagina)` apunta a una página inexistente.
2. **Todos** los tipos de `ActionType` (excepto `none`) aparecen con backticks `` `tipo` `` en `Referencia-de-Acciones.md` **y** `Actions-Reference.md`.
3. Existen las 7 parejas ES/EN (`Home/Home-EN`, `Primeros-Pasos/Getting-Started`, `Guia-de-Uso/Usage-Guide`, `Referencia-de-Acciones/Actions-Reference`, `Widgets-y-Variables/Widgets-and-Variables`, `Sensores-y-RGB/Sensors-and-RGB`, `Atajos-y-Macros/Shortcuts-and-Macros`).
4. `_Sidebar.md` lista las 14 páginas con `(Pagina)`.

**Familias de fallos**:
- `enlace a 'x', que no existe`: typo en un link o página borrada sin actualizar.
- `Referencia-de-Acciones.md: sin documentar — a, b, c`: tipos nuevos sin referencia. Documentar en las **dos** referencias (ES y EN).
- `falta la página en español 'X'` / `falta la página en inglés 'X'`: pareja sin crear.
- `_Sidebar.md: no lista 'Pagina'`: menú lateral desactualizado.

## 6. `check-campos.mjs` — lo que lee el ejecutor se puede escribir

**Qué audita**: cruza los campos de `ButtonAction` en `src/types/actions.ts` (menos `type`, que no es configurable) contra dos universos:
- **leídos** por el ejecutor (`src/utils/acciones/` + `src/utils/actions.ts`, buscando `.campo`),
- **escritos** por alguna pantalla (`src/screens/` + `src/components/`, buscando `campo:`).

**Fallo único**: `'x' lo lee el ejecutor y **ninguna pantalla lo escribe** — el boton no haria esa parte y no lo diria`. Ejemplo histórico: `timerActions` se ejecutaba pero no había formulario que lo rellenara — el botón esperaba y no hacía nada **diciendo que había ido bien**.

**Arreglo**: añadir el control en el formulario del tipo (en `src/screens/editor/formularios/`) o en la pantalla que corresponda, de modo que el campo pueda escribirse. Si el campo se llama con un prefijo que rompe el match (`campo:` debe aparecer), revisar la sintaxis del objeto antes de tocar el guardian.

## 7. `check-perfiles.mjs` — integridad de perfiles de la galería

**Qué audita**: los JSON sembrados — en `npm run check` recibe `docs/galeria-ejemplo/profiles` (decks completos: `pages` + `buttons` + `accent` + `wallpaper`) y `docs/galeria-ejemplo/pages` (páginas sueltas de tienda: `{page, buttons}`). Verifica, recursivamente por botón/carpeta/cuadrante:
- `type` de cada acción ∈ `ActionType`; `widget` ∈ `TipoWidget`; `snapPosition` ∈ valores de `snapPosition`; `rgbPresetId` ∈ `RGB_PRESET_IDS`.
- Estructura: `id`/`label` string en cada botón, `page` válido, sin `id` repetidos, huecos de rejilla (`gridSize` 3–6, `gridRows` 1–8, sin botones de sobra).
- Sub-acciones anidadas: `branchThen`/`branchElse`/`timerActions`/`folderButtons`/`subButtons` (incluidos toggle-off y long-press).

**Familias de fallos**: `'x' no es un tipo de accion` (un perfil importado tendría botones muertos — la galería **no** valida tipos al importar), `id repetido`, `gridSize fuera de rango`, `N botones y solo caben M`.

**Uso extendido (fuera de `npm run check`)**: acepta URLs de manifiesto: `node scripts/check-perfiles.mjs https://.../manifest.json` descarga y revisa **cada perfil publicado** (requiere red, por eso no está en el pipeline). Al correrlo con archivos, usa `process.exitCode` (no `process.exit`) para no estrellar libuv en Windows. Si un perfil remoto falla, no es culpa de tu diff — el orquestador decidirá.

## 8. Interpretar la salida completa

Una ejecución perfecta termina con estas líneas (order: tsc/depcruise/eslint silenciosos salvo error, luego los guardianes):

```
i18n: ok — ES/EN N claves, FIELDS_EN M textos
acciones: ok — N tipos, M con manejador, ...
ipc: ok — N canales y M eventos, los dos lados cuadran
wiki: ok — N páginas, M parejas ES/EN, K tipos de acción documentados
campos: ok — N campos de accion, M los lee el ejecutor, todos rellenables
perfiles: ok — N revisado(s) contra ...
```

Si algo falla, el pipeline se corta en el primer eslabón rojo: **arregla ese y repite** (`npm run check` es idempotente y rápido, no hay incremental). Regla de entrega: 0 errores; un guardian en `process.exit(1)` al final del script blockea la entrega y el commit.

## 9. Trampas frecuentes al reparar

- **No silenciar el guardian**: ampliar `PERMITIDOS`/`DATOS_SEMBRADOS`/`DOTTEXT_DECLARADOS` es la última opción y requiere justificarlo en el commit; casi siempre es un texto que debería pasar por `t()`/`tf()`.
- **`npm run check` != `npm run build`**: el check no compila el bundle Electron/Vite. Tras pasar el check, si toca distribución se corre `npm run build` aparte.
- **Renombrados en cadena**: renombrar un tipo de acción toca `actions.ts`, `acciones/*.ts`, `formularios/index.tsx`, `actionData.ts`, `configMigration.ts`, las 2 referencias de la wiki y los perfiles JSON sembrados. El guardian te lo recordará uno a uno: confía en él.
- **Un canal IPC nuevo pero olvidado del preload**: `tsc` no lo ve (son strings). El único que lo detecta es `check-ipc`: siempre tocar ambos lados en el mismo cambio.