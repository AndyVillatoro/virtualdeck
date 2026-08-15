//! Iconos de marca en matriz de puntos.
//!
//! La versión Electron los definía en `src/data/brandIcons.ts` como mapas de
//! bits de 17×17 caracteres y los renderizaba a SVG. Aquí los datos son los
//! mismos —extraídos de aquel archivo, no reescritos a mano— pero se dibujan
//! directamente con el `Painter` de egui.
//!
//! Que sean **puntos y no imágenes** es la razón de que esto sea sencillo: no
//! hay que cargar archivos, decodificar PNG ni cachear texturas de GPU. Cada
//! icono son 289 círculos, y ya se midió que la rejilla llena de puntos va a
//! 144 fps.
//!
//! # El formato
//!
//! Cada fila es una cadena de 17 caracteres. El punto (`.`) es apagado;
//! cualquier otro carácter está encendido. Los iconos multicolor usan una
//! **paleta** que asocia cada carácter a un color, y así un logo de varios
//! colores cabe en el mismo mapa de caracteres.

use std::collections::HashMap;
use std::sync::LazyLock;

use egui::{Color32, Rect, Vec2};

/// Lado de la matriz, en puntos.
pub const LADO: usize = 17;

#[derive(serde::Deserialize)]
pub struct BrandIcon {
    pub key: String,
    pub label: String,
    /// Color principal, en `#RRGGBB`.
    pub color: String,
    pub group: String,
    pub bitmap: Vec<String>,
    /// Color por carácter, para los logos de varios colores.
    pub palette: Option<HashMap<String, String>>,
}

/// Los datos se empotran en el binario en vez de leerse de disco: son 31 KB, no
/// cambian nunca en tiempo de ejecución, y así no hay una ruta más que pueda
/// faltar en una instalación.
static DATOS: &str = include_str!("../assets/brand_icons.json");

static ICONOS: LazyLock<HashMap<String, BrandIcon>> = LazyLock::new(|| {
    let lista: Vec<BrandIcon> = serde_json::from_str(DATOS).expect(
        "brand_icons.json empotrado esta corrupto: es un error de compilacion, no de datos",
    );
    lista.into_iter().map(|i| (i.key.clone(), i)).collect()
});

pub fn buscar(clave: &str) -> Option<&'static BrandIcon> {
    ICONOS.get(clave)
}

pub fn todos() -> impl Iterator<Item = &'static BrandIcon> {
    ICONOS.values()
}

impl BrandIcon {
    /// Color de un carácter del mapa.
    ///
    /// `respaldo` se usa cuando el botón fija su propio color: en ese caso manda
    /// la elección del usuario sobre la del icono.
    fn color_de(&self, c: char, respaldo: Option<Color32>) -> Color32 {
        if let Some(forzado) = respaldo {
            return forzado;
        }
        if let Some(p) = &self.palette {
            if let Some(hex) = p.get(&c.to_string()) {
                if let Some(color) = crate::app::color_hex(hex) {
                    return color;
                }
            }
        }
        crate::app::color_hex(&self.color).unwrap_or(Color32::from_gray(210))
    }

    /// Dibuja el icono centrado dentro de `area`.
    ///
    /// `color_forzado` sustituye a los colores del icono; se usa cuando el botón
    /// define un color de texto propio, para que el conjunto se vea coherente.
    pub fn dibujar(&self, pintor: &egui::Painter, area: Rect, color_forzado: Option<Color32>) {
        if self.bitmap.is_empty() {
            return;
        }

        // La matriz es cuadrada, así que se inscribe en el lado menor para que no
        // se deforme en un área rectangular.
        let lado = area.width().min(area.height());
        let paso = lado / LADO as f32;
        // Los puntos se separan un poco entre sí: pegados, el icono se ve como
        // una mancha en vez de como una matriz.
        let radio = paso * 0.38;
        // Si el radio cae por debajo de medio píxel el icono desaparece; en ese
        // caso es mejor no dibujar nada que dejar una mancha gris.
        if radio < 0.5 {
            return;
        }

        let origen = area.center() - Vec2::splat(lado / 2.0);

        for (y, fila) in self.bitmap.iter().enumerate().take(LADO) {
            for (x, c) in fila.chars().enumerate().take(LADO) {
                if c == '.' {
                    continue;
                }
                let centro = origen + Vec2::new(paso * (x as f32 + 0.5), paso * (y as f32 + 0.5));
                pintor.circle_filled(centro, radio, self.color_de(c, color_forzado));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn los_datos_empotrados_se_leen() {
        let n = todos().count();
        assert!(n > 50, "se esperaban decenas de iconos, hay {n}");
    }

    #[test]
    fn todas_las_matrices_son_de_17_por_17() {
        // Una fila corta o de más desplazaría el dibujo sin dar ningún error.
        for i in todos() {
            assert_eq!(
                i.bitmap.len(),
                LADO,
                "icono {} tiene {} filas",
                i.key,
                i.bitmap.len()
            );
            for (n, fila) in i.bitmap.iter().enumerate() {
                assert_eq!(
                    fila.chars().count(),
                    LADO,
                    "icono {}, fila {n}: {} caracteres",
                    i.key,
                    fila.chars().count()
                );
            }
        }
    }

    #[test]
    fn todos_los_colores_son_validos() {
        for i in todos() {
            assert!(
                crate::app::color_hex(&i.color).is_some(),
                "icono {} tiene un color ilegible: {:?}",
                i.key,
                i.color
            );
            if let Some(p) = &i.palette {
                for (c, hex) in p {
                    assert!(
                        crate::app::color_hex(hex).is_some(),
                        "icono {}, caracter {c:?}: color ilegible {hex:?}",
                        i.key
                    );
                }
            }
        }
    }

    #[test]
    fn estan_los_iconos_que_usa_la_configuracion_real() {
        // Los que aparecen en el deck del desarrollador. Si el archivo de datos
        // se regenerara mal, esto lo delataria antes que mirar la pantalla.
        for clave in ["discord", "streamlabs", "chatgpt", "docker", "fileexplorer"] {
            assert!(buscar(clave).is_some(), "falta el icono {clave}");
        }
    }

    #[test]
    fn una_clave_desconocida_no_revienta() {
        assert!(buscar("no-existe-este-icono").is_none());
    }

    #[test]
    fn ningun_icono_esta_completamente_vacio() {
        for i in todos() {
            let encendidos: usize = i
                .bitmap
                .iter()
                .map(|f| f.chars().filter(|c| *c != '.').count())
                .sum();
            assert!(encendidos > 0, "el icono {} no tiene ningun punto", i.key);
        }
    }
}
