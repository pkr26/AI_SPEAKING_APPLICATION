'use strict';

const path = require('node:path');

const babel = require('@babel/core');

const MODE_ENV = 'JSX_ATTRIBUTE_MUTATION_MODE';
const PROJECT_ROOT_ENV = 'JSX_ATTRIBUTE_MUTATION_PROJECT_ROOT';
const SITE_ENV = 'JSX_ATTRIBUTE_MUTANT_SITE';
const JSX_ATTRIBUTE_MUTATION_MODES = Object.freeze(['event', 'accessibility']);
const modeSet = new Set(JSX_ATTRIBUTE_MUTATION_MODES);
const instrumentedNode = Symbol('jsxAttributeMutationInstrumented');

function normalizeMode(mode) {
  if (!modeSet.has(mode)) {
    throw new Error(
      `JSX attribute mutation mode must be one of ${JSX_ATTRIBUTE_MUTATION_MODES.join(', ')} ` +
        `(received ${JSON.stringify(mode)})`,
    );
  }
  return mode;
}

function normalizeRelativeFile(relativeFile) {
  if (typeof relativeFile !== 'string' || relativeFile.length === 0) {
    throw new TypeError('relativeFile must be a non-empty string');
  }
  const normalized = path.posix.normalize(relativeFile.replaceAll('\\', '/'));
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`relativeFile must stay inside the app directory: ${relativeFile}`);
  }
  return normalized;
}

function hasExactLocation(node) {
  return (
    node?.loc !== null &&
    node?.loc !== undefined &&
    Number.isInteger(node.start) &&
    Number.isInteger(node.end)
  );
}

function locationOf(node) {
  if (!hasExactLocation(node)) {
    throw new Error(`Babel did not provide an exact location for ${node?.type ?? 'node'}`);
  }
  return {
    start: {
      line: node.loc.start.line,
      column: node.loc.start.column,
      offset: node.start,
    },
    end: {
      line: node.loc.end.line,
      column: node.loc.end.column,
      offset: node.end,
    },
  };
}

function attributeName(node) {
  return babel.types.isJSXIdentifier(node.name) ? node.name.name : null;
}

function isEventAttribute(name) {
  // React Native's list API has one numeric configuration prop whose name
  // happens to start with `on`: onEndReachedThreshold. It is not a callback,
  // and replacing it with a function would not be an event-wiring mutant.
  return /^on[A-Z]/u.test(name) && !name.endsWith('Threshold');
}

function isAccessibilityAttribute(name) {
  return (
    name === 'accessible' ||
    name === 'importantForAccessibility' ||
    name.startsWith('accessibility')
  );
}

function attributeMatchesMode(node, mode) {
  const name = attributeName(node);
  if (name === null) return false;
  if (mode === 'event') {
    return (
      isEventAttribute(name) &&
      babel.types.isJSXExpressionContainer(node.value) &&
      !babel.types.isJSXEmptyExpression(node.value.expression)
    );
  }
  return isAccessibilityAttribute(name);
}

function siteId(mode, relativeFile, name, location) {
  return (
    `jsx:${mode}:${relativeFile}:${name}:` +
    `${location.start.line}:${location.start.column}-${location.end.line}:${location.end.column}`
  );
}

function jsxAttributeSiteForNode(node, source, relativeFile, requestedMode) {
  const mode = normalizeMode(requestedMode);
  if (!babel.types.isJSXAttribute(node) || !hasExactLocation(node)) return null;
  if (!attributeMatchesMode(node, mode)) return null;

  const file = normalizeRelativeFile(relativeFile);
  const name = attributeName(node);
  const attributeLocation = locationOf(node);
  const valueLocation = hasExactLocation(node.value) ? locationOf(node.value) : null;
  const valueSource = node.value ? source.slice(node.value.start, node.value.end) : null;
  return {
    id: siteId(mode, file, name, attributeLocation),
    mode,
    file,
    attributeName: name,
    attributeLocation,
    valueLocation,
    attributeSource: source.slice(node.start, node.end),
    valueSource,
    mutation:
      mode === 'event'
        ? 'replace callback value with a variadic no-op'
        : 'remove the attribute from the rendered element',
  };
}

function parseTypeScriptJsx(source, filename) {
  try {
    return babel.parseSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      sourceType: 'unambiguous',
      parserOpts: { plugins: ['jsx', 'typescript'] },
    });
  } catch (error) {
    error.message = `Could not parse ${filename} for JSX attribute mutation discovery: ${error.message}`;
    throw error;
  }
}

