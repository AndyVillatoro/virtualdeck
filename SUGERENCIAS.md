# VirtualDeck — Hoja de ruta y sugerencias

Documento generado tras la pasada de convergencia de UI y la eliminación del monitor de sistema (`MonitorB` + `systeminformation`). Las propuestas están agrupadas por área y priorizadas con un costo aproximado (S = pequeño, M = medio, L = grande) y un beneficio (★ = útil, ★★ = importante, ★★★ = diferencial del producto).

---

## 1. Funcionalidades nuevas — alto impacto

### 1.2 Variables y estado entre botones ★★ · M
Hoy cada botón es independiente. Una capa de variables persistentes (`{vol}`, `{lastApp}`, contadores) permite hacer flujos: un botón incrementa, otro lo lee. Implementación: añadir `state: Record<string, any>` al `DeckConfig` y soportar interpolación `{var}` en `appArgs`, `url`, `script`, `clipboardText`, `typeText`. Habilita usos como contador de tomas de stream, contador pomodoro, recordar el último audio device.

### 1.3 Acciones condicionales / encadenadas ★★ · M
El sistema ya tiene `actions: ButtonAction[]` con un delay fijo de 150ms entre pasos. Ampliarlo a:
- Delay configurable por paso.
- Condicional: ejecutar paso B solo si A devolvió éxito.
- Bucles (`repeat: 3`) para hotkeys o macros tipo "presiona TAB 5 veces".

### 1.4 Disparadores externos (triggers) ★★ · L
Que un botón pueda activarse sin clic: hotkey global del SO, tray menu, `vd://` deep-link, llamada HTTP local. Esto convierte a VirtualDeck en un "automatizador con UI" en lugar de solo un panel de botones.
### 1.5 Tipos de acción por agregar ★ · S–M cada uno

- **Discord Rich Presence / push-to-talk toggle**.
- **Spotify/YouTube Music control vía API** (más allá de teclas multimedia).
- **Webhook genérico** (POST con cuerpo JSON y headers configurables).
- **Comando de voz/TTS** (lee el clipboard, dicta texto).
- **Captura de región a portapapeles**.

---

## 2. UX y editor

### 2.1 Editor de matriz de puntos para iconos personales ★★ · M
La firma del producto son los puntos 5×7. Permitir al usuario *dibujar* su propio glifo 5×7 (o 8×8) en `EditorB` y usarlo como icono del botón. Ya existe `BrandIconEditor` para bitmaps mayores; añadir una variante que respete la grilla 5×7 sería coherente con la identidad y barata de implementar.

### 2.2 Búsqueda global de botones ★★ · S
Un Ctrl+K que muestre overlay con todos los botones de todas las páginas, filtrables por label/acción. Ahorra tiempo cuando el deck crece a 8 páginas × 16 botones.

### 2.4 Pegar imagen desde portapapeles ★ · S
Hoy la imagen de fondo del botón se carga por archivo. Permitir Ctrl+V dentro de `EditorB` reduciría fricción.

### 2.5 Drag & drop entre páginas ★ · M
Arrastrar un botón a la pestaña de otra página y soltar — copia o mueve. Hoy solo se reordena dentro de la misma página.

### 2.6 Historial visible (undo) ★ · S
Existe `Ctrl+Z` (20 entradas en `historyRef`), pero el usuario no sabe qué deshace. Mostrar un toast pequeño al deshacer ("se restauró: botón VOLUMEN") aumenta confianza.


### 2.8 Vista previa al editar ★ · S
Mientras el usuario cambia label/icono/colores en `EditorB`, mostrar una réplica del `ButtonCell` con esos cambios en tiempo real. Más que un preview estático, una *celda viva*.

---

## 3. Calidad de vida y robustez

### 3.1 Backups automáticos del config ★★ · S
Hoy `config.save` sobrescribe directo. Conservar últimos 5 backups con timestamp en `userData/backups/`. Recuperación de un mal import o un perfil borrado.

### 3.2 Validación de import ★ · S
Al importar un JSON, validar el shape antes de aplicarlo. Mostrar errores claros ("falta el campo `pages`") en lugar de fallo silencioso o crash.

### 3.3 Toasts de error visibles ★ · S
Si `launch.app` falla porque la ruta no existe, hoy se silencia. Capturar y mostrar un toast (`VirtualDeck` ya tiene infraestructura de toast en `MainB`).

### 3.5 Migración de versiones del config ★ · S
Hoy si se cambia el shape de `DeckConfig`, configs viejos pueden romper. Añadir `configVersion` y un migrador (`migrate(v1 → v2)`) preventivo.

---

## 4. Performance y deuda técnica

### 4.1 Bundle de íconos de marca diferido ★★ · M
`src/data/brandIcons` y `src/components/BrandIconDisplay` son grandes. Cargar el catálogo solo cuando el usuario abre `BrandIconPicker` (dynamic import) reduce el bundle inicial y el tiempo de arranque en frío.

### 4.2 Memoización de `ButtonCell` ★ · S
La grilla re-renderiza todas las celdas cuando cambia un solo botón. `React.memo(ButtonCell)` con comparación por `id + button + toggled` debería ser inmediato.

