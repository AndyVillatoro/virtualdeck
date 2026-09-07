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

  // Herramientas de terceros que VirtualDeck usa pero **no** empaqueta: las
  // instala el usuario. LHM lo traiamos dentro y se quito (ver `sensors.ts`).
  lhm: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases',
  openrgb: 'https://openrgb.org/',

  // Donaciones. Cuenta real, cobra por PayPal.
  //
  // **GitHub Sponsors se quito, y no por pereza.** Exige Stripe Connect con la
  // region de residencia igual a la de la cuenta bancaria, y Stripe no opera en
  // Honduras (en America Latina solo Brasil y Mexico). El enlace que habia
  // mandaba a una pagina que no acepta patrocinios: un boton que no lleva a
  // ninguna parte es peor que no tenerlo.
  //
  // Los dos cobran al final por PayPal; se dejan los dos porque no cuestan lo
  // mismo al que dona: Ko-fi acepta tarjeta sin abrir cuenta y deja poner un
  // importe sugerido; PayPal directo es un clic menos para quien ya la tiene.
  kofi: 'https://ko-fi.com/cubecode',
  paypal: 'https://paypal.me/cubecode',
} as const;

export type DonationLink = { id: 'kofi' | 'paypal'; label: string; url: string };

export const DONATION_LINKS: DonationLink[] = [
  { id: 'kofi', label: 'Ko-fi', url: LINKS.kofi },
  { id: 'paypal', label: 'PayPal', url: LINKS.paypal },
];
