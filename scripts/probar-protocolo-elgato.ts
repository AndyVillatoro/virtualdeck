/** Prueba pura del protocolo Elgato (Plus y Neo): `npx tsx scripts/probar-protocolo-elgato.ts` */
import {
  construirPaginasInfoBarNeo, construirPaginasTeclaElgato, construirPaginasTiraElgato,
  informeBrilloElgato, informeResetElgato, interpretarEntradaElgato,
} from '../electron/main/superficies/elgato/protocoloElgato';
import {
  buscarModeloElgato, ELGATO_VENDOR_ID, listarModelosElgato, STREAM_DECK_NEO, STREAM_DECK_PLUS,
} from '../electron/main/superficies/elgato/modelos';

let fallos = 0;
function afirmar(cond: boolean, nombre: string): void {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${nombre}`);
  if (!cond) fallos++;
}
const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const jpegDe = (n: number): Buffer => Buffer.from(Array.from({ length: n }, (_, i) => (i % 250) + 1));
const juntar = (ps: Buffer[], cab: number, usado: (p: Buffer) => number): Buffer =>
  Buffer.concat(ps.map((p) => p.subarray(cab, cab + usado(p))));

// Modelos
afirmar(ELGATO_VENDOR_ID === 0x0fd9, 'VID Elgato');
afirmar(buscarModeloElgato(0x0fd9, 0x0084) === STREAM_DECK_PLUS, 'buscar Plus');
afirmar(buscarModeloElgato(0x0fd9, 0x009a) === STREAM_DECK_NEO, 'buscar Neo');
afirmar(buscarModeloElgato(0x0fd9, 0x0001) === undefined, 'modelo desconocido');
afirmar(buscarModeloElgato(0x1234, 0x0084) === undefined, 'VID distinto');
afirmar(listarModelosElgato().length === 2, 'listar 2 modelos');
afirmar(STREAM_DECK_PLUS.teclas.ancho === 120 && STREAM_DECK_PLUS.ruedas === 4
  && STREAM_DECK_PLUS.tiraLcd?.zonas === 4 && !STREAM_DECK_PLUS.verificado, 'descriptor Plus');
afirmar(STREAM_DECK_NEO.teclas.ancho === 96 && STREAM_DECK_NEO.touchPoints === 2
  && STREAM_DECK_NEO.infoBar?.ancho === 248 && !STREAM_DECK_NEO.verificado, 'descriptor Neo');

// Teclas
const una = construirPaginasTeclaElgato(3, jpegDe(100));
afirmar(una.length === 1 && una[0].length === 1024, 'tecla: 1 página de 1024');
afirmar(igual([...una[0].subarray(0, 8)], [0x02, 0x07, 3, 1, 100, 0, 0, 0]), 'tecla: cabecera 1 página');
afirmar(una[0][108] === 0 && una[0][1023] === 0, 'tecla: relleno con ceros');
const exacta = construirPaginasTeclaElgato(0, jpegDe(1016));
afirmar(exacta.length === 1 && exacta[0][3] === 1, 'tecla: 1016 bytes = 1 página');
const multi = construirPaginasTeclaElgato(7, jpegDe(2500));
afirmar(multi.length === 3, 'tecla: 2500 bytes = 3 páginas');
afirmar(multi.map((p) => p[3]).join() === '0,0,1', 'tecla: esUltima solo en la última');
afirmar(multi.map((p) => p[6] | (p[7] << 8)).join() === '0,1,2', 'tecla: números de página');
afirmar(multi.map((p) => p[4] | (p[5] << 8)).join() === '1016,1016,468', 'tecla: longitudes');
afirmar(juntar(multi, 8, (p) => p[4] | (p[5] << 8)).equals(jpegDe(2500)), 'tecla: reensamblado idéntico');
afirmar(construirPaginasTeclaElgato(1, Buffer.alloc(0)).length === 1, 'tecla: JPEG vacío = 1 página');
afirmar(construirPaginasTeclaElgato(1, jpegDe(30), 64)[0].length === 64, 'tecla: tamaño de informe personalizado');
afirmar(construirPaginasTeclaElgato(1, jpegDe(200), 64).length === 4, 'tecla: paginación con informe de 64');
const grande = construirPaginasTeclaElgato(2, jpegDe(300), 1024);
afirmar(grande[0][4] === (300 & 0xff) && grande[0][5] === 1, 'tecla: longitud > 255 en LE');
const muchas = construirPaginasTeclaElgato(2, jpegDe(1016 * 300), 1024);
afirmar(muchas.length === 300 && muchas[299][6] === (299 & 0xff) && muchas[299][7] === 1, 'tecla: página > 255 en LE');

// Tira
const tira = construirPaginasTiraElgato(200, 0, 200, 100, jpegDe(100));
afirmar(igual([...tira[0].subarray(0, 16)], [0x02, 0x0c, 200, 0, 0, 0, 200, 0, 100, 0, 1, 0, 0, 100, 0, 0]), 'tira: cabecera');
afirmar(tira[0].length === 1024, 'tira: 1024 bytes');
const tiraMulti = construirPaginasTiraElgato(0x0123, 0x0045, 800, 100, jpegDe(2100));
afirmar(tiraMulti.length === 3, 'tira: 2100 bytes = 3 páginas');
afirmar(tiraMulti[0][2] === 0x23 && tiraMulti[0][3] === 0x01 && tiraMulti[0][4] === 0x45, 'tira: x/y LE');
afirmar(tiraMulti[0][6] === (800 & 0xff) && tiraMulti[0][7] === 3, 'tira: ancho 800 LE');
afirmar(tiraMulti.map((p) => p[10]).join() === '0,0,1', 'tira: esUltima');
afirmar(tiraMulti.map((p) => p[11] | (p[12] << 8)).join() === '0,1,2', 'tira: páginas');
afirmar(tiraMulti.map((p) => p[13] | (p[14] << 8)).join() === '1008,1008,84', 'tira: longitudes');
afirmar(juntar(tiraMulti, 16, (p) => p[13] | (p[14] << 8)).equals(jpegDe(2100)), 'tira: reensamblado idéntico');

// Infobar Neo
const info = construirPaginasInfoBarNeo(jpegDe(1100));
afirmar(info.length === 2 && info[0].length === 1024, 'infobar: 2 páginas');
afirmar(igual([...info[0].subarray(0, 8)], [0x02, 0x0b, 0, 0, 0xf8, 0x03, 0, 0]), 'infobar: cabecera página 0');
afirmar(igual([...info[1].subarray(0, 8)], [0x02, 0x0b, 0, 1, 84, 0, 1, 0]), 'infobar: cabecera última');
afirmar(juntar(info, 8, (p) => p[4] | (p[5] << 8)).equals(jpegDe(1100)), 'infobar: reensamblado idéntico');

// Brillo y reset
const b = informeBrilloElgato(55);
afirmar(b.length === 32 && igual([...b.subarray(0, 3)], [3, 8, 55]), 'brillo 55');
afirmar(informeBrilloElgato(-10)[2] === 0, 'brillo clamp inferior');
afirmar(informeBrilloElgato(250)[2] === 100, 'brillo clamp superior');
afirmar(informeBrilloElgato(NaN)[2] === 0, 'brillo NaN = 0');
const r = informeResetElgato();
afirmar(r.length === 32 && r[0] === 3 && r[1] === 2 && r[2] === 0, 'reset');

// Entrada: teclas
const informe = (n = 31): Buffer => { const x = Buffer.alloc(n); x[0] = 1; return x; };
const teclas = informe(); teclas[1] = 0x00; teclas[4 + 2] = 1; teclas[4 + 5] = 1;
let res = interpretarEntradaElgato(teclas, new Uint8Array(8));
afirmar(igual(res.eventos, [{ tipo: 'tecla:abajo', indice: 2 }, { tipo: 'tecla:abajo', indice: 5 }]), 'teclas: abajo 2 y 5');
afirmar(res.nuevoEstadoTeclas[2] === 1 && res.nuevoEstadoTeclas[5] === 1, 'teclas: nuevo estado');
const repetido = interpretarEntradaElgato(teclas, res.nuevoEstadoTeclas);
afirmar(repetido.eventos.length === 0, 'teclas: sin cambios = sin eventos');
const suelta = informe(); suelta[1] = 0x00; suelta[4 + 5] = 1;
res = interpretarEntradaElgato(suelta, repetido.nuevoEstadoTeclas);
afirmar(igual(res.eventos, [{ tipo: 'tecla:arriba', indice: 2 }]), 'teclas: arriba 2');
const entrada = new Uint8Array(8); entrada[0] = 1;
const previo = Uint8Array.from(entrada);
interpretarEntradaElgato(teclas, entrada);
afirmar(igual([...entrada], [...previo]), 'teclas: no muta el estado previo');
afirmar(interpretarEntradaElgato(informe(6), new Uint8Array(8)).eventos.length === 0, 'teclas: informe corto ignorado');

// Entrada: Neo touch points
const neo = informe(); neo[1] = 0; neo[12] = 1;
res = interpretarEntradaElgato(neo, new Uint8Array(10), 'neo');
afirmar(igual(res.eventos, [{ tipo: 'tecla:abajo', indice: 8 }]), 'neo: touchpoint 0 = índice 8');
neo[13] = 1; neo[12] = 0; neo[4] = 1;
res = interpretarEntradaElgato(neo, res.nuevoEstadoTeclas, 'neo');
afirmar(igual(res.eventos, [{ tipo: 'tecla:abajo', indice: 0 }, { tipo: 'tecla:arriba', indice: 8 },
  { tipo: 'tecla:abajo', indice: 9 }]), 'neo: tecla 0, touchpoint 0 arriba, touchpoint 1 abajo');
afirmar(res.nuevoEstadoTeclas.length === 10, 'neo: estado de 10 posiciones');
afirmar(interpretarEntradaElgato(neo, new Uint8Array(10), 'neo').eventos.length === 2, 'neo: dos teclas activas desde cero');
const sinTira = informe(); sinTira[1] = 2; sinTira[4] = 1;
afirmar(interpretarEntradaElgato(sinTira, new Uint8Array(10), 'neo').eventos.length === 0, 'neo: ignora tira');

// Entrada: tira LCD
const toque = informe(); toque[1] = 2; toque[4] = 1; toque.writeUInt16LE(450, 6); toque.writeUInt16LE(40, 8);
res = interpretarEntradaElgato(toque, new Uint8Array(8));
afirmar(igual(res.eventos, [{ tipo: 'tira:toque', zona: 2, x: 450, y: 40, largo: false }]), 'tira: toque corto zona 2');
toque[4] = 2;
afirmar(igual(interpretarEntradaElgato(toque, new Uint8Array(8)).eventos,
  [{ tipo: 'tira:toque', zona: 2, x: 450, y: 40, largo: true }]), 'tira: toque largo');
toque.writeUInt16LE(799, 6);
afirmar((interpretarEntradaElgato(toque, new Uint8Array(8)).eventos[0] as { zona: number }).zona === 3, 'tira: zona 3 en 799');
toque.writeUInt16LE(2000, 6);
afirmar((interpretarEntradaElgato(toque, new Uint8Array(8)).eventos[0] as { zona: number }).zona === 3, 'tira: zona acotada a 3');
toque.writeUInt16LE(0, 6);
afirmar((interpretarEntradaElgato(toque, new Uint8Array(8)).eventos[0] as { zona: number }).zona === 0, 'tira: zona 0');
const arr = informe(); arr[1] = 2; arr[4] = 3;
arr.writeUInt16LE(100, 6); arr.writeUInt16LE(50, 8); arr.writeUInt16LE(700, 10); arr.writeUInt16LE(60, 12);
afirmar(igual(interpretarEntradaElgato(arr, new Uint8Array(8)).eventos,
  [{ tipo: 'tira:arrastre', zona: 0, x0: 100, y0: 50, x1: 700, y1: 60 }]), 'tira: arrastre');
arr[4] = 9;
afirmar(interpretarEntradaElgato(arr, new Uint8Array(8)).eventos.length === 0, 'tira: tipo desconocido ignorado');

// Entrada: encoders
const giro = informe(); giro[1] = 3; giro[4] = 1; giro[5] = 3; giro[6] = 0xfd; giro[8] = 0x80;
res = interpretarEntradaElgato(giro, new Uint8Array(8));
afirmar(igual(res.eventos, [{ tipo: 'rueda:giro', indice: 0, pasos: 3 }, { tipo: 'rueda:giro', indice: 1, pasos: -3 },
  { tipo: 'rueda:giro', indice: 3, pasos: -128 }]), 'encoders: giro positivo y negativo');
const quieto = informe(); quieto[1] = 3; quieto[4] = 1;
afirmar(interpretarEntradaElgato(quieto, new Uint8Array(8)).eventos.length === 0, 'encoders: giro 0 sin eventos');
const pulso = informe(); pulso[1] = 3; pulso[4] = 0; pulso[6] = 1;
res = interpretarEntradaElgato(pulso, new Uint8Array(8));
afirmar(igual(res.eventos, [{ tipo: 'rueda:abajo', indice: 1 }]), 'encoders: pulsación abajo');
afirmar(interpretarEntradaElgato(pulso, res.nuevoEstadoTeclas).eventos.length === 0, 'encoders: pulsación repetida');
pulso[6] = 0;
afirmar(igual(interpretarEntradaElgato(pulso, res.nuevoEstadoTeclas).eventos, [{ tipo: 'rueda:arriba', indice: 1 }]), 'encoders: pulsación arriba');
afirmar(res.nuevoEstadoTeclas.slice(0, 8).every((v) => v === 0), 'encoders: no toca estado de teclas');
pulso[4] = 7;
afirmar(interpretarEntradaElgato(pulso, new Uint8Array(8)).eventos.length === 0, 'encoders: sub-evento desconocido');

// Robustez
const raro = informe(); raro[1] = 0x77;
afirmar(interpretarEntradaElgato(raro, new Uint8Array(8)).eventos.length === 0, 'tipo desconocido ignorado');
afirmar(interpretarEntradaElgato(Buffer.alloc(0), new Uint8Array(8)).eventos.length === 0, 'informe vacío');
const malo = informe(); malo[0] = 2; malo[1] = 0; malo[4] = 1;
afirmar(interpretarEntradaElgato(malo, new Uint8Array(8)).eventos.length === 0, 'byte 0 distinto de 0x01');
afirmar(interpretarEntradaElgato(informe(8), new Uint8Array(0)).nuevoEstadoTeclas.length >= 8, 'estado previo vacío tolerado');

console.log(fallos === 0 ? '\nTodo OK' : `\n${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);

