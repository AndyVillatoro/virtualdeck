//! Volumen por aplicación: las sesiones de audio de Windows, lo mismo que
//! enseña el Mezclador de volumen.
//!
//! Una app puede tener **varias** sesiones (Chrome abre una por pestaña o
//! proceso hijo, y todas se llaman `chrome`), y en **varios** dispositivos de
//! salida: se tocan todas las del proceso en todos los dispositivos activos,
//! que es lo que se espera al girar la perilla «volumen de Spotify».
//!
//! El proceso se identifica por nombre normalizado (sin `.exe`, minúsculas),
//! el mismo formato que `targetApp` y `running_processes`. Vacío = la app en
//! primer plano: el preset de perilla «VOLUMEN DE APP» no sabe de antemano
//! cuál será.

use std::collections::HashMap;

use windows::core::Interface;
use windows::Win32::Media::Audio::{
    eRender, IAudioSessionControl2, IAudioSessionManager2, ISimpleAudioVolume, DEVICE_STATE_ACTIVE,
};
use windows::Win32::System::Com::CLSCTX_ALL;

use super::{device_enumerator, AudioError};

/// El volumen de una app, sumando sus sesiones.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SesionAudio {
    pub proceso: String,
    /// 0–100: el de la sesión más alta (lo que se oye).
    pub volumen: u8,
    /// Solo si **todas** sus sesiones están silenciadas.
    pub silenciada: bool,
}

/// El nombre que se busca: el dado, o la app en primer plano si viene vacío.
fn resolver(proceso: &str) -> Result<String, AudioError> {
    let dado = proceso.trim().trim_end_matches(".exe").to_lowercase();
    if !dado.is_empty() {
        return Ok(dado);
    }
    crate::launcher::active_app()
        .and_then(|a| a.process_name)
        .map(|n| n.trim().trim_end_matches(".exe").to_lowercase())
        .filter(|n| !n.is_empty())
        .ok_or_else(|| AudioError::SinSonido("no hay una app en primer plano".into()))
}

/// Todas las sesiones con su proceso, en todos los dispositivos de salida activos.
fn todas() -> Result<Vec<(String, ISimpleAudioVolume)>, AudioError> {
    let nombres: HashMap<u32, String> = crate::launcher::running_processes()
        .map(|l| l.into_iter().map(|p| (p.pid, p.name)).collect())
        .unwrap_or_default();
    let enumerador = device_enumerator()?;
    let mut salida = Vec::new();
    // SAFETY: interfaces COM vivas durante todo el bloque; los índices salen
    // de los propios `GetCount`.
    unsafe {
        let dispositivos = enumerador.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)?;
        for i in 0..dispositivos.GetCount()? {
            let Ok(dispositivo) = dispositivos.Item(i) else { continue };
            let Ok(gestor) = dispositivo.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else {
                continue;
            };
            let Ok(sesiones) = gestor.GetSessionEnumerator() else { continue };
            for j in 0..sesiones.GetCount()? {
                let Ok(control) = sesiones.GetSession(j) else { continue };
                let Ok(control2) = control.cast::<IAudioSessionControl2>() else { continue };
                // pid 0 = sonidos del sistema: no es una app.
                let pid = control2.GetProcessId().unwrap_or(0);
                let Some(nombre) = nombres.get(&pid).filter(|_| pid != 0) else { continue };
                let Ok(volumen) = control.cast::<ISimpleAudioVolume>() else { continue };
                salida.push((nombre.clone(), volumen));
            }
        }
    }
    Ok(salida)
}

fn del_proceso(proceso: &str) -> Result<(String, Vec<ISimpleAudioVolume>), AudioError> {
    let nombre = resolver(proceso)?;
    let suyas: Vec<ISimpleAudioVolume> =
        todas()?.into_iter().filter(|(n, _)| *n == nombre).map(|(_, v)| v).collect();
    if suyas.is_empty() {
        return Err(AudioError::SinSonido(format!("\"{nombre}\" no tiene sonido abierto")));
    }
    Ok((nombre, suyas))
}

fn nivel(v: &ISimpleAudioVolume) -> f32 {
    // SAFETY: interfaz viva.
    unsafe { v.GetMasterVolume().unwrap_or(0.0) }
}

/// Las apps que tienen sonido abierto, una por proceso, en orden alfabético.
pub fn audio_sessions() -> Result<Vec<SesionAudio>, AudioError> {
    let mut por_proceso: HashMap<String, (f32, bool)> = HashMap::new();
    for (nombre, v) in todas()? {
        // SAFETY: interfaz viva.
        let silenciada = unsafe { v.GetMute().map(|b| b.as_bool()).unwrap_or(false) };
        let e = por_proceso.entry(nombre).or_insert((0.0, true));
        e.0 = e.0.max(nivel(&v));
        e.1 &= silenciada;
    }
    let mut lista: Vec<SesionAudio> = por_proceso
        .into_iter()
        .map(|(proceso, (v, s))| SesionAudio { proceso, volumen: a_porcentaje(v), silenciada: s })
        .collect();
    lista.sort_by(|a, b| a.proceso.cmp(&b.proceso));
    Ok(lista)
}

fn a_porcentaje(v: f32) -> u8 {
    (v.clamp(0.0, 1.0) * 100.0).round() as u8
}

/// Fija el volumen de una app (0–100) en todas sus sesiones. Devuelve el nivel puesto.
pub fn set_app_volume(proceso: &str, porcentaje: i64) -> Result<u8, AudioError> {
    let (_, suyas) = del_proceso(proceso)?;
    let destino = (porcentaje.clamp(0, 100) as f32) / 100.0;
    for v in &suyas {
        // SAFETY: interfaz viva; contexto de evento nulo.
        unsafe { v.SetMasterVolume(destino, std::ptr::null())? };
    }
    Ok(a_porcentaje(destino))
}

/// Sube o baja el volumen de una app **desde donde esté** (el de su sesión más
/// alta, que es lo que se oye). Devuelve el nivel nuevo.
pub fn adjust_app_volume(proceso: &str, delta: i64) -> Result<u8, AudioError> {
    let (nombre, suyas) = del_proceso(proceso)?;
    let actual = suyas.iter().map(nivel).fold(0.0_f32, f32::max);
    let nuevo = (a_porcentaje(actual) as i64 + delta).clamp(0, 100);
    set_app_volume(&nombre, nuevo)
}

/// Alterna el silencio de una app. Si alguna sesión suena, se silencian todas;
/// si todas estaban calladas, vuelven todas. Devuelve si quedó silenciada.
pub fn toggle_app_mute(proceso: &str) -> Result<bool, AudioError> {
    let (_, suyas) = del_proceso(proceso)?;
    // SAFETY: interfaces vivas; contexto de evento nulo.
    unsafe {
        let todas_calladas = suyas.iter().all(|v| v.GetMute().map(|b| b.as_bool()).unwrap_or(false));
        let silenciar = !todas_calladas;
        for v in &suyas {
            v.SetMute(silenciar, std::ptr::null())?;
        }
        Ok(silenciar)
    }
}

#[cfg(test)]
mod tests {
    use super::a_porcentaje;

    #[test]
    fn porcentaje_redondea_y_acota() {
        assert_eq!(a_porcentaje(0.333), 33);
        assert_eq!(a_porcentaje(1.5), 100);
        assert_eq!(a_porcentaje(-0.2), 0);
    }
}
