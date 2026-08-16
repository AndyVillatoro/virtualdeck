//! Montaje de ventana y renderizado.
//!
//! Hay **dos** backends detrás de features de cargo, y los dos exponen el mismo
//! tipo [`Lienzo`] con la misma interfaz, para que las pantallas no sepan cuál
//! está activo.
//!
//! # Por qué glow por defecto
//!
//! La primera elección fue wgpu (Direct3D 12), decidida midiendo tamaño de
//! binario y fotogramas por segundo. **Faltaba medir la memoria**, que es un
//! objetivo declarado del proyecto (< 60 MB en reposo), y al medirla la decisión
//! se dio vuelta:
//!
//! | Backend | Binario | Fotogramas | Residente | Privados |
//! |---|---|---|---|---|
//! | glow (OpenGL / WGL) | 2,56 MB | 144 fps | **121 MB** | 215 MB |
//! | wgpu (Direct3D 12) | 4,76 MB | 144 fps | 170 MB | 454 MB |
//!
//! Misma escena, mismo egui y el mismo binario cambiando solo la feature.
//!
//! **Ninguno de los dos cumple el objetivo de 60 MB**, así que eso sigue abierto;
//! glow simplemente queda 50 MB más cerca. Con wgpu la aplicación se plantaba en
//! ~170 MB, prácticamente lo mismo que los ~200 MB de la versión Electron, lo
//! que dejaría sin sentido una de las justificaciones centrales de la migración.
//!
//! **Lo que se pierde**: wgpu tiene respaldo por software (WARP) cuando no hay
//! GPU utilizable —sesión remota, máquina virtual, driver roto— y OpenGL en
//! Windows no tiene equivalente fiable. Por eso wgpu se conserva tras la feature
//! `render-wgpu`: si aparecen usuarios a los que glow no les arranca, hay a dónde
//! caer sin rehacer nada.

// Si estuvieran las dos features activas, los dos módulos definirían `Lienzo`.
// Gana glow, que es el backend por defecto.
#[cfg(feature = "render-glow")]
mod glow;
#[cfg(all(feature = "render-wgpu", not(feature = "render-glow")))]
mod wgpu;

#[cfg(feature = "render-glow")]
pub use glow::Lienzo;
#[cfg(all(feature = "render-wgpu", not(feature = "render-glow")))]
pub use wgpu::Lienzo;

#[cfg(not(any(feature = "render-glow", feature = "render-wgpu")))]
compile_error!(
    "vd-app necesita un backend de renderizado: activa la feature `render-glow` \
     (por defecto) o `render-wgpu`."
);
