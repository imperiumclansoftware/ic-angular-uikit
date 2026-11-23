// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Règles de sécurité communes (guidelines Angular de l'équipe). */
const securityRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'MemberExpression[property.name=/^bypassSecurityTrust/]',
      message: 'bypassSecurityTrust* désactive la protection XSS d’Angular : exception revue obligatoire (eslint-disable + justification).',
    },
    {
      selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
      message: 'Pas de manipulation directe du DOM : utiliser le binding Angular ou Renderer2.',
    },
    {
      selector: 'CallExpression[callee.object.name="document"][callee.property.name=/^(write|writeln)$/]',
      message: 'document.write est interdit.',
    },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Utiliser crypto.getRandomValues() ou un compteur.' },
  ],
  'no-restricted-globals': [
    'error',
    { name: 'localStorage', message: 'Passer par ThemeService / un stockage injecté ; jamais de jeton ni de donnée personnelle.' },
    { name: 'sessionStorage', message: 'Pas de jeton ni de donnée personnelle dans sessionStorage.' },
    { name: 'eval', message: 'eval est interdit.' },
  ],
};

module.exports = defineConfig([
  { ignores: ['dist/**', 'out-tsc/**', '.angular/**', 'projects/docs/src/app/generated/**', 'projects/docs/src/backend-examples/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      ...securityRules,
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // output<void>() est l'API officielle d'Angular pour un événement sans payload.
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    files: ['projects/ic-angular-uikit/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'ui', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'ui', style: 'kebab-case' }],
    },
  },
  {
    files: ['projects/docs/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'doc', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'doc', style: 'kebab-case' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
]);
