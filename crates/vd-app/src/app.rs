//! Estado de la aplicación y ejecución de acciones.
//!
//! Separa el **qué** (configuración, variables, qué se está ejecutando) del
//! **cómo se dibuja**, que vive en [`crate::pantallas`].
//!
//! # Las acciones no bloquean la interfaz
//!
//! Una acción puede tardar: un script, un webhook con un servidor lento, una
//! cuenta atrás de treinta segundos. Ejecutarla en el hilo de la interfaz
//! congelaría la ventana entera, y el usuario no podría ni cambiar de página ni
//! cerrar la aplicación.
//!
//! Por eso cada pulsación se manda a un hilo aparte y el resultado vuelve por un
//! canal. La versión Electron resolvía esto con promesas; aquí es explícito, que
//! además hace evidente el único punto donde el estado se modifica desde fuera.

use std::sync::mpsc::{Receiver, Sender};
use std::time::Instant;

use vd_core::actions::{self, SequenceResult, State};
use vd_core::config::model::{ButtonConfig, DeckConfig};

/// Lo que un hilo de acción devuelve al terminar.
struct Terminada {
    boton: String,
    resultado: SequenceResult,
}

/// Resultado visible de la última acción, para el aviso de la interfaz.
pub struct Aviso {
    pub texto: String,
    pub error: bool,
    pub desde: Instant,
}

pub struct App {
    /// `None` cuando no hay configuración en la máquina: instalación limpia.
    pub config: Option<DeckConfig>,
    /// Variables del deck. Se mantienen aparte de `config` porque las acciones
    /// las modifican constantemente y la configuración solo se guarda a petición.
    pub estado: State,
    pub pagina: i64,
    /// IDs de los botones que están ejecutándose ahora mismo.
    pub en_curso: Vec<String>,
    pub aviso: Option<Aviso>,
    /// Error de carga de la configuración, si lo hubo.
    pub error_carga: Option<String>,

    emisor: Sender<Terminada>,
    receptor: Receiver<Terminada>,
}

impl App {
    pub fn nueva() -> Self {
        let (emisor, receptor) = std::sync::mpsc::channel();

        let (config, error_carga) = match vd_core::config::load() {
            Ok(c) => (c, None),
            // Una configuración ilegible no debe impedir que la aplicación
            // arranque: se abre vacía y se dice por qué, en vez de no abrirse.
            Err(e) => (None, Some(e.to_string())),
        };

        let estado = config
            .as_ref()
            .and_then(|c| c.state.clone())
            .map(|m| m.into_iter().collect())
            .unwrap_or_default();

        Self {
            config,
            estado,
            pagina: 0,
            en_curso: Vec::new(),
            aviso: None,
            error_carga,
            emisor,
            receptor,
        }
    }

    /// Recoge los resultados de las acciones que hayan terminado.
    ///
    /// Se llama una vez por fotograma. `try_recv` no bloquea: si no hay nada
    /// listo, la interfaz sigue dibujando.
    pub fn recoger_resultados(&mut self) {
        while let Ok(t) = self.receptor.try_recv() {
            self.en_curso.retain(|id| *id != t.boton);

            // Las variables que la acción modificó pasan al estado global. Es el
            // único punto donde el estado se toca desde fuera del hilo de la
            // interfaz.
            self.estado = t.resultado.state;

            self.aviso = Some(match &t.resultado.error {
                Some(e) => Aviso {
                    texto: e.clone(),
                    error: true,
                    desde: Instant::now(),
                },
                None if !t.resultado.for_ui.is_empty() => Aviso {
                    texto: format!(
                        "Pendiente de la interfaz: {}",
                        t.resultado.for_ui.join(", ")
                    ),
                    error: false,
                    desde: Instant::now(),
                },
                None => Aviso {
                    texto: "Listo".into(),
                    error: false,
                    desde: Instant::now(),
                },
            });
        }
    }

    /// Lanza la acción de un botón en segundo plano.
    pub fn pulsar(&mut self, boton: &ButtonConfig) {
        // Volver a pulsar un botón que ya está corriendo duplicaría su efecto:
        // dos veces el mismo script, dos webhooks. Se ignora.
        if self.en_curso.iter().any(|id| id == &boton.id) {
            return;
        }

        let secuencia: Vec<_> = match &boton.actions {
            Some(v) if !v.is_empty() => v.clone(),
            _ => vec![boton.action.clone()],
        };
        if secuencia.iter().all(|a| a.action_type.is_none()) {
            return; // botón sin configurar
        }

        self.en_curso.push(boton.id.clone());
        let id = boton.id.clone();
        let estado = self.estado.clone();
        let emisor = self.emisor.clone();

        std::thread::spawn(move || {
            let resultado = actions::run_sequence(&secuencia, &estado);
            // Si el canal está cerrado es que la aplicación se cerró mientras la
            // acción corría; no hay nada que hacer y tampoco es un error.
            let _ = emisor.send(Terminada {
                boton: id,
                resultado,
            });
        });
    }

    pub fn paginas(&self) -> usize {
        self.config.as_ref().map_or(0, |c| c.pages.len())
    }

    /// Botones de la página actual, ordenados como en la rejilla.
    pub fn botones_de_pagina(&self) -> Vec<&ButtonConfig> {
        let Some(cfg) = self.config.as_ref() else {
            return Vec::new();
        };
        cfg.buttons_of_page(self.pagina).collect()
    }

