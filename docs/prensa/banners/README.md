# Banners de Prensa y Artes Editadas — VirtualDeck

Este directorio contiene las composiciones de diseño para la ficha de la Microsoft Store, la documentación de GitHub y la presencia web de VirtualDeck (v0.14.0).

A diferencia de las capturas de ventana sin editar, cada banner presenta una **composición de diseño editorial**:
- Titular conciso (máximo 6 palabras por idioma).
- Subtítulo explicativo y badges de características clave.
- Captura de la aplicación enmarcada en ventanas de estudio, dispositivos móviles o pantallas ultrapanorámicas (1280×480).
- Identidad visual DOT estricta (`#070809` OLED, `#111315` superficie, `#26292e` bordes, `#FF3B30` acento, `#e6e8eb` texto claro, sin emojis ni blanco puro `#ffffff`).
- Reserva de seguridad en el tercio inferior para evitar superposiciones con los controles nativos de la Store.

---

## Estructura de Archivos

```
docs/prensa/banners/
├── 01-deck.html               # Panel principal (Hero)
├── 02-editor.html             # Editor por secciones y presets
├── 03-catalogo.html           # Catálogo de iconos 16×16 y acciones
├── 04-dock.html               # Soporte hardware Stream Dock N3
├── 05-movil.html              # Mando móvil Wi-Fi en teléfono
├── 05b-movil-marco.html       # Experiencia táctil y latencia < 5ms
├── 06-tienda.html             # Tienda de perfiles comunitarios
├── 06b-tienda-ficha.html      # Auditoría de seguridad antes de instalar
├── 07-barra-flotante.html     # Barra superpuesta en escritorio
├── 08-kiosko-barra.html       # Modo kiosko ultrapanorámico 1280×480
├── 09-rgb.html                # Sincronización OpenRGB de hardware
├── miniatura.html             # Miniatura del tráiler de la Store (1920×1080)
├── superheroe.html            # Superhéroe sin texto (1920×1080)
├── banner.html                # Banner de cabecera GitHub/Releases (1280×640)
├── og-image.html              # Tarjeta OpenGraph para web (1200×630)
├── shared.css                 # Estilos compartidos y sistema de diseño DOT
├── render.mjs                 # Guion de renderizado automatizado
├── vista.html                 # Contacto interactivo para inspección visual
├── assets/                    # Recursos gráficos auxiliares (LCD keys, icono)
├── es/                        # Banners generados en español (1920×1080 PNG)
└── en/                        # Banners generados en inglés (1920×1080 PNG)
```

---

## Cómo Regenerar Todo (Comando Exacto)

Para regenerar todos los banners y artes de marca desde cero:

```bash
node docs/prensa/banners/render.mjs
```

### Proceso de Renderizado y Resolución
1. El guion levanta una instancia de Chrome headless shell mediante Chrome DevTools Protocol (CDP).
2. Configura `deviceScaleFactor: 2` con `Emulation.setDeviceMetricsOverride` para capturar a doble resolución (3840×2160).
3. Reduce las imágenes a sus dimensiones exactas (1920×1080, 1280×640, 1200×630) utilizando **Sharp con el filtro de remuestreo Lanczos3**, produciendo un resultado ultra-nítido sin pixelación ni artefactos.
4. Exporta las versiones en español a `docs/prensa/banners/es/` y en inglés a `docs/prensa/banners/en/`.
5. Actualiza las artes principales en `docs/prensa/` (`miniatura.png`, `superheroe.png`, `banner.png`, `og-image.png`) y sus variantes en inglés en `docs/prensa/en/`.
6. Realiza un respaldo de seguridad de las capturas originales en `_referencias/store-0.14.0/capturas-*/originales/` y copia los nuevos banners editados a la carpeta de la Store.

---

## Contacto e Inspección Visual

Para revisar todas las piezas de forma interactiva en el navegador:
- Abrir `docs/prensa/banners/vista.html` en cualquier navegador web.
- Permite alternar entre la tanda en **Español (ES)** y en **Inglés (EN)**, hacer clic para ampliar cada arte a pantalla completa y abrir el código fuente HTML de cada composición.

---

## Privacidad y Datos

Todas las capturas y composiciones cumplen estrictamente con las reglas de privacidad:
- Números de serie ficticios e inventados (`PRENSA-N3-0001`).
- Apps y perfiles de demostración genéricos.
- Cero nombres personales, rutas locales privadas ni identificadores de red.
