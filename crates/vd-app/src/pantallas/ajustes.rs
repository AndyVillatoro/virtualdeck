//! Pantalla de ajustes.
//!
//! Porta lo esencial del panel de configuración de la versión Electron. Se abre
//! como una ventana flotante para no quitarle sitio a la rejilla, que es lo que
//! el usuario mira normalmente.

use crate::i18n::{t, tf};
use egui::{Color32, RichText};
use vd_core::config::model::{Language, SensorsSettings, Theme};

use crate::app::{color_hex, App};

/// Colores de acento predefinidos, los mismos que la versión Electron.
///
/// Existen porque elegir un color en una rueda es incómodo y casi nadie quiere
/// un tono concreto: quiere uno que quede bien. El selector libre sigue estando.
const ACENTOS: &[(&str, &str)] = &[
    ("#4FC3F7", "Cielo"),
    ("#81C784", "Menta"),
    ("#FFB74D", "Ámbar"),
    ("#E57373", "Coral"),
    ("#BA68C8", "Lavanda"),
    ("#4DD0E1", "Turquesa"),
    ("#F06292", "Rosa"),
    ("#A1887F", "Tierra"),
    ("#90A4AE", "Acero"),
    ("#FFD54F", "Oro"),
];

pub fn ui(app: &mut App, ctx: &egui::Context) {
    if !app.ajustes_abiertos {
        return;
    }

    let acento = app.acento();
    let mut abierto = true;
    let mut cambio = false;

    egui::Window::new(t("Ajustes"))
        .open(&mut abierto)
        .resizable(true)
        .default_width(380.0)
        .collapsible(false)
        .show(ctx, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                cambio |= apariencia(app, ui, acento);
                ui.add_space(12.0);
                cambio |= sensores(app, ui, acento);
                ui.add_space(12.0);
                sistema(app, ui, acento);
                ui.add_space(12.0);
                diagnostico(app, ui, acento);
            });
        });

    app.ajustes_abiertos = abierto;
    if cambio {
        app.guardar();
    }
}

fn apariencia(app: &mut App, ui: &mut egui::Ui, acento: Color32) -> bool {
    let mut cambio = false;
    ui.label(
        RichText::new(t("Apariencia"))
            .color(acento)
            .small()
            .strong(),
    );
    ui.add_space(4.0);

    let Some(cfg) = app.config.as_mut() else {
        return false;
    };

    ui.label(RichText::new(t("Acento")).small());
    ui.horizontal_wrapped(|ui| {
        for (hex, nombre) in ACENTOS {
            let color = color_hex(hex).unwrap_or(Color32::GRAY);
            let elegido = cfg.accent.eq_ignore_ascii_case(hex);
            let (rect, r) = ui.allocate_exact_size(egui::Vec2::splat(22.0), egui::Sense::click());
            ui.painter()
                .rect_filled(rect, egui::CornerRadius::same(4), color);
            if elegido || r.hovered() {
                ui.painter().rect_stroke(
                    rect,
                    egui::CornerRadius::same(4),
                    egui::Stroke::new(2.0_f32, Color32::WHITE),
                    egui::StrokeKind::Inside,
                );
            }
            if r.on_hover_text(*nombre).clicked() {
                cfg.accent = (*hex).to_string();
                cambio = true;
            }
        }

        // Color libre, para quien sí quiere un tono concreto.
        let mut libre = color_hex(&cfg.accent).unwrap_or(Color32::GRAY);
        if ui.color_edit_button_srgba(&mut libre).changed() {
            cfg.accent = format!("#{:02X}{:02X}{:02X}", libre.r(), libre.g(), libre.b());
            cambio = true;
        }
    });

    ui.add_space(8.0);
    ui.horizontal(|ui| {
        ui.label(RichText::new(t("Tema")).small());
        for (t, nombre) in [
            (Theme::System, t("Sistema")),
            (Theme::Light, t("Claro")),
            (Theme::Dark, t("Oscuro")),
        ] {
            if ui.selectable_label(cfg.theme == Some(t), nombre).clicked() {
                cfg.theme = Some(t);
                cambio = true;
            }
        }
    });

    ui.add_space(6.0);
    ui.horizontal(|ui| {
        ui.label(RichText::new(t("Idioma")).small());
        for (l, nombre) in [
            (Language::System, t("Sistema")),
            (Language::Es, "Español"),
            (Language::En, "English"),
        ] {
            if ui
                .selectable_label(cfg.language == Some(l), nombre)
                .clicked()
            {
                cfg.language = Some(l);
                // Se aplica al momento: un selector de idioma que exige
                // reiniciar es de las cosas mas frustrantes que hay.
                crate::i18n::configurar(Some(l));
                cambio = true;
            }
        }
    });

    cambio
}

