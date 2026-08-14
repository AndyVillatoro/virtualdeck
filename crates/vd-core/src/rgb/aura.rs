//! Protocolo ASUS Aura USB.
//!
//! # Origen de la informacion
//!
//! La estructura de paquetes viene de la **documentacion publica** del wiki de
//! OpenRGB. Los protocolos no son copyrightables y se pueden reimplementar
//! libremente; el codigo de OpenRGB, en cambio, es GPLv2 y **no se copia**.
//!
//! # Estado: reconocimiento
//!
//! El wiki documenta el controlador `0B05:18F3`, pero esta maquina tiene un
//! `0B05:19AF` (generacion ARGB Gen2), que puede diferir. Antes de escribir
//! nada al hardware se consulta al propio dispositivo: version de firmware y
//! tabla de configuracion. Escribir paquetes a ciegas a un controlador de placa
//! madre no es aceptable.
//!
//! # Formato
//!
//! Mensajes HID de **65 bytes**: 1 byte de report ID (0x00) seguido de 64 bytes
//! de datos. Todos los comandos empiezan con `0xEC`.

use hidapi::{HidApi, HidDevice};

use super::RgbError;

/// Fabricante ASUS.
pub const ASUS_VID: u16 = 0x0B05;

/// Product IDs de controladores Aura USB conocidos.
///
/// `19AF` es el de esta maquina (Z690 ROG Strix, ARGB Gen2); los otros estan
/// documentados en el wiki de OpenRGB.
pub const AURA_PIDS: &[u16] = &[0x18F3, 0x1939, 0x19AF, 0x1867, 0x1872, 0x1889];

/// Tamanio de mensaje: report ID + 64 bytes de datos.
const MSG_LEN: usize = 65;

/// Byte inicial de todos los comandos Aura.
const CMD: u8 = 0xEC;

/// Pedir la cadena de firmware.
const OP_FIRMWARE: u8 = 0x82;
/// Pedir la tabla de configuracion.
const OP_CONFIG: u8 = 0xB0;

/// Un controlador Aura abierto.
pub struct AuraController {
    device: HidDevice,
    pub product_id: u16,
}

/// Lo que respondio el dispositivo al reconocimiento.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuraInfo {
    pub product_id: u16,
    /// Cadena de firmware (p. ej. `AUMA0-E6K5-0106`). Identifica la variante.
    pub firmware: String,
    /// 60 bytes crudos de la tabla de configuracion.
    ///
    /// Codifica cuantos canales hay y cuantos LED admite cada uno, pero su
    /// interpretacion depende de la generacion, por eso se expone en crudo.
    pub config_table: Vec<u8>,
    /// Como respondio: por feature report o por report de salida/entrada.
    pub transport: Transport,
}

/// Via de comunicacion que acepto el dispositivo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Transport {
    Feature,
    Interrupt,
}

/// Descripcion de una coleccion HID del controlador, para diagnostico.
///
/// Un mismo dispositivo USB expone varias colecciones (top-level collections) y
/// **solo una** habla el protocolo Aura. Hay que enumerarlas todas: filtrar por
/// numero de interfaz no alcanza, porque varias colecciones comparten interfaz.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuraEndpoint {
    pub product_id: u16,
    pub interface: i32,
    pub usage_page: u16,
    pub usage: u16,
    /// Longitudes de report declaradas por el dispositivo. Escribir con un
    /// tamanio distinto hace que Windows rechace la operacion.
    pub input_len: u16,
    pub output_len: u16,
    pub feature_len: u16,
    pub path: String,
}

/// Enumera todas las colecciones HID de controladores Aura presentes.
pub fn endpoints() -> Result<Vec<AuraEndpoint>, RgbError> {
    let api = HidApi::new()?;
    Ok(api
        .device_list()
        .filter(|d| d.vendor_id() == ASUS_VID && AURA_PIDS.contains(&d.product_id()))
        .map(|d| {
            let path = d.path().to_string_lossy().into_owned();
            let (input, output, feature) = report_lengths(&path).unwrap_or((0, 0, 0));
            AuraEndpoint {
                product_id: d.product_id(),
                interface: d.interface_number(),
                usage_page: d.usage_page(),
                usage: d.usage(),
                input_len: input,
                output_len: output,
                feature_len: feature,
                path,
            }
        })
        .collect())
}

