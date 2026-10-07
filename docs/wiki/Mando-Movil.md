# Mando móvil

> [English version](Mobile-Remote)

VirtualDeck incluye un servidor web local para usar el deck desde el teléfono.
Está **apagado por defecto**: actívalo en Ajustes (rueda) → **MANDO MÓVIL Y SERVIDOR WEB**.

## Emparejar

1. El móvil y este equipo deben estar en la misma red Wi-Fi.
2. Abre la dirección que muestra ajustes en el navegador del teléfono
   (también funciona por nombre de red, mDNS).
3. Pulsa **OBTENER CÓDIGO** e introduce los 6 dígitos en la pantalla del móvil
   (caducan en 5 minutos).

Abre el puerto en el Firewall de Windows desde el propio ajuste cuando la
regla no exista. Sin el toggle activado, solo responde a este equipo.

## Qué se ve en el móvil

- Los botones del deck, con el **tema y acento del usuario**, y sus **widgets
  en vivo** (reloj, clima, reproducción, sensor, variable) — la misma fuente
  que la pantalla principal. Las páginas de los docks no salen.
- **Mantener pulsado**: 500 ms ejecutan la acción de mantener del botón (la
  pulsación normal y la larga quedan unificadas). Por dirección directa:
  `virtualdeck://press/<id>?largo=1` (el `?largo=1` ejecuta la pulsación larga).

## API y seguridad

El token va en la cabecera `X-VD-Token`, no en la dirección. Rutas:
`/api/ping`, `/api/buttons`, `/api/press/<id>`, `/api/press?label=<etiqueta>`,
`/api/page/<n>`.

**La conexión no va cifrada** (HTTP plano): cualquiera en la misma red con el
token puede pulsar botones, incluidos los que ejecutan scripts. Usa una red de
confianza y apaga el servidor cuando no lo necesites.
