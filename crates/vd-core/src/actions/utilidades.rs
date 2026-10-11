//! Ayudantes sin estado del motor: envolver resultados, partir argumentos,
//! cabeceras de webhook y traduccion de posiciones de ventana.

use crate::config::model::SnapPosition as CfgSnap;

use super::motor::Outcome;

/// Traduce la posicion guardada en la configuracion a la del modulo de ventanas.
///
/// Son dos enums distintos con los mismos nombres a proposito: el modelo de
/// configuracion no debe depender de la capa que habla con Win32. El `match`
/// exhaustivo hace que agregar una posicion nueva a uno de los dos no compile
/// hasta atenderla aqui.
pub(super) fn a_snap(p: CfgSnap) -> crate::launcher::SnapPosition {
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

pub(super) fn envolver<E: std::fmt::Display>(r: Result<(), E>) -> Outcome {
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
pub(super) fn partir_argumentos(linea: &str) -> Vec<String> {
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
pub(super) fn parsear_cabeceras(texto: &str) -> Vec<(String, String)> {
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
