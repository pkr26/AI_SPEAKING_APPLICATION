'use strict';

const path = require('node:path');

const babel = require('@babel/core');

const MODE_ENV = 'STATE_PROP_MUTATION_MODE';
const PROJECT_ROOT_ENV = 'STATE_PROP_MUTATION_PROJECT_ROOT';
const SITE_ENV = 'STATE_PROP_MUTANT_SITE';
const STATE_PROP_MUTATION_MODES = Object.freeze(['state', 'prop']);
const modeSet = new Set(STATE_PROP_MUTATION_MODES);
const STATE_SITE_KINDS = Object.freeze(['setter', 'initializer']);
const PROP_SITE_KINDS = Object.freeze(['string', 'number', 'boolean', 'shorthand', 'expression']);
const instrumentedNode = Symbol('statePropMutationInstrumented');

// Hostile sentinels are deliberately non-empty, printable, and unique so a
// surviving mutant can be recognized in rendered output at a glance.
const HOSTILE_INITIALIZER_STRING = 'StrykerStateForce';
const HOSTILE_PROP_STRING = 'StrykerPropForce';

/**
 * Keep these predicates aligned with the jsx-attribute campaign so the three
 * attribute campaigns partition the authored JSX surface without overlap:
 * `event` owns on[A-Z] callbacks, `accessibility` owns the accessibility
 * family, and this campaign owns the remaining component prop wiring.
 */
function isEventAttributeName(name) {
  // React Native's list API has one numeric configuration prop whose name
  // happens to start with `on`: onEndReachedThreshold.
  return /^on[A-Z]/u.test(name) && !name.endsWith('Threshold');
}

function isAccessibilityAttributeName(name) {
  return (
    name === 'accessible' ||
    name === 'importantForAccessibility' ||
    name.startsWith('accessibility')
  );
}

/**
 * `key` is React reconciliation metadata, never a prop the receiving component
 * can observe: removing it only falls back to index keys and duplicate-key
 * warnings, which no owning test asserts as prop wiring. The event and
 * accessibility campaigns equally never touch it.
 */
function isExcludedPropName(name) {
  return name === 'key';
}

function normalizeMode(mode) {
  if (!modeSet.has(mode)) {
    throw new Error(
      `State/prop mutation mode must be one of ${STATE_PROP_MUTATION_MODES.join(', ')} ` +
        `(received ${JSON.stringify(mode)})`,
    );
  }
  return mode;
}

function normalizeSiteKind(mode, kind) {
  const allowed = mode === 'state' ? STATE_SITE_KINDS : PROP_SITE_KINDS;
  if (!allowed.includes(kind)) {
    throw new Error(`Unknown ${mode} site kind ${JSON.stringify(kind)}`);
  }
  return kind;
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

function lineOffsetIndex(code) {
  const offsets = [0];
  for (let index = 0; index < code.length; index += 1) {
    if (code.charCodeAt(index) === 10) offsets.push(index + 1);
  }
  return offsets;
}

function locationOf(node, code) {
  if (!node?.loc) {
    throw new Error(`Babel did not provide an exact location for ${node?.type ?? 'node'}`);
  }
  let startOffset = node.start;
  let endOffset = node.end;
  // The preset's destructuring transform clones nodes without their
  // start/end offsets while keeping loc; derive offsets from the line map.
  if ((startOffset === undefined || endOffset === undefined) && typeof code === 'string') {
    const lineOffsets = lineOffsetIndex(code);
    const offsetOf = (position) => {
      const lineStart = lineOffsets[position.line - 1];
      return lineStart === undefined ? undefined : lineStart + position.column;
    };
    startOffset = offsetOf(node.loc.start);
    endOffset = offsetOf(node.loc.end);
  }
  if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset)) {
    throw new Error(`Babel did not provide an exact location for ${node?.type ?? 'node'}`);
  }
  return {
    start: { line: node.loc.start.line, column: node.loc.start.column, offset: startOffset },
    end: { line: node.loc.end.line, column: node.loc.end.column, offset: endOffset },
  };
}

