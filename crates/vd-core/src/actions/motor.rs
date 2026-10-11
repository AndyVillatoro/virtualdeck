//! Nucleo del motor de secuencias: resultado, contexto compartido y recorrido.

use std::time::Duration;

use crate::config::model::ButtonAction;

use super::{interpolate, State};

/// Retardo por defecto entre pasos de una secuencia.
///
/// Sin una pausa, la aplicacion que se acaba de lanzar todavia no existe cuando
/// el paso siguiente intenta escribirle. La version Electron usaba este mismo
/// valor y esta calibrado contra ese comportamiento.
const RETARDO_ENTRE_PASOS: Duration = Duration::from_millis(150);

/// Tiempo maximo de un webhook. Un servidor colgado no debe congelar el deck.
pub(super) const TIMEOUT_WEBHOOK: Duration = Duration::from_secs(10);

/// Profundidad maxima de anidamiento de `branch` y `countdown`.
///
/// Una configuracion puede tener ciclos —dos ramas que se llaman entre si— y sin
/// un tope el motor desbordaria la pila y tumbaria la aplicacion. Diez niveles
/// son mas de los que ninguna configuracion razonable necesita.
const PROFUNDIDAD_MAXIMA: usize = 10;

/// Resultado de ejecutar una accion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outcome {
    /// Se ejecuto.
    Ok,
    /// El nucleo la reconoce pero le corresponde a la interfaz. No es un fallo y
    /// no interrumpe la secuencia.
    ForUi(&'static str),
    /// Fallo, con el motivo en lenguaje llano.
    Failed(String),
}

impl Outcome {
    /// Si cuenta como "el paso anterior fue bien" para `only_if_prev_ok`.
    pub fn is_ok(&self) -> bool {
        !matches!(self, Outcome::Failed(_))
    }
}

/// Resultado de una secuencia completa.
#[derive(Debug, Clone)]
pub struct SequenceResult {
    pub ok: bool,
    /// El **primer** error, no el ultimo: es el que explica por que se paro.
    pub error: Option<String>,
    /// Estado de variables tras la secuencia, con las mutaciones aplicadas.
    pub state: State,
    /// Acciones que quedaron pendientes de la interfaz, en orden.
    pub for_ui: Vec<&'static str>,
}

/// Ejecuta una secuencia de acciones.
///
/// Las mutaciones de variables (`set-var`, `incr-var`, captura de salida de un
/// script) se acumulan sobre una copia del estado y se devuelven; el motor no
/// escribe en la configuracion, eso lo decide quien llama.
pub fn run_sequence(acciones: &[ButtonAction], estado: &State) -> SequenceResult {
    let mut ctx = Ctx {
        estado: estado.clone(),
        for_ui: Vec::new(),
        profundidad: 0,
    };
    let error = ctx.correr(acciones);
    SequenceResult {
        ok: error.is_none(),
        error,
        state: ctx.estado,
        for_ui: ctx.for_ui,
    }
}

/// Ejecuta una sola accion. Atajo para pruebas y para disparos directos.
pub fn run_one(accion: &ButtonAction, estado: &State) -> SequenceResult {
    run_sequence(std::slice::from_ref(accion), estado)
}

pub(super) struct Ctx {
    pub(super) estado: State,
    pub(super) for_ui: Vec<&'static str>,
    pub(super) profundidad: usize,
}

impl Ctx {
    /// Devuelve el primer error, o `None` si todo fue bien.
    pub(super) fn correr(&mut self, acciones: &[ButtonAction]) -> Option<String> {
        let mut primer_error: Option<String> = None;
        let mut anterior_ok = true;

        for (i, a) in acciones.iter().enumerate() {
            if a.only_if_prev_ok.unwrap_or(false) && !anterior_ok {
                continue;
            }

            let repeticiones = a.repeat.unwrap_or(1).max(1);
            for _ in 0..repeticiones {
                // El primer paso no espera; los siguientes si, salvo que la
                // accion fije su propio retardo.
                let espera = match a.delay_ms {
                    Some(ms) if ms > 0 => Duration::from_millis(ms as u64),
                    Some(_) => Duration::ZERO,
                    None if i > 0 => RETARDO_ENTRE_PASOS,
                    None => Duration::ZERO,
                };
                if !espera.is_zero() {
                    std::thread::sleep(espera);
                }

                let resultado = self.ejecutar(a);
                anterior_ok = resultado.is_ok();

                match resultado {
                    Outcome::ForUi(que) => self.for_ui.push(que),
                    Outcome::Failed(e) => {
                        if primer_error.is_none() {
                            primer_error = Some(e);
                        }
                        // Se abandonan las repeticiones restantes de *esta*
                        // accion, pero la secuencia continua: puede haber pasos
                        // posteriores marcados para ejecutarse igualmente.
                        break;
                    }
                    Outcome::Ok => {}
                }
            }
        }
        primer_error
    }

    /// Interpola una cadena opcional contra el estado actual.
    pub(super) fn texto(&self, campo: &Option<String>) -> String {
        campo
            .as_deref()
            .map(|s| interpolate(s, &self.estado))
            .unwrap_or_default()
    }

    pub(super) fn comprobar_profundidad(&self, que: &str) -> Option<Outcome> {
        (self.profundidad >= PROFUNDIDAD_MAXIMA).then(|| {
            Outcome::Failed(format!(
                "Anidamiento de {que} demasiado profundo ({PROFUNDIDAD_MAXIMA} niveles). \
                 Puede haber acciones que se llaman entre si en un ciclo."
            ))
        })
    }

    /// Ejecuta una sub-secuencia compartiendo el estado y la lista de pendientes.
    ///
    /// El estado se comparte, no se copia: una variable puesta dentro de una rama
    /// tiene que verse despues, que es lo que espera quien configura el boton.
    pub(super) fn correr_anidado(&mut self, acciones: &[ButtonAction]) -> Outcome {
        self.profundidad += 1;
        let error = self.correr(acciones);
        self.profundidad -= 1;

        match error {
            Some(e) => Outcome::Failed(e),
            None => Outcome::Ok,
        }
    }
}
