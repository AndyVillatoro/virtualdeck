//! Motor de ejecucion: convierte un `ButtonAction` en efectos reales.
//!
//! Es el modulo que orquesta a todos los demas, y por eso va el ultimo: audio,
//! media, launcher, macros, rgb y net ya estan verificados de forma
//! independiente. Aca solo se decide **que** llamar y **en que orden**.
//!
//! # Que queda fuera a proposito
//!
//! Algunas acciones no son ejecutables desde el nucleo porque su efecto *es* la
//! interfaz: abrir una carpeta de botones, mostrar una notificacion, capturar una
//! region de pantalla. El motor las reconoce y devuelve [`Outcome::ForUi`] en vez
//! de fingir que las ejecuto o de tratarlas como error. Cuando exista `vd-app`
//! (Fase 2), sera quien las atienda.
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
            T::Notify => Outcome::ForUi("mostrar notificacion"),
            T::RegionCapture => Outcome::ForUi("capturar region de pantalla"),
            T::Tts => Outcome::ForUi("texto a voz"),
            T::RgbColor | T::RgbMode | T::RgbProfile | T::RgbPreset => {
                // La escritura RGB no funciona todavia: falta analizar una
                // captura del protocolo USB de Aura. Ver docs/MIGRACION-RUST.md.
                // Decirlo es mejor que aparentar exito y dejar las luces igual.
                Outcome::ForUi("control RGB (escritura aun no soportada)")
            }

            T::Other(nombre) => Outcome::Failed(format!(
                "Tipo de accion desconocido: \"{nombre}\". Puede venir de una version mas nueva."
            )),
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

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn las_acciones_de_interfaz_no_fallan_ni_cortan_la_secuencia() {
        let mut despues = accion(ActionType::SetVar);
        despues.var_name = Some("llegue".into());
        despues.var_value = Some("si".into());
        despues.only_if_prev_ok = Some(true);

        let r = run_sequence(&[accion(ActionType::Notify), despues], &State::new());

        assert!(r.ok, "una accion de interfaz no es un fallo");
        assert_eq!(r.for_ui, vec!["mostrar notificacion"]);
        assert_eq!(
            r.state.get("llegue").map(String::as_str),
            Some("si"),
            "el paso siguiente tenia que ejecutarse igual"
        );
    }

    #[test]
    fn only_if_prev_ok_salta_el_paso_tras_un_fallo() {
        // Accion sin configurar: falla con un mensaje claro.
        let roto = accion(ActionType::App);

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
        let mut primero = accion(ActionType::App);
        primero.app_path = None;
        let mut segundo = accion(ActionType::Web);
        segundo.url = None;

        let r = run_sequence(&[primero, segundo], &State::new());
        assert!(r.error.unwrap().contains("aplicacion"));
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