function hasLineLocation(node) {
  return node?.loc !== null && node?.loc !== undefined;
}

function attributeName(node) {
  return babel.types.isJSXIdentifier(node.name) ? node.name.name : null;
}

function siteId(mode, relativeFile, kind, label, location) {
  return (
    `sp:${mode}:${relativeFile}:${kind}:${label}:` +
    `${location.start.line}:${location.start.column}-${location.end.line}:${location.end.column}`
  );
}

function isUndefinedIdentifier(node) {
  return babel.types.isIdentifier(node) && node.name === 'undefined';
}

/**
 * Classify a useState initializer by its authored shape. The hostile default
 * for each kind stays inside the value family the component already handles:
 * a foreign-typed initializer (for example `false.set`) can only crash the
 * component, and the campaign counts crashes as infrastructure Errors, never
 * as assertion kills.
 */
function initializerKind(node) {
  if (node === null || node === undefined) return 'no-arg';
  if (babel.types.isBooleanLiteral(node)) return 'boolean';
  if (babel.types.isNumericLiteral(node)) return 'number';
  if (babel.types.isStringLiteral(node)) return 'string';
  if (babel.types.isNullLiteral(node)) return 'null';
  if (isUndefinedIdentifier(node)) return 'undefined';
  if (babel.types.isObjectExpression(node)) return 'object';
  if (babel.types.isArrayExpression(node)) return 'array';
  if (babel.types.isArrowFunctionExpression(node)) return 'arrow';
  return 'expression';
}

function hostileInitializerDescription(kind, node) {
  switch (kind) {
    case 'boolean':
      return `force the initial state to ${node.value ? 'false' : 'true'}`;
    case 'number':
      return `force the initial state to ${node.value === 0 ? 1 : 0}`;
    case 'string':
      return node.value.length === 0
        ? `force the initial state to '${HOSTILE_INITIALIZER_STRING}'`
        : "force the initial state to ''";
    case 'null':
    case 'undefined':
    case 'no-arg':
      return 'force the initial state to false';
    case 'object':
      return 'force the initial state to an empty object';
    case 'array':
      return 'force the initial state to an empty array';
    case 'arrow':
      return 'force the lazy initializer to () => undefined';
    default:
      return 'force the initial state to undefined';
  }
}

function hostileInitializerNode(types, kind, node) {
  switch (kind) {
    case 'boolean':
      return types.booleanLiteral(!node.value);
    case 'number':
      return types.numericLiteral(node.value === 0 ? 1 : 0);
    case 'string':
      return types.stringLiteral(node.value.length === 0 ? HOSTILE_INITIALIZER_STRING : '');
    case 'null':
    case 'undefined':
    case 'no-arg':
      return types.booleanLiteral(false);
    case 'object':
      return types.objectExpression([]);
    case 'array':
      return types.arrayExpression([]);
    case 'arrow':
      return types.arrowFunctionExpression([], types.identifier('undefined'));
    default:
      return types.identifier('undefined');
  }
}

/** Extract the state/setter pair from `const [x, setX] = useState(...)` shapes. */
function useStateHookFor(declaratorNode) {
  const init = declaratorNode.init;
  if (
    !babel.types.isCallExpression(init) ||
    !babel.types.isIdentifier(init.callee) ||
    init.callee.name !== 'useState'
  ) {
    return null;
  }
  // `useState<T>(...)` type parameters vanish at runtime and must not exclude
  // the hook from state-wiring coverage.
  if (init.typeParameters && !babel.types.isTSTypeParameterInstantiation(init.typeParameters)) {
    return null;
  }
  if (!babel.types.isArrayPattern(declaratorNode.id)) return null;
  const [stateElement, setterElement] = declaratorNode.id.elements;
  const stateName = babel.types.isIdentifier(stateElement) ? stateElement.name : null;
  const setterName = babel.types.isIdentifier(setterElement) ? setterElement.name : null;
  if (setterName === null) return null;
  return {
    stateName,
    setterName,
    initializer: init.arguments.length > 0 ? init.arguments[0] : null,
    call: init,
  };
}

