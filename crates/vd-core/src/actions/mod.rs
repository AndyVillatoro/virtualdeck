//! Motor de ejecucion: convierte un `ButtonAction` en efectos reales.
//!
//! Es el modulo que orquesta a todos los demas, y por eso va el ultimo: audio,
//! media, launcher, macros, rgb y net ya estan verificados de forma
//! independiente. Aca solo se decide **que** llamar y **en que orden**.
//!
//! # Que queda fuera a proposito
//!
//! Una accion no es ejecutable desde el nucleo cuando su efecto *es* la interfaz:
//! hoy, abrir una carpeta de botones. El motor la reconoce y devuelve
//! [`Outcome::ForUi`] en vez de fingir que la ejecuto o de tratarla como error;
//! `vd-app` es quien la atiende.
//!
//! Notificar y capturar una region estuvieron aqui y ya no: las dos las hace
//! Windows, no la interfaz, asi que el nucleo puede con ellas.
//!
//! Esa distincion importa: una accion "para la UI" **no interrumpe** una
//! secuencia, mientras que un fallo real si puede hacerlo.

mod expr;

pub use expr::{eval_branch, interpolate, State};

use std::time::Duration;

use crate::config::model::{
    ActionType, BranchOp, ButtonAction, ScriptShell, SnapPosition as CfgSnap, WebhookMethod,
};

/// Retardo por defecto entre pasos de una secuencia.
///
/// Sin una pausa, la aplicacion que se acaba de lanzar todavia no existe cuando
/// el paso siguiente intenta escribirle. La version Electron usaba este mismo
/// valor y esta calibrado contra ese comportamiento.
const RETARDO_ENTRE_PASOS: Duration = Duration::from_millis(150);

/// Tiempo maximo de un webhook. Un servidor colgado no debe congelar el deck.
const TIMEOUT_WEBHOOK: Duration = Duration::from_secs(10);

/// Profundidad maxima de anidamiento de `branch` y `countdown`.
///
/// Una configuracion puede tener ciclos —dos ramas que se llaman entre si— y sin
/// un tope el motor desbordaria la pila y tumbaria la aplicacion. Diez niveles
/// son mas de los que ninguna configuracion razonable necesita.
const PROFUNDIDAD_MAXIMA: usize = 10;

/// Resultado de ejecutar una accion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// Se ejecuto.
    Ok,
    /// El nucleo la reconoce pero le corresponde a la interfaz. No es un fallo y
    /// no interrumpe la secuencia.
    ForUi(&'static str),
    /// Fallo, con el motivo en lenguaje llano.
    Failed(String),
}

impl Outcome {
    /// Si cuenta como "el paso anterior fue bien" para `only_if_prev_ok`.
    pub fn is_ok(&self) -> bool {
        !matches!(self, Outcome::Failed(_))
    }
}

/// Resultado de una secuencia completa.
#[derive(Debug, Clone)]
pub struct SequenceResult {
    pub ok: bool,
    /// El **primer** error, no el ultimo: es el que explica por que se paro.
    pub error: Option<String>,
    /// Estado de variables tras la secuencia, con las mutaciones aplicadas.
    pub state: State,
    /// Acciones que quedaron pendientes de la interfaz, en orden.
    pub for_ui: Vec<&'static str>,
}

/// Ejecuta una secuencia de acciones.
///
/// Las mutaciones de variables (`set-var`, `incr-var`, captura de salida de un
/// script) se acumulan sobre una copia del estado y se devuelven; el motor no
/// escribe en la configuracion, eso lo decide quien llama.
pub fn run_sequence(acciones: &[ButtonAction], estado: &State) -> SequenceResult {
    let mut ctx = Ctx {
        estado: estado.clone(),
        for_ui: Vec::new(),
        profundidad: 0,
    };
    let error = ctx.correr(acciones);
    SequenceResult {
        ok: error.is_none(),
        error,
        state: ctx.estado,
        for_ui: ctx.for_ui,
    }
}

