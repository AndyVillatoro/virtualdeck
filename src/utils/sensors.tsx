import { useEffect, useState } from 'react';
import type { Sensor, SensorsStatus, SensorCondition } from '../types';

// Singleton poller — multiple components consume the same data without each
// spinning their own setInterval. Polling auto-starts on first subscriber and
// auto-stops when the last unsubscribes. Tick is 5 s, matching the rest of
// MainB's polled state.

let sensorsCache: Sensor[] = [];
let statusCache: SensorsStatus | null = null;
const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let polling = false;
let activeCount = 0;

const POLL_INTERVAL_MS = 5000;

async function tick() {
  if (!polling) return;
  const api = (window as any).electronAPI;
  if (!api?.sensors) {
    pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    return;
  }
  try {
    const [list, st] = await Promise.all([
      api.sensors.list().catch(() => sensorsCache),
      api.sensors.status().catch(() => statusCache),
    ]);
    sensorsCache = list || [];
    statusCache = st || null;
    listeners.forEach((l) => l());
  } catch {
    // Keep last-known values; don't churn UI on transient hiccups.
  }
  pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
}

function startPolling() {
  if (polling) return;
  polling = true;
  tick();
}

function stopPolling() {
  polling = false;
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}

/** Returns the current snapshot of sensors + LHM status. Auto-polls while mounted. */
export function useSensors(): { sensors: Sensor[]; status: SensorsStatus | null } {
  const [, setTick] = useState(0);
  useEffect(() => {
    activeCount++;
    if (activeCount === 1) startPolling();
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      activeCount = Math.max(0, activeCount - 1);
      if (activeCount === 0) stopPolling();
    };
  }, []);
  return { sensors: sensorsCache, status: statusCache };
}

/** Quick lookup by id. Returns null if unknown or not yet polled. */
export function findSensor(id: string | undefined, sensors: Sensor[]): Sensor | null {
  if (!id) return null;
  return sensors.find((s) => s.id === id) ?? null;
}

/** Force an immediate refresh (used by probe/config screens). */
export function refreshSensors(): void {
  if (pollTimer) clearTimeout(pollTimer);
  tick();
}

/** Evaluate a SensorCondition against a current value. */
export function evalCondition(cond: SensorCondition, current: number): boolean {
  switch (cond.op) {
    case '>':  return current > cond.value;
    case '<':  return current < cond.value;
    case '>=': return current >= cond.value;
    case '<=': return current <= cond.value;
    case '==': return current === cond.value;
  }
}
