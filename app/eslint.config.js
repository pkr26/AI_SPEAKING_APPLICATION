// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', 'coverage/*']),
  expoConfig,
  {
    files: ['app/diagnostic.tsx'],
    rules: {
      // TanStack Query results are intentionally copied into the multi-step
      // diagnostic state machine when a network response arrives.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
