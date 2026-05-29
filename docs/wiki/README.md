# Staging del Wiki de GitHub

Esta carpeta es el **borrador versionado** del wiki público de VirtualDeck
(`https://github.com/AndyVillatoro/virtualdeck/wiki`), al que apunta el botón
**Documentación** de la app (`src/data/links.ts` → `LINKS.docs`).

El wiki de GitHub es un **repositorio git aparte**. Acá editamos las páginas con
commits normales del repo principal y luego las publicamos al wiki.

## Estructura

Páginas bilingües. Convención: página en español sin sufijo o con `-ES`,
inglés con `-EN`. `Home` y `_Sidebar` son especiales (landing y navegación).

```
Home.md / Home-EN.md      ← landing bilingüe (selector de idioma)
_Sidebar.md               ← navegación lateral (ambos idiomas)
Primeros-Pasos.md         ← ES (quick start)   · Getting-Started.md ← EN
Guia-de-Uso.md            ← ES (guía completa)
Referencia-de-Acciones.md ← ES (catálogo de acciones)
Sensores-y-RGB.md         ← ES (LHM + OpenRGB)
... (se van agregando, ver ROADMAP.md bloque C)
```

## Cómo publicar al wiki

1. Crear la primera página del wiki desde la web (Settings → Features → Wikis,
   luego "Create the first page") para que exista el repo `*.wiki.git`.
2. Clonarlo y copiar estas páginas:
   ```bash
   git clone https://github.com/AndyVillatoro/virtualdeck.wiki.git
   cp docs/wiki/*.md virtualdeck.wiki/
   cd virtualdeck.wiki && git add . && git commit -m "docs: actualizar wiki" && git push
   ```
3. Los enlaces internos del wiki usan el **nombre de página** (sin `.md`):
   `[[Primeros-Pasos]]` o `[Texto](Primeros-Pasos)`.

> Mantener el contenido sincronizado con la versión actual de la app. Cuando una
> mejora del [ROADMAP.md](../ROADMAP.md) cambie el comportamiento,
> actualizar la página correspondiente acá y republicar.
