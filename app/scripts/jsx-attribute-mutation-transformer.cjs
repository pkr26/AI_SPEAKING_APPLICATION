'use strict';

const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const babelJest = require('babel-jest');
const { resolveBabelOptions } = require('jest-expo/src/resolveBabelOptions');

const {
  MODE_ENV,
  PROJECT_ROOT_ENV,
  jsxAttributeMutationInstrumentationPlugin,
  normalizeMode,
} = require('./jsx-attribute-mutation-core.cjs');

const projectRoot = path.resolve(process.env[PROJECT_ROOT_ENV] || path.join(__dirname, '..'));
const mode = normalizeMode(process.env[MODE_ENV]);
const expoBabelOptions = resolveBabelOptions(projectRoot);
const delegate = babelJest.createTransformer({
  ...expoBabelOptions,
  plugins: [
    ...(expoBabelOptions.plugins || []),
    [jsxAttributeMutationInstrumentationPlugin, { projectRoot, mode }],
  ],
});

const transformerSourceHash = createHash('sha256')
  .update(fs.readFileSync(__filename))
  .update('\0')
  .update(fs.readFileSync(path.join(__dirname, 'jsx-attribute-mutation-core.cjs')))
  .update('\0')
  .update(mode)
  .digest('hex');

function campaignCacheKey(upstreamKey) {
  return createHash('sha256')
    .update(upstreamKey)
    .update('\0')
    .update(transformerSourceHash)
    .digest('hex');
}

module.exports = {
  canInstrument: delegate.canInstrument,

  getCacheKey(sourceText, sourcePath, transformOptions) {
    return campaignCacheKey(delegate.getCacheKey(sourceText, sourcePath, transformOptions));
  },

  async getCacheKeyAsync(sourceText, sourcePath, transformOptions) {
    const upstreamKey =
      typeof delegate.getCacheKeyAsync === 'function'
        ? await delegate.getCacheKeyAsync(sourceText, sourcePath, transformOptions)
        : delegate.getCacheKey(sourceText, sourcePath, transformOptions);
    return campaignCacheKey(upstreamKey);
  },

  process(sourceText, sourcePath, transformOptions) {
    return delegate.process(sourceText, sourcePath, transformOptions);
  },

  processAsync(sourceText, sourcePath, transformOptions) {
    if (typeof delegate.processAsync === 'function') {
      return delegate.processAsync(sourceText, sourcePath, transformOptions);
    }
    return Promise.resolve(delegate.process(sourceText, sourcePath, transformOptions));
  },
};
