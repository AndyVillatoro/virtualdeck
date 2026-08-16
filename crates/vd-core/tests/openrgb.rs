//! Conversación completa con un servidor que habla el protocolo de OpenRGB.
//!
//! Los tests unitarios cubren el parseo del bloque de un controlador, pero no
//! que el cliente **hable bien**: que mande la cabecera correcta, negocie la
//! versión y sepa leer las respuestas. Sin esto, el cliente solo se probaría
//! teniendo OpenRGB instalado y corriendo.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

const CMD_CONTADOR: u32 = 0;
const CMD_DATOS: u32 = 1;
const CMD_VERSION: u32 = 40;
const CMD_ACTUALIZAR_LEDS: u32 = 1050;
const CMD_MODO_PERSONALIZADO: u32 = 1052;

/// Un servidor mínimo con un solo dispositivo de 3 LEDs.
///
/// Devuelve el puerto y un canal por el que publica los colores que le manden,
/// para poder comprobar que llegan bien.
fn servir() -> (u16, std::sync::mpsc::Receiver<Vec<u8>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("abrir puerto");
    let puerto = listener.local_addr().unwrap().port();
    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let Ok((mut flujo, _)) = listener.accept() else {
            return;
        };
        loop {
            let mut cabecera = [0u8; 16];
            if flujo.read_exact(&mut cabecera).is_err() {
                return;
            }
            assert_eq!(&cabecera[0..4], b"ORGB", "cabecera mal formada");
            let comando = u32::from_le_bytes(cabecera[8..12].try_into().unwrap());
            let tam = u32::from_le_bytes(cabecera[12..16].try_into().unwrap()) as usize;

            let mut datos = vec![0u8; tam];
            if flujo.read_exact(&mut datos).is_err() {
                return;
            }

            match comando {
                CMD_VERSION => responder(&mut flujo, 0, CMD_VERSION, &3u32.to_le_bytes()),
                CMD_CONTADOR => responder(&mut flujo, 0, CMD_CONTADOR, &1u32.to_le_bytes()),
                CMD_DATOS => responder(&mut flujo, 0, CMD_DATOS, &bloque("AIO DeepCool", 3)),
                CMD_ACTUALIZAR_LEDS => {
                    let _ = tx.send(datos);
                }
                // El nombre de cliente y el modo personalizado no responden.
                CMD_MODO_PERSONALIZADO | 50 => {}
                otro => panic!("comando inesperado: {otro}"),
            }
        }
    });

    (puerto, rx)
}

fn responder(flujo: &mut TcpStream, dispositivo: u32, comando: u32, datos: &[u8]) {
    let mut m = Vec::new();
    m.extend_from_slice(b"ORGB");
    m.extend_from_slice(&dispositivo.to_le_bytes());
    m.extend_from_slice(&comando.to_le_bytes());
    m.extend_from_slice(&(datos.len() as u32).to_le_bytes());
    m.extend_from_slice(datos);
    let _ = flujo.write_all(&m);
}

/// Bloque de controlador en versión 3, con un modo y una zona.
fn bloque(nombre: &str, leds: u16) -> Vec<u8> {
    let mut d = Vec::new();
    let cadena = |d: &mut Vec<u8>, s: &str| {
        d.extend_from_slice(&((s.len() + 1) as u16).to_le_bytes());
        d.extend_from_slice(s.as_bytes());
        d.push(0);
    };

    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&1u32.to_le_bytes());
    cadena(&mut d, nombre);
    cadena(&mut d, "DeepCool");
    cadena(&mut d, "Refrigeracion liquida");
    cadena(&mut d, "1.0");
    cadena(&mut d, "SN");
    cadena(&mut d, "USB");

    d.extend_from_slice(&1u16.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    cadena(&mut d, "Directo");
    for _ in 0..5 {
        d.extend_from_slice(&0u32.to_le_bytes());
    }
    // Version 3: brillo minimo y maximo.
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    // Version 3: brillo.
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&0u16.to_le_bytes());

    d.extend_from_slice(&1u16.to_le_bytes());
    cadena(&mut d, "Zona");
    for _ in 0..4 {
        d.extend_from_slice(&0u32.to_le_bytes());
    }
    d.extend_from_slice(&0u16.to_le_bytes());

    d.extend_from_slice(&leds.to_le_bytes());
    d
}

#[test]
fn lista_los_dispositivos_del_servidor() {
    let (puerto, _rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    let lista = c.listar().expect("listar");
    assert_eq!(lista.len(), 1);
    assert_eq!(lista[0].nombre, "AIO DeepCool");
    assert_eq!(lista[0].leds, 3);
}

#[test]
fn pintar_manda_un_color_por_led() {
    let (puerto, rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    let n = c.pintar(0, (255, 128, 0)).expect("pintar");
    assert_eq!(n, 3, "el dispositivo tiene 3 LEDs");

    let datos = rx
        .recv_timeout(std::time::Duration::from_secs(3))
        .expect("el servidor tenia que recibir los colores");

    // 4 del tamaño + 2 del contador + 3 colores x 4 bytes.
    assert_eq!(datos.len(), 18);
    assert_eq!(u16::from_le_bytes(datos[4..6].try_into().unwrap()), 3);
    // Los tres LEDs con el mismo color, y el cuarto byte a cero.
    for i in 0..3 {
        let base = 6 + i * 4;
        assert_eq!(
            &datos[base..base + 4],
            &[255, 128, 0, 0],
            "el LED {i} no llego con el color pedido"
        );
    }
}

#[test]
fn sin_servidor_falla_rapido_y_lo_explica() {
    // Es el caso normal de quien no tiene OpenRGB abierto: tiene que fallar
    // enseguida y con un mensaje que se entienda, no colgarse.
    let inicio = std::time::Instant::now();
    let r = vd_core::rgb::OpenRgb::conectar("127.0.0.1", 59_444);

    assert!(r.is_err());
    let mensaje = r.err().unwrap().to_string();
    assert!(
        mensaje.contains("OpenRGB"),
        "el error deberia nombrar OpenRGB: {mensaje}"
    );
    assert!(
        inicio.elapsed() < std::time::Duration::from_secs(3),
        "tardo demasiado en rendirse: {:?}",
        inicio.elapsed()
    );
}
