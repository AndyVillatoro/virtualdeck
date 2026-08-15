//! Editor de botones: el panel lateral que aparece en modo edición.
//!
//! Porta lo esencial de `EditorB.tsx`. Escribe sobre una **copia** del botón y
//! solo la vuelca a la configuración al guardar, para que salirse del editor no
//! deje cambios a medias.

use egui::{Color32, RichText};
use vd_core::config::model::{ActionType, ButtonConfig};

use crate::app::App;

/// Tipos de acción que el editor sabe configurar, con su nombre para la lista.
///
/// No están todos los del modelo a propósito: los que necesitan una interfaz
/// propia —macros, secuencias, ramas— se editan en otro sitio y ofrecerlos aquí
/// sin su editor dejaría botones a medio configurar.
const TIPOS: &[(ActionType, &str)] = &[
    (ActionType::None, "Sin acción"),
    (ActionType::App, "Abrir aplicación"),
    (ActionType::Web, "Abrir URL"),
    (ActionType::Shortcut, "Abrir acceso directo"),
    (ActionType::Script, "Ejecutar script"),
    (ActionType::AudioDevice, "Cambiar dispositivo de audio"),
    (ActionType::Hotkey, "Enviar atajo de teclado"),
    (ActionType::TypeText, "Escribir texto"),
    (ActionType::Clipboard, "Copiar al portapapeles"),
    (ActionType::VolumeSet, "Fijar volumen"),
    (ActionType::VolumeUp, "Subir volumen"),
    (ActionType::VolumeDown, "Bajar volumen"),
    (ActionType::Mute, "Silenciar"),
    (ActionType::Brightness, "Fijar brillo"),
    (ActionType::MediaPlayPause, "Reproducir / pausar"),
    (ActionType::MediaNext, "Pista siguiente"),
    (ActionType::MediaPrev, "Pista anterior"),
    (ActionType::KillProcess, "Cerrar proceso"),
    (ActionType::Webhook, "Llamar a un webhook"),
    (ActionType::SetVar, "Fijar variable"),
    (ActionType::IncrVar, "Incrementar variable"),
];

fn nombre_tipo(t: &ActionType) -> String {
    TIPOS
        .iter()
        .find(|(tipo, _)| tipo == t)
        .map(|(_, n)| (*n).to_string())
        // Un tipo que este editor no cubre se muestra tal cual en vez de
        // esconderse: el usuario tiene que poder ver qué hay configurado aunque
        // no pueda cambiarlo desde aquí.
        .unwrap_or_else(|| format!("{t:?} (no editable aquí)"))
}

/// Dibuja el panel. Devuelve `true` si hay cambios sin guardar.
pub fn panel(app: &mut App, ctx: &egui::Context) {
    let Some(mut borrador) = app.borrador.clone() else {
        return;
    };

    let acento = app.acento();
    let mut guardar = false;
    let mut descartar = false;

    egui::SidePanel::right("editor")
        .resizable(true)
        .default_width(300.0)
        .frame(
            egui::Frame::NONE
                .fill(Color32::from_rgb(0x16, 0x19, 0x1F))
                .inner_margin(12.0),
        )
        .show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label(RichText::new("Editar botón").color(acento).strong());
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.label(
                        RichText::new(&borrador.id)
                            .small()
                            .color(Color32::from_gray(90)),
                    );
                });
            });
            ui.separator();

            egui::ScrollArea::vertical().show(ui, |ui| {
                apariencia(ui, &mut borrador, acento);
                ui.add_space(10.0);
                accion(ui, &mut borrador);
            });

            ui.separator();
            ui.horizontal(|ui| {
                if ui
                    .add(egui::Button::new(RichText::new("Guardar").strong()).fill(acento))
                    .clicked()
                {
                    guardar = true;
                }
                if ui.button("Descartar").clicked() {
                    descartar = true;
                }

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui
                        .button(RichText::new("Vaciar").color(Color32::from_rgb(0xE5, 0x73, 0x73)))
                        .on_hover_text("Deja el botón sin acción ni etiqueta")
                        .clicked()
                    {
                        borrador = ButtonConfig::empty(borrador.id.clone(), borrador.page);
                        guardar = true;
                    }
                });
            });
        });

    app.borrador = Some(borrador);

    if guardar {
        app.guardar_borrador();
    } else if descartar {
        app.borrador = None;
    }
}

