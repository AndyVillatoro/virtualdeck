//! Aplicaciones, URLs y accesos directos.

use std::process::{Command, Stdio};

use windows::core::HSTRING;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

use super::LauncherError;

/// Lanza una aplicacion, desligada de este proceso.
///
/// Acepta rutas con variables de entorno (`%LOCALAPPDATA%\...`) porque asi las
/// guardan los presets de la version Electron.
pub fn launch_app(path: &str, args: &[String]) -> Result<(), LauncherError> {
    let path = expand_env(path.trim());
    if path.is_empty() {
        return Err(LauncherError::Empty);
    }

    // La ruta puede traer argumentos pegados ("Update.exe --processStart X"),
    // igual que en los presets heredados.
    let (exe, inline) = split_command(&path);
    let mut todos: Vec<String> = inline;
    todos.extend(args.iter().cloned());

    Command::new(&exe)
        .args(&todos)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| LauncherError::Spawn(format!("{exe}: {e}")))
}

/// Abre una URL, archivo o carpeta con la aplicacion asociada del sistema.
pub fn open_path(target: &str) -> Result<(), LauncherError> {
    let target = expand_env(target.trim());
    if target.is_empty() {
        return Err(LauncherError::Empty);
    }

    // SAFETY: cadenas terminadas en nulo validas durante la llamada.
    let resultado = unsafe {
        ShellExecuteW(
            None,
            &HSTRING::from("open"),
            &HSTRING::from(target.as_str()),
            None,
            None,
            SW_SHOWNORMAL,
        )
    };

    // ShellExecuteW devuelve un "handle" cuyo valor <= 32 significa error.
    if resultado.0 as usize > 32 {
        Ok(())
    } else {
        Err(LauncherError::Spawn(format!(
            "ShellExecute fallo para {target}"
        )))
    }
}

/// Expande variables de entorno estilo `%VAR%`.
pub(super) fn expand_env(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut resto = input;

    while let Some(inicio) = resto.find('%') {
        out.push_str(&resto[..inicio]);
        let tras = &resto[inicio + 1..];
        match tras.find('%') {
            Some(fin) => {
                let nombre = &tras[..fin];
                match std::env::var(nombre) {
                    Ok(v) => out.push_str(&v),
                    // Variable inexistente: se deja tal cual, como hace cmd.
                    Err(_) => {
                        out.push('%');
                        out.push_str(nombre);
                        out.push('%');
                    }
                }
                resto = &tras[fin + 1..];
            }
            None => {
                out.push('%');
                resto = tras;
                break;
            }
        }
    }
    out.push_str(resto);
    out
}

/// Separa un comando en ejecutable y argumentos, respetando comillas.
pub(super) fn split_command(input: &str) -> (String, Vec<String>) {
    let input = input.trim();

    // Ruta entre comillas: todo lo de adentro es el ejecutable.
    if let Some(resto) = input.strip_prefix('"') {
        if let Some(fin) = resto.find('"') {
            let exe = resto[..fin].to_string();
            let args = resto[fin + 1..]
                .split_whitespace()
                .map(str::to_string)
                .collect();
            return (exe, args);
        }
    }

    let mut partes = input.split_whitespace();
    let exe = partes.next().unwrap_or("").to_string();
    (exe, partes.map(str::to_string).collect())
}
