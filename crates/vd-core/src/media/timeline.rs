//! Posicion y duracion de la pista, de `GetTimelineProperties()` (SMTC).
//!
//! La lectura es sincrona —como `GetPlaybackInfo()`—, asi que no es la llamada
//! que se cuelga con una sesion zombi (esa es `TryGetMediaPropertiesAsync`).
//! Es una llamada mas por consulta, sin hilos nuevos.

use windows::Foundation::{DateTime, TimeSpan};
use windows::Media::Control::GlobalSystemMediaTransportControlsSession as Session;

/// Posicion, duracion y el instante de la medida, en milisegundos.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Timeline {
    pub position_ms: i64,
    pub duration_ms: i64,
    /// Epoch ms Unix: de donde parte el cronometro para interpolar.
    pub updated_at_epoch_ms: i64,
}

/// Milisegundos entre el 1-1-1601 (FILETIME) y el 1-1-1970 (epoch Unix).
const DIF_FILETIME_UNIX_MS: i64 = 11_644_473_600_000;

/// De ticks de 100 ns (`TimeSpan` de WinRT) a milisegundos.
fn timespan_a_ms(ts: TimeSpan) -> i64 {
    ts.Duration / 10_000
}

/// De FILETIME (ticks de 100 ns desde 1601) a epoch ms Unix.
fn datetime_a_epoch_ms(dt: DateTime) -> i64 {
    dt.UniversalTime / 10_000 - DIF_FILETIME_UNIX_MS
}

/// Lee la linea de tiempo de la sesion.
///
/// `None` si la llamada falla o si la duracion es 0 — algunas apps publican
/// `EndTime = 0` mientras suenan, y sin duracion no hay barra que dibujar. En
/// ese caso los tres datos quedan ausentes, no inventados.
pub fn leer_timeline(session: &Session) -> Option<Timeline> {
    let tl = session.GetTimelineProperties().ok()?;
    let inicio = timespan_a_ms(tl.StartTime().ok()?);
    let fin = timespan_a_ms(tl.EndTime().ok()?);
    let duration_ms = fin - inicio;
    if duration_ms <= 0 {
        return None;
    }
    Some(Timeline {
        position_ms: timespan_a_ms(tl.Position().ok()?),
        duration_ms,
        updated_at_epoch_ms: datetime_a_epoch_ms(tl.LastUpdatedTime().ok()?),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timespan_a_ms_convierte_ticks_de_100ns() {
        // Un segundo son diez millones de ticks de 100 ns.
        assert_eq!(timespan_a_ms(TimeSpan { Duration: 10_000_000 }), 1000);
        assert_eq!(timespan_a_ms(TimeSpan { Duration: 0 }), 0);
        // Se trunca al milisegundo, no se redondea.
        assert_eq!(timespan_a_ms(TimeSpan { Duration: 9_999 }), 0);
        // Una cancion de 3:42 = 222_000 ms.
        assert_eq!(timespan_a_ms(TimeSpan { Duration: 2_220_000_000 }), 222_000);
    }

    #[test]
    fn datetime_a_epoch_ms_convierte_filetime() {
        // 1970-01-01T00:00:00Z: el FILETIME es justo la diferencia entre eras.
        assert_eq!(
            datetime_a_epoch_ms(DateTime {
                UniversalTime: 116_444_736_000_000_000
            }),
            0
        );
        // 2001-09-09T01:46:40Z: 1 000 000 000 segundos Unix.
        assert_eq!(
            datetime_a_epoch_ms(DateTime {
                UniversalTime: 126_444_736_000_000_000
            }),
            1_000_000_000_000
        );
    }
}
