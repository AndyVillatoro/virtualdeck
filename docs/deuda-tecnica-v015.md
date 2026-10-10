# Auditoría de deuda técnica y pendientes — v0.15 (2026-10-09)

Escaneo completo del repo para identificar **código duplicado, archivos
innecesarios o viejos (locales y en git) y markdown dispersos**, con la
condición de **no romper ningún guardián de `npm run check`**
(tsc + depcruise + eslint + 7 `check-*`).
Solo propone; no borra ni mueve nada.

> Alcance medido: `git ls-files` = 334 `src/`, 166 `docs/`, 82 `electron/`,
> 43 `crates/`, 28 `scripts/`. Rama `main`, commit `03e13e8`.
> Hay trabajo sin commitear de la v0.15 (companion, ver §2): este informe
> **no lo toca**.

## 0. Resumen ejecutivo

| # | Hallazgo | Acción propuesta | Riesgo guardián |
|---|---|---|---|
| 1 | 315 archivos en `_referencias/`, 23 en `opencode-export/`, 1 en `auditorias/`, `.opencode/.archivado-20260925/`, `dist/`, `out/`, `target/`, `native/`, 2 stashes viejos | Limpieza **solo local** (están en `.gitignore`; nada de `git rm`) | Nulo (eslint los ignora) |
| 2 | 8 rutas sin commitear de la Companion Extension + `docs/WHATS_NEW_0.14.1.md` | **No borrar**: commitear en la rama de la v0.15 | Nulo si se comitean juntas |
| 3 | `src/types.ts`, `src/data/brandIcons.ts` parecen duplicados | **No tocar**: son shims intencionales documentados | Alto si se borran (cientos de imports + `catalogoMarcas`) |
| 4 | 7 archivos >600 líneas con lógica real (launcher, media, rgb, useEstadoEditor, PanelInspectorControl, sistema.tsx, App…) + 6 al borde (570–583) | Refactorizar por extracción, **no borrar** | Nulo si se extrae sin cambiar exports (knip/depcruise vigilan) |
| 5 | Solapamientos parciales: PanelMusica/Barra, mando móvil (5 archivos), motor DOT (5 archivos), `sensors.ts` que volvió a crecer | Refactorizar / documentar, **no borrar** | Medio (IPC, i18n y paridad los cruzan) |
| 6 | 13 `.md` sueltos en `docs/` + `WHATS_NEW` sin commitear + `EXPORTAR-CONFIG.md` (habla de OpenCode, no de la app) + `README-web.md` + `PARIDAD.md` (derivado) + `galeria.md` vs `galeria-ejemplo/` | Centralizar según §6 | Nulo (ningún `check-*` lee `docs/*.md` salvo wiki/galería/paridad) |
| 7 | Docs desactualizadas: `CONTRIBUTING.md` (habla del `.exe`), `ARQUITECTURA.md` (sin companion), `ROADMAP.md` (estado general con fecha 2026-09-14) | Actualizar texto, no borrar archivos | Nulo |
| 8 | Stash `wip-t-rev-05` redundante (avisado en HANDOFF) + 1 stash viejo de `task/p1-hw-streamdock` | `git stash drop` local tras verificar | Nulo |

Regla de oro para todo lo de abajo: **lo ignorado por git se limpia en
disco; lo trackeado se refactoriza; lo untracked de la v0.15 se commitea.
Nada se borra a ciegas.**

---

## 1. Metodología

1. `git ls-files` vs `git status --porcelain` vs `git check-ignore -v`
   para separar **trackeado / untracked / ignorado**.
2. Conteo de líneas en `src/` + `electron/` trackeados (tope: 600 líneas,
   complejidad 18; `max-lines`/`complexity` son `warn`, no bloquean).
3. Duplicados exactos por hash SHA256 en `src/`, `electron/`, `scripts/`:
   **cero duplicados byte a byte**. Lo que hay es solapamiento parcial,
   que se analiza caso por caso (§4–§5).
