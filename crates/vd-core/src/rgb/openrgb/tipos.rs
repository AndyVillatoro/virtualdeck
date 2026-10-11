//! Tipos del cliente OpenRGB: error, modos y dispositivos.

use super::protocolo::{COLORES_AL_AZAR, COLORES_NINGUNO};

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
    pub(super) valor: u32,
    pub(super) banderas: u32,
    pub(super) velocidad_min: u32,
    pub(super) velocidad_max: u32,
    pub(super) brillo_min: u32,
    pub(super) brillo_max: u32,
    pub(super) colores_min: u32,
    pub(super) colores_max: u32,
    pub(super) velocidad: u32,
    pub(super) brillo: u32,
    pub(super) direccion: u32,
    pub(super) modo_color: u32,
    pub(super) colores: Vec<(u8, u8, u8)>,
}

impl Modo {
    /// Si tiene sentido pedirle a este modo un color concreto.
    pub(super) fn admite_color(&self) -> bool {
        self.colores_max > 0
            && self.modo_color != COLORES_NINGUNO
            && self.modo_color != COLORES_AL_AZAR
    }

    /// Si tiene sentido pedirle a este modo un brillo concreto.
    pub(super) fn admite_brillo(&self) -> bool {
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

    pub(super) fn nombres_de_modos(&self) -> String {
        self.modos
            .iter()
            .map(|m| m.nombre.as_str())
            .collect::<Vec<_>>()
            .join(", ")
    }
}
