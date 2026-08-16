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

    /// Botones de tipo interruptor que están encendidos ahora mismo.
    ///
    /// Vive en memoria y no en la configuración a propósito: es estado de la
    /// sesión, no algo que el usuario haya configurado. Guardarlo escribiría el
    /// `deck-config.json` en cada pulsación.
    pub encendidos: std::collections::HashSet<String>,

    /// En modo edición, pulsar un botón lo selecciona en vez de ejecutarlo.
    pub modo_edicion: bool,
    /// ID del botón que se está arrastrando, si hay alguno.
    pub arrastrando: Option<String>,
    /// Datos en vivo para los widgets, sondeados en un hilo aparte.
    pub datos: crate::datos::Datos,
    /// Grabacion de macro en curso, si la hay.
    pub grabacion: Option<crate::pantallas::secuencia::Grabacion>,
    /// Copia del botón que se está editando. Se trabaja sobre ella y solo se
    /// vuelca a la configuración al guardar, para que salirse del editor no deje
    /// cambios a medias.
    pub borrador: Option<ButtonConfig>,

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

        let ajustes_sensores = config.as_ref().and_then(|c| c.sensors.clone());

        Self {
            config,
            estado,
            pagina: 0,
            en_curso: Vec::new(),
            aviso: None,
            error_carga,
            encendidos: std::collections::HashSet::new(),
            modo_edicion: false,
            arrastrando: None,
            datos: crate::datos::Datos::arrancar(ajustes_sensores),
            grabacion: None,
            borrador: None,
            emisor,
            receptor,
        }
    }

    /// Recoge los resultados de las acciones que hayan terminado.
    ///
    /// Se llama una vez por fotograma. `try_recv` no bloquea: si no hay nada
    /// listo, la interfaz sigue dibujando.
    pub fn recoger_resultados(&mut self) {
        self.datos.recoger();
        self.vigilar_grabacion();

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
    ///
    /// Para un botón interruptor alterna entre su acción y la de apagado; para
    /// el resto ejecuta la suya.
    pub fn pulsar(&mut self, boton: &ButtonConfig) {
        if boton.is_toggle.unwrap_or(false) {
            let encendido = self.encendidos.contains(&boton.id);
            // La acción de apagado es opcional: un interruptor puede existir solo
            // para llevar la cuenta de un estado que se ve en la propia rejilla.
            let accion = if encendido {
                boton.action_toggle_off.clone()
            } else {
                Some(boton.action.clone())
            };

            // El estado se cambia aunque la acción falle: si no, un interruptor
            // cuya acción de apagado no existe se quedaría encendido para siempre.
            if encendido {
                self.encendidos.remove(&boton.id);
            } else {
                self.encendidos.insert(boton.id.clone());
            }

            if let Some(a) = accion {
                self.lanzar(&boton.id, vec![a]);
            }
            return;
        }

        let secuencia = match &boton.actions {
            Some(v) if !v.is_empty() => v.clone(),
            _ => vec![boton.action.clone()],
        };
        self.lanzar(&boton.id, secuencia);
    }

    /// Lanza la acción de **pulsación larga** de un botón, si la tiene.
    ///
    /// Devuelve `false` cuando el botón no define ninguna, para que quien llama
    /// pueda tratar la pulsación como un clic normal.
    pub fn pulsacion_larga(&mut self, boton: &ButtonConfig) -> bool {
        let Some(accion) = boton
            .long_press_action
            .clone()
            .filter(|a| !a.action_type.is_none())
        else {
            return false;
        };
        self.lanzar(&boton.id, vec![accion]);
        true
    }

    fn lanzar(&mut self, id: &str, secuencia: Vec<vd_core::config::model::ButtonAction>) {
        // Volver a pulsar un botón que ya está corriendo duplicaría su efecto:
        // dos veces el mismo script, dos webhooks. Se ignora.
        if self.en_curso.iter().any(|e| e == id) {
            return;
        }
        if secuencia.iter().all(|a| a.action_type.is_none()) {
            return; // botón sin configurar
        }

        self.en_curso.push(id.to_string());
        let id = id.to_string();
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

    /// Abre el editor sobre un botón.
    pub fn editar(&mut self, boton: &ButtonConfig) {
        self.borrador = Some(boton.clone());
    }

    /// Vuelca el borrador a la configuración **en memoria**.
    ///
    /// Separado del guardado en disco para poder probarlo: un test que escribiera
    /// la configuración real le machacaría los botones a quien compile el
    /// proyecto.
    ///
    /// Devuelve `false` si no había nada que aplicar.
    pub fn aplicar_borrador(&mut self) -> bool {
        let Some(borrador) = self.borrador.take() else {
            return false;
        };
        let Some(cfg) = self.config.as_mut() else {
            return false;
        };

        match cfg.buttons.iter_mut().find(|b| b.id == borrador.id) {
            Some(destino) => *destino = borrador,
            // Un hueco de la rejilla no existe como botón en el JSON hasta que
            // se configura; al guardarlo por primera vez hay que crearlo.
            None => cfg.buttons.push(borrador),
        }
        true
    }

    /// Aplica el borrador y escribe la configuración en disco.
    pub fn guardar_borrador(&mut self) {
        if !self.aplicar_borrador() {
            return;
        }
        self.guardar();
    }

    /// Intercambia el contenido de dos posiciones de la rejilla.
    ///
    /// Se cambia el **contenido**, no los identificadores: en esta configuración
    /// el id codifica la posición (`0-4` es la quinta casilla de la primera
    /// página), así que moverlos rompería esa correspondencia y dejaría la
    /// rejilla inconsistente con el archivo.
    ///
    /// Devuelve `false` si no había nada que mover.
    pub fn intercambiar(&mut self, origen: &str, destino: &str) -> bool {
        if origen == destino {
            return false;
        }
        let Some(cfg) = self.config.as_mut() else {
            return false;
        };

        let i = cfg.buttons.iter().position(|b| b.id == origen);
        let j = cfg.buttons.iter().position(|b| b.id == destino);
        let (Some(i), Some(j)) = (i, j) else {
            return false;
        };

        cfg.buttons.swap(i, j);
        // Tras el intercambio, cada botón lleva el id del otro. Se devuelven a su
        // sitio para que el id siga describiendo la posición.
        let id_i = cfg.buttons[i].id.clone();
        let id_j = cfg.buttons[j].id.clone();
        cfg.buttons[i].id = id_j;
        cfg.buttons[j].id = id_i;

        // El estado de los interruptores va con el botón, no con la casilla.
        let encendido_origen = self.encendidos.remove(origen);
        let encendido_destino = self.encendidos.remove(destino);
        if encendido_origen {
            self.encendidos.insert(destino.to_string());
        }
        if encendido_destino {
            self.encendidos.insert(origen.to_string());
        }
        true
    }

    /// Guarda la configuración tal como está en memoria.
    pub fn guardar(&mut self) {
        let Some(cfg) = self.config.as_ref() else {
            return;
        };
        self.aviso = Some(match vd_core::config::save(cfg) {
            Ok(()) => Aviso {
                texto: "Guardado".into(),
                error: false,
                desde: Instant::now(),
            },
            // Si el guardado falla, el cambio sigue en memoria pero no en disco.
            // Decirlo importa: el usuario podria cerrar creyendo que se guardo.
            Err(e) => Aviso {
                texto: format!("No se pudo guardar: {e}"),
                error: true,
                desde: Instant::now(),
            },
        });
    }

    /// Empieza a grabar una macro para el boton indicado.
    pub fn grabar_macro(&mut self, boton: &str) {
        if self.grabacion.is_some() {
            return;
        }
        match vd_core::macros::start_recording() {
            Ok(()) => {
                self.grabacion = Some(crate::pantallas::secuencia::Grabacion {
                    desde: Instant::now(),
                    boton: boton.to_string(),
                });
                self.aviso = Some(Aviso {
                    texto: "Grabando: usa el teclado y el raton, luego pulsa Detener".into(),
                    error: false,
                    desde: Instant::now(),
                });
            }
            Err(e) => {
                self.aviso = Some(Aviso {
                    texto: format!("No se pudo empezar a grabar: {e}"),
                    error: true,
                    desde: Instant::now(),
                });
            }
        }
    }

    /// Detiene la grabacion y guarda los pasos en el borrador.
    ///
    /// Los pasos van al **borrador**, no a la configuracion: el usuario todavia
    /// puede descartar, igual que con cualquier otro cambio del editor.
    pub fn detener_macro(&mut self) {
        let Some(g) = self.grabacion.take() else {
            return;
        };
        let pasos = match vd_core::macros::stop_recording() {
            Ok(p) => p,
            Err(e) => {
                self.aviso = Some(Aviso {
                    texto: format!("No se pudo detener la grabacion: {e}"),
                    error: true,
                    desde: Instant::now(),
                });
                return;
            }
        };

        // Si el usuario cambio de boton mientras grababa, los pasos no son suyos.
        let Some(borrador) = self.borrador.as_mut().filter(|b| b.id == g.boton) else {
            self.aviso = Some(Aviso {
                texto: "Grabacion descartada: se cambio de boton mientras grababa".into(),
                error: true,
                desde: Instant::now(),
            });
            return;
        };

        let n = pasos.len();
        borrador.action = vd_core::config::model::ButtonAction {
            action_type: vd_core::config::model::ActionType::Macro,
            macro_steps: Some(pasos),
            ..vd_core::config::model::ButtonAction::default()
        };
        borrador.actions = None;

        self.aviso = Some(Aviso {
            texto: format!("Macro grabada: {n} paso(s). Recuerda guardar."),
            error: false,
            desde: Instant::now(),
        });
    }

    /// Corta la grabacion si lleva demasiado tiempo.
    ///
    /// La grabacion instala un hook global de teclado; dejarlo activo porque el
    /// usuario se olvido de pararlo es a la vez consumo inutil y algo que nadie
    /// quiere corriendo sin darse cuenta.
    pub fn vigilar_grabacion(&mut self) {
        let vencida = self
            .grabacion
            .as_ref()
            .is_some_and(|g| g.desde.elapsed() > crate::pantallas::secuencia::maximo_grabacion());
        if vencida {
            self.detener_macro();
        }
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
    fn editar_un_boton_existente_lo_reemplaza_sin_duplicarlo() {
        let mut app = App::nueva();
        let Some(cfg) = app.config.as_mut() else {
            return; // sin configuracion en esta maquina, nada que comprobar
        };
        let antes = cfg.buttons.len();
        let Some(primero) = cfg.buttons.first().cloned() else {
            return;
        };

        let mut editado = primero.clone();
        editado.label = "etiqueta nueva".into();
        app.borrador = Some(editado);

        assert!(app.aplicar_borrador());
        let cfg = app.config.as_ref().unwrap();
        assert_eq!(
            cfg.buttons.len(),
            antes,
            "no deberia haber añadido un boton"
        );
        assert_eq!(
            cfg.button(&primero.id).map(|b| b.label.as_str()),
            Some("etiqueta nueva")
        );
    }

    #[test]
    fn configurar_un_hueco_crea_el_boton() {
        // Un hueco de la rejilla no existe en el JSON hasta que se configura.
        let mut app = App::nueva();
        if app.config.is_none() {
            return;
        }
        let antes = app.config.as_ref().unwrap().buttons.len();

        let mut nuevo = ButtonConfig::empty("pagina-inventada-99", 0);
        nuevo.label = "recien creado".into();
        app.borrador = Some(nuevo);

        assert!(app.aplicar_borrador());
        let cfg = app.config.as_ref().unwrap();
        assert_eq!(cfg.buttons.len(), antes + 1);
        assert!(cfg.button("pagina-inventada-99").is_some());
    }

    #[test]
    fn un_interruptor_alterna_su_estado() {
        let mut app = App::nueva();
        let mut b = boton_que_pone_variable("toggle-1", "encendido");
        b.is_toggle = Some(true);
        b.action_toggle_off = Some({
            let mut a = ButtonAction {
                action_type: ActionType::SetVar,
                ..ButtonAction::default()
            };
            a.var_name = Some("probado".into());
            a.var_value = Some("apagado".into());
            a
        });

        app.pulsar(&b);
        assert!(
            app.encendidos.contains("toggle-1"),
            "deberia quedar encendido"
        );
        esperar_resultado(&mut app);
        assert_eq!(
            app.estado.get("probado").map(String::as_str),
            Some("encendido")
        );

        app.pulsar(&b);
        assert!(
            !app.encendidos.contains("toggle-1"),
            "deberia quedar apagado"
        );
        esperar_resultado(&mut app);
        assert_eq!(
            app.estado.get("probado").map(String::as_str),
            Some("apagado")
        );
    }

    #[test]
    fn un_interruptor_sin_accion_de_apagado_igual_se_apaga() {
        // Si el estado solo cambiara cuando hay accion de apagado, un interruptor
        // sin ella se quedaria encendido para siempre.
        let mut app = App::nueva();
        let mut b = boton_que_pone_variable("toggle-2", "x");
        b.is_toggle = Some(true);
        b.action_toggle_off = None;

        app.pulsar(&b);
        assert!(app.encendidos.contains("toggle-2"));
        esperar_resultado(&mut app);

        app.pulsar(&b);
        assert!(!app.encendidos.contains("toggle-2"));
    }

    #[test]
    fn sin_accion_larga_configurada_se_avisa() {
        // Quien llama necesita saberlo para tratar la pulsacion como un clic
        // normal en vez de no hacer nada.
        let mut app = App::nueva();
        let b = boton_que_pone_variable("sin-larga", "x");
        assert!(!app.pulsacion_larga(&b));

        // La accion de prueba tiene que ser inocua. Aqui hubo `Mute`, que
        // silencia el sistema de verdad y deja el equipo mudo tras un
        // `cargo test`. Ver la regla en docs/MIGRACION-RUST.md: un test no le
        // cambia el equipo a quien lo ejecuta.
        let mut con = b.clone();
        let mut larga = ButtonAction {
            action_type: ActionType::SetVar,
            ..ButtonAction::default()
        };
        larga.var_name = Some("probado".into());
        larga.var_value = Some("larga".into());
        con.long_press_action = Some(larga);

        assert!(app.pulsacion_larga(&con));
        esperar_resultado(&mut app);
        assert_eq!(app.estado.get("probado").map(String::as_str), Some("larga"));
    }

    #[test]
    fn intercambiar_mueve_el_contenido_y_deja_los_ids_en_su_sitio() {
        // El id codifica la posicion ("0-4" es la quinta casilla), asi que al
        // reordenar tienen que viajar las etiquetas y acciones, no los ids. Si
        // se movieran los ids, la rejilla dejaria de coincidir con el archivo.
        let mut app = App::nueva();
        let Some(cfg) = app.config.as_ref() else {
            return; // sin configuracion en esta maquina
        };
        let usados: Vec<_> = cfg
            .buttons
            .iter()
            .filter(|b| !b.is_empty())
            .take(2)
            .cloned()
            .collect();
        if usados.len() < 2 {
            return;
        }
        let (a, b) = (&usados[0], &usados[1]);

        assert!(app.intercambiar(&a.id, &b.id));

        let cfg = app.config.as_ref().unwrap();
        assert_eq!(
            cfg.button(&a.id).map(|x| x.label.as_str()),
            Some(b.label.as_str()),
            "en la casilla de origen deberia estar ahora la etiqueta del destino"
        );
        assert_eq!(
            cfg.button(&b.id).map(|x| x.label.as_str()),
            Some(a.label.as_str())
        );
        // Y los dos ids tienen que seguir existiendo, una sola vez cada uno.
        assert_eq!(cfg.buttons.iter().filter(|x| x.id == a.id).count(), 1);
        assert_eq!(cfg.buttons.iter().filter(|x| x.id == b.id).count(), 1);
    }

    #[test]
    fn al_intercambiar_el_estado_del_interruptor_viaja_con_el_boton() {
        // Si el estado se quedara en la casilla, mover un interruptor encendido
        // apagaria ese y encenderia el que ocupara su sitio.
        let mut app = App::nueva();
        let Some(cfg) = app.config.as_ref() else {
            return;
        };
        let ids: Vec<String> = cfg.buttons.iter().take(2).map(|b| b.id.clone()).collect();
        if ids.len() < 2 {
            return;
        }

        app.encendidos.insert(ids[0].clone());
        assert!(app.intercambiar(&ids[0], &ids[1]));

        assert!(
            app.encendidos.contains(&ids[1]),
            "el encendido tenia que acompañar al boton a su nueva casilla"
        );
        assert!(!app.encendidos.contains(&ids[0]));
    }

    #[test]
    fn intercambiar_una_casilla_consigo_misma_no_hace_nada() {
        let mut app = App::nueva();
        let Some(cfg) = app.config.as_ref() else {
            return;
        };
        let Some(id) = cfg.buttons.first().map(|b| b.id.clone()) else {
            return;
        };
        assert!(!app.intercambiar(&id, &id));
        assert!(!app.intercambiar(&id, "no-existe-esta-casilla"));
    }

    #[test]
    fn sin_borrador_no_se_toca_nada() {
        let mut app = App::nueva();
        assert!(!app.aplicar_borrador());
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