/**
 * The expo preset's destructuring/CommonJS transforms can run before this
 * campaign's visitor, splitting the authored shape into
 * `var _x = useState(init); var [a, setA] = _slicedToArray(_x, 2)`. Map every
 * such temp identifier back to its state/setter names so instrumentation
 * still finds the hook (and derives the same source-position site IDs that
 * raw-source discovery produced).
 */
function isUseStateCallee(callee) {
  // The authored shape calls a bare `useState` identifier; the preset's
  // CommonJS interop rewrites it to `(0, _react.useState)` before this
  // campaign's exit-phase visitor observes it.
  if (babel.types.isIdentifier(callee)) return callee.name === 'useState';
  return (
    babel.types.isMemberExpression(callee) &&
    babel.types.isIdentifier(callee.property) &&
    callee.property.name === 'useState'
  );
}

function collectSlicedStateNames(programPath) {
  // Authored shape: `const [a, setA] = useState(init)`.
  const slicedNames = new Map();
  // Compiled shapes (expo preset destructuring/CommonJS transforms):
  //   var _x = useState(init);          <- the hook to instrument
  //   var _t = _slicedToArray(_x, 2);   <- temp holding the pair
  //   var a = _t[0], setA = _t[1];      <- element member reads
  const pairTempForHookTemp = new Map();
  const visitPairs = {
    VariableDeclarator(declaratorPath) {
      const node = declaratorPath.node;
      if (
        babel.types.isArrayPattern(node.id) &&
        babel.types.isCallExpression(node.init) &&
        node.init.arguments.length === 2 &&
        babel.types.isIdentifier(node.init.arguments[0])
      ) {
        const [stateElement, setterElement] = node.id.elements;
        if (babel.types.isIdentifier(setterElement)) {
          slicedNames.set(node.init.arguments[0].name, {
            stateName: babel.types.isIdentifier(stateElement) ? stateElement.name : null,
            setterName: setterElement.name,
          });
        }
        return;
      }
      if (
        babel.types.isIdentifier(node.id) &&
        babel.types.isCallExpression(node.init) &&
        node.init.arguments.length === 2 &&
        babel.types.isIdentifier(node.init.arguments[0])
      ) {
        pairTempForHookTemp.set(node.id.name, node.init.arguments[0].name);
      }
    },
  };
  programPath.traverse(visitPairs);
  if (pairTempForHookTemp.size > 0) {
    programPath.traverse({
      VariableDeclarator(declaratorPath) {
        const node = declaratorPath.node;
        if (
          !babel.types.isIdentifier(node.id) ||
          !babel.types.isMemberExpression(node.init) ||
          !babel.types.isIdentifier(node.init.object) ||
          !babel.types.isNumericLiteral(node.init.property)
        ) {
          return;
        }
        const hookTemp = pairTempForHookTemp.get(node.init.object.name);
        if (hookTemp === undefined) return;
        const index = node.init.property.value;
        const names = slicedNames.get(hookTemp) ?? { stateName: null, setterName: null };
        if (index === 0) names.stateName = node.id.name;
        if (index === 1) names.setterName = node.id.name;
        slicedNames.set(hookTemp, names);
      },
    });
  }
  for (const [hookTemp, names] of [...slicedNames]) {
    if (names.setterName === null) slicedNames.delete(hookTemp);
  }
  return slicedNames;
}

/** Resolve a hook for the compiled `var _x = useState(...)` shape. */
function useStateHookForCompiled(declaratorNode, slicedNames) {
  if (!babel.types.isIdentifier(declaratorNode.id)) return null;
  const names = slicedNames.get(declaratorNode.id.name);
  if (!names) return null;
  const init = declaratorNode.init;
  if (!babel.types.isCallExpression(init) || !isUseStateCallee(init.callee)) {
    return null;
  }
  return {
    stateName: names.stateName,
    setterName: names.setterName,
    initializer: init.arguments.length > 0 ? init.arguments[0] : null,
    call: init,
  };
}

