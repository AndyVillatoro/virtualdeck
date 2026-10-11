//! Reproduccion actual y control de medios via SMTC (System Media Transport
//! Controls), la API con la que Windows habla con Spotify, YouTube, VLC, etc.
//!
//! # Lo que desaparece al portarlo
//!
//! La version Electron tenia que llegar a esta misma API **desde PowerShell**, y
//! PowerShell 5.1 no sabe esperar operaciones asincronas de WinRT. La solucion
//! era un preambulo que buscaba por reflexion los metodos genericos
//! `WindowsRuntimeSystemExtensions.AsTask` y les pasaba el tipo de resultado a
//! mano — con un comentario en el codigo advirtiendo que el enfoque previo
//! (hacer polling de `$op.Status`) devolvia `null` siempre y dejaba el widget de
//! musica vacio.
//!
//! Aca eso es `.join()`. Toda esa clase de bug deja de existir.

mod consulta;
mod control;
mod hilos;
mod sesion;
mod timeline;
mod tipos;
mod window_titles;

#[cfg(test)]
mod pruebas;

pub use consulta::{diagnose, now_playing, now_playing_from_windows, now_playing_smtc};
pub use control::{control, cycle_repeat, toggle_shuffle};
pub use tipos::{Controles, MediaCommand, MediaError, NowPlaying, PlayState, RepeatMode, Thumbnail};
pub use window_titles::{parse_window_title, ParsedTitle};
