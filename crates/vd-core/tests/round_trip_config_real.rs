//! Test de fidelidad contra la configuracion **real** de la maquina.
//!
//! Es el contrato central de la migracion: un `deck-config.json` escrito por
//! VirtualDeck 0.5.x (Electron) tiene que poder cargarse en la version Rust y
//! volver a guardarse **sin perder ni un campo**.
//!
//! Compara valores JSON ya parseados (no texto), asi que el orden de las claves
//! y el formato no cuentan; solo el contenido.
//!
//! Si en esta maquina no hay una instalacion previa de VirtualDeck, el test se
//! salta en vez de fallar: no todos los entornos (ni CI) tienen una.

use std::path::Path;

use serde_json::Value;
use vd_core::config::{self, DeckConfig};

/// Recorre dos JSON en paralelo y reporta las rutas donde el resultado perdio
/// informacion respecto del original.
fn perdidas(original: &Value, resultado: &Value, ruta: &str, out: &mut Vec<String>) {
    match (original, resultado) {
        (Value::Object(a), Value::Object(b)) => {
            for (k, va) in a {
                let sub = if ruta.is_empty() {
                    k.clone()
                } else {
                    format!("{ruta}.{k}")
                };
                match b.get(k) {
                    Some(vb) => perdidas(va, vb, &sub, out),
                    None => out.push(format!("falta la clave: {sub}")),
                }
            }
        }
        (Value::Array(a), Value::Array(b)) => {
            if a.len() != b.len() {
                out.push(format!(
                    "longitud distinta en {ruta}: {} -> {}",
                    a.len(),
                    b.len()
                ));
                return;
            }
            for (i, (va, vb)) in a.iter().zip(b).enumerate() {
                perdidas(va, vb, &format!("{ruta}[{i}]"), out);
            }
        }
        (a, b) if a != b => {
            out.push(format!("valor distinto en {ruta}: {a} -> {b}"));
        }
        _ => {}
    }
}

#[test]
fn round_trip_conserva_la_config_real() {
    let Ok(path) = config::config_path() else {
        eprintln!("omitido: no se pudo resolver %APPDATA%");
        return;
    };
    if !path.exists() {
        eprintln!("omitido: no hay una instalacion previa de VirtualDeck");
        return;
    }

    let texto = std::fs::read_to_string(&path).expect("leer config real");
    let original: Value =
        serde_json::from_str(&texto).expect("la config real debe ser JSON valido");

    // Cargar con el modelo tipado (incluye la cadena de migraciones)...
    let cargada: DeckConfig = config::store::parse_and_migrate(&texto, Path::new("config real"))
        .expect(
            "la config real de 0.5.x debe cargar en el modelo de Rust. \
             Si esto falla, el modelo de vd-core no cubre algun campo.",
        );

    // ...y volver a serializarla.
    let resultado: Value = serde_json::to_value(&cargada).expect("serializar");

    // La migracion puede AGREGAR campos (p. ej. configVersion), pero nunca
    // puede perder ni cambiar los que ya estaban.
    let mut fallos = Vec::new();
    perdidas(&original, &resultado, "", &mut fallos);

    assert!(
        fallos.is_empty(),
        "el round-trip perdio informacion de la config real ({} problemas):\n  {}",
        fallos.len(),
        fallos.join("\n  ")
    );
}

#[test]
fn la_config_real_se_puede_reserializar_de_forma_estable() {
    let Ok(path) = config::config_path() else {
        return;
    };
    if !path.exists() {
        return;
    }

    let texto = std::fs::read_to_string(&path).expect("leer config real");
    let una = config::store::parse_and_migrate(&texto, Path::new("config real")).expect("cargar");
    let json_una = serde_json::to_string_pretty(&una).expect("serializar");

    // Cargar lo ya serializado tiene que dar exactamente lo mismo: sin esto,
    // guardar dos veces seguidas podria ir mutando el archivo.
    let dos =
        config::store::parse_and_migrate(&json_una, Path::new("ida y vuelta")).expect("recargar");

    assert_eq!(una, dos, "la serializacion no es estable entre pasadas");
}