function initializerSiteFor(hook, source, relativeFile) {
  const kind = initializerKind(hook.initializer);
  const label = hook.stateName ?? hook.setterName;
  const location =
    hook.initializer === null
      ? locationOf(hook.call, source)
      : locationOf(hook.initializer, source);
  return {
    id: siteId('state', relativeFile, 'initializer', label, location),
    mode: 'state',
    kind: 'initializer',
    file: relativeFile,
    stateName: hook.stateName,
    setterName: hook.setterName,
    initializerKind: kind,
    initializerLocation: hook.initializer === null ? null : location,
    siteLocation: location,
    siteSource:
      locationOf(hook.initializer === null ? hook.call : hook.initializer, source) === location
        ? source.slice(location.start.offset, location.end.offset)
        : source.slice(location.start.offset, location.end.offset),
    mutation: hostileInitializerDescription(
      kind,
      hook.initializer === null ? { value: null } : hook.initializer,
    ),
  };
}

function setterSiteFor(callNode, hook, source, relativeFile) {
  const location = locationOf(callNode);
  return {
    id: siteId('state', relativeFile, 'setter', hook.setterName, location),
    mode: 'state',
    kind: 'setter',
    file: relativeFile,
    stateName: hook.stateName,
    setterName: hook.setterName,
    siteLocation: location,
    siteSource: source.slice(callNode.start, callNode.end),
    mutation: 'replace the setter call with a no-op',
  };
}

function propSiteForNode(node, source, relativeFile) {
  if (!babel.types.isJSXAttribute(node) || !hasExactLocation(node)) return null;
  const name = attributeName(node);
  if (name === null) return null;
  if (isEventAttributeName(name) || isAccessibilityAttributeName(name)) return null;
  if (isExcludedPropName(name)) return null;

  let kind = null;
  let literal = null;
  if (node.value === null) {
    kind = 'shorthand';
  } else if (babel.types.isStringLiteral(node.value)) {
    kind = 'string';
    literal = node.value;
  } else if (babel.types.isJSXExpressionContainer(node.value)) {
    const expression = node.value.expression;
    if (babel.types.isJSXEmptyExpression(expression)) return null;
    if (babel.types.isStringLiteral(expression)) {
      kind = 'string';
      literal = expression;
    } else if (babel.types.isNumericLiteral(expression)) {
      kind = 'number';
      literal = expression;
    } else if (babel.types.isBooleanLiteral(expression)) {
      kind = 'boolean';
      literal = expression;
    } else {
      kind = 'expression';
    }
  } else {
    return null;
  }

  const file = normalizeRelativeFile(relativeFile);
  const attributeLocation = locationOf(node);
  const site = {
    id: siteId('prop', file, kind, name, attributeLocation),
    mode: 'prop',
    kind,
    file,
    attributeName: name,
    attributeLocation,
    siteLocation: attributeLocation,
    valueLocation: hasExactLocation(node.value) ? locationOf(node.value) : null,
    attributeSource: source.slice(node.start, node.end),
    siteSource: source.slice(node.start, node.end),
    valueSource: node.value === null ? null : source.slice(node.value.start, node.value.end),
    hostileValue: hostilePropDescription(kind, literal),
    mutation: hostilePropDescription(kind, literal),
  };
  return site;
}

function hostilePropDescription(kind, literal) {
  switch (kind) {
    case 'shorthand':
      return 'force the implicit true to false';
    case 'boolean':
      return `force the prop to ${literal.value ? 'false' : 'true'}`;
    case 'number':
      return `force the prop to ${literal.value === 0 ? 1 : 0}`;
    case 'string':
      return literal.value.length === 0
        ? `force the prop to '${HOSTILE_PROP_STRING}'`
        : 'force the prop to an empty string';
    default:
      return 'remove the prop from the rendered element';
  }
}

