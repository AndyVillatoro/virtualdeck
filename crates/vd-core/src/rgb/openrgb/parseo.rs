//! Lectura de bloques del servidor: lector secuencial, modos, controladores y
//! perfiles.

use super::tipos::{Dispositivo, Modo, OpenRgbError};

/// Lector secuencial del bloque de un controlador.
pub(super) struct Lector<'a> {
    datos: &'a [u8],
    pos: usize,
}

impl<'a> Lector<'a> {
    pub(super) fn nuevo(datos: &'a [u8]) -> Self {
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
/// Es el inverso exacto de [`super::cuerpos::cuerpo_modo`]; si uno cambia, el otro también.
pub(super) fn leer_modo(l: &mut Lector, indice: u32, version: u32) -> Result<Modo, OpenRgbError> {
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
pub(super) fn parsear_controlador(datos: &[u8], version: u32) -> Result<Dispositivo, OpenRgbError> {
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
pub(super) fn parsear_perfiles(datos: &[u8]) -> Result<Vec<String>, OpenRgbError> {
    let mut l = Lector::nuevo(datos);
    l.u32()?; // tamaño total
    let cuantos = l.u16()?;
    let mut salida = Vec::with_capacity(cuantos as usize);
    for _ in 0..cuantos {
        salida.push(l.cadena()?);
    }
    Ok(salida)
}