/// Ejecuta una sola accion. Atajo para pruebas y para disparos directos.
pub fn run_one(accion: &ButtonAction, estado: &State) -> SequenceResult {
    run_sequence(std::slice::from_ref(accion), estado)
}

struct Ctx {
    estado: State,
    for_ui: Vec<&'static str>,
    profundidad: usize,
}

impl Ctx {
    /// Devuelve el primer error, o `None` si todo fue bien.
    fn correr(&mut self, acciones: &[ButtonAction]) -> Option<String> {
        let mut primer_error: Option<String> = None;
        let mut anterior_ok = true;

        for (i, a) in acciones.iter().enumerate() {
            if a.only_if_prev_ok.unwrap_or(false) && !anterior_ok {
                continue;
            }

            let repeticiones = a.repeat.unwrap_or(1).max(1);
            for _ in 0..repeticiones {
                // El primer paso no espera; los siguientes si, salvo que la
                // accion fije su propio retardo.
                let espera = match a.delay_ms {
                    Some(ms) if ms > 0 => Duration::from_millis(ms as u64),
                    Some(_) => Duration::ZERO,
                    None if i > 0 => RETARDO_ENTRE_PASOS,
                    None => Duration::ZERO,
                };
                if !espera.is_zero() {
                    std::thread::sleep(espera);
                }

                let resultado = self.ejecutar(a);
                anterior_ok = resultado.is_ok();

                match resultado {
                    Outcome::ForUi(que) => self.for_ui.push(que),
                    Outcome::Failed(e) => {
                        if primer_error.is_none() {
                            primer_error = Some(e);
                        }
                        // Se abandonan las repeticiones restantes de *esta*
                        // accion, pero la secuencia continua: puede haber pasos
                        // posteriores marcados para ejecutarse igualmente.
                        break;
                    }
                    Outcome::Ok => {}
                }
            }
        }
        primer_error
    }

    /// Interpola una cadena opcional contra el estado actual.
    fn texto(&self, campo: &Option<String>) -> String {
        campo
            .as_deref()
            .map(|s| interpolate(s, &self.estado))
            .unwrap_or_default()
    }

