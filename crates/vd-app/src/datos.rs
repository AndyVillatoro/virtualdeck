//! Datos en vivo para los widgets: sensores, clima y reproducción.
//!
//! # Por qué hay un hilo aparte
//!
//! Los tres tienen costes muy distintos y ninguno es gratis en el hilo de
//! dibujo. Un refresco de sensores son ~9 ms: hacerlo en cada fotograma limitaría
//! la interfaz a unos 110 fps por sí solo. El clima es una petición HTTP que
//! puede tardar segundos. La sesión de reproducción se consulta por WinRT.
//!
//! Así que un único hilo los sondea a su propio ritmo y publica instantáneas por
//! un canal. La interfaz siempre dibuja lo último que llegó, sin esperar a nadie.
//!
//! Cada dato tiene su periodo, y no son caprichosos: los sensores cambian a cada
//! segundo, la canción no cambia tan rápido, y el clima menos aún —además de que
//! los servicios que lo dan son gratuitos y castigarlos con tráfico innecesario
//! es la vía más rápida a que empiecen a rechazar peticiones—.

use std::sync::mpsc::{Receiver, Sender};
use std::time::{Duration, Instant};

use vd_core::sensors::Sensor;

const PERIODO_SENSORES: Duration = Duration::from_secs(1);
const PERIODO_MEDIA: Duration = Duration::from_secs(3);
const PERIODO_CLIMA: Duration = Duration::from_secs(15 * 60);

/// Lo que el hilo de fondo manda cuando tiene algo nuevo.
pub enum Actualizacion {
    Sensores(Vec<Sensor>),
    Media(Option<vd_core::media::NowPlaying>),
    Clima(Option<vd_core::weather::WeatherData>),
}

/// Última instantánea conocida de cada dato.
#[derive(Default)]
pub struct Datos {
    pub sensores: Vec<Sensor>,
    pub media: Option<vd_core::media::NowPlaying>,
    pub clima: Option<vd_core::weather::WeatherData>,
    receptor: Option<Receiver<Actualizacion>>,
}

impl Datos {
    /// Arranca el hilo de sondeo.
    ///
    /// `ajustes` decide si se consulta también LibreHardwareMonitor.
    pub fn arrancar(ajustes: Option<vd_core::config::model::SensorsSettings>) -> Self {
        let (emisor, receptor) = std::sync::mpsc::channel();
        std::thread::spawn(move || sondear(emisor, ajustes));

        Self {
            receptor: Some(receptor),
            ..Default::default()
        }
    }

    /// Recoge lo que haya llegado. Se llama una vez por fotograma y no bloquea.
    pub fn recoger(&mut self) {
        let Some(rx) = self.receptor.as_ref() else {
            return;
        };
        while let Ok(a) = rx.try_recv() {
            match a {
                Actualizacion::Sensores(v) => self.sensores = v,
                Actualizacion::Media(m) => self.media = m,
                Actualizacion::Clima(c) => self.clima = c,
            }
        }
    }

    pub fn sensor(&self, id: &str) -> Option<&Sensor> {
        self.sensores.iter().find(|s| s.id == id)
    }
}

fn sondear(
    emisor: Sender<Actualizacion>,
    ajustes: Option<vd_core::config::model::SensorsSettings>,
) {
    let mut sensores = vd_core::sensors::Sensors::new();
    if let Some(a) = &ajustes {
        sensores.configure(a);
    }
    let mut clima = vd_core::weather::Weather::new();

    let mut ultima_media = Instant::now() - PERIODO_MEDIA;
    let mut ultimo_clima = Instant::now() - PERIODO_CLIMA;

    loop {
        // Un envío fallido significa que la aplicación se cerró y el receptor ya
        // no existe. Es la señal para terminar el hilo, no un error.
        let lista = sensores.list(false).to_vec();
        if emisor.send(Actualizacion::Sensores(lista)).is_err() {
            return;
        }

        if ultima_media.elapsed() >= PERIODO_MEDIA {
            ultima_media = Instant::now();
            if emisor
                .send(Actualizacion::Media(vd_core::media::now_playing()))
                .is_err()
            {
                return;
            }
        }

        if ultimo_clima.elapsed() >= PERIODO_CLIMA {
            ultimo_clima = Instant::now();
            if emisor.send(Actualizacion::Clima(clima.get(false))).is_err() {
                return;
            }
        }

        std::thread::sleep(PERIODO_SENSORES);
    }
}

/// Convierte el código WMO de Open-Meteo a una descripción corta.
///
/// Los códigos son un estándar de la Organización Meteorológica Mundial y vienen
/// agrupados por familias: 0 despejado, 1-3 nubosidad creciente, 45-48 niebla,
/// 51-67 llovizna y lluvia, 71-77 nieve, 80-82 chubascos, 95-99 tormenta.
pub fn descripcion_clima(codigo: i32) -> &'static str {
    match codigo {
        0 => "Despejado",
        1 => "Casi despejado",
        2 => "Parcialmente nublado",
        3 => "Nublado",
        45 | 48 => "Niebla",
        51..=57 => "Llovizna",
        61..=67 => "Lluvia",
        71..=77 => "Nieve",
        80..=82 => "Chubascos",
        85 | 86 => "Chubascos de nieve",
        95..=99 => "Tormenta",
        _ => "—",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn los_codigos_de_clima_conocidos_tienen_descripcion() {
        for c in [0, 1, 2, 3, 45, 48, 51, 61, 71, 80, 95] {
            assert_ne!(
                descripcion_clima(c),
                "—",
                "el codigo WMO {c} deberia estar cubierto"
            );
        }
    }

    #[test]
    fn un_codigo_desconocido_no_revienta() {
        assert_eq!(descripcion_clima(-1), "—");
        assert_eq!(descripcion_clima(1234), "—");
    }

    #[test]
    fn el_hilo_de_fondo_publica_sensores() {
        // Comprueba el camino completo: el hilo arranca, lee sensores reales y
        // los publica por el canal.
        let mut d = Datos::arrancar(None);
        let limite = Instant::now();
        while d.sensores.is_empty() && limite.elapsed() < Duration::from_secs(10) {
            d.recoger();
            std::thread::sleep(Duration::from_millis(50));
        }
        assert!(
            !d.sensores.is_empty(),
            "el hilo de fondo tenia que haber publicado sensores"
        );
    }

    #[test]
    fn buscar_un_sensor_inexistente_devuelve_nada() {
        let d = Datos::default();
        assert!(d.sensor("/no/existe").is_none());
    }
}
