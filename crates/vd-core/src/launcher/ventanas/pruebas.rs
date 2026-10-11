//! Tests de geometria de snap y vecinos del ciclo. Viven aqui porque
//! `mod.rs` es solo cableado.

use windows::Win32::Foundation::RECT;

use super::SnapPosition;
use super::active_app;
use super::ciclo::indice_vecino;

#[test]
fn indice_vecino_da_la_vuelta() {
    assert_eq!(indice_vecino(Some(2), 3, true), Some(0));
    assert_eq!(indice_vecino(Some(0), 3, false), Some(2));
    assert_eq!(indice_vecino(None, 3, true), Some(0));
    assert_eq!(indice_vecino(None, 3, false), Some(2));
    assert_eq!(indice_vecino(Some(1), 0, true), None);
}

const AREA: RECT = RECT {
    left: 0,
    top: 0,
    right: 1920,
    bottom: 1080,
};

#[test]
fn las_mitades_cubren_la_pantalla_sin_solaparse() {
    let izq = SnapPosition::LeftHalf.rect_in(AREA).unwrap();
    let der = SnapPosition::RightHalf.rect_in(AREA).unwrap();
    assert_eq!(izq, (0, 0, 960, 1080));
    assert_eq!(der, (960, 0, 960, 1080));
    // Juntas cubren todo el ancho, sin huecos ni superposicion.
    assert_eq!(izq.2 + der.2, 1920);
}

#[test]
fn los_cuadrantes_cubren_la_pantalla() {
    let esquinas = [
        SnapPosition::TopLeft,
        SnapPosition::TopRight,
        SnapPosition::BottomLeft,
        SnapPosition::BottomRight,
    ];
    let area_total: i32 = esquinas
        .iter()
        .map(|p| {
            let (_, _, w, h) = p.rect_in(AREA).unwrap();
            w * h
        })
        .sum();
    assert_eq!(area_total, 1920 * 1080);
}

#[test]
fn con_ancho_impar_no_se_pierde_un_pixel() {
    // Una pantalla de ancho impar no debe dejar una franja sin cubrir.
    let area = RECT {
        left: 0,
        top: 0,
        right: 1921,
        bottom: 1080,
    };
    let izq = SnapPosition::LeftHalf.rect_in(area).unwrap();
    let der = SnapPosition::RightHalf.rect_in(area).unwrap();
    assert_eq!(izq.2 + der.2, 1921);
}

#[test]
fn respeta_un_area_de_trabajo_desplazada() {
    // Barra de tareas arriba: el area no empieza en (0,0).
    let area = RECT {
        left: 0,
        top: 40,
        right: 1920,
        bottom: 1080,
    };
    let (x, y, _, h) = SnapPosition::LeftHalf.rect_in(area).unwrap();
    assert_eq!((x, y), (0, 40));
    assert_eq!(h, 1040);
}

#[test]
fn maximizar_y_restaurar_no_son_rectangulos() {
    assert!(SnapPosition::Maximize.rect_in(AREA).is_none());
    assert!(SnapPosition::Restore.rect_in(AREA).is_none());
}

#[test]
fn se_parsean_los_valores_de_la_configuracion() {
    assert_eq!(
        SnapPosition::from_config("left-half"),
        Some(SnapPosition::LeftHalf)
    );
    assert_eq!(
        SnapPosition::from_config("bottom-right"),
        Some(SnapPosition::BottomRight)
    );
    assert_eq!(SnapPosition::from_config("inventada"), None);
}

#[test]
fn active_app_no_entra_en_panico() {
    let _ = active_app();
}
