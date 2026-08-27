'use strict';

const path = require('node:path');

const expoPreset = require('jest-expo/jest-preset');

const sourceTransform = Object.keys(expoPreset.transform).find(
  (pattern) => pattern === '\\.[jt]sx?$',
);
if (!sourceTransform) {
  throw new Error(
    'The installed jest-expo preset no longer exposes its expected \\.[jt]sx?$ transform',
  );
}

module.exports = {
  ...expoPreset,
  rootDir: path.resolve(__dirname, '..'),
  collectCoverage: false,
  modulePathIgnorePatterns: ['<rootDir>/.stryker-[^/]*-tmp/', '<rootDir>/reports/'],
  testTimeout: 30_000,
  testPathIgnorePatterns: ['/node_modules/', '/.stryker-[^/]*-tmp/', '/reports/'],
  watchPathIgnorePatterns: ['<rootDir>/.stryker-[^/]*-tmp/', '<rootDir>/reports/'],
  transform: {
    ...expoPreset.transform,
    [sourceTransform]: path.join(__dirname, 'conditional-rendering-transformer.cjs'),
  },
};
