import { useState } from 'react';
import type { disparadoresInicial } from './valoresIniciales';

/** Cuándo se dispara solo: atajo del sistema, a una hora, o por un sensor. */
export function useEstadoDisparadores(dis: ReturnType<typeof disparadoresInicial>) {
  const [globalHotkey, setGlobalHotkey] = useState(dis.globalHotkey);
  const [inTrayMenu, setInTrayMenu] = useState(dis.inTrayMenu);
  const [timerTriggerAt, setTimerTriggerAt] = useState(dis.timerTriggerAt);
  const [timerTriggerDias, setTimerTriggerDias] = useState(dis.timerTriggerDias);
  const [sensorTriggerId, setSensorTriggerId] = useState(dis.sensorTriggerId);
  const [sensorTriggerOp, setSensorTriggerOp] = useState(dis.sensorTriggerOp);
  const [sensorTriggerVal, setSensorTriggerVal] = useState(dis.sensorTriggerVal);
  const [sensorTriggerCooldown, setSensorTriggerCooldown] = useState(dis.sensorTriggerCooldown);

  return {
    globalHotkey,
    setGlobalHotkey,
    inTrayMenu,
    setInTrayMenu,
    timerTriggerAt,
    setTimerTriggerAt,
    timerTriggerDias,
    setTimerTriggerDias,
    sensorTriggerId,
    setSensorTriggerId,
    sensorTriggerOp,
    setSensorTriggerOp,
    sensorTriggerVal,
    setSensorTriggerVal,
    sensorTriggerCooldown,
    setSensorTriggerCooldown,
  };
}