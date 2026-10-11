//! Despacho de cada tipo de accion y sus ayudantes directos.

use std::time::Duration;

use crate::config::model::{ActionType, BranchOp, ButtonAction, ScriptShell, WebhookMethod};

use super::motor::{Ctx, Outcome, TIMEOUT_WEBHOOK};
use super::utilidades::{a_snap, envolver, parsear_cabeceras, partir_argumentos};
use super::eval_branch;

impl Ctx {
    pub(super) fn ejecutar(&mut self, a: &ButtonAction) -> Outcome {
        use ActionType as T;

        match &a.action_type {
            T::None => Outcome::Ok,

            // --- lanzar cosas ---
            T::App => {
                let ruta = self.texto(&a.app_path);
                if ruta.is_empty() {
                    return Outcome::Failed(
                        "La accion no tiene ninguna aplicacion configurada.".into(),
                    );
                }
                // Los argumentos se parten respetando comillas: una ruta con
                // espacios entre comillas es un solo argumento, no varios.
                let args = partir_argumentos(&self.texto(&a.app_args));
                envolver(crate::launcher::launch_app(&ruta, &args))
            }
            T::Web => {
                let url = self.texto(&a.url);
                if url.is_empty() {
                    return Outcome::Failed("La accion no tiene ninguna URL configurada.".into());
                }
                envolver(crate::launcher::open_path(&url))
            }
            T::Shortcut => {
                let ruta = self.texto(&a.shortcut_path);
                if ruta.is_empty() {
                    return Outcome::Failed(
                        "La accion no tiene ningun acceso directo configurado.".into(),
                    );
                }
                envolver(crate::launcher::open_path(&ruta))
            }
            T::Script => self.ejecutar_script(a),

            // --- audio ---
            T::AudioDevice => self.cambiar_audio(a),
            T::VolumeSet => {
                let pct = a.volume_percent.unwrap_or(50);
                envolver(crate::launcher::set_master_volume(pct))
            }
            T::VolumeUp => envolver(crate::launcher::send_media_key(
                crate::launcher::MediaKey::VolumeUp,
            )),
            T::VolumeDown => envolver(crate::launcher::send_media_key(
                crate::launcher::MediaKey::VolumeDown,
            )),
            T::Mute => envolver(crate::launcher::send_media_key(
                crate::launcher::MediaKey::Mute,
            )),

            // --- reproduccion ---
            T::MediaPlayPause => {
                envolver(crate::media::control(crate::media::MediaCommand::PlayPause))
            }
            T::MediaNext => envolver(crate::media::control(crate::media::MediaCommand::Next)),
            T::MediaPrev => envolver(crate::media::control(crate::media::MediaCommand::Prev)),
            T::MediaShuffle => envolver(crate::media::toggle_shuffle().map(|_| ())),
            T::MediaRepeat => envolver(crate::media::cycle_repeat().map(|_| ())),

            // --- entrada ---
            T::Hotkey => {
                let combo = self.texto(&a.hotkey);
                if combo.is_empty() {
                    return Outcome::Failed("La accion no tiene ningun atajo configurado.".into());
                }
                envolver(crate::launcher::send_hotkey(&combo))
            }
            T::TypeText => envolver(crate::launcher::type_text(&self.texto(&a.type_text))),
            T::Clipboard => envolver(crate::launcher::set_clipboard(
                &self.texto(&a.clipboard_text),
            )),
            T::Macro => {
                let Some(pasos) = a.macro_steps.as_deref() else {
                    return Outcome::Failed("La macro no tiene ningun paso grabado.".into());
                };
                envolver(crate::macros::play(pasos, a.macro_repeat.unwrap_or(1)))
            }

            // --- sistema ---
            T::Brightness => {
                let nivel = a.brightness_level.unwrap_or(50);
                match crate::launcher::set_brightness(nivel) {
                    Ok(0) => Outcome::Failed(
                        "Ninguna pantalla acepto el cambio de brillo (puede no soportar DDC/CI)."
                            .into(),
                    ),
                    Ok(_) => Outcome::Ok,
                    Err(e) => Outcome::Failed(e.to_string()),
                }
            }
            T::KillProcess => {
                let nombre = self.texto(&a.process_name);
                if nombre.is_empty() {
                    return Outcome::Failed(
                        "La accion no tiene ningun proceso configurado.".into(),
                    );
                }
                match crate::launcher::kill_process(&nombre) {
                    Ok(0) => {
                        Outcome::Failed(format!("No hay ningun proceso llamado \"{nombre}\"."))
                    }
                    Ok(_) => Outcome::Ok,
                    Err(e) => Outcome::Failed(e.to_string()),
                }
            }
            T::WindowSnap => self.acomodar_ventana(a),

            // --- variables ---
            T::SetVar => {
                let Some(nombre) = a.var_name.as_deref().filter(|s| !s.is_empty()) else {
                    return Outcome::Failed("La accion no tiene ningun nombre de variable.".into());
                };
                let valor = self.texto(&a.var_value);
                self.estado.insert(nombre.to_string(), valor);
                Outcome::Ok
            }
            T::IncrVar => {
                let Some(nombre) = a.var_name.as_deref().filter(|s| !s.is_empty()) else {
                    return Outcome::Failed("La accion no tiene ningun nombre de variable.".into());
                };
                // Una variable sin valor previo, o con texto no numerico, cuenta
                // como cero: incrementar un contador que aun no existe tiene que
                // funcionar sin que el usuario lo inicialice a mano.
                let actual: i64 = self
                    .estado
                    .get(nombre)
                    .and_then(|v| v.trim().parse().ok())
                    .unwrap_or(0);
                let nuevo = actual.saturating_add(a.var_delta.unwrap_or(1));
                self.estado.insert(nombre.to_string(), nuevo.to_string());
                Outcome::Ok
            }

            // --- red ---
            T::Webhook => self.lanzar_webhook(a),

            // --- control de flujo ---
            T::Branch => self.ramificar(a),
            T::Countdown => self.cuenta_atras(a),

            // --- de la interfaz ---
            T::Folder => Outcome::ForUi("abrir carpeta de botones"),
            T::MobileRemote => Outcome::ForUi("mando móvil"),
            T::Discord => Outcome::ForUi("control de discord"),
            T::Spotify => Outcome::ForUi("control de spotify"),
            T::Notify => self.notificar(a),
            // La captura de region no la hace VirtualDeck: abre la herramienta
            // de Windows (la misma de Win+Shift+S), que ya sabe recortar,
            // anotar y dejar el resultado en el portapapeles.
            T::RegionCapture => envolver(crate::launcher::open_path("ms-screenclip:")),
            T::Tts => envolver(crate::voz::hablar(&self.texto(&a.tts_text))),
            T::RgbColor => self.rgb_color(a),
            T::RgbMode => self.rgb_modo(a),
            T::RgbProfile => self.rgb_perfil(a),
            T::RgbPreset => self.rgb_preset(a),

            T::Other(nombre) => Outcome::Failed(format!(
                "Tipo de accion desconocido: \"{nombre}\". Puede venir de una version mas nueva."
            )),
        }
    }