/// Longitudes de report que declara el dispositivo: (entrada, salida, feature).
///
/// **Esto no se puede adivinar.** Windows rechaza con `ERROR_INVALID_PARAMETER`
/// cualquier escritura cuyo tamanio no sea exactamente el declarado, y cada
/// generacion de controlador declara el suyo. Se consulta con `HidP_GetCaps`.
pub fn report_lengths(path: &str) -> Option<(u16, u16, u16)> {
    use windows::core::PCSTR;
    use windows::Win32::Devices::HumanInterfaceDevice::{
        HidD_FreePreparsedData, HidD_GetPreparsedData, HidP_GetCaps, HIDP_CAPS,
        PHIDP_PREPARSED_DATA,
    };
    use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE};
    use windows::Win32::Storage::FileSystem::{
        CreateFileA, FILE_ATTRIBUTE_NORMAL, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
    };

    let ruta = std::ffi::CString::new(path).ok()?;

    // SAFETY: se abre el dispositivo solo para consultar sus capacidades y se
    // cierran el handle y los datos preparsed en todos los caminos de salida.
    unsafe {
        let handle = CreateFileA(
            PCSTR(ruta.as_ptr() as *const u8),
            GENERIC_READ.0 | GENERIC_WRITE.0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None,
        )
        .ok()?;

        let mut preparsed = PHIDP_PREPARSED_DATA::default();
        let obtenido = HidD_GetPreparsedData(handle, &mut preparsed);

        let resultado = if obtenido {
            let mut caps = HIDP_CAPS::default();
            let ok = HidP_GetCaps(preparsed, &mut caps).is_ok();
            HidD_FreePreparsedData(preparsed);
            ok.then_some((
                caps.InputReportByteLength,
                caps.OutputReportByteLength,
                caps.FeatureReportByteLength,
            ))
        } else {
            None
        };

        let _ = CloseHandle(handle);
        resultado
    }
}

impl AuraController {
    /// Abre el controlador Aura, probando **todas** sus colecciones HID hasta
    /// dar con una que responda.
    ///
    /// No se puede elegir por numero de interfaz: un mismo dispositivo expone
    /// varias colecciones y solo una habla el protocolo. Se prefieren las de
    /// pagina de uso propietaria (`0xFF00` en adelante), que es donde los
    /// fabricantes ponen sus canales de control.
    pub fn open() -> Result<Self, RgbError> {
        let api = HidApi::new()?;

        let mut candidatos: Vec<_> = api
            .device_list()
            .filter(|d| d.vendor_id() == ASUS_VID && AURA_PIDS.contains(&d.product_id()))
            .collect();
        // Primero las paginas de uso propietarias.
        candidatos.sort_by_key(|d| (d.usage_page() < 0xFF00, d.interface_number()));

        let mut abierto: Option<Self> = None;
        for info in candidatos {
            let Ok(device) = info.open_device(&api) else {
                continue;
            };
            let ctrl = Self {
                device,
                product_id: info.product_id(),
            };
            // Quedarse con la primera coleccion que de verdad conteste.
            if ctrl.query(OP_FIRMWARE).is_some() {
                return Ok(ctrl);
            }
            abierto.get_or_insert(ctrl);
        }

        // Si ninguna contesto, devolver una abierta igual: `probe` informara
        // que no hubo respuesta, que es mas util que "no se encontro nada".
        abierto.ok_or(RgbError::NoAuraController)
    }

    /// Arma un mensaje de 65 bytes con la operacion indicada.
    ///
    /// **El report ID es `0xEC`, no `0x00`.** En las tablas del wiki el offset
    /// `0x00` vale `0xEC`: ese byte *es* el report ID, no un relleno previo.
    /// Interpretarlo como relleno corre todo el paquete un byte y Windows
    /// rechaza la escritura con `ERROR_INVALID_PARAMETER`.
    fn message(op: u8) -> [u8; MSG_LEN] {
        let mut buf = [0u8; MSG_LEN];
        buf[0] = CMD; // report ID = 0xEC
        buf[1] = op;
        buf
    }

    /// Envia una consulta y devuelve la respuesta, probando las dos vias.
    ///
    /// Distintas generaciones de controlador usan feature reports o reports de
    /// interrupcion. En vez de asumir, se prueban ambas y se informa cual anduvo.
    fn query(&self, op: u8) -> Option<(Vec<u8>, Transport)> {
        self.query_verbose(op, &mut Vec::new())
    }