function discoverJsxAttributeMutationSites(
  source,
  { relativeFile, mode, filename = relativeFile },
) {
  if (typeof source !== 'string') throw new TypeError('source must be a string');
  const normalizedMode = normalizeMode(mode);
  const normalizedFile = normalizeRelativeFile(relativeFile);
  const ast = parseTypeScriptJsx(source, filename);
  const sites = [];

  babel.traverse(ast, {
    JSXAttribute(attributePath) {
      const site = jsxAttributeSiteForNode(
        attributePath.node,
        source,
        normalizedFile,
        normalizedMode,
      );
      if (site) sites.push(site);
    },
  });

  sites.sort(
    (left, right) => left.attributeLocation.start.offset - right.attributeLocation.start.offset,
  );
  const ids = sites.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`JSX ${normalizedMode} discovery generated duplicate site IDs`);
  }
  return sites;
}

function sourceRelativeFile(filename, projectRoot) {
  const relative = path.relative(projectRoot, filename);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) return null;
  const normalized = relative.split(path.sep).join('/');
  if (!normalized.startsWith('src/') || !normalized.endsWith('.tsx')) return null;
  return normalized;
}

function environmentMember(types, name) {
  return types.memberExpression(
    types.memberExpression(types.identifier('process'), types.identifier('env')),
    types.identifier(name),
  );
}

function selectedSiteExpression(types, id) {
  return types.binaryExpression('===', environmentMember(types, SITE_ENV), types.stringLiteral(id));
}

function eventNoop(types) {
  return types.arrowFunctionExpression(
    [types.restElement(types.identifier('ignoredEventArguments'))],
    types.unaryExpression('void', types.numericLiteral(0)),
  );
}

function accessibilityPropertyValue(types, node) {
  if (node.value === null) return types.booleanLiteral(true);
  if (types.isStringLiteral(node.value)) return types.cloneNode(node.value, true);
  if (types.isJSXExpressionContainer(node.value)) {
    if (types.isJSXEmptyExpression(node.value.expression)) {
      throw new Error('An accessibility JSX attribute cannot use an empty expression');
    }
    return types.cloneNode(node.value.expression, true);
  }
  if (types.isJSXElement(node.value) || types.isJSXFragment(node.value)) {
    return types.cloneNode(node.value, true);
  }
  throw new Error(`Unsupported JSX accessibility attribute value ${node.value.type}`);
}

function instrumentEventAttribute(types, attributePath, site) {
  const expression = attributePath.node.value.expression;
  const selector = types.conditionalExpression(
    selectedSiteExpression(types, site.id),
    eventNoop(types),
    expression,
  );
  Object.defineProperty(selector, instrumentedNode, { value: true });
  attributePath.node.value.expression = selector;
}

function instrumentAccessibilityAttribute(types, attributePath, site) {
  const original = attributePath.node;
  const originalProperty = types.objectProperty(
    types.identifier(site.attributeName),
    accessibilityPropertyValue(types, original),
  );
  const spread = types.jsxSpreadAttribute(
    types.conditionalExpression(
      selectedSiteExpression(types, site.id),
      types.objectExpression([]),
      types.objectExpression([originalProperty]),
    ),
  );
  Object.defineProperty(spread, instrumentedNode, { value: true });
  attributePath.replaceWith(spread);
}

/** Babel plugin used only by the campaign's custom Jest transformer. */
function jsxAttributeMutationInstrumentationPlugin(api, options = {}) {
  const types = api.types;
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const mode = normalizeMode(options.mode);
  const touchedNodes = new WeakSet();

  return {
    name: `jsx-${mode}-attribute-mutation-selector`,
    visitor: {
      JSXAttribute(attributePath, state) {
        if (touchedNodes.has(attributePath.node) || attributePath.node[instrumentedNode]) return;
        const filename = state.filename || state.file?.opts?.filename;
        if (typeof filename !== 'string') return;
        const relativeFile = sourceRelativeFile(path.resolve(filename), projectRoot);
        if (!relativeFile || !hasExactLocation(attributePath.node)) return;

        const site = jsxAttributeSiteForNode(
          attributePath.node,
          state.file.code,
          relativeFile,
          mode,
        );
        if (!site) return;
        touchedNodes.add(attributePath.node);
        Object.defineProperty(attributePath.node, instrumentedNode, { value: true });
        if (mode === 'event') instrumentEventAttribute(types, attributePath, site);
        else instrumentAccessibilityAttribute(types, attributePath, site);
      },
    },
  };
}

module.exports = {
  JSX_ATTRIBUTE_MUTATION_MODES,
  MODE_ENV,
  PROJECT_ROOT_ENV,
  SITE_ENV,
  attributeMatchesMode,
  discoverJsxAttributeMutationSites,
  isAccessibilityAttribute,
  isEventAttribute,
  jsxAttributeMutationInstrumentationPlugin,
  jsxAttributeSiteForNode,
  normalizeMode,
  normalizeRelativeFile,
};
