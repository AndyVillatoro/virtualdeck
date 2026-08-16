//! Cliente del SDK de OpenRGB, por TCP.
//!
//! Es el **nivel 2** del RGB, el equivalente a lo que hacía la versión Electron
//! con `openrgb-sdk`. OpenRGB habla con cada dispositivo por su protocolo —placa,
//! ventiladores, AIO, GPU— y aquí solo se le pide que aplique colores.
//!
//! # Por qué esta vía y no la nativa
//!
//! El control nativo del controlador Aura sigue bloqueado: falta analizar una
//! captura del protocolo USB. Deducirlo probando a ciegas ya costó dejar el RGB
//! del usuario apagado una vez, y no se va a repetir. Ver `docs/MIGRACION-RUST.md`.
//!
//! # El protocolo
//!
//! Cada mensaje empieza por la cabecera `ORGB` + identificador de dispositivo +
//! identificador de comando + tamaño de los datos, todo en little-endian. La
//! parte incómoda es la **descripción de un controlador**: viene como un bloque
//! con nombre, modos, zonas y LEDs encadenados sin índice, así que para saber
//! cuántos LEDs tiene hay que recorrer modos y zonas enteros aunque no se usen.

use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

/// Puerto por defecto del servidor SDK de OpenRGB.
pub const PUERTO: u16 = 6742;

/// Versión del protocolo que este cliente entiende.
///
/// Se negocia con el servidor y se usa **la menor de las dos**: los campos de
/// brillo solo existen a partir de la 3, y leerlos contra un servidor viejo
/// desalinearía todo el resto del bloque.
const VERSION: u32 = 3;

const CMD_CONTADOR: u32 = 0;
const CMD_DATOS_CONTROLADOR: u32 = 1;
const CMD_VERSION: u32 = 40;
const CMD_NOMBRE_CLIENTE: u32 = 50;
const CMD_ACTUALIZAR_LEDS: u32 = 1050;
const CMD_MODO_PERSONALIZADO: u32 = 1052;

#[derive(Debug, thiserror::Error)]
pub enum OpenRgbError {
    #[error("no se pudo conectar con OpenRGB en {0}: {1}")]
    Conexion(String, std::io::Error),

    #[error("error de red hablando con OpenRGB: {0}")]
    Red(#[from] std::io::Error),

    #[error("OpenRGB respondio algo que no se entiende: {0}")]
    Protocolo(String),

    #[error("no existe el dispositivo {0}")]
    SinDispositivo(u32),
}

/// Un dispositivo RGB tal como lo ve OpenRGB.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Dispositivo {
    pub indice: u32,
    pub nombre: String,
    pub leds: u16,
}

pub struct Cliente {
    flujo: TcpStream,
    /// Versión efectiva, la menor entre la nuestra y la del servidor.
    version: u32,
}

impl Cliente {
    /// Conecta con OpenRGB.
    pub fn conectar(host: &str, puerto: u16) -> Result<Self, OpenRgbError> {
        let destino = format!("{host}:{puerto}");
        let dir = destino
            .to_socket_addrs()
            .map_err(|e| OpenRgbError::Conexion(destino.clone(), e))?
            .next()
            .ok_or_else(|| OpenRgbError::Protocolo(format!("no se pudo resolver {destino}")))?;

        // Un servicio en localhost contesta en milisegundos o no esta. Esperar
        // mas solo alarga el bloqueo cuando OpenRGB no esta abierto.
        let flujo = TcpStream::connect_timeout(&dir, Duration::from_millis(800))
            .map_err(|e| OpenRgbError::Conexion(destino, e))?;
        flujo.set_read_timeout(Some(Duration::from_secs(3)))?;
        flujo.set_write_timeout(Some(Duration::from_secs(3)))?;

        let mut cliente = Self {
            flujo,
            version: VERSION,
        };

        // El nombre aparece en la interfaz de OpenRGB, para que el usuario sepa
        // quien le esta cambiando las luces.
        cliente.enviar(0, CMD_NOMBRE_CLIENTE, b"VirtualDeck\0")?;
        cliente.negociar_version()?;
        Ok(cliente)
    }