    /// Igual que [`Self::query`] pero registrando que paso en cada intento.
    ///
    /// Los errores de hidapi son la unica pista real cuando un dispositivo no
    /// contesta: "longitud de report incorrecta" y "el dispositivo no responde"
    /// llevan a diagnosticos opuestos, asi que no se pueden tragar.
    fn query_verbose(&self, op: u8, log: &mut Vec<String>) -> Option<(Vec<u8>, Transport)> {
        // Via 1: feature report.
        let msg = Self::message(op);
        match self.device.send_feature_report(&msg) {
            Ok(()) => {
                let mut buf = [0u8; MSG_LEN];
                buf[0] = 0x00;
                match self.device.get_feature_report(&mut buf) {
                    Ok(n) if n > 2 && buf[1..].iter().any(|b| *b != 0) => {
                        log.push(format!("feature: OK, {n} bytes"));
                        return Some((buf[1..n.min(MSG_LEN)].to_vec(), Transport::Feature));
                    }
                    Ok(n) => log.push(format!("feature: respuesta vacia ({n} bytes)")),
                    Err(e) => log.push(format!("feature: fallo la lectura: {e}")),
                }
            }
            Err(e) => log.push(format!("feature: fallo el envio: {e}")),
        }

        // Via 2: escritura + lectura por interrupcion.
        let msg = Self::message(op);
        match self.device.write(&msg) {
            Ok(n) => {
                log.push(format!("interrupcion: enviados {n} bytes"));
                let mut buf = [0u8; MSG_LEN];
                match self.device.read_timeout(&mut buf, 250) {
                    Ok(n) if n > 2 && buf.iter().any(|b| *b != 0) => {
                        log.push(format!("interrupcion: OK, {n} bytes"));
                        return Some((buf[..n.min(MSG_LEN)].to_vec(), Transport::Interrupt));
                    }
                    Ok(n) => log.push(format!("interrupcion: sin datos ({n} bytes)")),
                    Err(e) => log.push(format!("interrupcion: fallo la lectura: {e}")),
                }
            }
            Err(e) => log.push(format!("interrupcion: fallo el envio: {e}")),
        }

        None
    }

    /// Reconocimiento con diagnostico: devuelve la bitacora de cada intento.
    pub fn probe_verbose(&self) -> (Option<AuraInfo>, Vec<String>) {
        let mut log = Vec::new();
        let respuesta = self.query_verbose(OP_FIRMWARE, &mut log);

        let Some((fw_raw, transport)) = respuesta else {
            return (None, log);
        };

        let firmware: String = fw_raw
            .iter()
            .skip(2)
            .take_while(|b| **b != 0)
            .filter(|b| b.is_ascii_graphic())
            .map(|b| *b as char)
            .collect();

        let config_table = self
            .query_verbose(OP_CONFIG, &mut log)
            .map(|(datos, _)| datos.into_iter().skip(4).take(60).collect())
            .unwrap_or_default();

        (
            Some(AuraInfo {
                product_id: self.product_id,
                firmware,
                config_table,
                transport,
            }),
            log,
        )
    }

    /// Reconoce el dispositivo: firmware y tabla de configuracion.
    ///
    /// Es una operacion **de solo lectura**: no modifica la iluminacion.
    pub fn probe(&self) -> Result<AuraInfo, RgbError> {
        let (fw_raw, transport) = self.query(OP_FIRMWARE).ok_or(RgbError::NoResponse)?;

        // La cadena de firmware empieza tras la cabecera del eco del comando.
        let firmware: String = fw_raw
            .iter()
            .skip(2)
            .take_while(|b| **b != 0)
            .filter(|b| b.is_ascii_graphic())
            .map(|b| *b as char)
            .collect();

        let config_table = self
            .query(OP_CONFIG)
            .map(|(datos, _)| datos.into_iter().skip(4).take(60).collect())
            .unwrap_or_default();

        Ok(AuraInfo {
            product_id: self.product_id,
            firmware,
            config_table,
            transport,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_mensaje_tiene_la_forma_documentada() {
        let m = AuraController::message(OP_FIRMWARE);
        assert_eq!(m.len(), 65, "los mensajes Aura son de 65 bytes");
        // El 0xEC es el report ID. Si esto se rompe, Windows rechaza la
        // escritura con ERROR_INVALID_PARAMETER (os error 87).
        assert_eq!(m[0], 0xEC, "byte 0 = report ID / comando Aura");
        assert_eq!(m[1], 0x82, "byte 1 = operacion");
        assert!(m[2..].iter().all(|b| *b == 0), "el resto va en cero");
    }

    #[test]
    fn el_pid_de_esta_maquina_esta_en_la_lista() {
        assert!(AURA_PIDS.contains(&0x19AF));
    }
}
