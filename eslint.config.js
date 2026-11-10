module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly', module: 'writable', process: 'readonly',
        __dirname: 'readonly', console: 'readonly',
        describe: 'readonly', test: 'readonly', expect: 'readonly', beforeEach: 'readonly',
      },
    },
    rules: {},
  },
];