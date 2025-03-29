import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'native-modules/**',
      '*.config.js',
      '*.config.cjs',
      '*.json',
      '*.lock',
      '.github/**',
      '.vscode/**',
      'public/**',
      'coverage/**',
    ]
  },
  
  // Base JS config
  js.configs.recommended,
  
  // Global settings for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      '@next/next': nextPlugin
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  
  // JavaScript file specific settings
  {
    files: ['**/*.{js,cjs,mjs}'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  
  // Backend file specific settings
  {
    files: ['src/main/**/*.{js,cjs,mjs}', 'src/server/**/*.{js,cjs,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },
];