    /// Muestra una notificación del sistema.
    fn notificar(&mut self, a: &ButtonAction) -> Outcome {
        // Sin titulo se usa el nombre de la aplicacion, como hacia la version
        // Electron: una notificacion sin encabezado se ve rota.
        let titulo = match self.texto(&a.notify_title) {
            t if t.is_empty() => "VirtualDeck".to_string(),
            t => t,
        };
        envolver(crate::notify::notificar(
            &titulo,
            &self.texto(&a.notify_body),
        ))
    }

    fn ejecutar_script(&mut self, a: &ButtonAction) -> Outcome {
        let script = self.texto(&a.script);
        if script.is_empty() {
            return Outcome::Failed("La accion no tiene ningun script configurado.".into());
        }
        let shell = match a.script_shell {
            Some(ScriptShell::Cmd) => crate::launcher::Shell::Cmd,
            _ => crate::launcher::Shell::PowerShell,
        };

        match crate::launcher::run_script(&script, shell) {
            Ok(salida) => {
                if let Some(var) = a.capture_to_var.as_deref().filter(|s| !s.is_empty()) {
                    self.estado
                        .insert(var.to_string(), salida.trim().to_string());
                }
                Outcome::Ok
            }
            Err(e) => Outcome::Failed(e.to_string()),
        }
    }

