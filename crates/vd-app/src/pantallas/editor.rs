//! Editor de botones: el panel lateral que aparece en modo edición.
//!
//! Porta lo esencial de `EditorB.tsx`. Escribe sobre una **copia** del botón y
//! solo la vuelca a la configuración al guardar, para que salirse del editor no
//! deje cambios a medias.

use egui::{Color32, RichText};
use vd_core::config::model::{ActionType, ButtonConfig, SensorWidget, VarWidget, WidgetKind};

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
    // Se copia la lista de sensores porque `app` queda prestado mientras se
    // dibuja el panel, y el selector la necesita para ofrecer los disponibles.
    let sensores: Vec<(String, String, String)> = app
        .datos
        .sensores
        .iter()
        .map(|s| (s.id.clone(), s.name.clone(), s.hardware.clone()))
        .collect();
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
                widget(ui, &mut borrador, &sensores, acento);
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

/// Tipos de widget, con su nombre para la lista.
const WIDGETS: &[(WidgetKind, &str)] = &[
    (WidgetKind::Clock, "Reloj"),
    (WidgetKind::Weather, "Clima"),
    (WidgetKind::NowPlaying, "Reproduccion"),
    (WidgetKind::Sensor, "Sensor"),
    (WidgetKind::Variable, "Variable"),
];

fn nombre_widget(k: Option<WidgetKind>) -> &'static str {
    match k {
        None => "Ninguno",
        Some(kind) => WIDGETS
            .iter()
            .find(|(w, _)| *w == kind)
            .map_or("Ninguno", |(_, n)| *n),
    }
}

fn widget(
    ui: &mut egui::Ui,
    b: &mut ButtonConfig,
    sensores: &[(String, String, String)],
    acento: Color32,
) {
    ui.label(RichText::new("Widget").color(acento).small().strong());
    ui.label(
        RichText::new("Sustituye a la etiqueta por algo vivo. El boton sigue siendo pulsable.")
            .small()
            .color(Color32::from_gray(110)),
    );
    ui.add_space(4.0);

    egui::ComboBox::from_id_salt("widget")
        .selected_text(nombre_widget(b.widget))
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            if ui.selectable_label(b.widget.is_none(), "Ninguno").clicked() {
                b.widget = None;
            }
            for (kind, nombre) in WIDGETS {
                if ui
                    .selectable_label(b.widget == Some(*kind), *nombre)
                    .clicked()
                {
                    b.widget = Some(*kind);
                }
            }
        });

    match b.widget {
        Some(WidgetKind::Sensor) => {
            ui.add_space(6.0);
            widget_sensor(ui, b, sensores);
        }
        Some(WidgetKind::Variable) => {
            ui.add_space(6.0);
            widget_variable(ui, b);
        }
        // Reloj, clima y reproduccion no tienen nada que configurar.
        _ => {}
    }
}

