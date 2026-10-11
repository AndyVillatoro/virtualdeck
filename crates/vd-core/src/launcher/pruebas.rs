//! Tests del lanzador. Viven aqui porque `mod.rs` es solo cableado.

use super::LauncherError;
use super::apps::{expand_env, launch_app, open_path, split_command};
use super::portapapeles::{clipboard, set_clipboard};
use super::scripts::{run_script_con_limite, Shell};
use super::volumen::master_volume;

#[test]
fn expande_variables_de_entorno() {
    std::env::set_var("VD_TEST_VAR", "valor");
    assert_eq!(expand_env("%VD_TEST_VAR%\\x"), "valor\\x");
    assert_eq!(expand_env("sin variables"), "sin variables");
    // Una variable inexistente se deja literal, como hace cmd.
    assert_eq!(expand_env("%NO_EXISTE_XYZ%"), "%NO_EXISTE_XYZ%");
    // Un '%' suelto no debe romper nada.
    assert_eq!(expand_env("100% seguro"), "100% seguro");
}

#[test]
fn separa_comando_y_argumentos() {
    let (exe, args) = split_command("notepad.exe");
    assert_eq!(exe, "notepad.exe");
    assert!(args.is_empty());

    let (exe, args) = split_command("Update.exe --processStart Discord.exe");
    assert_eq!(exe, "Update.exe");
    assert_eq!(args, vec!["--processStart", "Discord.exe"]);
}

#[test]
fn respeta_rutas_entre_comillas_con_espacios() {
    let (exe, args) = split_command("\"C:\\Program Files\\App\\app.exe\" --flag");
    assert_eq!(exe, "C:\\Program Files\\App\\app.exe");
    assert_eq!(args, vec!["--flag"]);
}

#[test]
fn una_ruta_vacia_es_un_error() {
    assert!(matches!(launch_app("   ", &[]), Err(LauncherError::Empty)));
    assert!(matches!(open_path(""), Err(LauncherError::Empty)));
}

#[test]
fn un_script_corto_devuelve_su_salida() {
    let out = run_script_con_limite(
        "Write-Output hola",
        Shell::PowerShell,
        std::time::Duration::from_secs(30),
    );
    match out {
        Ok(s) => assert_eq!(s, "hola"),
        Err(e) => panic!("un script trivial no deberia fallar: {e}"),
    }
}

#[test]
fn un_script_colgado_muere_al_vencer_el_plazo() {
    // 30 s de sueno con 2 s de plazo: tiene que rendirse mucho antes de
    // que el script termine solo, y el error tiene que decirlo.
    let t = std::time::Instant::now();
    let r = run_script_con_limite(
        "Start-Sleep -Seconds 30",
        Shell::PowerShell,
        std::time::Duration::from_secs(2),
    );
    assert!(
        matches!(r, Err(LauncherError::Timeout(2))),
        "se esperaba Timeout, salio {r:?}"
    );
    assert!(
        t.elapsed() < std::time::Duration::from_secs(20),
        "tardo {:?}: no se mato al hijo",
        t.elapsed()
    );
}

#[test]
fn el_volumen_se_puede_leer_en_esta_maquina() {
    // Test de humo del camino COM. No afirma un valor concreto.
    match master_volume() {
        Ok(v) => assert!((0..=100).contains(&v), "volumen fuera de rango: {v}"),
        Err(e) => panic!("no se pudo leer el volumen: {e}"),
    }
}

#[test]
fn el_portapapeles_conserva_los_acentos_de_ida_y_vuelta() {
    // Se guarda lo que hubiera y se devuelve al terminar: un test no puede
    // borrarle el portapapeles a quien compila el proyecto.
    let previo = clipboard();

    let prueba = "año — prueba ñÁÉ";
    assert!(set_clipboard(prueba).is_ok());
    // Leerlo de vuelta prueba el camino UTF-16 completo, no solo que la
    // llamada no falle.
    assert_eq!(clipboard().as_deref(), Some(prueba));

    if let Some(p) = previo {
        let _ = set_clipboard(&p);
    }
}