function hostilePropNode(types, kind, literal) {
  switch (kind) {
    case 'shorthand':
      return types.booleanLiteral(false);
    case 'boolean':
      return types.booleanLiteral(!literal.value);
    case 'number':
      return types.numericLiteral(literal.value === 0 ? 1 : 0);
    case 'string':
      return types.stringLiteral(literal.value.length === 0 ? HOSTILE_PROP_STRING : '');
    default:
      throw new Error(`Prop kind ${kind} has no hostile value node; it is removed instead`);
  }
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
    error.message = `Could not parse ${filename} for state/prop mutation discovery: ${error.message}`;
    throw error;
  }
}

function discoverStateMutationSites(source, { relativeFile, filename = relativeFile }) {
  if (typeof source !== 'string') throw new TypeError('source must be a string');
  const file = normalizeRelativeFile(relativeFile);
  const ast = parseTypeScriptJsx(source, filename);
  const hooks = [];
  const setterNames = new Map();

  babel.traverse(ast, {
    VariableDeclarator(declaratorPath) {
      const hook = useStateHookFor(declaratorPath.node);
      if (!hook || !hasExactLocation(declaratorPath.node.init)) return;
      hooks.push(hook);
      setterNames.set(hook.setterName, hook);
    },
  });

  const sites = [];
  for (const hook of hooks) {
    if (hook.initializer !== null && !hasExactLocation(hook.initializer)) continue;
    sites.push(initializerSiteFor(hook, source, file));
  }
  babel.traverse(ast, {
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (!babel.types.isIdentifier(callee)) return;
      const hook = setterNames.get(callee.name);
      if (!hook || !hasExactLocation(callPath.node)) return;
      // The useState call itself (`useState(...)`) is not a setter call site.
      if (callPath.node === hook.call) return;
      sites.push(setterSiteFor(callPath.node, hook, source, file));
    },
  });

  return sites;
}

function discoverPropMutationSites(source, { relativeFile, filename = relativeFile }) {
  if (typeof source !== 'string') throw new TypeError('source must be a string');
  const file = normalizeRelativeFile(relativeFile);
  const ast = parseTypeScriptJsx(source, filename);
  const sites = [];
  babel.traverse(ast, {
    JSXAttribute(attributePath) {
      const site = propSiteForNode(attributePath.node, source, file);
      if (site) sites.push(site);
    },
  });
  return sites;
}

function discoverStatePropMutationSites(source, { relativeFile, mode, filename = relativeFile }) {
  const normalizedMode = normalizeMode(mode);
  const sites =
    normalizedMode === 'state'
      ? discoverStateMutationSites(source, { relativeFile, filename })
      : discoverPropMutationSites(source, { relativeFile, filename });
  sites.sort((left, right) => left.siteLocation.start.offset - right.siteLocation.start.offset);
  const ids = sites.map(({ id }) => id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(
      `State/prop ${normalizedMode} discovery generated duplicate site IDs: ${[
        ...new Set(duplicateIds),
      ].join(', ')}`,
    );
  }
  return sites;
}

