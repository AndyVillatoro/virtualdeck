//! Nivel 1 — sensores nativos via `sysinfo`: CPU, memoria, discos y red.
//!
//! Todo lo de aca sale de APIs publicas de Windows que cualquier proceso puede
//! llamar: sin driver de kernel, sin UAC y sin procesos externos. Es el minimo
//! que **siempre** va a estar disponible.
//!
//! Lo que este nivel *no* puede dar, y por que: la temperatura del paquete de
//! CPU, los voltajes y los ventiladores de la placa se leen por MSR y SMBus, que
//! exigen anillo 0. Eso es el nivel 2 ([`super::lhm`]).

use std::time::Instant;

use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, Networks, RefreshKind, System};

use super::{Sensor, SensorCategory, SensorKind, SensorSource};

/// Bytes en un gigabyte binario. `sysinfo` devuelve bytes crudos.
const GIB: f64 = 1024.0 * 1024.0 * 1024.0;

pub struct NativeReader {
    system: System,
    disks: Disks,
    networks: Networks,
    /// Momento del ultimo refresco de red, para pasar de "bytes acumulados desde
    /// la ultima consulta" a una tasa en bytes por segundo.
    last_net_sample: Option<Instant>,
}

impl NativeReader {
    pub fn new() -> Self {
        // Solo se piden CPU y memoria: enumerar procesos en cada refresco seria
        // el trabajo mas caro del modulo y aca no se usa para nada.
        let specifics = RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::nothing().with_cpu_usage().with_frequency())
            .with_memory(MemoryRefreshKind::everything());

