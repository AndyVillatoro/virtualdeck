/**
 * Límite de frecuencia por dirección del mando LAN (T-SEC-07, H-04).
 *
 * Un cubo de fichas por IP: se gasta una por petición y se rellena a ritmo
 * fijo. Los números son holgados para el uso real —el móvil sondea botones y
 * widgets cada pocos segundos y un slider arrastrado manda unas decenas por
 * segundo— y cortan a quien martillea la API o el emparejamiento.
 *
 * Puro (sin Node ni Electron) y con el reloj inyectable, para probarlo con
 * `scripts/probar-limite-mando.ts`.
 */

export interface OpcionesCubo {
  /** Fichas máximas: la ráfaga que se admite de golpe. */
  capacidad: number;
  /** Fichas que se recuperan por segundo. */
  porSegundo: number;
}

/** Más IPs que esto y se olvidan las que llevan un rato quietas. */
const MAX_DIRECCIONES = 1000;

export class LimiteFrecuencia {
  private cubos = new Map<string, { fichas: number; ultimo: number }>();

  constructor(private opciones: OpcionesCubo, private ahora: () => number = Date.now) {}

  /** ¿Se admite otra petición de esta dirección? Gasta una ficha si sí. */
  admitir(ip: string): boolean {
    const t = this.ahora();
    const { capacidad, porSegundo } = this.opciones;
    const cubo = this.cubos.get(ip) ?? { fichas: capacidad, ultimo: t };
    cubo.fichas = Math.min(capacidad, cubo.fichas + ((t - cubo.ultimo) / 1000) * porSegundo);
    cubo.ultimo = t;
    const admitida = cubo.fichas >= 1;
    if (admitida) cubo.fichas -= 1;
    this.cubos.set(ip, cubo);
    if (this.cubos.size > MAX_DIRECCIONES) this.podar(t);
    return admitida;
  }

  /** Quita los cubos que ya estarían llenos: no aportan nada. */
  private podar(t: number): void {
    const { capacidad, porSegundo } = this.opciones;
    for (const [ip, cubo] of this.cubos) {
      if (cubo.fichas + ((t - cubo.ultimo) / 1000) * porSegundo >= capacidad) this.cubos.delete(ip);
    }
  }
}

/**
 * Intentos de emparejamiento por código: cada IP tiene su cupo y además hay
 * un tope global. Antes el único contador era global, así que cualquiera en la
 * LAN quemaba en un segundo el código que el dueño acababa de generar.
 */
export class IntentosPareja {
  private porIp = new Map<string, number>();
  private total = 0;

  constructor(private maxPorIp: number, private maxTotal: number) {}

  /** Cuenta un intento; `false` si esa IP o el total ya se pasaron. */
  contar(ip: string): boolean {
    const n = (this.porIp.get(ip) ?? 0) + 1;
    this.porIp.set(ip, n);
    this.total += 1;
    return n <= this.maxPorIp && this.total <= this.maxTotal;
  }

  /** ¿Ya no admite a nadie más? (para tirar el código). */
  agotado(): boolean {
    return this.total >= this.maxTotal;
  }
}
