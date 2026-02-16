import eslint from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import globals from 'globals'

export default [
  // Cấu hình chung
  {
    ignores: ['node_modules/', 'dist/', 'build/', '*.min.js', 'coverage/']
  },

  // Cấu hình cho JavaScript files (trong giai đoạn chuyển đổi)
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      semi: ['warn', 'never'],
      quotes: ['error', 'single'],
      indent: ['warn', 2],
      'comma-dangle': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'array-bracket-spacing': 'warn',
      'space-before-blocks': ['error', 'always'],
      'keyword-spacing': 'warn',
      'arrow-spacing': 'warn',
      'no-multiple-empty-lines': 'warn',
      'no-trailing-spaces': 'warn',
      'no-multi-spaces': 'warn'
    }
  },

  // Cấu hình cho TypeScript files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports'
        }
      ],
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],

      // General rules
      'no-console': 'warn',
      semi: ['warn', 'never'],
      quotes: ['error', 'single'],
      indent: ['warn', 2],
      'comma-dangle': 'warn',
      'object-curly-spacing': ['warn', 'always'],
      'array-bracket-spacing': 'warn',
      'space-before-blocks': ['error', 'always'],
      'keyword-spacing': 'warn',
      'arrow-spacing': 'warn',
      'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
      'no-trailing-spaces': 'warn',
      'no-multi-spaces': 'warn',
      'newline-before-return': 'error',
      'no-undef': 'off' // TypeScript handles this
    }
  },

  // Cấu hình cho config files
  {
    files: ['*.config.ts', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  }
]
