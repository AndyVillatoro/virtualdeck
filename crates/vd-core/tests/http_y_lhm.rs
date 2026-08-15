//! Camino de exito de HTTP y del cliente de LibreHardwareMonitor.
//!
//! Los tests unitarios de `sensors::lhm` cubren el parseo y el fallo de conexion,
//! pero **no** que una respuesta buena viaje entera desde el socket hasta la lista
//! de sensores. Sin esto, cambiar de pila HTTP —que es justo lo que se hizo al
//! pasar de `ureq` a WinHTTP— se hace a ciegas.
//!
//! Levanta un servidor minimo en un puerto efimero y le sirve un recorte fiel de
//! un `/data.json` real.

use std::io::{Read, Write};
use std::net::TcpListener;

use vd_core::config::model::SensorsSettings;
use vd_core::sensors::{SensorKind, SensorSource, Sensors};

/// Arranca un servidor que responde siempre lo mismo y devuelve su puerto.
///
/// Pide el puerto 0 para que el sistema asigne uno libre: fijar un numero haria
/// que dos ejecuciones en paralelo, o cualquier proceso que ya lo tuviera, hicieran
/// fallar el test por una razon que no tiene que ver con lo que se prueba.
///
/// Atiende en bucle, no una sola vez. Un servidor de un solo `accept` parece
/// suficiente y no lo es: basta con que algo mas toque el puerto —o que el propio
/// test quiera hacer dos lecturas— para que la peticion de verdad se quede sin
/// nadie escuchando y el test falle por conexion rechazada. Ese fallo se parece
/// mucho a "el cliente HTTP no funciona", que es justo lo contrario de lo que
/// estaria pasando.
fn servir(cuerpo: &'static str, estado: &'static str) -> u16 {
    // Tras `bind`, el sistema ya encola conexiones en el backlog aunque todavia
    // no se haya llamado a `accept`. No hace falta esperar a nada.
    let listener = TcpListener::bind("127.0.0.1:0").expect("no se pudo abrir un puerto");
    let puerto = listener.local_addr().unwrap().port();

    std::thread::spawn(move || {
        for flujo in listener.incoming() {
            let Ok(mut flujo) = flujo else { continue };
            // Se lee la peticion aunque no se use: si el servidor responde y
            // cierra sin leer, Windows puede abortar la conexion con RST y el
            // cliente veria un error de red en vez de la respuesta.
            let mut buf = [0u8; 2048];
            let _ = flujo.read(&mut buf);

            let resp = format!(
                "HTTP/1.1 {estado}\r\n\
                 Content-Type: application/json\r\n\
                 Content-Length: {}\r\n\
                 Connection: close\r\n\r\n{cuerpo}",
                cuerpo.len()
            );
            let _ = flujo.write_all(resp.as_bytes());
            let _ = flujo.flush();
        }
    });

    puerto
}

const ARBOL_LHM: &str = r#"{
  "Text": "Sensor",
  "Children": [{
    "Text": "MI-PC",
    "Children": [{
      "Text": "Intel Core i5-13600KF",
      "ImageURL": "images_icon/cpu.png",
      "Children": [
        { "Text": "Temperatures", "Children": [
          { "SensorId": "/intelcpu/0/temperature/0", "Type": "Temperature",
            "Text": "CPU Package", "Value": "58.0 °C", "Min": "31.0 °C", "Max": "89.0 °C" }
        ]},
        { "Text": "Voltages", "Children": [
          { "SensorId": "/intelcpu/0/voltage/0", "Type": "Voltage",
            "Text": "CPU Core", "Value": "1.184 V", "Min": "0.702 V", "Max": "1.402 V" }
        ]}
      ]
    }]
  }]
}"#;

fn ajustes(puerto: u16) -> SensorsSettings {
    SensorsSettings {
        enabled: true,
        host: "127.0.0.1".into(),
        port: puerto,
        ..Default::default()
    }
}

#[test]
fn una_respuesta_buena_llega_entera_hasta_la_lista_de_sensores() {
    let puerto = servir(ARBOL_LHM, "200 OK");

    let mut s = Sensors::new();
    s.configure(&ajustes(puerto));

    let de_lhm: Vec<_> = s
        .list(true)
        .iter()
        .filter(|x| x.source == SensorSource::Lhm)
        .cloned()
        .collect();

    assert_eq!(
        de_lhm.len(),
        2,
        "se esperaban los 2 sensores del arbol servido"
    );

    let temp = de_lhm
        .iter()
        .find(|x| x.id == "/intelcpu/0/temperature/0")
        .expect("falta la temperatura de CPU");
    assert_eq!(temp.kind, SensorKind::Temperature);
    assert_eq!(temp.value, 58.0);
    assert_eq!(temp.unit, "°C");
    assert_eq!(temp.max, Some(89.0));
    assert_eq!(temp.hardware, "Intel Core i5-13600KF");

    // Justo lo que el nivel 1 no puede dar sin driver de kernel: por eso existe
    // el nivel 2 y por eso este camino tiene que funcionar.
    let volt = de_lhm
        .iter()
        .find(|x| x.id == "/intelcpu/0/voltage/0")
        .expect("falta el voltaje");
    assert_eq!(volt.kind, SensorKind::Voltage);
    assert_eq!(volt.value, 1.184);
}

#[test]
fn los_sensores_de_lhm_se_suman_a_los_nativos_sin_desplazarlos() {
    let puerto = servir(ARBOL_LHM, "200 OK");

    let mut s = Sensors::new();
    s.configure(&ajustes(puerto));
    let todos = s.list(true);

    assert!(
        todos.iter().any(|x| x.source == SensorSource::Native),
        "los sensores nativos tienen que seguir estando"
    );
    assert!(todos.iter().any(|x| x.source == SensorSource::Lhm));
}

#[test]
fn un_error_http_no_se_confunde_con_datos() {
    // Un 500 con cuerpo podria parsearse como un arbol vacio y reportarse como
    // "conectado, 0 sensores", que es peor que un fallo claro.
    let puerto = servir("{}", "500 Internal Server Error");

    let mut s = Sensors::new();
    s.configure(&ajustes(puerto));
    s.list(true);

    let st = s.status();
    assert!(!st.lhm_connected, "un 500 no es una conexion buena");
    let error = st.lhm_error.expect("tiene que explicar que paso");
    // Se exige que el mensaje nombre el codigo. Sin esto, el test tambien pasaria
    // si el servidor no hubiera arrancado y el fallo fuera de conexion: estaria
    // en verde sin haber probado nada de lo que dice probar.
    assert!(
        error.contains("500"),
        "el error deberia mencionar el codigo HTTP, y dice: {error}"
    );
}