4. Lectura de cabeceras de los `.md` dispersos y de la config de cada
   guardián (`scripts/check-*.mjs`, `eslint.config.mjs`,
   `.dependency-cruiser.cjs`, `knip.json`) para marcar qué toques romperían
   qué guardián (§8).
5. Este archivo vive en `docs/deuda-tecnica-v015.md` a propósito:
   ningún guardián lo lee (`check-wiki` solo mira `docs/wiki/`, eslint
   ignora `docs/`, tsc ignora `.md`), así que el propio informe es
   seguro por construcción.

## 2. Trabajo en curso v0.15: NO borrar, commitear

`git status` trae 8 rutas `??` + 13 `M` que son la Companion Extension en
curso. Eliminar cualquiera de ellas rompería la feature a medias. Lo que
falta es commitearla junta en su rama, no limpiarla.

| Ruta untracked | Qué es | Por qué se queda |
|---|---|---|
| `companion-extension/` (10 archivos: `manifest.json`, `background.js`, `content.js`, `offscreen.*`, `popup.*`, `icons/`, `README.md`) | Extensión MV3 del Ítem 114 | Feature v0.15 en curso |
| `electron/main/companion/` (`estadoCompanion.ts`, `servidorCompanion.ts`) | Servidor companion en el main | Idem |
| `electron/main/ipc/companionIpc.ts` | Puente IPC companion | Idem; además `ARQUITECTURA.md` aún no lo lista (§7) |
| `src/types/companion.ts` | Tipos del protocolo companion | Idem |
| `src/components/settings/CompanionSection.tsx` | Sección de Ajustes | Idem |
| `src/screens/main/musica/useCompanionStream.ts` | Hook de stream companion | Idem |
| `scripts/generate-companion-icons.mjs` | Generador de iconos de la extensión | Hermano de `generate-icon.js` / `generate-hero.mjs`; commitear con la feature |
| `docs/WHATS_NEW_0.14.1.md` (45 líneas) | Notas de la 0.14.1 ES/EN | Decidir destino antes de commit: plegar en `CHANGELOG.md` o mover a `docs/store/` (ver §6) |

Modificados (`M`) del mismo esfuerzo: `electron/main/index.ts`,
`electron/main/ipc/index.ts`, `electron/preload/index.ts`,
`src/types/{config,index,ipc}.ts`, `src/utils/idiomas/es|en{Comun,Ajustes}.ts`,
`src/components/settings/PanelAjustes.tsx`,
`src/screens/main/musica/VideoVentana.tsx`, `docs/ROADMAP.md`.
No se auditan como deuda: son el diff vivo de la v0.15.

## 3. Limpieza solo local (gitignored): nada de `git rm`

Todo lo de esta tabla está en `.gitignore` (verificado con
`git check-ignore -v`). Ocupa disco y ruido en el explorador, pero
**no existe en git**: la acción es borrar o podar en local, nunca
`git rm`, y ningún guardián lo mira (eslint ignora `_referencias/`,
`auditorias/`, `opencode-export/`).

