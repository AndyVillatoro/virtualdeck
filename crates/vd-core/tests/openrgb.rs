//! Conversación completa con un servidor que habla el protocolo de OpenRGB.
//!
//! Los tests unitarios cubren el parseo del bloque de un controlador, pero no
//! que el cliente **hable bien**: que mande la cabecera correcta, negocie la
//! versión, use los números de comando de verdad y sepa leer las respuestas.
//! Sin esto, el cliente solo se probaría teniendo OpenRGB instalado y corriendo.
//!
//! El servidor de aquí es deliberadamente **estricto**: se planta ante cualquier
//! comando que no espere. Una versión anterior aceptaba en silencio el número
//! equivocado para "modo personalizado" (1052, que en realidad es
//! `UPDATESINGLELED`) y el test pasaba en verde mientras las luces no cambiaban.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::mpsc::{channel, Receiver, Sender};

const CMD_CONTADOR: u32 = 0;
const CMD_DATOS: u32 = 1;
const CMD_VERSION: u32 = 40;
const CMD_NOMBRE_CLIENTE: u32 = 50;
const CMD_LISTA_PERFILES: u32 = 150;
const CMD_CARGAR_PERFIL: u32 = 152;
const CMD_ACTUALIZAR_LEDS: u32 = 1050;
const CMD_MODO_PERSONALIZADO: u32 = 1100;
const CMD_ACTUALIZAR_MODO: u32 = 1101;

/// Lo que el servidor de prueba vio llegar.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Recibido {
    comando: u32,
    datos: Vec<u8>,
}

/// Un servidor mínimo con un solo dispositivo de 3 LEDs y dos modos.
///
/// Devuelve el puerto y un canal por el que publica **todo** lo que le mandan,
/// en orden, para poder comprobar no solo el contenido sino la secuencia.
fn servir() -> (u16, Receiver<Recibido>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("abrir puerto");
    let puerto = listener.local_addr().unwrap().port();
    let (tx, rx) = channel();

    std::thread::spawn(move || {
        let Ok((mut flujo, _)) = listener.accept() else {
            return;
        };
        atender(&mut flujo, &tx);
    });

    (puerto, rx)
}

fn atender(flujo: &mut TcpStream, tx: &Sender<Recibido>) {
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
        let _ = tx.send(Recibido {
            comando,
            datos: datos.clone(),
        });

        match comando {
            CMD_VERSION => responder(flujo, 0, CMD_VERSION, &3u32.to_le_bytes()),
            CMD_CONTADOR => responder(flujo, 0, CMD_CONTADOR, &1u32.to_le_bytes()),
            CMD_DATOS => {
                // Antes de la respuesta se cuela un aviso que nadie pidio, como
                // hace OpenRGB de verdad cuando cambia la lista de dispositivos.
                // El cliente tiene que saltarselo en vez de leerlo como si fuera
                // el bloque del controlador.
                responder(flujo, 0, 100, &[]);
                responder(flujo, 0, CMD_DATOS, &bloque("AIO DeepCool", 3));
            }
            CMD_LISTA_PERFILES => responder(flujo, 0, CMD_LISTA_PERFILES, &lista_perfiles()),
            // Estos no contestan; solo se registran.
            CMD_ACTUALIZAR_LEDS
            | CMD_MODO_PERSONALIZADO
            | CMD_ACTUALIZAR_MODO
            | CMD_CARGAR_PERFIL
            | CMD_NOMBRE_CLIENTE => {}
            otro => panic!("comando inesperado: {otro}"),
        }
    }
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

fn cadena(d: &mut Vec<u8>, s: &str) {
    d.extend_from_slice(&((s.len() + 1) as u16).to_le_bytes());
    d.extend_from_slice(s.as_bytes());
    d.push(0);
}

fn lista_perfiles() -> Vec<u8> {
    let mut d = Vec::new();
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&2u16.to_le_bytes());
    cadena(&mut d, "Juego");
    cadena(&mut d, "Trabajo");
    d
}

/// Un modo tal como lo serializa OpenRGB en versión 3.
fn modo(d: &mut Vec<u8>, nombre: &str, colores_max: u32, modo_color: u32) {
    cadena(d, nombre);
    for v in [
        0u32, // valor
        0,    // banderas
        0,    // velocidad min
        5,    // velocidad max
        0,    // brillo min   (v3)
        100,  // brillo max   (v3)
        1,    // colores min
        colores_max,
        2,  // velocidad
        50, // brillo       (v3)
        0,  // direccion
        modo_color,
    ] {
        d.extend_from_slice(&v.to_le_bytes());
    }
    d.extend_from_slice(&0u16.to_le_bytes()); // sin colores propios
}

/// Bloque de controlador en versión 3, con dos modos y una zona.
fn bloque(nombre: &str, leds: u16) -> Vec<u8> {
    let mut d = Vec::new();

    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&1u32.to_le_bytes());
    cadena(&mut d, nombre);
    cadena(&mut d, "DeepCool");
    cadena(&mut d, "Refrigeracion liquida");
    cadena(&mut d, "1.0");
    cadena(&mut d, "SN");
    cadena(&mut d, "USB");

    d.extend_from_slice(&2u16.to_le_bytes()); // dos modos
    d.extend_from_slice(&0u32.to_le_bytes()); // modo activo
    modo(&mut d, "Directo", 1, 2);
    modo(&mut d, "Rainbow Wave", 0, 3);

    d.extend_from_slice(&1u16.to_le_bytes());
    cadena(&mut d, "Zona");
    for _ in 0..4 {
        d.extend_from_slice(&0u32.to_le_bytes());
    }
    d.extend_from_slice(&0u16.to_le_bytes());

    d.extend_from_slice(&leds.to_le_bytes());
    d
}

