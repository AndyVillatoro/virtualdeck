//! Editor de botones: el panel lateral que aparece en modo edición.
//!
//! Porta lo esencial de `EditorB.tsx`. Escribe sobre una **copia** del botón y
//! solo la vuelca a la configuración al guardar, para que salirse del editor no
//! deje cambios a medias.

use crate::i18n::{t, tf};
use egui::{Color32, RichText};
use vd_core::config::model::{
    ActionType, BranchOp, ButtonAction, ButtonConfig, SensorWidget, SnapPosition, VarWidget,
    WidgetKind,
};

use crate::app::App;

/// Tipos de acción que el editor sabe configurar, con su nombre para la lista.
///
/// Cubre todo lo que el motor ejecuta. Los que quedan fuera —`Other`, y los que
/// se editan desde otro sitio— siguen **mostrándose** si un botón ya los tiene,
/// para no hacer creer que el botón no tiene acción.
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
    (ActionType::MediaShuffle, "Aleatorio"),
    (ActionType::MediaRepeat, "Repetición"),
    (ActionType::KillProcess, "Cerrar proceso"),
    (ActionType::Webhook, "Llamar a un webhook"),
    (ActionType::SetVar, "Fijar variable"),
    (ActionType::IncrVar, "Incrementar variable"),
    (ActionType::Macro, "Macro grabada"),
    (ActionType::Folder, "Carpeta de botones"),
    (ActionType::Tts, "Leer en voz alta"),
    (ActionType::Notify, "Mostrar notificación"),
    (ActionType::RegionCapture, "Capturar región"),
    (ActionType::WindowSnap, "Acomodar ventana"),
    (ActionType::RgbColor, "Color RGB"),
    (ActionType::RgbMode, "Modo RGB"),
    (ActionType::RgbPreset, "Preset RGB"),
    (ActionType::RgbProfile, "Perfil de OpenRGB"),
    (ActionType::Branch, "Ramificación"),
    (ActionType::Countdown, "Cuenta atrás"),
];

