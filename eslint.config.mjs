// ESLint flat config. Señal de calidad + olores de SRP (archivos/funciones que
// hacen de más). Las reglas de tamaño/complejidad son `warn` a propósito: marcan
// candidatos a dividir (ver docs/ROADMAP.md bloque B) sin bloquear el build.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'out/**', 'dist/**', 'build/**', 'node_modules/**',
      'resources/**', 'scripts/**', '**/*.config.*',
      'opencode-export/**', '_referencias/**', 'auditorias/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Hooks de React: rules-of-hooks es bug real (error); exhaustive-deps es señal (warn).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // TypeScript ya verifica variables no definidas; no-undef daría falsos
      // positivos con globals del navegador/Node.
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Olores de SRP — un archivo/función que crece de más probablemente hace de más.
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', 18],
      'max-depth': ['warn', 4],
      // Patrones legítimos del proyecto (interop Node/PowerShell, regex de normalización
      // unicode en media.ts, parche Module._load): señal, no bloqueo.
      'no-useless-escape': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-irregular-whitespace': ['warn', { skipRegExps: true, skipStrings: true }],
      'no-misleading-character-class': 'warn',
      'no-useless-assignment': 'warn',
      'no-self-assign': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
  {
    // El modo claro solo funciona si el color sale del contexto. Importar la
    // paleta `VD` directamente de `design` congela los colores en oscuro, y el
    // fallo no se ve en TypeScript ni en el build: se ve en pantalla, y solo si
    // alguien prueba el tema claro en esa pantalla concreta. Se prohibe.
    //
    // `src/utils/theme.tsx` es quien construye el contexto, asi que si importa.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/utils/theme.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/design'],
          importNames: ['VD', 'VD_LIGHT'],
          message: 'Usa useTheme() en vez de importar la paleta: si no, la pantalla se queda en modo oscuro.',
        }],
      }],
    },
  },
  {
    // Regla de la estetica: **nada de blanco puro** como color de interfaz.
    // Se colaba como texto sobre el acento (`color: '#fff'`) en siete sitios a
    // la vez; el texto sobre acento es `VD.onAccent` y sobre otro color,
    // `textoSobre(color)`. Solo mira propiedades y atributos de color: un
    // `'#ffffff'` como **dato** (el color de un LED, una muestra de la paleta
    // que elige el usuario) no es interfaz y no se toca.
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "Property[key.name=/^(color|background|backgroundColor|borderColor|fill|stroke)$/] > Literal[value=/^#(fff|ffffff)$/i]",
          message: 'Blanco puro prohibido en la interfaz: usa VD.onAccent, textoSobre(color) o un token del tema.',
        },
        {
          selector: "JSXAttribute[name.name=/^(color|fill|stroke)$/] > Literal[value=/^#(fff|ffffff)$/i]",
          message: 'Blanco puro prohibido en la interfaz: usa VD.onAccent, textoSobre(color) o un token del tema.',
        },
      ],
    },
  },
  {
    // Archivos que son datos, no logica: el limite de lineas no dice nada de
    // ellos. `brandIcons.ts` son 1500 lineas de bitmaps de iconos; partirlo en
    // cinco archivos de 300 no lo hace mas facil de leer ni de cambiar. Vive
    // en `src/comun/` desde que el mando movil resuelve la marca en el proceso
    // principal, asi que se nombra solo ese archivo, no todo `src/comun/**`.
    files: ['src/data/**', 'src/comun/brandIcons.ts'],
    rules: { 'max-lines': 'off' },
  },
);
