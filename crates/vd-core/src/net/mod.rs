//! Cliente HTTP minimo sobre **WinHTTP**.
//!
//! # Por que no una biblioteca de HTTP
//!
//! El modulo de clima necesita HTTPS, y en Rust eso significa arrastrar una pila
//! TLS completa: `rustls` con su proveedor criptografico y un paquete de
//! certificados raiz, o `native-tls` con sus dependencias de sistema. Cualquiera
//! de las dos pesa mas que varios modulos de este nucleo juntos, con un objetivo
//! de instalador por debajo de 20 MB.
//!
//! WinHTTP ya esta en Windows, ya viene declarada en el crate `windows` del que
//! el proyecto depende, y aporta tres cosas gratis:
//!
//! - **TLS del sistema**: usa el almacen de certificados de Windows, asi que
//!   funciona detras de proxies corporativos que inspeccionan trafico. Un paquete
//!   de raices embebido en el binario fallaria justo ahi.
//! - **Configuracion de proxy del sistema**, sin codigo extra.
//! - **Cero bytes** en el ejecutable y cero dependencias nuevas.
//!
//! El alcance es deliberadamente pequeño: GET, respuesta en memoria, sin
//! reintentos ni cookies ni streaming. Es todo lo que este proyecto necesita.

use std::time::Duration;

use windows::core::PCWSTR;
use windows::Win32::Networking::WinHttp::*;

/// Fallo de una peticion. El texto va directo a la interfaz, asi que esta
/// redactado para una persona, no para un log.
#[derive(Debug, thiserror::Error)]
pub enum HttpError {
    #[error("URL invalida: {0}")]
    BadUrl(String),

    #[error("no se pudo conectar: {0}")]
    Connect(String),

    #[error("el servidor respondio HTTP {0}")]
    Status(u32),

    #[error("la respuesta no es texto valido en UTF-8")]
    NotUtf8,

    #[error("la respuesta supera el limite de {0} bytes")]
    TooLarge(usize),
}

/// Tope de tamaño de respuesta.
///
/// Sin un limite, un servidor que responda un flujo infinito llenaria la memoria
/// del proceso. Ninguna respuesta legitima de las que consume esta aplicacion
/// —clima, o el arbol de sensores de LHM— se acerca a esto.
const MAX_RESPUESTA: usize = 8 * 1024 * 1024;

/// Envoltorio que garantiza el cierre del handle aunque haya un retorno temprano
/// o un panico. WinHTTP filtra el handle si no se cierra, y en un proceso de
/// larga vida como este eso se acumula.
struct Handle(*mut core::ffi::c_void);

impl Drop for Handle {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe {
                let _ = WinHttpCloseHandle(self.0);
            }
        }
    }
}

impl Handle {
    fn nuevo(h: *mut core::ffi::c_void, contexto: &str) -> Result<Self, HttpError> {
        if h.is_null() {
            Err(HttpError::Connect(format!(
                "{contexto} ({})",
                std::io::Error::last_os_error()
            )))
        } else {
            Ok(Self(h))
        }
    }
}

