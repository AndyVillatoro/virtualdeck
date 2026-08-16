//! Widgets: lo que un botón muestra en vez de su etiqueta.
//!
//! Un botón con widget sigue siendo un botón —se puede pulsar y ejecuta su
//! acción— pero en lugar del texto fijo enseña algo vivo: la hora, el clima, un
//! sensor, la canción que suena o el valor de una variable.
//!
//! Los datos llegan ya leídos desde [`crate::datos`], que los sondea en un hilo
//! aparte. Aquí solo se dibujan: **este módulo no consulta nada**, porque se
//! ejecuta dentro del bucle de dibujo.

use egui::{Align2, Color32, FontId, Rect, Vec2};
use vd_core::config::model::{ButtonConfig, WidgetKind};

use crate::app::App;

/// Dibuja el widget de un botón. Devuelve `false` si no tiene ninguno, para que
/// la celda pinte su etiqueta normal.
pub fn dibujar(
    app: &App,
    boton: &ButtonConfig,
    pintor: &egui::Painter,
    rect: Rect,
    color: Color32,
    acento: Color32,
) -> bool {
    let Some(kind) = boton.widget else {
        return false;
    };

    let lado = rect.width();
    let cuerpo = (lado * 0.16).clamp(9.0, 16.0);

    match kind {
        WidgetKind::Clock => reloj(pintor, rect, color, cuerpo),
        WidgetKind::Weather => clima(app, pintor, rect, color, cuerpo),
        WidgetKind::NowPlaying => reproduciendo(app, pintor, rect, color, cuerpo),
        WidgetKind::Sensor => sensor(app, boton, pintor, rect, color, acento, cuerpo),
        WidgetKind::Variable => variable(app, boton, pintor, rect, color, cuerpo),
    }
    true
}

/// Dos líneas centradas: la principal grande y la secundaria atenuada.
fn dos_lineas(
    pintor: &egui::Painter,
    rect: Rect,
    color: Color32,
    cuerpo: f32,
    principal: &str,
    secundaria: &str,
) {
    pintor.text(
        rect.center() - Vec2::new(0.0, cuerpo * 0.5),
        Align2::CENTER_CENTER,
        principal,
        FontId::proportional(cuerpo * 1.5),
        color,
    );
    if !secundaria.is_empty() {
        pintor.text(
            rect.center() + Vec2::new(0.0, cuerpo * 1.1),
            Align2::CENTER_CENTER,
            secundaria,
            FontId::proportional(cuerpo * 0.85),
            color.gamma_multiply(0.65),
        );
    }
}

fn reloj(pintor: &egui::Painter, rect: Rect, color: Color32, cuerpo: f32) {
    let (h, m, _) = hora_local();
    dos_lineas(pintor, rect, color, cuerpo, &format!("{h:02}:{m:02}"), "");
}

fn clima(app: &App, pintor: &egui::Painter, rect: Rect, color: Color32, cuerpo: f32) {
    match &app.datos.clima {
        Some(c) => dos_lineas(
            pintor,
            rect,
            color,
            cuerpo,
            &format!("{}°", c.temp),
            crate::datos::descripcion_clima(c.code),
        ),
        // El clima tarda en llegar la primera vez, y puede no llegar nunca si no
        // hay red. Decirlo es mejor que dejar el botón en blanco.
        None => dos_lineas(
            pintor,
            rect,
            color.gamma_multiply(0.5),
            cuerpo,
            "—",
            "sin clima",
        ),
    }
}

fn reproduciendo(app: &App, pintor: &egui::Painter, rect: Rect, color: Color32, cuerpo: f32) {
    match &app.datos.media {
        Some(m) => {
            let titulo = recortar(&m.title, rect.width(), cuerpo);
            let artista = recortar(&m.artist, rect.width(), cuerpo * 0.85);
            pintor.text(
                rect.center() - Vec2::new(0.0, cuerpo * 0.4),
                Align2::CENTER_CENTER,
                titulo,
                FontId::proportional(cuerpo),
                color,
            );
            pintor.text(
                rect.center() + Vec2::new(0.0, cuerpo * 0.9),
                Align2::CENTER_CENTER,
                artista,
                FontId::proportional(cuerpo * 0.85),
                color.gamma_multiply(0.65),
            );
        }
        None => dos_lineas(
            pintor,
            rect,
            color.gamma_multiply(0.5),
            cuerpo,
            "—",
            "nada sonando",
        ),
    }
}