    fn ejecutar(&mut self, a: &ButtonAction) -> Outcome {
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

    /// Aplica un color plano a un dispositivo via OpenRGB.
    fn rgb_color(&mut self, a: &ButtonAction) -> Outcome {
        let texto = self.texto(&a.rgb_color);
        let Some(color) = parsear_color(&texto) else {
            return Outcome::Failed(format!(
                "El color \"{texto}\" no se entiende; se espera #RRGGBB."
            ));
        };

        self.en_dispositivos_rgb(a, |cliente, indice| {
            cliente.pintar(indice, color).map(|_| ())
        })
    }

    /// Pone los dispositivos en uno de sus modos de efecto.
    fn rgb_modo(&mut self, a: &ButtonAction) -> Outcome {
        let modo = self.texto(&a.rgb_mode);
        if modo.is_empty() {
            return Outcome::Failed("La accion no tiene ningun modo RGB configurado.".into());
        }
        // El color y el brillo son opcionales: cada modo decide si le sirven.
        let color = parsear_color(&self.texto(&a.rgb_color));
        let brillo = a.rgb_brightness.map(|b| b.clamp(0, 100) as u8);

        self.en_dispositivos_rgb(a, |cliente, indice| {
            cliente
                .aplicar_modo(indice, &modo, color, brillo)
                .map(|_| ())
        })
    }

    /// Carga un perfil guardado en OpenRGB.
    ///
    /// Un perfil es global, no de un dispositivo: se manda una sola vez.
    fn rgb_perfil(&mut self, a: &ButtonAction) -> Outcome {
        let perfil = self.texto(&a.rgb_profile_name);
        if perfil.is_empty() {
            return Outcome::Failed("La accion no tiene ningun perfil RGB configurado.".into());
        }
        match conectar_openrgb() {
            Ok(mut cliente) => envolver(cliente.cargar_perfil(&perfil)),
            Err(e) => Outcome::Failed(e),
        }
    }

    /// Aplica un preset: un efecto con su color, sin depender del hardware.
    ///
    /// Cada preset lleva una lista de nombres de modo en orden de preferencia,
    /// porque el mismo efecto se llama distinto en cada fabricante. Si ninguno
    /// existe se cae al color plano, que funciona en todas partes.
    fn rgb_preset(&mut self, a: &ButtonAction) -> Outcome {
        let id = self.texto(&a.rgb_preset_id);
        let Some(preset) = PRESETS_RGB.iter().find(|p| p.id == id) else {
            return Outcome::Failed(format!(
                "El preset RGB \"{id}\" no existe. Hay: {}",
                PRESETS_RGB
                    .iter()
                    .map(|p| p.id)
                    .collect::<Vec<_>>()
                    .join(", ")
            ));
        };
        let color = preset.color.and_then(parsear_color);

        self.en_dispositivos_rgb(a, |cliente, indice| {
            for nombre in preset.modos {
                if cliente.aplicar_modo(indice, nombre, color, None).is_ok() {
                    return Ok(());
                }
            }
            // Ningun modo del preset existe en este dispositivo. Con color se
            // deja al menos el color; sin el (un arcoiris) no hay equivalente.
            match color {
                Some(c) => cliente.pintar(indice, c).map(|_| ()),
                None => Err(crate::rgb::OpenRgbError::Protocolo(format!(
                    "ningun modo de \"{}\" existe en este dispositivo",
                    preset.id
                ))),
            }
        })
    }

    /// Corre una operación de OpenRGB sobre el dispositivo indicado, o sobre
    /// todos si la acción no nombra ninguno.
    ///
    /// Sin dispositivo indicado se actúa sobre todos, que es lo que espera quien
    /// pone un botón de "todo en rojo". Un fallo en uno **no** detiene a los
    /// demás: que la placa no admita un efecto no es razón para dejar los
    /// ventiladores como estaban.
    fn en_dispositivos_rgb(
        &mut self,
        a: &ButtonAction,
        mut operacion: impl FnMut(&mut crate::rgb::OpenRgb, u32) -> Result<(), crate::rgb::OpenRgbError>,
    ) -> Outcome {
        let mut cliente = match conectar_openrgb() {
            Ok(c) => c,
            Err(e) => return Outcome::Failed(e),
        };

        if let Some(id) = a.rgb_device_id.filter(|id| *id >= 0) {
            return envolver(operacion(&mut cliente, id as u32));
        }

        let lista = match cliente.listar() {
            Ok(l) if l.is_empty() => {
                return Outcome::Failed("OpenRGB no ve ningun dispositivo RGB.".into())
            }
            Ok(l) => l,
            Err(e) => return Outcome::Failed(e.to_string()),
        };

        let mut fallos = Vec::new();
        for d in &lista {
            if let Err(e) = operacion(&mut cliente, d.indice) {
                fallos.push(format!("{}: {e}", d.nombre));
            }
        }
        // Un fallo parcial se cuenta como fallo y se nombra el dispositivo: que
        // la mitad de las luces cambie y la otra no es justo el caso en que hace
        // falta saber cuál se quedó fuera.
        if fallos.is_empty() {
            Outcome::Ok
        } else {
            Outcome::Failed(fallos.join("; "))
        }
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

    fn comprobar_profundidad(&self, que: &str) -> Option<Outcome> {
        (self.profundidad >= PROFUNDIDAD_MAXIMA).then(|| {
            Outcome::Failed(format!(
                "Anidamiento de {que} demasiado profundo ({PROFUNDIDAD_MAXIMA} niveles). \
                 Puede haber acciones que se llaman entre si en un ciclo."
            ))
        })
    }

    /// Ejecuta una sub-secuencia compartiendo el estado y la lista de pendientes.
    ///
    /// El estado se comparte, no se copia: una variable puesta dentro de una rama
    /// tiene que verse despues, que es lo que espera quien configura el boton.
    fn correr_anidado(&mut self, acciones: &[ButtonAction]) -> Outcome {
        self.profundidad += 1;
        let error = self.correr(acciones);
        self.profundidad -= 1;

        match error {
            Some(e) => Outcome::Failed(e),
            None => Outcome::Ok,
        }
    }
}

/// Traduce la posicion guardada en la configuracion a la del modulo de ventanas.
///
/// Son dos enums distintos con los mismos nombres a proposito: el modelo de
/// configuracion no debe depender de la capa que habla con Win32. El `match`
/// exhaustivo hace que agregar una posicion nueva a uno de los dos no compile
/// hasta atenderla aqui.
fn a_snap(p: CfgSnap) -> crate::launcher::SnapPosition {
    use crate::launcher::SnapPosition as L;
    match p {
        CfgSnap::LeftHalf => L::LeftHalf,
        CfgSnap::RightHalf => L::RightHalf,
        CfgSnap::TopHalf => L::TopHalf,
        CfgSnap::BottomHalf => L::BottomHalf,
        CfgSnap::TopLeft => L::TopLeft,
        CfgSnap::TopRight => L::TopRight,
        CfgSnap::BottomLeft => L::BottomLeft,
        CfgSnap::BottomRight => L::BottomRight,
        CfgSnap::Maximize => L::Maximize,
        CfgSnap::Center => L::Center,
        CfgSnap::Restore => L::Restore,
    }
}

/// Un efecto con nombre, independiente del fabricante.
struct PresetRgb {
    id: &'static str,
    /// Color principal. `None` en los efectos que eligen sus propios colores.
    color: Option<&'static str>,
    /// Nombres de modo a probar, en orden de preferencia.
    modos: &'static [&'static str],
}

/// Los presets que ya traía la versión Electron, con los mismos identificadores.
///
/// **Los ids no se cambian**: están guardados en la configuración de quien ya los
/// use, y renombrar uno deja su botón sin hacer nada.
const PRESETS_RGB: &[PresetRgb] = &[
    PresetRgb {
        id: "off",
        color: Some("#000000"),
        modos: &["off", "black", "static", "direct", "custom"],
    },
    PresetRgb {
        id: "gaming",
        color: Some("#ff1800"),
        modos: &["breathing", "breath", "pulse", "blink", "static"],
    },
    PresetRgb {
        id: "cinema",
        color: Some("#200400"),
        modos: &["static", "direct", "custom", "breathing"],
    },
    PresetRgb {
        id: "work",
        color: Some("#ffffff"),
        modos: &["static", "direct", "custom"],
    },
    PresetRgb {
        id: "rainbow",
        color: None,
        modos: &[
            "spectrum cycle",
            "rainbow wave",
            "rainbow",
            "spectrum",
            "cycle",
        ],
    },
    PresetRgb {
        id: "night-blue",
        color: Some("#000880"),
        modos: &["breathing", "breath", "pulse", "static"],
    },
    PresetRgb {
        id: "alert-red",
        color: Some("#ff0000"),
        modos: &["flicker", "flash", "blink", "breathing", "static"],
    },
];

/// Los identificadores de preset que el motor reconoce.
///
/// La interfaz los necesita para armar su lista sin volver a escribirlos.
pub fn presets_rgb() -> Vec<&'static str> {
    PRESETS_RGB.iter().map(|p| p.id).collect()
}

