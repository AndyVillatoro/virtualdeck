//! Editor de secuencias y macros.
//!
//! Son las dos últimas cosas que obligaban a editar el `deck-config.json` a
//! mano.
//!
//! # Secuencia
//!
//! Un botón puede tener **una** acción (`action`) o **varias** (`actions`). La
//! versión Electron modelaba esto igual, y hay que respetarlo: convertir todos
//! los botones a lista cambiaría el archivo de todos los usuarios sin motivo.
//! Aquí se convierte solo cuando alguien añade un segundo paso, y se vuelve a
//! una sola acción cuando se quita.
//!
//! # Macro
//!
//! Grabar teclado y ratón es una operación **global**: se capturan las pulsaciones
//! de todo el sistema, no las de esta ventana. Por eso la grabación corre mientras
//! el usuario va a otra aplicación, y se para desde aquí o sola al llegar al
//! límite de tiempo.

use egui::{Color32, RichText};
use vd_core::config::model::{ActionType, ButtonAction, ButtonConfig, MacroStep, MacroStepType};

/// Tope de la grabación.
///
/// Existe porque la grabación es global: si el usuario se olvida de pararla, un
/// hook de teclado activo indefinidamente es a la vez un consumo inútil y algo
/// que nadie quiere corriendo sin darse cuenta.
const MAXIMO_GRABACION: std::time::Duration = std::time::Duration::from_secs(60);

/// Estado de una grabación en curso.
pub struct Grabacion {
    pub desde: std::time::Instant,
    /// Botón que se estaba editando al empezar, para no aplicar los pasos a otro
    /// si el usuario cambia de selección mientras graba.
    pub boton: String,
}

/// Dibuja la sección de secuencia. Devuelve una orden de grabación si la hay.
pub fn ui(
    ui: &mut egui::Ui,
    b: &mut ButtonConfig,
    acento: Color32,
    grabando: Option<&Grabacion>,
    campos: &mut dyn FnMut(&mut egui::Ui, &mut ButtonAction),
) -> Option<Orden> {
    let mut orden = None;

    ui.label(RichText::new("Secuencia").color(acento).small().strong());
    ui.label(
        RichText::new("Varios pasos, en orden. Cada uno puede esperar o repetirse.")
            .small()
            .color(Color32::from_gray(110)),
    );
    ui.add_space(4.0);

    let pasos = b.actions.get_or_insert_with(|| vec![b.action.clone()]);

    let mut quitar = None;
    let mut subir = None;
    for (i, paso) in pasos.iter_mut().enumerate() {
        ui.push_id(i, |ui| {
            egui::Frame::NONE
                .fill(Color32::from_rgb(0x1B, 0x1F, 0x26))
                .inner_margin(8.0)
                .corner_radius(4.0)
                .show(ui, |ui| {
                    ui.horizontal(|ui| {
                        ui.label(RichText::new(format!("{}.", i + 1)).small().strong());
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.small_button("✕").on_hover_text("Quitar").clicked() {
                                quitar = Some(i);
                            }
                            // El primero no puede subir más.
                            if i > 0 && ui.small_button("↑").on_hover_text("Subir").clicked() {
                                subir = Some(i);
                            }
                        });
                    });

                    campos(ui, paso);
                    opciones_paso(ui, paso, i);
                });
        });
        ui.add_space(6.0);
    }

    ui.horizontal(|ui| {
        if ui.button("+ Añadir paso").clicked() {
            pasos.push(ButtonAction {
                action_type: ActionType::None,
                ..ButtonAction::default()
            });
        }

        let etiqueta = match grabando {
            Some(g) if g.boton == b.id => {
                let restante = MAXIMO_GRABACION.saturating_sub(g.desde.elapsed());
                format!("Detener ({} s)", restante.as_secs())
            }
            _ => "Grabar macro".to_string(),
        };
        let activo = grabando.is_some_and(|g| g.boton == b.id);
        let boton = egui::Button::new(RichText::new(etiqueta).color(if activo {
            Color32::BLACK
        } else {
            Color32::from_gray(190)
        }));
        let boton = if activo {
            boton.fill(Color32::from_rgb(0xE5, 0x73, 0x73))
        } else {
            boton
        };
        if ui
            .add(boton)
            .on_hover_text("Graba teclado y raton de todo el sistema")
            .clicked()
        {
            orden = Some(if activo {
                Orden::Detener
            } else {
                Orden::Grabar
            });
        }
    });

    if let Some(i) = subir {
        pasos.swap(i - 1, i);
    }
    if let Some(i) = quitar {
        pasos.remove(i);
    }

    // Una sola acción se guarda como `action`, no como lista de uno: así el
    // archivo no cambia de forma para los botones sencillos, que son la mayoría.
    if pasos.len() <= 1 {
        b.action = pasos.first().cloned().unwrap_or(ButtonAction {
            action_type: ActionType::None,
            ..ButtonAction::default()
        });
        b.actions = None;
    }

    orden
}