/// Convierte a la cadena terminada en cero que espera la API de Windows.
fn a_utf16(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

/// Partes de una URL que hacen falta para armar la peticion.
struct Url {
    host: String,
    puerto: u16,
    /// Ruta y query juntos, que es lo que WinHTTP llama "object name".
    recurso: String,
    https: bool,
}

/// Descompone la URL con `WinHttpCrackUrl` en vez de a mano.
///
/// Partir URLs con `split` parece trivial y no lo es: puertos explicitos,
/// credenciales embebidas, IPv6 entre corchetes, query con barras. Windows ya
/// trae el parser.
fn partir_url(url: &str) -> Result<Url, HttpError> {
    let ancha = a_utf16(url);
    // Longitud sin el cero final: WinHttpCrackUrl la interpreta como el largo
    // real de la cadena, y contar el terminador mete un caracter nulo en el
    // ultimo componente.
    let len = ancha.len() - 1;

    let mut comp = URL_COMPONENTS {
        dwStructSize: std::mem::size_of::<URL_COMPONENTS>() as u32,
        ..Default::default()
    };
    // Con los punteros a nulo y la longitud a "no cero", WinHTTP devuelve
    // punteros a la cadena original en vez de copiar a buffers propios.
    comp.dwHostNameLength = u32::MAX;
    comp.dwUrlPathLength = u32::MAX;
    comp.dwExtraInfoLength = u32::MAX;

    unsafe { WinHttpCrackUrl(&ancha[..len], 0, &mut comp) }
        .map_err(|_| HttpError::BadUrl(url.to_string()))?;

    let leer = |p: windows::core::PWSTR, largo: u32| -> String {
        let ptr = p.0;
        if ptr.is_null() || largo == 0 {
            String::new()
        } else {
            String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(ptr, largo as usize) })
        }
    };

    let host = leer(comp.lpszHostName, comp.dwHostNameLength);
    if host.is_empty() {
        return Err(HttpError::BadUrl(url.to_string()));
    }

    let ruta = leer(comp.lpszUrlPath, comp.dwUrlPathLength);
    let query = leer(comp.lpszExtraInfo, comp.dwExtraInfoLength);
    let recurso = if ruta.is_empty() && query.is_empty() {
        "/".to_string()
    } else {
        format!("{ruta}{query}")
    };

    Ok(Url {
        host,
        puerto: comp.nPort,
        recurso,
        https: comp.nScheme == WINHTTP_INTERNET_SCHEME_HTTPS,
    })
}

/// Hace un GET y devuelve el cuerpo como texto.
///
/// `timeout` se aplica a cada etapa (resolucion, conexion, envio, recepcion),
/// que es como WinHTTP modela los plazos; el total en el peor caso es un multiplo
/// del valor pasado.
pub fn get_text(url: &str, timeout: Duration) -> Result<String, HttpError> {
    let cuerpo = get_bytes(url, timeout)?;
    String::from_utf8(cuerpo).map_err(|_| HttpError::NotUtf8)
}

/// Hace un GET y devuelve el cuerpo crudo.
pub fn get_bytes(url: &str, timeout: Duration) -> Result<Vec<u8>, HttpError> {
    let partes = partir_url(url)?;
    let ms = timeout.as_millis().min(i32::MAX as u128) as i32;

    // Las cadenas anchas se atan a variables con nombre a proposito. Escribirlas
    // en linea (`PCWSTR(a_utf16(..).as_ptr())`) funciona por las reglas de vida
    // de los temporales, pero deja un puntero cuya validez depende de que la
    // llamada siga siendo parte de la misma sentencia: cualquier refactor
    // inocente lo convierte en un puntero colgante.
    let agente = a_utf16("VirtualDeck");
    let host = a_utf16(&partes.host);
    let verbo = a_utf16("GET");
    let recurso = a_utf16(&partes.recurso);

    unsafe {
        let sesion = Handle::nuevo(
            WinHttpOpen(
                PCWSTR(agente.as_ptr()),
                // Respeta la configuracion de proxy del sistema, que es lo que
                // hace que esto funcione en una red corporativa.
                WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
                PCWSTR::null(),
                PCWSTR::null(),
                0,
            ),
            "no se pudo iniciar WinHTTP",
        )?;

        WinHttpSetTimeouts(sesion.0, ms, ms, ms, ms)
            .map_err(|e| HttpError::Connect(e.message()))?;

        let conexion = Handle::nuevo(
            WinHttpConnect(sesion.0, PCWSTR(host.as_ptr()), partes.puerto, 0),
            &format!("no se pudo conectar con {}", partes.host),
        )?;

        let peticion = Handle::nuevo(
            WinHttpOpenRequest(
                conexion.0,
                PCWSTR(verbo.as_ptr()),
                PCWSTR(recurso.as_ptr()),
                PCWSTR::null(),
                PCWSTR::null(),
                std::ptr::null(),
                if partes.https {
                    WINHTTP_FLAG_SECURE
                } else {
                    WINHTTP_OPEN_REQUEST_FLAGS(0)
                },
            ),
            "no se pudo preparar la peticion",
        )?;

        WinHttpSendRequest(peticion.0, None, None, 0, 0, 0)
            .map_err(|_| HttpError::Connect(std::io::Error::last_os_error().to_string()))?;

        WinHttpReceiveResponse(peticion.0, std::ptr::null_mut())
            .map_err(|_| HttpError::Connect(std::io::Error::last_os_error().to_string()))?;

        let estado = leer_estado(peticion.0)?;
        if !(200..300).contains(&estado) {
            return Err(HttpError::Status(estado));
        }

        leer_cuerpo(peticion.0)
    }
}