fn sensores(app: &mut App, ui: &mut egui::Ui, acento: Color32) -> bool {
    let mut cambio = false;
    ui.label(RichText::new(t("Sensores")).color(acento).small().strong());

    // Se dice qué se obtiene sin hacer nada, porque el nivel 2 suena a requisito
    // y no lo es: casi todo funciona sin instalar nada.
    let nativos = app.datos.sensores.len();
    ui.label(
        RichText::new(tf(
            "{nativos} sensores disponibles sin instalar nada (CPU, memoria, disco, red, GPU).",
            &[("{nativos}", &nativos.to_string())],
        ))
        .small()
        .color(Color32::from_gray(120)),
    );
    ui.add_space(4.0);

    let Some(cfg) = app.config.as_mut() else {
        return false;
    };
    let s = cfg.sensors.get_or_insert_with(SensorsSettings::default);

    if ui
        .checkbox(
            &mut s.enabled,
            t("Usar LibreHardwareMonitor si está corriendo"),
        )
        .on_hover_text(
            "Añade temperatura del procesador, voltajes y ventiladores de la placa.\n\
             Requiere tener LibreHardwareMonitor abierto con su servidor web activo.",
        )
        .changed()
    {
        cambio = true;
    }

    if s.enabled {
        ui.horizontal(|ui| {
            ui.label(RichText::new(t("Host")).small());
            if ui
                .add(egui::TextEdit::singleline(&mut s.host).desired_width(110.0))
                .changed()
            {
                cambio = true;
            }
            ui.label(RichText::new(t("Puerto")).small());
            if ui.add(egui::DragValue::new(&mut s.port)).changed() {
                cambio = true;
            }
        });
        ui.label(
            RichText::new(t("Los cambios se aplican al reiniciar la aplicación."))
                .small()
                .color(Color32::from_gray(110)),
        );
    }

    cambio
}

fn sistema(app: &mut App, ui: &mut egui::Ui, acento: Color32) {
    ui.label(RichText::new(t("Sistema")).color(acento).small().strong());
    ui.add_space(4.0);

    // El estado se lee del registro, no de la configuración: alguien pudo
    // quitarlo desde el Administrador de tareas y la casilla tiene que reflejar
    // la realidad, no lo que creemos haber dejado.
    let mut arranca = vd_core::arranque::activo();
    if ui
        .checkbox(&mut arranca, t("Arrancar con Windows"))
        .on_hover_text(t(
            "Añade una entrada en el registro del usuario. No pide permisos de administrador.",
        ))
        .changed()
    {
        if let Err(e) = vd_core::arranque::set(arranca) {
            app.avisar_error(tf(
                "No se pudo cambiar el arranque: {e}",
                &[("{e}", &e.to_string())],
            ));
        }
    }
}

fn diagnostico(app: &mut App, ui: &mut egui::Ui, acento: Color32) {
    ui.label(
        RichText::new(t("Diagnóstico"))
            .color(acento)
            .small()
            .strong(),
    );
    ui.add_space(4.0);

    ui.horizontal(|ui| {
        if ui.button(t("Abrir carpeta de datos")).clicked() {
            match vd_core::config::user_data_dir() {
                Ok(d) => {
                    if let Err(e) = vd_core::launcher::open_path(&d.to_string_lossy()) {
                        app.avisar_error(tf(
                            "No se pudo abrir la carpeta: {e}",
                            &[("{e}", &e.to_string())],
                        ));
                    }
                }
                Err(e) => app.avisar_error(tf(
                    "No se pudo localizar la carpeta: {e}",
                    &[("{e}", &e.to_string())],
                )),
            }
        }
        if ui
            .button(t("Copiar registro"))
            .on_hover_text("Copia las últimas líneas del log, para adjuntar a un reporte")
            .clicked()
        {
            let texto = vd_core::log::read_recent(16 * 1024);
            if let Err(e) = vd_core::launcher::set_clipboard(&texto) {
                app.avisar_error(tf("No se pudo copiar: {e}", &[("{e}", &e.to_string())]));
            }
        }
    });

    let backups = vd_core::config::list_backups()
        .map(|b| b.len())
        .unwrap_or(0);
    ui.label(
        RichText::new(tf(
            "{backups} copia(s) de seguridad de la configuración",
            &[("{backups}", &backups.to_string())],
        ))
        .small()
        .color(Color32::from_gray(110)),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn todos_los_acentos_son_colores_validos() {
        for (hex, nombre) in ACENTOS {
            assert!(
                color_hex(hex).is_some(),
                "el acento {nombre} tiene un color ilegible: {hex}"
            );
        }
    }

    #[test]
    fn no_hay_acentos_repetidos() {
        let mut vistos = std::collections::HashSet::new();
        for (hex, _) in ACENTOS {
            assert!(vistos.insert(hex.to_uppercase()), "{hex} esta repetido");
        }
    }
}
