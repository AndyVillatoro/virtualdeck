//! Escena de prueba compartida por los dos spikes de renderer.
//!
//! Es la **misma** para wgpu y para glow a propósito: comparar el tamaño del
//! binario o los fotogramas por segundo de dos escenas distintas no diría nada.
//!
//! Dibuja algo parecido a lo que será la pantalla real —una rejilla de botones
//! con estética dot-matrix— porque es ahí donde está la pregunta: la interfaz de
//! VirtualDeck son rectángulos y puntos, no texturas ni geometría 3D.

use egui::{Color32, CornerRadius, Rect, Sense, Stroke, Vec2};

/// Tamaño de la rejilla, igual que el deck real.
const COLUMNAS: usize = 5;
const FILAS: usize = 3;

/// Puntos por celda del glifo dot-matrix. La estética del proyecto son matrices
/// de 5x7 puntos, y dibujar unos cuantos miles por fotograma es justo la carga
/// que interesa medir.
const PUNTOS_X: usize = 5;
const PUNTOS_Y: usize = 7;

pub struct Demo {
    pub acento: Color32,
    pub seleccionado: Option<usize>,
    pub texto: String,
    /// Fotogramas dibujados, para comprobar que el bucle avanza de verdad.
    pub fotogramas: u64,
}

impl Default for Demo {
    fn default() -> Self {
        Self {
            // El acento por defecto del proyecto.
            acento: Color32::from_rgb(0x4F, 0xC3, 0xF7),
            seleccionado: None,
            texto: String::new(),
            fotogramas: 0,
        }
    }
}

impl Demo {
    pub fn ui(&mut self, ctx: &egui::Context) {
        self.fotogramas += 1;

        egui::CentralPanel::default()
            .frame(egui::Frame::NONE.fill(Color32::from_rgb(0x10, 0x12, 0x16)))
            .show(ctx, |ui| {
                ui.add_space(8.0);
                ui.horizontal(|ui| {
                    ui.add_space(8.0);
                    ui.colored_label(self.acento, "VirtualDeck — spike de renderer");
                    ui.label(format!("· fotograma {}", self.fotogramas));
                });
                ui.add_space(8.0);

                self.rejilla(ui);

                ui.add_space(8.0);
                ui.horizontal(|ui| {
                    ui.add_space(8.0);
                    ui.label("Etiqueta:");
                    ui.text_edit_singleline(&mut self.texto);
                });
            });
    }

    fn rejilla(&mut self, ui: &mut egui::Ui) {
        let disponible = ui.available_width() - 16.0;
        let lado = (disponible / COLUMNAS as f32 - 8.0).max(48.0);

        for fila in 0..FILAS {
            ui.horizontal(|ui| {
                ui.add_space(8.0);
                for col in 0..COLUMNAS {
                    let indice = fila * COLUMNAS + col;
                    self.celda(ui, indice, lado);
                    ui.add_space(8.0);
                }
            });
            ui.add_space(8.0);
        }
    }

    fn celda(&mut self, ui: &mut egui::Ui, indice: usize, lado: f32) {
        let (rect, respuesta) = ui.allocate_exact_size(Vec2::splat(lado), Sense::click());
        if respuesta.clicked() {
            // Volver a pulsar la misma celda la deselecciona.
            self.seleccionado = (self.seleccionado != Some(indice)).then_some(indice);
        }

        let activa = self.seleccionado == Some(indice);
        let hover = respuesta.hovered();

        let fondo = if activa {
            Color32::from_rgb(0x1E, 0x2A, 0x33)
        } else if hover {
            Color32::from_rgb(0x18, 0x1C, 0x22)
        } else {
            Color32::from_rgb(0x14, 0x17, 0x1C)
        };

        let pintor = ui.painter();
        pintor.rect_filled(rect, CornerRadius::same(6), fondo);
        pintor.rect_stroke(
            rect,
            CornerRadius::same(6),
            Stroke::new(
                1.0_f32,
                if activa {
                    self.acento
                } else {
                    Color32::from_gray(40)
                },
            ),
            egui::StrokeKind::Inside,
        );

        self.glifo(ui, rect, indice, activa);
    }

    /// Dibuja la matriz de puntos dentro de una celda.
    ///
    /// Cada punto es un círculo independiente. Es el caso realista y también el
    /// más exigente: con la rejilla llena son varios miles de primitivas por
    /// fotograma, que es exactamente lo que hay que saber si el renderer aguanta.
    fn glifo(&self, ui: &egui::Ui, rect: Rect, indice: usize, activa: bool) {
        let interior = rect.shrink(rect.width() * 0.22);
        let paso_x = interior.width() / PUNTOS_X as f32;
        let paso_y = interior.height() / PUNTOS_Y as f32;
        let radio = (paso_x.min(paso_y) * 0.34).max(1.0);

        let apagado = Color32::from_gray(34);
        let encendido = if activa {
            self.acento
        } else {
            Color32::from_gray(150)
        };
        let pintor = ui.painter();

        for y in 0..PUNTOS_Y {
            for x in 0..PUNTOS_X {
                // Patrón arbitrario pero estable: sirve para que cada celda se
                // vea distinta sin cargar fuentes ni recursos externos.
                let encendida = !(x * 3 + y * 5 + indice * 7).is_multiple_of(4);
                let centro =
                    interior.min + Vec2::new(paso_x * (x as f32 + 0.5), paso_y * (y as f32 + 0.5));
                pintor.circle_filled(centro, radio, if encendida { encendido } else { apagado });
            }
        }
    }

    /// Cuántas primitivas dibuja una pasada completa. Sirve para poner en
    /// contexto las mediciones de rendimiento.
    pub fn primitivas_por_fotograma() -> usize {
        COLUMNAS * FILAS * PUNTOS_X * PUNTOS_Y
    }
}