/// Abre una conexión con OpenRGB, con un error que se entienda si no está.
fn conectar_openrgb() -> Result<crate::rgb::OpenRgb, String> {
    // El mensaje dice que hace falta OpenRGB: sin eso, un boton que no hace nada
    // no da ninguna pista de por que.
    crate::rgb::OpenRgb::conectar("127.0.0.1", crate::rgb::openrgb::PUERTO)
        .map_err(|e| e.to_string())
}

/// Interpreta un color `#RRGGBB` o `RRGGBB`.
fn parsear_color(s: &str) -> Option<(u8, u8, u8)> {
    let h = s.trim().trim_start_matches('#');
    if h.len() != 6 {
        return None;
    }
    let leer = |i: usize| u8::from_str_radix(&h[i..i + 2], 16).ok();
    Some((leer(0)?, leer(2)?, leer(4)?))
}

fn envolver<E: std::fmt::Display>(r: Result<(), E>) -> Outcome {
    match r {
        Ok(()) => Outcome::Ok,
        Err(e) => Outcome::Failed(e.to_string()),
    }
}

/// Parte una linea de argumentos respetando las comillas dobles.
///
/// `--ruta "C:\Program Files\x" --flag` son tres argumentos, no cuatro: partir
/// por espacios a secas romperia cualquier ruta con espacios, que en Windows es
/// la mayoria.
fn partir_argumentos(linea: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut actual = String::new();
    let mut entre_comillas = false;

    for c in linea.chars() {
        match c {
            '"' => entre_comillas = !entre_comillas,
            c if c.is_whitespace() && !entre_comillas => {
                if !actual.is_empty() {
                    args.push(std::mem::take(&mut actual));
                }
            }
            c => actual.push(c),
        }
    }
    if !actual.is_empty() {
        args.push(actual);
    }
    args
}