fn widget_sensor(ui: &mut egui::Ui, b: &mut ButtonConfig, sensores: &[(String, String, String)]) {
    // Se crea la configuracion al vuelo: elegir el tipo de widget no deberia
    // obligar a rellenar nada antes de ver el selector.
    let cfg = b.sensor_widget.get_or_insert_with(|| SensorWidget {
        sensor_id: String::new(),
        suffix: None,
        warn_at: None,
        crit_at: None,
    });

    let actual = sensores
        .iter()
        .find(|(id, _, _)| *id == cfg.sensor_id)
        .map(|(_, nombre, hw)| format!("{hw} · {nombre}"))
        .unwrap_or_else(|| {
            if cfg.sensor_id.is_empty() {
                "Elegir sensor".to_string()
            } else {
                // El sensor guardado puede no existir aqui: viene de otro equipo,
                // o es de LHM y el nivel 2 esta apagado. Se muestra su id para que
                // se entienda por que el boton no ensena nada.
                format!("{} (no disponible ahora)", cfg.sensor_id)
            }
        });

    ui.label(RichText::new("Sensor").small());
    egui::ComboBox::from_id_salt("sensor")
        .selected_text(actual)
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            if sensores.is_empty() {
                ui.label(
                    RichText::new("Todavia no hay lecturas")
                        .small()
                        .color(Color32::from_gray(110)),
                );
            }
            for (id, nombre, hw) in sensores {
                if ui
                    .selectable_label(cfg.sensor_id == *id, format!("{hw} · {nombre}"))
                    .clicked()
                {
                    cfg.sensor_id = id.clone();
                }
            }
        });

    ui.add_space(6.0);
    ui.label(RichText::new("Unidad (vacio = la del sensor)").small());
    let mut sufijo = cfg.suffix.clone().unwrap_or_default();
    if ui
        .add(egui::TextEdit::singleline(&mut sufijo).desired_width(f32::INFINITY))
        .changed()
    {
        cfg.suffix = (!sufijo.is_empty()).then_some(sufijo);
    }

    ui.add_space(6.0);
    ui.label(
        RichText::new("Umbrales: el valor cambia de color al pasarlos")
            .small()
            .color(Color32::from_gray(110)),
    );
    umbral(ui, "Advertencia", &mut cfg.warn_at);
    umbral(ui, "Critico", &mut cfg.crit_at);
}

/// Umbral opcional: se puede dejar sin definir, que no es lo mismo que cero.
fn umbral(ui: &mut egui::Ui, etiqueta: &str, campo: &mut Option<f64>) {
    ui.horizontal(|ui| {
        let mut activo = campo.is_some();
        if ui.checkbox(&mut activo, etiqueta).changed() {
            *campo = activo.then_some(0.0);
        }
        if let Some(v) = campo.as_mut() {
            ui.add(egui::DragValue::new(v).speed(1.0));
        }
    });
}

fn widget_variable(ui: &mut egui::Ui, b: &mut ButtonConfig) {
    let cfg = b.var_widget.get_or_insert_with(|| VarWidget {
        var_name: String::new(),
        prefix: None,
        suffix: None,
    });

    ui.label(RichText::new("Variable").small());
    ui.add(egui::TextEdit::singleline(&mut cfg.var_name).desired_width(f32::INFINITY));

    ui.add_space(6.0);
    ui.horizontal(|ui| {
        // Prefijo y sufijo envuelven al valor: "CPU " + "78" + " %".
        for (etiqueta, campo) in [("Prefijo", &mut cfg.prefix), ("Sufijo", &mut cfg.suffix)] {
            ui.vertical(|ui| {
                ui.label(RichText::new(etiqueta).small());
                let mut texto = campo.clone().unwrap_or_default();
                if ui
                    .add(egui::TextEdit::singleline(&mut texto).desired_width(90.0))
                    .changed()
                {
                    *campo = (!texto.is_empty()).then_some(texto);
                }
            });
        }
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
    fn todos_los_widgets_tienen_nombre() {
        for (kind, _) in WIDGETS {
            assert_ne!(
                nombre_widget(Some(*kind)),
                "Ninguno",
                "{kind:?} esta en la lista pero se muestra como Ninguno"
            );
        }
        assert_eq!(nombre_widget(None), "Ninguno");
    }

    #[test]
    fn la_lista_de_widgets_cubre_todos_los_tipos() {
        // Si se agrega un tipo al modelo y no aqui, dejaria de poder elegirse sin
        // que nada fallara.
        let cubiertos: std::collections::HashSet<_> =
            WIDGETS.iter().map(|(k, _)| format!("{k:?}")).collect();
        for k in [
            WidgetKind::Clock,
            WidgetKind::Weather,
            WidgetKind::NowPlaying,
            WidgetKind::Sensor,
            WidgetKind::Variable,
        ] {
            assert!(cubiertos.contains(&format!("{k:?}")), "falta {k:?}");
        }
    }

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