    fn negociar_version(&mut self) -> Result<(), OpenRgbError> {
        self.enviar(0, CMD_VERSION, &VERSION.to_le_bytes())?;
        // Un servidor antiguo no conoce este comando y no contesta; en ese caso
        // se sigue con la version 0, que es el minimo comun.
        match self.recibir() {
            Ok((_, datos)) if datos.len() >= 4 => {
                let suya = u32::from_le_bytes([datos[0], datos[1], datos[2], datos[3]]);
                self.version = VERSION.min(suya);
            }
            _ => self.version = 0,
        }
        Ok(())
    }

    /// Cuántos dispositivos ve OpenRGB.
    pub fn contar(&mut self) -> Result<u32, OpenRgbError> {
        self.enviar(0, CMD_CONTADOR, &[])?;
        let (_, datos) = self.recibir()?;
        if datos.len() < 4 {
            return Err(OpenRgbError::Protocolo("contador incompleto".into()));
        }
        Ok(u32::from_le_bytes([datos[0], datos[1], datos[2], datos[3]]))
    }

    /// Lista los dispositivos con su nombre y número de LEDs.
    pub fn listar(&mut self) -> Result<Vec<Dispositivo>, OpenRgbError> {
        let n = self.contar()?;
        let mut salida = Vec::with_capacity(n as usize);
        for i in 0..n {
            salida.push(self.dispositivo(i)?);
        }
        Ok(salida)
    }

    fn dispositivo(&mut self, indice: u32) -> Result<Dispositivo, OpenRgbError> {
        self.enviar(indice, CMD_DATOS_CONTROLADOR, &self.version.to_le_bytes())?;
        let (_, datos) = self.recibir()?;
        let (nombre, leds) = parsear_controlador(&datos, self.version)?;
        Ok(Dispositivo {
            indice,
            nombre,
            leds,
        })
    }

    /// Pinta todos los LEDs de un dispositivo del mismo color.
    ///
    /// Antes pasa el dispositivo a modo personalizado: si se queda en un efecto
    /// propio (arcoíris, respiración), el efecto sobrescribe los colores al
    /// instante y parece que la orden no hizo nada.
    pub fn pintar(&mut self, indice: u32, rgb: (u8, u8, u8)) -> Result<u16, OpenRgbError> {
        let dispositivo = self.dispositivo(indice)?;
        if dispositivo.leds == 0 {
            return Err(OpenRgbError::SinDispositivo(indice));
        }

        self.enviar(indice, CMD_MODO_PERSONALIZADO, &[])?;

        let colores = vec![rgb; dispositivo.leds as usize];
        self.enviar(indice, CMD_ACTUALIZAR_LEDS, &cuerpo_leds(&colores))?;
        Ok(dispositivo.leds)
    }

    fn enviar(&mut self, dispositivo: u32, comando: u32, datos: &[u8]) -> Result<(), OpenRgbError> {
        let mut mensaje = Vec::with_capacity(16 + datos.len());
        mensaje.extend_from_slice(b"ORGB");
        mensaje.extend_from_slice(&dispositivo.to_le_bytes());
        mensaje.extend_from_slice(&comando.to_le_bytes());
        mensaje.extend_from_slice(&(datos.len() as u32).to_le_bytes());
        mensaje.extend_from_slice(datos);
        self.flujo.write_all(&mensaje)?;
        Ok(())
    }

    fn recibir(&mut self) -> Result<(u32, Vec<u8>), OpenRgbError> {
        let mut cabecera = [0u8; 16];
        self.flujo.read_exact(&mut cabecera)?;
        if &cabecera[0..4] != b"ORGB" {
            return Err(OpenRgbError::Protocolo(
                "la respuesta no empieza por ORGB".into(),
            ));
        }
        let comando = u32::from_le_bytes(cabecera[8..12].try_into().unwrap_or_default());
        let tam = u32::from_le_bytes(cabecera[12..16].try_into().unwrap_or_default()) as usize;

        // Un tamaño absurdo significa que el flujo se desalineó; leerlo agotaría
        // la memoria esperando bytes que no van a llegar.
        if tam > 8 * 1024 * 1024 {
            return Err(OpenRgbError::Protocolo(format!(
                "tamaño de respuesta imposible ({tam} bytes)"
            )));
        }

        let mut datos = vec![0u8; tam];
        self.flujo.read_exact(&mut datos)?;
        Ok((comando, datos))
    }
}

