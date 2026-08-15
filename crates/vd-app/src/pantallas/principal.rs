//! Pantalla principal: la rejilla de botones.
//!
//! Porta `MainB.tsx` de la versión Electron. Por ahora dibuja etiqueta y colores;
//! los iconos y las imágenes de fondo son un paso aparte porque necesitan cargar
//! y cachear texturas.

use egui::{Align2, Color32, CornerRadius, FontId, Sense, Stroke, Vec2};

use crate::app::{color_hex, App};

/// Cuánto dura el aviso de la última acción antes de desvanecerse.
const AVISO_SEGUNDOS: f32 = 4.0;

const FONDO: Color32 = Color32::from_rgb(0x10, 0x12, 0x16);
const CELDA: Color32 = Color32::from_rgb(0x14, 0x17, 0x1C);
const CELDA_HOVER: Color32 = Color32::from_rgb(0x1B, 0x20, 0x27);
const VACIA: Color32 = Color32::from_rgb(0x0D, 0x0F, 0x12);

pub fn ui(app: &mut App, ctx: &egui::Context) {
    egui::TopBottomPanel::top("cabecera")
        .frame(egui::Frame::NONE.fill(FONDO).inner_margin(8.0))
        .show(ctx, |ui| cabecera(app, ui));

    egui::TopBottomPanel::bottom("pie")
        .frame(egui::Frame::NONE.fill(FONDO).inner_margin(8.0))
        .show(ctx, |ui| pie(app, ui));

    egui::CentralPanel::default()
        .frame(egui::Frame::NONE.fill(FONDO).inner_margin(8.0))
        .show(ctx, |ui| {
            if app.config.is_none() {
                sin_configuracion(app, ui);
                return;
            }
            rejilla(app, ui);
        });
}

fn cabecera(app: &mut App, ui: &mut egui::Ui) {
    let acento = app.acento();
    ui.horizontal(|ui| {
        ui.label(
            egui::RichText::new("VirtualDeck")
                .color(acento)
                .strong()
                .size(15.0),
        );

        let paginas = app.paginas();
        if paginas > 1 {
            ui.add_space(12.0);
            // Las páginas se dibujan como pestañas y no como un desplegable:
            // cambiar de página es la operación más frecuente del deck y no debe
            // costar dos clics.
            for i in 0..paginas {
                let activa = app.pagina == i as i64;
                let nombre = app
                    .config
                    .as_ref()
                    .and_then(|c| c.pages.get(i))
                    .map(|p| p.name.clone())
                    .unwrap_or_else(|| format!("{}", i + 1));

                let texto = egui::RichText::new(nombre).color(if activa {
                    acento
                } else {
                    Color32::from_gray(140)
                });
                if ui.selectable_label(activa, texto).clicked() {
                    app.pagina = i as i64;
                }
            }
        }

        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            if !app.en_curso.is_empty() {
                ui.add(egui::Spinner::new().size(14.0));
                ui.label(
                    egui::RichText::new(format!("{} en curso", app.en_curso.len()))
                        .small()
                        .color(Color32::from_gray(150)),
                );
            }
        });
    });
}

fn pie(app: &mut App, ui: &mut egui::Ui) {
    ui.horizontal(|ui| match &app.aviso {
        Some(a) if a.desde.elapsed().as_secs_f32() < AVISO_SEGUNDOS => {
            let color = if a.error {
                Color32::from_rgb(0xE5, 0x73, 0x73)
            } else {
                Color32::from_gray(150)
            };
            ui.label(egui::RichText::new(&a.texto).small().color(color));
        }
        _ => {
            let n = app.estado.len();
            ui.label(
                egui::RichText::new(if n == 0 {
                    "Sin variables".to_string()
                } else {
                    format!("{n} variable(s)")
                })
                .small()
                .color(Color32::from_gray(90)),
            );
        }
    });
}

fn sin_configuracion(app: &App, ui: &mut egui::Ui) {
    ui.vertical_centered(|ui| {
        ui.add_space(40.0);
        match &app.error_carga {
            Some(e) => {
                ui.label(
                    egui::RichText::new("No se pudo leer la configuración")
                        .color(Color32::from_rgb(0xE5, 0x73, 0x73)),
                );
                ui.add_space(6.0);
                ui.label(
                    egui::RichText::new(e)
                        .small()
                        .color(Color32::from_gray(130)),
                );
            }
            None => {
                ui.label(
                    egui::RichText::new("No hay ninguna configuración en este equipo")
                        .color(Color32::from_gray(160)),
                );
                ui.add_space(6.0);
                ui.label(
                    egui::RichText::new("Se creará una al guardar por primera vez.")
                        .small()
                        .color(Color32::from_gray(110)),
                );
            }
        }
    });
}