function sourceRelativeFile(filename, projectRoot, mode) {
  const relative = path.relative(projectRoot, filename);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`)) return null;
  const normalized = relative.split(path.sep).join('/');
  if (!normalized.startsWith('src/')) return null;
  if (mode === 'state') return /\.(ts|tsx)$/u.test(normalized) ? normalized : null;
  return normalized.endsWith('.tsx') ? normalized : null;
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

function selectorFor(types, id, hostile, original) {
  const selector = types.conditionalExpression(
    selectedSiteExpression(types, id),
    hostile,
    original,
  );
  Object.defineProperty(selector, instrumentedNode, { value: true });
  return selector;
}

/** Babel plugin used only by the campaign's custom Jest transformer. */
function statePropMutationInstrumentationPlugin(api, options = {}) {
  const types = api.types;
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const mode = normalizeMode(options.mode);
  const touchedNodes = new WeakSet();

  function selectorId(node, state, buildSite) {
    const filename = state.filename || state.file?.opts?.filename;
    if (typeof filename !== 'string') return null;
    const relativeFile = sourceRelativeFile(path.resolve(filename), projectRoot, mode);
    if (!relativeFile) return null;
    if (!hasExactLocation(node)) return null;
    return buildSite(relativeFile, state.file.code);
  }

  return {
    name: `state-prop-${mode}-mutation-selector`,
    pre(file) {
      if (mode !== 'state') return;
      // Collect every useState hook first so a setter referenced inside an
      // earlier-declared closure is still recognized as state wiring. At pre()
      // time the AST is still the authored source, so only the destructured
      // source shape exists; preset-compiled shapes are handled later, at the
      // Program exit visitor below.
      const hooks = new Map();
      babel.traverse(file.ast, {
        VariableDeclarator(declaratorPath) {
          const hook = useStateHookFor(declaratorPath.node);
          if (!hook) return;
          hooks.set(hook.setterName, hook);
        },
      });
      this.stateHooks = hooks;
    },
    visitor:
      mode === 'state'
        ? {
            Program: {
              // The preset's destructuring/CommonJS transforms split the
              // authored hook into `var _x = useState(init); var [a, setA] =
              // _slicedToArray(_x, 2)` across statements that never coexist in
              // an earlier exit. Instrument the compiled pairs once, on the
              // fully transformed program; the VariableDeclarator handler
              // below still covers the authored shape where it survived.
              exit(programPath, state) {
                const filename = state.filename || state.file?.opts?.filename;
                if (typeof filename !== 'string') return;
                const relativeFile = sourceRelativeFile(path.resolve(filename), projectRoot, mode);
                if (!relativeFile) return;
                const slicedNames = collectSlicedStateNames(programPath);
                if (slicedNames.size === 0) return;
                programPath.traverse({
                  VariableDeclarator(declaratorPath) {
                    const declarator = declaratorPath.node;
                    if (declarator[instrumentedNode] || touchedNodes.has(declarator)) return;
                    const hook = useStateHookForCompiled(declarator, slicedNames);
                    if (!hook) return;
                    if (hook.initializer !== null && !hasLineLocation(hook.initializer)) return;
                    if (!hasLineLocation(hook.call)) return;
                    const site = initializerSiteFor(hook, state.file.code, relativeFile);
                    const kind = initializerKind(hook.initializer);
                    const hostile = hostileInitializerNode(
                      types,
                      kind,
                      hook.initializer ?? { value: null },
                    );
                    hook.call.arguments[0] = selectorFor(
                      types,
                      site.id,
                      hostile,
                      hook.initializer ?? types.identifier('undefined'),
                    );
                    touchedNodes.add(declarator);
                    Object.defineProperty(declarator, instrumentedNode, { value: true });
                  },
                });
              },
            },
            VariableDeclarator(declaratorPath, state) {
              const node = declaratorPath.node;
              if (touchedNodes.has(node) || node[instrumentedNode]) return;
              const hook = useStateHookFor(node);
              if (!hook) return;
              if (hook.initializer !== null && !hasExactLocation(hook.initializer)) return;
              if (!hasExactLocation(hook.call)) return;
              const site = selectorId(node, state, (relativeFile, code) =>
                initializerSiteFor(hook, code, relativeFile),
              );
              if (!site) return;
              const kind = initializerKind(hook.initializer);
              const hostile = hostileInitializerNode(
                types,
                kind,
                hook.initializer ?? { value: null },
              );
              hook.call.arguments[0] = selectorFor(
                types,
                site.id,
                hostile,
                hook.initializer ?? types.identifier('undefined'),
              );
              touchedNodes.add(node);
              Object.defineProperty(node, instrumentedNode, { value: true });
            },
            CallExpression(callPath, state) {
              const node = callPath.node;
              if (touchedNodes.has(node) || node[instrumentedNode]) return;
              const callee = node.callee;
              if (!babel.types.isIdentifier(callee)) return;
              const hook = this.stateHooks?.get(callee.name);
              if (!hook || node === hook.call) return;
              if (!hasExactLocation(node)) return;
              const site = selectorId(node, state, (relativeFile, code) =>
                setterSiteFor(node, hook, code, relativeFile),
              );
              if (!site) return;
              const noOp = types.unaryExpression('void', types.numericLiteral(0));
              const replacement = selectorFor(types, site.id, noOp, node);
              touchedNodes.add(node);
              Object.defineProperty(node, instrumentedNode, { value: true });
              // Deliberately no skip(): a setter call nested in another setter
              // call's arguments is its own site and must stay instrumentable.
              callPath.replaceWith(replacement);
            },
          }
        : {
            // Instrument on the way OUT of the attribute. Replacing an
            // expression-valued attribute with its conditional spread during
            // enter discards Babel's queued visits for JSX attributes nested
            // inside the attribute's value (renderItem={...},
            // refreshControl={...}, action slots, ListHeaderComponent...),
            // silently turning every nested discovered site into a no-op
            // mutant: discovery (raw-source traversal) and instrumentation
            // then disagree. At exit time every nested attribute has already
            // been instrumented in place, so the value clone embedded in the
            // spread's fallback branch carries those nested selectors.
            JSXAttribute: {
              exit(attributePath, state) {
                const node = attributePath.node;
                if (touchedNodes.has(node) || node[instrumentedNode]) return;
                const site = selectorId(node, state, (relativeFile, code) =>
                  propSiteForNode(node, code, relativeFile),
                );
                if (!site) return;
                touchedNodes.add(node);
                Object.defineProperty(node, instrumentedNode, { value: true });

                if (site.kind === 'expression') {
                  const originalProperty = types.objectProperty(
                    types.identifier(site.attributeName),
                    propValueNode(types, node),
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
                  return;
                }

                const literal = literalForPropKind(types, node, site.kind);
                const hostile = hostilePropNode(types, site.kind, literal);
                const selector = selectorFor(
                  types,
                  site.id,
                  hostile,
                  types.cloneNode(literal, true),
                );
                attributePath.node.value = types.jsxExpressionContainer(selector);
              },
            },
          },
  };
}

