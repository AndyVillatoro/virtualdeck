/**
 * Decodificador y procesador de árboles de sensores de LibreHardwareMonitor (LHM).
 * Extraído de `sensors.ts` para desacoplar el análisis de datos del ciclo HTTP/proceso.
 */

type SensorKind =
  | 'Temperature' | 'Fan' | 'Voltage' | 'Load' | 'Clock' | 'Power'
  | 'Data' | 'Throughput' | 'Level' | 'SmallData' | 'Other';

export type SensorCategory = 'cpu' | 'gpu' | 'mainboard' | 'memory' | 'storage' | 'other';

export interface Sensor {
  /** Stable across runs — LHM's SensorId path, e.g. "/amdcpu/0/temperature/0". */
  id: string;
  name: string;
  hardware: string;
  /** Hardware category, derived from the LHM ImageURL (cpu.png, nvidia.png…). */
  category: SensorCategory;
  kind: SensorKind;
  value: number;
  unit: string;
  min?: number;
  max?: number;
}

function parseValue(raw: string | undefined): { value: number; unit: string } {
  if (!raw) return { value: NaN, unit: '' };
  // LHM strings look like "45.0 °C", "1234 RPM", "1.250 V", "85 %", "3500 MHz".
  // Some locales emit comma decimals ("45,0 °C") — normalize first.
  const m = String(raw).replace(',', '.').match(/^\s*(-?\d+(?:\.\d+)?)\s*(\S.*?)?\s*$/);
  if (!m) return { value: NaN, unit: '' };
  return { value: parseFloat(m[1]), unit: (m[2] ?? '').trim() };
}

// Maps LHM's ImageURL filename to our coarse category bucket. The icons are
// stable across LHM versions: cpu.png / intel.png / nvidia.png / mainboard.png /
// ram.png / hdd.png / nic.png / battery.png …
function categoryFromImage(image: string | undefined): SensorCategory {
  if (!image) return 'other';
  const f = image.toLowerCase();
  if (f.includes('cpu') || f.includes('intel-cpu') || f.includes('amd-cpu')) return 'cpu';
  if (f.includes('nvidia') || f.includes('intel-gpu') || f.includes('gpu') || f.includes('radeon')) return 'gpu';
  if (f.includes('mainboard') || f.includes('motherboard') || f.includes('chip')) return 'mainboard';
  if (f.includes('ram') || f.includes('memory')) return 'memory';
  if (f.includes('hdd') || f.includes('ssd') || f.includes('nvme') || f.includes('storage')) return 'storage';
  return 'other';
}

// Fallback when the hardware node has no ImageURL (rare, but happens on some
// older LHM builds). Inspect the hardware *name* for keywords.
function categoryFromName(name: string): SensorCategory {
  const n = name.toLowerCase();
  if (/ryzen|core\b|i[3579]-|xeon|threadripper|\bcpu\b|processor|intel|athlon|celeron|pentium/.test(n)) return 'cpu';
  if (/geforce|radeon|rtx|gtx|quadro|nvidia|\bgpu\b|graphics/.test(n)) return 'gpu';
  if (/board|mainboard|chipset|prime|tuf|rog|strix|aorus|x[567]70|b[567]50|z[567]90|b[67]60|h[67]70/.test(n)) return 'mainboard';
  if (/memory|ddr[345]|\bram\b/.test(n)) return 'memory';
  if (/nvme|ssd|hdd|samsung|kingston|wd_|crucial|seagate|toshiba|drive/.test(n)) return 'storage';
  return 'other';
}

/**
 * Deduce la categoría directamente a partir del SensorId de LHM.
 * Rutas como "/intelcpu/0/temperature/0" o "/lpc/nct6798d/0/temperature/2"
 * identifican de forma unívoca el componente independientemente de la profundidad.
 */
function categoryFromSensorId(id: string): SensorCategory | null {
  const s = id.toLowerCase();
  if (s.includes('/intelcpu/') || s.includes('/amdcpu/') || s.includes('/cpu/')) return 'cpu';
  if (s.includes('/nvidiagpu/') || s.includes('/amdgpu/') || s.includes('/atigpu/') || s.includes('/gpu/')) return 'gpu';
  if (s.includes('/lpc/') || s.includes('/mainboard/')) return 'mainboard';
  if (s.includes('/ram/') || s.includes('/memory/')) return 'memory';
  if (s.includes('/hdd/') || s.includes('/ssd/') || s.includes('/nvme/') || s.includes('/storage/')) return 'storage';
  return null;
}

// Nombres típicos de nodos contenedores de LHM (categorías de sensor, NO hardware)
const NOMBRES_CONTENEDORES = /^(temperatures?|voltages?|fans?|clocks?|controls?|powers?|data|levels?|load|throughput|factors?|currents?)$/i;

const TIPOS_VALIDOS: Record<string, SensorKind> = {
  temperature: 'Temperature', fan: 'Fan', voltage: 'Voltage',
  load: 'Load', clock: 'Clock', power: 'Power',
  data: 'Data', throughput: 'Throughput', level: 'Level',
};