fn rejilla(app: &mut App, ui: &mut egui::Ui) {
    let (columnas, filas) = app.rejilla();
    let separacion = 8.0;

    // El lado se calcula para que la rejilla entera quepa, tomando la dimensión
    // más ajustada. Las celdas se mantienen cuadradas: un deck con botones
    // rectangulares deja de parecer un deck.
    let disponible = ui.available_size();
    let ancho = (disponible.x - separacion * (columnas as f32 - 1.0)) / columnas as f32;
    let alto = (disponible.y - separacion * (filas as f32 - 1.0)) / filas as f32;
    let lado = ancho.min(alto).max(36.0);

    // Se indexa por posición: el orden de `buttons` en el JSON no tiene por qué
    // coincidir con el de la rejilla.
    let botones = app.botones_de_pagina();
    let por_indice: std::collections::HashMap<usize, vd_core::config::model::ButtonConfig> =
        botones
            .iter()
            .enumerate()
            .map(|(i, b)| (i, (*b).clone()))
            .collect();

    let acento = app.acento();
    let mut pulsado: Option<vd_core::config::model::ButtonConfig> = None;

    for fila in 0..filas {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing.x = separacion;
            for col in 0..columnas {
                let indice = fila * columnas + col;
                match por_indice.get(&indice) {
                    Some(b) if !b.is_empty() => {
                        let corriendo = app.en_curso.iter().any(|id| id == &b.id);
                        if celda(ui, b, lado, acento, corriendo) {
                            pulsado = Some(b.clone());
                        }
                    }
                    _ => hueco(ui, lado),
                }
            }
        });
        ui.add_space(separacion);
    }

    // La pulsación se aplica fuera del bucle: dentro, `app` está prestado por
    // `botones_de_pagina` y no se puede modificar.
    if let Some(b) = pulsado {
        app.pulsar(&b);
    }
}

/// Dibuja un botón. Devuelve `true` si se pulsó.
fn celda(
    ui: &mut egui::Ui,
    boton: &vd_core::config::model::ButtonConfig,
    lado: f32,
    acento: Color32,
    corriendo: bool,
) -> bool {
    let (rect, respuesta) = ui.allocate_exact_size(Vec2::splat(lado), Sense::click());

    let fondo = boton
        .bg_color
        .as_deref()
        .and_then(color_hex)
        .unwrap_or(if respuesta.hovered() {
            CELDA_HOVER
        } else {
            CELDA
        });

    let borde = if corriendo {
        acento
    } else if respuesta.hovered() {
        Color32::from_gray(70)
    } else {
        Color32::from_gray(38)
    };

    let pintor = ui.painter();
    pintor.rect_filled(rect, CornerRadius::same(6), fondo);
    pintor.rect_stroke(
        rect,
        CornerRadius::same(6),
        Stroke::new(if corriendo { 2.0_f32 } else { 1.0_f32 }, borde),
        egui::StrokeKind::Inside,
    );

    let texto = boton
        .fg_color
        .as_deref()
        .and_then(color_hex)
        .unwrap_or(Color32::from_gray(220));

    // El tamaño de letra sigue al de la celda para que la rejilla se vea igual
    // de equilibrada con 3 columnas que con 8.
    let cuerpo = (lado * 0.16).clamp(9.0, 16.0);

    if !boton.label.is_empty() {
        pintor.text(
            rect.center()
                - Vec2::new(
                    0.0,
                    if boton.sublabel.is_some() {
                        cuerpo * 0.6
                    } else {
                        0.0
                    },
                ),
            Align2::CENTER_CENTER,
            recortar(&boton.label, lado, cuerpo),
            FontId::proportional(cuerpo),
            texto,
        );
    }

    if let Some(sub) = boton.sublabel.as_deref().filter(|s| !s.is_empty()) {
        pintor.text(
            rect.center() + Vec2::new(0.0, cuerpo * 0.9),
            Align2::CENTER_CENTER,
            recortar(sub, lado, cuerpo * 0.8),
            FontId::proportional(cuerpo * 0.8),
            texto.gamma_multiply(0.6),
        );
    }

    respuesta.clicked()
}

fn hueco(ui: &mut egui::Ui, lado: f32) {
    let (rect, _) = ui.allocate_exact_size(Vec2::splat(lado), Sense::hover());
    ui.painter().rect_filled(rect, CornerRadius::same(6), VACIA);
}

/// Recorta una etiqueta que no cabe, añadiendo puntos suspensivos.
///
/// Se hace a ojo con el ancho medio de carácter en vez de medir con la fuente:
/// medir exigiría un `Painter` y esto se llama por cada botón en cada fotograma.
fn recortar(texto: &str, lado: f32, cuerpo: f32) -> String {
    let caben = ((lado - 8.0) / (cuerpo * 0.55)).floor().max(3.0) as usize;
    if texto.chars().count() <= caben {
        return texto.to_string();
    }
    // Se cuenta por caracteres y no por bytes: cortar por bytes partiría una
    // tilde o una ñ por la mitad.
    let recortado: String = texto.chars().take(caben.saturating_sub(1)).collect();
    format!("{recortado}…")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recortar_respeta_los_acentos() {
        // Cortar por bytes partiria la ñ y produciria texto invalido.
        let r = recortar("Configuración avanzada del sistema", 60.0, 12.0);
        assert!(r.ends_with('…'));
        assert!(r.chars().count() < 34);
    }

    #[test]
    fn no_recorta_lo_que_cabe() {
        assert_eq!(recortar("OK", 200.0, 10.0), "OK");
    }

    #[test]
    fn siempre_deja_algo_visible() {
        // Con una celda diminuta, el recorte no debe quedarse en nada.
        let r = recortar("Algo largo", 10.0, 20.0);
        assert!(!r.is_empty());
    }
}
