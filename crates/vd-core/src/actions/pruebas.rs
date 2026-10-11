//! Tests del motor. Vive en archivo propio porque `mod.rs` ya supera el limite
//! con solo el cableado; el auditor de efectos sigue valiendo igual auditando
//! este archivo entero.

use super::rgb::parsear_color;
use super::utilidades::{partir_argumentos, parsear_cabeceras};
use super::{run_one, run_sequence, State};
use crate::config::model::{ActionType, BranchOp, ButtonAction};

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
    let fuente = include_str!("pruebas.rs");
    // Este archivo es entero el modulo de tests: se audita entero.
    let region = fuente;

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