/// Interpreta las cabeceras de un webhook.
///
/// Se aceptan dos formatos porque en la interfaz es un campo de texto libre y la
/// gente escribe los dos: un objeto JSON (`{"X-Token": "abc"}`) o una linea por
/// cabecera (`X-Token: abc`).
fn parsear_cabeceras(texto: &str) -> Vec<(String, String)> {
    let texto = texto.trim();
    if texto.is_empty() {
        return Vec::new();
    }

    if let Ok(serde_json::Value::Object(mapa)) = serde_json::from_str(texto) {
        return mapa
            .into_iter()
            .map(|(k, v)| {
                // Un valor no textual (numero, booleano) se serializa tal cual en
                // vez de descartarse: `{"X-Reintentos": 3}` es una cabecera valida.
                let valor = match v {
                    serde_json::Value::String(s) => s,
                    otro => otro.to_string(),
                };
                (k, valor)
            })
            .collect();
    }

    texto
        .lines()
        .filter_map(|l| {
            let (n, v) = l.split_once(':')?;
            let n = n.trim();
            (!n.is_empty()).then(|| (n.to_string(), v.trim().to_string()))
        })
        .collect()
}

/// Acciones que salen del proceso y **ningún test puede ejecutar**.
///
/// Cada una hace algo visible en el equipo de quien compila: suena, escribe,
/// abre una ventana, cambia el volumen o las luces. Ver la regla en
/// `docs/MIGRACION-RUST.md`: un `cargo test` no puede dejar la máquina distinta
/// de como la encontró.
///
/// La lista vive fuera del módulo de tests a propósito: el auditor de más abajo
/// busca estos nombres **dentro** de los tests, y tenerla aquí evita que se
/// encuentre a sí misma.
#[cfg(test)]
const ACCIONES_CON_EFECTOS: &[&str] = &[
    "App",
    "AudioDevice",
    "Brightness",
    "Clipboard",
    "Hotkey",
    "KillProcess",
    "Macro",
    "MediaNext",
    "MediaPlayPause",
    "MediaPrev",
    "Mute",
    "Notify",
    "RegionCapture",
    "RgbColor",
    "RgbMode",
    "RgbPreset",
    "RgbProfile",
    "Script",
    "Shortcut",
    "Tts",
    "TypeText",
    "VolumeSet",
    "Web",
    "Webhook",
    "WindowSnap",
];

#[cfg(test)]
mod tests {
    use super::*;

