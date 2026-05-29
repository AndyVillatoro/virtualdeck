// Enlaces externos centralizados. Las URLs de donación son placeholders hasta
// que el usuario cree las cuentas — reemplazar los valores marcados con TODO.
// No incluir tracking ni nada intrusivo.

export const LINKS = {
  // Repo + soporte
  repo: 'https://github.com/AndyVillatoro/virtualdeck',
  issues: 'https://github.com/AndyVillatoro/virtualdeck/issues',
  newIssue: 'https://github.com/AndyVillatoro/virtualdeck/issues/new',
  docs: 'https://github.com/AndyVillatoro/virtualdeck/wiki',
  releases: 'https://github.com/AndyVillatoro/virtualdeck/releases',

  // Donaciones — TODO: reemplazar con las cuentas reales cuando existan.
  kofi: 'https://ko-fi.com/andyvillatoro',           // TODO: confirmar handle
  githubSponsors: 'https://github.com/sponsors/AndyVillatoro', // TODO: activar Sponsors
  paypal: 'https://paypal.me/andyvillatoro',          // TODO: confirmar handle
} as const;

export type DonationLink = { id: 'kofi' | 'githubSponsors' | 'paypal'; label: string; url: string };

export const DONATION_LINKS: DonationLink[] = [
  { id: 'kofi', label: 'Ko-fi', url: LINKS.kofi },
  { id: 'githubSponsors', label: 'GitHub Sponsors', url: LINKS.githubSponsors },
  { id: 'paypal', label: 'PayPal', url: LINKS.paypal },
];
