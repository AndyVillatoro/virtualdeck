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
  let url = `${LINKS.newIssue}?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

  // Si excede el límite, recortar el log progresivamente.
  if (url.length > MAX_URL_LEN && logTail) {
    const trimmedBody = body.replace(
      new RegExp(t('bug.sectionLog') + '[\\s\\S]*$'),
      `${t('bug.sectionLog')}\n${t('bug.logTrimmed')}\n`,
    );
    url = `${LINKS.newIssue}?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(trimmedBody)}`;
  }
  return url;
}
