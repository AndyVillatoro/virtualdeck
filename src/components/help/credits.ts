// Atribuciones de software de terceros. LibreHardwareMonitor (MPL-2.0) se
// distribuye bundled → su atribución es OBLIGATORIA. OpenRGB (GPL-2.0) se
// descarga aparte pero lo listamos por transparencia.

export interface CreditEntry {
  name: string;
  license: string;
  url: string;
  /** True si se distribuye dentro del instalador (requiere atribución visible). */
  bundled?: boolean;
}

export const CREDITS: CreditEntry[] = [
  { name: 'LibreHardwareMonitor', license: 'MPL-2.0', url: 'https://github.com/LibreHardwareMonitor/LibreHardwareMonitor', bundled: true },
  { name: 'OpenRGB', license: 'GPL-2.0', url: 'https://openrgb.org/', bundled: false },
  { name: 'Electron', license: 'MIT', url: 'https://www.electronjs.org/' },
  { name: 'React', license: 'MIT', url: 'https://react.dev/' },
  { name: 'lucide-react', license: 'ISC', url: 'https://lucide.dev/' },
  { name: 'uiohook-napi', license: 'MIT', url: 'https://github.com/SnosMe/uiohook-napi' },
  { name: 'openrgb-sdk', license: 'MIT', url: 'https://github.com/vlakreeh/openrgb-sdk' },
];