    /// Dimensiones de la rejilla de la página actual.
    pub fn rejilla(&self) -> (usize, usize) {
        self.config
            .as_ref()
            .and_then(|c| c.pages.get(self.pagina as usize))
            .map(|p| (p.columns() as usize, p.rows() as usize))
            .unwrap_or((4, 4))
    }

    pub fn nombre_pagina(&self) -> String {
        self.config
            .as_ref()
            .and_then(|c| c.pages.get(self.pagina as usize))
            .map(|p| p.name.clone())
            .unwrap_or_default()
    }

    /// Color de acento configurado, o el del proyecto si no hay ninguno válido.
    pub fn acento(&self) -> egui::Color32 {
        self.config
            .as_ref()
            .and_then(|c| color_hex(&c.accent))
            .unwrap_or(egui::Color32::from_rgb(0x4F, 0xC3, 0xF7))
    }
}

/// Interpreta un color en formato `#RGB` o `#RRGGBB`.
///
/// La configuración guarda los colores como los escribe la interfaz web, así que
/// hay que aceptar las dos formas. Devuelve `None` en vez de un color por defecto
/// para que quien llama decida el respaldo.
pub fn color_hex(s: &str) -> Option<egui::Color32> {
    let h = s.trim().trim_start_matches('#');
    let leer = |i: usize, n: usize| u8::from_str_radix(&h[i..i + n], 16).ok();

    match h.len() {
        // `#abc` es la forma corta de `#aabbcc`.
        3 => {
            let r = leer(0, 1)?;
            let g = leer(1, 1)?;
            let b = leer(2, 1)?;
            Some(egui::Color32::from_rgb(r * 17, g * 17, b * 17))
        }
        6 => Some(egui::Color32::from_rgb(
            leer(0, 2)?,
            leer(2, 2)?,
            leer(4, 2)?,
        )),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use vd_core::config::model::{ActionType, ButtonAction, ButtonConfig};

    fn boton_que_pone_variable(id: &str, valor: &str) -> ButtonConfig {
        let mut a = ButtonAction {
            action_type: ActionType::SetVar,
            ..ButtonAction::default()
        };
        a.var_name = Some("probado".into());
        a.var_value = Some(valor.into());

        ButtonConfig {
            label: "prueba".into(),
            action: a,
            ..ButtonConfig::empty(id, 0)
        }
    }

    /// Espera a que el hilo de la accion devuelva su resultado.
    fn esperar_resultado(app: &mut App) {
        let limite = std::time::Instant::now();
        while !app.en_curso.is_empty() && limite.elapsed() < std::time::Duration::from_secs(5) {
            app.recoger_resultados();
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        app.recoger_resultados();
    }

    #[test]
    fn el_resultado_de_una_accion_vuelve_del_hilo_de_fondo() {
        // Es lo unico que esta capa agrega sobre el motor ya probado: mandar la
        // accion a otro hilo y recoger su resultado sin bloquear la interfaz. Si
        // el canal se rompiera, el boton se quedaria girando para siempre.
        let mut app = App::nueva();
        let boton = boton_que_pone_variable("test-1", "si");

        app.pulsar(&boton);
        assert_eq!(
            app.en_curso.len(),
            1,
            "deberia quedar marcado como en curso"
        );

        esperar_resultado(&mut app);

        assert!(
            app.en_curso.is_empty(),
            "el boton tenia que dejar de estar en curso"
        );
        assert_eq!(app.estado.get("probado").map(String::as_str), Some("si"));
        assert!(
            app.aviso.is_some(),
            "tiene que haber un aviso del resultado"
        );
    }

    #[test]
    fn no_se_ejecuta_dos_veces_el_mismo_boton_a_la_vez() {
        // Sin esta guarda, pulsar rapido dispararia el script dos veces o mandaria
        // dos webhooks.
        let mut app = App::nueva();
        let boton = boton_que_pone_variable("test-2", "x");

        app.pulsar(&boton);
        app.pulsar(&boton);
        assert_eq!(app.en_curso.len(), 1);

        esperar_resultado(&mut app);
        assert!(app.en_curso.is_empty());
    }

    #[test]
    fn un_boton_sin_accion_no_lanza_nada() {
        let mut app = App::nueva();
        let vacio = ButtonConfig::empty("vacio", 0);
        app.pulsar(&vacio);
        assert!(app.en_curso.is_empty());
    }

    #[test]
    fn lee_colores_en_las_dos_formas() {
        assert_eq!(
            color_hex("#4FC3F7"),
            Some(egui::Color32::from_rgb(79, 195, 247))
        );
        assert_eq!(
            color_hex("4FC3F7"),
            Some(egui::Color32::from_rgb(79, 195, 247))
        );
        // La forma corta duplica cada dígito: #abc == #aabbcc.
        assert_eq!(
            color_hex("#abc"),
            Some(egui::Color32::from_rgb(0xAA, 0xBB, 0xCC))
        );
        assert_eq!(color_hex("#fff"), Some(egui::Color32::WHITE));
    }

    #[test]
    fn rechaza_lo_que_no_es_un_color() {
        assert_eq!(color_hex(""), None);
        assert_eq!(color_hex("#12345"), None);
        assert_eq!(color_hex("#zzzzzz"), None);
        // Un nombre CSS no se soporta; el respaldo lo decide quien llama.
        assert_eq!(color_hex("red"), None);
    }
}
