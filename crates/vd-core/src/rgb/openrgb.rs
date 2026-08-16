//! Cliente del SDK de OpenRGB, por TCP.
//!
//! Es el **nivel 2** del RGB, el equivalente a lo que hacía la versión Electron
//! con `openrgb-sdk`. OpenRGB habla con cada dispositivo por su protocolo —placa,
//! ventiladores, AIO, GPU— y aquí solo se le pide que aplique colores y modos.
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
//! con nombre, modos, zonas y LEDs encadenados sin índice, así que para llegar a
//! los LEDs hay que recorrer modos y zonas enteros.
//!
//! Los números de comando y el orden exacto de los campos de un modo están
//! copiados de `NetworkProtocol.h` y `RGBController.cpp` del propio OpenRGB, no
//! deducidos. Son fáciles de confundir entre sí: ver el test que los fija.

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
const CMD_LISTA_PERFILES: u32 = 150;
const CMD_CARGAR_PERFIL: u32 = 152;
const CMD_ACTUALIZAR_LEDS: u32 = 1050;
/// `SETCUSTOMMODE`. **No es 1052**: ese es `UPDATESINGLELED`, y confundirlos deja
/// el dispositivo en su efecto anterior, que sobrescribe el color al instante.
const CMD_MODO_PERSONALIZADO: u32 = 1100;
const CMD_ACTUALIZAR_MODO: u32 = 1101;

/// Un modo sin colores propios: pedirle un color no tiene sentido.
const COLORES_NINGUNO: u32 = 0;
/// Un modo que elige sus colores al azar; forzarle uno no hace nada.
const COLORES_AL_AZAR: u32 = 3;

/// Cuántos mensajes ajenos se toleran antes de rendirse esperando la respuesta.
///
/// OpenRGB manda avisos que nadie pidió (la lista de dispositivos cambió, se
/// cargó un perfil). Si no se saltan, el siguiente `recibir` devuelve el aviso en
/// lugar de la respuesta y todo lo que venga después se lee desalineado.
const MAXIMO_MENSAJES_AJENOS: usize = 16;

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

    #[error("el dispositivo \"{dispositivo}\" no tiene ningun modo llamado \"{modo}\". Tiene: {disponibles}")]
    SinModo {
        dispositivo: String,
        modo: String,
        disponibles: String,
    },
}

/// Un modo de efecto tal como lo describe OpenRGB.
///
/// Se guarda **entero** aunque solo se toquen el color y el brillo: para cambiar
/// un modo hay que devolverle al servidor su descripción completa, y un campo
/// inventado cambiaría la velocidad o la dirección sin que nadie lo pidiera.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Modo {
    pub indice: u32,
    pub nombre: String,
    valor: u32,
    banderas: u32,
    velocidad_min: u32,
    velocidad_max: u32,
    brillo_min: u32,
    brillo_max: u32,
    colores_min: u32,
    colores_max: u32,
    velocidad: u32,
    brillo: u32,
    direccion: u32,
    modo_color: u32,
    colores: Vec<(u8, u8, u8)>,
}

impl Modo {
    /// Si tiene sentido pedirle a este modo un color concreto.
    fn admite_color(&self) -> bool {
        self.colores_max > 0
            && self.modo_color != COLORES_NINGUNO
            && self.modo_color != COLORES_AL_AZAR
    }

    /// Si tiene sentido pedirle a este modo un brillo concreto.
    fn admite_brillo(&self) -> bool {
        self.brillo_max > self.brillo_min
    }
}

/// Un dispositivo RGB tal como lo ve OpenRGB.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Dispositivo {
    pub indice: u32,
    pub nombre: String,
    pub leds: u16,
    pub modo_activo: u32,
    pub modos: Vec<Modo>,
}

impl Dispositivo {
    /// Busca un modo por nombre, sin distinguir mayúsculas.
    ///
    /// Acepta coincidencia parcial porque los nombres varían entre fabricantes:
    /// lo que en una placa es "Breathing" en otra es "Breathing Cycle".
    pub fn buscar_modo(&self, nombre: &str) -> Option<&Modo> {
        let buscado = nombre.trim().to_lowercase();
        if buscado.is_empty() {
            return None;
        }
        self.modos
            .iter()
            .find(|m| m.nombre.to_lowercase() == buscado)
            .or_else(|| {
                self.modos
                    .iter()
                    .find(|m| m.nombre.to_lowercase().contains(&buscado))
            })
    }

