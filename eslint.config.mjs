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
);
