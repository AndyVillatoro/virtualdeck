import { LINKS } from '../data/links';
import type { PlatformInfo } from '../types';

// Construye una URL de "nuevo issue" en GitHub con título y cuerpo pre-llenados.
// GitHub tiene un límite práctico de ~8KB en la URL; truncamos el log y, si aun
// así es grande, sugerimos adjuntar el log exportado.

const MAX_URL_LEN = 7500;
const MAX_LOG_TAIL = 2500;

export interface BugReportInput {
  platformInfo?: PlatformInfo | null;
  recentLog?: string;
  userNote?: string;
}

export function buildIssueUrl(input: BugReportInput): string {
  const pi = input.platformInfo;
  const logTail = (input.recentLog ?? '').slice(-MAX_LOG_TAIL);

  const title = '[Bug] ';
  const bodyParts = [
    '## Descripción',
    input.userNote?.trim() || '<!-- Describe el problema: qué hacías, qué esperabas, qué pasó -->',
    '',
    '## Pasos para reproducir',
    '1. ',
    '2. ',
    '',
    '## Entorno',
    pi
      ? [
          `- VirtualDeck: ${pi.appVersion}`,
          `- OS: ${pi.os}`,
          `- Electron: ${pi.electron} · Chrome: ${pi.chrome}`,
          `- Locale: ${pi.locale}`,
        ].join('\n')
      : '- (no disponible)',
    '',
  ];

  if (logTail.trim()) {
    bodyParts.push('## Registro reciente', '```', logTail.trim(), '```', '');
  }

  const body = bodyParts.join('\n');
  let url = `${LINKS.newIssue}?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

  // Si excede el límite, recortar el log progresivamente.
  if (url.length > MAX_URL_LEN && logTail) {
    const trimmedBody = body.replace(/## Registro reciente[\s\S]*$/, '## Registro reciente\n(Adjuntá el log exportado: botón "Exportar registro" en Ayuda → Acerca de)\n');
    url = `${LINKS.newIssue}?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(trimmedBody)}`;
  }
  return url;
}