const PATRONES_ID_KIND: [string, SensorKind][] = [
  ['/temperature/', 'Temperature'], ['/load/', 'Load'], ['/fan/', 'Fan'],
  ['/voltage/', 'Voltage'], ['/clock/', 'Clock'], ['/power/', 'Power'],
];

function kindFromRawType(raw: unknown): SensorKind | null {
  if (!raw || raw === 'undefined') return null;
  return TIPOS_VALIDOS[String(raw).toLowerCase()] ?? null;
}

function kindFromSensorId(id: unknown): SensorKind | null {
  const idLower = String(id ?? '').toLowerCase();
  for (const [pattern, kind] of PATRONES_ID_KIND) {
    if (idLower.includes(pattern)) return kind;
  }
  return null;
}

function kindFromValueOrText(value: unknown, text: unknown): SensorKind {
  const valStr = String(value ?? '');
  if (/[°℃℉]/.test(valStr)) return 'Temperature';
  if (valStr.includes('%')) return 'Load';
  if (valStr.includes('RPM')) return 'Fan';
  if (valStr.includes(' V')) return 'Voltage';
  if (/mhz|ghz/i.test(valStr)) return 'Clock';
  if (valStr.includes(' W')) return 'Power';

  const textLower = String(text ?? '').toLowerCase();
  if (textLower.includes('temp')) return 'Temperature';

  return 'Other';
}

/**
 * Deduce el tipo de sensor a partir de node.Type, del SensorId o del valor/nombre.
 * Garantiza que cualquier lectura de temperatura siempre se reconozca como Temperature.
 */
function kindFromNode(node: any): SensorKind {
  return (
    kindFromRawType(node?.Type) ??
    kindFromSensorId(node?.SensorId) ??
    kindFromValueOrText(node?.Value, node?.Text)
  );
}

const HARDWARE_FALLBACK_NAMES: Partial<Record<SensorCategory, string>> = {
  cpu: 'CPU',
  gpu: 'GPU',
  mainboard: 'Mainboard',
};

function defaultHardwareName(cat: SensorCategory): string {
  return HARDWARE_FALLBACK_NAMES[cat] ?? 'Hardware';
}

function resolveHardwareContext(
  node: any,
  depth: number,
  currentHw: string,
  currentCat: SensorCategory,
): { hw: string; cat: SensorCategory } {
  const textStr = node?.Text ? String(node.Text).trim() : '';
  const esContenedor = NOMBRES_CONTENEDORES.test(textStr);
  const esCandidato = Boolean(textStr && !node?.SensorId && !esContenedor && (node?.ImageURL || depth === 2 || !currentHw));

  if (!esCandidato) {
    return { hw: currentHw, cat: currentCat };
  }

  const fromImg = categoryFromImage(node.ImageURL);
  const cat = fromImg !== 'other' ? fromImg : categoryFromName(textStr);
  return { hw: textStr, cat };
}

function buildSensorFromNode(node: any, hw: string, cat: SensorCategory): Sensor | null {
  if (!node?.SensorId) return null;
  const v = parseValue(node.Value);
  if (!isFinite(v.value)) return null;

  const id = String(node.SensorId);
  const finalCat = categoryFromSensorId(id) ?? cat;
  const mn = parseValue(node.Min);
  const mx = parseValue(node.Max);

  return {
    id,
    name: String(node.Text ?? id),
    hardware: hw || defaultHardwareName(finalCat),
    category: finalCat,
    kind: kindFromNode(node),
    value: v.value,
    unit: v.unit,
    min: isFinite(mn.value) ? mn.value : undefined,
    max: isFinite(mx.value) ? mx.value : undefined,
  };
}

// Walks the LHM tree. Hardware label sits at depth 2 (or on nodes with ImageURL)
function flattenLhmTree(node: any, depth: number, hardware: string, category: SensorCategory, out: Sensor[]): void {
  if (!node) return;
  const ctx = resolveHardwareContext(node, depth, hardware, category);
  const sensor = buildSensorFromNode(node, ctx.hw, ctx.cat);
  if (sensor) {
    out.push(sensor);
  }
  for (const c of node.Children ?? []) {
    flattenLhmTree(c, depth + 1, ctx.hw, ctx.cat, out);
  }
}

export function parseLhmTree(rootNode: any): Sensor[] {
  const out: Sensor[] = [];
  flattenLhmTree(rootNode, 0, '', 'other', out);
  return out;
}

function isAllowedTemperature(s: Sensor, allowedCategories: Set<SensorCategory>): boolean {
  if (s.kind !== 'Temperature') return false;
  if (allowedCategories.has(s.category)) return true;
  if (s.category === 'mainboard' && allowedCategories.has('cpu')) return true;

  const idOrName = (s.id + ' ' + s.name).toLowerCase();
  if (allowedCategories.has('cpu') && /cpu|core|package/.test(idOrName)) return true;
  if (allowedCategories.has('gpu') && /gpu|hot spot|vram/.test(idOrName)) return true;

  return false;
}

export function applyCategoryFilter(all: Sensor[], allowedCategories: Set<SensorCategory>): Sensor[] {
  return all.filter((s) => allowedCategories.has(s.category) || isAllowedTemperature(s, allowedCategories));
}