/// Cuerpo del comando de actualizar LEDs.
fn cuerpo_leds(colores: &[(u8, u8, u8)]) -> Vec<u8> {
    // El bloque lleva su propio tamaño delante, además del de la cabecera.
    let total = 4 + 2 + colores.len() * 4;
    let mut datos = Vec::with_capacity(total);
    datos.extend_from_slice(&(total as u32).to_le_bytes());
    datos.extend_from_slice(&(colores.len() as u16).to_le_bytes());
    for (r, g, b) in colores {
        // OpenRGB espera cuatro bytes por color; el último no se usa.
        datos.extend_from_slice(&[*r, *g, *b, 0]);
    }
    datos
}

/// Lector secuencial del bloque de un controlador.
struct Lector<'a> {
    datos: &'a [u8],
    pos: usize,
}

impl<'a> Lector<'a> {
    fn nuevo(datos: &'a [u8]) -> Self {
        Self { datos, pos: 0 }
    }

    fn saltar(&mut self, n: usize) -> Result<(), OpenRgbError> {
        self.pos = self
            .pos
            .checked_add(n)
            .filter(|p| *p <= self.datos.len())
            .ok_or_else(|| OpenRgbError::Protocolo("bloque truncado".into()))?;
        Ok(())
    }

    fn u16(&mut self) -> Result<u16, OpenRgbError> {
        let i = self.pos;
        self.saltar(2)?;
        Ok(u16::from_le_bytes([self.datos[i], self.datos[i + 1]]))
    }

    fn u32(&mut self) -> Result<u32, OpenRgbError> {
        let i = self.pos;
        self.saltar(4)?;
        Ok(u32::from_le_bytes(
            self.datos[i..i + 4].try_into().unwrap_or_default(),
        ))
    }

    /// Cadena con su longitud delante, terminada en cero.
    fn cadena(&mut self) -> Result<String, OpenRgbError> {
        let largo = self.u16()? as usize;
        let i = self.pos;
        self.saltar(largo)?;
        let bytes = &self.datos[i..i + largo];
        // Se quita el cero final que OpenRGB incluye en la longitud.
        let sin_cero = bytes.strip_suffix(&[0]).unwrap_or(bytes);
        Ok(String::from_utf8_lossy(sin_cero).into_owned())
    }
}

