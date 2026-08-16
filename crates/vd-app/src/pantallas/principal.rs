//! Pantalla principal: la rejilla de botones.
//!
//! Porta `MainB.tsx` de la versión Electron. Por ahora dibuja etiqueta y colores;
//! los iconos y las imágenes de fondo son un paso aparte porque necesitan cargar
//! y cachear texturas.

use crate::i18n::{t, tf};
use egui::{Align2, Color32, CornerRadius, FontId, Rect, Sense, Stroke, Vec2};

use crate::app::{color_hex, App};

/// Cuánto dura el aviso de la última acción antes de desvanecerse.
const AVISO_SEGUNDOS: f32 = 4.0;

/// Cuánto hay que mantener pulsado para que cuente como pulsación larga.
///
/// Medio segundo es el valor de la versión Electron. Más corto dispara la acción
/// alternativa por accidente al hacer clic con calma; más largo se siente roto.
const PULSACION_LARGA: f32 = 0.5;

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

    super::editor::panel(app, ctx);
    super::ajustes::ui(app, ctx);
    super::carpeta::ui(app, ctx);

    egui::CentralPanel::default()
        .frame(egui::Frame::NONE.fill(FONDO).inner_margin(8.0))
        .show(ctx, |ui| {
            if app.config.is_none() {
                sin_configuracion(app, ui);
                return;
            }
            rejilla(app, ui);
            // Debajo de la rejilla, para que un cambio de tamaño se vea al
            // momento sobre los botones reales.
            super::paginas::ui(app, ui);
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
            if ui.button("⚙").on_hover_text("Ajustes").clicked() {
                app.ajustes_abiertos = !app.ajustes_abiertos;
            }
            ui.add_space(6.0);

            let etiqueta = if app.modo_edicion {
                t("Listo")
            } else {
                t("Editar")
            };
            let boton =
                egui::Button::new(egui::RichText::new(etiqueta).color(if app.modo_edicion {
                    Color32::BLACK
                } else {
                    Color32::from_gray(180)
                }));
            let boton = if app.modo_edicion {
                boton.fill(acento)
            } else {
                boton
            };
            if ui
                .add(boton)
                .on_hover_text("En modo edicion, pulsar un boton lo configura en vez de ejecutarlo")
                .clicked()
            {
                app.modo_edicion = !app.modo_edicion;
                // Salir de edicion cierra el editor: dejarlo abierto sobre una
                // rejilla que ya ejecuta acciones seria confuso.
                if !app.modo_edicion {
                    app.borrador = None;
                }
            }
            ui.add_space(8.0);

            if !app.en_curso.is_empty() {
                ui.add(egui::Spinner::new().size(14.0));
                ui.label(
                    egui::RichText::new(tf(
                        "{} en curso",
                        &[("{}", &app.en_curso.len().to_string())],
                    ))
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
                    t("Sin variables").to_string()
                } else {
                    tf("{n} variable(s)", &[("{n}", &n.to_string())])
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
                    egui::RichText::new(t("No se pudo leer la configuración"))
                        .color(Color32::from_rgb(0xE5, 0x73, 0x73)),
                );
                ui.add_space(6.0);
                ui.label(
                    egui::RichText::new(e)
                        .small()
                        .color(Color32::from_gray(130)),
                );
            }
            // Sin error y sin configuración no debería llegarse aquí: una
            // instalación limpia arranca con un deck vacío usable.
            None => {
                ui.label(
                    egui::RichText::new(t("No hay ninguna configuración"))
                        .color(Color32::from_gray(160)),
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
    let editando = app.modo_edicion;
    let encendidos = app.encendidos.clone();
    let arrastrando = app.arrastrando.clone();

    let ctx = Contexto {
        lado,
        acento,
        editando,
        hay_arrastre: arrastrando.is_some(),
    };

    // Destino del arrastre: la casilla bajo el puntero mientras se arrastra.
    let mut soltado_en: Option<String> = None;
    let mut empezo_arrastre: Option<String> = None;
    let mut solto = false;
    let seleccionado = app.borrador.as_ref().map(|b| b.id.clone());
    let pagina = app.pagina;
    // El `bool` indica si fue pulsación larga.
    let mut pulsado: Option<(vd_core::config::model::ButtonConfig, bool)> = None;

    for fila in 0..filas {
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing.x = separacion;
            for col in 0..columnas {
                let indice = fila * columnas + col;
                match por_indice.get(&indice) {
                    Some(b) if !b.is_empty() => {
                        let estado = EstadoCelda {
                            corriendo: app.en_curso.iter().any(|id| id == &b.id),
                            seleccionado: seleccionado.as_deref() == Some(b.id.as_str()),
                            encendido: encendidos.contains(&b.id),
                            arrastrado: arrastrando.as_deref() == Some(b.id.as_str()),
                        };
                        let r = celda(app, ui, b, ctx, estado);
                        match r.pulsacion {
                            Pulsacion::Corta => pulsado = Some((b.clone(), false)),
                            Pulsacion::Larga => pulsado = Some((b.clone(), true)),
                            Pulsacion::Ninguna => {}
                        }
                        if r.empezo_arrastre {
                            empezo_arrastre = Some(b.id.clone());
                        }
                        if r.encima {
                            soltado_en = Some(b.id.clone());
                        }
                        if r.solto {
                            solto = true;
                        }
                    }
                    otro => {
                        // En modo edicion los huecos tambien se pueden pulsar:
                        // es como se configura un boton nuevo. El id se toma del
                        // hueco si ya existia en el JSON, y si no se inventa por
                        // posicion, igual que hacia la version Electron.
                        let vacio = otro.cloned().unwrap_or_else(|| {
                            vd_core::config::model::ButtonConfig::empty(
                                format!("{pagina}-{indice}"),
                                pagina,
                            )
                        });
                        let activo = seleccionado.as_deref() == Some(vacio.id.as_str());
                        let h = hueco(ui, lado, editando, activo, acento, arrastrando.is_some());
                        if h.pulsado {
                            pulsado = Some((vacio.clone(), false));
                        }
                        // Una casilla vacia tambien vale como destino: mover un
                        // boton a un hueco es lo mas normal al reordenar.
                        if h.encima {
                            soltado_en = Some(vacio.id.clone());
                        }
                    }
                }
            }
        });
        ui.add_space(separacion);
    }

    // La pulsación se aplica fuera del bucle: dentro, `app` está prestado por
    // `botones_de_pagina` y no se puede modificar.
    if let Some(id) = empezo_arrastre {
        app.arrastrando = Some(id);
    }
    if solto {
        // El intercambio se aplica al soltar, no mientras se arrastra: mover en
        // vivo haria que la rejilla bailara bajo el puntero.
        if let (Some(origen), Some(destino)) = (app.arrastrando.take(), soltado_en) {
            if app.intercambiar(&origen, &destino) {
                app.guardar();
            }
        }
        app.arrastrando = None;
    }

    if let Some((b, larga)) = pulsado {
        if editando {
            app.editar(&b);
        } else if larga {
            // Un botón sin acción larga configurada trata la pulsación sostenida
            // como un clic normal, en vez de no hacer nada.
            if !app.pulsacion_larga(&b) {
                app.pulsar(&b);
            }
        } else {
            app.pulsar(&b);
        }
    }
}

/// Lo que comparten todas las celdas de una pasada de dibujo.
#[derive(Clone, Copy)]
struct Contexto {
    lado: f32,
    acento: Color32,
    editando: bool,
    /// Hay un arrastre en curso, de esta celda o de otra.
    hay_arrastre: bool,
}

/// Lo que distingue a **esta** celda de las demás.
#[derive(Clone, Copy)]
struct EstadoCelda {
    corriendo: bool,
    seleccionado: bool,
    encendido: bool,
    arrastrado: bool,
}

/// Lo que una celda reporta tras dibujarse.
#[derive(Default)]
struct Respuesta {
    pulsacion: Pulsacion,
    empezo_arrastre: bool,
    /// El puntero esta encima mientras hay un arrastre en curso.
    encima: bool,
    solto: bool,
}

/// Lo que reporta una casilla vacia.
#[derive(Default)]
struct RespuestaHueco {
    pulsado: bool,
    encima: bool,
}

/// Cómo terminó la interacción con una celda.
#[derive(Default)]
enum Pulsacion {
    #[default]
    Ninguna,
    Corta,
    Larga,
}

/// Dibuja un botón. Devuelve `true` si se pulsó.
fn celda(
    app: &App,
    ui: &mut egui::Ui,
    boton: &vd_core::config::model::ButtonConfig,
    ctx: Contexto,
    estado: EstadoCelda,
) -> Respuesta {
    let Contexto {
        lado,
        acento,
        editando,
        hay_arrastre,
    } = ctx;
    // Solo se puede arrastrar en edicion: en uso normal, un arrastre accidental
    // sobre un boton reordenaria el deck sin querer.
    let sentido = if editando {
        Sense::click_and_drag()
    } else {
        Sense::click()
    };
    let (rect, respuesta) = ui.allocate_exact_size(Vec2::splat(lado), sentido);

    let tiene_larga = boton
        .long_press_action
        .as_ref()
        .is_some_and(|a| !a.action_type.is_none());

    // La pulsación larga se mide desde que el puntero baja sobre la celda. egui
    // no la ofrece hecha, pero sí dice cuánto lleva pulsado el botón del ratón,
    // que es justo lo que hace falta.
    let mut progreso = 0.0_f32;
    let mut disparo_larga = false;
    if !editando && tiene_larga && respuesta.is_pointer_button_down_on() {
        let sostenido = ui
            .input(|i| i.pointer.press_start_time())
            .map_or(0.0, |t| (ui.input(|i| i.time) - t) as f32);
        progreso = (sostenido / PULSACION_LARGA).clamp(0.0, 1.0);
        // Mientras se mantiene pulsado hay que seguir dibujando para que el aro
        // de progreso avance.
        ui.ctx().request_repaint();
        if sostenido >= PULSACION_LARGA {
            disparo_larga = true;
        }
    }

    let fondo = boton
        .bg_color
        .as_deref()
        .and_then(color_hex)
        .unwrap_or(if respuesta.hovered() {
            CELDA_HOVER
        } else {
            CELDA
        });

    let borde = if estado.corriendo || estado.seleccionado || estado.encendido {
        acento
    } else if respuesta.hovered() {
        Color32::from_gray(70)
    } else {
        Color32::from_gray(38)
    };

    // El boton que se arrastra se atenua y la casilla bajo el puntero se resalta:
    // sin eso, arrastrar es adivinar donde va a caer.
    let fondo = if estado.arrastrado {
        fondo.gamma_multiply(0.4)
    } else if hay_arrastre && respuesta.hovered() {
        fondo.blend(acento.gamma_multiply(0.25))
    } else {
        fondo
    };

    let pintor = ui.painter();
    pintor.rect_filled(rect, CornerRadius::same(6), fondo);
    pintor.rect_stroke(
        rect,
        CornerRadius::same(6),
        Stroke::new(
            if estado.corriendo || estado.seleccionado || estado.encendido {
                2.0_f32
            } else {
                1.0_f32
            },
            borde,
        ),
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

    // El icono ocupa la parte de arriba y la etiqueta baja a su sitio. Sin icono,
    // la etiqueta se queda centrada, que es como se ve mejor un boton de solo
    // texto.
    // Un interruptor encendido se tiñe de acento: el borde solo no basta para
    // distinguirlo de un vistazo en una rejilla llena.
    if estado.encendido {
        pintor.rect_filled(rect, CornerRadius::same(6), acento.gamma_multiply(0.18));
    }

    let hay_icono = boton
        .brand_icon
        .as_deref()
        .and_then(crate::iconos::buscar)
        .map(|icono| {
            let area = Rect::from_min_size(
                rect.min + Vec2::new(0.0, lado * 0.06),
                Vec2::new(lado, lado * 0.56),
            );
            // Si el boton fija color de texto, el icono lo respeta: manda la
            // eleccion del usuario sobre los colores de la marca.
            let forzado = boton.fg_color.as_deref().and_then(color_hex);
            icono.dibujar(pintor, area, forzado);
        })
        .is_some();

    let desplazamiento = if hay_icono {
        lado * 0.31
    } else if boton.sublabel.is_some() {
        -cuerpo * 0.6
    } else {
        0.0
    };

    // Un widget sustituye a la etiqueta: el botón enseña algo vivo en lugar de un
    // texto fijo. Sigue siendo pulsable y ejecuta su acción igual.
    if super::widgets::dibujar(app, boton, pintor, rect, texto, acento) {
        return Respuesta {
            pulsacion: if disparo_larga {
                Pulsacion::Larga
            } else if respuesta.clicked() {
                Pulsacion::Corta
            } else {
                Pulsacion::Ninguna
            },
            empezo_arrastre: respuesta.drag_started(),
            encima: hay_arrastre && !estado.arrastrado && respuesta.hovered(),
            solto: respuesta.drag_stopped(),
        };
    }

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
            rect.center() + Vec2::new(0.0, desplazamiento + cuerpo * 1.5),
            Align2::CENTER_CENTER,
            recortar(sub, lado, cuerpo * 0.8),
            FontId::proportional(cuerpo * 0.8),
            texto.gamma_multiply(0.6),
        );
    }

    // Aro de progreso de la pulsación larga, dibujado con puntos para no romper
    // la estética de la rejilla.
    if progreso > 0.0 {
        let radio = lado * 0.42;
        let puntos = 16;
        let encendidos = (progreso * puntos as f32).round() as usize;
        for i in 0..encendidos {
            let angulo =
                -std::f32::consts::FRAC_PI_2 + (i as f32 / puntos as f32) * std::f32::consts::TAU;
            let centro = rect.center() + Vec2::new(angulo.cos(), angulo.sin()) * radio;
            pintor.circle_filled(centro, (lado * 0.02).max(1.5), acento);
        }
    }

    Respuesta {
        pulsacion: if disparo_larga {
            Pulsacion::Larga
        } else if respuesta.clicked() {
            Pulsacion::Corta
        } else {
            Pulsacion::Ninguna
        },
        empezo_arrastre: respuesta.drag_started(),
        encima: hay_arrastre && !estado.arrastrado && respuesta.hovered(),
        solto: respuesta.drag_stopped(),
    }
}

