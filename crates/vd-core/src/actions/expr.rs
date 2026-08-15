//! Parte pura del motor: sustitucion de variables y evaluacion de condiciones.
//!
//! Esta separada del resto porque no toca el sistema: se puede probar a fondo sin
//! abrir aplicaciones ni cambiar el volumen. Son tambien las dos piezas mas
//! faciles de romper en silencio —un cambio sutil aqui no falla, simplemente hace
//! algo distinto— asi que concentran la mayoria de los tests del modulo.

use std::collections::BTreeMap;

use crate::config::model::BranchOp;

/// Estado global de variables del deck.
///
/// Es un `BTreeMap` y no un `HashMap` para que el orden al serializar sea
/// estable: si no, guardar la configuracion sin cambiar nada produciria un
/// archivo distinto cada vez y ensuciaria los backups.
pub type State = BTreeMap<String, String>;

/// Sustituye `{nombre}` por el valor de la variable.
///
/// Una variable que no existe se reemplaza por cadena vacia, igual que en la
/// version Electron. Dejar el `{nombre}` literal seria peor: acabaria pegado en
/// una URL o escrito como texto en la ventana del usuario.
///
/// Solo se reconocen nombres de palabra (`\w+`). Cualquier otra llave se deja
/// intacta, para que un texto con JSON o CSS no se destroce al pasar por aqui.
pub fn interpolate(template: &str, state: &State) -> String {
    // Sin llaves no hay nada que hacer; es el caso mayoritario y evita recorrer
    // caracter a caracter cadenas largas como el cuerpo de un webhook.
    if !template.contains('{') {
        return template.to_string();
    }

    let mut salida = String::with_capacity(template.len());
    let mut resto = template;

    while let Some(inicio) = resto.find('{') {
        salida.push_str(&resto[..inicio]);
        let tras_llave = &resto[inicio + 1..];

        match tras_llave.find('}') {
            Some(fin) => {
                let nombre = &tras_llave[..fin];
                if !nombre.is_empty() && nombre.chars().all(|c| c.is_alphanumeric() || c == '_') {
                    salida.push_str(state.get(nombre).map_or("", String::as_str));
                    resto = &tras_llave[fin + 1..];
                } else {
                    // No es un nombre de variable. Se copia solo la llave y se
                    // sigue justo despues, **sin** saltar hasta el `}`: en
                    // `{"saludo": "{nombre}"}` la primera llave es la del JSON y
                    // saltar hasta el primer cierre se tragaria la variable de
                    // dentro, que si hay que sustituir.
                    salida.push('{');
                    resto = tras_llave;
                }
            }
            // Llave sin cerrar: se copia el resto y se termina.
            None => {
                salida.push('{');
                salida.push_str(tras_llave);
                return salida;
            }
        }
    }

    salida.push_str(resto);
    salida
}

