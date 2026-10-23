/**
 * El mando móvil (1.1): la página que sirve el servidor local en `/`.
 *
 * Aquí solo se decide el tema (oscuro, claro, sistema o DOT 480), su acento y
 * el cromo fijo; la plantilla y su guion viven en `plantillaMandoPagina.ts`,
 * `guionMandoPagina.ts` y `pantallaMandoPagina.ts`, para que este archivo no
 * pase el tope de líneas del proyecto.
 *
 * Los iconos de los botones llegan ya resueltos a puntos desde el servidor
 * (`iconosMando.ts`): la página solo los dibuja, sin tabla de glifos propia.
 * El cromo fijo (cabecera, sliders) se incrusta desde el mismo catálogo
 * compartido, no copiado a mano.
 */
import { DOT_GLYPHS_8X8 } from '../../../src/components/dot480/dotGlyphs8x8';
import { plantillaMandoPagina } from './plantillaMandoPagina';

const TEXTOS = {
  es: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'ESCRIBA EL CÓDIGO DE SEIS CIFRAS QUE APARECE EN VIRTUALDECK',
    emparejar: 'EMPAREJAR', codigoMal: 'EL CÓDIGO NO VALE O YA CADUCÓ.',
    sinBotones: 'NO HAY BOTONES CON ACCIÓN EN ESTE DECK.', reintentar: 'REINTENTAR',
    sinConexion: 'SIN CONEXIÓN CON VIRTUALDECK.', olvidar: 'DESCONECTAR',
    pagina: 'PÁGINA', pantallaCompleta: 'PANTALLA COMPLETA',
    salirPantallaCompleta: 'SALIR DE PANTALLA COMPLETA', volumen: 'VOL', brillo: 'BRILLO',
  },
  en: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'ENTER THE SIX-DIGIT CODE SHOWN IN VIRTUALDECK',
    emparejar: 'PAIR', codigoMal: 'THAT CODE IS WRONG OR HAS EXPIRED.',
    sinBotones: 'THIS DECK HAS NO BUTTONS WITH AN ACTION.', reintentar: 'RETRY',
    sinConexion: 'NO CONNECTION TO VIRTUALDECK.', olvidar: 'DISCONNECT',
    pagina: 'PAGE', pantallaCompleta: 'FULLSCREEN',
    salirPantallaCompleta: 'EXIT FULLSCREEN', volumen: 'VOL', brillo: 'BRIGHTNESS',
  },
};

export interface DatosTemaMando {
  theme?: 'dark' | 'light' | 'dot480' | 'system';
  accent?: string;
}

export function paginaMando(nonceScript: string, nonceEstilo: string, datosTema?: DatosTemaMando, motorJs?: string): string {
  const modo = datosTema?.theme ?? 'dark';
  const acento = datosTema?.accent || (modo === 'dot480' ? '#ff3b30' : '#4a8ef0');
  const temaInicial = modo === 'system' ? 'system' : modo === 'light' ? 'light' : 'dark';
  const colorScheme = modo === 'system' ? 'dark light' : modo === 'light' ? 'light' : 'dark';
  const metaThemeColor = modo === 'light' ? '#d8dbe0' : '#070809';
  // El cromo fijo de la página sale del catálogo compartido, serializado al
  // servirla: es el mismo dato que la celda, no una copia que mantener.
  const cromo: Record<string, number[]> = {};
  for (const nombre of ['FULLSCREEN', 'MINIMIZE', 'CLOSE', 'SPEAKER', 'WEATHER_SUN', 'CPU']) {
    cromo[nombre] = DOT_GLYPHS_8X8[nombre];
  }
  return plantillaMandoPagina({
    nonceScript,
    nonceEstilo,
    temaInicial,
    colorScheme,
    metaThemeColor,
    acento,
    textosJson: JSON.stringify(TEXTOS),
    cromoJson: JSON.stringify(cromo),
    modoJson: JSON.stringify(modo),
    acentoJson: JSON.stringify(acento),
    motorJs: motorJs || '',
  });
}