| Ruta | Tamaño medido | Acción local propuesta |
|---|---|---|
| `_referencias/` (315 archivos: `encargos/` ~70, `informes/`, `trailer/`) | la mayor bolsa de ruido | Podar por oleadas: primero `encargos/` con `DONE` en el tablero (T-REV-*, T-MUS-*, T-DOC-*, T-ART-01* ya cerrados); conservar `T-PIP-01`, `T-TND-03`, `T-VID-03` (`CLAIMED`) y `_reglas-2026-10-08.md`. Alternativa mínima: no borrar nada, pero no moverlo a `docs/` (contaminaría el repo publicado) |
| `opencode-export/` (23 archivos) | export de config global con rutas de usuario | Mantener ignorado; si estorba, borrar el zip/dup local. **Nunca versionar** (lo dice el propio `.gitignore`) |
| `auditorias/2026-09-26-sesion-01.md` | 1 archivo | Mantener ignorado (hallazgos de seguridad sin parchear en repo público). Borrar solo si el dueño confirma que ya se aplicó |
| `.opencode/.archivado-20260925/` (`mimo-worker.md`, `mimo-fallback/SKILL.md`) | 2 archivos | Ya archivado y sin efecto; borrar en local si no se consulta |
| `dist/` (incluye `store-submission-0.13.0.md`, `store-submission-0.14.1.md`, `win-unpacked/`) | build + desempaquetado | Regenerable con `npm run build:store`. La fuente versionada es `docs/store/submission-0.14.1.md`; los de `dist/` son salida local |
| `out/`, `target/`, `native/`, `node_modules/`, `build/` | artefactos de build | Regenerables (`build`, `build:native`, `npm ci`). No tocar a mano salvo falta de disco |
| `docs/prensa/.cuadros/`, `docs/prensa/hero.mp4`, `docs/prensa/miniatura.png` | salida de `render.sh` | Ya ignorados; se regeneran, no se respaldan |
| Stash `stash@{0}` (`wip-t-rev-05`, T-REV-05) | copia redundante avisada en HANDOFF | `git stash drop` tras confirmar que los 4 archivos restaurados están en `main` (el propio HANDOFF dice **NO hacer `pop`**) |
| Stash `stash@{1}` (`task/p1-hw-streamdock`, `ce34d1e`) | resto de fase 1b | Revisar diff y dropear si ya está en `main` |

## 4. Falsos duplicados: shims intencionales que NO se tocan

Parecen "archivos redundantes con código duplicado" y no lo son.
Borrarlos rompería cientos de imports y al menos dos guardianes.

| Archivo | Realidad | Si se borra, rompe |
|---|---|---|
| `src/types.ts` (8 líneas: `export * from './types/index'`) | Shim de compatibilidad hacia `src/types/` | `tsc` en todo el repo (cientos de `from '../../types'`) |
| `src/data/brandIcons.ts` (10 líneas: `export * from '../comun/brandIcons'`) | Shim documentado: los datos viven en `src/comun/` porque el main los necesita y `electron/main` no puede importar de `src/data`; conserva la ruta vieja + el chunk diferido de `utils/catalogoMarcas` | `tsc` + runtime del catálogo diferido |
| `DotText.tsx` vs `DotLabel.tsx` | **No duplicados**: `DotText` dibuja puntos en canvas 5×7 (reloj, títulos grandes); `DotLabel` es texto CSS con la fuente `VD.dots` (rotulitos). Ambos con uso masivo y distinto (§5 de `grep`: `DotLabel` en ~20 pantallas, `DotText` en reloj/kiosko/onboarding) | UI en ~20 pantallas |
| `src/comun/brandIcons.ts` (1543 líneas) | Datos, no lógica: exento de `max-lines` por nombre en `eslint.config.mjs`. No se parte | Nada (pero partirlo no aporta: lo dice el propio comentario de la config) |
| `src/data/presetsDock.ts` (813), `src/data/plantillasApp.ts` (520) | Datos bajo `src/data/**`, también exentos de `max-lines` | `check-paridad` / editor si se tocan los campos |

## 5. Solapamientos parciales reales: refactorizar, no borrar

Ninguno es un duplicado exacto (hash limpio); son capas o variantes que
comparten responsabilidad y conviene estrechar. Ordenados por retorno.

### 5.1 Panel de música: 3 archivos que son 2 variantes + 1 adaptador

- `src/screens/main/PanelMusica.tsx` (218) importa a
  `src/screens/main/musica/PanelMusicaBarra.tsx` (224): el estándar
  reutiliza al de barra en algún formato. No son dos paneles gemelos por
  accidente, pero 442 líneas para "lo que suena" piden una pasada.
- `src/screens/main/PanelesMusica.tsx` (41) es solo el adaptador lateral
  (`PanelMusicaLateral`): correcto, no se toca.
