//! Cadena de migraciones del schema de configuracion.
//!
//! Portado de `src/utils/configMigration.ts`. Las migraciones operan sobre el
//! JSON **crudo** (`serde_json::Value`), no sobre [`DeckConfig`], porque una
//! config vieja puede no encajar en el modelo actual: primero se lleva al
//! schema corriente y recien despues se deserializa.
//!
//! Regla: cada cambio de forma de `DeckConfig` incrementa
//! [`CURRENT_CONFIG_VERSION`] y agrega un paso a la cadena.

use serde_json::{json, Value};

/// Version de schema que entiende este binario.
pub const CURRENT_CONFIG_VERSION: u32 = 4;

/// Un paso de migracion: lleva una config de la version `from` a la `to`.
struct Migration {
    from: u32,
    to: u32,
    apply: fn(&mut Value),
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        from: 1,
        to: 2,
        // v1 -> v2: se formaliza `configVersion`. Sin cambio estructural.
        apply: |_c| {},
    },
    Migration {
        from: 2,
        to: 3,
        // v2 -> v3: campos opcionales nuevos (widget, visibleIf, timerTriggerAt,
        // gridRows, uiScale, theme). Sin cambio estructural.
        apply: |_c| {},
    },
    Migration {
        from: 3,
        to: 4,
        // v3 -> v4: i18n + onboarding.
        //
        // `onboardingCompleted: true` es deliberado: un usuario que ya venia
        // usando VirtualDeck NO debe ver el tutorial al actualizar. Solo una
        // instalacion nueva (config inexistente) lo dispara.
        apply: |c| {
            let Some(obj) = c.as_object_mut() else { return };
            obj.entry("language").or_insert_with(|| json!("system"));
            obj.entry("onboardingCompleted")
                .or_insert_with(|| json!(true));
        },
    },
];

/// Lleva una config cruda a [`CURRENT_CONFIG_VERSION`], aplicando en orden los
/// pasos necesarios.
///
/// Tolerante por diseño: si el valor no es un objeto, o si falta un paso en la
/// cadena, devuelve lo que pudo migrar en vez de fallar — perder la config del
/// usuario es peor que quedarse en una version intermedia.
pub fn migrate(mut raw: Value) -> Value {
    if !raw.is_object() {
        return raw;
    }

    let mut version = raw
        .get("configVersion")
        .and_then(Value::as_u64)
        .map(|v| v as u32)
        .unwrap_or(1);

    while version < CURRENT_CONFIG_VERSION {
        let Some(step) = MIGRATIONS.iter().find(|m| m.from == version) else {
            // Hueco en la cadena: cortar en vez de romper.
            break;
        };
        (step.apply)(&mut raw);
        version = step.to;
    }

    if let Some(obj) = raw.as_object_mut() {
        obj.insert("configVersion".into(), json!(version));
    }
    raw
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_v(version: u32) -> Value {
        json!({
            "pages": [{ "id": "main", "name": "Main" }],
            "buttons": [],
            "accent": "#4a8ef0",
            "wallpaper": "solid",
            "configVersion": version,
        })
    }

    #[test]
    fn migra_de_v1_a_la_version_actual() {
        let out = migrate(config_v(1));
        assert_eq!(out["configVersion"], json!(CURRENT_CONFIG_VERSION));
    }

    #[test]
    fn una_config_sin_version_se_asume_v1() {
        let mut c = config_v(1);
        c.as_object_mut().unwrap().remove("configVersion");
        let out = migrate(c);
        assert_eq!(out["configVersion"], json!(CURRENT_CONFIG_VERSION));
    }

    #[test]
    fn v3_a_v4_marca_el_onboarding_como_completado() {
        // Un usuario existente no debe ver el tutorial al actualizar.
        let out = migrate(config_v(3));
        assert_eq!(out["onboardingCompleted"], json!(true));
        assert_eq!(out["language"], json!("system"));
    }

    #[test]
    fn la_migracion_no_pisa_valores_ya_elegidos_por_el_usuario() {
        let mut c = config_v(3);
        c.as_object_mut()
            .unwrap()
            .insert("language".into(), json!("en"));
        c.as_object_mut()
            .unwrap()
            .insert("onboardingCompleted".into(), json!(false));

        let out = migrate(c);
        assert_eq!(out["language"], json!("en"));
        assert_eq!(out["onboardingCompleted"], json!(false));
    }

    #[test]
    fn una_config_ya_actual_no_se_toca() {
        let input = config_v(CURRENT_CONFIG_VERSION);
        assert_eq!(migrate(input.clone()), input);
    }

    #[test]
    fn un_valor_que_no_es_objeto_pasa_sin_romper() {
        assert_eq!(migrate(json!("basura")), json!("basura"));
        assert_eq!(migrate(json!(null)), json!(null));
    }
}
