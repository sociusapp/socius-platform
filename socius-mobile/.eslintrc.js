module.exports = {
  root: true,
  env: { browser: true, node: true, es2021: true },
  globals: { __DEV__: 'readonly' },
  parser: '@babel/eslint-parser',
  parserOptions: { requireConfigFile: false, ecmaFeatures: { jsx: true } },
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react-hooks'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'web-build/',
    '.expo/',
    'FileFolderStracture.js',
    'ProjectFlowsStracture.js',
  ],
  rules: { 'no-unused-vars': 'off', 'no-dupe-keys': 'off', 'no-empty': 'off' },
};
