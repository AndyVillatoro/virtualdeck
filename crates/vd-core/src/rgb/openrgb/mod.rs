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

mod cliente;
mod cuerpos;
mod parseo;
mod protocolo;
mod tipos;

#[cfg(test)]
mod pruebas;

pub use cliente::Cliente;
pub use tipos::{Dispositivo, Modo, OpenRgbError};

/// Puerto por defecto del servidor SDK de OpenRGB.
pub const PUERTO: u16 = 6742;
