# Sensores (LibreHardwareMonitor)

VirtualDeck integra **LibreHardwareMonitor (LHM)** para mostrar temperaturas, cargas y velocidades de tu hardware (CPU/GPU/placa/RAM/almacenamiento) en el sidebar (modo normal) y en el panel izquierdo (modo pantalla completa).

LHM viene **embebido** en `resources/lhm/` — no necesitas instalarlo aparte.

---

## Configuración

Abra la barra de título → sección **SENSORES (LIBRE HARDWARE MONITOR)**:

| Opción | Qué hace |
|---|---|
| **HABILITADO** | Activa la lectura de sensores (poll cada 5 s al backend). |
| **MOSTRAR WIDGET DE SENSORES** | Muestra/oculta los cards de sensores en sidebar y pantalla completa. Default: ON. |
| **INICIAR LHM CON VIRTUALDECK** | Spawnea el LHM bundled al arrancar VirtualDeck. |
| **INICIAR LHM COMO ADMINISTRADOR (UAC)** | Lanza LHM con elevación. **Necesario** si el web server (puerto 8085) no responde sin admin. |
| **RUTA LHM** | Vacío = usa el que viene incluido. Indíquela si tiene su propia instalación. |
| **HOST / PUERTO** | Endpoint del web server de LHM (default `127.0.0.1:8085`). |
| **CATEGORÍAS VISIBLES** | Filtra qué tipos de hardware se muestran. |

---

## Por qué a veces hay que correrlo como admin

LHM expone su árbol de sensores en `http://127.0.0.1:8085/data.json` usando **`HttpListener`** de .NET. En Windows, esa API requiere **privilegios de administrador** o una **reserva URL ACL** registrada en el sistema. Sin uno de los dos, el web server arranca pero no puede bindear el puerto, y VirtualDeck nunca recibe datos.

Tres alternativas:

1. **Activar "INICIAR LHM COMO ADMINISTRADOR"** (más simple, prompt UAC en cada arranque).
2. **Registrar la reserva URL ACL una sola vez** (sin más confirmaciones de UAC después). Botón **REGISTRAR URL ACL** en la barra de título → SENSORES: pide una confirmación de UAC y deja la reserva permanente. Después puede desactivar "INICIAR LHM COMO ADMINISTRADOR" y LHM arrancará sin pedir permisos de administrador.

   Equivalente manual (PowerShell como admin):
   ```powershell
   netsh http add urlacl url=http://+:8085/ user=Everyone
   ```
3. **Ejecutar VirtualDeck como administrador** (LHM hereda los privilegios).

---

## Diagnóstico

- En TitleBar → SENSORES verás el estado:
  - `● LHM` verde = conectado y leyendo datos.
  - `○ OFFLINE` amarillo = habilitado pero el web server no responde.
  - `○ DISABLED` gris = la integración está apagada.
- Botón **PROBAR** verifica el endpoint sin spawnear nada.
- Botón **INICIAR LHM** spawnea + reintenta probe hasta 12 s (LHM tarda en cold start).

Si tras 12 s seguís sin respuesta, el mensaje sugiere ejecutar como admin.

---

## Ocultar el widget

Si no quiere ver las fichas de sensores en la interfaz, pero sí necesita tenerlas disponibles para las [acciones de sensor](Referencia-de-Acciones), desactive **MOSTRAR WIDGET DE SENSORES**. Las fichas desaparecen de la barra lateral y del panel izquierdo de pantalla completa, pero las lecturas siguen disponibles para los botones que las usen.

---

## RGB (OpenRGB)

La configuración RGB vive en su propia pantalla (botón **RGB** en la barra superior),
no acá. VirtualDeck se conecta al SDK de **OpenRGB** para aplicar colores, modos y
perfiles a dispositivos compatibles. Asegurate de tener OpenRGB corriendo con su
servidor SDK habilitado.
