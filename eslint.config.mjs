import path from 'node:path';
import url from 'node:url';

import { includeIgnoreFile } from '@eslint/compat';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPerfectionistPlugin from 'eslint-plugin-perfectionist';
import prettierPlugin from 'eslint-plugin-prettier';
import recommendedPlugin from 'eslint-plugin-prettier/recommended';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const gitignorePath = path.resolve(__dirname, '.gitignore');

const config = tseslint.config(
  {
    plugins: {
      prettier: prettierPlugin,
      unicorn: unicornPlugin
    }
  },
  eslint.configs.recommended,
  eslintConfigPrettier,
  recommendedPlugin,
  {
    languageOptions: {
      globals: {
        ...globals.builtin
      }
    },
    name: 'Common',
    rules: {
      'unicorn/better-regex': 'error',
      'unicorn/prefer-node-protocol': 'error'
    }
  },
  {
    name: 'TypeScript - Base files',
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      globals: {
        ...globals.node
      },
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 5,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true
        }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
          prefer: 'type-imports'
        }
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          ignoredMethodNames: [
            'onModuleInit',
            'onModuleDestroy',
            'onApplicationBootstrap',
            'onApplicationShutdown'
          ],
          overrides: {
            accessors: 'no-public',
            constructors: 'no-public',
            methods: 'explicit',
            parameterProperties: 'explicit',
            properties: 'explicit'
          }
        }
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-extraneous-class': [
        'error',
        {
          allowEmpty: true,
          allowStaticOnly: true
        }
      ],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        {
          allowConstantLoopConditions: true
        }
      ],
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: true,
          allowNever: true,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: true
        }
      ],
      'typescript-eslint/no-redundant-type-constituents': 'off'
    }
  },
  {
    name: 'TypeScript - test files',
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts', '**/*.e2e-test.ts'],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'require-await': 'off'
    }
  },
  {
    name: 'JavaScript',
    extends: [tseslint.configs.disableTypeChecked],
    files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  },
  {
    extends: [eslintPerfectionistPlugin.configs['recommended-alphabetical']],
    name: 'Perfectionist',
    rules: {
      '@typescript-eslint/sort-type-constituents': 'off',
      'perfectionist/sort-classes': [
        'error',
        {
          partitionByComment: true,
          type: 'natural',
          groups: [
            'index-signature',
            'static-property',
            ['private-property', 'private-accessor-property'],
            ['protected-property', 'protected-accessor-property'],
            ['property', 'accessor-property'],
            'constructor',
            'life-cycle-methods',
            ['get-method', 'set-method'],
            'method',
            'protected-method',
            'private-method',
            'static-method',
            'static-block',
            'protected-static-method',
            'private-static-method',
            'unknown'
          ],
          customGroups: [
            {
              groupName: 'life-cycle-methods',
              type: 'unsorted',
              elementNamePattern:
                '^(onModuleInit|onModuleDestroy|onApplicationBootstrap|beforeApplicationShutdown|onApplicationShutdown)$'
            }
          ]
        }
      ],
      'perfectionist/sort-modules': 'off',
      'perfectionist/sort-enums': 'off',
      'perfectionist/sort-exports': 'off',
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-union-types': [
        'error',
        {
          groups: ['unknown', 'keyword', 'nullish'],
          order: 'asc',
          type: 'natural'
        }
      ]
    }
  },
  {
    rules: {
      'array-callback-return': 'off',
      'arrow-body-style': ['warn', 'as-needed'],
      'comma-dangle': 'off',
      'max-len': [
        'warn',
        {
          code: 100,
          ignoreComments: true,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreUrls: true
        }
      ],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-else-return': 'error',
      'no-fallthrough': ['error', { commentPattern: '.*intentional fallthrough.*' }],
      'no-implicit-coercion': ['error', { boolean: false, number: false }],
      'no-lonely-if': 'error',
      'no-return-await': 'error',
      'no-throw-literal': 'off',
      'no-unused-private-class-members': 'warn',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'off',
      'no-var': 'error',
      'no-void': ['error', { allowAsStatement: true }],
      'prefer-const': 'error',
      'prefer-object-has-own': 'error',
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prettier/prettier': 'warn',
      'require-await': 'off'
    }
  },
  {
    ignores: [
      ...(includeIgnoreFile(gitignorePath).ignores || []),
      '**/node_modules/**',
      '**/dist/**',
      '**/dist/',
      '**/fixtures/**',
      '**/coverage/**',
      '**/__snapshots__/**',
      '.docker/',
      '.docker/*',
      '.github/',
      '.git/',
      '.husky/',
      '.vscode/'
    ],
    name: 'Global ignores'
  }
);

export default config;