fn nombre_tipo(tipo_actual: &ActionType) -> String {
    TIPOS
        .iter()
        .find(|(tipo, _)| tipo == tipo_actual)
        .map(|(_, n)| t(n).to_string())
        // Un tipo que este editor no cubre se muestra tal cual en vez de
        // esconderse: el usuario tiene que poder ver qué hay configurado aunque
        // no pueda cambiarlo desde aquí.
        .unwrap_or_else(|| {
            tf(
                "{t:?} (no editable aquí)",
                &[("{t:?}", &format!("{tipo_actual:?}"))],
            )
        })
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
    let mut orden_macro = None;
    // Se saca del `app` antes de prestarlo al panel.
    let grabacion = app.grabacion.as_ref().map(|g| super::secuencia::Grabacion {
        desde: g.desde,
        boton: g.boton.clone(),
    });

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
                ui.label(RichText::new(t("Editar botón")).color(acento).strong());
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
                orden_macro = super::secuencia::ui(
                    ui,
                    &mut borrador,
                    acento,
                    grabacion.as_ref(),
                    &mut |ui, paso| accion(ui, paso),
                );
            });

            ui.separator();
            ui.horizontal(|ui| {
                if ui
                    .add(egui::Button::new(RichText::new(t("Guardar")).strong()).fill(acento))
                    .clicked()
                {
                    guardar = true;
                }
                if ui.button(t("Descartar")).clicked() {
                    descartar = true;
                }

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui
                        .button(
                            RichText::new(t("Vaciar")).color(Color32::from_rgb(0xE5, 0x73, 0x73)),
                        )
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

    match orden_macro {
        Some(super::secuencia::Orden::Grabar) => {
            let id = app.borrador.as_ref().map(|b| b.id.clone());
            if let Some(id) = id {
                app.grabar_macro(&id);
            }
        }
        Some(super::secuencia::Orden::Detener) => app.detener_macro(),
        None => {}
    }

    if guardar {
        app.guardar_borrador();
    } else if descartar {
        app.borrador = None;
    }
}

fn apariencia(ui: &mut egui::Ui, b: &mut ButtonConfig, acento: Color32) {
    ui.label(
        RichText::new(t("Apariencia"))
            .color(acento)
            .small()
            .strong(),
    );
    ui.add_space(4.0);

    ui.label(t("Etiqueta"));
    ui.add(egui::TextEdit::singleline(&mut b.label).desired_width(f32::INFINITY));

    ui.add_space(6.0);
    ui.label(t("Segunda línea"));
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
    ui.label(t("Icono"));
    let actual = b.brand_icon.clone().unwrap_or_default();
    let etiqueta = if actual.is_empty() {
        t("Ninguno").to_string()
    } else {
        crate::iconos::buscar(&actual)
            .map(|i| i.label.clone())
            // Un icono que ya no existe en el paquete: se muestra su clave para
            // que el usuario entienda por qué no ve nada.
            .unwrap_or_else(|| tf("{actual} (desconocido)", &[("{actual}", &actual)]))
    };

    egui::ComboBox::from_id_salt("icono")
        .selected_text(etiqueta)
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            if ui
                .selectable_label(actual.is_empty(), t("Ninguno"))
                .clicked()
            {
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
        color_opcional(ui, t("Fondo"), &mut b.bg_color);
        ui.add_space(12.0);
        color_opcional(ui, t("Texto"), &mut b.fg_color);
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
        None => t("Ninguno"),
        Some(kind) => WIDGETS
            .iter()
            .find(|(w, _)| *w == kind)
            .map_or(t("Ninguno"), |(_, n)| *n),
    }
}

fn widget(
    ui: &mut egui::Ui,
    b: &mut ButtonConfig,
    sensores: &[(String, String, String)],
    acento: Color32,
) {
    ui.label(RichText::new(t("Widget")).color(acento).small().strong());
    ui.label(
        RichText::new(t(
            "Sustituye a la etiqueta por algo vivo. El boton sigue siendo pulsable.",
        ))
        .small()
        .color(Color32::from_gray(110)),
    );
    ui.add_space(4.0);

    egui::ComboBox::from_id_salt("widget")
        .selected_text(nombre_widget(b.widget))
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            if ui
                .selectable_label(b.widget.is_none(), t("Ninguno"))
                .clicked()
            {
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
                t("Elegir sensor").to_string()
            } else {
                // El sensor guardado puede no existir aqui: viene de otro equipo,
                // o es de LHM y el nivel 2 esta apagado. Se muestra su id para que
                // se entienda por que el boton no ensena nada.
                tf("{} (no disponible ahora)", &[("{}", &cfg.sensor_id)])
            }
        });

    ui.label(RichText::new(t("Sensor")).small());
    egui::ComboBox::from_id_salt("sensor")
        .selected_text(actual)
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            if sensores.is_empty() {
                ui.label(
                    RichText::new(t("Todavia no hay lecturas"))
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
    ui.label(RichText::new(t("Unidad (vacio = la del sensor)")).small());
    let mut sufijo = cfg.suffix.clone().unwrap_or_default();
    if ui
        .add(egui::TextEdit::singleline(&mut sufijo).desired_width(f32::INFINITY))
        .changed()
    {
        cfg.suffix = (!sufijo.is_empty()).then_some(sufijo);
    }

    ui.add_space(6.0);
    ui.label(
        RichText::new(t("Umbrales: el valor cambia de color al pasarlos"))
            .small()
            .color(Color32::from_gray(110)),
    );
    umbral(ui, t("Advertencia"), &mut cfg.warn_at);
    umbral(ui, t("Critico"), &mut cfg.crit_at);
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

    ui.label(RichText::new(t("Variable")).small());
    ui.add(egui::TextEdit::singleline(&mut cfg.var_name).desired_width(f32::INFINITY));

    ui.add_space(6.0);
    ui.horizontal(|ui| {
        // Prefijo y sufijo envuelven al valor: "CPU " + "78" + " %".
        for (etiqueta, campo) in [
            (t("Prefijo"), &mut cfg.prefix),
            (t("Sufijo"), &mut cfg.suffix),
        ] {
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

fn accion(ui: &mut egui::Ui, b: &mut vd_core::config::model::ButtonAction) {
    egui::ComboBox::from_id_salt("tipo")
        .selected_text(nombre_tipo(&b.action_type))
        .width(ui.available_width())
        .show_ui(ui, |ui| {
            for (tipo, nombre) in TIPOS {
                if ui
                    .selectable_label(b.action_type == *tipo, t(nombre))
                    .clicked()
                {
                    b.action_type = tipo.clone();
                }
            }
        });

    ui.add_space(8.0);

    // Cada tipo enseña solo sus campos. Mostrarlos todos a la vez fue lo que hizo
    // ilegible el editor de la version Electron.
    match b.action_type {
        ActionType::App => {
            campo(ui, t("Ruta del ejecutable"), &mut b.app_path);
            campo(ui, t("Argumentos"), &mut b.app_args);
        }
        ActionType::Web => campo(ui, "URL", &mut b.url),
        ActionType::Shortcut => campo(ui, t("Ruta del acceso directo"), &mut b.shortcut_path),
        ActionType::Script => {
            multilinea(ui, t("Script"), &mut b.script);
            campo(
                ui,
                t("Guardar salida en la variable"),
                &mut b.capture_to_var,
            );
        }
        ActionType::AudioDevice => {
            campo(ui, t("Nombre del dispositivo"), &mut b.device_name);
            ui.label(
                RichText::new(t("Basta con parte del nombre."))
                    .small()
                    .color(Color32::from_gray(110)),
            );
        }
        ActionType::Hotkey => {
            campo(ui, t("Combinación"), &mut b.hotkey);
            ui.label(
                RichText::new(t("Por ejemplo: Ctrl+Shift+M"))
                    .small()
                    .color(Color32::from_gray(110)),
            );
        }
        ActionType::TypeText => multilinea(ui, t("Texto"), &mut b.type_text),
        ActionType::Clipboard => multilinea(ui, t("Texto"), &mut b.clipboard_text),
        ActionType::VolumeSet => numero(ui, t("Volumen (%)"), &mut b.volume_percent, 0, 100),
        ActionType::Brightness => numero(ui, t("Brillo (%)"), &mut b.brightness_level, 0, 100),
        ActionType::KillProcess => campo(ui, t("Nombre del proceso"), &mut b.process_name),
        ActionType::Webhook => {
            campo(ui, "URL", &mut b.webhook_url);
            multilinea(ui, t("Cuerpo"), &mut b.webhook_body);
        }
        ActionType::SetVar => {
            campo(ui, t("Variable"), &mut b.var_name);
            campo(ui, t("Valor"), &mut b.var_value);
        }
        ActionType::IncrVar => {
            campo(ui, t("Variable"), &mut b.var_name);
            numero(ui, t("Incremento"), &mut b.var_delta, -1000, 1000);
        }
        ActionType::Notify => {
            campo(ui, t("Título"), &mut b.notify_title);
            multilinea(ui, t("Mensaje"), &mut b.notify_body);
            nota(ui, t("Aparece aunque VirtualDeck esté en la bandeja."));
        }
        ActionType::RegionCapture => {
            nota(
                ui,
                t("Abre la herramienta de recorte de Windows, la misma de Win+Mayús+S."),
            );
        }
        ActionType::WindowSnap => {
            let actual = b.snap_position.unwrap_or(SnapPosition::Maximize);
            ui.label(RichText::new(t("Posición")).small());
            egui::ComboBox::from_id_salt("snap")
                .selected_text(nombre_posicion(actual))
                .width(ui.available_width())
                .show_ui(ui, |ui| {
                    for p in POSICIONES {
                        if ui
                            .selectable_label(actual == *p, nombre_posicion(*p))
                            .clicked()
                        {
                            b.snap_position = Some(*p);
                        }
                    }
                });
            ui.add_space(6.0);
            campo(ui, t("Proceso"), &mut b.snap_process_name);
            nota(
                ui,
                t("Sin proceso se acomoda la ventana que esté al frente."),
            );
        }
        ActionType::RgbColor => {
            campo(ui, "Color (#RRGGBB)", &mut b.rgb_color);
            dispositivo_rgb(ui, b);
            nota(ui, AVISO_OPENRGB);
        }
        ActionType::RgbMode => {
            campo(ui, t("Nombre del modo"), &mut b.rgb_mode);
            nota(
                ui,
                t("Como lo llame OpenRGB: «Breathing», «Rainbow Wave»… Basta con parte del nombre."),
            );
            ui.add_space(6.0);
            campo(ui, "Color (#RRGGBB)", &mut b.rgb_color);
            numero(ui, t("Brillo (%)"), &mut b.rgb_brightness, 0, 100);
            nota(
                ui,
                t("El color y el brillo se aplican solo si el modo los admite."),
            );
            dispositivo_rgb(ui, b);
            nota(ui, AVISO_OPENRGB);
        }
        ActionType::RgbPreset => {
            let actual = b.rgb_preset_id.clone().unwrap_or_default();
            ui.label(RichText::new(t("Preset")).small());
            egui::ComboBox::from_id_salt("preset_rgb")
                .selected_text(nombre_preset(&actual))
                .width(ui.available_width())
                .show_ui(ui, |ui| {
                    for (id, nombre) in PRESETS {
                        if ui.selectable_label(actual == *id, *nombre).clicked() {
                            b.rgb_preset_id = Some((*id).to_string());
                        }
                    }
                });
            nota(
                ui,
                t("Cada preset prueba varios nombres de efecto, para funcionar con cualquier marca."),
            );
            dispositivo_rgb(ui, b);
            nota(ui, AVISO_OPENRGB);
        }
        ActionType::RgbProfile => {
            campo(ui, t("Nombre del perfil"), &mut b.rgb_profile_name);
            nota(
                ui,
                t("Tiene que existir ya en OpenRGB, con el mismo nombre exacto."),
            );
            nota(ui, AVISO_OPENRGB);
        }
        ActionType::Tts => {
            multilinea(ui, "Texto", &mut b.tts_text);
            ui.label(
                RichText::new(t("Usa las voces que tengas instaladas en Windows."))
                    .small()
                    .color(Color32::from_gray(110)),
            );
        }
        ActionType::Branch => {
            ui.label(RichText::new(t("Si la variable")).small());
            campo(ui, "Variable", &mut b.branch_var);

            ui.horizontal(|ui| {
                let op = b.branch_op.unwrap_or(BranchOp::Eq);
                egui::ComboBox::from_id_salt("branch_op")
                    .selected_text(nombre_operador(op))
                    .width(130.0)
                    .show_ui(ui, |ui| {
                        for o in OPERADORES {
                            if ui.selectable_label(op == *o, nombre_operador(*o)).clicked() {
                                b.branch_op = Some(*o);
                            }
                        }
                    });
                // Los operadores de vacio no comparan con nada, asi que pedir un
                // valor solo confundiria.
                if !matches!(op, BranchOp::Empty | BranchOp::NotEmpty) {
                    let mut v = b.branch_value.clone().unwrap_or_default();
                    if ui
                        .add(
                            egui::TextEdit::singleline(&mut v)
                                .desired_width(120.0)
                                .hint_text(t("Comparar con")),
                        )
                        .changed()
                    {
                        b.branch_value = (!v.is_empty()).then_some(v);
                    }
                }
            });

            ui.add_space(6.0);
            sub_acciones(ui, t("Entonces"), &mut b.branch_then);
            ui.add_space(6.0);
            sub_acciones(ui, t("Si no"), &mut b.branch_else);
        }
        ActionType::Countdown => {
            ui.label(RichText::new(t("Espera (ms)")).small());
            let mut ms = b.timer_delay.unwrap_or(1000);
            if ui
                .add(
                    egui::DragValue::new(&mut ms)
                        .speed(100.0)
                        .range(0..=600_000),
                )
                .changed()
            {
                b.timer_delay = Some(ms);
            }
            ui.add_space(6.0);
            sub_acciones(ui, t("Acciones tras la espera"), &mut b.timer_actions);
        }
        ActionType::Folder => {
            // Los botones de dentro se editan aqui mismo: son pocos campos y
            // abrir otro nivel de panel por cada uno seria peor.
            let dentro = b.folder_buttons.get_or_insert_with(Vec::new);
            ui.label(
                RichText::new(t("Botones de dentro"))
                    .small()
                    .color(Color32::from_gray(150)),
            );
            ui.add_space(4.0);

            let mut quitar = None;
            for (i, fb) in dentro.iter_mut().enumerate() {
                ui.push_id(i, |ui| {
                    ui.horizontal(|ui| {
                        ui.add(
                            egui::TextEdit::singleline(&mut fb.label)
                                .desired_width(120.0)
                                .hint_text(t("Etiqueta")),
                        );
                        egui::ComboBox::from_id_salt("tipo_fb")
                            .selected_text(nombre_tipo(&fb.action.action_type))
                            .width(150.0)
                            .show_ui(ui, |ui| {
                                for (tipo, nombre) in TIPOS {
                                    if ui
                                        .selectable_label(fb.action.action_type == *tipo, t(nombre))
                                        .clicked()
                                    {
                                        fb.action.action_type = tipo.clone();
                                    }
                                }
                            });
                        if ui.small_button("✕").on_hover_text(t("Quitar")).clicked() {
                            quitar = Some(i);
                        }
                    });
                    accion(ui, &mut fb.action);
                });
                ui.add_space(6.0);
            }
            if let Some(i) = quitar {
                dentro.remove(i);
            }
            if ui.button(t("+ Añadir botón")).clicked() {
                dentro.push(vd_core::config::model::FolderButton {
                    label: String::new(),
                    sublabel: None,
                    icon: None,
                    bg_color: None,
                    fg_color: None,
                    action: vd_core::config::model::ButtonAction {
                        action_type: ActionType::None,
                        ..vd_core::config::model::ButtonAction::default()
                    },
                });
            }
            ui.add_space(4.0);
        }
        ActionType::Macro => {
            // La macro no se teclea: se graba con el boton de abajo. Aqui solo se
            // resume lo que hay, para saber si esta vacia sin abrir el JSON.
            let pasos = b.macro_steps.as_deref().unwrap_or(&[]);
            ui.label(
                RichText::new(tf(
                    "Grabada: {}",
                    &[("{}", &super::secuencia::resumen_macro(pasos))],
                ))
                .small()
                .color(Color32::from_gray(150)),
            );
            ui.add_space(4.0);
            let mut repetir = b.macro_repeat.unwrap_or(1);
            ui.horizontal(|ui| {
                ui.label(RichText::new(t("Repetir")).small());
                if ui
                    .add(egui::DragValue::new(&mut repetir).range(1..=50))
                    .changed()
                {
                    b.macro_repeat = (repetir > 1).then_some(repetir);
                }
            });
            ui.add_space(4.0);
        }
        // Los tipos sin parámetros (silenciar, pista siguiente…) no necesitan
        // nada más, y los no editables se avisan arriba en el desplegable.
        _ => {}
    }
}

/// Operadores de comparacion, en el orden en que se piensan.
const OPERADORES: &[BranchOp] = &[
    BranchOp::Eq,
    BranchOp::Ne,
    BranchOp::Gt,
    BranchOp::Lt,
    BranchOp::Ge,
    BranchOp::Le,
    BranchOp::Contains,
    BranchOp::Empty,
    BranchOp::NotEmpty,
];

/// Nombre legible de un operador.
///
/// Los simbolos se dejan tal cual —`==` se entiende en cualquier idioma— y solo
/// Aviso repetido en todas las acciones RGB.
const AVISO_OPENRGB: &str = "Requiere OpenRGB abierto con su servidor activo.";

/// Los presets del núcleo, con su nombre para la lista.
///
/// Los identificadores tienen que coincidir con `PRESETS_RGB` de `vd-core`; un
/// test lo comprueba, porque un id mal escrito aquí deja el botón sin efecto y
/// sin explicación.
const PRESETS: &[(&str, &str)] = &[
    ("off", "Apagado"),
    ("gaming", "Juego"),
    ("cinema", "Cine"),
    ("work", "Trabajo"),
    ("rainbow", "Arcoíris"),
    ("night-blue", "Azul nocturno"),
    ("alert-red", "Alerta roja"),
];

const POSICIONES: &[SnapPosition] = &[
    SnapPosition::LeftHalf,
    SnapPosition::RightHalf,
    SnapPosition::TopHalf,
    SnapPosition::BottomHalf,
    SnapPosition::TopLeft,
    SnapPosition::TopRight,
    SnapPosition::BottomLeft,
    SnapPosition::BottomRight,
    SnapPosition::Maximize,
    SnapPosition::Center,
    SnapPosition::Restore,
];

fn nombre_posicion(p: SnapPosition) -> &'static str {
    match p {
        SnapPosition::LeftHalf => t("Mitad izquierda"),
        SnapPosition::RightHalf => t("Mitad derecha"),
        SnapPosition::TopHalf => t("Mitad superior"),
        SnapPosition::BottomHalf => t("Mitad inferior"),
        SnapPosition::TopLeft => t("Esquina superior izquierda"),
        SnapPosition::TopRight => t("Esquina superior derecha"),
        SnapPosition::BottomLeft => t("Esquina inferior izquierda"),
        SnapPosition::BottomRight => t("Esquina inferior derecha"),
        SnapPosition::Maximize => t("Maximizar"),
        SnapPosition::Center => t("Centrar"),
        SnapPosition::Restore => t("Restaurar"),
    }
}

fn nombre_preset(id: &str) -> &'static str {
    PRESETS
        .iter()
        .find(|(p, _)| *p == id)
        .map(|(_, nombre)| t(nombre))
        .unwrap_or_else(|| t("Elegir preset"))
}

/// Texto de ayuda bajo un campo.
fn nota(ui: &mut egui::Ui, texto: &str) {
    ui.label(RichText::new(texto).small().color(Color32::from_gray(110)));
}

/// Selector de a qué dispositivo RGB va la acción.
///
/// Vacío significa **todos**, que es lo que espera quien pone un botón de "todo
/// en rojo" y es también lo que hacía la versión Electron.
fn dispositivo_rgb(ui: &mut egui::Ui, b: &mut ButtonAction) {
    ui.add_space(6.0);
    ui.label(RichText::new(t("Dispositivo")).small());
    ui.horizontal(|ui| {
        let mut texto = b
            .rgb_device_id
            .filter(|id| *id >= 0)
            .map(|id| id.to_string())
            .unwrap_or_default();
        if ui
            .add(
                egui::TextEdit::singleline(&mut texto)
                    .desired_width(60.0)
                    .hint_text(t("Todos")),
            )
            .changed()
        {
            b.rgb_device_id = texto.trim().parse::<i64>().ok().filter(|id| *id >= 0);
        }
        ui.label(
            RichText::new(t("Número que le da OpenRGB. Vacío = todos."))
                .small()
                .color(Color32::from_gray(110)),
        );
    });
}

/// se traducen los que son palabras.
fn nombre_operador(op: BranchOp) -> &'static str {
    match op {
        BranchOp::Eq => "==",
        BranchOp::Ne => "!=",
        BranchOp::Gt => ">",
        BranchOp::Lt => "<",
        BranchOp::Ge => ">=",
        BranchOp::Le => "<=",
        BranchOp::Contains => t("contiene"),
        BranchOp::Empty => t("está vacía"),
        BranchOp::NotEmpty => t("no está vacía"),
    }
}

/// Lista de acciones anidadas, para las ramas y la cuenta atras.
///
/// Se dibuja plana y sin recursion: una rama dentro de otra se puede configurar,
/// pero el editor no anida paneles indefinidamente porque a partir del segundo
/// nivel nadie entiende que esta viendo.
fn sub_acciones(ui: &mut egui::Ui, titulo: &str, lista: &mut Option<Vec<ButtonAction>>) {
    ui.label(RichText::new(titulo).small().strong());
    let acciones = lista.get_or_insert_with(Vec::new);

    let mut quitar = None;
    for (i, a) in acciones.iter_mut().enumerate() {
        ui.push_id(i, |ui| {
            egui::Frame::NONE
                .fill(Color32::from_rgb(0x1B, 0x1F, 0x26))
                .inner_margin(6.0)
                .corner_radius(4.0)
                .show(ui, |ui| {
                    ui.horizontal(|ui| {
                        egui::ComboBox::from_id_salt("sub_tipo")
                            .selected_text(nombre_tipo(&a.action_type))
                            .width(170.0)
                            .show_ui(ui, |ui| {
                                for (tipo, nombre) in TIPOS {
                                    if ui
                                        .selectable_label(a.action_type == *tipo, t(nombre))
                                        .clicked()
                                    {
                                        a.action_type = tipo.clone();
                                    }
                                }
                            });
                        if ui.small_button("✕").on_hover_text(t("Quitar")).clicked() {
                            quitar = Some(i);
                        }
                    });
                    accion(ui, a);
                });
        });
        ui.add_space(4.0);
    }
    if let Some(i) = quitar {
        acciones.remove(i);
    }
    if ui.button(t("+ Añadir acción")).clicked() {
        acciones.push(ButtonAction {
            action_type: ActionType::None,
            ..ButtonAction::default()
        });
    }
    // Una lista vacia se guarda como ausente, para no ensuciar el JSON.
    if acciones.is_empty() {
        *lista = None;
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
        // Este test se rompio cuatro veces porque nombraba tipos concretos y esos
        // tipos acababan volviendose editables — la quinta fue al implementar
        // notificaciones y RGB. Ahora usa `Other`, que **nunca** sera editable
        // por definicion: es el cajon de los tipos que este binario no conoce.
        let desconocido = ActionType::Other("de-una-version-mas-nueva".into());
        assert!(
            !TIPOS.iter().any(|(t, _)| *t == desconocido),
            "Other no puede estar en la lista"
        );

        let n = nombre_tipo(&desconocido);
        assert!(n.contains("no editable"), "salio como {n:?}");
    }

    /// El editor tiene que ofrecer **todo** lo que el motor sabe ejecutar.
    ///
    /// Un tipo implementado y ausente de la lista es invisible: no hay forma de
    /// elegirlo, y quien quiera usarlo tiene que editar el JSON a mano. Paso con
    /// ocho tipos a la vez (notificaciones, captura, acomodar ventana, aleatorio,
    /// repeticion y los tres de RGB) sin que nada fallara.
    #[test]
    fn la_lista_cubre_todos_los_tipos_que_el_motor_ejecuta() {
        let todos = [
            ActionType::None,
            ActionType::App,
            ActionType::Web,
            ActionType::Shortcut,
            ActionType::Script,
            ActionType::AudioDevice,
            ActionType::Hotkey,
            ActionType::MediaPlayPause,
            ActionType::MediaNext,
            ActionType::MediaPrev,
            ActionType::MediaShuffle,
            ActionType::MediaRepeat,
            ActionType::VolumeUp,
            ActionType::VolumeDown,
            ActionType::Mute,
            ActionType::VolumeSet,
            ActionType::Brightness,
            ActionType::Clipboard,
            ActionType::TypeText,
            ActionType::KillProcess,
            ActionType::Folder,
            ActionType::Notify,
            ActionType::SetVar,
            ActionType::IncrVar,
            ActionType::Webhook,
            ActionType::Tts,
            ActionType::RegionCapture,
            ActionType::RgbColor,
            ActionType::RgbMode,
            ActionType::RgbProfile,
            ActionType::RgbPreset,
            ActionType::WindowSnap,
            ActionType::Branch,
            ActionType::Countdown,
            ActionType::Macro,
        ];

        let faltan: Vec<_> = todos
            .iter()
            .filter(|c| !TIPOS.iter().any(|(t, _)| t == *c))
            .map(|t| format!("{t:?}"))
            .collect();

        assert!(
            faltan.is_empty(),
            "el motor ejecuta estos tipos pero el editor no los ofrece: {}",
            faltan.join(", ")
        );
    }

    #[test]
    fn los_presets_de_la_lista_existen_en_el_motor() {
        // Un id mal escrito aqui deja el boton sin efecto y sin explicacion.
        let del_motor = vd_core::actions::presets_rgb();
        for (id, nombre) in PRESETS {
            assert!(
                del_motor.contains(id),
                "el preset \"{id}\" ({nombre}) no existe en el motor; hay: {del_motor:?}"
            );
        }
        assert_eq!(
            PRESETS.len(),
            del_motor.len(),
            "el motor tiene presets que el editor no ofrece: {del_motor:?}"
        );
    }

    /// Los nombres que viven en tablas de constantes también se traducen.
    ///
    /// El auditor de `i18n` busca llamadas a `t` con la cadena escrita en el
    /// sitio, y por eso **no ve** estas tablas: sus textos llegan a través de una
    /// variable. (El auditor tampoco distingue código de comentarios: escribir
    /// aquí una llamada de ejemplo la haría buscar esa cadena.) Sin este
    /// test, añadir un tipo de acción lo dejaría en español para quien tenga la
    /// aplicación en inglés, y nada fallaría.
    #[test]
    fn los_nombres_de_las_tablas_estan_traducidos() {
        let mut faltan = Vec::new();
        for (_, nombre) in TIPOS {
            if !crate::i18n::hay_traduccion(nombre) {
                faltan.push(*nombre);
            }
        }
        for (_, nombre) in PRESETS {
            if !crate::i18n::hay_traduccion(nombre) {
                faltan.push(*nombre);
            }
        }
        assert!(faltan.is_empty(), "sin traduccion: {faltan:?}");
    }

    #[test]
    fn todas_las_posiciones_de_ventana_tienen_nombre() {
        for p in POSICIONES {
            assert!(!nombre_posicion(*p).is_empty(), "{p:?} sin nombre");
        }
        assert_eq!(POSICIONES.len(), 11, "faltan posiciones del modelo");
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