    /// Ningún test de este archivo puede nombrar una acción con efectos fuera
    /// del proceso.
    ///
    /// Existe porque ya pasó tres veces —el brillo al máximo, el portapapeles
    /// borrado, el sistema silenciado— y una cuarta: un test usaba `Notify` como
    /// ejemplo "inofensivo" y, en cuanto `Notify` se implementó de verdad,
    /// empezó a lanzar notificaciones en cada compilación.
    ///
    /// El patrón siempre es el mismo: la acción era inocua **cuando se escribió
    /// el test**. Por eso el auditor mira el código y no la intención.
    ///
    /// Si hace falta probar una de estas de verdad, va en su propio test
    /// `#[ignore]` que guarde el estado y lo restaure.
    #[test]
    fn ningun_test_ejecuta_acciones_con_efectos() {
        let fuente = include_str!("mod.rs");
        let inicio = fuente
            .find("mod tests {")
            .expect("este archivo tiene un modulo de tests");
        let region = &fuente[inicio..];

        let culpables: Vec<&str> = ACCIONES_CON_EFECTOS
            .iter()
            .copied()
            .filter(|nombre| region.contains(&format!("ActionType::{nombre}")))
            .collect();

        assert!(
            culpables.is_empty(),
            "estos tests ejecutarian acciones con efectos en el equipo: {}. \
             Usa un tipo inocuo (SetVar, IncrVar, Branch) o marca el test #[ignore] \
             guardando y restaurando el estado.",
            culpables.join(", ")
        );
    }

    /// Comprueba que el auditor de arriba sirve para algo.
    ///
    /// Un auditor que nunca ha visto un caso malo no prueba nada: el de las
    /// traducciones estuvo en verde meses con dos puntos ciegos.
    #[test]
    fn el_auditor_de_efectos_reconoce_un_caso_malo() {
        // Los ejemplos se arman en tiempo de ejecucion: escritos como literales,
        // el auditor de arriba se encontraria a si mismo y fallaria siempre.
        let como_si =
            |tipo: &str| format!("mod tests {{ let a = accion(Action{}::{tipo}); }}", "Type");

        let malo = como_si("Tts");
        let pillados: Vec<&str> = ACCIONES_CON_EFECTOS
            .iter()
            .copied()
            .filter(|n| malo.contains(&format!("ActionType::{n}")))
            .collect();
        assert_eq!(pillados, vec!["Tts"]);

        // Y que no se dispara con lo inocuo.
        let bueno = como_si("SetVar");
        assert!(!ACCIONES_CON_EFECTOS
            .iter()
            .any(|n| bueno.contains(&format!("ActionType::{n}"))));
    }

    fn accion(t: ActionType) -> ButtonAction {
        ButtonAction {
            action_type: t,
            ..ButtonAction::default()
        }
    }

    #[test]
    fn set_var_y_incr_var_mutan_el_estado() {
        let mut a = accion(ActionType::SetVar);
        a.var_name = Some("contador".into());
        a.var_value = Some("5".into());

        let mut b = accion(ActionType::IncrVar);
        b.var_name = Some("contador".into());
        b.var_delta = Some(3);

        let r = run_sequence(&[a, b], &State::new());
        assert!(r.ok, "error: {:?}", r.error);
        assert_eq!(r.state.get("contador").unwrap(), "8");
    }

    #[test]
    fn incrementar_una_variable_que_no_existe_parte_de_cero() {
        // Un contador nuevo tiene que funcionar sin que el usuario lo inicialice.
        let mut a = accion(ActionType::IncrVar);
        a.var_name = Some("nueva".into());
        a.var_delta = Some(1);

        let r = run_one(&a, &State::new());
        assert_eq!(r.state.get("nueva").unwrap(), "1");
    }

    #[test]
    fn set_var_interpola_su_valor() {
        let estado = State::from([("quien".to_string(), "mundo".to_string())]);
        let mut a = accion(ActionType::SetVar);
        a.var_name = Some("saludo".into());
        a.var_value = Some("hola {quien}".into());

        let r = run_one(&a, &estado);
        assert_eq!(r.state.get("saludo").unwrap(), "hola mundo");
    }

