/**
 * Fachada de OpenRGB (interfaz HID, proceso principal).
 *
 * Todo lo que hace vive repartido por responsabilidad en módulos de esta
 * carpeta: `estado` es el único que guarda el cliente y el servidor spawned,
 * `conexion` el ciclo de vida y la reconexión, `servidor` el proceso de
 * OpenRGB, `dispositivos` la lista y el reescaneo, `aplicar` los colores, modos
 * y LEDs, `perfil` los perfiles guardados y `presets` los presets inteligentes.
 * Aquí solo se reexporta lo que el resto de la app tenía antes: quien importa
 * `'./rgb'` sigue viendo exactamente la misma API. Los tipos (`RGBStatus`,
 * `RGBDeviceInfo`, `RGBProfile`) viven en `./tipos` y los importan de ahí los
 * módulos de la carpeta.
 */
export { status, connect, disconnect, setOnDeviceListUpdated } from './conexion';
export { spawnServer, killServer } from './servidor';
export { listDevices, rescanDevices, resizeZone } from './dispositivos';
export { setDeviceColor, setZoneColors, setSingleLed, setMode } from './aplicar';
export { applyProfile } from './perfil';
export { listaPresets, applySmartPreset } from './presets';