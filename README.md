# VirtualDeck

**Tu Stream Deck por software para Windows.** Una grilla de botones configurables que
disparan acciones: abrir apps, webs y carpetas, cambiar el dispositivo de audio,
controlar la música, ejecutar atajos, scripts y macros, y más — todo con una identidad
visual retro de matriz de puntos. 100% local, gratis y sin cuentas.

> Electron 33 · React 18 · TypeScript · Vite 5 · Windows 10/11

---

## Características

- **Botones de acción** — apps, URLs, carpetas, atajos de teclado, scripts, audio, media, brillo, TTS, webhooks, macros y más.
- **Páginas y grilla** configurables, con drag & drop dentro y entre páginas.
- **Widgets en vivo** en los botones — reloj, clima, sensores del PC, música actual y variables.
- **Variables y plantillas** — contadores e interpolación `{var}` en cualquier acción.
- **Macros** de teclado/ratón con grabador global.
- **RGB** (OpenRGB) y **sensores** (LibreHardwareMonitor embebido).
- **Pantalla completa / kiosko**, multi-idioma (ES/EN), temas claro/oscuro, auto-update.

## Instalación

Descargá el instalador desde [Releases](https://github.com/AndyVillatoro/virtualdeck/releases)
(`VirtualDeck-Setup-X.Y.Z.exe`). Si Windows muestra SmartScreen: "Más información →
Ejecutar de todas formas" (el binario aún no está firmado).

## Documentación

- **Guía de usuario (wiki, ES/EN):** https://github.com/AndyVillatoro/virtualdeck/wiki
- **Para desarrollar:** [CONTRIBUTING.md](CONTRIBUTING.md) — workflow, commits, release, firma.
- **Arquitectura (mapa SRP):** [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- **Roadmap (qué sigue, una mejora por sesión):** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Historial de cambios:** [CHANGELOG.md](CHANGELOG.md)

## Desarrollo rápido

```bash
npm install
npm run dev              # desarrollo con hot reload
npx tsc --noEmit         # typecheck
npm run build            # compila renderer + main + preload
npm run build:installer  # genera dist/VirtualDeck-Setup-{version}.exe
```

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para el flujo completo.

## Licencia

Ver [CONTRIBUTING.md](CONTRIBUTING.md) y los créditos en la app (Ayuda → Acerca de).
