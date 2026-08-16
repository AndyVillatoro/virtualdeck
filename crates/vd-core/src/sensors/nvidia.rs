//! Nivel 1 — GPU NVIDIA via NVML.
//!
//! Este es el hallazgo que hace viable sacarse LibreHardwareMonitor de encima
//! para la mitad interesante de los sensores. **NVML da temperatura, velocidad
//! de ventiladores, consumo y relojes de la GPU sin driver de kernel y sin UAC**,
//! que es justo lo que uno esperaria que hiciera falta pedir prestado a LHM.
//!
//! Funciona porque `nvml.dll` ya viene instalada con el driver de NVIDIA: la
//! biblioteca se carga dinamicamente en tiempo de ejecucion. No es una
//! dependencia de compilacion, y en un equipo sin GPU NVIDIA la carga
//! simplemente falla y el nivel queda inactivo.
//!
//! Para GPU AMD/Intel no hay equivalente igual de comodo; ahi sigue haciendo
//! falta el nivel 2.

use nvml_wrapper::{
    enum_wrappers::device::{Clock, TemperatureSensor},
    Nvml,
};

use super::{Sensor, SensorCategory, SensorKind, SensorSource};

const MIB: f64 = 1024.0 * 1024.0;

pub struct NvidiaReader {
    /// `None` cuando no hay driver NVIDIA. No es un error: es el caso normal en
    /// equipos con grafica AMD o integrada.
    nvml: Option<Nvml>,
    /// Nombres cacheados; el modelo de la GPU no cambia en caliente y consultarlo
    /// en cada refresco seria trabajo de mas.
    nombres: Vec<String>,
    error: Option<String>,
}

impl NvidiaReader {
    pub fn new() -> Self {
        match Nvml::init() {
            Ok(nvml) => {
                let mut nombres = Vec::new();
                if let Ok(n) = nvml.device_count() {
                    for i in 0..n {
                        let nombre = nvml
                            .device_by_index(i)
                            .and_then(|d| d.name())
                            .unwrap_or_else(|_| format!("GPU NVIDIA {i}"));
                        nombres.push(nombre);
                    }
                }
                Self {
                    nvml: Some(nvml),
                    nombres,
                    error: None,
                }
            }
            Err(e) => Self {
                nvml: None,
                nombres: Vec::new(),
                error: Some(e.to_string()),
            },
        }
    }

    pub fn device_names(&self) -> &[String] {
        &self.nombres
    }

    pub fn error(&self) -> Option<&str> {
        self.error.as_deref()
    }