### 4.3 Centralizar polling de `nowPlaying` ★ · S
Hoy `MainB` y `FullscreenB` tienen su propio interval. Un único provider en `App.tsx` que comparta el estado evita doble fetch al PowerShell de media.

### 4.4 Reemplazar `localeDateString` con formateadores reutilizables ★ · S
El reloj formatea en cada tick. Crear `Intl.DateTimeFormat` una sola vez y reutilizarlo.

### 4.5 Limpiar archivos huérfanos en raíz ★ · S
`VirtualDeck Brand Icons.html`, `VirtualDeck Icons.html`, `test_main.js` y la carpeta `out/` no comiteada. Decidir cuáles documentan y cuáles se eliminan o se mueven a `docs/`.

### 4.6 Aplicar la escala `VD.radius` / `VD.shadow` al resto de componentes ★ · S
La pasada de convergencia tocó `ButtonCell`, `TitleBar`, `App`. Faltan `EditorB`, `BrandIconEditor`, `BrandIconPicker`, `WallpaperB`, `WeatherWidget` — usan radios y sombras hardcoded. Una segunda pasada cierra el sistema.

### 4.7 Restablecer la unidad base de spacing ★ · M
El sistema usa 4/6/8/10/12/14/16 sin disciplina. Definir base = 4 y refactorizar a múltiplos da consistencia perceptiva. Esto es refactor, no urgente, pero compuesto en el tiempo evita drift.

---

## 5. Diseño e identidad

### 5.1 Tipografía de identidad en el reloj ★★ · S
El reloj de la sidebar y de la fullscreen ya usan estilos distintos (mono vs DotText). Estandarizar: el reloj **siempre** en `DotText` — refuerza la firma. Es un cambio de 5 líneas y notable visualmente.

### 5.2 Wallpaper "scanlines" o "grid CRT" ★ · S
Dentro del registro retro-tech, agregar uno o dos wallpapers procedurales (scanlines sutiles, grid de CRT con leve flicker). Coherentes con la matriz de puntos.

### 5.3 Animación de press más con carácter ★ · S
Hoy `flash` es 300ms de cambio de fondo. Reemplazar con un pulso radial o un "barrido" de puntos encendiéndose desde el centro. Usa el sistema dot ya existente.

### 5.4 Sonido al press configurable ★ · S
Existe el toggle on/off, pero el sonido es uno solo. Permitir elegir entre 3-4 timbres ("click mecánico", "tick", "thud", "off").

### 5.5 Modo "kiosko" para fullscreen ★ · M
La fullscreen actual sigue siendo "ventana grande". Un modo kiosko real (sin barra superior, click derecho deshabilitado, salida solo con clave) lo vuelve útil para una tablet vieja convertida en panel dedicado.

---

## 6. Distribución y comunidad

### 6.1 Galería de perfiles compartibles ★★ · L
`Profile` ya es exportable. Si se añade un repositorio público (GitHub Pages estático con JSONs) donde los usuarios suben sus perfiles ("setup OBS streamer", "setup productividad", "setup gaming"), se acelera la adopción y crea efecto de red. Costo bajo si se usa solo un repo + manifiesto.

### 6.2 Auto-update ★ · M
Hoy la app se distribuye como `--dir`. Activar `electron-updater` con un canal de releases en GitHub permite empujar fixes sin pedir reinstalación.

### 6.3 Empaquetado firmado ★ · M
Sin firma, Windows muestra SmartScreen warning. Firmar con un certificado (incluso uno self-signed para amigos) elimina la barrera psicológica.

### 6.4 Documentación en `docs/` ★ · S
Una guía de usuario (`docs/guia.md`), guía de desarrollo (`docs/desarrollo.md`) y referencia de acciones (`docs/acciones.md`). Reduce preguntas repetidas y facilita contribuciones.

---

## Priorización sugerida (próximas 4 iteraciones)

| Iteración | Foco | Items |
|-----------|------|-------|
| **1 — limpieza** | Cerrar la convergencia visual | 4.6, 4.5, 5.1, 4.2 |
| **2 — UX core** | Quitar fricción de uso diario | 2.2 (búsqueda), 2.5 (drag entre páginas), 3.1 (backups), 3.3 (toasts de error) |
| **3 — diferencial** | Lo que ningún competidor pequeño tiene | 1.1 (mando móvil) o 1.2 (variables) — elegir uno |
| **4 — comunidad** | Empezar a generar tracción externa | 6.4 (docs), 6.1 (galería), 6.2 (auto-update) |

---

## Cosas a NO hacer (lecciones de esta sesión)

- **No reintroducir polling pesado de sistema.** El monitor de procesos consumía recursos por `systeminformation` (binarios nativos + polling cada 2.5s). Si en algún momento se necesita CPU/RAM, hacerlo opt-in con un widget aislado y polling >10s, no como infraestructura siempre encendida.
- **No agregar dependencias nativas sin justificación clara.** Cada `node-gyp` aumenta tamaño, tiempo de instalación y superficie de bugs en Windows.
- **No multiplicar la paleta.** El sistema de tokens en `src/design.ts` es la fuente de verdad. Cualquier color nuevo se discute primero como token.
- **No romper la firma dot-matrix.** Es lo que distingue a VirtualDeck de cualquier otro launcher genérico.