- Candidatos a extraer a `musica/`: la decisión de formato
  (`useFormatoPantalla` ya existe), el bloque de transporte dentro de la
  carátula y el cableado de `video`/`recortes`. Guardianes afectados si se
  mueven campos: `check-paridad` (`musicPanel.*`) y `check-i18n`
  (`music.video*`).

### 5.2 Mando móvil en el main: 5 archivos, 1 al borde

`paginaMando.ts` (559) + `vivoMandoPagina.ts` (207) +
`tactilMandoPagina.ts` (102) + `estiloMandoPagina.ts` (141) +
`iconosMando.ts` (450). La división por responsabilidad es sana (página /
vivo / táctil / estilo / iconos); el problema es solo que `paginaMando.ts`
roza el tope (559/600) y `iconosMando.ts` (450) crece con cada marca.
Propuesta: al añadir la companion (§2), no engordar `paginaMando.ts`;
el nuevo `companion/` ya va por buen camino. Extraer el constructor del
slider (`sliderPuntosMovil`, hoy en `vivoMandoPagina.ts`) y el bloque de
iconos sería el siguiente corte natural. Quedó anotado en HANDOFF que el
CSS `.slider-control` de `estiloMandoPagina.ts` puede estar muerto tras
T-REV-19: verificar con `grep` antes de borrar (es de una línea, no de un
archivo).

### 5.3 Motor DOT: 5 piezas en 3 capas, bien separadas pero confusas

`dot480/efectosPuntos.js` (motor) + `efectosPuntos.d.ts` (tipos) +
`animacionPuntos.ts` (fachada `botonEfectivo`/`matrizDeBoton`) +
`useAnimacionPuntos.ts` (hook React) + `useAnimacionLcd.ts` (573, lado
superficie) + `animacionLcd.ts` (133, GIF vía `ImageDecoder`, nombre
casi idéntico al hook). No hay duplicado funcional, pero los dos últimos
nombres invitan al error. Propuesta mínima: renombrar
`animacionLcd.ts` → `gifLcd.ts` (o documentar la diferencia en la
cabecera) y comprobar que `useAnimacionLcd.ts` no reimplementa la
decodificación del GIF sino que la consume.

### 5.4 Sensores: el split funcionó y ya se está revirtiendo

HANDOFF registra `sensors.ts` 596 → 240 con `sensors-parser.ts` extraído.
Hoy `sensors.ts` mide **393** y el parser 215. Creció ~150 líneas desde el
split (posiblemente companion + ACL/HTTP). Propuesta: antes de que vuelva
a 600, extraer el ciclo HTTP/ACL a `sensors-http.ts` y dejar `sensors.ts`
como fachada fina. Verificar con `npm run check` (depcruise vigila que
`electron/main` no importe `src/` salvo tipos/comun).

### 5.5 Otros pares revisados y archivados como "no duplicado"

- `describirAccion.ts` (261, inspector del dock) vs
  `tienda/tiendaUtils.ts` (101, riesgo de la tienda): dominios distintos.
- `usePulsacionRaton.ts` vs `usePulsacionTactil.ts`: gestos distintos por
  diseño (documentado en sus cabeceras). No unificar.
- `PanelInspectorControl.tsx` (611) vs `SelectorPresetsControl.tsx`:
  inspector vs selector, no gemelos; el primero sí es candidato a split
  (§6 de gigantes).
- `configMigration.ts` (531): migraciones versionadas acumulativas; no se
  parte por estética (partirlo rompe la trazabilidad de versiones).

## 6. Archivos gigantes: plan de división sin cambiar comportamiento

`max-lines`/`complexity` son `warn` (no bloquean `npm run check`), así que
esto es deuda, no emergencia. Exentos por config: `src/data/**` y
`src/comun/brandIcons.ts`. El resto, por orden de cercanía al tope:

| Archivo (líneas) | Corte propuesto |
|---|---|
| `electron/main/launcher.ts` (772) | Separar ejecución (apps/URLs/carpetas) de scripts/voz/`speak`/`cycle_window`; el IPC ya vive en `launcherIpc.ts`, así que el corte es interno |
| `electron/main/media.ts` (726) | Separar lectura SMTC (`nowPlaying`/timeline) de control (play/pause/next/prev) y de `diagnose` (que queda en PowerShell a propósito) |
| `electron/main/rgb.ts` (724) | Separar conexión OpenRGB de perfiles/efectos; `rgbIpc.ts` ya es el borde |
| `src/screens/editor/useEstadoEditor.ts` (635) | Extraer `applyPreset`/`applyDockPreset` (tocados en T-REV-20) a `usePresetsEditor.ts` |
| `src/screens/dispositivos/PanelInspectorControl.tsx` (611) | Extraer inspector por familia de control (perilla/botón/tira) o el pie de riesgo; espejo de lo hecho con `App.tsx` → `VistasSecundarias`/`OverlaysApp` |
| `src/screens/editor/formularios/sistema.tsx` (583) | Partir por subfamilia (el resto de `formularios/` ya va por familia: `basicos`, `datos`, `rgb`, `compuestos`) |
| `src/App.tsx` (582) | Ya se dividió una vez (475 → 582 con la companion); vigilar, no volver a engordar: lo nuevo va a `screens/` o a `useAppShortcuts.ts` |
| `src/utils/superficies/useSuperficies.ts` (580) | Extraer `paginaSegunApp` ya existe como módulo; siguiente corte: despacho de tecla (`despachoTecla.ts` ya existe, mover llamadas) |
| `src/utils/superficies/useAnimacionLcd.ts` (573) | Separar el programador de fotogramas del resolvedor de matrices |
| `src/screens/MainB.tsx` (571) | Extraer `main/` ya iniciado (`PanelesMusica`, `BarraLateral`…); siguiente: `MenuContextualPagina` / `OverlayCarpeta` ya existen, mover más cableado |
| `electron/main/paginaMando.ts` (559) | Ver §5.2 |
| `src/screens/dispositivos/PestanasSuperficie.tsx` (556), `editor/VistaPreviaPiezas.tsx` (552), `editor/EditorSubdivision2x2.tsx` (550) | Cada uno roza el tope por una sola responsabilidad grande (pestañas / piezas de preview / 2×2): partir el subcomponente mayor a su carpeta, no reescribir |

Nota: `src/utils/configMigration.ts` (531), `plantillasApp.ts` (520, dato
exento), `rgb/piezas.tsx` (506) quedan como vigilancia, no como tarea.

## 7. Markdown dispersos: centralizar para ser ordenado

### 7.1 Mapa actual (trackeado)

- Raíz (5): `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CLAUDE.md`,
  `THIRD_PARTY_NOTICES.md`. Correcto: la raíz queda así, no se añade más.
- `docs/` sueltos (13): `AGENT_COMMUNICATION.md`, `HANDOFF.md`,
  `ARQUITECTURA.md`, `ROADMAP.md`, `NOTAS-TECNICAS.md`, `PARIDAD.md`,
  `EXPORTAR-CONFIG.md`, `README-web.md`, `galeria.md`,
  `MICROSOFT-STORE.md`, `index.html`, `privacidad.html`, `.nojekyll`
  (+ este informe).
- `docs/` carpetas (8): `archivo/`, `galeria-ejemplo/` (ejemplos que lee
  `check-perfiles`; **no mover**), `investigacion/` (2: openDeck +
  companion, base de la v0.15), `prensa/` (471 archivos: PNG ES/EN +
  generadores HTML), `store/` (5: fichas + novedades + submission),
  `video/` (4: tráilers + VTT), `web/` (3: `site.css`, `site.js`,
  `galeria.js`), `wiki/` (26: la wiki pública bilingüe).
- Sin commitear: `docs/WHATS_NEW_0.14.1.md`.

### 7.2 Propuestas (ninguna rompe guardianes)

