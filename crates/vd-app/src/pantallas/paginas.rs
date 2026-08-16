//! Gestión de páginas: crear, renombrar, redimensionar y borrar.
//!
//! Se dibuja en modo edición, debajo de la rejilla, para que los cambios de
//! tamaño se vean al momento sobre los botones reales.

use crate::i18n::{t, tf};
use egui::{Color32, RichText};
use vd_core::config::model::{ButtonConfig, DeckConfig, PageConfig};

use crate::app::App;

/// Límites de la rejilla.
///
/// El mínimo evita páginas de un botón, que no tienen sentido; el máximo evita
/// rejillas donde los botones quedan tan pequeños que no se distinguen. Coinciden
/// con los de la versión Electron.
const MIN: u8 = 2;
const MAX: u8 = 8;

pub fn ui(app: &mut App, ui: &mut egui::Ui) {
    if !app.modo_edicion {
        return;
    }

    let acento = app.acento();
    let Some(cfg) = app.config.as_mut() else {
        return;
    };
    let indice = app.pagina as usize;
    let total = cfg.pages.len();
    let Some(pagina) = cfg.pages.get_mut(indice) else {
        return;
    };

    let mut cambio = false;
    let mut nueva = false;
    let mut borrar = false;

    ui.horizontal(|ui| {
        ui.label(RichText::new(t("Página")).color(acento).small().strong());

        if ui
            .add(egui::TextEdit::singleline(&mut pagina.name).desired_width(140.0))
            .changed()
        {
            cambio = true;
        }

        ui.add_space(10.0);
        ui.label(RichText::new(t("Rejilla")).small());

        let mut columnas = pagina.columns();
        let mut filas = pagina.rows();
        if ui
            .add(
                egui::DragValue::new(&mut columnas)
                    .range(MIN..=MAX)
                    .prefix("↔ "),
            )
            .changed()
        {
            pagina.grid_size = Some(columnas);
            cambio = true;
        }
        if ui
            .add(
                egui::DragValue::new(&mut filas)
                    .range(MIN..=MAX)
                    .prefix("↕ "),
            )
            .changed()
        {
            pagina.grid_rows = Some(filas);
            cambio = true;
        }

        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
            // La última página no se puede borrar: quedarse sin ninguna dejaría la
            // aplicación sin nada que mostrar y sin forma de crear la primera.
            let puede_borrar = total > 1;
            let boton =
                egui::Button::new(RichText::new(t("Borrar página")).color(if puede_borrar {
                    Color32::from_rgb(0xE5, 0x73, 0x73)
                } else {
                    Color32::from_gray(70)
                }));
            let r = ui.add_enabled(puede_borrar, boton);
            if r.clicked() {
                borrar = true;
            }
            if !puede_borrar {
                r.on_hover_text("Tiene que quedar al menos una página");
            }

            if ui.button(t("+ Nueva página")).clicked() {
                nueva = true;
            }
        });
    });

    if nueva {
        crear_pagina(cfg);
        app.pagina = (cfg.pages.len() - 1) as i64;
        cambio = true;
    }
    if borrar {
        borrar_pagina(cfg, indice);
        app.pagina = app.pagina.min(cfg.pages.len() as i64 - 1);
        // Borrar una página es destructivo, así que el editor abierto sobre un
        // botón que quizá ya no existe se cierra.
        app.borrador = None;
        cambio = true;
    }

    if cambio {
        app.guardar();
    }
}

/// Añade una página al final, con sus casillas vacías.
///
/// Las casillas se crean por adelantado porque el resto del sistema identifica
/// los botones por `pagina-posicion`: sin ellas, la rejilla no tendría dónde
/// colocar nada y el editor no podría crear el primer botón.
fn crear_pagina(cfg: &mut DeckConfig) {
    let numero = cfg.pages.len();
    let pagina = PageConfig {
        id: format!("p{numero}"),
        name: tf("Página {}", &[("{}", &(numero + 1).to_string())]),
        grid_size: Some(4),
        grid_rows: Some(4),
        extra: Default::default(),
    };

    let casillas = usize::from(pagina.columns()) * usize::from(pagina.rows());
    for i in 0..casillas {
        cfg.buttons
            .push(ButtonConfig::empty(format!("{numero}-{i}"), numero as i64));
    }
    cfg.pages.push(pagina);
}

