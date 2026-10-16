import js from '@eslint/js';
import figmaPlugins from '@figma/eslint-plugin-figma-plugins';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import { configs as tsConfigs, plugin as tsPlugin } from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['lib']),
  {
    files: ['**/*.{js,ts}'],
    plugins: { js },
    extends: ['js/recommended']
  },
  {
    files: ['**/*.ts'],
    extends: [tsConfigs.recommended]
  },
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  figmaPlugins.flatConfigs.recommended,
  // Must come after all other rule sets so it can turn off conflicting formatting rules.
  // Formatting itself is handled by Prettier directly (npm run format), not through ESLint.
  prettierConfig,
  {
    plugins: { '@typescript-eslint': tsPlugin },
    settings: {
      'import/resolver': {
        typescript: true
      }
    },
    rules: {
      '@typescript-eslint/no-shadow': 'error',
      'import/order': [
        'warn',
        {
          alphabetize: {
            order: 'asc'
          },
          'newlines-between': 'always'
        }
      ],
      'import/no-unresolved': 'error'
    }
  }
]);