    fn nombres_de_modos(&self) -> String {
        self.modos
            .iter()
            .map(|m| m.nombre.as_str())
            .collect::<Vec<_>>()
            .join(", ")
    }
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
        match self.esperar(CMD_VERSION) {
            Ok(datos) if datos.len() >= 4 => {
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
        let datos = self.esperar(CMD_CONTADOR)?;
        if datos.len() < 4 {
            return Err(OpenRgbError::Protocolo("contador incompleto".into()));
        }
        Ok(u32::from_le_bytes([datos[0], datos[1], datos[2], datos[3]]))
    }

    /// Lista los dispositivos con su nombre, LEDs y modos.
    pub fn listar(&mut self) -> Result<Vec<Dispositivo>, OpenRgbError> {
        let n = self.contar()?;
        let mut salida = Vec::with_capacity(n as usize);
        for i in 0..n {
            salida.push(self.dispositivo(i)?);
        }
        Ok(salida)
    }

    /// Pide la descripción completa de un dispositivo.
    pub fn dispositivo(&mut self, indice: u32) -> Result<Dispositivo, OpenRgbError> {
        self.enviar(indice, CMD_DATOS_CONTROLADOR, &self.version.to_le_bytes())?;
        let datos = self.esperar(CMD_DATOS_CONTROLADOR)?;
        let mut d = parsear_controlador(&datos, self.version)?;
        d.indice = indice;
        Ok(d)
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

    /// Pone un dispositivo en uno de sus modos de efecto.
    ///
    /// `color` y `brillo_pct` son opcionales y se aplican **solo si el modo los
    /// admite**: pedirle un color a un arcoíris no significa nada, y mandárselo
    /// de todas formas hace que OpenRGB rechace la descripción entera.
    ///
    /// Devuelve el nombre real del modo aplicado, que puede no ser el que se
    /// pidió: la búsqueda acepta coincidencias parciales.
    pub fn aplicar_modo(
        &mut self,
        indice: u32,
        nombre_modo: &str,
        color: Option<(u8, u8, u8)>,
        brillo_pct: Option<u8>,
    ) -> Result<String, OpenRgbError> {
        let dispositivo = self.dispositivo(indice)?;
        let modo = dispositivo
            .buscar_modo(nombre_modo)
            .ok_or_else(|| OpenRgbError::SinModo {
                dispositivo: dispositivo.nombre.clone(),
                modo: nombre_modo.to_string(),
                disponibles: dispositivo.nombres_de_modos(),
            })?;

        let mut modo = modo.clone();
        aplicar_ajustes(&mut modo, color, brillo_pct);
        self.enviar(
            indice,
            CMD_ACTUALIZAR_MODO,
            &cuerpo_modo(&modo, self.version),
        )?;
        Ok(modo.nombre)
    }

    /// Los perfiles guardados en OpenRGB.
    pub fn perfiles(&mut self) -> Result<Vec<String>, OpenRgbError> {
        self.enviar(0, CMD_LISTA_PERFILES, &[])?;
        let datos = self.esperar(CMD_LISTA_PERFILES)?;
        parsear_perfiles(&datos)
    }

    /// Carga un perfil de OpenRGB por su nombre.
    ///
    /// El servidor no contesta: si el perfil no existe, lo ignora en silencio.
    /// Por eso se comprueba antes contra la lista.
    pub fn cargar_perfil(&mut self, nombre: &str) -> Result<(), OpenRgbError> {
        let disponibles = self.perfiles()?;
        if !disponibles.iter().any(|p| p == nombre) {
            return Err(OpenRgbError::Protocolo(format!(
                "OpenRGB no tiene ningun perfil llamado \"{nombre}\". Tiene: {}",
                if disponibles.is_empty() {
                    "ninguno".to_string()
                } else {
                    disponibles.join(", ")
                }
            )));
        }

        let mut datos = nombre.as_bytes().to_vec();
        datos.push(0);
        self.enviar(0, CMD_CARGAR_PERFIL, &datos)
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

    /// Lee mensajes hasta encontrar el que responde a lo que se pidió.
    fn esperar(&mut self, comando: u32) -> Result<Vec<u8>, OpenRgbError> {
        for _ in 0..MAXIMO_MENSAJES_AJENOS {
            let (recibido, datos) = self.recibir()?;
            if recibido == comando {
                return Ok(datos);
            }
        }
        Err(OpenRgbError::Protocolo(format!(
            "OpenRGB no contesto al comando {comando} en {MAXIMO_MENSAJES_AJENOS} mensajes"
        )))
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

/// Mete el color y el brillo pedidos en un modo, si el modo los admite.
fn aplicar_ajustes(modo: &mut Modo, color: Option<(u8, u8, u8)>, brillo_pct: Option<u8>) {
    if let Some(c) = color {
        if modo.admite_color() {
            // Algunos modos exigen un mínimo de colores (un degradado necesita
            // dos). Se repite el mismo en todos: es lo que espera quien pide
            // "este efecto, en rojo".
            let cuantos = modo.colores_min.max(1).min(modo.colores_max) as usize;
            modo.colores = vec![c; cuantos];
        }
    }
    if let Some(pct) = brillo_pct {
        if modo.admite_brillo() {
            let rango = modo.brillo_max - modo.brillo_min;
            let pct = u32::from(pct.min(100));
            modo.brillo = modo.brillo_min + rango * pct / 100;
        }
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

/// Cuerpo del comando de actualizar modo.
///
/// El orden de los campos es el de `GetModeDescriptionData` en OpenRGB y **tiene
/// que coincidir exactamente**: no hay nombres en el flujo, solo posiciones.
fn cuerpo_modo(modo: &Modo, version: u32) -> Vec<u8> {
    let mut cuerpo = Vec::new();
    cuerpo.extend_from_slice(&modo.indice.to_le_bytes());

    let nombre = modo.nombre.as_bytes();
    cuerpo.extend_from_slice(&((nombre.len() + 1) as u16).to_le_bytes());
    cuerpo.extend_from_slice(nombre);
    cuerpo.push(0);

    cuerpo.extend_from_slice(&modo.valor.to_le_bytes());
    cuerpo.extend_from_slice(&modo.banderas.to_le_bytes());
    cuerpo.extend_from_slice(&modo.velocidad_min.to_le_bytes());
    cuerpo.extend_from_slice(&modo.velocidad_max.to_le_bytes());
    if version >= 3 {
        cuerpo.extend_from_slice(&modo.brillo_min.to_le_bytes());
        cuerpo.extend_from_slice(&modo.brillo_max.to_le_bytes());
    }
    cuerpo.extend_from_slice(&modo.colores_min.to_le_bytes());
    cuerpo.extend_from_slice(&modo.colores_max.to_le_bytes());
    cuerpo.extend_from_slice(&modo.velocidad.to_le_bytes());
    if version >= 3 {
        cuerpo.extend_from_slice(&modo.brillo.to_le_bytes());
    }
    cuerpo.extend_from_slice(&modo.direccion.to_le_bytes());
    cuerpo.extend_from_slice(&modo.modo_color.to_le_bytes());
    cuerpo.extend_from_slice(&(modo.colores.len() as u16).to_le_bytes());
    for (r, g, b) in &modo.colores {
        cuerpo.extend_from_slice(&[*r, *g, *b, 0]);
    }

    // El tamaño total va delante y se cuenta a sí mismo.
    let mut datos = Vec::with_capacity(4 + cuerpo.len());
    datos.extend_from_slice(&((cuerpo.len() + 4) as u32).to_le_bytes());
    datos.extend_from_slice(&cuerpo);
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

    /// Color de cuatro bytes; el último no se usa.
    fn color(&mut self) -> Result<(u8, u8, u8), OpenRgbError> {
        let i = self.pos;
        self.saltar(4)?;
        Ok((self.datos[i], self.datos[i + 1], self.datos[i + 2]))
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

/// Lee un modo del bloque de un controlador.
///
/// Es el inverso exacto de [`cuerpo_modo`]; si uno cambia, el otro también.
fn leer_modo(l: &mut Lector, indice: u32, version: u32) -> Result<Modo, OpenRgbError> {
    let nombre = l.cadena()?;
    let valor = l.u32()?;
    let banderas = l.u32()?;
    let velocidad_min = l.u32()?;
    let velocidad_max = l.u32()?;
    let (brillo_min, brillo_max) = if version >= 3 {
        (l.u32()?, l.u32()?)
    } else {
        (0, 0)
    };
    let colores_min = l.u32()?;
    let colores_max = l.u32()?;
    let velocidad = l.u32()?;
    let brillo = if version >= 3 { l.u32()? } else { 0 };
    let direccion = l.u32()?;
    let modo_color = l.u32()?;

    let cuantos = l.u16()? as usize;
    let mut colores = Vec::with_capacity(cuantos);
    for _ in 0..cuantos {
        colores.push(l.color()?);
    }

    Ok(Modo {
        indice,
        nombre,
        valor,
        banderas,
        velocidad_min,
        velocidad_max,
        brillo_min,
        brillo_max,
        colores_min,
        colores_max,
        velocidad,
        brillo,
        direccion,
        modo_color,
        colores,
    })
}

/// Saca nombre, modos y número de LEDs del bloque de un controlador.
///
/// Hay que recorrer modos y zonas enteros aunque no se usen: el bloque no tiene
/// índice y el número de LEDs está detrás de todo eso.
fn parsear_controlador(datos: &[u8], version: u32) -> Result<Dispositivo, OpenRgbError> {
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

    let cuantos_modos = l.u16()?;
    let modo_activo = l.u32()?;
    let mut modos = Vec::with_capacity(cuantos_modos as usize);
    for i in 0..cuantos_modos {
        modos.push(leer_modo(&mut l, u32::from(i), version)?);
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
    Ok(Dispositivo {
        indice: 0,
        nombre,
        leds,
        modo_activo,
        modos,
    })
}

/// Lee la lista de perfiles: tamaño, cuenta, y una cadena por perfil.
fn parsear_perfiles(datos: &[u8]) -> Result<Vec<String>, OpenRgbError> {
    let mut l = Lector::nuevo(datos);
    l.u32()?; // tamaño total
    let cuantos = l.u16()?;
    let mut salida = Vec::with_capacity(cuantos as usize);
    for _ in 0..cuantos {
        salida.push(l.cadena()?);
    }
    Ok(salida)
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

    /// Los números de comando se parecen demasiado entre sí y confundirlos no da
    /// ningún error: el servidor descarta el mensaje y las luces no cambian. Ya
    /// pasó una vez con 1052 (`UPDATESINGLELED`) en lugar de 1100.
    #[test]
    fn los_comandos_son_los_de_openrgb() {
        assert_eq!(CMD_MODO_PERSONALIZADO, 1100, "SETCUSTOMMODE");
        assert_eq!(CMD_ACTUALIZAR_MODO, 1101, "UPDATEMODE");
        assert_eq!(CMD_ACTUALIZAR_LEDS, 1050, "UPDATELEDS");
        assert_eq!(CMD_LISTA_PERFILES, 150, "GET_PROFILE_LIST");
        assert_eq!(CMD_CARGAR_PERFIL, 152, "LOAD_PROFILE");
        // 1052 es UPDATESINGLELED: si alguien lo reintroduce como "modo
        // personalizado", este test lo dice.
        assert_ne!(CMD_MODO_PERSONALIZADO, 1052);
    }

    fn modo_de_ejemplo() -> Modo {
        Modo {
            indice: 2,
            nombre: "Breathing".into(),
            valor: 7,
            banderas: 0b101,
            velocidad_min: 0,
            velocidad_max: 5,
            brillo_min: 0,
            brillo_max: 100,
            colores_min: 1,
            colores_max: 3,
            velocidad: 2,
            brillo: 50,
            direccion: 1,
            modo_color: 2,
            colores: vec![(1, 2, 3)],
        }
    }

    /// Escribir un modo y volverlo a leer tiene que devolver lo mismo. Es la
    /// unica forma de saber que el orden de los campos es correcto sin OpenRGB
    /// delante: cualquier campo movido rompe la ida y vuelta.
    #[test]
    fn un_modo_sobrevive_la_ida_y_vuelta() {
        for version in [1, 3] {
            let original = modo_de_ejemplo();
            let bytes = cuerpo_modo(&original, version);

            // Se salta el tamaño y el indice, que la lectura del bloque no lee.
            let mut l = Lector::nuevo(&bytes[8..]);
            let leido = leer_modo(&mut l, original.indice, version).expect("releer");

            let esperado = if version >= 3 {
                original
            } else {
                // Sin version 3 el brillo no viaja, asi que vuelve a cero.
                Modo {
                    brillo_min: 0,
                    brillo_max: 0,
                    brillo: 0,
                    ..original
                }
            };
            assert_eq!(leido, esperado, "version {version}");
        }
    }

    #[test]
    fn el_tamano_del_cuerpo_de_modo_se_cuenta_a_si_mismo() {
        let bytes = cuerpo_modo(&modo_de_ejemplo(), 3);
        let declarado = u32::from_le_bytes(bytes[0..4].try_into().unwrap()) as usize;
        assert_eq!(declarado, bytes.len());
    }

    #[test]
    fn el_color_solo_se_aplica_a_los_modos_que_lo_admiten() {
        // Un arcoiris elige sus colores solo; forzarle uno haria que OpenRGB
        // rechazara la descripcion entera.
        let mut arcoiris = Modo {
            modo_color: COLORES_AL_AZAR,
            colores: vec![],
            ..modo_de_ejemplo()
        };
        aplicar_ajustes(&mut arcoiris, Some((9, 9, 9)), None);
        assert!(arcoiris.colores.is_empty());

        let mut estatico = modo_de_ejemplo();
        aplicar_ajustes(&mut estatico, Some((9, 9, 9)), None);
        assert_eq!(estatico.colores, vec![(9, 9, 9)]);
    }

    #[test]
    fn el_brillo_se_reparte_dentro_del_rango_del_modo() {
        let mut m = Modo {
            brillo_min: 20,
            brillo_max: 40,
            ..modo_de_ejemplo()
        };
        aplicar_ajustes(&mut m, None, Some(50));
        assert_eq!(m.brillo, 30);

        // Por encima de 100 se recorta, en vez de salirse del rango.
        aplicar_ajustes(&mut m, None, Some(200));
        assert_eq!(m.brillo, 40);

        // Un modo sin rango de brillo se queda como estaba.
        let mut sin_brillo = Modo {
            brillo_min: 0,
            brillo_max: 0,
            brillo: 7,
            ..modo_de_ejemplo()
        };
        aplicar_ajustes(&mut sin_brillo, None, Some(90));
        assert_eq!(sin_brillo.brillo, 7);
    }

    #[test]
    fn un_modo_que_exige_varios_colores_los_recibe_todos() {
        // Un degradado con colores_min = 2 rechazaria una lista de uno solo.
        let mut degradado = Modo {
            colores_min: 2,
            colores_max: 4,
            ..modo_de_ejemplo()
        };
        aplicar_ajustes(&mut degradado, Some((5, 5, 5)), None);
        assert_eq!(degradado.colores, vec![(5, 5, 5); 2]);
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

        // Dos modos, para ejercitar el recorrido y la busqueda por nombre.
        d.extend_from_slice(&2u16.to_le_bytes());
        d.extend_from_slice(&0u32.to_le_bytes()); // modo activo
        for nombre_modo in ["Directo", "Breathing"] {
            let mut m = modo_de_ejemplo();
            m.nombre = nombre_modo.into();
            let bytes = cuerpo_modo(&m, version);
            // Sin el tamaño ni el indice: dentro del bloque no van.
            d.extend_from_slice(&bytes[8..]);
        }

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
            let d = parsear_controlador(&bloque, version)
                .unwrap_or_else(|e| panic!("version {version}: {e}"));
            assert_eq!(d.nombre, "ASUS Aura Motherboard");
            assert_eq!(d.leds, 42, "version {version}");
            assert_eq!(d.modos.len(), 2);
            assert_eq!(d.modos[1].nombre, "Breathing");
            assert_eq!(d.modos[1].indice, 1, "el indice se asigna por posicion");
        }
    }

    #[test]
    fn busca_modos_sin_distinguir_mayusculas_y_por_trozos() {
        let bloque = bloque_controlador("X", 3, 3);
        let d = parsear_controlador(&bloque, 3).unwrap();

        assert_eq!(d.buscar_modo("breathing").map(|m| m.indice), Some(1));
        assert_eq!(d.buscar_modo("BREATH").map(|m| m.indice), Some(1));
        assert_eq!(d.buscar_modo("directo").map(|m| m.indice), Some(0));
        assert!(d.buscar_modo("arcoiris").is_none());
        assert!(d.buscar_modo("  ").is_none(), "vacio no vale como comodin");
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
        let como_v1 = parsear_controlador(&bloque, 1).map(|d| d.leds);
        let como_v3 = parsear_controlador(&bloque, 3).map(|d| d.leds);
        assert_eq!(como_v1.unwrap(), 99);
        assert_ne!(como_v3.ok(), Some(99), "deberia salir desalineado");
    }

    #[test]
    fn lee_la_lista_de_perfiles() {
        let mut d = Vec::new();
        d.extend_from_slice(&0u32.to_le_bytes());
        d.extend_from_slice(&2u16.to_le_bytes());
        for nombre in ["Juego", "Trabajo"] {
            d.extend_from_slice(&((nombre.len() + 1) as u16).to_le_bytes());
            d.extend_from_slice(nombre.as_bytes());
            d.push(0);
        }
        assert_eq!(parsear_perfiles(&d).unwrap(), vec!["Juego", "Trabajo"]);

        // Una lista vacia es normal: OpenRGB recien instalado no tiene perfiles.
        let vacia = [0u8; 6];
        assert!(parsear_perfiles(&vacia).unwrap().is_empty());
    }
}