/// Lo que el usuario pidió sobre la grabación.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Orden {
    Grabar,
    Detener,
}

/// Opciones comunes a cualquier paso: espera, repeticiones y condición.
fn opciones_paso(ui: &mut egui::Ui, paso: &mut ButtonAction, indice: usize) {
    ui.add_space(4.0);
    ui.horizontal(|ui| {
        ui.label(RichText::new("Esperar").small());
        let mut espera = paso.delay_ms.unwrap_or(if indice > 0 { 150 } else { 0 });
        if ui
            .add(egui::DragValue::new(&mut espera).speed(10.0).suffix(" ms"))
            .changed()
        {
            paso.delay_ms = Some(espera.max(0));
        }

        ui.add_space(8.0);
        ui.label(RichText::new("Repetir").small());
        let mut repetir = paso.repeat.unwrap_or(1);
        if ui
            .add(egui::DragValue::new(&mut repetir).range(1..=100))
            .changed()
        {
            paso.repeat = (repetir > 1).then_some(repetir);
        }
    });

    // El primer paso no tiene anterior, así que la condición no aplica.
    if indice > 0 {
        let mut solo_si = paso.only_if_prev_ok.unwrap_or(false);
        if ui
            .checkbox(
                &mut solo_si,
                RichText::new("Solo si el paso anterior fue bien").small(),
            )
            .changed()
        {
            paso.only_if_prev_ok = solo_si.then_some(true);
        }
    }
}

/// Resume una macro grabada en una línea legible.
pub fn resumen_macro(pasos: &[MacroStep]) -> String {
    if pasos.is_empty() {
        return "sin pasos".into();
    }
    let teclas = pasos
        .iter()
        .filter(|p| matches!(p.step_type, MacroStepType::Key | MacroStepType::Hotkey))
        .count();
    let clics = pasos
        .iter()
        .filter(|p| matches!(p.step_type, MacroStepType::Click))
        .count();

    let mut partes = Vec::new();
    if teclas > 0 {
        partes.push(format!("{teclas} tecla(s)"));
    }
    if clics > 0 {
        partes.push(format!("{clics} clic(s)"));
    }
    if partes.is_empty() {
        partes.push(format!("{} paso(s)", pasos.len()));
    }
    partes.join(", ")
}

/// Cuánto puede durar una grabación antes de pararse sola.
pub fn maximo_grabacion() -> std::time::Duration {
    MAXIMO_GRABACION
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paso(t: MacroStepType) -> MacroStep {
        MacroStep {
            step_type: t,
            value: None,
            x: None,
            y: None,
            button: None,
            scroll_y: None,
            delay_ms: None,
        }
    }

    #[test]
    fn el_resumen_cuenta_teclas_y_clics() {
        let pasos = vec![
            paso(MacroStepType::Key),
            paso(MacroStepType::Key),
            paso(MacroStepType::Click),
            paso(MacroStepType::Delay),
        ];
        let r = resumen_macro(&pasos);
        assert!(r.contains("2 tecla"), "salio: {r}");
        assert!(r.contains("1 clic"), "salio: {r}");
    }

    #[test]
    fn una_macro_solo_de_pausas_igual_dice_algo() {
        // Sin este caso, una macro de solo esperas se resumiria como vacia.
        let r = resumen_macro(&[paso(MacroStepType::Delay), paso(MacroStepType::Delay)]);
        assert!(r.contains("2 paso"), "salio: {r}");
    }

    #[test]
    fn una_macro_vacia_lo_dice() {
        assert_eq!(resumen_macro(&[]), "sin pasos");
    }
}
