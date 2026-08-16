//! Nivel 2 — LibreHardwareMonitor externo (opcional).
//!
//! LHM publica su arbol completo de sensores en `http://host:puerto/data.json`
//! cuando se activa "Run Web Server" en sus ajustes. Aporta lo unico que el
//! nivel 1 no puede leer sin un driver de kernel: **temperatura del paquete de
//! CPU, voltajes y ventiladores de la placa**.
//!
//! # Que cambio respecto a la version Electron
//!
//! Antes LHM se **empaquetaba** (~19 MB de .NET) y la app lo lanzaba sola, a
//! veces pidiendo UAC. Eso pesaba mas que toda esta aplicacion junta, complicaba
//! el arranque con Windows y hacia que un fallo de LHM se viera como un fallo de
//! VirtualDeck.
//!
//! Ahora es estrictamente opcional y **desactivado por defecto**: si el usuario
//! ya tiene LHM corriendo, lo activa en ajustes y sus sensores se suman a los
//! nativos. Si no, no se entera de que existe. Tampoco se lanza el proceso ni se
//! registran reservas de URL con `netsh`: eso era compensar el empaquetado, y sin
//! empaquetado no hace falta.

use std::collections::HashSet;
use std::time::{Duration, Instant};

use serde_json::Value;

use super::{Sensor, SensorCategory, SensorKind, SensorSource};

/// LHM tarda en responder cuando esta arrancando en frio. Pasado este tiempo se
/// prefiere devolver la ultima lectura conocida antes que bloquear la UI.
const TIMEOUT: Duration = Duration::from_secs(4);

/// Tras un fallo, cuanto esperar antes de volver a intentarlo.
///
/// Sin esto, tener LHM activado en los ajustes pero **no** corriendo — que es el
/// estado por defecto de cualquiera que lo desinstale o no lo arranque — hace que
/// cada refresco pague el coste de un intento de conexion fallido. Medido en el
/// equipo de desarrollo: 2,6 s por refresco, con el widget pidiendo uno por
/// segundo. La interfaz quedaria a tirones por un servicio opcional que ni
/// siquiera esta instalado.
const REINTENTO_TRAS_FALLO: Duration = Duration::from_secs(15);

pub struct LhmClient {
    enabled: bool,
    host: String,
    port: u16,
    allowed: HashSet<SensorCategory>,
    connected: bool,
    error: Option<String>,
    /// Ultima lectura buena. Si LHM tiene un hipo puntual se reutiliza, para que
    /// el widget no parpadee a "sin datos" y vuelva un segundo despues.
    cache: Vec<Sensor>,
    /// Cuando fallo el ultimo intento, para aplicar [`REINTENTO_TRAS_FALLO`].
    ultimo_fallo: Option<Instant>,
}

impl LhmClient {
    pub fn new() -> Self {
        Self {
            enabled: false,
            host: "127.0.0.1".into(),
            port: 8085,
            allowed: super::default_categories().into_iter().collect(),
            connected: false,
            error: None,
            cache: Vec::new(),
            ultimo_fallo: None,
        }
    }

