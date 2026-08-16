//! Valida grabacion y reproduccion de macros contra el sistema real.
//!
//! El truco: se arranca el grabador, se **inyecta** una tecla con `SendInput`, y
//! se comprueba que el hook global la capturo. Eso ejercita los dos caminos a la
//! vez sin necesidad de que haya un humano tecleando.
//!
//! Se usan las teclas **F13-F24**: existen en el teclado extendido, Windows las
//! entiende, y practicamente ninguna aplicacion las escucha. Asi el test no
//! interfiere con lo que el usuario tenga abierto.
//!
//! Requiere una sesion de escritorio interactiva (los hooks de bajo nivel no
//! funcionan en un servicio sin escritorio), por eso se salta con elegancia si
//! no puede instalar el hook.

#![cfg(windows)]

use std::time::Duration;

use vd_core::config::model::{MacroStep, MacroStepType};
use vd_core::macros;

fn paso_tecla(valor: &str) -> MacroStep {
    MacroStep {
        step_type: MacroStepType::Key,
        value: Some(valor.to_string()),
        x: None,
        y: None,
        button: None,
        scroll_y: None,
        delay_ms: None,
    }
}

#[test]
fn una_tecla_inyectada_se_graba_y_se_reproduce() {
    // 1) Empezar a grabar.
    if let Err(e) = macros::start_recording() {
        eprintln!("omitido: no se pudo instalar el hook ({e})");
        return;
    }
    assert!(macros::is_recording(), "deberia estar grabando");

    // Darle un instante al hilo del hook para asentarse.
    std::thread::sleep(Duration::from_millis(150));

    // 2) Inyectar una tecla inofensiva. Esto ejercita el camino de
    //    reproduccion (SendInput) y, de paso, genera el evento que el hook
    //    tiene que capturar.
    let enviado = macros::play(&[paso_tecla("{F13}")], 1);
    assert!(enviado.is_ok(), "SendInput fallo: {enviado:?}");

    std::thread::sleep(Duration::from_millis(250));

    // 3) Detener y revisar lo capturado.
    let pasos = macros::stop_recording().expect("stop_recording");
    assert!(!macros::is_recording(), "no deberia seguir grabando");

    let capturo_f13 = pasos.iter().any(|p| {
        p.step_type == MacroStepType::Key
            && p.value
                .as_deref()
                .map(|v| v.contains("F13"))
                .unwrap_or(false)
    });

    assert!(
        capturo_f13,
        "el grabador no capturo la tecla inyectada. Pasos: {:?}",
        pasos.iter().map(|p| &p.value).collect::<Vec<_>>()
    );
}

#[test]
fn no_se_pueden_solapar_dos_grabaciones() {
    if macros::start_recording().is_err() {
        eprintln!("omitido: no se pudo instalar el hook");
        return;
    }

    // La segunda tiene que rechazarse: si no, los pasos de dos grabaciones se
    // mezclarian en el mismo buffer.
    let segunda = macros::start_recording();
    assert!(segunda.is_err(), "la segunda grabacion deberia fallar");

    let _ = macros::stop_recording();
}

#[test]
fn los_pasos_grabados_se_pueden_reproducir() {
    // Contrato entre grabar y reproducir: todo lo que emite el grabador tiene
    // que poder volver a parsearse. Si no, una macro grabada no se reproduce.
    use vd_core::macros::keys;

    for nombre in [
        "{ENTER}", "{TAB}", "{ESC}", "{F5}", "{F13}", "{UP}", "a", "z", "0", "9",
    ] {
        assert!(
            keys::parse_keystroke(nombre).is_some(),
            "el grabador puede emitir {nombre:?} pero el reproductor no lo entiende"
        );
    }
}