function literalForPropKind(types, node, kind) {
  if (kind === 'shorthand') return types.booleanLiteral(true);
  if (babel.types.isStringLiteral(node.value)) return node.value;
  if (babel.types.isJSXExpressionContainer(node.value)) return node.value.expression;
  throw new Error(`Unsupported prop mutation value shape ${node.value?.type ?? 'null'}`);
}

function propValueNode(types, node) {
  if (node.value === null) return types.booleanLiteral(true);
  if (babel.types.isStringLiteral(node.value)) return types.cloneNode(node.value, true);
  if (babel.types.isJSXExpressionContainer(node.value)) {
    if (babel.types.isJSXEmptyExpression(node.value.expression)) {
      throw new Error('A mutated JSX prop cannot use an empty expression');
    }
    return types.cloneNode(node.value.expression, true);
  }
  if (babel.types.isJSXElement(node.value) || babel.types.isJSXFragment(node.value)) {
    return types.cloneNode(node.value, true);
  }
  throw new Error(`Unsupported JSX prop value ${node.value.type}`);
}

module.exports = {
  HOSTILE_INITIALIZER_STRING,
  HOSTILE_PROP_STRING,
  MODE_ENV,
  PROJECT_ROOT_ENV,
  PROP_SITE_KINDS,
  SITE_ENV,
  STATE_PROP_MUTATION_MODES,
  STATE_SITE_KINDS,
  discoverPropMutationSites,
  discoverStateMutationSites,
  discoverStatePropMutationSites,
  hostileInitializerDescription,
  hostileInitializerNode,
  hostilePropDescription,
  initializerKind,
  isAccessibilityAttributeName,
  isEventAttributeName,
  isExcludedPropName,
  normalizeMode,
  propSiteForNode,
  setterSiteFor,
  statePropMutationInstrumentationPlugin,
  useStateHookFor,
};