    pub fn configure(&mut self, s: &crate::config::model::SensorsSettings) {
        let antes = (self.enabled, self.host.clone(), self.port);
        self.enabled = s.enabled;
        if !s.host.trim().is_empty() {
            self.host = s.host.clone();
        }
        if s.port > 0 {
            self.port = s.port;
        }
        if let Some(cats) = &s.categories {
            if !cats.is_empty() {
                self.allowed = cats.iter().copied().collect();
            }
        }
        // Si el usuario acaba de cambiar host/puerto o de activar el nivel 2, lo
        // razonable es que el siguiente refresco lo intente ya, sin esperar a que
        // venza la espera de reintento del destino anterior.
        if antes != (self.enabled, self.host.clone(), self.port) {
            self.ultimo_fallo = None;
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn is_connected(&self) -> bool {
        self.connected
    }

    pub fn error(&self) -> Option<&str> {
        self.error.as_deref()
    }

    pub fn allowed_categories(&self) -> &HashSet<SensorCategory> {
        &self.allowed
    }

    pub fn read_into(&mut self, out: &mut Vec<Sensor>) {
        if !self.enabled {
            self.connected = false;
            return;
        }
        let en_espera = self
            .ultimo_fallo
            .is_some_and(|t| t.elapsed() < REINTENTO_TRAS_FALLO);

        if !en_espera {
            match self.fetch() {
                Ok(arbol) => {
                    let mut v = Vec::new();
                    aplanar(&arbol, 0, "", SensorCategory::Other, &mut v);
                    self.connected = true;
                    self.error = None;
                    self.ultimo_fallo = None;
                    self.cache = v;
                }
                Err(e) => {
                    self.connected = false;
                    self.error = Some(e);
                    self.ultimo_fallo = Some(Instant::now());
                    // Se conserva `cache` a proposito: ver el comentario del campo.
                }
            }
        }
        out.extend(self.cache.iter().cloned());
    }

    /// Comprueba la conexion ahora mismo, sin cache ni espera de reintento. Es lo
    /// que hay detras del boton de diagnostico en los ajustes: si el usuario
    /// acaba de arrancar LHM y pulsa "probar", tiene que intentarlo de verdad.
    pub fn probe(&mut self) -> Result<usize, String> {
        if !self.enabled {
            return Err("El nivel 2 (LibreHardwareMonitor) esta desactivado".into());
        }
        self.ultimo_fallo = None;
        let arbol = self.fetch().inspect_err(|_| {
            self.ultimo_fallo = Some(Instant::now());
        })?;
        let mut v = Vec::new();
        aplanar(&arbol, 0, "", SensorCategory::Other, &mut v);
        self.connected = true;
        self.error = None;
        let n = v.len();
        self.cache = v;
        Ok(n)
    }

    pub fn url(&self) -> String {
        format!("http://{}:{}/data.json", self.host, self.port)
    }

    fn fetch(&self) -> Result<Value, String> {
        let cuerpo = crate::net::get_text(&self.url(), TIMEOUT)
            .map_err(|e| format!("LibreHardwareMonitor: {e}"))?;
        serde_json::from_str(&cuerpo).map_err(|e| format!("JSON invalido: {e}"))
    }
}

impl Default for LhmClient {
    fn default() -> Self {
        Self::new()
    }
}

/// Interpreta un valor de LHM, que llega como texto con unidad: `"45.0 °C"`,
/// `"1234 RPM"`, `"1.250 V"`, `"85 %"`, `"3500 MHz"`.
///
/// En equipos con configuracion regional europea LHM emite coma decimal
/// (`"45,0 °C"`), asi que se normaliza antes de convertir.
fn parsear_valor(raw: Option<&str>) -> Option<(f64, String)> {
    let raw = raw?.trim().replace(',', ".");
    let mut num_fin = 0;
    let bytes = raw.as_bytes();
    if bytes.first() == Some(&b'-') {
        num_fin = 1;
    }
    while num_fin < bytes.len() && (bytes[num_fin].is_ascii_digit() || bytes[num_fin] == b'.') {
        num_fin += 1;
    }
    if num_fin == 0 || (num_fin == 1 && bytes[0] == b'-') {
        return None;
    }
    let valor: f64 = raw[..num_fin].parse().ok()?;
    if !valor.is_finite() {
        return None;
    }
    Some((valor, raw[num_fin..].trim().to_string()))
}

/// Deduce la categoria a partir del icono que LHM asocia al nodo de hardware.
/// Los nombres de archivo son estables entre versiones de LHM.
fn categoria_por_imagen(image: Option<&str>) -> SensorCategory {
    let Some(f) = image.map(str::to_lowercase) else {
        return SensorCategory::Other;
    };
    if f.contains("cpu") {
        SensorCategory::Cpu
    } else if f.contains("amd") || f.contains("nvidia") || f.contains("gpu") {
        SensorCategory::Gpu
    } else if f.contains("mainboard") || f.contains("motherboard") || f.contains("chip") {
        SensorCategory::Mainboard
    } else if f.contains("ram") || f.contains("memory") {
        SensorCategory::Memory
    } else if f.contains("hdd") || f.contains("ssd") || f.contains("nvme") || f.contains("storage")
    {
        SensorCategory::Storage
    } else {
        SensorCategory::Other
    }
}

/// Respaldo para builds viejas de LHM que no traen `ImageURL` en el nodo de
/// hardware: se deduce por el nombre del componente.
fn categoria_por_nombre(nombre: &str) -> SensorCategory {
    let n = nombre.to_lowercase();
    let tiene = |ps: &[&str]| ps.iter().any(|p| n.contains(p));

    if tiene(&["ryzen", "core i", "xeon", "threadripper", "processor"]) || n.starts_with("cpu") {
        SensorCategory::Cpu
    } else if tiene(&[
        "geforce", "radeon", "rtx", "gtx", "quadro", "nvidia", "graphics",
    ]) || n.starts_with("gpu")
    {
        SensorCategory::Gpu
    } else if tiene(&["mainboard", "chipset", "prime", "tuf", "rog"]) || n.starts_with("board") {
        SensorCategory::Mainboard
    } else if tiene(&["memory", "ddr3", "ddr4", "ddr5"]) || n.contains("ram") {
        SensorCategory::Memory
    } else if tiene(&[
        "nvme", "ssd", "hdd", "samsung", "kingston", "crucial", "seagate", "toshiba",
    ]) {
        SensorCategory::Storage
    } else {
        SensorCategory::Other
    }
}

/// Recorre el arbol de LHM aplanandolo a una lista.
///
/// La estructura es `raiz -> "Computer" -> hardware -> tipo -> hoja`, asi que el
/// nombre del componente esta a profundidad 2 y se arrastra hacia abajo.
fn aplanar(
    nodo: &Value,
    profundidad: usize,
    hardware: &str,
    categoria: SensorCategory,
    out: &mut Vec<Sensor>,
) {
    let mut hw = hardware.to_string();
    let mut cat = categoria;

    let texto = nodo.get("Text").and_then(Value::as_str);
    let sensor_id = nodo.get("SensorId").and_then(Value::as_str);

    if profundidad == 2 && sensor_id.is_none() {
        if let Some(t) = texto {
            hw = t.to_string();
            let por_img = categoria_por_imagen(nodo.get("ImageURL").and_then(Value::as_str));
            cat = if por_img == SensorCategory::Other {
                categoria_por_nombre(&hw)
            } else {
                por_img
            };
        }
    }

    if let (Some(id), Some(tipo)) = (sensor_id, nodo.get("Type").and_then(Value::as_str)) {
        if let Some((valor, unidad)) = parsear_valor(nodo.get("Value").and_then(Value::as_str)) {
            out.push(Sensor {
                id: id.to_string(),
                name: texto.unwrap_or(id).to_string(),
                hardware: hw.clone(),
                category: cat,
                kind: SensorKind::from_lhm(tipo),
                value: valor,
                unit: unidad,
                min: parsear_valor(nodo.get("Min").and_then(Value::as_str)).map(|(v, _)| v),
                max: parsear_valor(nodo.get("Max").and_then(Value::as_str)).map(|(v, _)| v),
                source: SensorSource::Lhm,
            });
        }
    }

    if let Some(hijos) = nodo.get("Children").and_then(Value::as_array) {
        for h in hijos {
            aplanar(h, profundidad + 1, &hw, cat, out);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parsea_valores_con_unidad() {
        assert_eq!(parsear_valor(Some("45.0 °C")), Some((45.0, "°C".into())));
        assert_eq!(
            parsear_valor(Some("1234 RPM")),
            Some((1234.0, "RPM".into()))
        );
        assert_eq!(parsear_valor(Some("85 %")), Some((85.0, "%".into())));
        assert_eq!(
            parsear_valor(Some("3500 MHz")),
            Some((3500.0, "MHz".into()))
        );
    }

    #[test]
    fn acepta_coma_decimal() {
        // LHM usa la configuracion regional del equipo. Con locale europeo, un
        // parser que solo entienda el punto leeria "45,0 °C" como 45 y perderia
        // el decimal, o peor, fallaria.
        assert_eq!(parsear_valor(Some("45,5 °C")), Some((45.5, "°C".into())));
    }

    #[test]
    fn parsea_negativos_y_rechaza_basura() {
        assert_eq!(parsear_valor(Some("-12.5 V")), Some((-12.5, "V".into())));
        assert_eq!(parsear_valor(None), None);
        assert_eq!(parsear_valor(Some("")), None);
        assert_eq!(parsear_valor(Some("-")), None);
        assert_eq!(parsear_valor(Some("N/A")), None);
    }

    #[test]
    fn aplana_un_arbol_de_lhm() {
        // Recorte fiel de un /data.json real, con la anidacion que importa:
        // raiz -> Computer -> hardware -> tipo -> hoja.
        let json = serde_json::json!({
            "Text": "Sensor", "Children": [{
                "Text": "MI-PC", "Children": [{
                    "Text": "AMD Ryzen 9 7950X",
                    "ImageURL": "images/cpu.png",
                    "Children": [{
                        "Text": "Temperatures", "Children": [{
                            "SensorId": "/amdcpu/0/temperature/0",
                            "Type": "Temperature",
                            "Text": "Core (Tctl/Tdie)",
                            "Value": "52.4 °C",
                            "Min": "38.0 °C",
                            "Max": "81.2 °C"
                        }]
                    }]
                }]
            }]
        });

        let mut v = Vec::new();
        aplanar(&json, 0, "", SensorCategory::Other, &mut v);

        assert_eq!(v.len(), 1);
        let s = &v[0];
        assert_eq!(s.id, "/amdcpu/0/temperature/0");
        assert_eq!(s.name, "Core (Tctl/Tdie)");
        // El nombre del componente tiene que haber bajado dos niveles hasta la hoja.
        assert_eq!(s.hardware, "AMD Ryzen 9 7950X");
        assert_eq!(s.category, SensorCategory::Cpu);
        assert_eq!(s.kind, SensorKind::Temperature);
        assert_eq!(s.value, 52.4);
        assert_eq!(s.unit, "°C");
        assert_eq!(s.max, Some(81.2));
        assert_eq!(s.source, SensorSource::Lhm);
    }

    #[test]
    fn deduce_categoria_sin_imageurl() {
        assert_eq!(
            categoria_por_nombre("NVIDIA GeForce RTX 4080"),
            SensorCategory::Gpu
        );
        assert_eq!(
            categoria_por_nombre("ROG STRIX Z690-A"),
            SensorCategory::Mainboard
        );
        assert_eq!(
            categoria_por_nombre("Samsung SSD 980 PRO"),
            SensorCategory::Storage
        );
        assert_eq!(
            categoria_por_nombre("Generic Memory"),
            SensorCategory::Memory
        );
        assert_eq!(categoria_por_nombre("Cosa rara"), SensorCategory::Other);
    }

    /// Ajustes apuntando a un puerto donde con toda seguridad no hay nada.
    fn ajustes_hacia_la_nada() -> crate::config::model::SensorsSettings {
        crate::config::model::SensorsSettings {
            enabled: true,
            host: "127.0.0.1".into(),
            // Puerto alto y arbitrario: si algo escuchara aqui, el test se
            // volveria ruidoso, no incorrecto.
            port: 59_231,
            ..Default::default()
        }
    }

    #[test]
    fn un_lhm_caido_no_se_reintenta_en_cada_refresco() {
        // Es el estado por defecto de cualquiera que tenga el nivel 2 activado
        // pero LHM cerrado. Sin espera entre reintentos, cada refresco paga un
        // intento de conexion fallido y la interfaz va a tirones.
        let mut c = LhmClient::new();
        c.configure(&ajustes_hacia_la_nada());

        let mut v = Vec::new();
        c.read_into(&mut v);
        assert!(!c.is_connected());
        let primer_fallo = c.ultimo_fallo.expect("el fallo tiene que quedar anotado");

        // Los refrescos siguientes tienen que ser practicamente gratis.
        let t = std::time::Instant::now();
        for _ in 0..20 {
            c.read_into(&mut Vec::new());
        }
        assert!(
            t.elapsed() < std::time::Duration::from_millis(100),
            "20 refrescos con LHM caido tardaron {:?}: se esta reintentando cada vez",
            t.elapsed()
        );
        assert_eq!(
            c.ultimo_fallo,
            Some(primer_fallo),
            "no deberia haber vuelto a intentarlo"
        );
    }

    #[test]
    fn cambiar_de_destino_permite_reintentar_ya() {
        // Si el usuario corrige el puerto en los ajustes, no tiene sentido
        // hacerle esperar a que venza el reintento del puerto anterior.
        let mut c = LhmClient::new();
        c.configure(&ajustes_hacia_la_nada());
        c.read_into(&mut Vec::new());
        assert!(c.ultimo_fallo.is_some());

        let mut otros = ajustes_hacia_la_nada();
        otros.port = 59_232;
        c.configure(&otros);
        assert!(c.ultimo_fallo.is_none());
    }

    #[test]
    fn desactivado_no_intenta_conectarse() {
        let mut c = LhmClient::new();
        let mut v = Vec::new();
        c.read_into(&mut v);
        assert!(v.is_empty());
        assert!(!c.is_connected());
        // Sin intento no hay error que reportar: desactivado no es un fallo.
        assert!(c.error().is_none());
    }
}
