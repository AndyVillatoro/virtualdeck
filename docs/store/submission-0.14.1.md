# Envío a Microsoft Store — VirtualDeck 0.14.1

- **Paquete generado**: `dist/VirtualDeck-0.14.1.msix` (120.5 MB)
- **Versión MSIX**: `0.14.1.0`
- **Fecha de compilación**: 2026-10-09
- **Canal de distribución**: Exclusivo Microsoft Store

---

## 1. Verificaciones del Manifiesto Appx

- [x] Versión en manifiesto: `Version="0.14.1.0"`
- [x] MinVersion moderna (>= 10.0.17763.0): `MinVersion="10.0.17763.0"`
- [x] Protocolo URI registrado: `windows.protocol` (`virtualdeck://`)
- [x] Tarea de inicio con Windows: `windows.startupTask`
- [x] Capacidad de confianza total: `runFullTrust`

---

## 2. Novedades de esta versión (What's New)

Archivos individuales listos para copiar y pegar:
- Español: [`docs/store/novedades-0.14.1-es.txt`](file:///C:/Users/andyf/code%20proyects/virtualdeck/docs/store/novedades-0.14.1-es.txt)
- English: [`docs/store/novedades-0.14.1-en.txt`](file:///C:/Users/andyf/code%20proyects/virtualdeck/docs/store/novedades-0.14.1-en.txt)

### Texto en Español
```text
- Vídeo nativo en el panel de música en todos los formatos: resolución adaptativa según el tamaño en pantalla, reduciendo el consumo de CPU a un tercio sin pérdida de nitidez. Disponible en formato vertical estándar y en barra alargada (1280×480).
- Detección de oclusión de ventana: aviso visual automático cuando otra aplicación cubre el reproductor de vídeo en segundo plano.
- Portada web y galería renovadas: visualización interactiva con transición de puntos al scrollear, consola táctil interactiva, tráiler bilingüe (ES/EN) y banners en alta resolución.
- Compilación automatizada de vd-core: el núcleo nativo de bajo nivel se compila e integra automáticamente en el empaquetado.
- Soporte oficial y exclusivo en Microsoft Store: actualizaciones fluidas y seguras garantizadas mediante paquete MSIX con firma de confianza y certificación oficial de Windows.
```

### Texto en Inglés
```text
- Native video in the music panel across all layouts: adaptive capture resolution matching on-screen dimensions, reducing CPU usage to one-third without losing crispness. Available in both standard vertical panel and ultrawide bar layout (1280x480).
- Window occlusion detection: automatic visual notification when another window covers the video player in the background.
- Redesigned web showcase and gallery: scroll-driven dot matrix dissolve transition, interactive touch console, bilingual trailer (ES/EN), and high-resolution banner captures.
- Automated vd-core build: low-level native core is automatically compiled and bundled during the store build pipeline.
- Official and exclusive Microsoft Store distribution: seamless and secure updates backed by trusted MSIX packaging and official Windows certification.
```

---

## 3. Notas para la Certificación (Partner Center)

- Documentación de capacidades: Consultar [`docs/MICROSOFT-STORE.md`](file:///C:/Users/andyf/code%20proyects/virtualdeck/docs/MICROSOFT-STORE.md) §4 (notas técnicas de `runFullTrust`) y §4.1 (versión concisa).
- Panel de control de Microsoft Store: [Partner Center Dashboard](https://partner.microsoft.com/dashboard/apps-and-games/overview)