/// Evalua la condicion de una accion `branch`.
///
/// Las comparaciones numericas sobre texto no convertible dan `false` en vez de
/// error: una variable vacia comparada con `> 5` simplemente no se cumple, que es
/// lo que espera quien configura el boton.
pub fn eval_branch(valor: &str, op: BranchOp, comparar: &str) -> bool {
    let numeros = || -> Option<(f64, f64)> {
        Some((valor.trim().parse().ok()?, comparar.trim().parse().ok()?))
    };

    match op {
        BranchOp::Eq => valor == comparar,
        BranchOp::Ne => valor != comparar,
        BranchOp::Gt => numeros().is_some_and(|(a, b)| a > b),
        BranchOp::Lt => numeros().is_some_and(|(a, b)| a < b),
        BranchOp::Ge => numeros().is_some_and(|(a, b)| a >= b),
        BranchOp::Le => numeros().is_some_and(|(a, b)| a <= b),
        // Insensible a mayusculas, igual que la version Electron: quien escribe
        // "contiene error" no espera que falle por una mayuscula.
        BranchOp::Contains => valor.to_lowercase().contains(&comparar.to_lowercase()),
        BranchOp::Empty => valor.trim().is_empty(),
        BranchOp::NotEmpty => !valor.trim().is_empty(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn estado() -> State {
        State::from([
            ("nombre".to_string(), "mundo".to_string()),
            ("n".to_string(), "42".to_string()),
            ("vacia".to_string(), String::new()),
        ])
    }

    #[test]
    fn sustituye_variables() {
        assert_eq!(interpolate("hola {nombre}", &estado()), "hola mundo");
        assert_eq!(interpolate("{n}+{n}", &estado()), "42+42");
    }

    #[test]
    fn una_variable_inexistente_desaparece() {
        // Dejar "{falta}" literal acabaria pegado en una URL o escrito en la
        // ventana del usuario, que es peor que no poner nada.
        assert_eq!(interpolate("a{falta}b", &estado()), "ab");
    }

    #[test]
    fn respeta_las_llaves_que_no_son_variables() {
        // Un cuerpo de webhook en JSON pasa por aqui. Si se comieran estas
        // llaves, el webhook enviaria basura.
        let json = r#"{"clave": "valor"}"#;
        assert_eq!(interpolate(json, &estado()), json);
        assert_eq!(interpolate("{ espacio }", &estado()), "{ espacio }");
        assert_eq!(interpolate("{}", &estado()), "{}");
    }

    #[test]
    fn interpola_dentro_de_un_json() {
        // El caso realista: JSON con una variable dentro. Tiene que sustituir la
        // variable y dejar la estructura en pie.
        let r = interpolate(r#"{"saludo": "{nombre}"}"#, &estado());
        assert_eq!(r, r#"{"saludo": "mundo"}"#);
    }

    #[test]
    fn una_llave_sin_cerrar_no_pierde_texto() {
        assert_eq!(
            interpolate("inicio {sin cerrar", &estado()),
            "inicio {sin cerrar"
        );
    }

    #[test]
    fn sin_llaves_devuelve_lo_mismo() {
        assert_eq!(interpolate("texto simple", &estado()), "texto simple");
        assert_eq!(interpolate("", &estado()), "");
    }

    #[test]
    fn acepta_acentos_en_los_valores() {
        let s = State::from([("ciudad".to_string(), "Tegucigalpa, ñ".to_string())]);
        assert_eq!(interpolate("En {ciudad}", &s), "En Tegucigalpa, ñ");
    }

    #[test]
    fn compara_texto() {
        assert!(eval_branch("a", BranchOp::Eq, "a"));
        assert!(!eval_branch("a", BranchOp::Eq, "b"));
        assert!(eval_branch("a", BranchOp::Ne, "b"));
    }

    #[test]
    fn compara_numeros() {
        assert!(eval_branch("10", BranchOp::Gt, "5"));
        assert!(!eval_branch("5", BranchOp::Gt, "10"));
        assert!(eval_branch("5", BranchOp::Ge, "5"));
        assert!(eval_branch("4.5", BranchOp::Lt, "4.6"));
        // Como texto, "10" < "5". Si la comparacion numerica se degradara a
        // comparacion de cadenas, este caso lo delataria.
        assert!(eval_branch("10", BranchOp::Gt, "9"));
    }

    #[test]
    fn una_comparacion_numerica_sobre_texto_no_se_cumple() {
        // Sin numeros que comparar, la condicion es falsa: no es un error.
        assert!(!eval_branch("hola", BranchOp::Gt, "5"));
        assert!(!eval_branch("", BranchOp::Gt, "5"));
        assert!(!eval_branch("5", BranchOp::Lt, "hola"));
    }

    #[test]
    fn contains_ignora_mayusculas() {
        assert!(eval_branch(
            "Hay un ERROR grave",
            BranchOp::Contains,
            "error"
        ));
        assert!(!eval_branch("todo bien", BranchOp::Contains, "error"));
    }

    #[test]
    fn empty_mira_solo_espacios() {
        assert!(eval_branch("", BranchOp::Empty, ""));
        assert!(eval_branch("   ", BranchOp::Empty, ""));
        assert!(!eval_branch("x", BranchOp::Empty, ""));
        assert!(eval_branch("x", BranchOp::NotEmpty, ""));
        assert!(!eval_branch("  ", BranchOp::NotEmpty, ""));
    }
}
