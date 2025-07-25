module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: require('@babel/eslint-parser'),
      parserOptions: {
        requireConfigFile: false,
        allowImportExportEverywhere: true,
        babelOptions: {
          presets: ['@babel/preset-env'],
        },
      },
      globals: {
        // Node.js globals (equivalent to env: { node: true })
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        // ES2020 globals (equivalent to env: { es2020: true })
        globalThis: 'readonly',
        BigInt: 'readonly',
        BigInt64Array: 'readonly',
        BigUint64Array: 'readonly',
      },
    },
    files: ['src/**/*.js'],
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.min.js',
    ],
    rules: {
      // ESLint recommended rules (equivalent to extends: ['eslint:recommended'])
      'no-cond-assign': 'error',
      'no-console': 1, // Override recommended with warn level
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-empty-character-class': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 0, // Disabled as per your config
      'no-extra-parens': 'off',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-obj-calls': 'error',
      'no-prototype-builtins': 'error',
      'no-regex-spaces': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'warn',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Common rules as per your specification
      'no-lonely-if': 1,
      'no-unused-vars': 1,
      'no-trailing-spaces': 1,
      'no-multi-spaces': 1,
      'no-multiple-empty-lines': 1,
      'space-before-blocks': ['error', 'always'],
      'object-curly-spacing': [1, 'always'],
      'indent': ['warn', 2],
      'semi': [1, 'never'],
      'quotes': ['error', 'single'],
      'array-bracket-spacing': 1,
      'linebreak-style': 0,
      'keyword-spacing': 1,
      'comma-dangle': 1,
      'comma-spacing': 1,
      'arrow-spacing': 1
    },
  }
];
