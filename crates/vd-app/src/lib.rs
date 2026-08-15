//! Interfaz de VirtualDeck.
//!
//! Fase 2 de la migración. Por ahora contiene lo necesario para los spikes que
//! validan las decisiones técnicas antes de portar pantallas.

pub mod app;
pub mod demo;
pub mod iconos;
pub mod pantallas;
#[cfg(feature = "render-wgpu")]
pub mod render;
