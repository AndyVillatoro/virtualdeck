//! Enumerar y terminar procesos.
//!
//! Reemplaza los `tasklist /NH /FO CSV` y `taskkill /IM ... /F` que la version
//! Electron ejecutaba por shell. Ademas de ser mas rapido (no hay proceso
//! intermedio), no depende del idioma ni del formato de salida de esas
//! herramientas.

use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};

use super::LauncherError;

/// Un proceso en ejecucion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessInfo {
    pub pid: u32,
    /// Nombre del ejecutable **sin** `.exe` y en minusculas, que es el formato
    /// con el que la configuracion compara (`visibleIf.app`, `kill-process`).
    pub name: String,
}

/// Lista los procesos en ejecucion.
pub fn running_processes() -> Result<Vec<ProcessInfo>, LauncherError> {
    let mut out = Vec::new();

    // SAFETY: el snapshot se cierra siempre antes de salir.
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)?;

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };

        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let fin = entry
                    .szExeFile
                    .iter()
                    .position(|c| *c == 0)
                    .unwrap_or(entry.szExeFile.len());
                let nombre = String::from_utf16_lossy(&entry.szExeFile[..fin]);

                out.push(ProcessInfo {
                    pid: entry.th32ProcessID,
                    name: nombre.trim_end_matches(".exe").to_lowercase(),
                });

                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snapshot);
    }

    Ok(out)
}

/// Termina todos los procesos cuyo nombre coincida.
///
/// El nombre se compara sin `.exe` y sin distinguir mayusculas, igual que hacia
/// `taskkill /IM`. Devuelve cuantos se terminaron.
pub fn kill_process(name: &str) -> Result<usize, LauncherError> {
    let objetivo = name.trim().trim_end_matches(".exe").to_lowercase();
    if objetivo.is_empty() {
        return Err(LauncherError::Empty);
    }

    let mut terminados = 0;
    for p in running_processes()?
        .into_iter()
        .filter(|p| p.name == objetivo)
    {
        // SAFETY: el handle se cierra en ambos caminos. Un fallo al abrir o
        // terminar un proceso concreto (permisos, ya murio) no aborta el resto.
        unsafe {
            if let Ok(handle) = OpenProcess(PROCESS_TERMINATE, false, p.pid) {
                if TerminateProcess(handle, 1).is_ok() {
                    terminados += 1;
                }
                let _ = CloseHandle(handle);
            }
        }
    }

    Ok(terminados)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enumera_procesos_reales() {
        let procesos = running_processes().expect("enumerar procesos");
        assert!(!procesos.is_empty(), "siempre hay procesos corriendo");

        // El proceso de test tiene que aparecer en su propia lista.
        let yo = std::process::id();
        assert!(
            procesos.iter().any(|p| p.pid == yo),
            "el proceso actual deberia estar en la lista"
        );
    }

    #[test]
    fn los_nombres_vienen_normalizados() {
        let procesos = running_processes().expect("enumerar procesos");
        for p in procesos.iter().take(50) {
            assert!(
                !p.name.ends_with(".exe"),
                "el nombre no deberia traer .exe: {}",
                p.name
            );
            assert_eq!(p.name, p.name.to_lowercase(), "deberia venir en minusculas");
        }
    }

    #[test]
    fn matar_un_proceso_inexistente_no_es_error() {
        // Devuelve 0, no error: pedir que se cierre algo que no corre es un
        // no-op razonable, no un fallo.
        let n = kill_process("proceso_que_no_existe_xyz123").expect("no deberia fallar");
        assert_eq!(n, 0);
    }

    #[test]
    fn un_nombre_vacio_es_error() {
        assert!(matches!(kill_process("  "), Err(LauncherError::Empty)));
    }
}
