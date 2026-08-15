//! Lectura de sensores de hardware.
//!
//! # Estrategia de dos niveles
//!
//! La version Electron dependia por completo de **LibreHardwareMonitor** (LHM):
//! un proceso .NET externo de ~19 MB que hay que descargar aparte, que pide UAC
//! para abrir su servidor HTTP y que da problemas al iniciar con Windows. Si LHM
//! no estaba corriendo, el widget de sensores simplemente no mostraba nada.
//!
//! Aca se invierte la relacion:
//!
//! - **Nivel 1 — nativo** ([`native`], [`nvidia`]): funciona siempre, sin
//!   instalar nada, sin UAC y sin procesos externos. Cubre CPU (carga y
//!   frecuencia), memoria, discos, red y **la GPU NVIDIA completa** — incluida
//!   temperatura y ventiladores, que es justo lo que uno esperaria que exigiera
//!   un driver de kernel.
//! - **Nivel 2 — opcional** ([`lhm`]): si el usuario ya tiene LHM, se suma y
//!   aporta lo que el nivel 1 no puede leer sin driver de kernel: temperatura
//!   del paquete de CPU, voltajes y ventiladores de la placa.
//!
//! El limite es real, no pereza: leer esos ultimos valores exige hablar por
//! SMBus/MSR, y eso requiere un driver firmado en anillo 0. Ver
//! `docs/MIGRACION-RUST.md`, seccion "backends por niveles".
//!
//! # Compatibilidad de IDs
//!
//! Los botones ya guardados en `deck-config.json` referencian sensores por el
//! `SensorId` de LHM (p. ej. `/amdcpu/0/temperature/0`). Esos IDs se respetan
//! tal cual. Los sensores nativos usan prefijos propios (`/native/…`,
//! `/nvml/…`) que **no pueden colisionar** con los de LHM, asi que ambos
//! niveles conviven en la misma lista sin pisarse.

pub mod lhm;
pub mod native;
pub mod nvidia;

use std::time::{Duration, Instant};

pub use crate::config::model::SensorCategory;

/// Tipo de magnitud, con los mismos nombres que usa LHM para que un `deck-config`
/// existente siga interpretandose igual.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SensorKind {
    Temperature,
    Fan,
    Voltage,
    Load,
    Clock,
    Power,
    Data,
    Throughput,
    Level,
    SmallData,
    Other,
}

impl SensorKind {
    /// Convierte el campo `Type` del arbol JSON de LHM.
    pub fn from_lhm(s: &str) -> Self {
        match s {
            "Temperature" => Self::Temperature,
            "Fan" => Self::Fan,
            "Voltage" => Self::Voltage,
            "Load" => Self::Load,
            "Clock" => Self::Clock,
            "Power" => Self::Power,
            "Data" => Self::Data,
            "Throughput" => Self::Throughput,
            "Level" => Self::Level,
            "SmallData" => Self::SmallData,
            _ => Self::Other,
        }
    }
}

/// De donde salio la lectura. Le permite a la UI explicar por que falta un
/// sensor ("conecta LHM para ver temperatura de CPU") en vez de mostrar un
/// hueco sin explicacion.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SensorSource {
    /// Nivel 1: `sysinfo` — CPU, memoria, discos, red.
    Native,
    /// Nivel 1: NVML — GPU NVIDIA.
    Nvml,
    /// Nivel 2: LibreHardwareMonitor externo.
    Lhm,
}

/// Una lectura concreta.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Sensor {
    /// Identificador estable entre ejecuciones. Es lo que se guarda en la
    /// configuracion de un boton, asi que **no puede cambiar de formato** sin
    /// romperle los widgets a los usuarios.
    pub id: String,
    pub name: String,
    pub hardware: String,
    pub category: SensorCategory,
    pub kind: SensorKind,
    pub value: f64,
    pub unit: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    pub source: SensorSource,
}

