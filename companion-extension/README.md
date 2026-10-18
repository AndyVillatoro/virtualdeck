# VirtualDeck Companion (Extensión de Navegador)

Extensión Manifest V3 (Chrome, Edge, Brave y otros navegadores Chromium) que captura vídeo y metadatos multimedia en tiempo real y los transmite de forma segura al panel de música de VirtualDeck.

> 📖 **Documentación canónica completa:**  
> La especificación técnica completa, detalles de arquitectura, protocolo binario `VDCM`, seguridad y guía de endpoints locales están unificados en:  
> 👉 **[`docs/investigacion/extension-companion.md`](../docs/investigacion/extension-companion.md)**

---

## Inicio Rápido (Modo Desarrollador)

1. Inicia VirtualDeck (`npm run dev` o app instalada).
2. Asegúrate de tener habilitada la extensión en **Ajustes → EXTENSIÓN DE NAVEGADOR**.
3. Abre `chrome://extensions` (o `edge://extensions`).
4. Activa el **Modo de desarrollador**.
5. Pulsa **Cargar descomprimida** y selecciona esta carpeta (`companion-extension/`).
6. En VirtualDeck, pulsa **GENERAR CÓDIGO** (6 dígitos).
7. Abre el popup de la extensión, introduce el código de 6 dígitos y pulsa **EMPAREJAR**.

Para más detalles sobre recorte adaptativo al elemento `<video>`, persistencia en `companion.json` o resolución de problemas, consulta la [documentación canónica](../docs/investigacion/extension-companion.md).