    #[test]
    fn branch_elige_la_rama_correcta_y_su_efecto_persiste() {
        let mut poner = accion(ActionType::SetVar);
        poner.var_name = Some("resultado".into());
        poner.var_value = Some("rama-si".into());

        let mut otro = accion(ActionType::SetVar);
        otro.var_name = Some("resultado".into());
        otro.var_value = Some("rama-no".into());

        let mut br = accion(ActionType::Branch);
        br.branch_var = Some("n".into());
        br.branch_op = Some(BranchOp::Gt);
        br.branch_value = Some("10".into());
        br.branch_then = Some(vec![poner]);
        br.branch_else = Some(vec![otro]);

        let alto = State::from([("n".to_string(), "50".to_string())]);
        assert_eq!(
            run_one(&br, &alto).state.get("resultado").unwrap(),
            "rama-si"
        );

        let bajo = State::from([("n".to_string(), "1".to_string())]);
        assert_eq!(
            run_one(&br, &bajo).state.get("resultado").unwrap(),
            "rama-no"
        );
    }

    #[test]
    fn una_rama_vacia_no_es_un_error() {
        let mut br = accion(ActionType::Branch);
        br.branch_var = Some("x".into());
        br.branch_op = Some(BranchOp::Eq);
        br.branch_value = Some("y".into());

        let r = run_one(&br, &State::new());
        assert!(r.ok, "una rama sin acciones es un no-op legitimo");
    }

    #[test]
    fn el_anidamiento_ciclico_se_corta_en_vez_de_desbordar_la_pila() {
        // Una rama que se contiene a si misma. Sin tope de profundidad esto
        // tumbaria el proceso entero por desbordamiento de pila.
        let mut hoja = accion(ActionType::Branch);
        hoja.branch_var = Some("x".into());
        hoja.branch_op = Some(BranchOp::Empty);

        let mut actual = hoja.clone();
        for _ in 0..30 {
            let mut padre = hoja.clone();
            padre.branch_then = Some(vec![actual]);
            actual = padre;
        }

        let r = run_one(&actual, &State::new());
        assert!(!r.ok);
        assert!(
            r.error.as_deref().unwrap_or_default().contains("profundo"),
            "deberia explicar que corto por profundidad: {:?}",
            r.error
        );
    }

    /// Ojo al elegir la accion de este test.
    ///
    /// Antes usaba `Notify` como ejemplo inofensivo. Cuando `Notify` paso a estar
    /// implementada de verdad, el test se puso a **mostrar notificaciones en el
    /// equipo de quien compila**. Aqui solo valen tipos que la interfaz atiende y
    /// el nucleo no ejecuta: hoy, `Folder`. Si algun dia se queda sin candidatos,
    /// hay que replantear el test, no buscarle otra accion con efectos.
    #[test]
    fn las_acciones_de_interfaz_no_fallan_ni_cortan_la_secuencia() {
        let mut despues = accion(ActionType::SetVar);
        despues.var_name = Some("llegue".into());
        despues.var_value = Some("si".into());
        despues.only_if_prev_ok = Some(true);

        let r = run_sequence(&[accion(ActionType::Folder), despues], &State::new());

        assert!(r.ok, "una accion de interfaz no es un fallo");
        assert_eq!(r.for_ui, vec!["abrir carpeta de botones"]);
        assert_eq!(
            r.state.get("llegue").map(String::as_str),
            Some("si"),
            "el paso siguiente tenia que ejecutarse igual"
        );
    }

    #[test]
    fn only_if_prev_ok_salta_el_paso_tras_un_fallo() {
        // Un tipo desconocido siempre falla y **nunca** hace nada, pase lo que
        // pase con el motor. Una accion real sin configurar tambien fallaria
        // hoy, pero solo mientras nadie le ponga un valor por defecto.
        let roto = accion(ActionType::Other("inexistente".into()));

        let mut condicional = accion(ActionType::SetVar);
        condicional.var_name = Some("no_deberia".into());
        condicional.var_value = Some("x".into());
        condicional.only_if_prev_ok = Some(true);

        let mut incondicional = accion(ActionType::SetVar);
        incondicional.var_name = Some("si_deberia".into());
        incondicional.var_value = Some("x".into());

        let r = run_sequence(&[roto, condicional, incondicional], &State::new());
        assert!(!r.ok);
        assert!(!r.state.contains_key("no_deberia"));
        assert!(
            r.state.contains_key("si_deberia"),
            "un paso sin only_if_prev_ok tiene que ejecutarse igual"
        );
    }

