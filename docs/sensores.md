# Sensores (LibreHardwareMonitor)

VirtualDeck integra **LibreHardwareMonitor (LHM)** para mostrar temperaturas, cargas y velocidades de tu hardware (CPU/GPU/placa/RAM/almacenamiento) en el sidebar (modo normal) y en el panel izquierdo (modo pantalla completa).

LHM viene **embebido** en `resources/lhm/` — no necesitas instalarlo aparte.

---

## Configuración

Abrí TitleBar → sección **SENSORES (LIBRE HARDWARE MONITOR)**:

| Opción | Qué hace |
|---|---|
| **HABILITADO** | Activa la lectura de sensores (poll cada 5 s al backend). |
| **MOSTRAR WIDGET DE SENSORES** | Muestra/oculta los cards de sensores en sidebar y pantalla completa. Default: ON. |
| **INICIAR LHM CON VIRTUALDECK** | Spawnea el LHM bundled al arrancar VirtualDeck. |
| **INICIAR LHM COMO ADMINISTRADOR (UAC)** | Lanza LHM con elevación. **Necesario** si el web server (puerto 8085) no responde sin admin. |
| **RUTA LHM** | Vacío = usa el bundled. Setear si tenés tu propia instalación. |
| **HOST / PUERTO** | Endpoint del web server de LHM (default `127.0.0.1:8085`). |
| **CATEGORÍAS VISIBLES** | Filtra qué tipos de hardware se muestran. |

---

## Por qué a veces hay que correrlo como admin

LHM expone su árbol de sensores en `http://127.0.0.1:8085/data.json` usando **`HttpListener`** de .NET. En Windows, esa API requiere **privilegios de administrador** o una **reserva URL ACL** registrada en el sistema. Sin uno de los dos, el web server arranca pero no puede bindear el puerto, y VirtualDeck nunca recibe datos.

Tres alternativas:

1. **Activar "INICIAR LHM COMO ADMINISTRADOR"** (más simple, prompt UAC en cada arranque).
2. **Registrar URL ACL una sola vez** (cero UAC después). Botón **REGISTRAR URL ACL** en TitleBar → SENSORES: dispara 1 prompt UAC y deja la reserva permanente. Después podés desactivar "INICIAR LHM COMO ADMINISTRADOR" y LHM arrancará sin pedir admin.

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

Si no querés ver los cards de sensores en la UI (pero sí querés tenerlos disponibles para [acciones de sensor](acciones.md)), apagá **MOSTRAR WIDGET DE SENSORES**. Los cards desaparecen del sidebar y del panel izquierdo de pantalla completa, pero las lecturas siguen disponibles para botones que las usen.
