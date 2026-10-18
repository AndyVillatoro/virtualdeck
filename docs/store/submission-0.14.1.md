# Envío y Novedades a Microsoft Store — VirtualDeck 0.14.1

Documento unificado de entrega y novedades para la versión 0.14.1 (consolida las notas oficiales bilingües y la ficha técnica de submission).

- **Paquete generado**: `dist/VirtualDeck-0.14.1.msix` (120.5 MB)
- **Versión MSIX**: `0.14.1.0`
- **Fecha de compilación / release**: 2026-10-09
- **Canal de distribución**: Exclusivo Microsoft Store
- **Fuentes de texto**: `docs/store/novedades-0.14.1-es.txt`, `docs/store/novedades-0.14.1-en.txt` y `CHANGELOG.md`.

---

## 1. Verificaciones del Manifiesto Appx

- [x] Versión en manifiesto: `Version="0.14.1.0"`
- [x] MinVersion moderna (>= 10.0.17763.0): `MinVersion="10.0.17763.0"`
- [x] Protocolo URI registrado: `windows.protocol` (`virtualdeck://`)
- [x] Tarea de inicio con Windows: `windows.startupTask`
- [x] Capacidad de confianza total: `runFullTrust`

---

## 2. Novedades de esta versión (What's New)

Archivos individuales de texto plano listos para copiar y pegar:
- Español: [`docs/store/novedades-0.14.1-es.txt`](novedades-0.14.1-es.txt)
- English: [`docs/store/novedades-0.14.1-en.txt`](novedades-0.14.1-en.txt)

### Texto en Español (ES)

- **Vídeo nativo en el panel de música, en todos los formatos.** La resolución de captura se adapta al tamaño pintado en pantalla, bajando el consumo de CPU a un tercio (de 1,78 % a 0,64 %) sin perder nitidez. Disponible en el panel vertical estándar y en la barra alargada (1280x480), con botón `[VIDEO]`.
- **Detección de oclusión de ventana.** Aviso visual automático (`music.videoCongelado`) cuando otra ventana tapa el navegador que reproduce el vídeo y la imagen se congela.
- **Portada web y galería renovadas.** Transición de disolvencia dot-matrix al hacer scroll, consola táctil interactiva de 12 teclas, tráilers bilingües (ES/EN, ~41,7 s) y 11 banners en alta resolución (1080p).
- **Compilación automatizada de `vd-core`.** El núcleo nativo se compila e integra solo (`npm run build:store`) antes de empaquetar para la Store.
- **Soporte oficial y exclusivo en Microsoft Store.** Paquete MSIX firmado, con certificación oficial de Windows y actualizaciones fluidas y seguras. El instalador `.exe` / NSIS queda retirado: quien lo tenga debe pasarse a la Store, porque ya no recibirá actualizaciones automáticas.

### Texto en Inglés (EN)

- **Native video in the music panel, across all layouts.** Capture resolution adapts to the on-screen size, cutting CPU usage to one-third (from 1.78 % to 0.64 %) without losing crispness. Available in the standard vertical panel and in the ultrawide bar layout (1280x480), with a `[VIDEO]` button.
- **Window occlusion detection.** Automatic visual notice (`music.videoCongelado`) when another window covers the browser playing the video and the frame freezes.
- **Redesigned web showcase and gallery.** Scroll-driven dot-matrix dissolve transition, interactive 12-key touch console, bilingual trailers (ES/EN, ~41.7 s) and 11 high-resolution banners (1080p).
- **Automated `vd-core` build.** The native core is compiled and bundled automatically (`npm run build:store`) before packaging for the Store.
- **Official and exclusive Microsoft Store distribution.** Signed MSIX package with official Windows certification and seamless, secure updates. The `.exe` / NSIS installer is retired: anyone still on it must move to the Store, as it will no longer receive automatic updates.

---

## 3. Notas para la Certificación (Partner Center)

- Documentación de capacidades: Consultar [`docs/MICROSOFT-STORE.md`](../MICROSOFT-STORE.md) §4 (notas técnicas de `runFullTrust`) y §4.1 (versión concisa).
- Panel de control de Microsoft Store: [Partner Center Dashboard](https://partner.microsoft.com/dashboard/apps-and-games/overview)