fn apariencia(ui: &mut egui::Ui, b: &mut ButtonConfig, acento: Color32) {
    ui.label(RichText::new("Apariencia").color(acento).small().strong());
    ui.add_space(4.0);

    ui.label("Etiqueta");
    ui.add(egui::TextEdit::singleline(&mut b.label).desired_width(f32::INFINITY));

    ui.add_space(6.0);
    ui.label("Segunda línea");
    let mut sub = b.sublabel.clone().unwrap_or_default();
    if ui
        .add(egui::TextEdit::singleline(&mut sub).desired_width(f32::INFINITY))
        .changed()
    {
        // Vacío se guarda como ausente, no como cadena vacía: así el JSON no se
        // llena de campos que no dicen nada.
        b.sublabel = (!sub.is_empty()).then_some(sub);
    }

    ui.add_space(8.0);
    ui.label("Icono");
    let actual = b.brand_icon.clone().unwrap_or_default();
    let etiqueta = if actual.is_empty() {
        "Ninguno".to_string()
    } else {
        crate::iconos::buscar(&actual)
            .map(|i| i.label.clone())
            // Un icono que ya no existe en el paquete: se muestra su clave para
            // que el usuario entienda por qué no ve nada.
            .unwrap_or_else(|| format!("{actual} (desconocido)"))
    };

    egui::ComboBox::from_id_salt("icono")
        .selected_text(etiqueta)
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            if ui.selectable_label(actual.is_empty(), "Ninguno").clicked() {
                b.brand_icon = None;
            }
            // Ordenados por nombre: con 68 iconos, encontrarlos en el orden
            // arbitrario del archivo sería un suplicio.
            let mut lista: Vec<_> = crate::iconos::todos().collect();
            lista.sort_by_key(|i| i.label.to_lowercase());
            for icono in lista {
                if ui
                    .selectable_label(actual == icono.key, &icono.label)
                    .clicked()
                {
                    b.brand_icon = Some(icono.key.clone());
                }
            }
        });

    ui.add_space(8.0);
    ui.horizontal(|ui| {
        color_opcional(ui, "Fondo", &mut b.bg_color);
        ui.add_space(12.0);
        color_opcional(ui, "Texto", &mut b.fg_color);
    });
}

/// Selector de color que permite "sin definir", que es distinto de negro.
fn color_opcional(ui: &mut egui::Ui, etiqueta: &str, campo: &mut Option<String>) {
    ui.vertical(|ui| {
        ui.label(RichText::new(etiqueta).small());
        ui.horizontal(|ui| {
            let mut color = campo
                .as_deref()
                .and_then(crate::app::color_hex)
                .unwrap_or(Color32::from_gray(30));

            if ui.color_edit_button_srgba(&mut color).changed() {
                *campo = Some(format!(
                    "#{:02X}{:02X}{:02X}",
                    color.r(),
                    color.g(),
                    color.b()
                ));
            }
            if campo.is_some() && ui.small_button("×").on_hover_text("Quitar").clicked() {
                *campo = None;
            }
        });
    });
}