        Self {
            system: System::new_with_specifics(specifics),
            disks: Disks::new_with_refreshed_list(),
            networks: Networks::new_with_refreshed_list(),
            last_net_sample: None,
        }
    }

    pub fn read_into(&mut self, out: &mut Vec<Sensor>) {
        self.system.refresh_cpu_all();
        self.system.refresh_memory();
        self.disks.refresh(true);
        self.networks.refresh(true);

        self.read_cpu(out);
        self.read_memory(out);
        self.read_disks(out);
        self.read_network(out);
    }

    fn read_cpu(&self, out: &mut Vec<Sensor>) {
        let marca = self
            .system
            .cpus()
            .first()
            .map(|c| c.brand().trim().to_string())
            .filter(|b| !b.is_empty())
            .unwrap_or_else(|| "CPU".to_string());

        out.push(Sensor {
            id: "/native/cpu/load".into(),
            name: "Carga total".into(),
            hardware: marca.clone(),
            category: SensorCategory::Cpu,
            kind: SensorKind::Load,
            value: f64::from(self.system.global_cpu_usage()),
            unit: "%".into(),
            min: Some(0.0),
            max: Some(100.0),
            source: SensorSource::Native,
        });

        for (i, cpu) in self.system.cpus().iter().enumerate() {
            out.push(Sensor {
                id: format!("/native/cpu/load/{i}"),
                name: format!("Nucleo {i}"),
                hardware: marca.clone(),
                category: SensorCategory::Cpu,
                kind: SensorKind::Load,
                value: f64::from(cpu.cpu_usage()),
                unit: "%".into(),
                min: Some(0.0),
                max: Some(100.0),
                source: SensorSource::Native,
            });
        }

        // La frecuencia se toma del primer nucleo: en la practica todos los
        // nucleos de un mismo cluster reportan lo mismo, y publicar 32 sensores
        // de reloj identicos solo ensuciaria el selector de la UI.
        if let Some(freq) = self.system.cpus().first().map(sysinfo::Cpu::frequency) {
            if freq > 0 {
                out.push(Sensor {
                    id: "/native/cpu/clock".into(),
                    name: "Frecuencia".into(),
                    hardware: marca,
                    category: SensorCategory::Cpu,
                    kind: SensorKind::Clock,
                    value: freq as f64,
                    unit: "MHz".into(),
                    min: None,
                    max: None,
                    source: SensorSource::Native,
                });
            }
        }
    }

    fn read_memory(&self, out: &mut Vec<Sensor>) {
        let total = self.system.total_memory();
        let usada = self.system.used_memory();

        if total > 0 {
            out.push(Sensor {
                id: "/native/memory/load".into(),
                name: "Memoria usada".into(),
                hardware: "Memoria".into(),
                category: SensorCategory::Memory,
                kind: SensorKind::Load,
                value: usada as f64 / total as f64 * 100.0,
                unit: "%".into(),
                min: Some(0.0),
                max: Some(100.0),
                source: SensorSource::Native,
            });
        }

        for (id, nombre, bytes) in [
            ("/native/memory/used", "Memoria usada", usada),
            (
                "/native/memory/available",
                "Memoria disponible",
                self.system.available_memory(),
            ),
        ] {
            out.push(Sensor {
                id: id.into(),
                name: nombre.into(),
                hardware: "Memoria".into(),
                category: SensorCategory::Memory,
                kind: SensorKind::Data,
                value: bytes as f64 / GIB,
                unit: "GB".into(),
                min: None,
                max: Some(total as f64 / GIB),
                source: SensorSource::Native,
            });
        }

        let swap_total = self.system.total_swap();
        if swap_total > 0 {
            out.push(Sensor {
                id: "/native/swap/load".into(),
                name: "Archivo de paginacion".into(),
                hardware: "Memoria".into(),
                category: SensorCategory::Memory,
                kind: SensorKind::Load,
                value: self.system.used_swap() as f64 / swap_total as f64 * 100.0,
                unit: "%".into(),
                min: Some(0.0),
                max: Some(100.0),
                source: SensorSource::Native,
            });
        }
    }

    fn read_disks(&self, out: &mut Vec<Sensor>) {
        for disco in self.disks.list() {
            let total = disco.total_space();
            if total == 0 {
                continue; // unidades extraibles vacias
            }
            let libre = disco.available_space();
            let usado = total.saturating_sub(libre);

            // El punto de montaje ("C:\\") es mucho mas estable como ID que el
            // indice en la lista, que cambia al conectar un USB.
            let montaje = disco.mount_point().to_string_lossy();
            let clave = montaje.trim_end_matches(['\\', '/']).replace(':', "");
            let etiqueta = disco.name().to_string_lossy();
            let hardware = if etiqueta.trim().is_empty() {
                format!("Disco {montaje}")
            } else {
                format!("{} ({montaje})", etiqueta.trim())
            };

            out.push(Sensor {
                id: format!("/native/disk/{clave}/load"),
                name: "Espacio usado".into(),
                hardware: hardware.clone(),
                category: SensorCategory::Storage,
                kind: SensorKind::Load,
                value: usado as f64 / total as f64 * 100.0,
                unit: "%".into(),
                min: Some(0.0),
                max: Some(100.0),
                source: SensorSource::Native,
            });

            out.push(Sensor {
                id: format!("/native/disk/{clave}/free"),
                name: "Espacio libre".into(),
                hardware,
                category: SensorCategory::Storage,
                kind: SensorKind::Data,
                value: libre as f64 / GIB,
                unit: "GB".into(),
                min: Some(0.0),
                max: Some(total as f64 / GIB),
                source: SensorSource::Native,
            });
        }
    }

    fn read_network(&mut self, out: &mut Vec<Sensor>) {
        // `received()`/`transmitted()` devuelven bytes acumulados **desde el
        // refresco anterior**, no una tasa. Sin dividir por el tiempo real
        // transcurrido, el numero dependeria de cada cuanto se consulta.
        let ahora = Instant::now();
        let segundos = self
            .last_net_sample
            .map(|t| ahora.duration_since(t).as_secs_f64());
        self.last_net_sample = Some(ahora);

        // En la primera lectura no hay intervalo previo con el que comparar.
        let Some(segundos) = segundos.filter(|s| *s > 0.0) else {
            return;
        };

        for (nombre, datos) in self.networks.list() {
            let rx = datos.received();
            let tx = datos.transmitted();
            // Las interfaces virtuales (Hyper-V, VPN, loopback) son legion y casi
            // siempre estan a cero. Se publican solo las que tuvieron trafico.
            if rx == 0 && tx == 0 {
                continue;
            }
            let clave = sanear_id(nombre);

            for (sufijo, etiqueta, bytes) in [("rx", "Descarga", rx), ("tx", "Subida", tx)] {
                out.push(Sensor {
                    id: format!("/native/network/{clave}/{sufijo}"),
                    name: etiqueta.into(),
                    hardware: nombre.clone(),
                    category: SensorCategory::Other,
                    kind: SensorKind::Throughput,
                    value: bytes as f64 / segundos / 1024.0,
                    unit: "KB/s".into(),
                    min: Some(0.0),
                    max: None,
                    source: SensorSource::Native,
                });
            }
        }
    }
}