fn sensor(
    app: &App,
    boton: &ButtonConfig,
    pintor: &egui::Painter,
    rect: Rect,
    color: Color32,
    acento: Color32,
    cuerpo: f32,
) {
    let Some(cfg) = boton.sensor_widget.as_ref() else {
        dos_lineas(
            pintor,
            rect,
            color.gamma_multiply(0.5),
            cuerpo,
            "—",
            "sin sensor",
        );
        return;
    };

    let Some(s) = app.datos.sensor(&cfg.sensor_id) else {
        // El sensor puede no existir: viene de otro equipo, o es de LHM y el
        // nivel 2 está apagado. Se dice, en vez de mostrar un cero engañoso.
        dos_lineas(
            pintor,
            rect,
            color.gamma_multiply(0.5),
            cuerpo,
            "—",
            "no disponible",
        );
        return;
    };

    // Los umbrales tiñen el valor: es la razón de tener un sensor en un botón,
    // poder mirar de reojo y saber si algo va mal sin leer el número.
    let color_valor = match (cfg.crit_at, cfg.warn_at) {
        (Some(c), _) if s.value >= c => Color32::from_rgb(0xE5, 0x73, 0x73),
        (_, Some(w)) if s.value >= w => Color32::from_rgb(0xE5, 0xB1, 0x73),
        _ => color,
    };

    let unidad = cfg.suffix.clone().unwrap_or_else(|| s.unit.clone());
    let decimales = usize::from(s.value.abs() < 10.0);

    pintor.text(
        rect.center() - Vec2::new(0.0, cuerpo * 0.5),
        Align2::CENTER_CENTER,
        format!("{:.*}{unidad}", decimales, s.value),
        FontId::proportional(cuerpo * 1.4),
        color_valor,
    );
    pintor.text(
        rect.center() + Vec2::new(0.0, cuerpo * 1.1),
        Align2::CENTER_CENTER,
        recortar(&s.name, rect.width(), cuerpo * 0.85),
        FontId::proportional(cuerpo * 0.85),
        color.gamma_multiply(0.65),
    );

    // Barra de proporción cuando el sensor tiene rango conocido.
    if let (Some(min), Some(max)) = (s.min, s.max) {
        if max > min {
            let fraccion = ((s.value - min) / (max - min)).clamp(0.0, 1.0) as f32;
            let alto = (rect.height() * 0.045).max(2.0);
            let ancho = rect.width() * 0.7;
            let base = Rect::from_center_size(
                rect.center() + Vec2::new(0.0, rect.height() * 0.33),
                Vec2::new(ancho, alto),
            );
            pintor.rect_filled(base, alto / 2.0, color.gamma_multiply(0.15));
            let lleno = Rect::from_min_size(base.min, Vec2::new(ancho * fraccion, alto));
            pintor.rect_filled(
                lleno,
                alto / 2.0,
                if color_valor == color {
                    acento
                } else {
                    color_valor
                },
            );
        }
    }
}

fn variable(
    app: &App,
    boton: &ButtonConfig,
    pintor: &egui::Painter,
    rect: Rect,
    color: Color32,
    cuerpo: f32,
) {
    let Some(cfg) = boton.var_widget.as_ref() else {
        dos_lineas(
            pintor,
            rect,
            color.gamma_multiply(0.5),
            cuerpo,
            "—",
            "sin variable",
        );
        return;
    };
    let valor = app
        .estado
        .get(&cfg.var_name)
        .cloned()
        // Una variable que aún no se ha fijado no es un error: se muestra un guion
        // hasta que alguna acción la escriba.
        .unwrap_or_else(|| "—".into());

    let prefijo = cfg.prefix.clone().unwrap_or_default();
    let sufijo = cfg.suffix.clone().unwrap_or_default();
    dos_lineas(
        pintor,
        rect,
        color,
        cuerpo,
        &format!("{prefijo}{valor}{sufijo}"),
        &recortar(&cfg.var_name, rect.width(), cuerpo * 0.85),
    );
}

/// Hora local en (horas, minutos, segundos).
///
/// Se calcula a mano igual que en el resto del proyecto, para no arrastrar una
/// biblioteca de fechas por un solo uso. El desfase horario se saca de la propia
/// Windows en vez de suponer UTC, que mostraría una hora equivocada para casi
/// todo el mundo.
fn hora_local() -> (u32, u32, u32) {
    #[cfg(windows)]
    {
        use windows::Win32::System::SystemInformation::GetLocalTime;
        let t = unsafe { GetLocalTime() };
        (
            u32::from(t.wHour),
            u32::from(t.wMinute),
            u32::from(t.wSecond),
        )
    }
    #[cfg(not(windows))]
    {
        let s = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let d = s % 86_400;
        ((d / 3600) as u32, ((d % 3600) / 60) as u32, (d % 60) as u32)
    }
}

/// Recorta un texto que no cabe en el ancho dado.
fn recortar(texto: &str, ancho: f32, cuerpo: f32) -> String {
    let caben = ((ancho - 8.0) / (cuerpo * 0.55)).floor().max(3.0) as usize;
    if texto.chars().count() <= caben {
        return texto.to_string();
    }
    // Por caracteres y no por bytes: cortar por bytes partiria una tilde.
    let corto: String = texto.chars().take(caben.saturating_sub(1)).collect();
    format!("{corto}…")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn la_hora_local_esta_en_rango() {
        let (h, m, s) = hora_local();
        assert!(h < 24, "hora fuera de rango: {h}");
        assert!(m < 60);
        assert!(s < 60);
    }

    #[test]
    fn recortar_no_parte_caracteres_multibyte() {
        let r = recortar("Canción interminable con acentos", 60.0, 12.0);
        assert!(r.ends_with('…'));
        // Que se pueda construir el String ya prueba que el UTF-8 es valido.
        assert!(!r.is_empty());
    }
}