    pub fn read_into(&mut self, out: &mut Vec<Sensor>) {
        let Some(nvml) = self.nvml.as_ref() else {
            return;
        };

        for (i, hardware) in self.nombres.iter().enumerate() {
            // El handle se pide en cada lectura en vez de guardarlo: `Device`
            // toma prestado el `Nvml`, y almacenar ambos en la misma struct la
            // volveria autorreferencial. Resolverlo por indice es barato.
            let Ok(dev) = nvml.device_by_index(i as u32) else {
                continue;
            };

            let mut push = |id: String, name: &str, kind, value: f64, unit: &str, max| {
                out.push(Sensor {
                    id,
                    name: name.into(),
                    hardware: hardware.clone(),
                    category: SensorCategory::Gpu,
                    kind,
                    value,
                    unit: unit.into(),
                    min: Some(0.0),
                    max,
                    source: SensorSource::Nvml,
                });
            };

            if let Ok(t) = dev.temperature(TemperatureSensor::Gpu) {
                push(
                    format!("/nvml/{i}/temperature"),
                    "Temperatura",
                    SensorKind::Temperature,
                    f64::from(t),
                    "°C",
                    None,
                );
            }

            if let Ok(u) = dev.utilization_rates() {
                push(
                    format!("/nvml/{i}/load"),
                    "Carga GPU",
                    SensorKind::Load,
                    f64::from(u.gpu),
                    "%",
                    Some(100.0),
                );
                // "Utilizacion de memoria" en NVML es el porcentaje de tiempo que
                // el bus de memoria estuvo ocupado, no cuanta VRAM hay ocupada.
                // Son cosas distintas y confundirlas es un error comun.
                push(
                    format!("/nvml/{i}/memory/load"),
                    "Actividad de memoria",
                    SensorKind::Load,
                    f64::from(u.memory),
                    "%",
                    Some(100.0),
                );
            }

            if let Ok(m) = dev.memory_info() {
                let total_mib = m.total as f64 / MIB;
                push(
                    format!("/nvml/{i}/memory/used"),
                    "VRAM usada",
                    SensorKind::SmallData,
                    m.used as f64 / MIB,
                    "MB",
                    Some(total_mib),
                );
                if m.total > 0 {
                    push(
                        format!("/nvml/{i}/memory/usedPercent"),
                        "VRAM usada",
                        SensorKind::Load,
                        m.used as f64 / m.total as f64 * 100.0,
                        "%",
                        Some(100.0),
                    );
                }
            }

            if let Ok(mw) = dev.power_usage() {
                push(
                    format!("/nvml/{i}/power"),
                    "Consumo",
                    SensorKind::Power,
                    f64::from(mw) / 1000.0, // NVML reporta milivatios
                    "W",
                    None,
                );
            }

            if let Ok(n) = dev.num_fans() {
                for f in 0..n {
                    if let Ok(pct) = dev.fan_speed(f) {
                        push(
                            format!("/nvml/{i}/fan/{f}"),
                            &format!("Ventilador {}", f + 1),
                            SensorKind::Fan,
                            f64::from(pct),
                            "%",
                            Some(100.0),
                        );
                    }
                }
            }

            for (dominio, sufijo, etiqueta) in [
                (Clock::Graphics, "graphics", "Reloj GPU"),
                (Clock::Memory, "memory", "Reloj memoria"),
            ] {
                if let Ok(mhz) = dev.clock_info(dominio) {
                    push(
                        format!("/nvml/{i}/clock/{sufijo}"),
                        etiqueta,
                        SensorKind::Clock,
                        f64::from(mhz),
                        "MHz",
                        None,
                    );
                }
            }
        }
    }
}

impl Default for NvidiaReader {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// En un equipo sin NVIDIA esto no debe fallar: tiene que degradarse a
    /// "cero sensores" y dejar que el resto del modulo siga funcionando.
    #[test]
    fn sin_driver_nvidia_no_revienta() {
        let mut r = NvidiaReader::new();
        let mut v = Vec::new();
        r.read_into(&mut v);

        if r.nvml.is_none() {
            assert!(v.is_empty());
            assert!(
                r.error().is_some(),
                "si no hay NVML tiene que decir por que"
            );
        }
    }

    #[test]
    fn los_valores_de_la_gpu_son_plausibles() {
        let mut r = NvidiaReader::new();
        let mut v = Vec::new();
        r.read_into(&mut v);

        for s in &v {
            assert!(s.id.starts_with("/nvml/"), "ID sin prefijo: {}", s.id);
            match s.kind {
                // Una GPU encendida esta entre la temperatura ambiente y su
                // limite termico. Fuera de ese rango, la unidad esta mal.
                SensorKind::Temperature => assert!(
                    (10.0..=110.0).contains(&s.value),
                    "temperatura implausible: {} = {}",
                    s.id,
                    s.value
                ),
                SensorKind::Load | SensorKind::Fan => assert!(
                    (0.0..=100.0).contains(&s.value),
                    "porcentaje fuera de rango: {} = {}",
                    s.id,
                    s.value
                ),
                // Milivatios convertidos a vatios. Si el factor 1000 se perdiera,
                // aca apareceria un numero de cinco cifras.
                SensorKind::Power => assert!(
                    s.value < 2000.0,
                    "consumo implausible, revisar la conversion mW->W: {}",
                    s.value
                ),
                _ => {}
            }
        }
    }
}