1. **Notas de versión en un solo sitio.** Hoy viven en tres:
   `CHANGELOG.md` (fuente), `docs/store/novedades-*.txt` (fichas) y el
   nuevo `docs/WHATS_NEW_0.14.1.md`. Propuesta: plegar `WHATS_NEW` en el
   `CHANGELOG` o moverlo a `docs/store/novedades-0.14.1.md` junto a sus
   `.txt` fuente; no crear una cuarta convención (`WHATS_NEW_*` por
   versión en `docs/`).
2. **`docs/EXPORTAR-CONFIG.md` no es de la app.** Describe cómo migrar la
   config global de OpenCode entre PCs (generado por
   `scripts/export-opencode-config.ps1`). Propuesta: moverlo a
   `opencode-export/README.md` (ya existe y habla de lo mismo) o a la wiki
   de contribuidores; en `docs/` confunde con la doc del producto.
3. **`docs/README-web.md` → `docs/web/README.md`.** Describe `index.html`
   + `web/` + `privacidad.html`; hoy está separado de lo que describe.
   El movimiento es solo git (`git mv`), sin cambio de contenido.
4. **`docs/PARIDAD.md` es derivado**: su cabecera dice que se regenera
   desde `scripts/paridad.json` y que manda el JSON. No se edita a mano;
   si se centraliza algo, es el generador, no el `.md`.
5. **`docs/galeria.md` vs `docs/galeria-ejemplo/`.** Nombres parecidos,
   cosas distintas: el `.md` es el protocolo de publicación, la carpeta
   son los JSON de ejemplo que valida `check-perfiles`. Propuesta mínima:
   un encabezado cruzado en ambos ("protocolo aquí, ejemplos allá"), no
   renombrar (el guardián invoca la ruta literal
   `docs/galeria-ejemplo/profiles` en `package.json`).
6. **`docs/prensa/` (471 archivos) está bien donde está**, pero sus PNG
   ES/EN duplican peso (~22 banners × 2 idiomas + capturas raíz). No se
   borran (son la ficha de la Store y la web); si el repo pesa, la palanca
   es `git lfs` o recorte de resolución, nunca borrar un idioma.
7. **`docs/video/trailer-*.mp4`**: binarios versionados a propósito (hero
   de `docs/index.html`). Se quedan; no mover a `_referencias/` (allí
   vive el material de trabajo, aquí el publicado).
8. **`docs/investigacion/`**: 2 archivos vigentes para la v0.15
   (`extension-companion.md`, `auditoria-opendeck.md`). Al cerrar los
   Ítems 114/115, archivar a `docs/archivo/` como ya se hizo con el
   HANDOFF histórico.
9. **`docs/store/`**: 5 archivos coherentes (fichas + novedades +
   submission). No disperso; poner aquí también las futuras novedades
   (punto 1).

### 7.3 Docs desactualizadas (actualizar texto, no borrar)

| Archivo | Desfase detectado |
|---|---|
| `CONTRIBUTING.md` (505 líneas) | HANDOFF pendiente #6: sigue describiendo `build:installer`, el `.exe` en el release y la firma. Pasar a "solo Store" |
| `docs/ARQUITECTURA.md` | Tabla de IPC sin `companionIpc`/`capturaIpc` nuevos ni `electron/main/companion/`; al commitear la companion, añadir sus filas (el mapa es el índice maestro del roadmap) |
| `docs/ROADMAP.md` | "Estado general (2026-09-14)" con una versión vieja; el ritual y los ítems están al día, pero la foto fija confunde |
| `docs/NOTAS-TECNICAS.md` | Sin sección companion (normal: la feature no está commiteada); añadirla al cerrar la v0.15 |
| `docs/EXPORTAR-CONFIG.md` | Zips `20260919-0158` viejos; si se queda en `docs/`, regenerar o fechar |

## 8. Matriz guardián-seguro (qué se puede tocar sin romper `npm run check`)

