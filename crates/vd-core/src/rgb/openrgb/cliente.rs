//! Cliente TCP del servidor SDK de OpenRGB.

use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use super::cuerpos::{aplicar_ajustes, cuerpo_leds, cuerpo_modo};
use super::parseo::{parsear_controlador, parsear_perfiles};
use super::protocolo::{
    CMD_ACTUALIZAR_LEDS, CMD_ACTUALIZAR_MODO, CMD_CARGAR_PERFIL, CMD_CONTADOR,
    CMD_DATOS_CONTROLADOR, CMD_LISTA_PERFILES, CMD_MODO_PERSONALIZADO, CMD_NOMBRE_CLIENTE,
    CMD_VERSION, MAXIMO_MENSAJES_AJENOS, VERSION,
};
use super::tipos::{Dispositivo, OpenRgbError};

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
