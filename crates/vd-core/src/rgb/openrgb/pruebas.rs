//! Tests del protocolo OpenRGB. Viven aqui porque los modos se construyen
//! campo a campo y eso exige estar bajo el mismo arbol del modulo.

use super::cuerpos::{aplicar_ajustes, cuerpo_leds, cuerpo_modo};
use super::parseo::{Lector, leer_modo, parsear_controlador, parsear_perfiles};
use super::protocolo::{
    CMD_ACTUALIZAR_LEDS, CMD_ACTUALIZAR_MODO, CMD_CARGAR_PERFIL, CMD_LISTA_PERFILES,
    CMD_MODO_PERSONALIZADO, COLORES_AL_AZAR,
};
use super::tipos::Modo;

#[test]
fn el_cuerpo_de_leds_tiene_la_forma_esperada() {
    let datos = cuerpo_leds(&[(255, 0, 0), (0, 255, 0)]);
    // 4 del tamaño + 2 del contador + 2 colores x 4 bytes.
    assert_eq!(datos.len(), 14);
    assert_eq!(u32::from_le_bytes(datos[0..4].try_into().unwrap()), 14);
    assert_eq!(u16::from_le_bytes(datos[4..6].try_into().unwrap()), 2);
    assert_eq!(&datos[6..10], &[255, 0, 0, 0]);
    assert_eq!(&datos[10..14], &[0, 255, 0, 0]);
}

/// Los números de comando se parecen demasiado entre sí y confundirlos no da
/// ningún error: el servidor descarta el mensaje y las luces no cambian. Ya
/// pasó una vez con 1052 (`UPDATESINGLELED`) en lugar de 1100.
#[test]
fn los_comandos_son_los_de_openrgb() {
    assert_eq!(CMD_MODO_PERSONALIZADO, 1100, "SETCUSTOMMODE");
    assert_eq!(CMD_ACTUALIZAR_MODO, 1101, "UPDATEMODE");
    assert_eq!(CMD_ACTUALIZAR_LEDS, 1050, "UPDATELEDS");
    assert_eq!(CMD_LISTA_PERFILES, 150, "GET_PROFILE_LIST");
    assert_eq!(CMD_CARGAR_PERFIL, 152, "LOAD_PROFILE");
    // 1052 es UPDATESINGLELED: si alguien lo reintroduce como "modo
    // personalizado", este test lo dice.
    assert_ne!(CMD_MODO_PERSONALIZADO, 1052);
}

fn modo_de_ejemplo() -> Modo {
    Modo {
        indice: 2,
        nombre: "Breathing".into(),
        valor: 7,
        banderas: 0b101,
        velocidad_min: 0,
        velocidad_max: 5,
        brillo_min: 0,
        brillo_max: 100,
        colores_min: 1,
        colores_max: 3,
        velocidad: 2,
        brillo: 50,
        direccion: 1,
        modo_color: 2,
        colores: vec![(1, 2, 3)],
    }
}

/// Escribir un modo y volverlo a leer tiene que devolver lo mismo. Es la
/// unica forma de saber que el orden de los campos es correcto sin OpenRGB
/// delante: cualquier campo movido rompe la ida y vuelta.
#[test]
fn un_modo_sobrevive_la_ida_y_vuelta() {
    for version in [1, 3] {
        let original = modo_de_ejemplo();
        let bytes = cuerpo_modo(&original, version);

        // Se salta el tamaño y el indice, que la lectura del bloque no lee.
        let mut l = Lector::nuevo(&bytes[8..]);
        let leido = leer_modo(&mut l, original.indice, version).expect("releer");

        let esperado = if version >= 3 {
            original
        } else {
            // Sin version 3 el brillo no viaja, asi que vuelve a cero.
            Modo {
                brillo_min: 0,
                brillo_max: 0,
                brillo: 0,
                ..original
            }
        };
        assert_eq!(leido, esperado, "version {version}");
    }
}

#[test]
fn el_tamano_del_cuerpo_de_modo_se_cuenta_a_si_mismo() {
    let bytes = cuerpo_modo(&modo_de_ejemplo(), 3);
    let declarado = u32::from_le_bytes(bytes[0..4].try_into().unwrap()) as usize;
    assert_eq!(declarado, bytes.len());
}

#[test]
fn el_color_solo_se_aplica_a_los_modos_que_lo_admiten() {
    // Un arcoiris elige sus colores solo; forzarle uno haria que OpenRGB
    // rechazara la descripcion entera.
    let mut arcoiris = Modo {
        modo_color: COLORES_AL_AZAR,
        colores: vec![],
        ..modo_de_ejemplo()
    };
    aplicar_ajustes(&mut arcoiris, Some((9, 9, 9)), None);
    assert!(arcoiris.colores.is_empty());

    let mut estatico = modo_de_ejemplo();
    aplicar_ajustes(&mut estatico, Some((9, 9, 9)), None);
    assert_eq!(estatico.colores, vec![(9, 9, 9)]);
}

#[test]
fn el_brillo_se_reparte_dentro_del_rango_del_modo() {
    let mut m = Modo {
        brillo_min: 20,
        brillo_max: 40,
        ..modo_de_ejemplo()
    };
    aplicar_ajustes(&mut m, None, Some(50));
    assert_eq!(m.brillo, 30);

    // Por encima de 100 se recorta, en vez de salirse del rango.
    aplicar_ajustes(&mut m, None, Some(200));
    assert_eq!(m.brillo, 40);

    // Un modo sin rango de brillo se queda como estaba.
    let mut sin_brillo = Modo {
        brillo_min: 0,
        brillo_max: 0,
        brillo: 7,
        ..modo_de_ejemplo()
    };
    aplicar_ajustes(&mut sin_brillo, None, Some(90));
    assert_eq!(sin_brillo.brillo, 7);
}

