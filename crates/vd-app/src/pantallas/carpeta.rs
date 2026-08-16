//! Sub-deck: la rejilla que se abre al pulsar un botón de tipo carpeta.
//!
//! Es lo que hace que un deck escale más allá de las casillas de una página:
//! un botón puede contener otros, y se despliegan encima de la rejilla.
//!
//! Los botones de dentro son [`FolderButton`], **no** `ButtonConfig`: no tienen
//! id, ni página, ni widget, ni atajo global. Es una limitación heredada del
//! modelo de la versión Electron y se respeta tal cual, porque cambiarla
//! obligaría a migrar el archivo de todos los usuarios.

use egui::{Align2, Color32, CornerRadius, FontId, Sense, Stroke, Vec2};
use vd_core::config::model::FolderButton;

use crate::app::{color_hex, App};
use crate::i18n::t;

const FONDO: Color32 = Color32::from_rgb(0x0E, 0x10, 0x14);
const CELDA: Color32 = Color32::from_rgb(0x18, 0x1C, 0x22);

/// Carpeta abierta ahora mismo.
pub struct Abierta {
    pub titulo: String,
    pub botones: Vec<FolderButton>,
}

/// Dibuja el sub-deck si hay una carpeta abierta.
///
/// Se pinta como una capa **encima** de todo: una carpeta es un contexto
/// temporal, y dejar la rejilla de fondo accesible invitaría a pulsar cosas de
/// las dos a la vez.
pub fn ui(app: &mut App, ctx: &egui::Context) {
    let Some(abierta) = app.carpeta.as_ref() else {
        return;
    };
    let titulo = abierta.titulo.clone();
    let botones = abierta.botones.clone();
    let acento = app.acento();

    let mut cerrar = false;
    let mut pulsado: Option<FolderButton> = None;

    egui::Area::new(egui::Id::new("carpeta"))
        .fixed_pos(egui::Pos2::ZERO)
        .order(egui::Order::Foreground)
        .show(ctx, |ui| {
            let pantalla = ctx.screen_rect();
            ui.painter().rect_filled(pantalla, 0.0, FONDO);
            ui.scope_builder(
                egui::UiBuilder::new().max_rect(pantalla.shrink(12.0)),
                |ui| {
                    ui.horizontal(|ui| {
                        if ui.button(t("← Volver")).clicked() {
                            cerrar = true;
                        }
                        ui.label(egui::RichText::new(&titulo).color(acento).strong());
                    });
                    ui.add_space(10.0);

                    if botones.is_empty() {
                        ui.label(
                            egui::RichText::new(t("Esta carpeta está vacía"))
                                .color(Color32::from_gray(120)),
                        );
                        return;
                    }

                    // La rejilla se ajusta al número de botones en vez de usar un
                    // tamaño fijo: una carpeta de tres no debería verse como una
                    // página casi vacía.
                    let columnas = (botones.len() as f32).sqrt().ceil().max(2.0) as usize;
                    let disponible = ui.available_size();
                    let filas = botones.len().div_ceil(columnas);
                    let lado = ((disponible.x - 8.0 * columnas as f32) / columnas as f32)
                        .min((disponible.y - 8.0 * filas as f32) / filas as f32)
                        .clamp(48.0, 160.0);

                    for fila in 0..filas {
                        ui.horizontal(|ui| {
                            for col in 0..columnas {
                                let Some(b) = botones.get(fila * columnas + col) else {
                                    break;
                                };
                                if celda(ui, b, lado, acento) {
                                    pulsado = Some(b.clone());
                                }
                                ui.add_space(8.0);
                            }
                        });
                        ui.add_space(8.0);
                    }
                },
            );
        });

    // Escape cierra la carpeta, que es lo que espera cualquiera.
    if ctx.input(|i| i.key_pressed(egui::Key::Escape)) {
        cerrar = true;
    }

    if let Some(b) = pulsado {
        app.pulsar_de_carpeta(&b);
        // Se cierra tras pulsar: una carpeta es un menú, no una pantalla donde
        // uno se queda.
        cerrar = true;
    }
    if cerrar {
        app.carpeta = None;
    }
}

fn celda(ui: &mut egui::Ui, boton: &FolderButton, lado: f32, acento: Color32) -> bool {
    let (rect, respuesta) = ui.allocate_exact_size(Vec2::splat(lado), Sense::click());

    let fondo = boton
        .bg_color
        .as_deref()
        .and_then(color_hex)
        .unwrap_or(CELDA);
    let texto = boton
        .fg_color
        .as_deref()
        .and_then(color_hex)
        .unwrap_or(Color32::from_gray(220));

    let pintor = ui.painter();
    pintor.rect_filled(rect, CornerRadius::same(6), fondo);
    pintor.rect_stroke(
        rect,
        CornerRadius::same(6),
        Stroke::new(
            1.0_f32,
            if respuesta.hovered() {
                acento
            } else {
                Color32::from_gray(45)
            },
        ),
        egui::StrokeKind::Inside,
    );

    let cuerpo = (lado * 0.16).clamp(9.0, 16.0);
    let alto = boton.sublabel.as_deref().is_some_and(|s| !s.is_empty());

    pintor.text(
        rect.center() - Vec2::new(0.0, if alto { cuerpo * 0.6 } else { 0.0 }),
        Align2::CENTER_CENTER,
        &boton.label,
        FontId::proportional(cuerpo),
        texto,
    );
    if let Some(sub) = boton.sublabel.as_deref().filter(|s| !s.is_empty()) {
        pintor.text(
            rect.center() + Vec2::new(0.0, cuerpo * 0.9),
            Align2::CENTER_CENTER,
            sub,
            FontId::proportional(cuerpo * 0.8),
            texto.gamma_multiply(0.6),
        );
    }

    respuesta.clicked()
}