fn accion(ui: &mut egui::Ui, b: &mut ButtonConfig) {
    ui.label(
        RichText::new("Acción")
            .color(Color32::from_gray(160))
            .small()
            .strong(),
    );
    ui.add_space(4.0);

    egui::ComboBox::from_id_salt("tipo")
        .selected_text(nombre_tipo(&b.action.action_type))
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            for (tipo, nombre) in TIPOS {
                if ui
                    .selectable_label(b.action.action_type == *tipo, *nombre)
                    .clicked()
                {
                    b.action.action_type = tipo.clone();
                }
            }
        });

    ui.add_space(8.0);

    // Cada tipo enseña solo sus campos. Mostrarlos todos a la vez fue lo que hizo
    // ilegible el editor de la version Electron.
    match b.action.action_type {
        ActionType::App => {
            campo(ui, "Ruta del ejecutable", &mut b.action.app_path);
            campo(ui, "Argumentos", &mut b.action.app_args);
        }
        ActionType::Web => campo(ui, "URL", &mut b.action.url),
        ActionType::Shortcut => campo(ui, "Ruta del acceso directo", &mut b.action.shortcut_path),
        ActionType::Script => {
            multilinea(ui, "Script", &mut b.action.script);
            campo(
                ui,
                "Guardar salida en la variable",
                &mut b.action.capture_to_var,
            );
        }
        ActionType::AudioDevice => {
            campo(ui, "Nombre del dispositivo", &mut b.action.device_name);
            ui.label(
                RichText::new("Basta con parte del nombre.")
                    .small()
                    .color(Color32::from_gray(110)),
            );
        }
        ActionType::Hotkey => {
            campo(ui, "Combinación", &mut b.action.hotkey);
            ui.label(
                RichText::new("Por ejemplo: Ctrl+Shift+M")
                    .small()
                    .color(Color32::from_gray(110)),
            );
        }
        ActionType::TypeText => multilinea(ui, "Texto", &mut b.action.type_text),
        ActionType::Clipboard => multilinea(ui, "Texto", &mut b.action.clipboard_text),
        ActionType::VolumeSet => numero(ui, "Volumen (%)", &mut b.action.volume_percent, 0, 100),
        ActionType::Brightness => numero(ui, "Brillo (%)", &mut b.action.brightness_level, 0, 100),
        ActionType::KillProcess => campo(ui, "Nombre del proceso", &mut b.action.process_name),
        ActionType::Webhook => {
            campo(ui, "URL", &mut b.action.webhook_url);
            multilinea(ui, "Cuerpo", &mut b.action.webhook_body);
        }
        ActionType::SetVar => {
            campo(ui, "Variable", &mut b.action.var_name);
            campo(ui, "Valor", &mut b.action.var_value);
        }
        ActionType::IncrVar => {
            campo(ui, "Variable", &mut b.action.var_name);
            numero(ui, "Incremento", &mut b.action.var_delta, -1000, 1000);
        }
        // Los tipos sin parámetros (silenciar, pista siguiente…) no necesitan
        // nada más, y los no editables se avisan arriba en el desplegable.
        _ => {}
    }
}

fn campo(ui: &mut egui::Ui, etiqueta: &str, valor: &mut Option<String>) {
    ui.label(RichText::new(etiqueta).small());
    let mut texto = valor.clone().unwrap_or_default();
    if ui
        .add(egui::TextEdit::singleline(&mut texto).desired_width(f32::INFINITY))
        .changed()
    {
        *valor = (!texto.is_empty()).then_some(texto);
    }
    ui.add_space(6.0);
}

fn multilinea(ui: &mut egui::Ui, etiqueta: &str, valor: &mut Option<String>) {
    ui.label(RichText::new(etiqueta).small());
    let mut texto = valor.clone().unwrap_or_default();
    if ui
        .add(
            egui::TextEdit::multiline(&mut texto)
                .desired_width(f32::INFINITY)
                .desired_rows(3),
        )
        .changed()
    {
        *valor = (!texto.is_empty()).then_some(texto);
    }
    ui.add_space(6.0);
}

fn numero(ui: &mut egui::Ui, etiqueta: &str, valor: &mut Option<i64>, min: i64, max: i64) {
    ui.label(RichText::new(etiqueta).small());
    let mut n = valor.unwrap_or(0);
    if ui.add(egui::Slider::new(&mut n, min..=max)).changed() {
        *valor = Some(n);
    }
    ui.add_space(6.0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn todos_los_tipos_de_la_lista_tienen_nombre() {
        for (tipo, _) in TIPOS {
            assert!(
                !nombre_tipo(tipo).contains("no editable"),
                "{tipo:?} esta en la lista pero se muestra como no editable"
            );
        }
    }

    #[test]
    fn un_tipo_fuera_de_la_lista_se_avisa() {
        // El editor no cubre las macros, y el usuario tiene que verlo en vez de
        // creer que el boton no tiene accion.
        let n = nombre_tipo(&ActionType::Macro);
        assert!(n.contains("no editable"), "salio: {n}");
    }

    #[test]
    fn no_hay_tipos_repetidos_en_la_lista() {
        // Un duplicado haria que el desplegable mostrara dos entradas iguales y
        // que la seleccion pareciera no responder.
        let mut vistos = std::collections::HashSet::new();
        for (tipo, _) in TIPOS {
            assert!(vistos.insert(format!("{tipo:?}")), "{tipo:?} esta repetido");
        }
    }
}