/// Dibuja una posición vacía. Devuelve `true` si se pulsó, que solo puede pasar
/// en modo edición.
fn hueco(
    ui: &mut egui::Ui,
    lado: f32,
    editando: bool,
    seleccionado: bool,
    acento: Color32,
    hay_arrastre: bool,
) -> RespuestaHueco {
    let sentido = if editando {
        Sense::click()
    } else {
        Sense::hover()
    };
    let (rect, respuesta) = ui.allocate_exact_size(Vec2::splat(lado), sentido);

    let resaltado = hay_arrastre && respuesta.hovered();
    let pintor = ui.painter();
    pintor.rect_filled(
        rect,
        CornerRadius::same(6),
        if resaltado {
            VACIA.blend(acento.gamma_multiply(0.3))
        } else {
            VACIA
        },
    );

    if editando || resaltado {
        // En edición los huecos se marcan con un borde y un `+`, para que se vea
        // que son sitios donde se puede crear un botón.
        let borde = if seleccionado || resaltado {
            acento
        } else if respuesta.hovered() {
            Color32::from_gray(70)
        } else {
            Color32::from_gray(34)
        };
        pintor.rect_stroke(
            rect,
            CornerRadius::same(6),
            Stroke::new(1.0_f32, borde),
            egui::StrokeKind::Inside,
        );
        pintor.text(
            rect.center(),
            Align2::CENTER_CENTER,
            "+",
            FontId::proportional((lado * 0.25).clamp(12.0, 26.0)),
            borde,
        );
    }

    RespuestaHueco {
        pulsado: respuesta.clicked(),
        encima: resaltado,
    }
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
