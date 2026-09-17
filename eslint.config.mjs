import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Même socle que les apps de la suite (Monitorum/eslint.config.js), sans
// `react-refresh` : il ne concerne que le HMR d'une app Vite, pas un paquet.
export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', 'scripts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['packages/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Convention déjà suivie par le code : un préfixe `_` marque un
      // paramètre ou une erreur ignorés volontairement.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // e2e : helpers Playwright en JS exécutés sous Node.
    files: ['packages/e2e/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    extends: [js.configs.recommended],
  },
);
