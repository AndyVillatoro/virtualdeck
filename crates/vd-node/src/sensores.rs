//! Sensores del sistema, expuestos como JSON.

use napi_derive::napi;

/// Los sensores del sistema, como JSON.
///
/// # Por qué esto importa más de lo que parece
///
/// La versión Electron necesita **LibreHardwareMonitor** corriendo: 19 MB de
/// binarios empaquetados, un servidor HTTP en el puerto 8085 y, para que ese
/// servidor pueda reservar el puerto, arrancarlo como administrador. Sin todo
/// eso no hay ni un solo sensor.
///
/// El nivel 1 de `vd-core` no necesita nada instalado: CPU, RAM, disco y red
/// salen de la API del sistema, y la GPU NVIDIA de NVML, que viene con el
/// propio driver. LHM sigue disponible como nivel 2 opcional para lo que solo
/// él ve —voltajes, ventiladores de placa—, pero deja de ser un requisito.
///
/// Va como JSON y no como un objeto declarado aquí por la misma razón que las
/// macros: el tipo ya está definido en `vd-core` y un espejo escrito a mano
/// podría desviarse sin que nada fallara al compilar.
#[napi]
pub fn list_sensors(force: bool) -> napi::Result<String> {
    let mut sensores = sensores();
    let lista = sensores.list_filtered(force);
    serde_json::to_string(&lista).map_err(crate::a_error)
}

/// Estado del subsistema de sensores, como JSON.
///
/// Dice cuántos aporta el nivel nativo, qué GPU ve NVML y por qué no pudo si no
/// pudo. Es lo que necesita la pantalla de ajustes para explicar qué pasa en vez
/// de mostrar una lista vacía.
#[napi]
pub fn sensors_status() -> napi::Result<String> {
    let mut sensores = sensores();
    serde_json::to_string(&sensores.status()).map_err(crate::a_error)
}

/// Configura los sensores desde el JSON de `SensorsSettings`.
#[napi]
pub fn configure_sensors(settings_json: String) -> bool {
    match serde_json::from_str(&settings_json) {
        Ok(s) => {
            sensores().configure(&s);
            true
        }
        Err(e) => {
            eprintln!("[sensores] ajustes ilegibles: {e}");
            false
        }
    }
}

/// El estado de los sensores, compartido entre llamadas.
///
/// Tiene que persistir: `Sensors` guarda la caché de lecturas y el momento del
/// último intento fallido de LHM. Crearlo en cada llamada perdería ambas cosas,
/// y con la segunda volveríamos a pagar 2,6 s por refresco cuando LHM está
/// configurado pero cerrado.
fn sensores() -> std::sync::MutexGuard<'static, vd_core::sensors::Sensors> {
    static SENSORES: std::sync::OnceLock<std::sync::Mutex<vd_core::sensors::Sensors>> =
        std::sync::OnceLock::new();
    SENSORES
        .get_or_init(|| std::sync::Mutex::new(vd_core::sensors::Sensors::new()))
        .lock()
        // Un panic dentro del candado dejaría el mutex envenenado. Se sigue con
        // el estado que hubiera: perder los sensores por eso sería peor.
        .unwrap_or_else(|e| e.into_inner())
}
