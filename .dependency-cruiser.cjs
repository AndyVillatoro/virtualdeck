/**
 * Reglas de arquitectura (SRP/SOLID) verificables.
 * Hacen cumplir las capas descritas en docs/ARQUITECTURA.md:
 *   electron/main  → proceso principal (Node)   · no conoce el renderer
 *   electron/preload → puente
 *   src/           → renderer (React)            · habla con main vía window.electronAPI
 *   src/screens > src/components > src/utils > src/data   (capas, sin importar "hacia arriba")
 *
 * Correr: `npm run lint:arch`. Cero violaciones = límites respetados.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'SRP: sin dependencias circulares (síntoma de responsabilidades entremezcladas).',
      from: {},
      to: { circular: true },
    },
    {
      name: 'main-no-renderer',
      severity: 'error',
      comment: 'El proceso main/preload no debe importar el renderer (src/), salvo tipos compartidos (src/types).',
      from: { path: '^electron/(main|preload)/' },
      to: { path: '^src/', pathNot: '^src/types(\\.ts)?$' },
    },
    {
      name: 'renderer-no-main',
      severity: 'error',
      comment: 'El renderer (src/) no debe importar el proceso main; comunicá vía window.electronAPI.',
      from: { path: '^src/' },
      to: { path: '^electron/main/' },
    },
    {
      name: 'components-no-screens',
      severity: 'error',
      comment: 'Capas: un componente reutilizable no debe depender de una pantalla.',
      from: { path: '^src/components/' },
      to: { path: '^src/screens/' },
    },
    {
      name: 'utils-no-ui',
      severity: 'error',
      comment: 'SRP: la lógica (utils) no debe importar UI (screens/components).',
      from: { path: '^src/utils/' },
      to: { path: '^src/(screens|components)/' },
    },
    {
      name: 'data-is-leaf',
      severity: 'error',
      comment: 'SRP: src/data es hoja (solo datos), no importa lógica ni UI.',
      from: { path: '^src/data/' },
      to: { path: '^src/(screens|components|utils)/' },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Módulo huérfano (nadie lo importa) — posible código muerto.',
      from: {
        orphan: true,
        pathNot: ['\\.d\\.ts$', '\\.(config|setup)\\.', '(^|/)(scripts|electron/main/index|electron/preload/index)'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
    includeOnly: '^(src|electron)/',
  },
};
