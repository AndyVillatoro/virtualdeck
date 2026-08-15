//! Icono de bandeja y su menú.
//!
//! VirtualDeck vive en la bandeja: se cierra la ventana y sigue corriendo, y se
//! vuelve desde ahí. Es la razón declarada de usar **winit directo** en vez de
//! `eframe` — `tray-icon` necesita que su cola de eventos se bombee desde el
//! bucle principal, y `eframe` no cede ese control.
//!
//! # El icono se dibuja, no se carga
//!
//! `tray-icon` quiere píxeles RGBA en crudo, así que se generan en código en vez
//! de empotrar un PNG. Sale más barato —no hay decodificador ni archivo que
//! pueda faltar— y encaja con la estética del proyecto, que es justamente una
//! matriz de puntos.

use tray_icon::menu::{Menu, MenuEvent, MenuId, MenuItem, PredefinedMenuItem};
use tray_icon::{Icon, TrayIcon, TrayIconBuilder, TrayIconEvent};

/// Lo que el usuario pidió desde la bandeja.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Orden {
    /// Traer la ventana al frente.
    Mostrar,
    /// Esconder la ventana, dejando la aplicación viva.
    Ocultar,
    /// Alternar entre las dos: es lo que hace un clic en el icono.
    Alternar,
    Salir,
}

pub struct Bandeja {
    /// Hay que conservarlo vivo: al soltarlo, el icono desaparece de la bandeja.
    _icono: TrayIcon,
    id_mostrar: MenuId,
    id_ocultar: MenuId,
    id_salir: MenuId,
}

impl Bandeja {
    pub fn nueva(acento: egui::Color32) -> anyhow::Result<Self> {
        let menu = Menu::new();
        let mostrar = MenuItem::new("Mostrar VirtualDeck", true, None);
        let ocultar = MenuItem::new("Ocultar", true, None);
        let salir = MenuItem::new("Salir", true, None);

        menu.append(&mostrar)?;
        menu.append(&ocultar)?;
        menu.append(&PredefinedMenuItem::separator())?;
        menu.append(&salir)?;

        let icono = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_tooltip("VirtualDeck")
            .with_icon(dibujar_icono(acento)?)
            .build()?;

        Ok(Self {
            _icono: icono,
            id_mostrar: mostrar.id().clone(),
            id_ocultar: ocultar.id().clone(),
            id_salir: salir.id().clone(),
        })
    }

    /// Recoge lo que haya pasado en la bandeja desde el fotograma anterior.
    ///
    /// `tray-icon` y su menú publican en canales globales propios, ajenos al
    /// bucle de winit, así que hay que sondearlos una vez por vuelta. Es
    /// exactamente el bombeo que `eframe` no dejaría hacer.
    pub fn recoger(&self) -> Vec<Orden> {
        let mut ordenes = Vec::new();

        while let Ok(evento) = MenuEvent::receiver().try_recv() {
            if evento.id == self.id_mostrar {
                ordenes.push(Orden::Mostrar);
            } else if evento.id == self.id_ocultar {
                ordenes.push(Orden::Ocultar);
            } else if evento.id == self.id_salir {
                ordenes.push(Orden::Salir);
            }
        }

        while let Ok(evento) = TrayIconEvent::receiver().try_recv() {
            // Solo el clic izquierdo alterna la ventana. El derecho abre el menú
            // y lo gestiona el sistema; reaccionar a él tambien haria que abrir
            // el menu mostrara u ocultara la ventana de paso.
            if let TrayIconEvent::Click {
                button: tray_icon::MouseButton::Left,
                button_state: tray_icon::MouseButtonState::Up,
                ..
            } = evento
            {
                ordenes.push(Orden::Alternar);
            }
        }

        ordenes
    }
}

/// Tamaño del icono en píxeles. Windows escala desde aquí para las distintas
/// densidades de pantalla.
const TAM: u32 = 32;

/// Dibuja el icono: una rejilla de 4×4 puntos, que es la propia aplicación en
/// miniatura.
fn dibujar_icono(acento: egui::Color32) -> anyhow::Result<Icon> {
    let mut pixeles = vec![0u8; (TAM * TAM * 4) as usize];

    let celdas = 4;
    let paso = TAM as f32 / celdas as f32;
    let radio = paso * 0.30;

    for fila in 0..celdas {
        for col in 0..celdas {
            let cx = paso * (col as f32 + 0.5);
            let cy = paso * (fila as f32 + 0.5);

            // Un punto de cada rejilla se apaga para que el icono no sea un
            // patrón uniforme y se distinga de un tirón entre otros iconos.
            let encendido = !(fila == 3 && col == 3);
            let color = if encendido {
                acento
            } else {
                egui::Color32::from_gray(90)
            };

            pintar_circulo(&mut pixeles, cx, cy, radio, color);
        }
    }

    Ok(Icon::from_rgba(pixeles, TAM, TAM)?)
}

/// Pinta un círculo relleno con bordes suavizados.
///
/// Sin suavizado, a 32 píxeles los puntos salen con escalones muy visibles: el
/// icono de bandeja es pequeño y cada píxel cuenta.
fn pintar_circulo(pixeles: &mut [u8], cx: f32, cy: f32, radio: f32, color: egui::Color32) {
    let desde_x = ((cx - radio - 1.0).floor().max(0.0)) as u32;
    let hasta_x = ((cx + radio + 1.0).ceil().min(TAM as f32)) as u32;
    let desde_y = ((cy - radio - 1.0).floor().max(0.0)) as u32;
    let hasta_y = ((cy + radio + 1.0).ceil().min(TAM as f32)) as u32;

    for y in desde_y..hasta_y {
        for x in desde_x..hasta_x {
            let dx = x as f32 + 0.5 - cx;
            let dy = y as f32 + 0.5 - cy;
            let distancia = (dx * dx + dy * dy).sqrt();

            // Transición de un píxel entre el interior y el exterior.
            let cobertura = (radio - distancia + 0.5).clamp(0.0, 1.0);
            if cobertura <= 0.0 {
                continue;
            }

            let i = ((y * TAM + x) * 4) as usize;
            pixeles[i] = color.r();
            pixeles[i + 1] = color.g();
            pixeles[i + 2] = color.b();
            pixeles[i + 3] = (cobertura * 255.0) as u8;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn el_icono_tiene_el_tamano_correcto() {
        // `Icon::from_rgba` rechaza un buffer que no cuadre con las dimensiones,
        // asi que construirlo ya valida el calculo.
        assert!(dibujar_icono(egui::Color32::from_rgb(0xD9, 0x5F, 0x5F)).is_ok());
    }

    #[test]
    fn el_icono_no_sale_vacio() {
        let mut pixeles = vec![0u8; (TAM * TAM * 4) as usize];
        pintar_circulo(
            &mut pixeles,
            16.0,
            16.0,
            6.0,
            egui::Color32::from_rgb(255, 0, 0),
        );
        let opacos = pixeles.chunks(4).filter(|p| p[3] > 0).count();
        assert!(opacos > 50, "solo {opacos} pixeles pintados");
    }

    #[test]
    fn un_circulo_fuera_del_lienzo_no_desborda() {
        // Los limites se recortan al lienzo; sin eso, un circulo en el borde
        // escribiria fuera del buffer y entraria en panico.
        let mut pixeles = vec![0u8; (TAM * TAM * 4) as usize];
        pintar_circulo(&mut pixeles, 0.0, 0.0, 10.0, egui::Color32::WHITE);
        pintar_circulo(
            &mut pixeles,
            TAM as f32,
            TAM as f32,
            10.0,
            egui::Color32::WHITE,
        );
    }
}