| Guardián | Qué vigila | Toque prohibido sin actualizarlo | Toque seguro |
|---|---|---|---|
| `tsc` | Tipos en `src/` + `electron/` | Borrar `src/types.ts`, `src/data/brandIcons.ts`, o exports usados | Extraer a módulos nuevos manteniendo exports; añadir `.md` |
| `depcruise` | Capas (main↔renderer, components→screens, utils→UI, comun puro) | Mover código cruzando capas; `screens/` en `components/` | Splits dentro de la misma capa; este informe |
| `eslint` (+ `max-lines`/`complexity` warn) | Estilo + olores SRP; ignora `out/`, `dist/`, `scripts/`, `opencode-export/`, `_referencias/`, `auditorias/` | `VD`/`VD_LIGHT` directo en UI; `#fff` en interfaz | Todo lo de §3 y §7 |
| `check-i18n` | Paridad ES/EN + `t()` con entrada | Borrar claves en uso; mover textos a otro idioma sin pareja | Podar `_referencias/`; mover `.md` fuera de `src/` |
| `check-acciones` | Cada tipo con manejador + formulario | Quitar un tipo o su formulario | Splits que conserven `MANEJADORES` y `FORMULARIOS` |
| `check-ipc` | Canales main ↔ preload | Renombrar canales sin los dos lados | Añadir `companionIpc` con sus dos lados + tipos en `src/types/ipc.ts` |
| `check-wiki` | Solo `docs/wiki/` (parejas ES/EN, tipos documentados, sidebar) | Borrar/renombrar páginas wiki; quitar un `` `tipo` `` de las referencias | Este informe; mover `.md` fuera de `wiki/` |
| `check-campos` / `check-paridad` | Campos rellenables y su matriz por superficie (`scripts/paridad.json`) | Añadir campo de botón sin decidir su paridad | Refactors sin campos nuevos |
| `check-perfiles` | `docs/galeria-ejemplo/profiles` + `pages/` | Mover/renombrar esa carpeta | Todo lo demás |
| `knip` (`lint:dead`) | Exports/tipos huérfanos | Dejar exports sin uso al extraer | Extraer y re-exportar lo usado (hoy: 0 huérfanos) |

## 9. Plan de ejecución sugerido (oleadas seguras)

1. **Oleada 0 — local, hoy, sin commit**: podar `_referencias/encargos/`
   DONE, `dist/` regenerable, drops de stash tras verificar. Cero riesgo.
2. **Oleada 1 — docs, un commit**: `WHATS_NEW` → `docs/store/`,
   `README-web.md` → `docs/web/README.md`, encabezados cruzados
   galería/protocolo, `CONTRIBUTING.md` a solo-Store,
   `ARQUITECTURA.md` + companion al commitear la feature. Solo `.md`:
   ningún guardián los lee (salvo wiki/galería/paridad, que no se tocan).
3. **Oleada 2 — splits, un commit por archivo**: `sensors.ts` (HTTP
   fuera), `useEstadoEditor.ts` (presets fuera), `PanelInspectorControl`
   (familias fuera), `launcher`/`media`/`rgb` por dominio. Cada uno con
   `npm run check` + `npm run build` en verde antes del siguiente.
4. **No hacer**: `git rm` de ignorados, borrar shims (§4), renombrar
   `docs/galeria-ejemplo/`, borrar un idioma de prensa, "unificar"
   DotText/DotLabel o ratón/táctil, tocar LMH empaquetado.

## 10. Verificación de este informe

- No se modificó código: solo se crea `docs/deuda-tecnica-v015.md`.
- Por construcción no afecta a ningún guardián (§1.5): fuera de
  `docs/wiki/`, fuera de `src/`/`electron/`/`scripts/`, sin campos,
  canales, tipos ni claves nuevas.
- Pendiente del dueño: elegir destino de `WHATS_NEW_0.14.1.md` (§7.2.1)
  y confirmar el borrado local de `_referencias/` DONE y de los stashes.
