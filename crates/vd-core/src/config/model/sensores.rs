//! Condiciones sobre sensores de LibreHardwareMonitor.

use serde::{Deserialize, Serialize};

/// Operador de una condicion de sensor.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SensorOp {
    #[serde(rename = ">")]
    Gt,
    #[serde(rename = "<")]
    Lt,
    #[serde(rename = ">=")]
    Ge,
    #[serde(rename = "<=")]
    Le,
    #[serde(rename = "==")]
    Eq,
}

/// Condicion sobre el valor de un sensor de LibreHardwareMonitor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SensorCondition {
    /// SensorId estable de LHM (p. ej. `/amdcpu/0/temperature/0`).
    pub id: String,
    pub op: SensorOp,
    pub value: f64,
    /// Presente solo cuando la condicion se usa como disparador
    /// (`ButtonConfig::sensor_trigger`).
    #[serde(
        default,
        rename = "cooldownMs",
        skip_serializing_if = "Option::is_none"
    )]
    pub cooldown_ms: Option<i64>,
}

impl SensorCondition {
    /// Evalua la condicion contra un valor actual.
    pub fn eval(&self, current: f64) -> bool {
        match self.op {
            SensorOp::Gt => current > self.value,
            SensorOp::Lt => current < self.value,
            SensorOp::Ge => current >= self.value,
            SensorOp::Le => current <= self.value,
            SensorOp::Eq => current == self.value,
        }
    }
}
