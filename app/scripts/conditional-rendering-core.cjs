'use strict';

const path = require('node:path');

const babel = require('@babel/core');

/**
 * Keep this list byte-for-byte equivalent to Stryker 9.6.1's
 * conditional-expression-mutator.ts. A BinaryExpression or LogicalExpression
 * using one of these operators already receives true/false mutants from
 * Stryker, so the supplemental campaign must not duplicate it.
 */
const STRYKER_BOOLEAN_OPERATORS = Object.freeze([
  '!=',
  '!==',
  '&&',
  '<',
  '<=',
  '==',
  '===',
  '>',
  '>=',
  '||',
]);
const strykerBooleanOperatorSet = new Set(STRYKER_BOOLEAN_OPERATORS);

const SITE_ENV = 'CONDITIONAL_RENDER_MUTANT_SITE';
const FORCE_ENV = 'CONDITIONAL_RENDER_MUTANT_FORCE';

// Babel may requeue a path after its test expression is replaced. The symbol
// and WeakSet used by the plugin below both make generated selectors and their
// owning source ternaries idempotent within a transform.
const instrumentedNode = Symbol('conditionalRenderingInstrumented');

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

function isJsxOrNull(node) {
  return (
    babel.types.isJSXElement(node) ||
    babel.types.isJSXFragment(node) ||
    babel.types.isNullLiteral(node)
  );
}

function isStrykerForcedPredicate(node) {
  return (
    (babel.types.isBinaryExpression(node) || babel.types.isLogicalExpression(node)) &&
    strykerBooleanOperatorSet.has(node.operator)
  );
}

function locationOf(node) {
  if (!node.loc || !Number.isInteger(node.start) || !Number.isInteger(node.end)) {
    throw new Error(`Babel did not provide an exact location for ${node.type}`);
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

function hasExactLocation(node) {
  return (
    node?.loc !== null &&
    node?.loc !== undefined &&
    Number.isInteger(node.start) &&
    Number.isInteger(node.end)
  );
}

function siteId(relativeFile, predicateLocation) {
  const { start, end } = predicateLocation;
  return `cr:${relativeFile}:` + `${start.line}:${start.column}-${end.line}:${end.column}`;
}

function conditionalRenderingSiteForPath(conditionalPath, source, relativeFile) {
  if (!conditionalPath.isConditionalExpression()) return null;

  const { node } = conditionalPath;
  const jsxExpressionAncestor = Boolean(
    conditionalPath.findParent((candidate) => candidate.isJSXExpressionContainer()),
  );
  const jsxOrNullArm = isJsxOrNull(node.consequent) || isJsxOrNull(node.alternate);
  if (!jsxExpressionAncestor && !jsxOrNullArm) return null;
  if (isStrykerForcedPredicate(node.test)) return null;

  const normalizedFile = normalizeRelativeFile(relativeFile);
  const predicateLocation = locationOf(node.test);
  const conditionalLocation = locationOf(node);
  return {
    id: siteId(normalizedFile, predicateLocation),
    file: normalizedFile,
    predicateLocation,
    conditionalLocation,
    predicateNodeType: node.test.type,
    predicateOperator:
      babel.types.isBinaryExpression(node.test) ||
      babel.types.isLogicalExpression(node.test) ||
      babel.types.isUnaryExpression(node.test)
        ? node.test.operator
        : null,
    predicateSource: source.slice(node.test.start, node.test.end),
    conditionalSource: source.slice(node.start, node.end),
    renderContext: {
      jsxExpressionAncestor,
      jsxOrNullArm,
    },
  };
}

function parseTypeScriptJsx(source, filename) {
  try {
    return babel.parseSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      sourceType: 'unambiguous',
      parserOpts: {
        plugins: ['jsx', 'typescript'],
      },
    });
  } catch (error) {
    error.message = `Could not parse ${filename} for conditional-rendering discovery: ${error.message}`;
    throw error;
  }
}

function discoverConditionalRenderingSites(source, { relativeFile, filename = relativeFile }) {
  if (typeof source !== 'string') throw new TypeError('source must be a string');
  const normalizedFile = normalizeRelativeFile(relativeFile);
  const ast = parseTypeScriptJsx(source, filename);
  const sites = [];

  babel.traverse(ast, {
    ConditionalExpression(conditionalPath) {
      const site = conditionalRenderingSiteForPath(conditionalPath, source, normalizedFile);
      if (site) sites.push(site);
    },
  });

  sites.sort(
    (left, right) => left.predicateLocation.start.offset - right.predicateLocation.start.offset,
  );
  const duplicateIds = sites
    .map(({ id }) => id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(
      `Conditional-rendering discovery generated duplicate site IDs: ${[
        ...new Set(duplicateIds),
      ].join(', ')}`,
    );
  }
  return sites;
}

function sourceRelativeFile(filename, projectRoot) {
  const relative = path.relative(projectRoot, filename);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    return null;
  }
  const normalized = relative.split(path.sep).join('/');
  if (!normalized.startsWith('src/') || !normalized.endsWith('.tsx')) return null;
  return normalized;
}

function envMember(types, name) {
  return types.memberExpression(
    types.memberExpression(types.identifier('process'), types.identifier('env')),
    types.identifier(name),
  );
}

/** Babel plugin used only by the campaign's custom Jest transformer. */
function conditionalRenderingInstrumentationPlugin(api, options = {}) {
  const types = api.types;
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const touchedNodes = new WeakSet();

  return {
    name: 'conditional-rendering-mutation-selector',
    visitor: {
      ConditionalExpression(conditionalPath, state) {
        if (touchedNodes.has(conditionalPath.node) || conditionalPath.node[instrumentedNode]) {
          return;
        }

        const filename = state.filename || state.file?.opts?.filename;
        if (typeof filename !== 'string') return;
        const relativeFile = sourceRelativeFile(path.resolve(filename), projectRoot);
        if (!relativeFile) return;

        // Expo's preset can synthesize and requeue ternaries after parsing.
        // They are not authored render sites, have no stable source span, and
        // must never be mistaken for a campaign target.
        if (
          !hasExactLocation(conditionalPath.node) ||
          !hasExactLocation(conditionalPath.node.test)
        ) {
          return;
        }

        const source = state.file.code;
        const site = conditionalRenderingSiteForPath(conditionalPath, source, relativeFile);
        if (!site) return;

        const originalPredicate = conditionalPath.node.test;
        const selector = types.conditionalExpression(
          types.binaryExpression('===', envMember(types, SITE_ENV), types.stringLiteral(site.id)),
          types.binaryExpression('===', envMember(types, FORCE_ENV), types.stringLiteral('true')),
          originalPredicate,
        );
        Object.defineProperty(selector, instrumentedNode, { value: true });
        Object.defineProperty(conditionalPath.node, instrumentedNode, {
          value: true,
        });
        touchedNodes.add(selector);
        touchedNodes.add(conditionalPath.node);
        conditionalPath.node.test = selector;
      },
    },
  };
}

module.exports = {
  FORCE_ENV,
  SITE_ENV,
  STRYKER_BOOLEAN_OPERATORS,
  conditionalRenderingInstrumentationPlugin,
  conditionalRenderingSiteForPath,
  discoverConditionalRenderingSites,
  isStrykerForcedPredicate,
  normalizeRelativeFile,
};
