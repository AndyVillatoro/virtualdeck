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

## Estado actual

- Repo de galería: **pendiente de crear**.
- UI de "Importar desde URL": **pendiente** (issue de seguimiento).
- Manifest schema: **estable** desde la spec inicial (este doc).