/// Borra una página y sus botones, y renumera las siguientes.
///
/// La renumeración es imprescindible: tanto `page` como el id (`3-7`) llevan el
/// número de página dentro. Sin renumerar, borrar la página 1 dejaría botones
/// apuntando a páginas que ya no existen.
fn borrar_pagina(cfg: &mut DeckConfig, indice: usize) {
    if cfg.pages.len() <= 1 || indice >= cfg.pages.len() {
        return;
    }
    let borrada = indice as i64;

    cfg.pages.remove(indice);
    cfg.buttons.retain(|b| b.page != borrada);

    for boton in &mut cfg.buttons {
        if boton.page > borrada {
            let nueva = boton.page - 1;
            // El id lleva el número de página delante del guion.
            if let Some((_, resto)) = boton.id.split_once('-') {
                boton.id = format!("{nueva}-{resto}");
            }
            boton.page = nueva;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_de_prueba(paginas: usize) -> DeckConfig {
        let mut cfg = DeckConfig::default();
        cfg.pages.clear();
        cfg.buttons.clear();
        for _ in 0..paginas {
            crear_pagina(&mut cfg);
        }
        cfg
    }

    #[test]
    fn crear_una_pagina_le_da_sus_casillas() {
        let cfg = config_de_prueba(1);
        assert_eq!(cfg.pages.len(), 1);
        // 4x4 por defecto.
        assert_eq!(cfg.buttons.iter().filter(|b| b.page == 0).count(), 16);
        assert!(cfg.button("0-0").is_some());
        assert!(cfg.button("0-15").is_some());
    }

    #[test]
    fn borrar_una_pagina_renumera_las_siguientes() {
        // Es lo unico delicado: el numero de pagina vive en dos sitios, el campo
        // `page` y el propio id. Si se renumerara solo uno, los botones quedarian
        // apuntando a paginas inexistentes.
        let mut cfg = config_de_prueba(3);
        borrar_pagina(&mut cfg, 0);

        assert_eq!(cfg.pages.len(), 2);
        assert!(
            cfg.buttons.iter().all(|b| b.page < 2),
            "quedaron botones apuntando a una pagina que ya no existe"
        );
        for b in &cfg.buttons {
            let prefijo = b.id.split('-').next().unwrap();
            assert_eq!(
                prefijo,
                b.page.to_string(),
                "el id {} no coincide con su pagina {}",
                b.id,
                b.page
            );
        }
    }

    #[test]
    fn borrar_del_medio_tambien_renumera() {
        let mut cfg = config_de_prueba(3);
        borrar_pagina(&mut cfg, 1);
        assert_eq!(cfg.pages.len(), 2);
        // La pagina 0 no se toca; la 2 pasa a ser la 1.
        assert!(cfg.buttons.iter().any(|b| b.page == 0));
        assert!(cfg.buttons.iter().any(|b| b.page == 1));
        assert!(!cfg.buttons.iter().any(|b| b.page >= 2));
    }

    #[test]
    fn no_se_puede_borrar_la_ultima_pagina() {
        // Sin paginas no habria nada que mostrar ni forma de crear la primera.
        let mut cfg = config_de_prueba(1);
        borrar_pagina(&mut cfg, 0);
        assert_eq!(cfg.pages.len(), 1);
    }

    #[test]
    fn borrar_un_indice_inexistente_no_hace_nada() {
        let mut cfg = config_de_prueba(2);
        borrar_pagina(&mut cfg, 99);
        assert_eq!(cfg.pages.len(), 2);
    }
}