#[test]
fn un_modo_que_exige_varios_colores_los_recibe_todos() {
    // Un degradado con colores_min = 2 rechazaria una lista de uno solo.
    let mut degradado = Modo {
        colores_min: 2,
        colores_max: 4,
        ..modo_de_ejemplo()
    };
    aplicar_ajustes(&mut degradado, Some((5, 5, 5)), None);
    assert_eq!(degradado.colores, vec![(5, 5, 5); 2]);
}

/// Arma el bloque de un controlador como lo enviaria OpenRGB.
fn bloque_controlador(nombre: &str, leds: u16, version: u32) -> Vec<u8> {
    let mut d = Vec::new();
    let cadena = |d: &mut Vec<u8>, s: &str| {
        let bytes = s.as_bytes();
        d.extend_from_slice(&((bytes.len() + 1) as u16).to_le_bytes());
        d.extend_from_slice(bytes);
        d.push(0);
    };

    d.extend_from_slice(&0u32.to_le_bytes()); // tamaño (no se usa al leer)
    d.extend_from_slice(&1u32.to_le_bytes()); // tipo
    cadena(&mut d, nombre);
    if version >= 1 {
        cadena(&mut d, "Fabricante");
    }
    cadena(&mut d, "Descripcion");
    cadena(&mut d, "1.0");
    cadena(&mut d, "SERIE123");
    cadena(&mut d, "USB");

    // Dos modos, para ejercitar el recorrido y la busqueda por nombre.
    d.extend_from_slice(&2u16.to_le_bytes());
    d.extend_from_slice(&0u32.to_le_bytes()); // modo activo
    for nombre_modo in ["Directo", "Breathing"] {
        let mut m = modo_de_ejemplo();
        m.nombre = nombre_modo.into();
        let bytes = cuerpo_modo(&m, version);
        // Sin el tamaño ni el indice: dentro del bloque no van.
        d.extend_from_slice(&bytes[8..]);
    }

    // Una zona.
    d.extend_from_slice(&1u16.to_le_bytes());
    cadena(&mut d, "Zona 1");
    for _ in 0..4 {
        d.extend_from_slice(&0u32.to_le_bytes());
    }
    d.extend_from_slice(&0u16.to_le_bytes()); // sin matriz

    d.extend_from_slice(&leds.to_le_bytes());
    d
}

#[test]
fn parsea_el_bloque_de_un_controlador() {
    for version in [1, 3] {
        let bloque = bloque_controlador("ASUS Aura Motherboard", 42, version);
        let d = parsear_controlador(&bloque, version)
            .unwrap_or_else(|e| panic!("version {version}: {e}"));
        assert_eq!(d.nombre, "ASUS Aura Motherboard");
        assert_eq!(d.leds, 42, "version {version}");
        assert_eq!(d.modos.len(), 2);
        assert_eq!(d.modos[1].nombre, "Breathing");
        assert_eq!(d.modos[1].indice, 1, "el indice se asigna por posicion");
    }
}

#[test]
fn busca_modos_sin_distinguir_mayusculas_y_por_trozos() {
    let bloque = bloque_controlador("X", 3, 3);
    let d = parsear_controlador(&bloque, 3).unwrap();

    assert_eq!(d.buscar_modo("breathing").map(|m| m.indice), Some(1));
    assert_eq!(d.buscar_modo("BREATH").map(|m| m.indice), Some(1));
    assert_eq!(d.buscar_modo("directo").map(|m| m.indice), Some(0));
    assert!(d.buscar_modo("arcoiris").is_none());
    assert!(d.buscar_modo("  ").is_none(), "vacio no vale como comodin");
}

#[test]
fn un_bloque_truncado_se_rechaza_en_vez_de_entrar_en_panico() {
    // El flujo puede desalinearse; leer fuera del bloque tumbaria el proceso.
    let bloque = bloque_controlador("X", 8, 3);
    for corte in [0, 4, 12, bloque.len() / 2] {
        assert!(
            parsear_controlador(&bloque[..corte], 3).is_err(),
            "no deberia aceptar un bloque cortado en {corte}"
        );
    }
}

#[test]
fn los_campos_de_brillo_desalinean_si_se_confunde_la_version() {
    // Leer un bloque de version 1 como si fuera 3 salta 12 bytes de mas y
    // devuelve basura. El test fija que la version importa de verdad.
    let bloque = bloque_controlador("X", 99, 1);
    let como_v1 = parsear_controlador(&bloque, 1).map(|d| d.leds);
    let como_v3 = parsear_controlador(&bloque, 3).map(|d| d.leds);
    assert_eq!(como_v1.unwrap(), 99);
    assert_ne!(como_v3.ok(), Some(99), "deberia salir desalineado");
}

#[test]
fn lee_la_lista_de_perfiles() {
    let mut d = Vec::new();
    d.extend_from_slice(&0u32.to_le_bytes());
    d.extend_from_slice(&2u16.to_le_bytes());
    for nombre in ["Juego", "Trabajo"] {
        d.extend_from_slice(&((nombre.len() + 1) as u16).to_le_bytes());
        d.extend_from_slice(nombre.as_bytes());
        d.push(0);
    }
    assert_eq!(parsear_perfiles(&d).unwrap(), vec!["Juego", "Trabajo"]);

    // Una lista vacia es normal: OpenRGB recien instalado no tiene perfiles.
    let vacia = [0u8; 6];
    assert!(parsear_perfiles(&vacia).unwrap().is_empty());
}
