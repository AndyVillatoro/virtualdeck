//! Constantes del protocolo OpenRGB (de `NetworkProtocol.h`).

/// Versión del protocolo que este cliente entiende.
///
/// Se negocia con el servidor y se usa **la menor de las dos**: los campos de
/// brillo solo existen a partir de la 3, y leerlos contra un servidor viejo
/// desalinearía todo el resto del bloque.
pub(super) const VERSION: u32 = 3;

pub(super) const CMD_CONTADOR: u32 = 0;
pub(super) const CMD_DATOS_CONTROLADOR: u32 = 1;
pub(super) const CMD_VERSION: u32 = 40;
pub(super) const CMD_NOMBRE_CLIENTE: u32 = 50;
pub(super) const CMD_LISTA_PERFILES: u32 = 150;
pub(super) const CMD_CARGAR_PERFIL: u32 = 152;
pub(super) const CMD_ACTUALIZAR_LEDS: u32 = 1050;
/// `SETCUSTOMMODE`. **No es 1052**: ese es `UPDATESINGLELED`, y confundirlos deja
/// el dispositivo en su efecto anterior, que sobrescribe el color al instante.
pub(super) const CMD_MODO_PERSONALIZADO: u32 = 1100;
pub(super) const CMD_ACTUALIZAR_MODO: u32 = 1101;

/// Un modo sin colores propios: pedirle un color no tiene sentido.
pub(super) const COLORES_NINGUNO: u32 = 0;
/// Un modo que elige sus colores al azar; forzarle uno no hace nada.
pub(super) const COLORES_AL_AZAR: u32 = 3;

/// Cuántos mensajes ajenos se toleran antes de rendirse esperando la respuesta.
///
/// OpenRGB manda avisos que nadie pidió (la lista de dispositivos cambió, se
/// cargó un perfil). Si no se saltan, el siguiente `recibir` devuelve el aviso en
/// lugar de la respuesta y todo lo que venga después se lee desalineado.
pub(super) const MAXIMO_MENSAJES_AJENOS: usize = 16;