/// Saca el nombre y el número de LEDs del bloque de un controlador.
///
/// Hay que recorrer modos y zonas enteros aunque no se usen: el bloque no tiene
/// índice y el número de LEDs está detrás de todo eso.
fn parsear_controlador(datos: &[u8], version: u32) -> Result<(String, u16), OpenRgbError> {
    let mut l = Lector::nuevo(datos);

    l.u32()?; // tamaño total del bloque
    l.u32()?; // tipo de dispositivo
    let nombre = l.cadena()?;

    // El fabricante solo existe desde la version 1.
    if version >= 1 {
        l.cadena()?;
    }
    l.cadena()?; // descripcion
    l.cadena()?; // version
    l.cadena()?; // numero de serie
    l.cadena()?; // ubicacion

    let modos = l.u16()?;
    l.u32()?; // modo activo
    for _ in 0..modos {
        l.cadena()?; // nombre del modo
        l.saltar(4 * 5)?; // valor, banderas, velocidad min/max, colores min...
                          // A partir de la version 3 hay ademas brillo minimo y maximo.
        if version >= 3 {
            l.saltar(4 * 2)?;
        }
        l.saltar(4 * 2)?; // colores max, velocidad
        if version >= 3 {
            l.saltar(4)?; // brillo
        }
        l.saltar(4 * 2)?; // direccion, modo de color
        let colores = l.u16()?;
        l.saltar(colores as usize * 4)?;
    }

    let zonas = l.u16()?;
    for _ in 0..zonas {
        l.cadena()?; // nombre de la zona
        l.saltar(4 * 4)?; // tipo, leds min, leds max, leds
        let matriz = l.u16()? as usize;
        l.saltar(matriz)?;
        // Desde la version 4 cada zona lleva ademas sus segmentos.
        if version >= 4 {
            let segmentos = l.u16()?;
            for _ in 0..segmentos {
                l.cadena()?;
                l.saltar(4 * 3)?;
            }
        }
    }

    let leds = l.u16()?;
    Ok((nombre, leds))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_cuerpo_de_leds_tiene_la_forma_esperada() {
        let datos = cuerpo_leds(&[(255, 0, 0), (0, 255, 0)]);
        // 4 del tamaño + 2 del contador + 2 colores x 4 bytes.
        assert_eq!(datos.len(), 14);
        assert_eq!(u32::from_le_bytes(datos[0..4].try_into().unwrap()), 14);
        assert_eq!(u16::from_le_bytes(datos[4..6].try_into().unwrap()), 2);
        assert_eq!(&datos[6..10], &[255, 0, 0, 0]);
        assert_eq!(&datos[10..14], &[0, 255, 0, 0]);
    }

    /// Arma el bloque de un controlador como lo enviaria OpenRGB.
    fn bloque_controlador(nombre: &str, leds: u16, version: u32) -> Vec<u8> {
        let mut d = Vec::new();
        let cadena = |d: &mut Vec<u8>, s: &str| {
            let bytes = s.as_bytes();
            d.extend_from_slice(&((bytes.len() + 1) as u16).to_le_bytes());
            d.extend_from_slice(bytes);
            d.push(0);
        };

        d.extend_from_slice(&0u32.to_le_bytes()); // tamaño (no se usa al leer)
        d.extend_from_slice(&1u32.to_le_bytes()); // tipo
        cadena(&mut d, nombre);
        if version >= 1 {
            cadena(&mut d, "Fabricante");
        }
        cadena(&mut d, "Descripcion");
        cadena(&mut d, "1.0");
        cadena(&mut d, "SERIE123");
        cadena(&mut d, "USB");

        // Un modo, para ejercitar el salto.
        d.extend_from_slice(&1u16.to_le_bytes());
        d.extend_from_slice(&0u32.to_le_bytes()); // modo activo
        cadena(&mut d, "Directo");
        for _ in 0..5 {
            d.extend_from_slice(&0u32.to_le_bytes());
        }
        if version >= 3 {
            d.extend_from_slice(&0u32.to_le_bytes());
            d.extend_from_slice(&0u32.to_le_bytes());
        }
        d.extend_from_slice(&0u32.to_le_bytes());
        d.extend_from_slice(&0u32.to_le_bytes());
        if version >= 3 {
            d.extend_from_slice(&0u32.to_le_bytes());
        }
        d.extend_from_slice(&0u32.to_le_bytes());
        d.extend_from_slice(&0u32.to_le_bytes());
        d.extend_from_slice(&0u16.to_le_bytes()); // sin colores de modo

        // Una zona.
        d.extend_from_slice(&1u16.to_le_bytes());
        cadena(&mut d, "Zona 1");
        for _ in 0..4 {
            d.extend_from_slice(&0u32.to_le_bytes());
        }
        d.extend_from_slice(&0u16.to_le_bytes()); // sin matriz

        d.extend_from_slice(&leds.to_le_bytes());
        d
    }

    #[test]
    fn parsea_el_bloque_de_un_controlador() {
        for version in [1, 3] {
            let bloque = bloque_controlador("ASUS Aura Motherboard", 42, version);
            let (nombre, leds) = parsear_controlador(&bloque, version)
                .unwrap_or_else(|e| panic!("version {version}: {e}"));
            assert_eq!(nombre, "ASUS Aura Motherboard");
            assert_eq!(leds, 42, "version {version}");
        }
    }

    #[test]
    fn un_bloque_truncado_se_rechaza_en_vez_de_entrar_en_panico() {
        // El flujo puede desalinearse; leer fuera del bloque tumbaria el proceso.
        let bloque = bloque_controlador("X", 8, 3);
        for corte in [0, 4, 12, bloque.len() / 2] {
            assert!(
                parsear_controlador(&bloque[..corte], 3).is_err(),
                "no deberia aceptar un bloque cortado en {corte}"
            );
        }
    }

    #[test]
    fn los_campos_de_brillo_desalinean_si_se_confunde_la_version() {
        // Leer un bloque de version 1 como si fuera 3 salta 12 bytes de mas y
        // devuelve basura. El test fija que la version importa de verdad.
        let bloque = bloque_controlador("X", 99, 1);
        let como_v1 = parsear_controlador(&bloque, 1).map(|(_, n)| n);
        let como_v3 = parsear_controlador(&bloque, 3).map(|(_, n)| n);
        assert_eq!(como_v1.unwrap(), 99);
        assert_ne!(como_v3.ok(), Some(99), "deberia salir desalineado");
    }
}