    fn cambiar_audio(&mut self, a: &ButtonAction) -> Outcome {
        // Se prefiere el id, que es estable; el nombre es el respaldo para
        // configuraciones viejas y para cuando el dispositivo cambia de id al
        // reconectarse.
        if let Some(id) = a.device_id.as_deref().filter(|s| !s.is_empty()) {
            match crate::audio::set_default_device(id) {
                Ok(()) => return Outcome::Ok,
                Err(e) => {
                    if a.device_name.is_none() {
                        return Outcome::Failed(e.to_string());
                    }
                }
            }
        }
        let nombre = self.texto(&a.device_name);
        if nombre.is_empty() {
            return Outcome::Failed(
                "La accion no tiene ningun dispositivo de audio configurado.".into(),
            );
        }
        match crate::audio::find_device_by_name(&nombre) {
            Ok(d) => envolver(crate::audio::set_default_device(&d.id)),
            Err(e) => Outcome::Failed(e.to_string()),
        }
    }

    fn acomodar_ventana(&mut self, a: &ButtonAction) -> Outcome {
        let Some(posicion) = a.snap_position else {
            return Outcome::Failed("La accion no tiene ninguna posicion configurada.".into());
        };
        let proceso = self.texto(&a.snap_process_name);
        let objetivo = if proceso.is_empty() {
            None
        } else {
            Some(proceso.as_str())
        };
        envolver(crate::launcher::snap_window(a_snap(posicion), objetivo))
    }

    fn lanzar_webhook(&mut self, a: &ButtonAction) -> Outcome {
        let url = self.texto(&a.webhook_url);
        if url.is_empty() {
            return Outcome::Failed("El webhook no tiene ninguna URL configurada.".into());
        }
        let metodo = match a.webhook_method {
            Some(WebhookMethod::POST) => "POST",
            Some(WebhookMethod::PUT) => "PUT",
            Some(WebhookMethod::DELETE) => "DELETE",
            _ => "GET",
        };

        let cabeceras = parsear_cabeceras(&self.texto(&a.webhook_headers));
        let cuerpo = self.texto(&a.webhook_body);
        let cuerpo_bytes = (!cuerpo.is_empty()).then(|| cuerpo.into_bytes());

        match crate::net::request(
            metodo,
            &url,
            &cabeceras,
            cuerpo_bytes.as_deref(),
            TIMEOUT_WEBHOOK,
        ) {
            Ok(respuesta) => {
                if let Some(var) = a.capture_to_var.as_deref().filter(|s| !s.is_empty()) {
                    let texto = String::from_utf8_lossy(&respuesta).trim().to_string();
                    self.estado.insert(var.to_string(), texto);
                }
                Outcome::Ok
            }
            Err(e) => Outcome::Failed(e.to_string()),
        }
    }

    fn ramificar(&mut self, a: &ButtonAction) -> Outcome {
        if let Some(e) = self.comprobar_profundidad("branch") {
            return e;
        }
        let valor = a
            .branch_var
            .as_deref()
            .and_then(|n| self.estado.get(n))
            .cloned()
            .unwrap_or_default();
        let comparar = self.texto(&a.branch_value);
        let se_cumple = eval_branch(&valor, a.branch_op.unwrap_or(BranchOp::Eq), &comparar);

        let rama = if se_cumple {
            a.branch_then.as_deref()
        } else {
            a.branch_else.as_deref()
        };

        match rama {
            Some(sub) if !sub.is_empty() => self.correr_anidado(sub),
            // Una rama vacia no es un error: es la forma normal de escribir un
            // "si se cumple, no hagas nada".
            _ => Outcome::Ok,
        }
    }

    fn cuenta_atras(&mut self, a: &ButtonAction) -> Outcome {
        if let Some(e) = self.comprobar_profundidad("countdown") {
            return e;
        }
        let espera = a.timer_delay.unwrap_or(1000).max(0) as u64;
        std::thread::sleep(Duration::from_millis(espera));

        match a.timer_actions.as_deref() {
            Some(sub) if !sub.is_empty() => self.correr_anidado(sub),
            _ => Outcome::Ok,
        }
    }
}
