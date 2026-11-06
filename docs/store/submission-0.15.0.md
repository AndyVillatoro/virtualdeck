# Envío y Novedades a Microsoft Store — VirtualDeck 0.15.0

Documento unificado de entrega y novedades para la versión 0.15.0 (consolida las notas oficiales bilingües y la ficha técnica de submission).

- **Paquete objetivo**: `dist/VirtualDeck-0.15.0.msix`
- **Versión MSIX**: `0.15.0.0`
- **Canal de distribución**: Exclusivo Microsoft Store
- **Fuentes de texto**: [`docs/store/novedades-0.15.0-es.txt`](novedades-0.15.0-es.txt), [`docs/store/novedades-0.15.0-en.txt`](novedades-0.15.0-en.txt) y [`CHANGELOG.md`](../../CHANGELOG.md).

---

## 1. Verificaciones del Manifiesto Appx

- [ ] Versión en manifiesto: `Version="0.15.0.0"` (se genera con `npm run build:store -- --bump minor`)
- [x] MinVersion moderna (>= 10.0.17763.0): `MinVersion="10.0.17763.0"`
- [x] Protocolo URI registrado: `windows.protocol` (`virtualdeck://`)
- [x] Tarea de inicio con Windows: `windows.startupTask`
- [x] Capacidad de confianza total: `runFullTrust`

---

## 2. Novedades de esta versión (What's New)

Archivos individuales de texto plano listos para copiar y pegar en Partner Center:
- Español: [`docs/store/novedades-0.15.0-es.txt`](novedades-0.15.0-es.txt)
- English: [`docs/store/novedades-0.15.0-en.txt`](novedades-0.15.0-en.txt)

### Texto en Español (ES)

- **Compatibilidad con plugins de Stream Deck.** Instala complementos en un clic desde la nueva pestaña de Plugins en la Tienda (con verificación SHA-256), asígnalos a teclas y perillas, y utiliza los seis plugins incluidos (reloj, cronómetro, dado, pomodoro, contador y conversor).
- **Extensión compañera del navegador (VirtualDeck Companion).** Captura directa de vídeo y metadatos desde pestañas de YouTube, Spotify Web y Twitch sin congelarse al cubrir o cambiar de ventana.
- **Conmutador de salida de audio y acción «ciclo» (`cycle`).** Cambia de dispositivo de sonido mostrando el icono reactivo de la salida activa y encadena múltiples acciones secuenciales en un mismo botón.
- **Mejoras en docks físicos y mando móvil.** Apagado/reposo automático por inactividad y al bloquear Windows, giros de perilla ultrarrápidos (~2 ms por paso), eventos de dial para plugins y visualización de carátulas de plugins en el teléfono.
- **Arranque más ligero y tecla «volver» automática.** El bundle inicial se reduce en más de un 30 % (de 747 a 504 KiB) y al vincular una página a una aplicación se añade automáticamente un botón «VOLVER» con el icono en puntos del programa.

### Texto en Inglés (EN)

- **Stream Deck plugin support.** Install plugins in one click from the new Plugins tab in the Store (with SHA-256 verification), assign them to keys and dials, and use the six bundled plugins (clock, stopwatch, dice, pomodoro, counter, and converter).
- **Browser companion extension (VirtualDeck Companion).** Direct tab-level video and metadata capture from YouTube, Spotify Web, and Twitch without freezing when windows are covered or switched.
- **Audio output switcher and "cycle" action.** Switch sound devices with a reactive icon matching the active output, and chain multiple sequential steps into a single button.
- **Physical docks and mobile remote upgrades.** Automatic screen sleep on idle and Windows session lock, ultra-fast knob turns (~2 ms per step), dial events for plugins, and live plugin artwork on the mobile remote.
- **Lighter startup and automatic "back" key.** Initial bundle size drops by over 30% (from 747 to 504 KiB), and linking a page to an app automatically places a "VOLVER" button featuring the app's dot-matrix icon.

---

## 3. Notas para la Certificación (Partner Center)

- Documentación de capacidades: Consultar [`docs/MICROSOFT-STORE.md`](../MICROSOFT-STORE.md) §4 (notas técnicas de `runFullTrust`) y §4.1 (versión concisa).
- Panel de control de Microsoft Store: [Partner Center Dashboard](https://partner.microsoft.com/dashboard/apps-and-games/overview)