/// Recoge lo que el servidor vio, descartando el saludo inicial.
fn conversacion(rx: &Receiver<Recibido>, cuantos: usize) -> Vec<Recibido> {
    let mut vistos = Vec::new();
    while vistos.len() < cuantos {
        let r = rx
            .recv_timeout(std::time::Duration::from_secs(3))
            .expect("el servidor tenia que recibir mas mensajes");
        if r.comando == CMD_NOMBRE_CLIENTE || r.comando == CMD_VERSION {
            continue;
        }
        vistos.push(r);
    }
    vistos
}

#[test]
fn lista_los_dispositivos_del_servidor() {
    let (puerto, _rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    let lista = c.listar().expect("listar");
    assert_eq!(lista.len(), 1);
    assert_eq!(lista[0].nombre, "AIO DeepCool");
    assert_eq!(lista[0].leds, 3);
    assert_eq!(lista[0].modos.len(), 2);
    assert_eq!(lista[0].modos[1].nombre, "Rainbow Wave");
}

#[test]
fn pintar_pasa_a_modo_personalizado_antes_de_mandar_los_colores() {
    let (puerto, rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    let n = c.pintar(0, (255, 128, 0)).expect("pintar");
    assert_eq!(n, 3, "el dispositivo tiene 3 LEDs");

    // Pedir los datos, poner el modo personalizado, y solo entonces los colores.
    // El orden importa: si el color llega primero, el efecto anterior lo pisa.
    let vistos = conversacion(&rx, 3);
    assert_eq!(vistos[0].comando, CMD_DATOS);
    assert_eq!(
        vistos[1].comando, CMD_MODO_PERSONALIZADO,
        "tiene que ser 1100 (SETCUSTOMMODE), no 1052 (UPDATESINGLELED)"
    );
    assert_eq!(vistos[2].comando, CMD_ACTUALIZAR_LEDS);

    let datos = &vistos[2].datos;
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
fn aplicar_modo_manda_la_descripcion_completa_del_modo() {
    let (puerto, rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    // "breath" no existe; "Directo" si. Se busca por trozo y sin mayusculas.
    let aplicado = c
        .aplicar_modo(0, "directo", Some((10, 20, 30)), Some(100))
        .expect("aplicar modo");
    assert_eq!(aplicado, "Directo");

    let vistos = conversacion(&rx, 2);
    assert_eq!(vistos[0].comando, CMD_DATOS);
    assert_eq!(vistos[1].comando, CMD_ACTUALIZAR_MODO);

    let datos = &vistos[1].datos;
    let tam = u32::from_le_bytes(datos[0..4].try_into().unwrap()) as usize;
    assert_eq!(tam, datos.len(), "el tamaño se cuenta a si mismo");
    assert_eq!(
        u32::from_le_bytes(datos[4..8].try_into().unwrap()),
        0,
        "el indice del modo Directo es 0"
    );
    // El color pedido tiene que ir al final, en la lista de colores del modo.
    assert!(
        datos.windows(4).any(|v| v == [10, 20, 30, 0]),
        "el color pedido no viaja en la descripcion del modo"
    );
}

#[test]
fn un_modo_que_no_existe_lo_dice_y_enumera_los_que_hay() {
    let (puerto, _rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    let e = c
        .aplicar_modo(0, "Cascada", None, None)
        .expect_err("no deberia existir");
    let mensaje = e.to_string();
    assert!(mensaje.contains("Cascada"), "{mensaje}");
    assert!(
        mensaje.contains("Directo") && mensaje.contains("Rainbow Wave"),
        "deberia enumerar los modos disponibles: {mensaje}"
    );
}

#[test]
fn los_perfiles_se_listan_y_se_cargan_por_nombre() {
    let (puerto, rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    assert_eq!(c.perfiles().expect("perfiles"), vec!["Juego", "Trabajo"]);

    c.cargar_perfil("Trabajo").expect("cargar");
    let vistos = conversacion(&rx, 3);
    assert_eq!(vistos[2].comando, CMD_CARGAR_PERFIL);
    assert_eq!(
        vistos[2].datos, b"Trabajo\0",
        "el nombre viaja terminado en cero y sin longitud delante"
    );
}

#[test]
fn cargar_un_perfil_que_no_existe_falla_en_vez_de_no_hacer_nada() {
    // OpenRGB no contesta a este comando: si el perfil no existe, lo descarta en
    // silencio y el boton parece que funciona. Por eso se comprueba antes.
    let (puerto, _rx) = servir();
    let mut c = vd_core::rgb::OpenRgb::conectar("127.0.0.1", puerto).expect("conectar");

    let e = c.cargar_perfil("Cine").expect_err("no existe");
    let mensaje = e.to_string();
    assert!(mensaje.contains("Cine"), "{mensaje}");
    assert!(mensaje.contains("Juego"), "deberia enumerar: {mensaje}");
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