/// Estado del subsistema, para la pantalla de ajustes.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct SensorsStatus {
    /// Cuantos sensores aporta el nivel 1. Siempre > 0 en un equipo sano.
    pub native_count: usize,
    /// Nombre de las GPU NVIDIA detectadas (vacio si no hay o no hay driver).
    pub nvml_devices: Vec<String>,
    /// Por que no se pudo usar NVML, si no se pudo.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub nvml_error: Option<String>,
    /// Nivel 2 activado en la configuracion.
    pub lhm_enabled: bool,
    pub lhm_connected: bool,
    pub lhm_count: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lhm_error: Option<String>,
}

/// Cada cuanto se vuelve a consultar el hardware.
///
/// No es un truco para esconder latencia (como si lo eran las caches de la
/// version Electron, que tapaban el coste de lanzar `powershell.exe`). Aca hace
/// falta por dos motivos reales: `sysinfo` necesita dos muestras separadas en el
/// tiempo para calcular el uso de CPU, y consultar NVML/LHM en cada pulsacion de
/// boton seria trabajo desperdiciado cuando varios widgets leen a la vez.
const REFRESH_INTERVAL: Duration = Duration::from_millis(1000);

/// Punto de entrada del modulo. Mantiene vivo el estado que las bibliotecas
/// necesitan entre lecturas (el delta de CPU de `sysinfo`, el handle de NVML) en
/// vez de reconstruirlo cada vez.
pub struct Sensors {
    native: native::NativeReader,
    nvidia: nvidia::NvidiaReader,
    lhm: lhm::LhmClient,
    cache: Vec<Sensor>,
    last_read: Option<Instant>,
}

impl Sensors {
    /// Inicializa los dos niveles. Nunca falla: si no hay GPU NVIDIA o LHM no
    /// responde, esos niveles quedan inactivos y el resto sigue funcionando.
    pub fn new() -> Self {
        Self {
            native: native::NativeReader::new(),
            nvidia: nvidia::NvidiaReader::new(),
            lhm: lhm::LhmClient::new(),
            cache: Vec::new(),
            last_read: None,
        }
    }

    /// Aplica los ajustes del usuario (habilitar LHM, host, puerto, categorias).
    pub fn configure(&mut self, settings: &crate::config::model::SensorsSettings) {
        self.lhm.configure(settings);
    }

    /// Devuelve todos los sensores disponibles.
    ///
    /// Con `force = false` reutiliza la ultima lectura si es mas reciente que
    /// [`REFRESH_INTERVAL`].
    pub fn list(&mut self, force: bool) -> &[Sensor] {
        let fresh = self
            .last_read
            .is_some_and(|t| t.elapsed() < REFRESH_INTERVAL);
        if fresh && !force {
            return &self.cache;
        }

        let mut out = Vec::new();
        self.native.read_into(&mut out);
        self.nvidia.read_into(&mut out);
        self.lhm.read_into(&mut out);

        self.cache = out;
        self.last_read = Some(Instant::now());
        &self.cache
    }

    /// Busca un sensor por su ID.
    ///
    /// No aplica el filtro de categorias a proposito: un widget ya configurado
    /// tiene que seguir funcionando aunque despues el usuario reduzca las
    /// categorias visibles en los ajustes.
    pub fn get(&mut self, id: &str) -> Option<&Sensor> {
        self.list(false);
        self.cache.iter().find(|s| s.id == id)
    }

    /// Evalua una condicion de sensor (`sensor_trigger`, `visible_if`).
    ///
    /// Devuelve `None` si el sensor no existe, que es distinto de `Some(false)`:
    /// quien llama puede decidir si un sensor ausente debe ocultar un boton o
    /// dejarlo como estaba.
    pub fn eval(&mut self, cond: &crate::config::model::SensorCondition) -> Option<bool> {
        self.get(&cond.id).map(|s| cond.eval(s.value))
    }

    /// Aplica el filtro de categorias configurado.
    pub fn list_filtered(&mut self, force: bool) -> Vec<Sensor> {
        let allowed = self.lhm.allowed_categories().clone();
        self.list(force)
            .iter()
            .filter(|s| allowed.contains(&s.category))
            .cloned()
            .collect()
    }

