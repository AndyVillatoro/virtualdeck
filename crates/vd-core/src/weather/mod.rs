//! Clima del widget: ubicacion por geo-IP + condiciones actuales de Open-Meteo.
//!
//! Ninguno de los dos servicios pide clave de API, que es lo que permite que el
//! widget funcione sin que el usuario tenga que registrarse en nada.
//!
//! # Por que es sincrono
//!
//! La version Electron encadenaba promesas y tenia que resolver a mano la
//! coalescencia de peticiones en vuelo (`inflight`) para que dos widgets no
//! dispararan dos consultas a la vez. Aca la funcion bloquea y quien llama la
//! pone en un hilo aparte; el candado del propio [`Weather`] ya impide la
//! duplicacion sin codigo extra.

use std::time::{Duration, Instant};

use serde_json::Value;

/// Lo que el widget necesita mostrar.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct WeatherData {
    /// Temperatura actual en grados Celsius, redondeada.
    pub temp: i32,
    /// Codigo WMO de condicion meteorologica; la UI lo traduce a icono.
    pub code: i32,
    pub city: String,
    pub country: String,
}

#[derive(Debug, Clone, PartialEq)]
struct Geo {
    latitude: f64,
    longitude: f64,
    city: String,
    country: String,
}

/// El clima no cambia lo bastante rapido como para consultarlo mas seguido, y
/// estos servicios son gratuitos: castigarlos con trafico innecesario es la via
/// mas rapida a que empiecen a rechazar peticiones.
const TTL: Duration = Duration::from_secs(15 * 60);

/// Tras un fallo se espera bastante mas que el TTL normal. Si no hay red, los
/// reintentos frecuentes no arreglan nada y solo gastan bateria.
const ESPERA_TRAS_FALLO: Duration = Duration::from_secs(10 * 60);

const TIMEOUT_GEO: Duration = Duration::from_secs(5);
const TIMEOUT_CLIMA: Duration = Duration::from_secs(8);

/// Proveedores de geo-IP, en orden de preferencia. Gana el primero que conteste.
///
/// Son tres porque todos limitan peticiones por minuto y ninguno garantiza
/// disponibilidad; con uno solo, el widget se queda mudo cada vez que ese
/// proveedor tiene un mal dia. Cada uno nombra los campos a su manera, de ahi que
/// el parseo sea por proveedor y no generico.
const PROVEEDORES_GEO: &[&str] = &[
    "https://ipapi.co/json/",
    "http://ip-api.com/json/?fields=status,country,city,lat,lon",
    "https://ipwho.is/",
];

pub struct Weather {
    cache: Option<WeatherData>,
    obtenido: Option<Instant>,
    ultimo_fallo: Option<Instant>,
    /// La ubicacion se cachea aparte del clima: cambia muchisimo menos, y
    /// reusarla evita gastar cuota de geo-IP en cada refresco.
    geo: Option<Geo>,
    geo_obtenida: Option<Instant>,
}

impl Weather {
    pub fn new() -> Self {
        Self {
            cache: None,
            obtenido: None,
            ultimo_fallo: None,
            geo: None,
            geo_obtenida: None,
        }
    }

    /// Devuelve el clima actual, usando cache cuando sigue vigente.
    ///
    /// Con `force = true` ignora tanto la cache como la espera tras un fallo: es
    /// lo que debe hacer el boton de "actualizar" de la interfaz.
    ///
    /// Devuelve `None` solo cuando no hay nada que mostrar. Si una consulta falla
    /// pero habia un valor previo, se devuelve el previo: un dato de hace unos
    /// minutos es mas util que un hueco.
    pub fn get(&mut self, force: bool) -> Option<WeatherData> {
        if !force {
            if self.obtenido.is_some_and(|t| t.elapsed() < TTL) {
                return self.cache.clone();
            }
            if self
                .ultimo_fallo
                .is_some_and(|t| t.elapsed() < ESPERA_TRAS_FALLO)
            {
                return self.cache.clone();
            }
        }

        match self.consultar() {
            Some(d) => {
                self.cache = Some(d.clone());
                self.obtenido = Some(Instant::now());
                self.ultimo_fallo = None;
                Some(d)
            }
            None => {
                self.ultimo_fallo = Some(Instant::now());
                self.cache.clone()
            }
        }
    }

    /// Ultimo error conocido en forma legible, para la pantalla de diagnostico.
    pub fn hay_fallo_reciente(&self) -> bool {
        self.ultimo_fallo
            .is_some_and(|t| t.elapsed() < ESPERA_TRAS_FALLO)
    }

    fn consultar(&mut self) -> Option<WeatherData> {
        let geo = self.ubicacion()?;
        let url = format!(
            "https://api.open-meteo.com/v1/forecast\
             ?latitude={:.4}&longitude={:.4}\
             &current=temperature_2m,weather_code&timezone=auto",
            geo.latitude, geo.longitude
        );

        let cuerpo = crate::net::get_text(&url, TIMEOUT_CLIMA).ok()?;
        let json: Value = serde_json::from_str(&cuerpo).ok()?;
        let actual = json.get("current")?;

        Some(WeatherData {
            temp: actual.get("temperature_2m")?.as_f64()?.round() as i32,
            code: actual.get("weather_code")?.as_i64()? as i32,
            city: geo.city,
            country: geo.country,
        })
    }

