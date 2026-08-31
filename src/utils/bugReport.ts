import { LINKS } from '../data/links';
import type { PlatformInfo } from '../types';

// Construye una URL de "nuevo issue" en GitHub con título y cuerpo pre-llenados.
// GitHub tiene un límite práctico de ~8KB en la URL; truncamos el log y, si aun
// así es grande, sugerimos adjuntar el log exportado.

const MAX_URL_LEN = 7500;
const MAX_LOG_TAIL = 2500;
/** Marca de que el cuerpo se recortó, para que el que lo lea lo sepa. */
const AVISO_CORTE = '\n\n…';

export interface BugReportInput {
  platformInfo?: PlatformInfo | null;
  recentLog?: string;
  userNote?: string;
}

export function buildIssueUrl(
  input: BugReportInput,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const pi = input.platformInfo;
  const logTail = (input.recentLog ?? '').slice(-MAX_LOG_TAIL);

  const title = '[Bug] ';
  const bodyParts = [
    t('bug.sectionDesc'),
    input.userNote?.trim() || t('bug.descPlaceholder'),
    '',
    t('bug.sectionSteps'),
    '1. ',
    '2. ',
    '',
    t('bug.sectionEnv'),
    pi
      ? [
          `- VirtualDeck: ${pi.appVersion}`,
          `- OS: ${pi.os}`,
          `- Electron: ${pi.electron} · Chrome: ${pi.chrome}`,
          `- Locale: ${pi.locale}`,
        ].join('\n')
      : t('bug.envUnavailable'),
    '',
  ];

  if (logTail.trim()) {
    bodyParts.push(t('bug.sectionLog'), '```', logTail.trim(), '```', '');
  }

  const body = bodyParts.join('\n');
  const armar = (cuerpo: string) =>
    `${LINKS.newIssue}?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(cuerpo)}`;

  let url = armar(body);
  if (url.length <= MAX_URL_LEN) return url;

  /*
   * Primero se suelta el registro, que es lo prescindible: el usuario puede
   * adjuntarlo aparte.
   *
   * Se corta **por posición de texto y no con una expresión regular**. Antes se
   * hacía interpolando el título traducido dentro de un `RegExp`, sin escapar:
   * bastaba con que una traducción llevara un paréntesis o un corchete para que
   * el patrón dejara de casar y el recorte **no ocurriera, en silencio**.
   * Medido: con «## Registro (reciente)» la URL se iba a 15 337 caracteres.
   */
  const encabezadoLog = t('bug.sectionLog');
  const corte = body.indexOf(encabezadoLog);
  if (corte >= 0) {
    url = armar(`${body.slice(0, corte)}${encabezadoLog}\n${t('bug.logTrimmed')}\n`);
    if (url.length <= MAX_URL_LEN) return url;
  }

  /*
   * Y si aún no cabe, se recorta el cuerpo entero.
   *
   * Hace falta porque el resto tampoco tiene tope: la nota del usuario no lo
   * tiene, y una sola letra puede ocupar seis caracteres al codificarla. Sin
   * esto la función prometía un límite que no siempre cumplía, y GitHub
   * rechaza o trunca la petición sin decir por qué.
   */
  let cuerpo = corte >= 0 ? body.slice(0, corte) : body;
  while (cuerpo.length > 0 && armar(cuerpo + AVISO_CORTE).length > MAX_URL_LEN) {
    cuerpo = cuerpo.slice(0, Math.floor(cuerpo.length * 0.8));
  }
  return armar(cuerpo + AVISO_CORTE);
}
