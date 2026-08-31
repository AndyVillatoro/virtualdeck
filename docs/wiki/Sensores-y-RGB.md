# Sensores (LibreHardwareMonitor)

VirtualDeck integra **LibreHardwareMonitor (LHM)** para mostrar temperaturas, cargas y velocidades del hardware (CPU/GPU/placa/RAM/almacenamiento) en el sidebar (modo normal) y en el panel izquierdo (modo pantalla completa).

**LHM no viene incluido**: se instala aparte, igual que OpenRGB. Se quitó del
paquete porque escribe su configuración junto a su propio ejecutable, y eso
impide empaquetar la aplicación para la Microsoft Store, donde el directorio de
instalación es de solo lectura.

Después de instalarlo hay **un paso que no se puede saltar**: LHM trae su
servidor web apagado de fábrica. Hay que abrirlo y activar
**Options → Remote Web Server → Run**, con el puerto 8085. Sin eso, VirtualDeck
no recibe ningún dato.

---

## Configuración

Abra la barra de título → sección **SENSORES (LIBRE HARDWARE MONITOR)**:

| Opción | Qué hace |
|---|---|
| **HABILITADO** | Activa la lectura de sensores, con una consulta cada 5 s. |
| **MOSTRAR WIDGET DE SENSORES** | Muestra u oculta las fichas de sensores en la barra lateral y en pantalla completa. Activado por omisión. |
| **INICIAR LHM CON VIRTUALDECK** | Inicia LHM al arrancar VirtualDeck, usando la ruta de abajo. |
| **INICIAR LHM COMO ADMINISTRADOR (UAC)** | Lanza LHM con elevación. **Necesario** si el web server (puerto 8085) no responde sin admin. |
| **RUTA LHM** | Ruta a `LibreHardwareMonitor.exe`. Si está instalado en una carpeta habitual se detecta solo. |
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

- En la barra de título → SENSORES se ve el estado:
  - `● LHM` verde = conectado y leyendo datos.
  - `○ OFFLINE` amarillo = habilitado pero el web server no responde.
  - `○ DISABLED` gris = la integración está apagada.
- Botón **PROBAR**: comprueba el punto de acceso sin iniciar nada.
- Botón **INICIAR LHM**: lo inicia y reintenta la comprobación hasta 12 s, porque el primer arranque de LHM es lento.

Si tras 12 s sigue sin haber respuesta, el mensaje sugiere ejecutar la aplicación como administrador.

---

## Ocultar el widget

Si no quiere ver las fichas de sensores en la interfaz, pero sí necesita tenerlas disponibles para las [acciones de sensor](Referencia-de-Acciones), desactive **MOSTRAR WIDGET DE SENSORES**. Las fichas desaparecen de la barra lateral y del panel izquierdo de pantalla completa, pero las lecturas siguen disponibles para los botones que las usen.

---

## RGB (OpenRGB)

La configuración RGB vive en su propia pantalla (botón **RGB** en la barra superior),
no aquí. VirtualDeck se conecta al SDK de **OpenRGB** para aplicar colores, modos y
perfiles a los dispositivos compatibles. Es necesario tener OpenRGB en ejecución con
su servidor SDK habilitado.
