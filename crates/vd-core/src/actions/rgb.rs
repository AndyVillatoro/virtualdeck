//! Acciones RGB sobre OpenRGB: color plano, modo, perfil y presets.

use crate::config::model::ButtonAction;

use super::motor::{Ctx, Outcome};
use super::utilidades::envolver;

impl Ctx {
    /// Aplica un color plano a un dispositivo via OpenRGB.
    pub(super) fn rgb_color(&mut self, a: &ButtonAction) -> Outcome {
        let texto = self.texto(&a.rgb_color);
        let Some(color) = parsear_color(&texto) else {
            return Outcome::Failed(format!(
                "El color \"{texto}\" no se entiende; se espera #RRGGBB."
            ));
        };

        self.en_dispositivos_rgb(a, |cliente, indice| {
            cliente.pintar(indice, color).map(|_| ())
        })
    }

    /// Pone los dispositivos en uno de sus modos de efecto.
    pub(super) fn rgb_modo(&mut self, a: &ButtonAction) -> Outcome {
        let modo = self.texto(&a.rgb_mode);
        if modo.is_empty() {
            return Outcome::Failed("La accion no tiene ningun modo RGB configurado.".into());
        }
        // El color y el brillo son opcionales: cada modo decide si le sirven.
        let color = parsear_color(&self.texto(&a.rgb_color));
        let brillo = a.rgb_brightness.map(|b| b.clamp(0, 100) as u8);

        self.en_dispositivos_rgb(a, |cliente, indice| {
            cliente
                .aplicar_modo(indice, &modo, color, brillo)
                .map(|_| ())
        })
    }

    /// Carga un perfil guardado en OpenRGB.
    ///
    /// Un perfil es global, no de un dispositivo: se manda una sola vez.
    pub(super) fn rgb_perfil(&mut self, a: &ButtonAction) -> Outcome {
        let perfil = self.texto(&a.rgb_profile_name);
        if perfil.is_empty() {
            return Outcome::Failed("La accion no tiene ningun perfil RGB configurado.".into());
        }
        match conectar_openrgb() {
            Ok(mut cliente) => envolver(cliente.cargar_perfil(&perfil)),
            Err(e) => Outcome::Failed(e),
        }
    }

    /// Aplica un preset: un efecto con su color, sin depender del hardware.
    ///
    /// Cada preset lleva una lista de nombres de modo en orden de preferencia,
    /// porque el mismo efecto se llama distinto en cada fabricante. Si ninguno
    /// existe se cae al color plano, que funciona en todas partes.
    pub(super) fn rgb_preset(&mut self, a: &ButtonAction) -> Outcome {
        let id = self.texto(&a.rgb_preset_id);
        let Some(preset) = PRESETS_RGB.iter().find(|p| p.id == id) else {
            return Outcome::Failed(format!(
                "El preset RGB \"{id}\" no existe. Hay: {}",
                PRESETS_RGB
                    .iter()
                    .map(|p| p.id)
                    .collect::<Vec<_>>()
                    .join(", ")
            ));
        };
        let color = preset.color.and_then(parsear_color);

        self.en_dispositivos_rgb(a, |cliente, indice| {
            for nombre in preset.modos {
                if cliente.aplicar_modo(indice, nombre, color, None).is_ok() {
                    return Ok(());
                }
            }
            // Ningun modo del preset existe en este dispositivo. Con color se
            // deja al menos el color; sin el (un arcoiris) no hay equivalente.
            match color {
                Some(c) => cliente.pintar(indice, c).map(|_| ()),
                None => Err(crate::rgb::OpenRgbError::Protocolo(format!(
                    "ningun modo de \"{}\" existe en este dispositivo",
                    preset.id
                ))),
            }
        })
    }

