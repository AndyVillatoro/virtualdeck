/** Prueba pura del reposo de docks: `npx tsx scripts/probar-reposo-dock.ts` */
import { crearGestorReposo } from '../electron/main/superficies/reposo';

let fallos = 0;
function afirmar(cond: boolean, nombre: string): void {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${nombre}`);
  if (!cond) fallos++;
}

let reloj = 1000;
const llamadas: Array<[string, number]> = [];
const g = crearGestorReposo(
  { aplicarBrillo: (s, v) => llamadas.push([s, v]), ahora: () => reloj },
  { atenuarTrasMs: 1000, dormirTrasMs: 5000 },
);
const ultima = () => llamadas[llamadas.length - 1];

g.registrarDispositivo('A', 70);
afirmar(g.estadoDe('A') === 'despierto', 'estado inicial despierto');
afirmar(g.brilloUsuarioDe('A') === 70, 'brillo inicial 70');

reloj += 999;
g.evaluarInactividad();
afirmar(g.estadoDe('A') === 'despierto', 'sigue despierto antes del umbral');
reloj += 1;
g.evaluarInactividad();
afirmar(g.estadoDe('A') === 'atenuado', 'atenuado tras atenuarTrasMs');
afirmar(ultima()?.[1] === 15, 'brillo atenuado = 15');

reloj += 4000;
g.evaluarInactividad();
afirmar(g.estadoDe('A') === 'dormido', 'dormido tras dormirTrasMs');
afirmar(ultima()?.[1] === 0, 'brillo 0 al dormir');

// Actividad desde dormido
let r = g.registrarActividad('A');
afirmar(g.estadoDe('A') === 'despierto', 'actividad despierta desde dormido');
afirmar(ultima()?.[1] === 70, 'restaura brillo del usuario (dormido)');
afirmar(r.consumirEntrada === true, 'primera pulsación consumida');
r = g.registrarActividad('A');
afirmar(r.consumirEntrada === false, 'segunda pulsación no consumida');

// Actividad desde atenuado
reloj += 1000;
g.evaluarInactividad();
afirmar(g.estadoDe('A') === 'atenuado', 'atenuado de nuevo');
r = g.registrarActividad('A');
afirmar(g.estadoDe('A') === 'despierto', 'actividad restaura desde atenuado');
afirmar(ultima()?.[1] === 70, 'restaura brillo del usuario (atenuado)');
afirmar(r.consumirEntrada === false, 'atenuado no consume entrada');

// fijarBrilloUsuario
g.fijarBrilloUsuario('A', 40);
afirmar(g.brilloUsuarioDe('A') === 40, 'brillo de usuario actualizado');
reloj += 5000;
g.evaluarInactividad();
g.registrarActividad('A');
afirmar(ultima()?.[1] === 40, 'despierta con el brillo fijado');

// Bloqueo de sesión
g.alBloquearSesion();
afirmar(g.estadoDe('A') === 'dormido' && ultima()?.[1] === 0, 'bloqueo duerme el dock');
g.alDesbloquearSesion();
afirmar(g.estadoDe('A') === 'despierto' && ultima()?.[1] === 40, 'desbloqueo restaura brillo');

g.retirarDispositivo('A');
g.limpiar();

if (fallos > 0) {
  console.error(`${fallos} prueba(s) fallaron`);
  process.exit(1);
}
console.log('Todas las pruebas pasaron');
