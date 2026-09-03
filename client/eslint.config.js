import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      // Hydrating local state from props/context or kicking off an initial fetch
      // inside an effect is used throughout this codebase intentionally; keep it
      // visible as a warning rather than failing the build.
      'react-hooks/set-state-in-effect': 'warn',
      // Co-locating a context hook (e.g. useAuth) with its provider only costs
      // fast-refresh granularity in dev; not worth splitting every consumer.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
