//! Construccion de cuerpos de mensaje: LEDs, modos y ajustes.

use super::tipos::Modo;

/// Mete el color y el brillo pedidos en un modo, si el modo los admite.
pub(super) fn aplicar_ajustes(modo: &mut Modo, color: Option<(u8, u8, u8)>, brillo_pct: Option<u8>) {
    if let Some(c) = color {
        if modo.admite_color() {
            // Algunos modos exigen un mínimo de colores (un degradado necesita
            // dos). Se repite el mismo en todos: es lo que espera quien pide
            // "este efecto, en rojo".
            let cuantos = modo.colores_min.max(1).min(modo.colores_max) as usize;
            modo.colores = vec![c; cuantos];
        }
    }
    if let Some(pct) = brillo_pct {
        if modo.admite_brillo() {
            let rango = modo.brillo_max - modo.brillo_min;
            let pct = u32::from(pct.min(100));
            modo.brillo = modo.brillo_min + rango * pct / 100;
        }
    }
}

/// Cuerpo del comando de actualizar LEDs.
pub(super) fn cuerpo_leds(colores: &[(u8, u8, u8)]) -> Vec<u8> {
    // El bloque lleva su propio tamaño delante, además del de la cabecera.
    let total = 4 + 2 + colores.len() * 4;
    let mut datos = Vec::with_capacity(total);
    datos.extend_from_slice(&(total as u32).to_le_bytes());
    datos.extend_from_slice(&(colores.len() as u16).to_le_bytes());
    for (r, g, b) in colores {
        // OpenRGB espera cuatro bytes por color; el último no se usa.
        datos.extend_from_slice(&[*r, *g, *b, 0]);
    }
    datos
}

/// Cuerpo del comando de actualizar modo.
///
/// El orden de los campos es el de `GetModeDescriptionData` en OpenRGB y **tiene
/// que coincidir exactamente**: no hay nombres en el flujo, solo posiciones.
pub(super) fn cuerpo_modo(modo: &Modo, version: u32) -> Vec<u8> {
    let mut cuerpo = Vec::new();
    cuerpo.extend_from_slice(&modo.indice.to_le_bytes());

    let nombre = modo.nombre.as_bytes();
    cuerpo.extend_from_slice(&((nombre.len() + 1) as u16).to_le_bytes());
    cuerpo.extend_from_slice(nombre);
    cuerpo.push(0);

    cuerpo.extend_from_slice(&modo.valor.to_le_bytes());
    cuerpo.extend_from_slice(&modo.banderas.to_le_bytes());
    cuerpo.extend_from_slice(&modo.velocidad_min.to_le_bytes());
    cuerpo.extend_from_slice(&modo.velocidad_max.to_le_bytes());
    if version >= 3 {
        cuerpo.extend_from_slice(&modo.brillo_min.to_le_bytes());
        cuerpo.extend_from_slice(&modo.brillo_max.to_le_bytes());
    }
    cuerpo.extend_from_slice(&modo.colores_min.to_le_bytes());
    cuerpo.extend_from_slice(&modo.colores_max.to_le_bytes());
    cuerpo.extend_from_slice(&modo.velocidad.to_le_bytes());
    if version >= 3 {
        cuerpo.extend_from_slice(&modo.brillo.to_le_bytes());
    }
    cuerpo.extend_from_slice(&modo.direccion.to_le_bytes());
    cuerpo.extend_from_slice(&modo.modo_color.to_le_bytes());
    cuerpo.extend_from_slice(&(modo.colores.len() as u16).to_le_bytes());
    for (r, g, b) in &modo.colores {
        cuerpo.extend_from_slice(&[*r, *g, *b, 0]);
    }

    // El tamaño total va delante y se cuenta a sí mismo.
    let mut datos = Vec::with_capacity(4 + cuerpo.len());
    datos.extend_from_slice(&((cuerpo.len() + 4) as u32).to_le_bytes());
    datos.extend_from_slice(&cuerpo);
    datos
}
