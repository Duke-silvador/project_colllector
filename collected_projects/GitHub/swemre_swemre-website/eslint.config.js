/**
 * Copyright 2026 swemre (emre@swemre.com). All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 with the Commons Clause
 * License Condition v1.0 (the "License"). Personal use of this code and
 * content is permitted; any commercial gain requires prior written
 * permission from the copyright holder. See the LICENSE file for full terms.
 *
 * Contact: emre@swemre.com
 */

import globals from 'globals'
import gts from 'gts'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import {defineConfig, globalIgnores} from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  ...gts,
  {
    rules: {
      semi: ['error', 'never'],
      'no-extra-semi': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // gts defaults to ./tsconfig.json, which here only holds references.
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    languageOptions: {
      // gts treats eslint.config.js as CommonJS; this project uses ESM.
      sourceType: 'module',
      globals: globals.node,
    },
  },
])