    /// Estado de ambos niveles, para diagnostico.
    pub fn status(&mut self) -> SensorsStatus {
        self.list(false);
        SensorsStatus {
            native_count: self
                .cache
                .iter()
                .filter(|s| s.source == SensorSource::Native)
                .count(),
            nvml_devices: self.nvidia.device_names().to_vec(),
            nvml_error: self.nvidia.error().map(str::to_owned),
            lhm_enabled: self.lhm.is_enabled(),
            lhm_connected: self.lhm.is_connected(),
            lhm_count: self
                .cache
                .iter()
                .filter(|s| s.source == SensorSource::Lhm)
                .count(),
            lhm_error: self.lhm.error().map(str::to_owned),
        }
    }
}

impl Default for Sensors {
    fn default() -> Self {
        Self::new()
    }
}

/// Categorias que se muestran salvo que el usuario diga otra cosa.
///
/// `Other` queda fuera: recoge adaptadores de red virtuales, controladores
/// empotrados y baterias, que en un deck de escritorio son ruido.
pub(crate) fn default_categories() -> Vec<SensorCategory> {
    vec![
        SensorCategory::Cpu,
        SensorCategory::Gpu,
        SensorCategory::Mainboard,
        SensorCategory::Memory,
        SensorCategory::Storage,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kind_desconocido_cae_en_other() {
        assert_eq!(SensorKind::from_lhm("Temperature"), SensorKind::Temperature);
        assert_eq!(SensorKind::from_lhm("Flux"), SensorKind::Other);
    }

    #[test]
    fn los_ids_nativos_no_colisionan_con_los_de_lhm() {
        // Un `deck-config.json` viejo guarda IDs como "/amdcpu/0/temperature/0".
        // Si un sensor nativo pudiera generar ese mismo ID, el widget del usuario
        // pasaria a leer otra cosa sin avisar.
        let mut s = Sensors::new();
        for sensor in s.list(true) {
            match sensor.source {
                SensorSource::Native => assert!(
                    sensor.id.starts_with("/native/"),
                    "ID nativo sin prefijo: {}",
                    sensor.id
                ),
                SensorSource::Nvml => assert!(
                    sensor.id.starts_with("/nvml/"),
                    "ID de NVML sin prefijo: {}",
                    sensor.id
                ),
                SensorSource::Lhm => assert!(
                    !sensor.id.starts_with("/native/") && !sensor.id.starts_with("/nvml/"),
                    "ID de LHM pisando un prefijo nativo: {}",
                    sensor.id
                ),
            }
        }
    }

    #[test]
    fn los_ids_son_unicos() {
        let mut s = Sensors::new();
        let mut vistos = std::collections::HashSet::new();
        for sensor in s.list(true) {
            assert!(
                vistos.insert(sensor.id.clone()),
                "ID repetido: {}",
                sensor.id
            );
        }
    }
}

#[cfg(test)]
mod bench_manual {
    use std::time::Instant;

    /// No es un test de correccion: mide cuanto cuesta un refresco completo.
    /// Un refresco lento se notaria como tirones en la interfaz.
    #[test]
    #[ignore = "medicion manual: cargo test -p vd-core coste_de_un_refresco -- --ignored --nocapture"]
    fn coste_de_un_refresco() {
        let mut s = super::Sensors::new();
        s.list(true);
        for etiqueta in ["nativo", "nvidia", "lhm"] {
            let t = Instant::now();
            let mut v = Vec::new();
            match etiqueta {
                "nativo" => s.native.read_into(&mut v),
                "nvidia" => s.nvidia.read_into(&mut v),
                _ => s.lhm.read_into(&mut v),
            }
            println!(
                "{etiqueta:>8}: {:>8.1} ms  ({} sensores)",
                t.elapsed().as_secs_f64() * 1000.0,
                v.len()
            );
        }
    }
}