    /// Corre una operación de OpenRGB sobre el dispositivo indicado, o sobre
    /// todos si la acción no nombra ninguno.
    ///
    /// Sin dispositivo indicado se actúa sobre todos, que es lo que espera quien
    /// pone un botón de "todo en rojo". Un fallo en uno **no** detiene a los
    /// demás: que la placa no admita un efecto no es razón para dejar los
    /// ventiladores como estaban.
    pub(super) fn en_dispositivos_rgb(
        &mut self,
        a: &ButtonAction,
        mut operacion: impl FnMut(&mut crate::rgb::OpenRgb, u32) -> Result<(), crate::rgb::OpenRgbError>,
    ) -> Outcome {
        let mut cliente = match conectar_openrgb() {
            Ok(c) => c,
            Err(e) => return Outcome::Failed(e),
        };

        if let Some(id) = a.rgb_device_id.filter(|id| *id >= 0) {
            return envolver(operacion(&mut cliente, id as u32));
        }

        let lista = match cliente.listar() {
            Ok(l) if l.is_empty() => {
                return Outcome::Failed("OpenRGB no ve ningun dispositivo RGB.".into())
            }
            Ok(l) => l,
            Err(e) => return Outcome::Failed(e.to_string()),
        };

        let mut fallos = Vec::new();
        for d in &lista {
            if let Err(e) = operacion(&mut cliente, d.indice) {
                fallos.push(format!("{}: {e}", d.nombre));
            }
        }
        // Un fallo parcial se cuenta como fallo y se nombra el dispositivo: que
        // la mitad de las luces cambie y la otra no es justo el caso en que hace
        // falta saber cuál se quedó fuera.
        if fallos.is_empty() {
            Outcome::Ok
        } else {
            Outcome::Failed(fallos.join("; "))
        }
    }
}

/// Un efecto con nombre, independiente del fabricante.
struct PresetRgb {
    id: &'static str,
    /// Color principal. `None` en los efectos que eligen sus propios colores.
    color: Option<&'static str>,
    /// Nombres de modo a probar, en orden de preferencia.
    modos: &'static [&'static str],
}

/// Los presets que ya traía la versión Electron, con los mismos identificadores.
///
/// **Los ids no se cambian**: están guardados en la configuración de quien ya los
/// use, y renombrar uno deja su botón sin hacer nada.
const PRESETS_RGB: &[PresetRgb] = &[
    PresetRgb {
        id: "off",
        color: Some("#000000"),
        modos: &["off", "black", "static", "direct", "custom"],
    },
    PresetRgb {
        id: "gaming",
        color: Some("#ff1800"),
        modos: &["breathing", "breath", "pulse", "blink", "static"],
    },
    PresetRgb {
        id: "cinema",
        color: Some("#200400"),
        modos: &["static", "direct", "custom", "breathing"],
    },
    PresetRgb {
        id: "work",
        color: Some("#ffffff"),
        modos: &["static", "direct", "custom"],
    },
    PresetRgb {
        id: "rainbow",
        color: None,
        modos: &[
            "spectrum cycle",
            "rainbow wave",
            "rainbow",
            "spectrum",
            "cycle",
        ],
    },
    PresetRgb {
        id: "night-blue",
        color: Some("#000880"),
        modos: &["breathing", "breath", "pulse", "static"],
    },
    PresetRgb {
        id: "alert-red",
        color: Some("#ff0000"),
        modos: &["flicker", "flash", "blink", "breathing", "static"],
    },
];

/// Los identificadores de preset que el motor reconoce.
///
/// La interfaz los necesita para armar su lista sin volver a escribirlos.
pub fn presets_rgb() -> Vec<&'static str> {
    PRESETS_RGB.iter().map(|p| p.id).collect()
}

/// Abre una conexión con OpenRGB, con un error que se entienda si no está.
fn conectar_openrgb() -> Result<crate::rgb::OpenRgb, String> {
    // El mensaje dice que hace falta OpenRGB: sin eso, un boton que no hace nada
    // no da ninguna pista de por que.
    crate::rgb::OpenRgb::conectar("127.0.0.1", crate::rgb::openrgb::PUERTO)
        .map_err(|e| e.to_string())
}

/// Interpreta un color `#RRGGBB` o `RRGGBB`.
pub(super) fn parsear_color(s: &str) -> Option<(u8, u8, u8)> {
    let h = s.trim().trim_start_matches('#');
    if h.len() != 6 {
        return None;
    }
    let leer = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).ok();
    Some((leer(0)?, leer(2)?, leer(4)?))
}
