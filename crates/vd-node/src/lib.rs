//! Puente entre `vd-core` y Electron.
//!
//! # Qué resuelve
//!
//! Hasta ahora toda la capa nativa de VirtualDeck pasaba por **PowerShell con C#
//! embebido en cadenas**: cada cambio de dispositivo de audio, cada consulta de
//! reproducción, cada macro lanzaba un `powershell.exe` nuevo. Eso costaba entre
//! 150 y 400 ms por operación y produjo los errores más caros del proyecto —el
//! audio que no cambiaba, el SMTC que devolvía `null`, el `param()` que se
//! rompía en silencio— porque el compilador no puede revisar código que vive
//! dentro de una cadena de texto.
//!
//! `vd-core` ya hace todo eso llamando a COM y WinRT **en proceso**, con tipos
//! verificados al compilar y en microsegundos. Este módulo se limita a exponerlo
//! a JavaScript.
//!
//! # Por qué N-API y no un módulo nativo clásico
//!
//! La ABI de N-API es estable entre versiones de Node y de Electron, así que el
//! binario se compila una vez y sigue sirviendo tras actualizar Electron. Un
//! módulo contra las cabeceras de V8 habría que recompilarlo en cada
//! actualización. Es la misma razón por la que el proyecto ya eligió
//! `uiohook-napi` para las macros.
//!
//! # Los nombres son los de JavaScript
//!
//! `napi` convierte automáticamente `nombre_de_funcion` a `nombreDeFuncion`, y
//! los campos de las structs igual. Las firmas se mantienen **idénticas** a las
//! que ya exportaban los módulos de `electron/main/`, para que sustituirlos no
//! obligue a tocar ni el IPC ni la interfaz.
//!
//! # Organización
//!
//! Cada familia de funciones exportadas vive en su submódulo público (`audio`,
//! `launcher`, `media`, `macros`, `voz`, `sensores`); aquí quedan solo la
//! declaración de módulos, la sonda `version` y los ayudantes comunes. Los
//! módulos son públicos porque sus funciones son la superficie exportada del
//! crate (vía napi); los nombres exportados a JavaScript no cambian:
//! `electron/main/native.ts` los llama por nombre.

#![deny(clippy::all)]

pub mod audio;
pub mod launcher;
pub mod macros;
pub mod media;
pub mod sensores;
pub mod voz;

use napi_derive::napi;

/// Comprueba que el módulo nativo carga y responde.
///
/// Parece de adorno y no lo es: si el `.node` no está donde el empaquetador lo
/// dejó, o se compiló para otra arquitectura, el fallo aparece como un `require`
/// que revienta al arrancar. Llamar a esto primero permite decirlo con claridad
/// y caer al camino anterior en vez de dejar la aplicación medio muerta.
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Convierte un error del núcleo en una excepción de JavaScript.
pub(crate) fn a_error(e: impl std::fmt::Display) -> napi::Error {
    napi::Error::from_reason(e.to_string())
}

/// Convierte un `Result` en el `boolean` que espera JavaScript, dejando rastro.
///
/// Las funciones del launcher devolvían `boolean` en la versión de PowerShell y
/// se mantiene la firma para no tocar el IPC. Pero un `false` a secas no dice
/// **por qué** falló, así que el motivo va al log del proceso principal: es lo
/// único que queda cuando alguien reporta que un botón no hace nada.
pub(crate) fn informar<E: std::fmt::Display>(que: &str, r: Result<(), E>) -> bool {
    match r {
        Ok(()) => true,
        Err(e) => {
            eprintln!("[launcher] {que}: {e}");
            false
        }
    }
}