/// Lee el codigo de estado como numero (`WINHTTP_QUERY_FLAG_NUMBER`), en vez de
/// pedir el texto y parsearlo.
unsafe fn leer_estado(peticion: *mut core::ffi::c_void) -> Result<u32, HttpError> {
    let mut estado: u32 = 0;
    let mut largo = std::mem::size_of::<u32>() as u32;
    unsafe {
        WinHttpQueryHeaders(
            peticion,
            WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
            PCWSTR::null(),
            Some(std::ptr::from_mut(&mut estado).cast()),
            &mut largo,
            std::ptr::null_mut(),
        )
    }
    .map_err(|e| HttpError::Connect(e.message()))?;
    Ok(estado)
}

unsafe fn leer_cuerpo(peticion: *mut core::ffi::c_void) -> Result<Vec<u8>, HttpError> {
    let mut salida = Vec::new();
    let mut trozo = [0u8; 8192];

    loop {
        let mut leidos: u32 = 0;
        unsafe {
            WinHttpReadData(
                peticion,
                trozo.as_mut_ptr().cast(),
                trozo.len() as u32,
                &mut leidos,
            )
        }
        .map_err(|e| HttpError::Connect(e.message()))?;

        // Cero bytes leidos es la señal de fin de respuesta de WinHTTP.
        if leidos == 0 {
            return Ok(salida);
        }
        if salida.len() + leidos as usize > MAX_RESPUESTA {
            return Err(HttpError::TooLarge(MAX_RESPUESTA));
        }
        salida.extend_from_slice(&trozo[..leidos as usize]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parte_una_url_https_simple() {
        let u = partir_url("https://api.open-meteo.com/v1/forecast").unwrap();
        assert_eq!(u.host, "api.open-meteo.com");
        assert_eq!(u.puerto, 443);
        assert_eq!(u.recurso, "/v1/forecast");
        assert!(u.https);
    }

    #[test]
    fn conserva_la_query_completa() {
        // La query lleva los parametros del clima. Perderla devolveria una
        // respuesta valida pero de otro sitio del planeta.
        let u = partir_url("https://api.open-meteo.com/v1/forecast?latitude=14.1&longitude=-87.2&current=temperature_2m").unwrap();
        assert_eq!(
            u.recurso,
            "/v1/forecast?latitude=14.1&longitude=-87.2&current=temperature_2m"
        );
    }

    #[test]
    fn entiende_http_plano_y_puerto_explicito() {
        let u = partir_url("http://127.0.0.1:8085/data.json").unwrap();
        assert_eq!(u.host, "127.0.0.1");
        assert_eq!(u.puerto, 8085);
        assert_eq!(u.recurso, "/data.json");
        assert!(!u.https);
    }

    #[test]
    fn una_url_sin_ruta_pide_la_raiz() {
        let u = partir_url("https://ipwho.is").unwrap();
        assert_eq!(u.recurso, "/");
    }

    #[test]
    fn rechaza_basura() {
        assert!(partir_url("no soy una url").is_err());
        assert!(partir_url("").is_err());
    }
}