    #[test]
    fn se_reporta_el_primer_error_no_el_ultimo() {
        // El primero es el que explica por que empezo a ir mal.
        let primero = accion(ActionType::Other("el-primero".into()));
        let segundo = accion(ActionType::Other("el-segundo".into()));

        let r = run_sequence(&[primero, segundo], &State::new());
        let error = r.error.expect("los dos fallan");
        assert!(error.contains("el-primero"), "{error}");
        assert!(!error.contains("el-segundo"), "{error}");
    }

    #[test]
    fn repeat_ejecuta_la_accion_varias_veces() {
        let mut a = accion(ActionType::IncrVar);
        a.var_name = Some("n".into());
        a.var_delta = Some(1);
        a.repeat = Some(4);
        a.delay_ms = Some(0);

        let r = run_one(&a, &State::new());
        assert_eq!(r.state.get("n").unwrap(), "4");
    }

    #[test]
    fn un_tipo_desconocido_falla_con_un_mensaje_util() {
        // Viene de una config creada por una version mas nueva. El round-trip lo
        // conserva; el motor tiene que decir que no sabe ejecutarlo.
        let r = run_one(
            &accion(ActionType::Other("teletransporte".into())),
            &State::new(),
        );
        assert!(!r.ok);
        assert!(r.error.unwrap().contains("teletransporte"));
    }

    #[test]
    fn lee_colores_rgb() {
        assert_eq!(parsear_color("#FF8000"), Some((255, 128, 0)));
        assert_eq!(parsear_color("ff8000"), Some((255, 128, 0)));
        assert_eq!(parsear_color("  #000000 "), Some((0, 0, 0)));
    }

    #[test]
    fn rechaza_lo_que_no_es_un_color() {
        // Un color mal escrito tiene que decirlo, no pintar algo aleatorio.
        assert_eq!(parsear_color("#FFF"), None);
        assert_eq!(parsear_color("rojo"), None);
        assert_eq!(parsear_color(""), None);
        assert_eq!(parsear_color("#GGGGGG"), None);
    }

    #[test]
    fn parte_argumentos_respetando_comillas() {
        assert_eq!(partir_argumentos("uno dos"), vec!["uno", "dos"]);
        assert_eq!(
            partir_argumentos(r#"--ruta "C:\Program Files\x" --flag"#),
            vec![r"--ruta", r"C:\Program Files\x", "--flag"]
        );
        assert!(partir_argumentos("   ").is_empty());
        assert!(partir_argumentos("").is_empty());
    }

    #[test]
    fn lee_cabeceras_en_json_y_en_lineas() {
        let json = parsear_cabeceras(r#"{"X-Token": "abc", "X-N": 3}"#);
        assert!(json.contains(&("X-Token".to_string(), "abc".to_string())));
        assert!(
            json.contains(&("X-N".to_string(), "3".to_string())),
            "un valor numerico es una cabecera valida, no algo que descartar"
        );

        let lineas = parsear_cabeceras("X-Token: abc\nContent-Type: application/json");
        assert_eq!(lineas.len(), 2);
        assert_eq!(lineas[0], ("X-Token".to_string(), "abc".to_string()));

        assert!(parsear_cabeceras("").is_empty());
        assert!(parsear_cabeceras("   ").is_empty());
    }

    #[test]
    fn una_cabecera_con_dos_puntos_en_el_valor_no_se_parte_mal() {
        // Una URL en el valor tiene dos puntos. Partir por el ultimo, o por
        // todos, la destrozaria.
        let h = parsear_cabeceras("Referer: https://ejemplo.com:8443/x");
        assert_eq!(h[0].1, "https://ejemplo.com:8443/x");
    }
}