impl Default for NativeReader {
    fn default() -> Self {
        Self::new()
    }
}

/// Vuelve utilizable como ID un nombre de interfaz, que en Windows puede traer
/// espacios, parentesis y acentos ("Ethernet 2", "Wi-Fi (Intel(R) AX210)").
///
/// Solo importa que sea **estable y sin barras**: una barra partiria la ruta del
/// ID y haria que dos interfaces distintas pudieran generar el mismo.
fn sanear_id(nombre: &str) -> String {
    nombre
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanear_quita_barras_y_espacios() {
        assert_eq!(sanear_id("Ethernet 2"), "ethernet-2");
        assert_eq!(sanear_id("Wi-Fi (Intel)"), "wi-fi--intel-");
        // Lo critico: nada de barras, que romperian la estructura del ID.
        assert!(!sanear_id("a/b\\c").contains('/'));
    }

    #[test]
    fn lee_cpu_y_memoria_del_equipo_real() {
        let mut r = NativeReader::new();
        let mut v = Vec::new();
        r.read_into(&mut v);

        let carga = v
            .iter()
            .find(|s| s.id == "/native/cpu/load")
            .expect("siempre tiene que haber carga de CPU");
        assert!(
            (0.0..=100.0).contains(&carga.value),
            "carga fuera de rango: {}",
            carga.value
        );

        let mem = v
            .iter()
            .find(|s| s.id == "/native/memory/load")
            .expect("siempre tiene que haber uso de memoria");
        assert!(mem.value > 0.0, "un equipo encendido usa algo de memoria");
        assert!(mem.value <= 100.0);
    }

    #[test]
    fn hay_un_sensor_de_carga_por_nucleo() {
        let mut r = NativeReader::new();
        let mut v = Vec::new();
        r.read_into(&mut v);

        let nucleos = v
            .iter()
            .filter(|s| s.id.starts_with("/native/cpu/load/"))
            .count();
        assert!(nucleos > 0, "no se detecto ningun nucleo");
    }

    #[test]
    fn la_red_necesita_dos_muestras_para_dar_una_tasa() {
        // La primera lectura no puede producir throughput: no hay intervalo
        // anterior. Publicar bytes crudos como si fueran KB/s daria un pico
        // falso enorme en el primer refresco.
        let mut r = NativeReader::new();
        let mut v = Vec::new();
        r.read_into(&mut v);
        assert!(!v.iter().any(|s| s.id.starts_with("/native/network/")));

        std::thread::sleep(std::time::Duration::from_millis(60));
        let mut v2 = Vec::new();
        r.read_into(&mut v2);
        for s in v2.iter().filter(|s| s.id.starts_with("/native/network/")) {
            assert!(s.value >= 0.0, "tasa negativa en {}", s.id);
        }
    }
}
