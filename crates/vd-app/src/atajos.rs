//! Atajos de teclado globales.
//!
//! Un botón del deck puede tener un `globalHotkey`: una combinación que lo
//! dispara desde cualquier aplicación, sin que VirtualDeck tenga el foco. Junto
//! con la bandeja, es la otra razón de usar **winit directo**: `global-hotkey`
//! publica en un canal propio que hay que sondear desde el bucle principal.
//!
//! # El formato de la combinación
//!
//! La configuración viene de la versión Electron, que usaba los nombres de
//! `globalShortcut` (`CommandOrControl+Shift+P`). La biblioteca de Rust espera
//! los suyos, parecidos pero no iguales, así que [`normalizar`] traduce entre
//! ambos antes de intentar el registro.

use std::collections::HashMap;
use std::str::FromStr;

use global_hotkey::hotkey::HotKey;
use global_hotkey::{GlobalHotKeyEvent, GlobalHotKeyManager};

pub struct Atajos {
    /// Hay que conservarlo vivo: al soltarlo se cancelan todos los registros.
    manager: GlobalHotKeyManager,
    /// Qué botón dispara cada atajo registrado.
    por_id: HashMap<u32, String>,
    /// Combinaciones que no se pudieron registrar, con el motivo. Se muestran en
    /// la interfaz: un atajo que no funciona y no lo dice es de lo más
    /// desconcertante que le puede pasar a un usuario.
    pub fallidos: Vec<(String, String)>,
}

impl Atajos {
    pub fn nuevos() -> anyhow::Result<Self> {
        Ok(Self {
            manager: GlobalHotKeyManager::new()?,
            por_id: HashMap::new(),
            fallidos: Vec::new(),
        })
    }

    /// Registra los atajos de todos los botones que tengan uno.
    ///
    /// Devuelve cuántos quedaron activos. Un atajo que ya tenga otra aplicación
    /// falla al registrarse, y eso **no** debe impedir que los demás funcionen.
    pub fn registrar_desde(&mut self, cfg: &vd_core::config::model::DeckConfig) -> usize {
        self.limpiar();

        let mut activos = 0;
        for boton in &cfg.buttons {
            let Some(combo) = boton
                .global_hotkey
                .as_deref()
                .filter(|s| !s.trim().is_empty())
            else {
                continue;
            };

            match HotKey::from_str(&normalizar(combo)) {
                Ok(atajo) => match self.manager.register(atajo) {
                    Ok(()) => {
                        self.por_id.insert(atajo.id(), boton.id.clone());
                        activos += 1;
                    }
                    Err(e) => self.fallidos.push((
                        combo.to_string(),
                        format!("ya lo usa otra aplicacion o el sistema ({e})"),
                    )),
                },
                Err(e) => self.fallidos.push((
                    combo.to_string(),
                    format!("no se entiende la combinacion ({e})"),
                )),
            }
        }
        activos
    }

    fn limpiar(&mut self) {
        self.por_id.clear();
        self.fallidos.clear();
    }

    /// Devuelve los IDs de botón cuyo atajo se acaba de pulsar.
    pub fn recoger(&self) -> Vec<String> {
        let mut botones = Vec::new();
        while let Ok(evento) = GlobalHotKeyEvent::receiver().try_recv() {
            // Solo al soltar: sin este filtro, mantener la tecla pulsada
            // dispararia la accion en bucle.
            if evento.state != global_hotkey::HotKeyState::Released {
                continue;
            }
            if let Some(id) = self.por_id.get(&evento.id) {
                botones.push(id.clone());
            }
        }
        botones
    }

    pub fn activos(&self) -> usize {
        self.por_id.len()
    }
}

/// Traduce los nombres de Electron a los que entiende `global-hotkey`.
///
/// Solo cambia lo que hace falta y deja pasar el resto: la biblioteca ya acepta
/// `Ctrl`, `Alt`, `Shift` y las teclas sueltas como `P` o `F5`.
pub fn normalizar(combo: &str) -> String {
    combo
        .split('+')
        .map(|parte| {
            let p = parte.trim();
            match p.to_ascii_lowercase().as_str() {
                // Electron usa este nombre para "Cmd en Mac, Ctrl en el resto".
                // Aqui solo hay Windows, asi que es Ctrl.
                "commandorcontrol" | "cmdorctrl" | "command" | "cmd" => "Control",
                "control" | "ctrl" => "Control",
                "option" => "Alt",
                // "Super" es como Electron llama a la tecla Windows.
                "super" | "meta" | "win" => "Super",
                _ => p,
            }
            .to_string()
        })
        .collect::<Vec<_>>()
        .join("+")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn traduce_los_nombres_de_electron() {
        assert_eq!(normalizar("CommandOrControl+Shift+P"), "Control+Shift+P");
        assert_eq!(normalizar("CmdOrCtrl+K"), "Control+K");
        assert_eq!(normalizar("Super+D"), "Super+D");
        assert_eq!(normalizar("Option+F5"), "Alt+F5");
    }

    #[test]
    fn deja_pasar_lo_que_ya_es_valido() {
        assert_eq!(normalizar("Ctrl+Shift+A"), "Control+Shift+A");
        assert_eq!(normalizar("F9"), "F9");
    }

    #[test]
    fn tolera_espacios_alrededor() {
        assert_eq!(normalizar(" Ctrl + Shift + P "), "Control+Shift+P");
    }

    #[test]
    fn lo_normalizado_lo_entiende_la_biblioteca() {
        // El unico test que importa de verdad: que la traduccion produzca algo
        // que `global-hotkey` sepa parsear. Comparar cadenas no lo garantiza.
        for combo in [
            "CommandOrControl+Shift+P",
            "CmdOrCtrl+K",
            "Ctrl+Alt+Delete",
            "Alt+F4",
            "F9",
            "Super+D",
        ] {
            let n = normalizar(combo);
            assert!(
                HotKey::from_str(&n).is_ok(),
                "{combo:?} se normalizo a {n:?} y sigue sin parsearse"
            );
        }
    }

    #[test]
    fn el_registro_real_en_windows_funciona() {
        // Los demas tests solo comprueban el parseo. Este ejercita el camino
        // completo: pedirle el atajo al sistema y devolverlo. Sin el, un fallo
        // de registro solo se veria pulsando teclas con la aplicacion abierta.
        //
        // Se elige una combinacion que ningun programa razonable usa, y se
        // libera enseguida: un test no puede dejar un atajo global tomado.
        let manager = GlobalHotKeyManager::new().expect("crear el gestor de atajos");
        let atajo = HotKey::from_str(&normalizar("CommandOrControl+Alt+Shift+F24"))
            .expect("la combinacion de prueba deberia parsearse");

        manager
            .register(atajo)
            .expect("el sistema deberia aceptar el registro");
        manager
            .unregister(atajo)
            .expect("y deberia dejar liberarlo");
    }

    #[test]
    fn una_combinacion_sin_sentido_se_rechaza() {
        assert!(HotKey::from_str(&normalizar("NoEsUnaTecla")).is_err());
        assert!(HotKey::from_str(&normalizar("")).is_err());
    }
}