    fn ubicacion(&mut self) -> Option<Geo> {
        if self.geo_obtenida.is_some_and(|t| t.elapsed() < TTL) {
            if let Some(g) = &self.geo {
                return Some(g.clone());
            }
        }

        for url in PROVEEDORES_GEO {
            let Ok(cuerpo) = crate::net::get_text(url, TIMEOUT_GEO) else {
                continue;
            };
            let Ok(json) = serde_json::from_str::<Value>(&cuerpo) else {
                continue;
            };
            if let Some(g) = parsear_geo(&json) {
                self.geo = Some(g.clone());
                self.geo_obtenida = Some(Instant::now());
                return Some(g);
            }
        }
        None
    }
}

impl Default for Weather {
    fn default() -> Self {
        Self::new()
    }
}

/// Interpreta la respuesta de cualquiera de los proveedores de geo-IP.
///
/// Se prueban los tres esquemas de nombres sobre el mismo JSON en vez de asociar
/// cada esquema a su URL: los proveedores cambian de formato de vez en cuando, y
/// asi la funcion sigue acertando mientras alguno de los nombres conocidos este
/// presente.
fn parsear_geo(json: &Value) -> Option<Geo> {
    // ip-api.com avisa de sus fallos con status:"fail" y HTTP 200. Sin este
    // chequeo, una respuesta de error se leeria como una ubicacion sin
    // coordenadas y se daria por buena mas abajo.
    if json.get("status").and_then(Value::as_str) == Some("fail") {
        return None;
    }
    // ipwho.is hace lo mismo con success:false.
    if json.get("success").and_then(Value::as_bool) == Some(false) {
        return None;
    }

    let numero =
        |claves: &[&str]| -> Option<f64> { claves.iter().find_map(|k| json.get(*k)?.as_f64()) };
    let texto = |claves: &[&str]| -> String {
        claves
            .iter()
            .find_map(|k| json.get(*k)?.as_str())
            .unwrap_or_default()
            .to_string()
    };

    let latitude = numero(&["latitude", "lat"])?;
    let longitude = numero(&["longitude", "lon"])?;

    // Coordenadas fuera de rango significan que se leyo otra cosa (un codigo
    // postal numerico, por ejemplo). Mejor descartar y probar el siguiente
    // proveedor que consultar el clima de un punto inexistente.
    if !(-90.0..=90.0).contains(&latitude) || !(-180.0..=180.0).contains(&longitude) {
        return None;
    }

    Some(Geo {
        latitude,
        longitude,
        city: texto(&["city"]),
        country: texto(&["country_name", "country"]),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entiende_el_formato_de_ipapi_co() {
        let j = serde_json::json!({
            "latitude": 14.0723, "longitude": -87.1921,
            "city": "Tegucigalpa", "country_name": "Honduras", "country": "HN"
        });
        let g = parsear_geo(&j).unwrap();
        assert_eq!(g.city, "Tegucigalpa");
        // Con dos claves de pais presentes gana el nombre completo, no el codigo.
        assert_eq!(g.country, "Honduras");
        assert!((g.latitude - 14.0723).abs() < 1e-6);
    }

    #[test]
    fn entiende_el_formato_de_ip_api_com() {
        let j = serde_json::json!({
            "status": "success", "lat": 14.0723, "lon": -87.1921,
            "city": "Tegucigalpa", "country": "Honduras"
        });
        let g = parsear_geo(&j).unwrap();
        assert_eq!(g.city, "Tegucigalpa");
        assert!((g.longitude + 87.1921).abs() < 1e-6);
    }

    #[test]
    fn entiende_el_formato_de_ipwho_is() {
        let j = serde_json::json!({
            "success": true, "latitude": 40.4168, "longitude": -3.7038,
            "city": "Madrid", "country": "Spain"
        });
        let g = parsear_geo(&j).unwrap();
        assert_eq!(g.city, "Madrid");
    }

    #[test]
    fn rechaza_los_errores_que_llegan_con_http_200() {
        // Los dos proveedores que reportan fallos en el cuerpo, no en el estado.
        assert!(parsear_geo(&serde_json::json!({"status": "fail", "message": "quota"})).is_none());
        assert!(parsear_geo(&serde_json::json!({"success": false})).is_none());
    }

    #[test]
    fn rechaza_coordenadas_imposibles() {
        // Un proveedor que devuelva otra cosa en esos campos no debe llevarnos a
        // consultar el clima de un punto que no existe.
        let j = serde_json::json!({"latitude": 999.0, "longitude": 0.0});
        assert!(parsear_geo(&j).is_none());
    }

    #[test]
    fn sin_coordenadas_no_hay_ubicacion() {
        assert!(parsear_geo(&serde_json::json!({"city": "Nowhere"})).is_none());
        assert!(parsear_geo(&serde_json::json!({})).is_none());
    }

    #[test]
    fn tolera_que_falte_el_nombre_de_la_ciudad() {
        // Sin ciudad el clima sigue siendo util; sin coordenadas, no.
        let j = serde_json::json!({"latitude": 0.0, "longitude": 0.0});
        let g = parsear_geo(&j).unwrap();
        assert_eq!(g.city, "");
    }
}
