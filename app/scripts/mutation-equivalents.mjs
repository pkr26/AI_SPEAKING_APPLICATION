/**
 * Mutants that no test can kill, with the reason each one is unkillable.
 *
 * Why this file exists rather than `// Stryker disable` comments — two reasons,
 * both learned the hard way:
 *
 * 1. The directives are scoped to a line and a mutator name, but these sites put
 *    a killable and an unkillable mutant on the same line under the same mutator.
 *    In `boundedSeconds`, weakening the positive-number bound is detectable while
 *    joining the redundant `typeof value === 'number'` / `Number.isFinite(value)`
 *    checks with OR is not. A line-scoped comment would silence real coverage.
 * 2. A `disable all` whose matching `restore` fails to take effect is invisible.
 *    One such pair in `login.tsx` silenced 157 mutants from the disable comment
 *    to the end of the file, and the campaign still reported a 100% score.
 *
 * So exemptions live here, and `Ignored` is not treated as a resolved status.
 *
 * Entries are matched on file, mutator, replacement, source text, the exact
 * start/end location Stryker reported for the mutated node, and the reviewed
 * production-file hash. They must excuse
 * exactly the number of mutants they declare. The gate fails on a survivor that
 * matches nothing here, on an entry that matches nothing, and on an entry that
 * matches more than it claims — so source drift, a stale exemption, or a newly
 * regressed same-line sibling cannot pass quietly.
 */
function exactLocations(...coordinates) {
  if (coordinates.length === 0 || coordinates.length % 4 !== 0) {
    throw new Error('Exact mutant locations require start/end line and column values');
  }
  const locations = [];
  for (let index = 0; index < coordinates.length; index += 4) {
    const [startLine, startColumn, endLine, endColumn] = coordinates.slice(index, index + 4);
    locations.push(
      Object.freeze({
        start: Object.freeze({ line: startLine, column: startColumn }),
        end: Object.freeze({ line: endLine, column: endColumn }),
      }),
    );
  }
  return Object.freeze(locations);
}

// Locations for the non-Recorder entries mechanically derived from the 18-lane
// campaign. Recorder's newer canonical review keeps each location beside its
// report ID below. Module initialization accounts for both sources so an entry
// cannot be added or removed without an exact pinned node location.
const equivalentMutantLocations = Object.freeze([]);

const redesignRePinnedEquivalents = Object.freeze([
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'StringLiteral',
    originals: ["const identityKey = `${sessionVersion}:${userId ?? 'anonymous'}`;"],
    replacements: ['""'],
    reason:
      "identityKey is an internal React-only scoping key consumed by refs and effect dependencies; the 'anonymous' fallback spelling never reaches rendered output, and every observable transition already keys on identity through sessionVersion/userId equality.",
    locations: exactLocations(72, 54, 72, 65),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeReplayBinding?.replay === diagnosticReplay &&'],
    replacements: ['true'],
    reason:
      'The replay-binding chain is repaired synchronously in the render body before this expression evaluates: a non-null diagnosticReplay always has a fresh binding, and a null replay short-circuits the operand so the optional chain and equality can never diverge observably.',
    locations: exactLocations(94, 5, 94, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['activeReplayBinding?.replay === diagnosticReplay &&'],
    replacements: ['activeReplayBinding.replay'],
    reason:
      'The replay-binding chain is repaired synchronously in the render body before this expression evaluates: a non-null diagnosticReplay always has a fresh binding, and a null replay short-circuits the operand so the optional chain and equality can never diverge observably.',
    locations: exactLocations(94, 5, 94, 32),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrowFunction',
    count: 2,
    originals: [
      '() => currentDiagnosticReplay?.result ?? null,',
      '() => currentDiagnosticReplay?.requestId ?? null,',
    ],
    replacements: ['() => undefined'],
    reason:
      "Both replay-seed and identity-reset layout effects run in the same first commit and overwrite result/resultRequestId state from the replay pointer, so the lazy initializer's value never reaches an observable render.",
    locations: exactLocations(106, 5, 106, 50, 109, 5, 109, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['() => currentDiagnosticReplay?.result ?? null,'],
    replacements: ['currentDiagnosticReplay?.result && null'],
    reason:
      "Both replay-seed and identity-reset layout effects run in the same first commit and overwrite result/resultRequestId state from the replay pointer, so the lazy initializer's value never reaches an observable render.",
    locations: exactLocations(106, 11, 106, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['() => currentDiagnosticReplay?.requestId ?? null,'],
    replacements: ['currentDiagnosticReplay?.requestId && null'],
    reason:
      "Both replay-seed and identity-reset layout effects run in the same first commit and overwrite result/resultRequestId state from the replay pointer, so the lazy initializer's value never reaches an observable render.",
    locations: exactLocations(109, 11, 109, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrowFunction',
    originals: [
      'const [introStarted, setIntroStarted] = useState(() => currentDiagnosticReplay !== null);',
    ],
    replacements: ['() => undefined'],
    reason:
      'The identity-reset layout effect re-initializes introStarted in the same first commit (false, or true via the replay seed), so the lazy initializer never reaches an observable render.',
    locations: exactLocations(114, 52, 114, 90),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'const [introStarted, setIntroStarted] = useState(() => currentDiagnosticReplay !== null);',
    ],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-initializes introStarted in the same first commit (false, or true via the replay seed), so the lazy initializer never reaches an observable render.',
    locations: exactLocations(114, 58, 114, 90),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'const [introStarted, setIntroStarted] = useState(() => currentDiagnosticReplay !== null);',
    ],
    replacements: ['false'],
    reason:
      'The identity-reset layout effect re-initializes introStarted in the same first commit (false, or true via the replay seed), so the lazy initializer never reaches an observable render.',
    locations: exactLocations(114, 58, 114, 90),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: [
      'const [introStarted, setIntroStarted] = useState(() => currentDiagnosticReplay !== null);',
    ],
    replacements: ['currentDiagnosticReplay === null'],
    reason:
      'The identity-reset layout effect re-initializes introStarted in the same first commit (false, or true via the replay seed), so the lazy initializer never reaches an observable render.',
    locations: exactLocations(114, 58, 114, 90),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['const [answers, setAnswers] = useState<DiagnosticAnswerSummary[]>([]);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The identity-reset layout effect resets answers in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(115, 69, 115, 71),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const recorderLockedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses recorderLockedRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(117, 36, 117, 41),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [recorderExitLocked, setRecorderExitLocked] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the exit-lock state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(118, 64, 118, 69),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const recorderExitLockedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect and the recorder-owner layout effect both re-falses this ref in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(119, 40, 119, 45),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const logoutBusyRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses logoutBusyRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(120, 32, 120, 37),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [logoutBusy, setLogoutBusy] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the logout busy state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(121, 48, 121, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const practiceStartRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses practiceStartRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(122, 35, 122, 40),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [practiceStartBusy, setPracticeStartBusy] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the practice-start busy state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(123, 62, 123, 67),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'The mount layout effect sets mountedRef true in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(124, 29, 124, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const focusedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The focus effect sets focusedRef true in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(125, 29, 125, 34),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const accountActionRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'The identity-reset layout effect assigns accountActionRef on the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(126, 35, 126, 39),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'const resultRef = useRef<DiagnosticAnswerResult | null>(currentDiagnosticReplay?.result ?? null);',
    ],
    replacements: ['currentDiagnosticReplay?.result && null'],
    reason:
      'The replay-seed and identity-reset layout effects overwrite resultRef from the replay pointer in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(135, 59, 135, 98),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'const resultRequestIdRef = useRef<string | null>(currentDiagnosticReplay?.requestId ?? null);',
    ],
    replacements: ['currentDiagnosticReplay?.requestId && null'],
    reason:
      'The replay-seed and identity-reset layout effects overwrite resultRequestIdRef from the replay pointer in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(136, 52, 136, 94),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['currentDiagnosticReplay?.requestId ?? null,'],
    replacements: ['currentDiagnosticReplay?.requestId && null'],
    reason:
      'The replay-seed and identity-reset layout effects overwrite replayResultRequestIdRef from the replay pointer in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(138, 5, 138, 47),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const resultActionBusyRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses resultActionBusyRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(142, 38, 142, 43),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [resultActionBusy, setResultActionBusy] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the action-busy state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(143, 60, 143, 65),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [resultActionError, setResultActionError] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the action-error state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(144, 62, 144, 67),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useLayoutEffect(() => {\n    mountedRef.current = true;\n    return () => {\n      mountedRef.current = false;\n      focusedRef.current = false;\n      accountActionRef.current = true;\n      activeIdentityRef.current = null;\n      activeRecorderOwnerRef.current = null;\n    };\n  }, []);',
    ],
    replacements: ['{}'],
    reason:
      'The body only writes mountedRef/focusedRef inits that already hold those values on the first commit; the observable ownership checks read the same refs the reset effects keep current.',
    locations: exactLocations(151, 25, 160, 4),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [
      'return () => {\n      mountedRef.current = false;\n      focusedRef.current = false;\n      accountActionRef.current = true;\n      activeIdentityRef.current = null;\n      activeRecorderOwnerRef.current = null;\n    };',
    ],
    replacements: ['{}'],
    reason:
      'The cleanup only falses refs on unmount; every callback guarded by those refs is additionally fenced by mounted/identity/lease checks, and React discards post-unmount state writes.',
    locations: exactLocations(153, 18, 159, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;'],
    replacements: ['true'],
    reason:
      'Writing mountedRef true instead of false only affects post-unmount continuations, which every caller additionally fences with identity and lease checks whose values are already stale at that point.',
    locations: exactLocations(154, 28, 154, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['focusedRef.current = false;'],
    replacements: ['true'],
    reason:
      'Writing focusedRef true instead of false only affects post-blur continuations, which renderOwnsWork already rejects through the same focused check that would have read true.',
    locations: exactLocations(155, 28, 155, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'On blur the focus cleanup sets accountActionRef true; a queued account action is still fenced by the focused conjunct inside renderOwnsWork, so the latch write cannot change any reachable decision.',
    locations: exactLocations(156, 34, 156, 38),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      "The mount effect's dependency literal is empty and its callback identity is stable for the process lifetime; a constant element compares equal on every render and the setup/cleanup lifetimes are unchanged.",
    locations: exactLocations(160, 6, 160, 8),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      "The focus cleanup's accountActionRef=true latches actions while blurred, but renderOwnsWork's focused conjunct already rejects every such action; forcing the latch false cannot let a blurred action run.",
    locations: exactLocations(168, 36, 168, 40),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      "The focus effect's dependency literal is empty and its callback identity is stable for the process lifetime; a constant element compares equal on every render and the setup/cleanup lifetimes are unchanged.",
    locations: exactLocations(170, 8, 170, 10),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(false);'],
    replacements: ['true'],
    reason:
      "Every path that renders a result card (recorder result, replay seed, /next effect, advance claim) re-falses the error flag in the same commit that shows the card, so the reset's mutated value is always overwritten before an alert could render.",
    locations: exactLocations(186, 26, 186, 31),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['setAnswers([]);'],
    replacements: ['["Stryker was here"]'],
    reason:
      "Every path that re-establishes a completion level after an identity reset funnels through the /next done branch, which overwrites answers in the same commit, so the reset's seeded array never reaches the reveal.",
    locations: exactLocations(186, 16, 186, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['recorderLockedRef.current = false;'],
    replacements: ['true'],
    reason:
      'The recorder-owner layout effect re-falses recorderLockedRef in the same commit whenever an owner exists, and the only ownerless states reset it before any lock read is reachable.',
    locations: exactLocations(186, 33, 186, 38),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['recorderExitLockedRef.current = false;'],
    replacements: ['true'],
    reason:
      'The recorder-owner layout effect re-falses this ref in the same commit whenever an owner exists; crossing into an ownerless state always changes the owner key, which re-runs that effect and re-falses the ref before an exit action can read it.',
    locations: exactLocations(186, 37, 186, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setRecorderExitLocked(false);'],
    replacements: ['true'],
    reason:
      'The recorder-owner layout effect re-falses the exit-lock state in the same commit whenever an owner exists, and the only ownerless states reset it before any exit read is reachable.',
    locations: exactLocations(186, 27, 186, 32),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [
      'return () => {\n      if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;\n    };',
    ],
    replacements: ['{}'],
    reason:
      'The cleanup only nulls identity refs after unmount; every continuation guarded by them is additionally fenced by mounted/lease checks, and React discards post-unmount state writes.',
    locations: exactLocations(186, 18, 186, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['true'],
    reason:
      'The identity key is already stale at cleanup time in every reachable unmount, so whether the ref is nulled or left pointing at the departing key, no surviving callback can satisfy the identity conjunct that would read it.',
    locations: exactLocations(186, 11, 186, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['false'],
    reason:
      'The identity key is already stale at cleanup time in every reachable unmount, so whether the ref is nulled or left pointing at the departing key, no surviving callback can satisfy the identity conjunct that would read it.',
    locations: exactLocations(186, 11, 186, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['activeIdentityRef.current !== identityKey'],
    reason:
      'The identity key is already stale at cleanup time in every reachable unmount, so whether the ref is nulled or left pointing at the departing key, no surviving callback can satisfy the identity conjunct that would read it.',
    locations: exactLocations(186, 11, 186, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (seededReplayKeyRef.current === replayKey) return;'],
    replacements: ['false'],
    reason:
      'A re-published replay with the same requestId reseeds identical state in the same commit; the dedupe only suppresses a redundant identical commit, and the answers reset it guards is re-derived from the same replay pointer.',
    locations: exactLocations(224, 9, 224, 49),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (activeIdentityRef.current !== identityKey || !isSessionLeaseCurrent(sessionLease)) {',
    ],
    replacements: ['false'],
    reason:
      'The identity-scoped view selector hides any state a stale data effect commits: stateIdentity is reset to the new identity in the same layout pass, so processing or rejecting the response writes only dead state the selector never renders.',
    locations: exactLocations(255, 9, 255, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRequestIdRef.current === replayResultRequestIdRef.current'],
    replacements: ['true'],
    reason:
      'The second conjunct is already true for metadata-less recorder results (both refs null) and exactly mirrors the first conjunct for seeded replays; forcing it true cannot admit a case the first conjunct does not already gate.',
    locations: exactLocations(261, 9, 261, 72),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(false);'],
    replacements: ['true'],
    reason:
      'No result card is mounted on the fresh-/next path that runs this reset; every later result resets the flag in the same commit that shows its card.',
    locations: exactLocations(297, 26, 297, 31),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'const currentResultRequestId = stateIdentity === identityKey ? resultRequestId : null;',
    ],
    replacements: ['true'],
    reason:
      'When the identity selector rejects the state, currentResult is null and advance() returns before reading the leaked requestId, so the guarded value has no reader.',
    locations: exactLocations(322, 34, 322, 63),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentQuestion !== null &&'],
    replacements: ['true'],
    reason:
      'The only reader of showIntro sits behind a non-null currentQuestion in the same expression chain; forcing the conjunct true cannot change any rendered branch.',
    locations: exactLocations(326, 5, 326, 29),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['(currentProgress?.asked ?? 0) === 0;'],
    replacements: ['currentProgress.asked'],
    reason:
      'The progress operand short-circuits behind introStarted for replayed states (the seed latches it true), and a canonical question always carries non-null progress, so the optional chain never dereferences null.',
    locations: exactLocations(329, 6, 329, 28),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'StringLiteral',
    originals: [
      "? `${identityKey}:result:${currentQuestion?.id ?? 'none'}:${currentResult.noSpeech}:${currentResult.done}`",
    ],
    replacements: ['""'],
    reason:
      'The result step key is a dedupe-only identity: every production path that renders a result card carries a non-null question (the recorder requires one and the replay seeds one), and no rendered output reads the key.',
    locations: exactLocations(333, 57, 333, 63),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: [
      "? `${identityKey}:result:${currentQuestion?.id ?? 'none'}:${currentResult.noSpeech}:${currentResult.done}`",
    ],
    replacements: ["currentQuestion?.id && 'none'"],
    reason:
      'The result step key is a dedupe-only identity: every production path that renders a result card carries a non-null question (the recorder requires one and the replay seeds one), and no rendered output reads the key.',
    locations: exactLocations(333, 34, 333, 63),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: [
      "? `${identityKey}:result:${currentQuestion?.id ?? 'none'}:${currentResult.noSpeech}:${currentResult.done}`",
    ],
    replacements: ['currentQuestion.id'],
    reason:
      'The result step key is a dedupe-only identity: every production path that renders a result card carries a non-null question (the recorder requires one and the replay seeds one), and no rendered output reads the key.',
    locations: exactLocations(333, 34, 333, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'StringLiteral',
    count: 2,
    originals: ["? `${identityKey}:${showIntro ? 'intro' : 'question'}:${currentQuestion.id}`"],
    replacements: ['""'],
    reason:
      'The intro/question step-key literals are dedupe-only identities that stay distinct within their branch and are never rendered; swapping the literal cannot change which transitions announce or scroll.',
    locations: exactLocations(335, 41, 335, 48, 335, 51, 335, 61),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['questionScrollRef.current?.scrollTo({ y: 0, animated: false });'],
    replacements: ['questionScrollRef.current.scrollTo'],
    reason:
      'The optional chain only guards a null scroll ref that cannot coexist with an announced step: the only refless branches (loading/error) have a null step key, and the announced branches mount the scroll view before the effect runs.',
    locations: exactLocations(366, 7, 366, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (Platform.OS === 'ios') {"],
    replacements: ['true'],
    reason:
      "The Jest React Native preset reports Platform.OS 'ios', so the true-forcing mutant is behaviorally identical on the test platform while the false-forcing mutant is killed by the announcement assertions.",
    locations: exactLocations(371, 9, 371, 30),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),'],
    replacements: ['true'],
    reason:
      "Every callback invoked while the owner key is null is additionally rejected by renderOwnsWork's identity/lease conjuncts, which fail in every reachable ownerless interleaving (unmount, identity change, or user loss).",
    locations: exactLocations(398, 7, 398, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['exact: true,'],
    replacements: ['false'],
    reason:
      'No registered query key extends the cancelled diagnostic-next prefix, so exact and prefix cancellation address the same single query; the flag cannot change which fetch is aborted.',
    locations: exactLocations(417, 14, 417, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArithmeticOperator',
    originals: ['attemptNo: previous.length + 1,'],
    replacements: ['previous.length - 1'],
    reason:
      'attemptNo is only a React list key here: the reveal numbers rows by index, and the mutated sequence stays unique within a session, so no duplicate-key or rendering difference can be observed.',
    locations: exactLocations(427, 22, 427, 41),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'The logoutBusyRef latch set by the same synchronous block already blocks the account action; the accountAction latch is a deliberately redundant second fence whose removal cannot admit the guarded action.',
    locations: exactLocations(512, 32, 512, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['let rearm = false;'],
    replacements: ['true'],
    reason:
      "rearm only re-arms accountActionRef after a same-identity logout failure; on the success path the route replaces away from this screen, so the initializer's value never reaches a reachable decision.",
    locations: exactLocations(515, 17, 515, 22),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeIdentityRef.current === identityKey &&'],
    replacements: ['true'],
    reason:
      'Reaching the forced conjunct requires an account swap mid-logout while this route keeps focus; every identity transition that swaps the account also reroutes or resets the identity refs the surrounding conjuncts check, so the mutated condition can never differ observably.',
    locations: exactLocations(525, 9, 525, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    count: 2,
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['true'],
    reason:
      "The finally's post-boundary setLogoutBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(536, 11, 536, 74, 536, 33, 536, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      "The finally's post-boundary setLogoutBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(536, 11, 536, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (rearm) accountActionRef.current = false;'],
    replacements: ['true'],
    reason:
      'rearm only re-arms accountActionRef after a same-identity logout failure the catch already localized; forcing it true cannot let a stale handler run because renderOwnsWork re-checks focus and identity synchronously.',
    locations: exactLocations(538, 13, 538, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    count: 4,
    originals: [
      '!renderOwnsWork() ||\n      resultRef.current !== expectedResult ||\n      resultRequestIdRef.current !== expectedRequestId',
      '!renderOwnsWork() ||\n      resultRef.current !== expectedResult ||',
      'resultRef.current !== expectedResult ||',
      'resultRequestIdRef.current !== expectedRequestId',
    ],
    replacements: ['false'],
    reason:
      'Defense-in-depth behind its only callers: advance() and the acknowledgement continuation re-validate the same refs immediately before commitAdvance, so the duplicated conjunction can never disagree in a reachable interleaving.',
    locations: exactLocations(548, 7, 550, 55, 548, 7, 549, 43, 549, 7, 549, 43, 550, 7, 550, 55),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: [
      '!renderOwnsWork() ||\n      resultRef.current !== expectedResult ||\n      resultRequestIdRef.current !== expectedRequestId',
    ],
    replacements: [
      '(!renderOwnsWork() || resultRef.current !== expectedResult) && resultRequestIdRef.current !== expectedRequestId',
    ],
    reason:
      'Defense-in-depth behind its only callers: advance() and the acknowledgement continuation re-validate the same refs immediately before commitAdvance, so the duplicated conjunction can never disagree in a reachable interleaving.',
    locations: exactLocations(548, 7, 550, 55),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['!renderOwnsWork() ||\n      resultRef.current !== expectedResult ||'],
    replacements: ['!renderOwnsWork() && resultRef.current !== expectedResult'],
    reason:
      'Defense-in-depth behind its only callers: advance() and the acknowledgement continuation re-validate the same refs immediately before commitAdvance, so the duplicated conjunction can never disagree in a reachable interleaving.',
    locations: exactLocations(548, 7, 549, 43),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [') {\n      return;\n    }'],
    replacements: ['{}'],
    reason:
      'Defense-in-depth behind its only callers: advance() and the acknowledgement continuation re-validate the same refs immediately before commitAdvance, so the duplicated conjunction can never disagree in a reachable interleaving.',
    locations: exactLocations(551, 7, 553, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(false);'],
    replacements: ['true'],
    reason:
      'No result card is mounted after commitAdvance clears the result; the alert renders only inside the card, and every later card resets the flag before rendering.',
    locations: exactLocations(560, 26, 560, 31),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    count: 2,
    originals: [
      '!renderOwnsWork() ||\n      !currentResult ||\n      resultRef.current !== currentResult ||',
      '!renderOwnsWork() ||\n      !currentResult ||',
    ],
    replacements: ['false'],
    reason:
      "Shadowed by commitAdvance's own entry guard: a stale advance that passes this weakened check reaches a commitAdvance whose !renderOwnsWork() conjunct still returns before any observable write, and the durable acknowledgement its path would start is pinned by the not-called assertions.",
    locations: exactLocations(582, 7, 584, 42, 582, 7, 583, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: [
      '!renderOwnsWork() ||\n      !currentResult ||\n      resultRef.current !== currentResult ||',
    ],
    replacements: ['(!renderOwnsWork() || !currentResult) && resultRef.current !== currentResult'],
    reason:
      "Shadowed by commitAdvance's own entry guard: a stale advance that passes this weakened check reaches a commitAdvance whose !renderOwnsWork() conjunct still returns before any observable write, and the durable acknowledgement its path would start is pinned by the not-called assertions.",
    locations: exactLocations(582, 7, 584, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['!renderOwnsWork() ||\n      !currentResult ||'],
    replacements: ['!renderOwnsWork() && !currentResult'],
    reason:
      "Shadowed by commitAdvance's own entry guard: a stale advance that passes this weakened check reaches a commitAdvance whose !renderOwnsWork() conjunct still returns before any observable write, and the durable acknowledgement its path would start is pinned by the not-called assertions.",
    locations: exactLocations(582, 7, 583, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRef.current !== currentResult ||'],
    replacements: ['false'],
    reason:
      "Shadowed by commitAdvance's own entry guard: a stale advance that passes this weakened check reaches a commitAdvance whose identity re-validation still returns before any observable write.",
    locations: exactLocations(584, 7, 584, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [
      'if (!userId) {\n      resultActionClaimRef.current = null;\n      setResultActionError(true);\n      return;\n    }',
    ],
    replacements: ['{}'],
    reason:
      'A null userId unmounts every interactive surface before a result card can exist (the screen returns null), so the branch is unreachable behind the render guard.',
    locations: exactLocations(596, 18, 600, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!userId) {'],
    replacements: ['false'],
    reason:
      'A null userId unmounts every interactive surface before a result card can exist (the screen returns null), so the branch is unreachable behind the render guard.',
    locations: exactLocations(596, 9, 596, 16),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(true);'],
    replacements: ['false'],
    reason:
      'A null userId unmounts every interactive surface before a result card can exist (the screen returns null), so the branch is unreachable behind the render guard.',
    locations: exactLocations(598, 28, 598, 32),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['mountedRef.current &&\n        activeIdentityRef.current === identityKey &&'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      'The regroup only matters when the first conjuncts disagree in an unreachable direction: the unmount sweep nulls activeIdentityRef before any continuation runs, and the result/request refs are stable across the acknowledgement await because no setter runs between claim and settlement.',
    locations: exactLocations(614, 9, 615, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeIdentityRef.current === identityKey &&'],
    replacements: ['true'],
    reason:
      'The identity conjunct is shadowed by the mounted conjunct in every reachable interleaving: unmount nulls the ref in the same sweep that falses mountedRef, and identity changes rerender the route before the continuation settles.',
    locations: exactLocations(615, 9, 615, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRef.current === currentResult &&'],
    replacements: ['true'],
    reason:
      'resultRef cannot change between the advance claim and the acknowledgement settlement: the recorder is unmounted while the card shows, and every refetch path that could clear it also fails the identity/lease conjuncts checked in the same expression.',
    locations: exactLocations(617, 9, 617, 44),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRequestIdRef.current === requestId;'],
    replacements: ['true'],
    reason:
      'resultRequestIdRef cannot change between the advance claim and the acknowledgement settlement: no setter runs in that window, and every path that could clear it also fails the identity/lease conjuncts checked in the same expression.',
    locations: exactLocations(618, 9, 618, 49),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['resultActionBusyRef.current = false;'],
    replacements: ['true'],
    reason:
      "The acknowledgement path's busy-ref write is immediately re-falsed by commitAdvance's own write in the same synchronous block, so a stuck-true value never reaches a reader.",
    locations: exactLocations(622, 39, 622, 44),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['resultActionBusyRef.current = false;'],
    replacements: ['true'],
    reason:
      'The rearm branch runs only after focus loss; every account action is already fenced by the focused conjunct until refocus, and the refocused advance re-falses the ref in the same commit that resumes the card.',
    locations: exactLocations(636, 39, 636, 44),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['practiceStartRef.current ||\n      accountActionRef.current ||'],
    replacements: ['practiceStartRef.current && accountActionRef.current'],
    reason:
      'Every interleaving where the practice/account latches differ also fails a later conjunct: blur sets accountActionRef while dropping focus, and failures reset both flags together, so the regrouped pair cannot change the decision.',
    locations: exactLocations(649, 7, 650, 31),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'The practiceStart latch set in the same synchronous block already blocks every account action; the accountAction latch is a deliberately redundant second fence whose removal cannot admit the guarded action.',
    locations: exactLocations(659, 32, 659, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['practiceStartRef.current = true;'],
    replacements: ['false'],
    reason:
      'The accountAction latch set in the same synchronous block already blocks every account action; the practiceStart latch is a deliberately redundant second fence whose removal cannot admit the guarded action.',
    locations: exactLocations(660, 32, 660, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    count: 2,
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['true'],
    reason:
      "The finally's post-boundary setPracticeStartBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(687, 11, 687, 74, 687, 33, 687, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      "The finally's post-boundary setPracticeStartBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(687, 11, 687, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ObjectLiteral',
    originals: ["{t('diag.introCount', { count: currentProgress.maxQuestions })}"],
    replacements: ['{}'],
    reason:
      "The English catalog copy for diag.introCount is a fixed 'You will answer 2 or 3 questions.' with no count placeholder, so the params object never reaches the rendered string in any locale.",
    locations: exactLocations(874, 37, 874, 76),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentProgress.maxQuestions > 0'],
    replacements: ['true'],
    reason:
      "parseDiagnosticNext rejects maxQuestions < 1, so a committed progress always satisfies maxQuestions > 0; the guard's false direction is killed by the asked-fraction assertion while the true direction cannot diverge.",
    locations: exactLocations(899, 21, 899, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: ['currentProgress.maxQuestions > 0'],
    replacements: ['currentProgress.maxQuestions >= 0'],
    reason:
      "parseDiagnosticNext rejects maxQuestions < 1, so a committed progress always satisfies maxQuestions > 0; the guard's false direction is killed by the asked-fraction assertion while the true direction cannot diverge.",
    locations: exactLocations(899, 21, 899, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      'transcriptText: {\n    marginTop: spacing.xs,\n    fontSize: 17,\n    lineHeight: 25,\n    color: colors.text,\n  },',
    ],
    replacements: ['{}'],
    reason:
      "Dead style key: the word-tagged transcript component replaced this style's only historical consumer, and no JSX in the file references transcriptText.",
    locations: exactLocations(1109, 19, 1114, 4),
  },

  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: ["typeof passed !== 'boolean' ||"],
    replacements: ['false'],
    count: 3,
    reason:
      'Diagnostic, scored-attempt, and history parsing immediately compare passed with a score-derived boolean using strict inequality. Every non-boolean still fails that invariant, so the explicit type guard cannot decide acceptance.',
    locations: exactLocations(538, 5, 538, 32, 647, 5, 647, 32, 942, 7, 942, 34),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (level !== undefined || nextQuestion === undefined) {'],
    replacements: ['false'],
    reason:
      'If nextQuestion is undefined, falling through reaches parseWith(nextQuestion, isQuestion), which throws the identical ContractError. The sibling level guard remains independently exercised.',
    locations: exactLocations(586, 32, 586, 58),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: ["typeof mastered !== 'boolean' ||"],
    replacements: ['false'],
    reason:
      'The later strict comparison with the mastery score derives a boolean and rejects every non-boolean mastered value.',
    locations: exactLocations(648, 5, 648, 34),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: [
      'if (attemptsLeft !== undefined || finalFeedback !== undefined || next === undefined) {',
      'if (attemptsLeft !== 0 || !isBoundedNonEmptyString(finalFeedback, 4_000) || next === undefined) {',
    ],
    replacements: ['false'],
    count: 2,
    reason:
      'At both sites an undefined next value falls through to parseWith(next, isPracticeQuestionPayload), which throws the identical ContractError.',
    locations: exactLocations(746, 7, 746, 25, 746, 79, 746, 97),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'BlockStatement',
    originals: ['} catch {\n    return false;\n  }'],
    replacements: ['{}'],
    reason:
      'safeUploadUrl is private and consumed only inside an && chain, where the undefined fallthrough from an emptied catch and false are indistinguishable.',
    locations: exactLocations(1185, 11, 1187, 4),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (entries.length < 2 || entries.length > 32) return null;'],
    replacements: ['false'],
    reason:
      'The caller requires uploadFields.key === value.audioKey and uploadFields[Content-Type] === value.contentType, which cannot both hold with fewer than two distinct entries. The count is pinned at one because the sibling whole-condition mutant on this line is killed today.',
    locations: exactLocations(1273, 7, 1273, 25),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: ['audioKeyExt !== undefined &&'],
    replacements: ['true'],
    reason:
      "With audioKeyExt undefined the next clause becomes endsWith('.undefined'), and safeAudioKey has already forced the key to end in one of m4a/mp3/wav/ogg/webm/flac.",
    locations: exactLocations(1330, 5, 1330, 30),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: [
      "if (typeof audioKey !== 'string' || typeof endpoint !== 'string' || !safeAudioKey(audioKey)) {",
    ],
    replacements: ['false'],
    reason:
      'Every non-string endpoint misses all three strict endpoint comparisons and reaches the explicit false fallback without coercion, so this runtime type clause cannot decide the result.',
    locations: exactLocations(1256, 39, 1256, 67),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'BlockStatement',
    originals: ['} else {\n    return false;\n  }'],
    replacements: ['{}'],
    reason:
      'Without the explicit fallback return, expectedScope remains undefined and the final comparison with the string key scope is still false for every unknown endpoint.',
    locations: exactLocations(1264, 10, 1266, 4),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (items.length === 0 && historyQuery.isPending) {'],
    replacements: ['true'],
    reason:
      'isPending holds exactly while data is undefined (no initialData, placeholderData or select on this query), and items is data?.pages.flatMap(...) ?? [], so isPending implies items.length === 0. The conjunction and isPending alone denote the same predicate in every reachable state; the !user early return removes the disabled-query case.',
    locations: exactLocations(326, 7, 326, 25),
  },
  {
    file: 'src/app/_layout.tsx',
    mutator: 'OptionalChaining',
    originals: [
      'const canPractice = hasProfile && user?.diagnosticCompleted === true && !placementRevealPending;',
      'guard={hasProfile && (user?.diagnosticCompleted === false || placementRevealPending)}',
    ],
    replacements: ['user.diagnosticCompleted'],
    reason:
      'Both optional accesses remain on the right side of a hasProfile conjunction. hasProfile includes !!user and short-circuits before either access, so direct property access cannot throw.',
    locations: exactLocations(82, 33, 82, 58),
  },
  {
    file: 'src/app/_layout.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'QueryFocusBridge’s effect dependency array. Both literals are constant and identical on every render, so the effect fires once on mount and cleans up once on unmount either way.',
    locations: exactLocations(278, 6, 278, 8),
  },
  {
    file: 'src/app/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!user && meQuery.isPending) {'],
    replacements: ['false'],
    reason:
      'With no user, an enabled profile query has no data while pending, so profile is null and the following loading fallback renders the same LoadingView. With a user, this condition is false already.',
    locations: exactLocations(177, 7, 177, 33),
  },
  {
    file: 'src/app/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      "if (!user && meQuery.isPending) {\n    return <LoadingView label={t('gate.loadingProfile')} />;\n  }",
    ],
    replacements: ['{}'],
    reason:
      'Emptying the pending-user block falls through to the profile fallback, which renders the same loading view for the still-null profile.',
    locations: exactLocations(177, 35, 179, 4),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'StringLiteral',
    originals: ["const identityKey = `${sessionVersion}:${userId ?? 'anonymous'}`;"],
    replacements: ['""'],
    reason:
      'The placeholder is only distinguishable if a real userId collides with it, but User.id is uuid-validated by parseUser, so it is never "" or "anonymous". The key is only ever compared against itself, and both variants stay distinct from every signed-in key.',
    locations: exactLocations(72, 54, 72, 65),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['const [answers, setAnswers] = useState<DiagnosticAnswerSummary[]>([]);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'Answers are rendered only in the completed-level view, which can be reached only after the identity layout effect has reset this initial array before passive or network publication.',
    locations: exactLocations(115, 69, 115, 71),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['true'],
    reason:
      'On an identity refresh the ref still equals the closing identity; on unmount the earlier outer layout cleanup has already nulled it. Assigning null in either case is immediately overwritten by the next setup or repeats the existing unmount state.',
    locations: exactLocations(186, 11, 186, 52),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'ConditionalExpression',
    originals: ["typeof candidate.createdAt !== 'number' ||"],
    replacements: ['false'],
    reason:
      'The following !Number.isFinite(candidate.createdAt) is already true for every non-number, so this clause cannot change which records are rejected. It narrows the type for the <= 0 comparison below.',
    locations: exactLocations(151, 5, 151, 44),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'ConditionalExpression',
    originals: ["(typeof candidate.audioKey !== 'string' ||"],
    replacements: ['false'],
    reason:
      'audioKeyBelongsToOwner short-circuits on safeAudioKey, whose regex test is false for any non-string, so the record is rejected either way. The typeof narrows the argument type for TypeScript.',
    locations: exactLocations(218, 6, 218, 44),
  },
  {
    file: 'src/lib/use-hardware-back.ts',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The useCallback dependency literal is constant, so React compares it equal on every render and the focus effect subscribes exactly once either way.',
    locations: exactLocations(26, 8, 26, 10),
  },
  {
    file: 'src/lib/auth.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);', '[],'],
    replacements: ['["Stryker was here"]'],
    count: 5,
    reason:
      'The setUser, isSessionLeaseCurrent, schedulePendingCleanup, retrySessionRestore, and failed-transition lease-rearm callbacks capture only stable setters, refs, or module functions. Either constant dependency literal preserves their lifetime.',
    locations: exactLocations(
      159,
      6,
      159,
      8,
      168,
      6,
      168,
      8,
      190,
      5,
      190,
      7,
      217,
      6,
      217,
      8,
      313,
      5,
      313,
      7,
    ),
  },
  {
    file: 'src/lib/auth.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The captureSessionLease callback and the unmount-only effect both receive a dependency array that is constant across renders. Replacing one constant element with another cannot change callback recreation or effect setup/cleanup timing.',
    locations: exactLocations(376, 5, 376, 7),
  },
  {
    file: 'src/lib/auth.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [schedulePendingCleanup]);'],
    replacements: ['[]'],
    reason:
      'schedulePendingCleanup is itself stable for the provider’s lifetime, so omitting it cannot change waitForPendingCleanup identity or leave the wait loop with a stale cleanup function.',
    locations: exactLocations(234, 6, 234, 30),
  },
  {
    file: 'src/lib/auth.tsx',
    mutator: 'ArithmeticOperator',
    originals: ['setRestoreAttempt((attempt) => attempt + 1);'],
    replacements: ['attempt - 1'],
    reason:
      'restoreAttempt is neither rendered nor arithmetically consumed; it is only an effect dependency. Incrementing or decrementing produces a distinct monotonic value on every retry and therefore triggers the same restore cycle.',
    locations: exactLocations(319, 36, 319, 47),
  },
  {
    file: 'src/lib/auth.tsx',
    mutator: 'BlockStatement',
    originals: ['return () => {\n      cancelled = true;\n    };'],
    replacements: ['{}'],
    reason:
      'A dependency refresh immediately runs the replacement effect, which increments epochRef, while unmount runs the dedicated epoch increment before promise continuations resume. The captured epoch can therefore never remain current after this cleanup, so the adjacent epoch guard already rejects the stale restore.',
    locations: exactLocations(302, 18, 304, 6),
  },
  {
    file: 'src/lib/auth.tsx',
    mutator: 'BooleanLiteral',
    originals: ['cancelled = true;'],
    replacements: ['false'],
    reason:
      'Leaving cancelled false is covered by the same epoch invalidation as the cleanup-block mutant: dependency refresh and unmount both make the captured epoch stale before asynchronous restore work can publish.',
    locations: exactLocations(303, 19, 303, 23),
  },
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'ConditionalExpression',
    originals: [
      "return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;",
    ],
    replacements: ['true'],
    reason:
      'Number.isInteger returns false for every non-number without coercion, so the typeof test is subsumed; it exists only to narrow unknown for TypeScript. Six ConditionalExpression mutants share this line and only this innermost one survives, hence the count of one.',
    locations: exactLocations(60, 10, 60, 35),
  },
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'BlockStatement',
    originals: ['} catch {\n    return null;\n  }'],
    replacements: ['{}'],
    reason:
      'Emptying the getItemAsync catch leaves `stored` unassigned, so `if (!stored) return null` returns the same null with no side effects. It is also not type-valid — tsc reports TS2454, used before assigned — so it could not exist in real source.',
    locations: exactLocations(86, 11, 88, 4),
  },
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (!stored) return null;'],
    replacements: ['false'],
    reason:
      "The only reachable falsy values are null and ''. JSON.parse(null) yields null, which parseDailyReminder maps to null; JSON.parse('') throws into the second catch, which also returns null. Identical on every path, and not type-valid either.",
    locations: exactLocations(89, 7, 89, 14),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'ArrayDeclaration',
    originals: [
      '[],',
      'const clearFeedback = useCallback(() => setFeedback(null), []);',
      '}, []);',
      'const resetSessionTally = useCallback(() => setSessionTally(EMPTY_TALLY), []);',
    ],
    replacements: ['["Stryker was here"]'],
    count: 6,
    reason:
      'The show, restore, clear-feedback, clear-recording-reference, reset-tally, and reset-flow callbacks capture only stable state setters and module functions. Replacing each constant dependency literal with another constant preserves callback and context-value identity.',
    locations: exactLocations(
      126,
      5,
      126,
      7,
      153,
      5,
      153,
      7,
      155,
      62,
      155,
      64,
      163,
      6,
      163,
      8,
      164,
      77,
      164,
      79,
      170,
      6,
      170,
      8,
    ),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!userId) return;'],
    replacements: ['false'],
    reason:
      'dismissIntro only runs from the intro card, which renders only when a signed-in learner has an unseen explainer, so userId is always set where the guard runs.',
    locations: exactLocations(138, 9, 138, 16),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [cancelFocusRevalidation]);'],
    replacements: ['[]'],
    reason:
      'cancelFocusRevalidation is an empty-dependency callback with stable identity, so removing it from the mount layout effect dependencies does not alter setup or cleanup cadence.',
    locations: exactLocations(120, 6, 120, 31),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['!user ||\n      !question ||'],
    replacements: ['false'],
    reason:
      'Recorder onResult exists only in a render with a signed-in user and a parsed question, so this leading subgroup is false whenever the callback can run.',
    locations: exactLocations(424, 7, 425, 16),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['!user ||\n      !question ||'],
    replacements: ['!user && !question'],
    reason:
      'The same callable-Recorder invariant makes both operands false, so changing OR to AND cannot alter the leading subgroup.',
    locations: exactLocations(424, 7, 425, 16),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'StringLiteral',
    originals: ["key={`${cycleId}:${nativeMode ? 'native' : 'english'}`}"],
    replacements: ['""'],
    count: 2,
    reason:
      'The Recorder remains its parent’s only child. The cycle prefix is unchanged and either emptied mode branch stays distinct from its sibling, preserving remount behavior.',
    locations: exactLocations(780, 49, 780, 57, 780, 60, 780, 69),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'Regex',
    originals: ["const bareHost = host.replace(/^\\[|\\]$/g, '');"],
    replacements: ['/\\[|\\]$/g', '/^\\[|\\]/g'],
    count: 2,
    reason:
      'host comes from WHATWG URL.hostname, which permits brackets only as the outer delimiters of an IPv6 literal. Dropping either regex anchor therefore cannot change a replacement target.',
    locations: exactLocations(66, 39, 66, 49, 66, 39, 66, 49),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ["return typeof value === 'string' && API_ERROR_CODE_SET.has(value);"],
    replacements: ['true'],
    reason:
      'API_ERROR_CODE_SET holds only strings, so has() is already false for every non-string value. The typeof test is there to narrow the type for TypeScript, not to change behaviour.',
    locations: exactLocations(150, 10, 150, 35),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'OptionalChaining',
    originals: ["signal?.removeEventListener('abort', listener);"],
    replacements: ['signal.removeEventListener'],
    reason:
      "When signal is present both forms remove the same listener. When it is absent, the direct property access throws inside removeAbortListener's best-effort try/catch and is swallowed, so callers observe the same no-throw cleanup.",
    locations: exactLocations(374, 5, 374, 32),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'LogicalOperator',
    originals: [
      "return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxSeconds",
    ],
    replacements: ["typeof value === 'number' || Number.isFinite(value)"],
    reason:
      'Number.isFinite subsumes the typeof test, and the remaining `> 0` / `<= maxSeconds` bounds reject the only non-finite numbers (NaN, ±Infinity) regardless of which way the pair is combined.',
    locations: exactLocations(359, 10, 359, 61),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (!header) return undefined;'],
    replacements: ['false'],
    reason:
      "The only falsy headers are null and '', and Number(null) === Number('') === 0, which boundedSeconds already rejects through `value > 0`. The guard is a readability shortcut, not a behavioural branch.",
    locations: exactLocations(368, 7, 368, 14),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (body) void Promise.resolve(body.cancel()).catch(() => undefined);'],
    replacements: ['true'],
    reason:
      'Response.body is either a stream or null. Forcing the null case through body.cancel throws inside the enclosing best-effort try/catch and is swallowed, exactly like skipping cancellation when no stream exists.',
    locations: exactLocations(421, 13, 421, 17),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'LogicalOperator',
    originals: ["typeof hours === 'number' &&\n      Number.isFinite(hours) &&"],
    replacements: ["typeof hours === 'number' || Number.isFinite(hours)"],
    reason:
      'Number.isFinite subsumes the typeof test, and the surviving positive/maximum bounds reject NaN and both infinities regardless of which way this pair is combined.',
    locations: exactLocations(540, 7, 541, 29),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ["typeof fileSize !== 'number' ||"],
    replacements: ['false'],
    reason:
      'The following !Number.isFinite(fileSize) is already true for every non-number, so this clause cannot change which files are rejected. It narrows the snapshotted value for the size comparisons below.',
    locations: exactLocations(934, 7, 934, 35),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'EqualityOperator',
    originals: [
      'for (let page = 0; page < maxPages; page += 1) {',
      'for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {',
    ],
    replacements: ['page <= maxPages', 'page <= EXPORT_MAX_PAGES'],
    count: 3,
    reason:
      'All three export loops reject a nonterminal final cursor inside the last allowed iteration and return or advance phases on terminal data. No execution reaches the extra iteration introduced by <=, whether the bound is maxPages or EXPORT_MAX_PAGES.',
    locations: exactLocations(1200, 22, 1200, 37, 1236, 22, 1236, 37, 1278, 22, 1278, 45),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'Login synchronously sets mountedRef true in its mount layout effect before an event or async continuation can read the seed.',
    locations: exactLocations(57, 29, 57, 33),
  },
  {
    file: 'src/app/(tabs)/home.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The focus callback receives a constant dependency literal, so either constant array gives it the same lifetime.',
    locations: exactLocations(50, 8, 50, 10),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The mount effect sets the ref true before a native press or end-reached event can invoke loadOlder, its only reader before cleanup.',
    locations: exactLocations(264, 29, 264, 34),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The mount effect dependency literal remains element-wise constant and therefore keeps the same setup and cleanup lifetime.',
    locations: exactLocations(297, 6, 297, 8),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'OptionalChaining',
    originals: [
      'const fetchDirection = (queryState?.fetchMeta as HistoryFetchMeta | null)?.fetchMore?.direction;',
    ],
    replacements: ['(queryState?.fetchMeta as HistoryFetchMeta | null)?.fetchMore.direction'],
    reason:
      'For this infinite query fetchMeta is either null for an ordinary fetch or the observer-supplied object containing fetchMore; a non-null meta with missing fetchMore is unreachable.',
    locations: exactLocations(404, 28, 404, 100),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'OptionalChaining',
    originals: [
      "(queryState?.fetchStatus === 'fetching' && fetchDirection === 'forward')",
      "if (queryState?.fetchStatus === 'fetching') {",
    ],
    replacements: ['queryState.fetchStatus'],
    count: 2,
    reason:
      'A rendered non-empty history list has an active observer for queryKey, so getQueryState cannot be undefined while either load-more check executes.',
    locations: exactLocations(409, 8, 409, 31, 414, 9, 414, 32),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      'return historyQuery.fetchNextPage({ cancelRefetch: false });',
      'void historyQuery.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);',
    ],
    replacements: ['{}'],
    count: 2,
    reason:
      'Both calls are reached only with no active fetch: the direct path checks live query state, and the queued path runs immediately after its joined refresh settles. The default cancelRefetch value therefore has nothing to cancel.',
    locations: exactLocations(431, 45, 431, 69, 440, 37, 440, 61),
  },
  {
    file: 'src/app/(tabs)/history.tsx',
    mutator: 'BooleanLiteral',
    originals: [
      'return historyQuery.fetchNextPage({ cancelRefetch: false });',
      'void historyQuery.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);',
    ],
    replacements: ['true'],
    count: 2,
    reason:
      'As at the paired ObjectLiteral sites, the fetch is idle when either call occurs, so true and false cancelRefetch values are behaviorally identical.',
    locations: exactLocations(431, 62, 431, 67, 440, 54, 440, 59),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: [
      'const recorderLockedRef = useRef(false);',
      'const [recorderExitLocked, setRecorderExitLocked] = useState(false);',
      'const recorderExitLockedRef = useRef(false);',
      'const logoutBusyRef = useRef(false);',
      'const [logoutBusy, setLogoutBusy] = useState(false);',
      'const practiceStartRef = useRef(false);',
      'const [practiceStartBusy, setPracticeStartBusy] = useState(false);',
      'const focusedRef = useRef(false);',
    ],
    replacements: ['true'],
    count: 8,
    reason:
      'Focus plus identity/Recorder layout effects reset the Recorder locks, exit lock, logout latch, practice-start latch, and focus seed before asynchronous diagnostic state can expose any actionable view.',
    locations: exactLocations(
      117,
      36,
      117,
      41,
      118,
      64,
      118,
      69,
      119,
      40,
      119,
      45,
      120,
      32,
      120,
      37,
      121,
      48,
      121,
      53,
      122,
      35,
      122,
      40,
      123,
      62,
      123,
      67,
      125,
      29,
      125,
      34,
    ),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);', 'const accountActionRef = useRef(true);'],
    replacements: ['false'],
    count: 2,
    reason:
      'The mount and focus/identity effects overwrite both seeds before any rendered action or async continuation reads them.',
    locations: exactLocations(124, 29, 124, 33, 126, 35, 126, 39),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useLayoutEffect(() => {\n    mountedRef.current = true;\n    return () => {\n      mountedRef.current = false;\n      focusedRef.current = false;\n      accountActionRef.current = true;\n      activeIdentityRef.current = null;\n      activeRecorderOwnerRef.current = null;\n    };\n  }, []);',
      'return () => {\n      mountedRef.current = false;\n      focusedRef.current = false;\n      accountActionRef.current = true;\n      activeIdentityRef.current = null;\n      activeRecorderOwnerRef.current = null;\n    };',
    ],
    replacements: ['{}'],
    count: 2,
    reason:
      'mountedRef is seeded true, while the identity layout cleanup and focus cleanup independently make render ownership false on unmount; deleting either outer block cannot admit a callback.',
    locations: exactLocations(151, 25, 160, 4, 153, 18, 159, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
    replacements: ['true'],
    count: 2,
    reason:
      'Each mutated cleanup still leaves the sibling mounted/focus fence false and clears active identity and Recorder ownership.',
    locations: exactLocations(154, 28, 154, 33, 155, 28, 155, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    count: 2,
    reason:
      'At both cleanup sites focusedRef is already false, so renderOwnsWork rejects every account action; refocus setup writes the latch false deliberately.',
    locations: exactLocations(156, 34, 156, 38, 168, 36, 168, 40),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);', '}, []),'],
    replacements: ['["Stryker was here"]'],
    count: 2,
    reason:
      'The mount layout effect and focus callback each receive a constant dependency literal, preserving their lifetimes.',
    locations: exactLocations(160, 6, 160, 8, 170, 8, 170, 10),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['recorderLockedRef.current = false;', 'setRecorderExitLocked(false);'],
    replacements: ['true'],
    count: 2,
    reason:
      'The identity reset writes the interaction-lock ref and visible exit-lock state before a Recorder owner can publish. The later owner layout effect repeats the same reset before controls become actionable.',
    locations: exactLocations(186, 33, 186, 38, 186, 27, 186, 32),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [
      'return () => {\n      if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;\n    };',
    ],
    replacements: ['{}'],
    reason:
      'An identity refresh immediately runs the replacement setup, while unmount has already nulled the ref in the outer layout cleanup.',
    locations: exactLocations(186, 18, 186, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['false'],
    reason:
      'Skipping the dependency cleanup is immediately overwritten by the next setup; on unmount the outer layout cleanup already holds null.',
    locations: exactLocations(186, 11, 186, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['activeIdentityRef.current !== identityKey'],
    reason:
      'Reversing the cleanup comparison only changes a transient value that the replacement setup immediately overwrites, and repeats null on unmount.',
    locations: exactLocations(186, 11, 186, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (activeIdentityRef.current !== identityKey || !isSessionLeaseCurrent(sessionLease)) {',
    ],
    replacements: ['false'],
    reason:
      'Whenever a mounted render has crossed an Auth identity boundary, its captured SessionLease is stale and the remaining lease half rejects publication; unmount cannot run this passive publication effect.',
    locations: exactLocations(255, 9, 255, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),'],
    replacements: ['true'],
    reason:
      'Recorder callbacks are supplied only by the branch with a non-null currentQuestion, so every callback closure captures a non-null owner.',
    locations: exactLocations(398, 7, 398, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['exact: true,'],
    replacements: ['false'],
    reason:
      'Every production diagnostic-next key is the complete three-element session/user tuple; the app creates no descendant key that prefix cancellation could additionally match.',
    locations: exactLocations(417, 14, 417, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'logoutBusyRef independently claims the synchronous logout window before accountActionRef is read, so removing this duplicate assignment cannot admit another observable action.',
    locations: exactLocations(512, 32, 512, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['let rearm = false;'],
    replacements: ['true'],
    reason:
      'rearm remains at its seed only after success or LogoutCleanupError, and Auth logout resets the in-memory session before either outcome settles, removing the protected screen before another action.',
    locations: exactLocations(515, 17, 515, 22),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['true'],
    count: 2,
    reason:
      'A stale finalizer can only repeat setLogoutBusy(false), which is discarded or already reset. rearm can be true only after renderOwnsWork succeeded in the immediately preceding synchronous catch, so both ownership clauses are then true.',
    locations: exactLocations(536, 11, 536, 74, 536, 33, 536, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      'As at the paired forced-true sites, the only extra stale state write is discarded/reset and no async boundary separates a rearming catch from this finally.',
    locations: exactLocations(536, 11, 536, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (rearm) accountActionRef.current = false;'],
    replacements: ['true'],
    reason:
      'When rearm is false, logout already synchronously removed the protected session; writing the route-local action latch cannot enable an observable action.',
    locations: exactLocations(538, 13, 538, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['(currentProgress?.asked ?? 0) === 0;'],
    replacements: ['currentProgress.asked'],
    reason:
      'showIntro now first requires a non-null currentQuestion. The diagnostic-next contract always couples that question with progress, and local advancement preserves it, so currentProgress is non-null whenever this optional access is evaluated.',
    locations: exactLocations(329, 6, 329, 28),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'Delete account synchronously sets mountedRef true in its mount layout effect before events can read its seed.',
    locations: exactLocations(46, 29, 46, 34),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The delete-account mount layout effect receives a constant dependency literal and retains the same setup/cleanup lifetime.',
    locations: exactLocations(54, 6, 54, 8),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "if (mountedRef.current) setError(t('da.wrongPassword'));",
      '} else if (mountedRef.current) {',
    ],
    replacements: ['true'],
    count: 2,
    reason:
      'After unmount these branches perform only pure error mapping and detached setState; the cleanup-error alert remains a separate intentional branch.',
    locations: exactLocations(91, 13, 91, 31, 99, 18, 99, 36),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    count: 2,
    reason:
      'Layout cleanup first nulls confirmingRef, so the preceding confirmation-owner comparison returns before either mounted guard can become the sole fence.',
    locations: exactLocations(124, 11, 124, 30, 139, 17, 139, 36),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ObjectLiteral',
    originals: ['}>({ owner: null, locked: false });'],
    replacements: ['{}'],
    reason:
      'Before the first full Recorder lock update, undefined owner/locked fields compare and coerce exactly like null/false; later updates replace the entire object.',
    locations: exactLocations(65, 6, 65, 36),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const recorderLockedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The Recorder-owner layout effect resets the synchronous interaction-lock ref before a Recorder or question action can consume its seed.',
    locations: exactLocations(69, 36, 69, 41),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(true);', 'const mountedRef = useRef(true);'],
    replacements: ['false'],
    count: 2,
    reason:
      'Before focus, focusedRef already rejects actions; the mount/focus layout writes then establish the authoritative navigation and mounted values before interaction.',
    locations: exactLocations(80, 39, 80, 43, 81, 29, 81, 33),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'StringLiteral',
    originals: ["const renderOwner = `${sessionVersion}:${userId ?? 'anonymous'}`;"],
    replacements: ['""'],
    reason:
      'This literal is only the no-user sentinel. The protected screen returns null with no user, while every signed-in UUID keeps using its actual userId.',
    locations: exactLocations(98, 54, 98, 65),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
    replacements: ['true'],
    count: 2,
    reason:
      'Each individual cleanup mutation leaves the sibling mounted/focus fence false and clears active render ownership, so no stale callback is admitted.',
    locations: exactLocations(112, 28, 112, 33, 113, 28, 113, 33),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['navigationStartedRef.current = true;'],
    replacements: ['false'],
    reason:
      'The same cleanup has already made mounted/focused ownership false; refocus setup explicitly writes the navigation latch false before actions resume.',
    locations: exactLocations(114, 38, 114, 42),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'StringLiteral',
    originals: [
      "? `${renderOwner}:${recorderQuestionId}:${cycleId}:${nativeMode ? 'native' : 'english'}`",
    ],
    replacements: ['""'],
    count: 2,
    reason:
      'The cycle-aware owner retains session, question, and cycle segments. Emptying either mode suffix still leaves native and English owners distinct, and the owner is otherwise opaque.',
    locations: exactLocations(164, 73, 164, 81, 164, 84, 164, 93),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeRenderOwnerRef.current === renderOwner &&'],
    replacements: ['true'],
    reason:
      'An Auth identity mismatch also makes the render-captured SessionLease stale; on unmount mounted/focused ownership is already false, so this clause is subsumed.',
    locations: exactLocations(183, 7, 183, 51),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),'],
    replacements: ['true'],
    reason:
      'Recorder callbacks are created only for a rendered question branch and therefore always capture a non-null owner.',
    locations: exactLocations(190, 7, 190, 21),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],'],
    replacements: ['["Stryker was here"]'],
    reason:
      'interactionLockedNow reads only refs and is intentionally stable; either constant dependency literal preserves that callback lifetime.',
    locations: exactLocations(201, 5, 201, 7),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['navigationStartedRef.current = true;'],
    replacements: ['false'],
    reason:
      'During focus cleanup focusedRef is already false, so render ownership rejects every action; focus setup writes the latch false when actions become valid again.',
    locations: exactLocations(325, 40, 325, 44),
  },
  {
    file: 'src/app/(tabs)/practice/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['void queryClient.cancelQueries({ queryKey: questionQueryKey, exact: true });'],
    replacements: ['false'],
    reason:
      'questionQueryKey is the complete three-element practice-question key and the app creates no descendant key, so exact and prefix cancellation match the same query.',
    locations: exactLocations(438, 73, 438, 77),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!feedback) return null;'],
    replacements: ['true'],
    reason:
      'With feedback, the forced null initializer is synchronously replaced by the render-phase card correction before commit; without feedback both forms return null.',
    locations: exactLocations(127, 9, 127, 18),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      'return {\n      questionId: feedback.questionId,\n      result: feedback.result,\n      ...(feedback.question === undefined ? {} : { question: feedback.question }),\n      ...(feedback.requestId === undefined ? {} : { requestId: feedback.requestId }),\n    };',
    ],
    replacements: ['{}'],
    reason:
      'With feedback, an empty initializer mismatches and the render-phase correction replaces it before commit; without feedback the preceding guard returns null.',
    locations: exactLocations(128, 12, 133, 6),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'OptionalChaining',
    originals: [
      '(feedback.questionId !== card?.questionId ||',
      'feedback.result !== card?.result ||',
      'feedback.question !== card?.question ||',
      'feedback.requestId !== card?.requestId)',
    ],
    replacements: ['card.questionId', 'card.result', 'card.question', 'card.requestId'],
    count: 4,
    reason:
      'The guarded questionId access retains the existing rendered-card invariant. Evaluation reaches result, question, and requestId only after preceding comparisons prove card is non-null; without feedback the outer conjunction short-circuits.',
    locations: exactLocations(
      137,
      30,
      137,
      46,
      138,
      27,
      138,
      39,
      139,
      29,
      139,
      43,
      140,
      30,
      140,
      45,
    ),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'The mount layout effect overwrites this seed to true before a committed card can receive an action.',
    locations: exactLocations(156, 29, 156, 33),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
    replacements: ['true'],
    count: 2,
    reason:
      'Each individual cleanup mutation leaves the sibling lifecycle fence false and activeCardRef null, so no stale card action can pass.',
    locations: exactLocations(170, 28, 170, 33, 171, 28, 171, 33),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);', '}, []),'],
    replacements: ['["Stryker was here"]'],
    count: 2,
    reason:
      'The mount layout effect and focus callback each receive a dependency literal whose constant element preserves the same lifetime.',
    locations: exactLocations(174, 6, 174, 8, 193, 8, 193, 10),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'ConditionalExpression',
    originals: ['!expectedCard ||\n      !mountedRef.current ||'],
    replacements: ['false'],
    reason:
      'Every runOnce caller rendered from a non-null card, and after unmount focusedRef is false and activeCardRef is null, so this leading subgroup is redundant.',
    locations: exactLocations(250, 7, 251, 26),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'LogicalOperator',
    originals: ['!expectedCard ||\n      !mountedRef.current ||'],
    replacements: ['!expectedCard && !mountedRef.current'],
    reason:
      'The callable-card and independent focus/active-card invariants make changing this leading OR subgroup to AND behaviorally irrelevant.',
    locations: exactLocations(250, 7, 251, 26),
  },
  {
    file: 'src/app/(tabs)/practice/feedback.tsx',
    mutator: 'BooleanLiteral',
    originals: ['void queryClient.cancelQueries({ queryKey: currentQuestionKey, exact: true });'],
    replacements: ['false'],
    reason:
      'currentQuestionKey is a complete leaf key and no longer practice-question descendant exists, so exact and prefix cancellation match the same query.',
    locations: exactLocations(333, 77, 333, 81),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'BooleanLiteral',
    originals: ['if (value.length > 16_384) return false;'],
    replacements: ['true'],
    reason:
      'safePlaybackUrl is called only after the 16,384-character bounded-string check passes. Overlength input short-circuits before this private helper, so its overlength return value cannot be observed.',
    locations: exactLocations(1191, 37, 1191, 42),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (value.length > 16_384) return false;'],
    replacements: ['false'],
    reason:
      'safePlaybackUrl is called only after the 16,384-character bounded-string check passes. Its duplicate internal length guard is therefore unreachable, so removing that bound cannot change parsing.',
    locations: exactLocations(1191, 7, 1191, 28),
  },
  {
    file: 'src/lib/types.ts',
    mutator: 'BlockStatement',
    originals: ['} catch {\n    return false;\n  }'],
    replacements: ['{}'],
    reason:
      'The caller consumes safePlaybackUrl only through negation. Invalid URL parsing returns false originally and falls through with undefined after the empty catch; both are falsy and produce the same rejection.',
    locations: exactLocations(1209, 11, 1211, 4),
  },
  {
    file: 'src/app/_layout.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!userId || !uiLanguage) return;'],
    replacements: ['!userId && !uiLanguage'],
    reason:
      'Authenticated User objects are parsed atomically with both a non-empty id and a valid uiLanguage. The fields are therefore either both present or both absent with user, so OR and AND have the same result.',
    locations: exactLocations(161, 9, 161, 31),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: [
      "return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxSeconds",
    ],
    replacements: ['true'],
    reason:
      'Number.isFinite independently rejects every non-number and non-finite value, so the preceding typeof check cannot be the sole reason this bounded-seconds parser rejects input.',
    locations: exactLocations(359, 10, 359, 35),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ["typeof hours === 'number' &&"],
    replacements: ['true'],
    reason:
      'The following Number.isFinite(hours) check independently rejects every non-number and non-finite value, so this explicit typeof check cannot decide acceptance.',
    locations: exactLocations(540, 7, 540, 32),
  },
  {
    file: 'src/app/(tabs)/practice/help.tsx',
    mutator: 'ObjectLiteral',
    originals: ['stateScroll: {\n    flex: 1,\n  },'],
    replacements: ['{}'],
    reason:
      'React Native vertical ScrollView already applies flexGrow and flexShrink. In each loading or error branch it is the container’s sole child, so this extra flex value cannot change the filled bounded viewport.',
    locations: exactLocations(229, 16, 231, 4),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'OptionalChaining',
    originals: ['if (ownsWork) target?.scrollToEnd?.({ animated: true });'],
    replacements: ['target?.scrollToEnd({\n  animated: true\n})'],
    reviewedMutantId: '3',
    reason:
      'RecorderScrollTarget requires scrollToEnd whenever the target exists, so the method-level optional access is redundant while the target-level optional access retains the null guard.',
    locations: exactLocations(83, 17, 83, 58),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!uri) return;'],
    replacements: ['false'],
    reviewedMutantId: '810',
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    locations: exactLocations(915, 7, 915, 11),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (candidateUri) candidates.add(candidateUri);'],
    replacements: ['true'],
    reviewedMutantId: '1162',
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    locations: exactLocations(1511, 9, 1511, 21),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (uri) ownedUris.add(uri);'],
    replacements: ['true'],
    reviewedMutantId: '1238',
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    locations: exactLocations(1621, 11, 1621, 14),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);'],
    replacements: ['true'],
    reviewedMutantId: '2481',
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    locations: exactLocations(3101, 11, 3101, 31),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeAudioSessionOwner !== null,'],
    replacements: ['false'],
    reviewedMutantId: '851',
    reason:
      'On the only mount for which recordingCacheJanitorHasRun is false, no audio owner can predate the passive janitor; if another Recorder already acquired the session, its earlier mount already set the process-once flag. The owner operand therefore cannot decide the result.',
    locations: exactLocations(968, 7, 968, 39),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reviewedMutantId: '869',
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    locations: exactLocations(1017, 29, 1017, 33),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const unmountingRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '870',
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    locations: exactLocations(1018, 32, 1018, 37),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = true;'],
    replacements: ['false'],
    reviewedMutantId: '1313',
    reason:
      'The later AppState mount effect writes mountedRef true before external app-state events or async continuations can publish. Writing false in this earlier mount assignment is therefore overwritten before it can be the sole lifecycle currency.',
    locations: exactLocations(1758, 26, 1758, 30),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);'],
    replacements: ['true'],
    reviewedMutantId: '904',
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    locations: exactLocations(1090, 74, 1090, 79),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [previewPlaying, setPreviewPlaying] = useState(false);'],
    replacements: ['true'],
    reviewedMutantId: '909',
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    locations: exactLocations(1097, 56, 1097, 61),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["const announcedPhaseRef = useRef<Phase>('idle');"],
    replacements: ['""'],
    reviewedMutantId: '2189',
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    locations: exactLocations(2785, 43, 2785, 49),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const hasObservedRecordingRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '913',
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    locations: exactLocations(1113, 42, 1113, 47),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const recordingInterruptionHandledRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '914',
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    locations: exactLocations(1114, 50, 1114, 55),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const cancelRequestedRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '916',
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    locations: exactLocations(1118, 37, 1118, 42),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const assessmentPostedRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '917',
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    locations: exactLocations(1119, 38, 1119, 43),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const previewPlayRequestedRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '919',
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    locations: exactLocations(1146, 42, 1146, 47),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      'const callbacksRef = useRef({\n    disabled,\n    isStartBlocked,\n    onError,\n    onExpandedControlsLayout,\n    onExitLockChange,\n    onInteractionLockChange,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    onResultWithMetadata,\n    parseResult,\n  });',
    ],
    replacements: ['{}'],
    reviewedMutantId: '922',
    reason:
      'The layout effect replaces the callback and full owner/endpoint/question/cycle identity snapshots in the same commit before any focus effect, user input, native event, or continuation can consume the initial object.',
    locations: exactLocations(1157, 31, 1170, 4),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ObjectLiteral',
    originals: ['const identityRef = useRef({ ownerId, endpoint, questionId, cycleId });'],
    replacements: ['{}'],
    reviewedMutantId: '966',
    reason:
      'The layout effect replaces the callback and full owner/endpoint/question/cycle identity snapshots in the same commit before any focus effect, user input, native event, or continuation can consume the initial object.',
    locations: exactLocations(1224, 30, 1224, 72),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'OptionalChaining',
    originals: ['callbacks.onResult?.(data);'],
    replacements: ['callbacks.onResult(data)'],
    reviewedMutantId: '929',
    reason:
      'The Recorder prop union guarantees that the legacy onResult callback exists in the branch where onResultWithMetadata is absent, so the optional call and direct call are identical.',
    locations: exactLocations(1176, 7, 1176, 33),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '930',
    reason:
      'Both callbacks close over stable refs only. Replacing either empty dependency array with the same constant string element preserves callback identity and lifetime across every render.',
    locations: exactLocations(1072, 6, 1072, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '3215',
    reason:
      'Both callbacks close over stable refs only. Replacing either empty dependency array with the same constant string element preserves callback identity and lifetime across every render.',
    locations: exactLocations(3919, 6, 3919, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['const terminalEventQuarantineRef = useRef<TerminalEventQuarantine[]>([]);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '871',
    reason:
      'The injected array element is a string with no uri or takeGeneration property. Every quarantine predicate compares those properties with a real URI or numeric generation, so it never matches and is eventually shifted out without side effects.',
    locations: exactLocations(1031, 72, 1031, 74),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'OptionalChaining',
    originals: ['recorderStillRecording = currentRecorderRef.current?.isRecording === true;'],
    replacements: ['currentRecorderRef.current.isRecording'],
    reviewedMutantId: '883',
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    locations: exactLocations(1044, 34, 1044, 73),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'OptionalChaining',
    originals: ['previewListenerRef.current?.remove();'],
    replacements: ['previewListenerRef.current.remove'],
    reviewedMutantId: '1151',
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    locations: exactLocations(1489, 7, 1489, 41),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'OptionalChaining',
    originals: ['player?.remove();'],
    replacements: ['player.remove'],
    reviewedMutantId: '1153',
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    locations: exactLocations(1497, 7, 1497, 21),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArithmeticOperator',
    originals: ['setRecordingStatusVersion((version) => version + 1);'],
    replacements: ['version - 1'],
    reviewedMutantId: '895',
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    locations: exactLocations(1069, 48, 1069, 59),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'AssignmentOperator',
    originals: ['recoveryGenerationRef.current += 1;'],
    replacements: ['recoveryGenerationRef.current -= 1'],
    reviewedMutantId: '1196',
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    locations: exactLocations(1564, 5, 1564, 39),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'AssignmentOperator',
    originals: ['lifecycleEpochRef.current += 1;'],
    replacements: ['lifecycleEpochRef.current -= 1'],
    reviewedMutantId: '1268',
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    locations: exactLocations(1671, 7, 1671, 37),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'UpdateOperator',
    originals: ['const generation = ++recoveryGenerationRef.current;'],
    replacements: ['--recoveryGenerationRef.current'],
    reviewedMutantId: '1474',
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    locations: exactLocations(1933, 24, 1933, 55),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '896',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1178, 6, 1178, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '940',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1191, 6, 1191, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '965',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1223, 6, 1223, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '976',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1270, 6, 1270, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '998',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1290, 6, 1290, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1053',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1387, 6, 1387, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1058',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1391, 5, 1391, 7),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: [
      'const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);',
    ],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1064',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1394, 89, 1394, 91),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: [
      'const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);',
    ],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1066',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1396, 81, 1396, 83),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1079',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1407, 6, 1407, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1127',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1440, 6, 1440, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1141',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1451, 6, 1451, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1157',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1502, 6, 1502, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1160',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1507, 6, 1507, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1164',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1515, 6, 1515, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1170',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1525, 6, 1525, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1179',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1535, 6, 1535, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1204',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1573, 6, 1573, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '1234',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(1612, 5, 1612, 7),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '2021',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(2625, 6, 2625, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '2136',
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    locations: exactLocations(2740, 6, 2740, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[publishOperation],'],
    replacements: ['[]'],
    reviewedMutantId: '1011',
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    locations: exactLocations(1309, 5, 1309, 23),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[publishOperation],'],
    replacements: ['[]'],
    reviewedMutantId: '1022',
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    locations: exactLocations(1327, 5, 1327, 23),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[updatePhase],'],
    replacements: ['[]'],
    reviewedMutantId: '1147',
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    locations: exactLocations(1482, 5, 1482, 18),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);'],
    replacements: ['[]'],
    reviewedMutantId: '2145',
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    locations: exactLocations(2748, 49, 2748, 71),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrayDeclaration',
    originals: [
      '[\n      adoptOwnedRecording,\n      clearWebAutoStopTimer,\n      discardRecording,\n      restoreOwnedAudioMode,\n      updatePhase,\n    ],',
    ],
    replacements: ['[]'],
    reviewedMutantId: '2287',
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    locations: exactLocations(2856, 5, 2862, 6),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeAudioSessionOwner === null) {'],
    replacements: ['true'],
    reviewedMutantId: '935',
    reason:
      'audioSessionCanBeAcquired plus the awaited global release promise ensures recording start reaches acquisition only with a null owner; Recorder phase and operation currency exclude re-acquiring a session already owned by this instance. The null test is always true.',
    locations: exactLocations(1185, 9, 1185, 41),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {'],
    replacements: ['true'],
    reviewedMutantId: '957',
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    locations: exactLocations(1210, 13, 1210, 71),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'OptionalChaining',
    originals: ['resolveRelease?.();'],
    replacements: ['resolveRelease()'],
    reviewedMutantId: '960',
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    locations: exactLocations(1215, 11, 1215, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;',
    ],
    replacements: ['true'],
    reviewedMutantId: '962',
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    locations: exactLocations(1219, 11, 1219, 53),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['operationOwnerRef.current !== null,'],
    replacements: ['false'],
    reviewedMutantId: '1006',
    reason:
      'operationOwnerRef is non-null only while the in-flight set is non-empty. Ordinary begin is already rejected by the count and superseding begin ignores both checks, so the owner boolean cannot independently decide admission.',
    locations: exactLocations(1297, 11, 1297, 45),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      '!canResumeRecorderOperation(\n          operationOwnerRef.current !== null,\n          operationsInFlightRef.current.has(token),\n          operationsInFlightRef.current.size,\n        )',
    ],
    replacements: ['false'],
    reviewedMutantId: '1015',
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    locations: exactLocations(1315, 9, 1319, 10),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['operationOwnerRef.current !== null,'],
    replacements: ['false'],
    reviewedMutantId: '1017',
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    locations: exactLocations(1316, 11, 1316, 45),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: [') {\n        return false;\n      }'],
    replacements: ['{}'],
    reviewedMutantId: '1019',
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    locations: exactLocations(1320, 9, 1322, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['return false;'],
    replacements: ['true'],
    reviewedMutantId: '1020',
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    locations: exactLocations(1321, 16, 1321, 21),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (operationOwnerRef.current === token) operationOwnerRef.current = null;'],
    replacements: ['true'],
    reviewedMutantId: '1024',
    reason:
      'A stale token can finish only beneath a newer superseding lifecycle token. Clearing ownership early still leaves another in-flight token, so count-based admission remains blocked, the lock remains active, and lifecycle cleanup has no later owner-current read. The defensive identity guard is unobservable.',
    locations: exactLocations(1332, 9, 1332, 44),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setOperationActive(stillActive);'],
    replacements: ['true'],
    reviewedMutantId: '1031',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(1334, 9, 1334, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reviewedMutantId: '1138',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(1447, 9, 1447, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setRecoveryRetryNeeded(true);'],
    replacements: ['true'],
    reviewedMutantId: '1144',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(1477, 11, 1477, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setPreviewPlaying(false);'],
    replacements: ['true'],
    reviewedMutantId: '1154',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(1501, 9, 1501, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setRecoveryRetryNeeded(true);'],
    replacements: ['true'],
    reviewedMutantId: '1411',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(1858, 13, 1858, 31),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setRecoveryRetryNeeded(false);'],
    replacements: ['true'],
    reviewedMutantId: '1471',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(1932, 9, 1932, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setReduceMotion(enabled);'],
    replacements: ['true'],
    reviewedMutantId: '2131',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(2732, 13, 2732, 19),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['active = false;'],
    replacements: ['true'],
    reviewedMutantId: '2135',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(2737, 16, 2737, 21),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reviewedMutantId: '2366',
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    locations: exactLocations(2984, 9, 2984, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ["next === 'uploading' || next === 'recovering' ? monotonicNow() : null;"],
    replacements: ['true'],
    reviewedMutantId: '1129',
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    locations: exactLocations(1446, 7, 1446, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);'],
    replacements: ['true'],
    reviewedMutantId: '2157',
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    locations: exactLocations(2757, 11, 2757, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: ['} catch {\n      return false;\n    }'],
    replacements: ['{}'],
    reviewedMutantId: '1177',
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    locations: exactLocations(1532, 13, 1534, 6),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: ['} catch {\n          return false;\n        }'],
    replacements: ['{}'],
    reviewedMutantId: '1616',
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    locations: exactLocations(2096, 17, 2098, 10),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrowFunction',
    originals: ['const promise = markPendingAssessmentCancelled(requestId).catch(() => false);'],
    replacements: ['() => undefined'],
    reviewedMutantId: '3016',
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    locations: exactLocations(3714, 71, 3714, 82),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (nativeStopPromiseRef.current === promise) {'],
    replacements: ['true'],
    reviewedMutantId: '1209',
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    locations: exactLocations(1578, 11, 1578, 51),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (lifecycleStopPromiseRef.current === promise) {'],
    replacements: ['true'],
    reviewedMutantId: '1307',
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    locations: exactLocations(1737, 11, 1737, 54),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
    ],
    replacements: ['false'],
    reviewedMutantId: '1223',
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    locations: exactLocations(1596, 15, 1596, 86),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
    ],
    replacements: ['settled && completion && completion.takeGeneration !== takeGeneration'],
    reviewedMutantId: '1224',
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    locations: exactLocations(1596, 15, 1596, 86),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
    ],
    replacements: ['false'],
    reviewedMutantId: '1225',
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    locations: exactLocations(1596, 27, 1596, 85),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['settled = true;'],
    replacements: ['false'],
    reviewedMutantId: '1229',
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    locations: exactLocations(1597, 21, 1597, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['suppressRecordingStatusRef.current = true;'],
    replacements: ['false'],
    reviewedMutantId: '1236',
    reason:
      'Prepared-recorder disposal runs under an operation while no recording is adoptable. A terminal callback published without suppression can only bump the status version; the consuming effect rejects it through its phase and operation guards.',
    locations: exactLocations(1616, 42, 1616, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!operationToken) return Promise.resolve();'],
    replacements: ['false'],
    reviewedMutantId: '1266',
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    locations: exactLocations(1669, 9, 1669, 24),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!operationToken) return;'],
    replacements: ['false'],
    reviewedMutantId: '1360',
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    locations: exactLocations(1799, 9, 1799, 24),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const operationToken = beginOperation(false, false);'],
    replacements: ['true'],
    reviewedMutantId: '1356',
    reason:
      'recoverPending calls beginOperation only after operationIsInFlight synchronously proved the owner set empty. With no current owner or token, superseding and ordinary begin have identical admission and ownership effects, so the first false argument is redundant.',
    locations: exactLocations(1798, 43, 1798, 48),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['hasObservedRecordingRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '1304',
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    locations: exactLocations(1725, 41, 1725, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['hasObservedRecordingRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2268',
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    locations: exactLocations(2840, 41, 2840, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['hasObservedRecordingRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2528',
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    locations: exactLocations(3157, 41, 3157, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['hasObservedRecordingRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2584',
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    locations: exactLocations(3213, 41, 3213, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['hasObservedRecordingRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2630',
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    locations: exactLocations(3244, 41, 3244, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['unmountingRef.current = true;'],
    replacements: ['false'],
    reviewedMutantId: '1316',
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    locations: exactLocations(1761, 31, 1761, 35),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '1317',
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    locations: exactLocations(1762, 28, 1762, 33),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2104',
    reason:
      'On unmount, the earlier layout-effect cleanup has already set unmounting true and mounted false before this passive cleanup runs. On a passive-effect dependency refresh, React runs cleanup and the replacement setup together before async continuations, and setup immediately restores mounted true. This duplicate false assignment is never the sole lifecycle guard.',
    locations: exactLocations(2702, 28, 2702, 33),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentRecorderRef.current === recorder;'],
    replacements: ['true'],
    reviewedMutantId: '1324',
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    locations: exactLocations(1771, 7, 1771, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentRecorderRef.current === recorder &&'],
    replacements: ['true'],
    reviewedMutantId: '2562',
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    locations: exactLocations(3185, 7, 3185, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentRecorderRef.current === recorder &&'],
    replacements: ['true'],
    reviewedMutantId: '2682',
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    locations: exactLocations(3313, 7, 3313, 46),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (phaseRef.current === 'recovering' && mountedRef.current) {"],
    replacements: ['true'],
    reviewedMutantId: '1337',
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    locations: exactLocations(1773, 11, 1773, 44),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (phaseRef.current === 'recovering' && mountedRef.current) {"],
    replacements: ['true'],
    reviewedMutantId: '1334',
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    locations: exactLocations(1773, 11, 1773, 66),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: ["if (phaseRef.current === 'recovering' && mountedRef.current) {"],
    replacements: ["phaseRef.current === 'recovering' || mountedRef.current"],
    reviewedMutantId: '1336',
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    locations: exactLocations(1773, 11, 1773, 66),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['uploadControllerRef.current !== null,'],
    replacements: ['false'],
    reviewedMutantId: '1349',
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    locations: exactLocations(1782, 9, 1782, 45),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['uploadControllerRef.current !== null,'],
    replacements: ['false'],
    reviewedMutantId: '1389',
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    locations: exactLocations(1827, 9, 1827, 45),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['uploadControllerRef.current !== null,'],
    replacements: ['false'],
    reviewedMutantId: '1397',
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    locations: exactLocations(1843, 11, 1843, 47),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['uploadControllerRef.current !== null,'],
    replacements: ['false'],
    reviewedMutantId: '1467',
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    locations: exactLocations(1913, 11, 1913, 47),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;',
    ],
    replacements: ['true'],
    reviewedMutantId: '1363',
    reason:
      'No second recovery attempt can start while this loading operation token remains in flight. The attempt ref is therefore this exact symbol or already null from invalidation, and assigning null unconditionally cannot clear a newer attempt.',
    locations: exactLocations(1804, 11, 1804, 57),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
    ],
    replacements: ['true'],
    reviewedMutantId: '1380',
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    locations: exactLocations(1822, 66, 1822, 100),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;'],
    replacements: ['true'],
    reviewedMutantId: '1460',
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    locations: exactLocations(1908, 41, 1908, 75),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (pending === null) {'],
    replacements: ['false'],
    reviewedMutantId: '1415',
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    locations: exactLocations(1865, 9, 1865, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: ['if (pending === null) {\n      finishLoading();\n      return;\n    }'],
    replacements: ['{}'],
    reviewedMutantId: '1417',
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    locations: exactLocations(1865, 27, 1868, 6),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['recoveryGenerationRef.current === generation,'],
    replacements: ['true'],
    reviewedMutantId: '1476',
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    locations: exactLocations(1936, 9, 1936, 53),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeRecoveryOwner === instanceId,'],
    replacements: ['true'],
    reviewedMutantId: '1479',
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    locations: exactLocations(1938, 9, 1938, 43),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!isCurrent()) return;'],
    replacements: ['false'],
    reviewedMutantId: '1504',
    reason:
      'canContinueRecoveryLoad already proved operation and lifecycle currency, and the reconcile-stage callback is reached without an intervening await. Callback re-entry is followed immediately by the separate post-callback isCurrent guard before effects.',
    locations: exactLocations(1959, 13, 1959, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!isCurrent()) return;'],
    replacements: ['false'],
    reviewedMutantId: '1541',
    reason:
      'The validated prepared-stage path reaches this check without an await or re-entry. releaseUnclaimedHandoff then performs the sole await and immediately rechecks isCurrent before publishing, so the outer guard is redundant.',
    locations: exactLocations(1987, 13, 1987, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (!isCurrent()) return false;'],
    replacements: ['true'],
    reviewedMutantId: '1594',
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    locations: exactLocations(2076, 36, 2076, 41),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (!isCurrent()) return false;'],
    replacements: ['true'],
    reviewedMutantId: '1613',
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    locations: exactLocations(2085, 36, 2085, 41),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (isCurrent()) {'],
    replacements: ['true'],
    reviewedMutantId: '1879',
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    locations: exactLocations(2314, 25, 2314, 36),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!isCurrent()) return;'],
    replacements: ['false'],
    reviewedMutantId: '1950',
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    locations: exactLocations(2192, 17, 2192, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["userMessageForError(retryError, translate('recorder.errRejected')),"],
    replacements: ['""'],
    reviewedMutantId: '1957',
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    locations: exactLocations(2459, 63, 2459, 85),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["userMessageForError(retryError, translate('recorder.errNotSent')),"],
    replacements: ['""'],
    reviewedMutantId: '1962',
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    locations: exactLocations(2467, 63, 2467, 84),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (identityMatches && mountedRef.current && focusedRef.current) {'],
    replacements: ['true'],
    reviewedMutantId: '2062',
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    locations: exactLocations(2674, 17, 2674, 54),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (identityMatches && mountedRef.current && focusedRef.current) {'],
    replacements: ['identityMatches || mountedRef.current'],
    reviewedMutantId: '2063',
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    locations: exactLocations(2674, 17, 2674, 54),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (phase !== 'recorded') releasePreviewPlayer();"],
    replacements: ['true'],
    reviewedMutantId: '2138',
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    locations: exactLocations(2745, 9, 2745, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["if (phase !== 'recorded') releasePreviewPlayer();"],
    replacements: ['""'],
    reviewedMutantId: '2141',
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    locations: exactLocations(2745, 19, 2745, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (announcedPhaseRef.current === phase) return;'],
    replacements: ['false'],
    reviewedMutantId: '2192',
    reason:
      'The effect depends only on phase, so React never reruns it with an unchanged phase. The ref is assigned on every run, making the equality early return unreachable.',
    locations: exactLocations(2787, 9, 2787, 44),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['pulseSteps.length !== 2 ||'],
    replacements: ['false'],
    reviewedMutantId: '2240',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2813, 7, 2813, 30),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
    ],
    replacements: ['false'],
    reviewedMutantId: '2238',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2813, 7, 2820, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
    ],
    replacements: [
      'pulseSteps.length !== 2 && pulseSteps.some(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
    ],
    reviewedMutantId: '2239',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2813, 7, 2820, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'MethodExpression',
    originals: [
      'pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
    ],
    replacements: [
      'pulseSteps.every(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
    ],
    reviewedMutantId: '2242',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2814, 7, 2820, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ArrowFunction',
    originals: [
      '(step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
    ],
    replacements: ['() => undefined'],
    reviewedMutantId: '2243',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2815, 9, 2819, 40),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||'],
    replacements: ['false'],
    reviewedMutantId: '2249',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2816, 11, 2817, 42),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: ['!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||'],
    replacements: ['!Number.isFinite(step.toValue) && !Number.isFinite(step.duration)'],
    reviewedMutantId: '2250',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2816, 11, 2817, 42),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
    ],
    replacements: ['false'],
    reviewedMutantId: '2247',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2816, 11, 2818, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
    ],
    replacements: [
      '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration)) && step.duration <= 0',
    ],
    reviewedMutantId: '2248',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2816, 11, 2818, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
    ],
    replacements: ['false'],
    reviewedMutantId: '2245',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2816, 11, 2819, 40),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
    ],
    replacements: [
      '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0) && step.useNativeDriver !== true',
    ],
    reviewedMutantId: '2246',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2816, 11, 2819, 40),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['step.duration <= 0 ||'],
    replacements: ['false'],
    reviewedMutantId: '2253',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2818, 11, 2818, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'EqualityOperator',
    originals: ['step.duration <= 0 ||'],
    replacements: ['step.duration < 0'],
    reviewedMutantId: '2254',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2818, 11, 2818, 29),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['step.useNativeDriver !== true,'],
    replacements: ['false'],
    reviewedMutantId: '2256',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2819, 11, 2819, 40),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: [') {\n      pulse.setValue(1);\n      return;\n    }'],
    replacements: ['{}'],
    reviewedMutantId: '2259',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2821, 7, 2824, 6),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (animations.length === 0) {'],
    replacements: ['false'],
    reviewedMutantId: '2262',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2826, 9, 2826, 32),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: ['if (animations.length === 0) {\n      pulse.setValue(1);\n      return;\n    }'],
    replacements: ['{}'],
    reviewedMutantId: '2264',
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    locations: exactLocations(2826, 34, 2829, 6),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;'],
    replacements: ['true'],
    reviewedMutantId: '2316',
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    locations: exactLocations(2918, 11, 2918, 38),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
    ],
    replacements: ['true'],
    reviewedMutantId: '2564',
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    locations: exactLocations(3188, 29, 3188, 56),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['lifecycleEpoch === lifecycleEpochRef.current,'],
    replacements: ['true'],
    reviewedMutantId: '2353',
    reason:
      'Every lifecycle epoch change first installs a superseding operation token. Current operation-token currency therefore already proves the captured epoch equals the live epoch, making this equality operand redundant.',
    locations: exactLocations(2967, 9, 2967, 53),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (prompted) {'],
    replacements: ['true'],
    reviewedMutantId: '2400',
    reason:
      'When no prompt was required, response is the current permission and app context is already active; the extra foreground wait resolves immediately and adopting the same epoch is a no-op. When prompted, the original branch already runs.',
    locations: exactLocations(3006, 11, 3006, 19),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {'],
    replacements: ['false'],
    reviewedMutantId: '2406',
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    locations: exactLocations(3009, 13, 3009, 56),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {'],
    replacements: ['!identityIsCurrent() && !mountedRef.current'],
    reviewedMutantId: '2407',
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    locations: exactLocations(3009, 13, 3009, 56),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!isCurrentLifecycle()) return;'],
    replacements: ['false'],
    reviewedMutantId: '2428',
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    locations: exactLocations(3025, 11, 3025, 32),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reviewedMutantId: '2433',
    reason:
      'isCurrentLifecycle was checked immediately before this denied-permission branch and includes recorderContextIsActive, which proves mountedRef.current. The nested mounted condition is always true.',
    locations: exactLocations(3027, 13, 3027, 31),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['await restoreOwnedAudioMode(false);'],
    replacements: ['true'],
    reviewedMutantId: '2479',
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    locations: exactLocations(3089, 37, 3089, 42),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['await restoreOwnedAudioMode(false);'],
    replacements: ['true'],
    reviewedMutantId: '2487',
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    locations: exactLocations(3105, 37, 3105, 42),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);'],
    replacements: ['false'],
    reviewedMutantId: '2501',
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    locations: exactLocations(3124, 11, 3124, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);'],
    replacements: ['true'],
    reviewedMutantId: '2500',
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    locations: exactLocations(3124, 11, 3124, 27),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['prepared = false;'],
    replacements: ['true'],
    reviewedMutantId: '2511',
    reason:
      'After record succeeds, the remaining statements are non-throwing ref and Set updates plus guarded phase publication; the catch cannot observe prepared again. Its reset value is dead.',
    locations: exactLocations(3138, 18, 3138, 23),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');",
    ],
    replacements: ['true'],
    reviewedMutantId: '2536',
    reason:
      'Start cleanup preserves the prior active URI whenever it is non-null, so activeUriRef equals previousUri in every recorded fallback case. If both are null, forcing only the equality true still leaves the trailing previousUri falsy and selects idle. The phase result is unchanged.',
    locations: exactLocations(3161, 21, 3161, 57),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["const stopRecording = async (reason: 'user' | 'auto' = 'user') => {"],
    replacements: ['""'],
    reviewedMutantId: '2545',
    reason:
      'The stop reason is used only to distinguish the literal auto value. Every other value follows the user-stop path, so an empty string and the user default are behaviorally identical.',
    locations: exactLocations(3173, 58, 3173, 64),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId) &&',
    ],
    replacements: [
      'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId)',
    ],
    reviewedMutantId: '2561',
    reason:
      'Every owner, endpoint, question, cycle, or recorder replacement synchronously supersedes the lifecycle operation. A current token therefore implies the assessment identity still matches, while the following recorder/context fences reject stale lifecycle work.',
    locations: exactLocations(3183, 7, 3184, 93),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId) &&',
    ],
    replacements: [
      'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId)',
    ],
    reviewedMutantId: '2681',
    reason:
      'Every owner, endpoint, question, cycle, or recorder replacement synchronously supersedes the lifecycle operation. A current token therefore implies the assessment identity still matches, while the following recorder/context fences reject stale lifecycle work.',
    locations: exactLocations(3311, 7, 3312, 93),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);'],
    replacements: ['true'],
    reviewedMutantId: '2588',
    reason:
      'completedTakeIsValid receives the URI separately and rejects null before considering fileIsUsable. Forcing the preceding URI non-null operand true cannot make a null completion valid.',
    locations: exactLocations(3214, 28, 3214, 40),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!uri) {'],
    replacements: ['false'],
    reviewedMutantId: '2665',
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    locations: exactLocations(3293, 9, 3293, 13),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: [
      "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      endOperation(operationToken);\n      return;\n    }",
    ],
    replacements: ['{}'],
    reviewedMutantId: '2666',
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    locations: exactLocations(3293, 15, 3298, 6),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["updatePhase('idle');"],
    replacements: ['""'],
    reviewedMutantId: '2667',
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    locations: exactLocations(3294, 19, 3294, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["callbacksRef.current.onError(translate('recorder.errNoRecording'));"],
    replacements: ['""'],
    reviewedMutantId: '2668',
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    locations: exactLocations(3295, 46, 3295, 71),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!uri) return;'],
    replacements: ['false'],
    reviewedMutantId: '3122',
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    locations: exactLocations(3824, 11, 3824, 15),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
    ],
    replacements: [
      "controller.signal.reason && new DOMException('The operation was aborted.', 'AbortError')",
    ],
    reviewedMutantId: '2688',
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    locations: exactLocations(3320, 11, 3320, 99),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: [
      "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
    ],
    replacements: ['""'],
    reviewedMutantId: '2689',
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    locations: exactLocations(3320, 56, 3320, 84),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: [
      "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
    ],
    replacements: ['""'],
    reviewedMutantId: '2690',
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    locations: exactLocations(3320, 86, 3320, 98),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The operation was aborted.', 'AbortError');"],
    replacements: ['""'],
    reviewedMutantId: '2828',
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    locations: exactLocations(3498, 32, 3498, 60),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The operation was aborted.', 'AbortError');"],
    replacements: ['""'],
    reviewedMutantId: '2829',
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    locations: exactLocations(3498, 62, 3498, 74),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: ['throw lastCapacityError ?? new Error();'],
    replacements: ['lastCapacityError && new Error()'],
    reviewedMutantId: '2779',
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    locations: exactLocations(3455, 15, 3455, 47),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (cancelPersistence) await cancelPersistence.promise;'],
    replacements: ['true'],
    reviewedMutantId: '2826',
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    locations: exactLocations(3497, 13, 3497, 30),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: [
      'const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;',
    ],
    replacements: ['true'],
    reviewedMutantId: '2877',
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    locations: exactLocations(3548, 86, 3548, 91),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['cancelRequestedRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2878',
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    locations: exactLocations(3549, 40, 3549, 45),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['cancelRequestedRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2890',
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    locations: exactLocations(3566, 38, 3566, 43),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const cleared = requestId ? await clearRequestTracking(requestId) : true;'],
    replacements: ['false'],
    reviewedMutantId: '2889',
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    locations: exactLocations(3565, 77, 3565, 81),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (requestId) {'],
    replacements: ['true'],
    reviewedMutantId: '2954',
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    locations: exactLocations(3578, 13, 3578, 22),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (uploadControllerRef.current === controller) {'],
    replacements: ['true'],
    reviewedMutantId: '2969',
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    locations: exactLocations(3654, 11, 3654, 53),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (startIsBlocked()) return Promise.resolve();'],
    replacements: ['false'],
    reviewedMutantId: '2993',
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    locations: exactLocations(3687, 9, 3687, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!controller) return;'],
    replacements: ['false'],
    reviewedMutantId: '3008',
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    locations: exactLocations(3708, 9, 3708, 20),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: [
      '} catch {\n        // The rewind owner releases the player and reports the failure once.\n        return;\n      } finally {',
    ],
    replacements: ['{}'],
    reviewedMutantId: '3103',
    reason:
      'The rewind promise owner handles rejection by releasing the player and reporting once. After finally clears the request flag, the following identity and playability guard returns, so this duplicate catch return has no effect.',
    locations: exactLocations(3802, 15, 3805, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['previewPlayerRef.current !== null,'],
    replacements: ['true'],
    reviewedMutantId: '3112',
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    locations: exactLocations(3813, 11, 3813, 44),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BlockStatement',
    originals: [
      "} catch {\n        callbacksRef.current.onError(translate('recorder.errPlayFailed'));\n        return;\n      }",
    ],
    replacements: ['{}'],
    reviewedMutantId: '3124',
    reason:
      'If createAudioPlayer throws, continuing reaches addListener on the unset local; the second catch performs best-effort cleanup and emits the same single play-failed callback. The two paths converge.',
    locations: exactLocations(3828, 15, 3831, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (previewPlayerRef.current === player) {'],
    replacements: ['true'],
    reviewedMutantId: '3143',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3848, 17, 3848, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['previewRewindPromiseRef.current === rewind &&'],
    replacements: ['true'],
    reviewedMutantId: '3157',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3863, 17, 3863, 59),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'previewRewindPromiseRef.current === rewind &&\n                previewPlayerRef.current === player',
    ],
    replacements: [
      'previewRewindPromiseRef.current === rewind || previewPlayerRef.current === player',
    ],
    reviewedMutantId: '3156',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3863, 17, 3864, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['previewPlayerRef.current === player'],
    replacements: ['true'],
    reviewedMutantId: '3159',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3864, 17, 3864, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!player) return;'],
    replacements: ['false'],
    reviewedMutantId: '3175',
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    locations: exactLocations(3888, 9, 3888, 16),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [loadFailed, setLoadFailed] = useState(false);'],
    replacements: ['true'],
    reviewedMutantId: '4',
    reason:
      'The first committed focused effect resets loadFailed to false before any awaited activation can publish success or failure, so the initial seed cannot survive into an actionable placement state.',
    locations: exactLocations(27, 48, 27, 53),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(false);'],
    replacements: ['true'],
    reviewedMutantId: '23',
    reason:
      'While mounted active is true; after cleanup the extra setter targets a detached component instance and React discards it without a visible effect.',
    locations: exactLocations(66, 11, 66, 17),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'StringLiteral',
    originals: ["const unitId = adUnitIdFor('historyNative');"],
    replacements: ['""'],
    reviewedMutantId: '33',
    reason:
      "adUnitIdFor is a closed binary selector: only 'homeBanner' selects the Home key, so every other value selects the same History key.",
    locations: exactLocations(79, 34, 79, 49),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!native || !unitId) {'],
    replacements: ['false'],
    reviewedMutantId: '35',
    reason:
      'A true history activation has just required the same cached native module and validated unit ID; neither can disappear in production before these synchronous reads.',
    locations: exactLocations(80, 11, 80, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!native || !unitId) {'],
    replacements: ['!native && !unitId'],
    reviewedMutantId: '36',
    reason:
      'Both operands are false after a successful provider activation, so OR and AND produce the same result.',
    locations: exactLocations(80, 11, 80, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'BlockStatement',
    originals: [
      'if (!native || !unitId) {\n        if (active) setLoadFailed(true);\n        return;\n      }',
    ],
    replacements: ['{}'],
    reviewedMutantId: '39',
    reason:
      'A true activation has synchronously cached the native module and validated the same History unit ID; neither can disappear before these reads, so this defensive block is unreachable.',
    locations: exactLocations(80, 31, 83, 8),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['true'],
    reviewedMutantId: '40',
    reason:
      'This statement is inside the unreachable post-activation capability fallback, so changing its nested active guard cannot alter behavior.',
    locations: exactLocations(81, 13, 81, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['false'],
    reviewedMutantId: '41',
    reason:
      'This statement is inside the unreachable post-activation capability fallback, so changing its nested active guard cannot alter behavior.',
    locations: exactLocations(81, 13, 81, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['false'],
    reviewedMutantId: '42',
    reason:
      'This setter is inside the unreachable post-activation capability fallback, so changing its assigned value cannot alter behavior.',
    locations: exactLocations(81, 35, 81, 39),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['true'],
    reviewedMutantId: '50',
    reason:
      'While mounted active is true; after cleanup the extra failure setter targets a detached component instance and React discards it without a visible effect.',
    locations: exactLocations(96, 13, 96, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!native) return null;'],
    replacements: ['false'],
    reviewedMutantId: '83',
    reason:
      'nativeAd is assigned only after reading a non-null cached native module; production has no cache-reset operation between that assignment and render.',
    locations: exactLocations(140, 7, 140, 14),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setValidatedForFocus(ready);'],
    replacements: ['true'],
    reviewedMutantId: '129',
    reason:
      'While mounted the latch is true; after cleanup the continuation can only target a detached component instance, whose state update React 19 discards without a visible effect.',
    locations: exactLocations(40, 11, 40, 17),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'BlockStatement',
    originals: ['return () => {\n      active = false;\n    };'],
    replacements: ['{}'],
    reviewedMutantId: '131',
    reason:
      'Removing this cleanup only permits the same post-unmount update to a detached component; it cannot validate the newly mounted focus-cycle instance.',
    locations: exactLocations(42, 18, 44, 6),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'BooleanLiteral',
    originals: ['active = false;'],
    replacements: ['true'],
    reviewedMutantId: '132',
    reason:
      'Leaving the detached instance latch true has the same unobservable post-unmount state-update behavior as removing its cleanup block.',
    locations: exactLocations(43, 16, 43, 21),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'ConditionalExpression',
    originals: ['setMeasuredSlotWidth((current) => (current === measured ? current : measured));'],
    replacements: ['false'],
    reviewedMutantId: '159',
    reason:
      'When current equals measured, returning measured is the same primitive value as returning current; when unequal, both the original and mutant return measured.',
    locations: exactLocations(59, 46, 59, 66),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ObjectLiteral',
    originals: ['}>({ promise: null });'],
    replacements: ['{}'],
    reason:
      'The policy promise slot is only truthiness-tested before its first assignment, making an initial undefined value indistinguishable from null.',
    locations: exactLocations(124, 6, 124, 23),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],', '}, []);'],
    replacements: ['["Stryker was here"]'],
    count: 3,
    reason:
      'Each dependency array receives one constant primitive instead of an empty array; the value compares equal on every render, preserving callback identity and lifetime.',
    locations: exactLocations(135, 5, 135, 7, 148, 6, 148, 8, 168, 6, 168, 8),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ArrowFunction',
    originals: [
      '.catch(() => null)',
      'const gdprApplies = await ads.AdsConsent.getGdprApplies().catch(() => null);',
      'const choices = await ads.AdsConsent.getUserChoices().catch(() => null);',
      'consent = await ads.AdsConsent.getConsentInfo().catch(() => null);',
    ],
    replacements: ['() => undefined'],
    count: 4,
    reason:
      'These failure fallbacks are consumed only through falsiness, optional access, or a later nullish check; null and undefined take the same fail-closed path.',
    locations: exactLocations(
      143,
      14,
      143,
      24,
      151,
      69,
      151,
      79,
      156,
      67,
      156,
      77,
      181,
      67,
      181,
      77,
    ),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!ads) return false;', 'if (!consent) return false;'],
    replacements: ['false'],
    count: 3,
    reason:
      'Removing any of these null guards only moves the null dereference into its enclosing try/catch, which returns the same false result before a publishable side effect.',
    locations: exactLocations(175, 13, 175, 17, 184, 15, 184, 23, 243, 9, 243, 13),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (expectedConsentEpoch !== consentEpochRef.current) return false;'],
    replacements: ['true'],
    count: 2,
    reason:
      'These returns occur only after privacy invalidation changed both the consent epoch and placement token; every activation consumer rejects itself regardless of the stale promise value.',
    locations: exactLocations(183, 72, 183, 77, 191, 72, 191, 77),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!ready && initializationPromiseRef.current === initialization) {'],
    replacements: ['true'],
    reason:
      'No newer initialization can be installed before the old promise settles: a privacy transition clears the slot and waits for that old promise before permitting new initialization.',
    locations: exactLocations(200, 23, 200, 74),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[updateConsentRequestMode],', '[initializeSdk, loadPolicy],'],
    replacements: ['[]'],
    count: 2,
    reason:
      'All removed dependencies are useCallback values with permanent identities, so the dependent callback is recreated on exactly the same renders.',
    locations: exactLocations(206, 5, 206, 31, 237, 5, 237, 32),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ArithmeticOperator',
    originals: ['const activationToken = activationTokensRef.current[placement] + 1;'],
    replacements: ['activationTokensRef.current[placement] - 1'],
    reason:
      'Activation tokens are compared only for exact identity; changing direction still creates one distinct token and the consent epoch independently fences privacy transitions.',
    locations: exactLocations(211, 31, 211, 73),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ConditionalExpression',
    originals: ['consentEpochRef.current === consentEpoch;'],
    replacements: ['true'],
    reason:
      'Every consent-epoch change synchronously advances both placement tokens, so the sibling token equality already makes the activation stale.',
    locations: exactLocations(216, 9, 216, 49),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ArrowFunction',
    originals: ['const transitionAllowsAds = await privacyTransition.catch(() => false);'],
    replacements: ['() => undefined'],
    reason:
      'A rejected privacy transition treats this fallback only as a falsy allow/deny value; false and undefined both block activation.',
    locations: exactLocations(222, 67, 222, 78),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'AssignmentOperator',
    originals: ['consentEpochRef.current += 1;'],
    replacements: ['consentEpochRef.current -= 1'],
    reason:
      'The consent epoch is an equality-only generation token; either operation changes its identity.',
    locations: exactLocations(251, 7, 251, 35),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'AssignmentOperator',
    originals: ['activationTokensRef.current.homeBanner += 1;'],
    replacements: ['activationTokensRef.current.homeBanner -= 1'],
    reason:
      'The Home activation token is equality-only; either direction invalidates every captured token.',
    locations: exactLocations(252, 7, 252, 50),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'AssignmentOperator',
    originals: ['activationTokensRef.current.historyNative += 1;'],
    replacements: ['activationTokensRef.current.historyNative -= 1'],
    reason:
      'The History activation token is equality-only; either direction invalidates every captured token.',
    locations: exactLocations(253, 7, 253, 53),
  },
  {
    file: 'src/app/(tabs)/recordings.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const queuedOlderRef = useRef(false);'],
    replacements: ['true'],
    reviewedMutantId: '73',
    reason:
      'The mount effect overwrites this seed with false before a rendered list can expose any paging handler, including after the Strict Effects setup/cleanup/setup probe.',
    locations: exactLocations(128, 33, 128, 38),
  },
  {
    file: 'src/app/(tabs)/recordings.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '85',
    reason:
      'Both dependency literals contain values that stay Object.is-equal for the component lifetime, so the mount cleanup cadence is identical.',
    locations: exactLocations(143, 6, 143, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'StringLiteral',
    originals: ["const [phase, setPhase] = useState<PlaybackPhase>('idle');"],
    replacements: ['""'],
    reviewedMutantId: '334',
    reason:
      "The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
    locations: exactLocations(184, 53, 184, 59),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ConditionalExpression',
    originals: ["const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');"],
    replacements: ['true'],
    reviewedMutantId: '336',
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison true is unobservable.',
    locations: exactLocations(214, 41, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ConditionalExpression',
    originals: ["const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');"],
    replacements: ['false'],
    reviewedMutantId: '337',
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison false is unobservable.',
    locations: exactLocations(214, 41, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'EqualityOperator',
    originals: ["const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');"],
    replacements: ["recordingStatus !== 'unavailable'"],
    reviewedMutantId: '338',
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so reversing the comparison is unobservable.',
    locations: exactLocations(214, 41, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'StringLiteral',
    originals: ["const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');"],
    replacements: ['""'],
    reviewedMutantId: '339',
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so changing the compared literal is unobservable.',
    locations: exactLocations(214, 61, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '373',
    reason:
      'cancelDelete receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(241, 6, 241, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'OptionalChaining',
    originals: ['playerListenerRef.current?.remove();'],
    replacements: ['playerListenerRef.current.remove'],
    reviewedMutantId: '399',
    reason:
      'When the listener is null the direct dereference throws inside the surrounding best-effort catch; both forms then clear the ref and continue through identical player cleanup.',
    locations: exactLocations(269, 7, 269, 40),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'OptionalChaining',
    originals: ['player?.pause();'],
    replacements: ['player.pause'],
    reviewedMutantId: '401',
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; all following release state is identical.',
    locations: exactLocations(277, 7, 277, 20),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'OptionalChaining',
    originals: ['player?.remove();'],
    replacements: ['player.remove'],
    reviewedMutantId: '403',
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; owner release and ref cleanup are unchanged.',
    locations: exactLocations(282, 7, 282, 21),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [clearPlaybackPrepareTimer]);'],
    replacements: ['[]'],
    reviewedMutantId: '406',
    reason:
      'clearPlaybackPrepareTimer is an empty-dependency callback with stable identity, so removing it from releasePlayer dependencies cannot stale the callback.',
    locations: exactLocations(291, 6, 291, 33),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current !== true) return;'],
    replacements: ['false'],
    reviewedMutantId: '409',
    reason:
      'The only added reset calls target an already detached component after layout cleanup; React discards those state setters, while every mounted call already passes the guard.',
    locations: exactLocations(294, 9, 294, 36),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reviewedMutantId: '413',
    reason:
      'resetPlaybackUi receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(298, 6, 298, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [releasePlayer, resetPlaybackUi]);'],
    replacements: ['[]'],
    reviewedMutantId: '415',
    reason:
      'Both dependencies are empty-dependency callbacks with permanently stable identities, so omitting them cannot change stopPlayback.',
    locations: exactLocations(303, 6, 303, 38),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [cancelDelete, cancelShare, releasePlayer]);'],
    replacements: ['[]'],
    reviewedMutantId: '420',
    reason:
      'cancelDelete, cancelShare, and releasePlayer all retain stable callback identities, so removing them does not alter layout cleanup cadence.',
    locations: exactLocations(313, 6, 313, 48),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [cancelDelete, cancelShare, stopPlayback]),'],
    replacements: ['[]'],
    reviewedMutantId: '445',
    reason:
      'cancelDelete, cancelShare, and stopPlayback all retain stable callback identities, so removing them does not alter focus setup or cleanup.',
    locations: exactLocations(352, 8, 352, 49),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [cancelDelete, cancelShare, stopPlayback]);'],
    replacements: ['[]'],
    reviewedMutantId: '458',
    reason:
      'cancelDelete, cancelShare, and stopPlayback all retain stable callback identities, so removing them does not alter AppState subscription lifetime.',
    locations: exactLocations(364, 6, 364, 47),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ConditionalExpression',
    originals: ['committedIdentityRef.current === identityToken &&'],
    replacements: ['true'],
    reviewedMutantId: '514',
    reason:
      'After the entry identity fence creates an operation, every identity change synchronously replaces both its operation token and lifecycle symbol; either unchanged guard rejects the same continuations.',
    locations: exactLocations(424, 7, 424, 53),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ConditionalExpression',
    originals: ['committedIdentityRef.current !== expectedIdentity ||'],
    replacements: ['false'],
    reviewedMutantId: '782',
    reason:
      'The destructive callback carries the lifecycle captured with this identity token, and every identity commit replaces that lifecycle synchronously; the adjacent context guard rejects exactly the same stale callback.',
    locations: exactLocations(688, 9, 688, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'committedIdentityRef.current === expectedIdentity && contextIsCurrent(lifecycle);',
    ],
    replacements: ['true'],
    reviewedMutantId: '794',
    reason:
      'The delete operation retains the lifecycle captured with expectedIdentity; an identity change replaces that lifecycle, so contextIsCurrent becomes false on every path where this equality becomes false.',
    locations: exactLocations(704, 9, 704, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    mutator: 'OptionalChaining',
    originals: [
      'void Promise.resolve(onDeletedRef.current?.(recordingId)).catch(() => undefined);',
    ],
    replacements: ['onDeletedRef.current(recordingId)'],
    reviewedMutantId: '822',
    reason:
      'When the optional callback is absent, the direct call throws inside the surrounding try and is swallowed; when present both forms invoke it, so the committed deletion and visible state are identical.',
    locations: exactLocations(721, 32, 721, 67),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The latch re-arms in a useFocusEffect callback that both the real expo-router hook and the test mock execute at mount, before any press event can be dispatched, so the initial true is deterministically overwritten with false. No test can observe the pre-effect ref value because React flushes effects before user events reach the component.',
    locations: exactLocations(60, 39, 60, 44),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useCallback(() => {\n      navigationStartedRef.current = false;\n      return () => undefined;\n    }, []),',
    ],
    replacements: ['{}'],
    reason:
      'The callback body only re-arms the one-navigation latch on (re)focus. With the stable useCallback([]) identity the test mock (useEffect keyed on the callback) runs it exactly once at mount when the ref is already false, so removing the body is indistinguishable: the latch starts false either way and no test can trigger a genuine refocus of the same mounted instance.',
    locations: exactLocations(62, 23, 65, 6),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      "The only dependency is a string literal that compares equal to itself across renders under React's Object.is dependency check, so the useCallback memo is preserved exactly as with [] and the focus effect never re-runs. No rerender can change behavior, making the mutant unobservable.",
    locations: exactLocations(65, 8, 65, 10),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'Effect dependency literals that are stable strings keep the effect from re-running (equal under Object.is), so mountedRef bookkeeping is identical: set true at mount, false at unmount.',
    locations: exactLocations(81, 6, 81, 8),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'Effect dependency literals that are stable strings keep the effect from re-running (equal under Object.is), so mountedRef bookkeeping is identical: set true at mount, false at unmount.',
    locations: exactLocations(107, 6, 107, 8),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'publishNavigationLock is called from exactly two sites: synchronously inside the press handler while mounted, and in the finally block already guarded by `if (mountedRef.current)`. The inner guard is therefore dead code — after an unmount the caller guard prevents the call, and before/during the request mountedRef is true, so forcing the condition false changes nothing any test can observe.',
    locations: exactLocations(83, 9, 83, 28),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'The async finalizer already sits inside an equivalent mountedRef guard at its call site, so weakening this inner early-return cannot publish a navigation lock after unmount.',
    locations: exactLocations(136, 11, 136, 30),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BlockStatement',
    originals: ['return () => {\n      active = false;\n    };'],
    replacements: ['{}'],
    reason:
      'The active flag only suppresses a setSessionNotice state write after unmount; the write would land on a detached fiber and produce no render, error, or mock call a test can inspect. Removing the cleanup is a React-internal post-unmount guard branch, not observable behavior.',
    locations: exactLocations(104, 18, 106, 6),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BooleanLiteral',
    originals: ['active = false;'],
    replacements: ['true'],
    reason:
      'Mutating active to true in the cleanup leaves the flag true, which only permits a setSessionNotice write on an unmounted component whose state write hits a detached fiber. No assertion on rendered output, mocks, or navigation can distinguish it.',
    locations: exactLocations(105, 16, 105, 21),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['email.trim().length <= MAX_EMAIL_LENGTH &&'],
    replacements: ['true'],
    reason:
      'Redundant conjunct in canSubmit: any email over MAX_EMAIL_LENGTH also fails emailAddressError, because isValidEmailAddress enforces the same length bound and the very next conjunct requires emailError === null. Forcing the conjunct true leaves the submit gate truth table unchanged for every input.',
    locations: exactLocations(116, 5, 116, 44),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'When this finally-block guard is false (post-unmount), publishNavigationLock is itself blocked by its own mountedRef guard before navigation.setOptions is reached, and setBusy(false) writes state on a detached fiber. The two existing unmount tests already prove setOptions is not called; forcing the branch true produces no new observable effect.',
    locations: exactLocations(144, 11, 144, 29),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'The useLayoutEffect at mount sets mountedRef.current = true before any effect, event, or assertion can read it, so the initial false is deterministically overwritten. No test can observe the pre-layout-effect ref value.',
    locations: exactLocations(68, 29, 68, 33),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The useFocusEffect callback (executed at mount by both real expo-router and the test mock) resets the latch to false before any press can be dispatched, so the initial true is unobservable.',
    locations: exactLocations(71, 39, 71, 44),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useCallback(() => {\n      navigationStartedRef.current = false;\n      return () => undefined;\n    }, []),',
    ],
    replacements: ['{}'],
    reason:
      'The body only re-arms the navigation latch on refocus; with the stable callback identity the mocked focus effect runs once at mount when the ref is already false. No test can produce a genuine refocus of the same mounted instance, so the emptied body is indistinguishable.',
    locations: exactLocations(73, 23, 76, 6),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'A string-literal dependency array compares equal across renders under Object.is, preserving the useCallback memo exactly as [] does; the focus callback is never recreated and the effect never re-runs. Unobservable.',
    locations: exactLocations(76, 8, 76, 10),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'Stable string deps keep the useLayoutEffect from re-running (equal under Object.is), so mountedRef lifecycle bookkeeping is identical.',
    locations: exactLocations(92, 6, 92, 8),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      "publishNavigationLock's inner mounted guard is dead code: both call sites either run synchronously while mounted (the press handler) or sit behind the finally block's own `if (mountedRef.current)` guard. Forcing the guard false never lets navigation.setOptions run post-unmount.",
    locations: exactLocations(94, 9, 94, 28),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'The async finalizer already sits behind its own `if (mountedRef.current)` guard at the call site, so this inner early-return can never be the deciding fence after unmount.',
    locations: exactLocations(148, 11, 148, 30),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['email.trim().length <= MAX_EMAIL_LENGTH &&'],
    replacements: ['true'],
    reason:
      'Redundant conjunct: an over-length email fails emailAddressError (isValidEmailAddress enforces the same bound), and the next conjunct requires emailError === null, so the canSubmit truth table is unchanged for every input.',
    locations: exactLocations(125, 5, 125, 44),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['confirmPassword.length > 0 &&'],
    replacements: ['true'],
    reason:
      'Redundant conjunct: canSubmit already requires confirmPassword === password while passwordPolicyError(password) === null forces a nonempty password of at least 8 chars, so an empty confirmation can never pass the equality conjunct. Forcing true leaves the gate unchanged.',
    locations: exactLocations(128, 5, 128, 31),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'EqualityOperator',
    originals: ['confirmPassword.length > 0 &&'],
    replacements: ['confirmPassword.length >= 0'],
    reason:
      'Same redundancy as the forced-true variant: the subsequent confirmPassword === password conjunct plus the nonempty-password policy guarantee the confirmation is nonempty whenever canSubmit is true, so >= 0 vs > 0 never decides the gate.',
    locations: exactLocations(128, 5, 128, 31),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      "Forced-true only matters post-unmount, where publishNavigationLock's own mounted guard still blocks navigation.setOptions and setBusy(false) writes to a detached fiber. The existing external-unmount tests prove no setOptions call escapes; nothing else is observable.",
    locations: exactLocations(158, 11, 158, 29),
  },
  {
    file: 'src/app/(auth)/welcome.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The welcome test mock invokes the useFocusEffect callback synchronously on every render including mount, and the real hook runs it on focus, so the latch is reset to false before any press event. The initial true is unobservable.',
    locations: exactLocations(26, 39, 26, 44),
  },
  {
    file: 'src/app/(auth)/welcome.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The test mock calls the focus effect unconditionally on every render regardless of callback identity, and the string-literal deps array preserves the useCallback memo anyway, so neither clean nor mutated code changes how often the latch-reset body runs. Unobservable.',
    locations: exactLocations(31, 8, 31, 10),
  },
  {
    file: 'src/app/(auth)/welcome.tsx',
    mutator: 'ConditionalExpression',
    originals: ["feature.tint === 'primary' && styles.badgePrimary,"],
    replacements: ['true'],
    reason:
      'badgePrimary is the FIRST conditional entry in the badge style array, and every feature also appends its own tint style later (badgeSuccess/badgeAccent), which wins in StyleSheet.flatten for the shared backgroundColor property; for the primary feature the result is identical too. Only flattened styles are observable, so the always-present primary entry is dead weight.',
    locations: exactLocations(86, 17, 86, 43),
  },
  // daily-reminder.ts — getDailyReminderUnsafe never rejects (every await is
  // individually caught and parseDailyReminder is total), so the try/catch
  // around the re-read in refreshDailyReminderLanguage is unreachable defense.
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'BlockStatement',
    originals: ['} catch {\n    return { hour: stored.hour, uiLanguage: language };\n  }'],
    replacements: ['{}'],
    reason:
      'The catch body guards a getDailyReminderUnsafe() rejection that cannot happen: getItemAsync is wrapped in its own catch, JSON.parse in another, and parseDailyReminder is total on object input. Unreachable defensive code; no test can execute it.',
    locations: exactLocations(250, 13, 252, 6),
  },
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'ObjectLiteral',
    originals: ['return { hour: stored.hour, uiLanguage: language };'],
    replacements: ['{}'],
    reason:
      'Same unreachable catch as the BlockStatement pin above: getDailyReminderUnsafe never rejects, so this return statement is dead defensive code.',
    locations: exactLocations(251, 14, 251, 57),
  },
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'BlockStatement',
    originals: ['} catch {\n    return null;\n  }'],
    replacements: ['{}'],
    reason:
      'The mutated catch falls through to return undefined instead of null, but every consumer of getDailyReminderUnsafe only applies a falsy check (!stored in getDailyReminder and refreshDailyReminderLanguage, `if (previous)` in disableDailyReminderUnsafe), and the exported getDailyReminder re-normalizes to null. undefined and null are indistinguishable through every exported path.',
    locations: exactLocations(92, 11, 94, 4),
  },
  {
    file: 'src/lib/daily-reminder.ts',
    mutator: 'BooleanLiteral',
    originals: ['let granted = false;'],
    replacements: ['true'],
    count: 2,
    reason:
      'Dead initializer: granted is read only after `granted = (await notifications().getPermissionsAsync()).granted` unconditionally overwrites it; when the await rejects, the catch returns before granted is ever read. The initial value is never observed.',
    locations: exactLocations(108, 19, 108, 24, 228, 19, 228, 24),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'StringLiteral',
    originals: ["? 'no-profile'"],
    replacements: ['""'],
    reason:
      'The string feeds only the remount key `${sessionVersion}:${placementPhase}`. Under the mutant the no-profile key becomes `${v}:`, which is still distinct from every authenticated key (`${v}:${id}:...`, ids are non-empty), so remount semantics — the only observable behavior — are identical.',
    locations: exactLocations(78, 7, 78, 19),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'EqualityOperator',
    originals: ["user.diagnosticAcknowledged === false ? 'reveal-pending' : 'acknowledged'"],
    replacements: ['user.diagnosticAcknowledged !== false'],
    reason:
      'Pure swap of the two remount-key labels (reveal-pending/acknowledged). The mapping stays injective over the (acknowledged) tuple, so every transition changes or preserves the key exactly as before; the string content is never rendered, asserted, or persisted.',
    locations: exactLocations(80, 9, 80, 46),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'BooleanLiteral',
    originals: ["user.diagnosticAcknowledged === false ? 'reveal-pending' : 'acknowledged'"],
    replacements: ['true'],
    reason:
      'Another injective relabel of the remount-key discriminator (undefined joins false in the else arm under both mappings where it matters). No key collision is possible, so no test can distinguish it through the only observable channel — remount-or-not.',
    locations: exactLocations(80, 41, 80, 46),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'StringLiteral',
    originals: ["user.diagnosticAcknowledged === false ? 'reveal-pending' : 'acknowledged'"],
    replacements: ['""'],
    reason:
      'Injective relabel of the remount-key labels (false->"", true->"acknowledged"): the key still differs exactly when the acknowledged phase differs, and the label text is never observable outside the React key.',
    locations: exactLocations(80, 49, 80, 65),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'StringLiteral',
    originals: ["user.diagnosticAcknowledged === false ? 'reveal-pending' : 'acknowledged'"],
    replacements: ['""'],
    reason:
      'Injective relabel of the remount-key labels (false->"reveal-pending", true->""): identical remount behavior; the label never reaches any output a test can read.',
    locations: exactLocations(80, 68, 80, 82),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'Seed value is unobservable: the mount useLayoutEffect (lines 66-71) synchronously re-assigns mountedRef.current = true before any handler or continuation can run, so no code path ever reads the initial seed.',
    locations: exactLocations(47, 29, 47, 33),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'Seed value is unobservable: the useFocusEffect callback runs after mount and resets navigationStartedRef.current = false before any press can spend the latch, so the initial true is never read.',
    locations: exactLocations(50, 39, 50, 44),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useCallback(() => {\n      navigationStartedRef.current = false;\n      return () => undefined;\n    }, []),',
    ],
    replacements: ['{}'],
    reason:
      'Emptying the focus callback only matters if the latch re-arms after being spent within one mount. The latch starts false, so the first navigation is unaffected, and the mocked router/useFocusEffect in tests never replays a focus transition after the latch is spent (a real refocus requires a back gesture plus refocus the mock environment cannot produce).',
    locations: exactLocations(52, 23, 55, 6),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The callback body reads no reactive values (only a ref write), so changing its identity only re-runs the focus effect, which re-executes the same ref-arms-false assignment already applied at mount; behavior is identical.',
    locations: exactLocations(55, 8, 55, 10),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'useLayoutEffect with a constant (though non-empty) dep array still runs exactly once per mount and once per unmount for the cleanup; the effect only writes mountedRef, so no observable difference exists.',
    locations: exactLocations(71, 6, 71, 8),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'Dead defensive guard: every reachable caller of publishNavigationLock is either a user handler (component mounted) or a finally block already gated on mountedRef.current itself, so the guard is never evaluated while unmounted.',
    locations: exactLocations(73, 9, 73, 28),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['trimmedEmail.length <= MAX_EMAIL_LENGTH &&'],
    replacements: ['true'],
    reason:
      'Dead redundant conjunct: emailAddressError (lib/identity-validation.ts) returns a non-null complaint for any value whose trim is longer than MAX_EMAIL_LENGTH, and canSubmit already requires emailError === null, so the length conjunct can never change the result.',
    locations: exactLocations(92, 5, 92, 44),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'Post-unmount guard only: with the guard forced true, the only new behavior is setState on a detached fiber after external unmount, which React discards (no DOM, no observable output, no navigation/setOptions side effect).',
    locations: exactLocations(112, 11, 112, 29),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "if (mountedRef.current) setError(userMessageForError(err, t('reset.requestFailed')));",
    ],
    replacements: ['true'],
    reason:
      'Post-unmount guard only: forcing it true merely calls setError on a detached fiber after external unmount, which React discards with no observable output.',
    locations: exactLocations(119, 11, 119, 29),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'Post-unmount guard only: with it forced true, publishNavigationLock is still blocked by its own !mountedRef.current guard and setBusy(false) hits a detached fiber; neither is observable after unmount.',
    locations: exactLocations(122, 11, 122, 29),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setSentNoteKey((key) => key + 1);'],
    replacements: ['true'],
    reason:
      'Post-unmount guard only: forcing it true merely calls setSentNoteKey on a detached fiber after external unmount, which React discards with no observable output.',
    locations: exactLocations(142, 11, 142, 29),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "if (mountedRef.current) setError(userMessageForError(err, t('reset.requestFailed')));",
    ],
    replacements: ['true'],
    reason:
      'Post-unmount guard only (resend catch): forcing it true merely calls setError on a detached fiber after external unmount, which React discards with no observable output.',
    locations: exactLocations(144, 11, 144, 29),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'Post-unmount guard only (resend finally): publishNavigationLock remains blocked by its own !mountedRef.current guard and setBusy(false) hits a detached fiber; neither is observable after unmount.',
    locations: exactLocations(147, 11, 147, 29),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'Seed value is unobservable: the mount useLayoutEffect (lines 82-87) synchronously re-assigns mountedRef.current = true before any handler or continuation can run.',
    locations: exactLocations(63, 29, 63, 33),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'Seed value is unobservable: the useFocusEffect callback runs after mount and resets navigationStartedRef.current = false before any press can spend the latch.',
    locations: exactLocations(66, 39, 66, 44),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useCallback(() => {\n      navigationStartedRef.current = false;\n      return () => undefined;\n    }, []),',
    ],
    replacements: ['{}'],
    reason:
      'The latch starts false so the first navigation is unaffected; re-arming after a spent latch needs a refocus within one mount, which the mocked router/useFocusEffect cannot replay.',
    locations: exactLocations(68, 23, 71, 6),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The callback reads no reactive values; a changed identity only re-runs the focus effect, re-applying the same ref-arms-false assignment already applied at mount.',
    locations: exactLocations(71, 8, 71, 10),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'useLayoutEffect with a constant non-empty dep array still runs once per mount plus cleanup once per unmount; the effect only writes mountedRef, so behavior is identical.',
    locations: exactLocations(87, 6, 87, 8),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'Dead defensive guard: publishNavigationLock is only invoked from mounted handlers or finally blocks already gated on mountedRef.current, so the guard is never exercised while unmounted.',
    locations: exactLocations(89, 9, 89, 28),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['trimmedEmail.length <= MAX_EMAIL_LENGTH &&'],
    replacements: ['true'],
    reason:
      'Dead redundant conjunct: emailAddressError returns non-null for any trim longer than MAX_EMAIL_LENGTH and canSubmit already requires emailError === null, so this conjunct never changes the result.',
    locations: exactLocations(112, 5, 112, 44),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['confirmPassword.length > 0 &&'],
    replacements: ['true'],
    reason:
      'Dead redundant conjunct: canSubmit already requires passwordPolicyError(password) === null (so password is non-empty) and confirmPassword === password, which together imply confirmPassword.length > 0.',
    locations: exactLocations(117, 5, 117, 31),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'EqualityOperator',
    originals: ['confirmPassword.length > 0 &&'],
    replacements: ['confirmPassword.length >= 0'],
    reason:
      'Same dead conjunct as above: confirmPassword === password with a policy-passing (non-empty) password already implies length > 0, so >= 0 never changes the gate result.',
    locations: exactLocations(117, 5, 117, 31),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (mountedRef.current) setError(userMessageForError(err, t('cp.failed')));"],
    replacements: ['true'],
    reason:
      'Post-unmount guard only: forcing it true merely calls setError on a detached fiber after external unmount, which React discards with no observable output.',
    locations: exactLocations(138, 11, 138, 29),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'Post-unmount guard only (finally): publishNavigationLock remains blocked by its own !mountedRef.current guard and setBusy(false) hits a detached fiber; neither is observable after unmount.',
    locations: exactLocations(141, 11, 141, 29),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      "inputAction: {\n    flexShrink: 1,\n    maxWidth: '45%',\n    minHeight: layout.minimumTarget,\n    minWidth: layout.minimumTarget,\n    justifyContent: 'center',\n    alignItems: 'center',\n    paddingHorizontal: spacing.sm,\n  },",
    ],
    replacements: ['{}'],
    reason:
      'Dead style: styles.inputAction is never referenced by this screen. The reveal control is the shared PasswordVisibilityToggle component, which brings its own styles; the entry is unreachable from any rendered element.',
    locations: exactLocations(399, 16, 407, 4),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'StringLiteral',
    originals: ["maxWidth: '45%',"],
    replacements: ['""'],
    reason:
      'Dead style value inside styles.inputAction, which no rendered element references (PasswordVisibilityToggle owns the reveal-control styles).',
    locations: exactLocations(401, 15, 401, 20),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'StringLiteral',
    originals: ["justifyContent: 'center',"],
    replacements: ['""'],
    reason: 'Dead style value inside styles.inputAction, which no rendered element references.',
    locations: exactLocations(404, 21, 404, 29),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'StringLiteral',
    originals: ["alignItems: 'center',"],
    replacements: ['""'],
    reason: 'Dead style value inside styles.inputAction, which no rendered element references.',
    locations: exactLocations(405, 17, 405, 25),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      "inputActionText: {\n    flexShrink: 1,\n    color: colors.primary,\n    fontSize: 14,\n    fontWeight: '600',\n    textAlign: 'center',\n  },",
    ],
    replacements: ['{}'],
    reason:
      'Dead style: styles.inputActionText is never referenced by this screen; the reveal control is the shared PasswordVisibilityToggle with its own text styles.',
    locations: exactLocations(408, 20, 414, 4),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'StringLiteral',
    originals: ["fontWeight: '600',"],
    replacements: ['""'],
    reason: 'Dead style value inside styles.inputActionText, which no rendered element references.',
    locations: exactLocations(412, 17, 412, 22),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'StringLiteral',
    originals: ["textAlign: 'center',"],
    replacements: ['""'],
    reason: 'Dead style value inside styles.inputActionText, which no rendered element references.',
    locations: exactLocations(413, 16, 413, 24),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ObjectLiteral',
    originals: ['controlDisabled: {\n    opacity: 0.5,\n  },'],
    replacements: ['{}'],
    reason:
      'Dead style: styles.controlDisabled is never referenced by this screen; PasswordVisibilityToggle and the shared Button own their own disabled dimming, so this entry is unreachable from any rendered element.',
    locations: exactLocations(415, 20, 417, 4),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The useLayoutEffect below sets mountedRef.current = true in the same first commit, before any event handler can run, so the initial seed is unconditionally overwritten before it is ever read; no render, handler, or effect can observe the seed value.',
    locations: exactLocations(56, 29, 56, 34),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      "The dependency array belongs to the mountedRef layout effect, whose deps are constant for the component's lifetime: with either literal the effect still runs exactly once on mount and its cleanup once on unmount, so no observable behavior can differ.",
    locations: exactLocations(63, 6, 63, 8),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      "Removing the early return only lets the post-await success branch call setSaved/announce on a screen that has unmounted; React drops state writes to detached fibers with no rendered output, and the finally block's own mountedRef guard (line 138, unmutated) is what actually suppresses navigation option writes. The existing unmount tests already assert the observable side effects stay silent, and setSaved itself is unobservable once unmounted.",
    locations: exactLocations(124, 11, 124, 30),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      "Same detached-fiber argument for the catch branch: after unmount the setError write hits a detached fiber and renders nothing, and the finally block's own mountedRef guard still suppresses navigation options and busy-state writes. No test can observe an unmounted screen rendering an error string.",
    locations: exactLocations(130, 11, 130, 30),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'OptionalChaining',
    originals: ['onSubmitEditing={() => newPasswordRef.current?.focus()}'],
    replacements: ['newPasswordRef.current.focus'],
    reason:
      'All three inputs mount in the same commit, so newPasswordRef.current is attached before the current field can ever receive an onSubmitEditing event; in the jest RN preset TextInput mocks as a class component whose ref is always the non-null instance. The optional-chaining guard is unreachable-defensive and no test can drive a null ref here without forking the preset mock.',
    locations: exactLocations(200, 38, 200, 67),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'OptionalChaining',
    originals: ['onSubmitEditing={() => confirmPasswordRef.current?.focus()}'],
    replacements: ['confirmPasswordRef.current.focus'],
    reason:
      'Identical unreachable-defensive chaining: the confirmation input mounts in the same commit as the new-password input, so confirmPasswordRef.current is never null when onSubmitEditing can fire, and the mocked class TextInput always yields a non-null ref instance under jest.',
    locations: exactLocations(234, 38, 234, 71),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'StringLiteral',
    originals: ["onChangeText={(value) => handleFieldEdit('confirm', value)}"],
    replacements: ['""'],
    reason:
      "handleFieldEdit's branch chain ends in an unguarded else that sets the confirm password: with field === '' the 'current' and 'next' conditions are false and the else performs exactly the setConfirmPassword(value) + setError(null) sequence the 'confirm' label performs, so runtime behavior is byte-identical.",
    locations: exactLocations(263, 56, 263, 65),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) setError(err.message);'],
    replacements: ['true'],
    reason:
      "The guard only skips an setError when the screen has already unmounted (the AccountDeletionUnconfirmedError continuation after an await); a state write on a detached fiber produces no rendered output and no navigation option writes, and the finally block's own mountedRef guard (line 104, unmutated) still suppresses everything observable. No test can observe an unmounted screen rendering this message.",
    locations: exactLocations(98, 13, 98, 31),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      "  inputAction: {\n    flexShrink: 1,\n    maxWidth: '45%',\n    minHeight: layout.minimumTarget,\n    minWidth: layout.minimumTarget,\n    justifyContent: 'center',\n    alignItems: 'center',\n    paddingHorizontal: spacing.sm,\n  },",
    ],
    replacements: ['{}'],
    reason:
      'inputAction is a dead themedStyles entry: delete-account.tsx renders its reveal control through the shared PasswordVisibilityToggle component (which owns its own styles), and grep confirms no styles.inputAction reference anywhere in the file, so the object is never passed to StyleSheet.flatten or any element.',
    locations: exactLocations(301, 16, 309, 4),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'StringLiteral',
    originals: ["    maxWidth: '45%',"],
    replacements: ['""'],
    reason:
      'A property of the dead, never-referenced styles.inputAction object (see the ObjectLiteral pin for the same block); no element in this file consumes it, so its value is unobservable.',
    locations: exactLocations(303, 15, 303, 20),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'StringLiteral',
    originals: ["    justifyContent: 'center',"],
    replacements: ['""'],
    reason:
      'A property of the dead, never-referenced styles.inputAction object; it never reaches any rendered style, so the literal value is unobservable.',
    locations: exactLocations(306, 21, 306, 29),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'StringLiteral',
    originals: ["    alignItems: 'center',"],
    replacements: ['""'],
    reason:
      'A property of the dead, never-referenced styles.inputAction object; it never reaches any rendered style, so the literal value is unobservable.',
    locations: exactLocations(307, 17, 307, 25),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      "  inputActionText: {\n    flexShrink: 1,\n    color: colors.primary,\n    fontSize: 14,\n    fontWeight: '600',\n    textAlign: 'center',\n  },",
    ],
    replacements: ['{}'],
    reason:
      'inputActionText is a dead themedStyles entry: no styles.inputActionText reference exists anywhere in delete-account.tsx (the reveal text glyph lives inside the shared PasswordVisibilityToggle), so the object is never consumed by any element or StyleSheet.flatten call.',
    locations: exactLocations(310, 20, 316, 4),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'StringLiteral',
    originals: ["    fontWeight: '600',"],
    replacements: ['""'],
    reason:
      'A property of the dead, never-referenced styles.inputActionText object; it never reaches any rendered style, so the literal value is unobservable.',
    locations: exactLocations(314, 17, 314, 22),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'StringLiteral',
    originals: ["    textAlign: 'center',"],
    replacements: ['""'],
    reason:
      'A property of the dead, never-referenced styles.inputActionText object; it never reaches any rendered style, so the literal value is unobservable.',
    locations: exactLocations(315, 16, 315, 24),
  },
  {
    file: 'src/app/settings/delete-account.tsx',
    mutator: 'ObjectLiteral',
    originals: ['  controlDisabled: {\n    opacity: 0.5,\n  },'],
    replacements: ['{}'],
    reason:
      'controlDisabled is a dead themedStyles entry: delete-account.tsx disables its controls via component props (Button/PasswordVisibilityToggle disabled states) and never references styles.controlDisabled, so the object is never applied to any element.',
    locations: exactLocations(317, 20, 319, 4),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The export contains an invalid practice cycle.');"],
    replacements: ['""'],
    reason:
      'The message of a thrown non-ApiError never reaches the UI: exportData catches it and renders userMessageForError(error, t(settings.exportFailed)), which returns the fallback copy for every plain Error; nothing logs or asserts the text.',
    locations: exactLocations(683, 29, 683, 77),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["if (!documentStarted) throw new Error('The export returned no pages.');"],
    replacements: ['""'],
    reason:
      'Message-only mutant: the thrown plain Error is always reshaped to the localized settings.exportFailed fallback by userMessageForError; the message text is never observable.',
    locations: exactLocations(735, 45, 735, 76),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["if (!attemptsFinished) throw new Error('The attempt export did not finish.');"],
    replacements: ['""'],
    reason:
      'Message-only mutant: userMessageForError returns the localized settings.exportFailed fallback for every plain Error, so the message text is never observable.',
    locations: exactLocations(736, 46, 736, 82),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The practice-cycle export did not finish.');"],
    replacements: ['""'],
    reason:
      'Message-only mutant: userMessageForError returns the localized settings.exportFailed fallback for every plain Error, so the message text is never observable.',
    locations: exactLocations(738, 25, 738, 68),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: [
      "if (completedArtifact === null) throw new Error('The export file is unavailable.');",
    ],
    replacements: ['""'],
    reason:
      'Message-only mutant, and the guard itself is unreachable-true (documentStarted implies exportArtifact.current was assigned in the same statement): the text is never observable.',
    locations: exactLocations(742, 55, 742, 88),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The export session expired.', 'AbortError');"],
    replacements: ['""'],
    count: 2,
    reason:
      "Both the message and the DOMException name are unobservable: the throwing guard first calls controller.abort(), and exportData's catch suppresses every error while controller.signal.aborted is true, so no copy, log, or state ever reflects the exception's text or name (only the abort side effect, which this string does not touch).",
    locations: exactLocations(631, 36, 631, 65, 705, 36, 705, 65),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The export session expired.', 'AbortError');"],
    replacements: ['""'],
    count: 2,
    reason:
      'The AbortError name is never inspected: the guard aborts the controller before throwing and the catch branch is suppressed by controller.signal.aborted, so the exception identity is entirely unobservable.',
    locations: exactLocations(631, 67, 631, 79, 705, 67, 705, 79),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The export contains an invalid attempt.');"],
    replacements: ['""'],
    reason:
      'Message-only mutant: userMessageForError returns the localized settings.exportFailed fallback for every plain Error.',
    locations: exactLocations(637, 31, 637, 72),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The export snapshots are invalid.');"],
    replacements: ['""'],
    reason:
      'Message-only mutant: userMessageForError returns the localized settings.exportFailed fallback for every plain Error.',
    locations: exactLocations(649, 31, 649, 66),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The export contains an invalid recording.');"],
    replacements: ['""'],
    reason:
      'Message-only mutant: userMessageForError returns the localized settings.exportFailed fallback for every plain Error.',
    locations: exactLocations(716, 29, 716, 72),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: [
      "if (!recordingsStarted) throw new Error('The recording export returned no pages.');",
    ],
    replacements: ['""'],
    reason:
      'Message-only mutant: userMessageForError returns the localized settings.exportFailed fallback for every plain Error.',
    locations: exactLocations(740, 47, 740, 88),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (!documentStarted) throw new Error('The export returned no pages.');"],
    replacements: ['false'],
    reason:
      'Shadowed fail-closed chain: the only walker input that reaches this check with documentStarted false (no page callback ran) also leaves attemptsFinished/practiceCyclesStarted false, so line 736 throws identically (same exportFailed copy, no file claimed, no share) with or without this check.',
    locations: exactLocations(735, 11, 735, 27),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (!attemptsFinished) throw new Error('The attempt export did not finish.');"],
    replacements: ['false'],
    reason:
      'Shadowed: attemptsFinished can only be false here when the page callback never processed page.attemptsDone, which also leaves practiceCyclesStarted false, so line 737 throws the same user-visible exportFailed outcome; the recordings consumer is equally unreachable in both variants because its guard requires documentStarted and attemptsFinished.',
    locations: exactLocations(736, 11, 736, 28),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!practiceCyclesStarted || !practiceCyclesFinished) {'],
    replacements: ['false'],
    reason:
      'Shadowed: with either flag false the recordings consumer guard (line 695-705) rejects the session, so recordingsStarted stays false and line 740 throws the identical exportFailed outcome; no walker input can share a file through this branch because sharing requires the recordings section that only a finished practice-cycle walk writes.',
    locations: exactLocations(737, 11, 737, 60),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!practiceCyclesStarted || !practiceCyclesFinished) {'],
    replacements: ['!practiceCyclesStarted && !practiceCyclesFinished'],
    reason:
      "practiceCyclesStarted is set in the same statement that finishes the attempt section, so 'started true / finished false' is the only single-flag-false state, and it is already caught by the line-740 recordings check that fires identically for the && variant; 'started false / finished true' is unreachable because finished is only assigned inside the practice-cycle branch that requires started.",
    locations: exactLocations(737, 11, 737, 60),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      "if (!practiceCyclesStarted || !practiceCyclesFinished) {\n        throw new Error('The practice-cycle export did not finish.');\n      }",
    ],
    replacements: ['{}'],
    reason:
      'Same shadowing as the condition mutant: any walk that reaches here with a flag false also fails the line-740 recordings-started check (the recordings consumer aborts on unfinished practice cycles), so the observable outcome (exportFailed, no share, file released) is identical.',
    locations: exactLocations(737, 62, 739, 8),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "if (completedArtifact === null) throw new Error('The export file is unavailable.');",
    ],
    replacements: ['false'],
    reason:
      'Unreachable-true guard: exportArtifact.current is assigned in the same block that sets documentStarted and is never nulled before line 741, and the preceding checks already proved documentStarted, so completedArtifact is provably non-null here.',
    locations: exactLocations(742, 11, 742, 37),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ObjectLiteral',
    originals: ['const exportArtifact: { current: OwnedPrivateFile | null } = { current: null };'],
    replacements: ['{}'],
    reason:
      'Every read of exportArtifact.current only distinguishes falsy vs truthy (the recordings-consumer guard and the finally release are skipped for null and undefined alike), and the only assignment (claimPrivateExportFile) happens before any truthy read; the initializer value is never otherwise observed.',
    locations: exactLocations(611, 66, 611, 83),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['let practiceCyclesStarted = false;'],
    replacements: ['true'],
    reason:
      'The flag is unconditionally reassigned in the same page callback that sets documentStarted and attemptsFinished (line 676) before any read (post-walker checks, recordings-consumer guard); when the walk ends earlier, an earlier check throws first, so the initializer is never read.',
    locations: exactLocations(622, 35, 622, 40),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['let practiceCyclesFinished = false;'],
    replacements: ['true'],
    reason:
      'The flag is reassigned on every practice-cycle page (line 692) before any read, and any walk that reaches the reads without processing such a page also fails the earlier attempts/practiceCycles-started checks, so the initializer value is never observed.',
    locations: exactLocations(624, 36, 624, 41),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: [
      "nameDirtyRef.current = value !== (userRef.current?.name ?? '');",
      "const currentName = userRef.current?.name ?? '';",
    ],
    replacements: ['userRef.current.name'],
    count: 2,
    reason:
      "userRef is initialized from the first render user and refreshed by a layout effect; both handlers only exist on committed renders where the screen's `if (!user) return null` gate guarantees user (and its name) is non-null, so the optional chain's null branch is dead code.",
    locations: exactLocations(1149, 49, 1149, 70, 1167, 37, 1167, 58),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: [
      "nameDirtyRef.current = value !== (userRef.current?.name ?? '');",
      "const currentName = userRef.current?.name ?? '';",
    ],
    replacements: ['"Stryker was here!"'],
    count: 2,
    reason:
      "The ?? '' fallback only applies when userRef.current is nullish, which cannot happen on any committed render that mounts these handlers (the screen renders null first), so the fallback constant is dead.",
    locations: exactLocations(1149, 74, 1149, 76, 1167, 62, 1167, 64),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["const canonicalName = user?.name ?? '';"],
    replacements: ['"Stryker was here!"'],
    reason:
      'The sentinel is only computed while user is null, and in exactly that state the screen returns null before rendering anything that consumes the name draft; the moment a user commits, the canonicalName effect resyncs the draft to the real name. No rendered output, save, or navigation ever reads the draft while user is null.',
    locations: exactLocations(142, 39, 142, 41),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The useFocusEffect callback resets navigationStartedRef.current to false synchronously on mount/focus before any user-event handler can run (the test mock and the real focus effect both invoke it during the mount commit), so the initializer value is never read by renderCanHandle.',
    locations: exactLocations(196, 39, 196, 44),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ObjectLiteral',
    originals: ['const accountSessionRef = useRef({ token, userId: accountUserId });'],
    replacements: ['{}'],
    reason:
      'A layout effect overwrites accountSessionRef.current with { token, userId } on the very first commit, before any effect, promise continuation, or event handler can call renderedAccountSessionIsCurrent, so the initializer value is never read.',
    locations: exactLocations(205, 36, 205, 68),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],'],
    replacements: ['["Stryker was here"]'],
    reason:
      'blockingOperationActive reads only stable useRef objects, so the [] deps already yield a stable callback identity; replacing them with an equally-constant literal array leaves the memoization (and every consumer) behaviorally identical.',
    locations: exactLocations(219, 5, 219, 7),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [blockingOperationActive, navigation]);'],
    replacements: ['[]'],
    count: 2,
    reason:
      'Both dependencies are themselves stable (blockingOperationActive has [] deps and reads only refs; the navigation object is one stable instance per mounted route in both the test harness and expo-router), so dropping them from the deps cannot change when publishNavigationLock / the beforeRemove subscriber is recreated or what closure they capture.',
    locations: exactLocations(229, 6, 229, 43, 258, 6, 258, 43),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [navigation, screenBusy]);'],
    replacements: ['[]'],
    reason:
      'Every screenBusy transition is accompanied by an explicit publishNavigationLock() call inside the operation that flipped the flag (each busy setter is paired with a publish in its start/finally/close paths), and the identity-reset effect publishes its own unlock, so the layout effect never communicates a lock state that the synchronous publishes have not already published.',
    locations: exactLocations(250, 6, 250, 30),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The replacement is an equally-constant deps literal: React compares deps element-wise, so the useCallback still returns one stable identity across renders and useFocusEffect subscribes exactly once — identical behavior to [].',
    locations: exactLocations(267, 8, 267, 10),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useLayoutEffect(() => {\n    navigationRef.current = navigation;\n  }, [navigation]);',
    ],
    replacements: ['{}'],
    reason:
      "navigation is one stable object per mounted route (the test harness returns a constant mock and expo-router returns the same navigation instance for the route), so keeping the initial value instead of re-assigning the identical reference changes nothing for the only reader (the identity-reset effect's setOptions call).",
    locations: exactLocations(283, 25, 285, 4),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [navigation]);'],
    replacements: ['[]'],
    reason:
      'navigation is a stable instance per mounted route, so the effect never actually re-runs after mount in any reachable state; the deps contents are inert.',
    locations: exactLocations(285, 6, 285, 18),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current !== activeIdentity) {'],
    replacements: ['true'],
    reason:
      "The effect only re-runs when activeIdentity changes, and on every such run the guard is already true; the only extra execution is the mount commit, where the body is an idempotent no-op (every state is already at its rest value and the setOptions unlock duplicates the sibling screenBusy layout effect's unlock with identical arguments).",
    locations: exactLocations(287, 9, 287, 53),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['!navigationStartedRef.current &&\n      activeIdentityRef.current !== null &&'],
    replacements: ['!navigationStartedRef.current || activeIdentityRef.current !== null'],
    reason:
      "activeIdentityRef.current is null only inside the effect cleanup for a replaced identity or unmount; in the unmount case the focus cleanup has already set navigationStartedRef true, and the replacement case re-assigns the ref to the new identity within the same commit. The state 'identity ref null AND navigation not started' that the || variant would newly accept is therefore unreachable.",
    locations: exactLocations(341, 7, 342, 41),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeIdentityRef.current !== null &&'],
    replacements: ['true'],
    reason:
      'Redundant conjunct: whenever this screen is mounted and a logout callback runs, the identity ref is non-null (it is null only transiently inside a cleanup that the same commit follows with either a new identity or full unmount, where navigationStartedRef is already true), so forcing it true cannot change the result.',
    locations: exactLocations(342, 7, 342, 41),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['token !== null &&'],
    replacements: ['true'],
    reason:
      'Redundant conjunct: token is null only together with a null user, in which case the accountUserId !== null conjunct (or the navigation/identity conjuncts after an unmount) already returns false; a null token with a non-null user is not a reachable Auth state on this screen.',
    locations: exactLocations(343, 7, 343, 21),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['accountUserId !== null &&'],
    replacements: ['true'],
    reason:
      'Redundant conjunct: accountUserId is null only together with a null token (Auth never exposes a user without a bearer), so the token !== null conjunct already returns false in every state this mutant would newly accept.',
    locations: exactLocations(344, 7, 344, 29),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: ['subscription?.remove?.();'],
    replacements: ['subscription?.remove()'],
    reason:
      'AppState.addEventListener always returns a subscription whose remove is defined (the RN API contract, and every test double used here provides it), so the extra optional-call guard protects a state that cannot occur.',
    locations: exactLocations(418, 7, 418, 31),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['reminderBusyRef.current = true;'],
    replacements: ['false'],
    reason:
      "Every reader of reminderBusyRef inside the latch window is already blocked by languageBusyRef.current, which stays true for the whole window (applyReminder's guard checks it, blockingOperationActive includes it, and a second language change is fenced by languageBusyRef too); the outer finally clears the latch, so both variants converge to false with no observable divergence.",
    locations: exactLocations(559, 35, 559, 39),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'recordingsDeleteBusyRef.current === operation &&\n        recordingsDeleteControllerRef.current === controller &&',
    ],
    replacements: ['true'],
    reason:
      "The two ref equalities are invariantly true between the operation's start and its finally (the refs are only overwritten by the finally itself or by the identity-reset effect, which also aborts the controller and so falsifies the remaining !aborted && renderCanHandle() conjuncts), so forcing them true cannot change operationIsCurrent on any reachable state.",
    locations: exactLocations(787, 9, 788, 61),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['recordingsDeleteBusyRef.current === operation &&'],
    replacements: ['true'],
    reason:
      'busyRef equals operation for the whole live window of the operation (cleared only in its own finally, after which operationIsCurrent is never called again, or by the identity reset, which also aborts the controller and falsifies the remaining conjuncts), so the conjunct is invariantly true wherever it is read.',
    locations: exactLocations(787, 9, 787, 54),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['recordingsDeleteControllerRef.current === controller &&'],
    replacements: ['true'],
    reason:
      'controllerRef equals controller for the whole live window of the operation (nulled only in its own finally or by the identity reset, both of which also make the busyRef or !aborted conjuncts false), so the conjunct is invariantly true wherever it is read.',
    locations: exactLocations(788, 9, 788, 61),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'recordingsDeleteBusyRef.current === operation &&\n        recordingsDeleteControllerRef.current === controller &&\n        !controller.signal.aborted &&',
    ],
    replacements: [
      'recordingsDeleteBusyRef.current === operation && recordingsDeleteControllerRef.current === controller || !controller.signal.aborted',
    ],
    reason:
      'Operator-reordering of conjuncts that are invariantly true together wherever the expression is read (both ref equalities hold for the entire live window of the operation; every state that falsifies one falsifies the others or the trailing !aborted/renderCanHandle conjuncts), so no reachable evaluation distinguishes the variants.',
    locations: exactLocations(787, 9, 789, 35),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: [
      'recordingsDeleteBusyRef.current === operation &&\n        recordingsDeleteControllerRef.current === controller &&',
    ],
    replacements: [
      'recordingsDeleteBusyRef.current === operation || recordingsDeleteControllerRef.current === controller',
    ],
    reason:
      'Both operands are invariantly equal-true (or equal-false together after the finally/identity reset, where the expression is no longer read), so || and && evaluate identically on every reachable state.',
    locations: exactLocations(787, 9, 788, 61),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (recordingsDeleteControllerRef.current === controller) {'],
    replacements: ['false'],
    reason:
      'Skipping the null-clear only leaves a settled AbortController reference that no later code observes differently: the next operation compares by identity against its own controller, the focus/identity cleanups abort and null unconditionally, and aborting an already-settled controller is a no-op.',
    locations: exactLocations(829, 13, 829, 65),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      'if (recordingsDeleteControllerRef.current === controller) {\n          recordingsDeleteControllerRef.current = null;\n        }',
    ],
    replacements: ['{}'],
    reason:
      'Same as the condition variants: the only effect of the block is nulling a controller reference that no reachable reader can distinguish once the operation has reached its finally.',
    locations: exactLocations(829, 67, 831, 10),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['return true;'],
    replacements: ['false'],
    reason:
      "deleteAllRecordings's only caller reacts to false by calling publishNavigationLock(), which re-issues the exact setOptions arguments the just-started (or just-refused) operation already published — an idempotent no-op with no rendered or navigated effect.",
    locations: exactLocations(840, 12, 840, 16),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['return true;'],
    replacements: ['false'],
    reason:
      "retakeTest's only caller reacts to false by calling publishNavigationLock(), which re-issues the identical locked setOptions the just-started restart already published; no observable output depends on the return value.",
    locations: exactLocations(999, 12, 999, 16),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderOwnsIdentity()) return;'],
    replacements: ['false'],
    count: 4,
    reason:
      'Proceeding past a lost identity only re-asserts state the identity-reset layout effect has already committed (confirming/busy false, lock unlocked): setRetakeConfirming/setRecordingsDeleteConfirming(false) are no-ops and publishNavigationLock re-issues the identical unlock arguments, so no observable difference exists on any of these four close paths.',
    locations: exactLocations(
      854,
      11,
      854,
      32,
      869,
      17,
      869,
      38,
      1018,
      11,
      1018,
      32,
      1033,
      17,
      1033,
      38,
    ),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (!retakeTest()) publishNavigationLock();'],
    replacements: ['retakeTest()'],
    reason:
      'Same idempotent-publish reasoning as the delete-all twin: the flipped condition only adds a redundant setOptions call with arguments identical to the one retakeTest already issued on the same lock state.',
    locations: exactLocations(1035, 17, 1035, 30),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle()) return;'],
    replacements: ['false'],
    reason:
      'toggleReminder immediately delegates to applyReminder, whose own guard re-checks renderCanHandle() (plus the busy refs), so weakening this entry check is fully masked.',
    locations: exactLocations(918, 9, 918, 27),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || !current.enabled) return;'],
    replacements: ['false'],
    reason:
      'applyReminder re-checks renderCanHandle(), and the !current.enabled arm is unreachable-different: the hour steppers only render while reminder.enabled is true, and every transition to enabled=false removes them in the same committed render (a stale committed handler still sees the guard pass exactly when clean code does, because reminder state cannot flip to disabled while the buttons exist).',
    locations: exactLocations(923, 9, 923, 47),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || !current.enabled) return;'],
    replacements: ['!renderCanHandle() && !current.enabled'],
    reason:
      'Identical masking: applyReminder re-checks renderCanHandle(), and the enabled arm cannot diverge for the same unreachability of a disabled-reminder stepper press.',
    locations: exactLocations(923, 9, 923, 47),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {\n      return false;\n    }',
    ],
    replacements: ['{}'],
    reason:
      'retakeTest has exactly one caller, reached only after the confirmation-owner check and a renderOwnsIdentity check with no intervening await, and every re-entrant route is fenced upstream: confirmRetake refuses while retakeBusyRef/retakeConfirmingRef/logoutBusyRef are set (line 1003-1007), and a second confirmation frame is rejected by the owner-symbol check. Each conjunct is therefore invariantly false/satisfied at entry, so emptying the guard cannot be observed.',
    locations: exactLocations(951, 79, 953, 6),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['return false;'],
    replacements: ['true'],
    reason:
      "This early return is unreachable in every reachable state (see the block-mutant twin: all entry paths are pre-guarded by confirmRetake's re-entrancy check and the confirmation-owner check), and even if reached, its only effect is one idempotent publishNavigationLock by the caller.",
    locations: exactLocations(952, 14, 952, 19),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['false'],
    reason:
      "Same unreachable-conjunct masking as the block mutant: renderCanHandle can only be false at entry if it was equally false at the caller's renderOwnsIdentity check one synchronous step earlier, and the busy-ref conjuncts are fenced by confirmRetake's own guard before any confirmation frame can call through.",
    locations: exactLocations(951, 9, 951, 77),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['(!renderCanHandle() || retakeBusyRef.current) && logoutBusyRef.current'],
    reason:
      'Every conjunct is invariantly false at the single reachable call site (see above), so any boolean re-association of them evaluates identically.',
    locations: exactLocations(951, 9, 951, 77),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['false'],
    reason:
      "Partial-node twin of the full guard: the omitted logoutBusyRef conjunct is unreachable-true at entry (confirmLogout's alert-confirm guard at line 1122 refuses while any blocking operation runs), so the shortened condition still never diverges.",
    locations: exactLocations(951, 9, 951, 52),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['!renderCanHandle() && retakeBusyRef.current'],
    reason:
      'Both remaining conjuncts are invariantly false at the only reachable call site (upstream guards at 1003-1007 and the owner check), so the re-association cannot change any evaluation.',
    locations: exactLocations(951, 9, 951, 52),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || blockingOperationActive()) return;'],
    replacements: ['false'],
    reason:
      "handleLogout's only reachable caller is the logout alert's destructive onPress, whose own guard (line 1122) checks the identical renderCanHandle() || blockingOperationActive() condition one synchronous step earlier, so weakening this copy is fully masked.",
    locations: exactLocations(1050, 9, 1050, 56),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || blockingOperationActive()) return;'],
    replacements: ['!renderCanHandle() && blockingOperationActive()'],
    reason:
      'Same masking by the alert-confirm guard at line 1122: no reachable state reaches handleLogout with either conjunct true, so the re-association is unobservable.',
    locations: exactLocations(1050, 9, 1050, 56),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || blockingOperationActive()) return;'],
    replacements: ['false'],
    reason:
      'Letting a second press through only reaches handleLogout, whose own guard (line 1050) checks the identical condition; the pair is mutually redundant, so each mutant individually is masked by the other copy.',
    locations: exactLocations(1122, 15, 1122, 62),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || blockingOperationActive()) return;'],
    replacements: ['!renderCanHandle() && blockingOperationActive()'],
    reason: "Same mutual masking by handleLogout's identical guard at line 1050.",
    locations: exactLocations(1122, 15, 1122, 62),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (renderedAccountSessionIsCurrent()) {'],
    replacements: ['true'],
    reason:
      'When the session is no longer current, a completed signOutThisDevice has already invalidated the Auth session: the route tree switches away and this component unmounts or renders null (user null), so the extra publishNavigationLock/setLogoutBusy(false) land on a detached or blank surface; when the session is current the mutant equals the clean branch.',
    locations: exactLocations(1093, 23, 1093, 56),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: ["languageBusy && languageTarget?.scope === 'ui' && languageTarget.code === code"],
    replacements: ['languageTarget.scope'],
    reason:
      'languageTarget is set non-null in the same synchronous block that sets languageBusy and nulled in the same finally that clears it (and the identity reset clears both together), so the leading languageBusy && conjunct already proves languageTarget is non-null at every read; the optional chain never short-circuits.',
    locations: exactLocations(1224, 29, 1224, 50),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: [
      "languageBusy && languageTarget?.scope === 'native' && languageTarget.code === code",
    ],
    replacements: ['languageTarget.scope'],
    reason:
      'Same invariant as the UI grid: languageBusy true implies languageTarget non-null at every read, so removing the optional chaining cannot change the busy-chip selection.',
    locations: exactLocations(1258, 29, 1258, 50),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['accessibilityState={{ busy: exportBusy, disabled: exportBusy || logoutBusy }}'],
    replacements: ['true'],
    reason:
      'React Native Pressable overwrites accessibilityState.disabled with the separate disabled prop whenever it is provided, and this row always passes disabled={exportBusy || logoutBusy}; the accessibilityState copy of the same expression is therefore unreachable output.',
    locations: exactLocations(1457, 61, 1457, 85),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['accessibilityState={{ busy: exportBusy, disabled: exportBusy || logoutBusy }}'],
    replacements: ['false'],
    reason:
      "Same Pressable disabled-prop precedence: the authored accessibilityState.disabled value is always overwritten by the row's disabled prop, so its value is unobservable.",
    locations: exactLocations(1457, 61, 1457, 85),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['accessibilityState={{ busy: exportBusy, disabled: exportBusy || logoutBusy }}'],
    replacements: ['exportBusy && logoutBusy'],
    reason:
      'Same Pressable disabled-prop precedence: the rendered disabled state comes exclusively from the disabled prop at line 1458, so any mutation of the duplicated expression inside accessibilityState is unobservable.',
    locations: exactLocations(1457, 61, 1457, 85),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['disabled: retakeBusy || retakeConfirming || logoutBusy,'],
    replacements: ['true'],
    reason:
      "Pressable overwrites accessibilityState.disabled with the row's disabled prop (disabled={retakeBusy || retakeConfirming || logoutBusy}), so the accessibilityState copy is never rendered; only the prop value is observable and it is covered by its own assertions.",
    locations: exactLocations(1482, 23, 1482, 67),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['disabled: retakeBusy || retakeConfirming || logoutBusy,'],
    replacements: ['false'],
    reason: 'Same Pressable disabled-prop precedence as the true-force twin.',
    locations: exactLocations(1482, 23, 1482, 67),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['disabled: retakeBusy || retakeConfirming || logoutBusy,'],
    replacements: ['(retakeBusy || retakeConfirming) && logoutBusy'],
    reason:
      'Same Pressable disabled-prop precedence: the rendered disabled state comes from the separate disabled prop, so re-associating the duplicated expression inside accessibilityState is unobservable.',
    locations: exactLocations(1482, 23, 1482, 67),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['disabled: retakeBusy || retakeConfirming || logoutBusy,'],
    replacements: ['false'],
    reason:
      'Partial-node twin (retakeBusy || retakeConfirming) of the same shadowed accessibilityState copy; the disabled prop at line 1484 owns the rendered state.',
    locations: exactLocations(1482, 23, 1482, 53),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['disabled: retakeBusy || retakeConfirming || logoutBusy,'],
    replacements: ['retakeBusy && retakeConfirming'],
    reason: 'Partial-node twin of the same shadowed accessibilityState copy.',
    locations: exactLocations(1482, 23, 1482, 53),
  },
  {
    file: 'src/lib/identity-validation.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;'],
    replacements: ['false'],
    reason:
      "The empty-email conjunct is redundant: with the conjunct forced false an empty trimmed email still reaches EMAIL_PATTERN.test(''), which requires an @-separated domain and rejects the empty string, so isValidEmailAddress returns false for every input either way. emailAddressError additionally guards the empty field with its own trim-length check.",
    locations: exactLocations(19, 7, 19, 25),
  },
  {
    file: 'src/lib/identity-validation.ts',
    mutator: 'ConditionalExpression',
    originals: [
      "return value.length > 0 && !hasNoControlCharacters(value) ? t('name.invalid') : null;",
    ],
    replacements: ['true'],
    reason:
      "Forcing the length conjunct true only changes the empty-string case: clean code short-circuits to null, and the mutant computes true && !hasNoControlCharacters('') where the control-character class matches nothing in the empty string, so it also evaluates to null. Every nonempty input takes the same branch in both variants, so no test can distinguish them.",
    locations: exactLocations(41, 10, 41, 26),
  },
  {
    file: 'src/lib/identity-validation.ts',
    mutator: 'EqualityOperator',
    originals: [
      "return value.length > 0 && !hasNoControlCharacters(value) ? t('name.invalid') : null;",
    ],
    replacements: ['value.length >= 0'],
    reason:
      'The mutated length comparison is only false for the empty string, and (as with the forced-true twin) the empty string reaches the same null result through the hasNoControlCharacters branch in both variants, so the truth table is unchanged for every input.',
    locations: exactLocations(41, 10, 41, 26),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'StringLiteral',
    originals: [": `${user.id}:${user.diagnosticCompleted ? 'complete' : 'incomplete'}:${"],
    replacements: ['""'],
    reason:
      "The label feeds only the placement remount key. Emptying just the 'complete' arm keeps the two diagnosticCompleted phases on distinct keys (`${id}::...` vs `${id}:incomplete:...`), so every transition still changes or preserves the key exactly as before and no other output reads the label.",
    locations: exactLocations(79, 48, 79, 58),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'StringLiteral',
    originals: [": `${user.id}:${user.diagnosticCompleted ? 'complete' : 'incomplete'}:${"],
    replacements: ['""'],
    reason:
      "The label feeds only the placement remount key. Emptying just the 'incomplete' arm keeps the two diagnosticCompleted phases on distinct keys, so remount semantics — the only observable behavior — are identical.",
    locations: exactLocations(79, 61, 79, 73),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'ConditionalExpression',
    originals: ["kind: isFailedAnswer && current.kind === 'new' ? 'revision' : current.kind,"],
    replacements: ['true'],
    reason:
      "PracticeKind is the closed union 'new' | 'revision' (src/lib/types.ts), so forcing the kind comparison true yields kind = isFailedAnswer ? 'revision' : current.kind — which is exactly the clean result: a failed attempt maps to 'revision' whether the word was 'new' or already 'revision', and a passed/native answer keeps current.kind. The truth table is unchanged for every reachable cache entry.",
    locations: exactLocations(229, 33, 229, 55),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if ((result.noSpeech || native || !result.passed) && result.attemptsLeft > 0) {'],
    replacements: ['false'],
    reason:
      'The node is redundant inside its own condition: for a native outcome the trailing !result.passed is always true because NativeAttemptResult has no passed field, and an English AttemptResult with noSpeech=true is always scored passed=false, so (noSpeech || native) never changes the value of the surrounding disjunction on any reachable outcome.',
    locations: exactLocations(143, 12, 143, 37),
  },
  {
    file: 'src/lib/practice-flow.tsx',
    mutator: 'LogicalOperator',
    originals: ['if ((result.noSpeech || native || !result.passed) && result.attemptsLeft > 0) {'],
    replacements: ['result.noSpeech && native'],
    reason:
      'Same redundancy as the forced-false twin: the trailing !result.passed operand (always true for native outcomes, which lack a passed field, and true for every silent English outcome) already makes the disjunction true whenever the node is true, so replacing || with && cannot change the branch on any reachable outcome.',
    locations: exactLocations(143, 12, 143, 37),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: ['exportArtifact.current?.release();'],
    replacements: ['exportArtifact.current.release'],
    reason:
      'The direct call throws exactly where the optional chain short-circuits (exportArtifact.current null), and the surrounding try/catch exists precisely to swallow release failures so cleanup cannot mask the export outcome; both variants fall through to the same abort/cleanup tail with the same state transitions.',
    locations: exactLocations(761, 9, 761, 40),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const nameDirtyRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The canonical-name useLayoutEffect runs on the very first commit (nameFocusedRef.current is false at mount) and unconditionally re-asserts nameDirtyRef.current = false before any blur or change handler can run, so the useRef seed value is never read.',
    locations: exactLocations(201, 31, 201, 36),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'recordingsDeleteBusyRef.current === operation &&\n        recordingsDeleteControllerRef.current === controller &&\n        !controller.signal.aborted &&',
    ],
    replacements: ['true'],
    reason:
      'Every path that aborts the delete controller also falsifies a conjunct this mutant leaves behind: the focus cleanup sets navigationStartedRef true (renderCanHandle false), and both identity-effect cleanups either null the controller ref or clear activeIdentityRef (renderCanHandle false), so the abort conjunct is never the deciding fence; forcing the three leading conjuncts true cannot change operationIsCurrent on any reachable state.',
    locations: exactLocations(787, 9, 789, 35),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (ownsReminderLatch) {'],
    replacements: ['true'],
    reason:
      'Forcing the taken-latch branch true only re-assigns reminderBusyRef.current = true (already true, because ownsReminderLatch was false exactly when a reminder mutation holds the latch) and re-renders setReminderBusy(true) with the same already-true value. The finally still reads the unmutated ownsReminderLatch (false), so it skips the early latch release — the very divergence this branch could cause — and the owning reminder operation clears the latch itself.',
    locations: exactLocations(558, 11, 558, 28),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'StringLiteral',
    originals: ["source: 'external' | 'first-party-api' = 'external',"],
    replacements: ['""'],
    reason:
      "The default is observable only through the single read of `source` in throwForStatus — the `source === 'first-party-api'` gate (line 517) that latches the 426 CLIENT_UPGRADE_REQUIRED modal. '' fails that equality exactly like 'external', and no other statement in throwForStatus or any caller reads the parameter, so the default's spelling cannot change any behavior.",
    locations: exactLocations(478, 44, 478, 54),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: [': status === 503'],
    replacements: ['true'],
    reason:
      'The ternary selects between MAX_RETRY_AFTER_SECONDS_503 and MAX_RETRY_AFTER_SECONDS_REQUEST_IN_FLIGHT, which are both the literal constant 120 (lines 383/385). Both arms yield the identical bound for every in-gate status, so no status, header, or body input can change maxSeconds or any field of the thrown ApiError.',
    locations: exactLocations(527, 11, 527, 25),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: [': status === 503'],
    replacements: ['false'],
    reason:
      'The ternary selects between MAX_RETRY_AFTER_SECONDS_503 and MAX_RETRY_AFTER_SECONDS_REQUEST_IN_FLIGHT, which are both the literal constant 120 (lines 383/385). Both arms yield the identical bound for every in-gate status, so no status, header, or body input can change maxSeconds or any field of the thrown ApiError.',
    locations: exactLocations(527, 11, 527, 25),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'EqualityOperator',
    originals: [': status === 503'],
    replacements: ['status !== 503'],
    reason:
      'The ternary selects between MAX_RETRY_AFTER_SECONDS_503 and MAX_RETRY_AFTER_SECONDS_REQUEST_IN_FLIGHT, which are both the literal constant 120 (lines 383/385). Both arms yield the identical bound for every in-gate status, so no status, header, or body input can change maxSeconds or any field of the thrown ApiError.',
    locations: exactLocations(527, 11, 527, 25),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ["if (path.endsWith('.3gp') || path.endsWith('.aac')) {"],
    replacements: ['false'],
    reason:
      "Disabling the branch cannot change any outcome: a lowercased path ending '.3gp' or '.aac' necessarily satisfies the trailing-extension regex at line 737 ( !/\\.[a-z0-9]+$/.test(path) is false), so execution reaches line 746 and throws a byte-identical new ApiError(415, 'Unsupported recording format') — same status, same message, no code or extras — and every other path never entered the branch.",
    locations: exactLocations(731, 7, 731, 53),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'LogicalOperator',
    originals: ["if (path.endsWith('.3gp') || path.endsWith('.aac')) {"],
    replacements: ["path.endsWith('.3gp') && path.endsWith('.aac')"],
    reason:
      'A single path cannot end with both suffixes, so the condition is unsatisfiable and the branch is dead for every input; each URI resolves through the later branches exactly as before, and the previously-matching .3gp/.aac paths still get the identical 415 from line 746 (see the ConditionalExpression sibling).',
    locations: exactLocations(731, 7, 731, 53),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'BlockStatement',
    originals: [
      "if (path.endsWith('.3gp') || path.endsWith('.aac')) {\n// The transcription endpoint does not document 3GP or raw AAC as accepted\n// inputs. Expo's configured native recorder emits M4A; fail locally if a\n// device ever returns either format instead.\nthrow new ApiError(415, 'Unsupported recording format');\n}",
    ],
    replacements: ['{}'],
    reason:
      "Emptying the block makes the matching .3gp/.aac paths fall through to line 737's extension check (which they always pass) and then line 746, which throws the byte-identical new ApiError(415, 'Unsupported recording format'); the returned/thrown values are indistinguishable through audioFileDescriptor or any caller.",
    locations: exactLocations(731, 55, 736, 4),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: [
      'if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > EXPORT_MAX_PAGES) {',
    ],
    replacements: ['false'],
    reason:
      'The only inputs whose classification changes are safe integers below 1 (0 and negatives). For those, both `for (let page = 0; page < maxPages; page += 1)` loops execute zero iterations and control reaches the terminal `throw new ContractError()` at line 1268 — the same rejection (identical name/message) with no fetch, consumer call, or intermediate await in either variant. Non-integer or over-capacity inputs are classified by the untouched first and third conjuncts.',
    locations: exactLocations(1184, 42, 1184, 54),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ['data.practiceCyclesDone !== true ||'],
    replacements: ['false'],
    reason:
      'parseUserDataPage (src/lib/types.ts) rejects any page violating practiceCyclesDone === (nextPracticeCycleCursor === null) or the empty-practiceCycles-with-non-null-cursor rule, so a parseable page reaching this check with practiceCyclesDone !== true necessarily has a non-null cycle cursor and at least one cycle row; the intact sibling conjunct at line 1212 (data.practiceCycles.length !== 0) then throws the same ContractError before the page is consumed, with identical fetch and consumer counts.',
    locations: exactLocations(1211, 7, 1211, 39),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: ['data.nextPracticeCycleCursor !== null'],
    replacements: ['false'],
    reason:
      'To reach this conjunct as the deciding one, a page must already have practiceCyclesDone === true (line 1211) and practiceCycles.length === 0 (line 1212), but parseUserDataPage enforces practiceCyclesDone === true implies nextPracticeCycleCursor === null, so this conjunct can never be true for a page that survives parsing; every distinguishing input is rejected as a ContractError by the parser before the walker check runs.',
    locations: exactLocations(1213, 7, 1213, 44),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: [
      'if (data.attemptsDone !== true || data.attempts.length !== 0 || data.nextCursor !== null) {',
    ],
    replacements: ['false'],
    reason:
      'parseUserDataPage enforces attemptsDone === (nextCursor === null) plus empty-attempts-implies-null-cursor, so a parseable cycles-phase page with attemptsDone !== true necessarily has non-empty attempts; the intact middle conjunct (data.attempts.length !== 0) throws the same ContractError before the page is emitted, with identical fetch and consumer counts.',
    locations: exactLocations(1248, 9, 1248, 35),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'ConditionalExpression',
    originals: [
      'if (data.attemptsDone !== true || data.attempts.length !== 0 || data.nextCursor !== null) {',
    ],
    replacements: ['false'],
    reason:
      'To reach this conjunct as the deciding one, a page must already have attemptsDone === true and attempts.length === 0, but parseUserDataPage enforces attemptsDone === true implies nextCursor === null, so this conjunct can never be true for a page that survives parsing; every distinguishing input is rejected as a ContractError by the parser before the walker check runs.',
    locations: exactLocations(1248, 69, 1248, 93),
  },
  {
    file: 'src/components/ClientUpgradeModal.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!normalized) return null;'],
    replacements: ['false'],
    reason:
      "normalized is a string, so !normalized is true exactly when it is ''. Skipping the guard then runs new URL('') inside the adjacent try, which throws and lands in the same `catch { return null; }` — identical null for every input, so no test can distinguish the paths.",
    locations: exactLocations(35, 7, 35, 18),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (reachability !== 'online' || reconnectCount <= hiddenReconnectCount) return;"],
    replacements: ['false'],
    reason:
      'The effect only schedules setHiddenReconnectCount(reconnectCount). hidden is read solely through `reachability === "online" && reconnectCount > hidden`, every value ever stored into hidden is a past-or-current reconnectCount, reconnectCount never decreases, and each offline-to-online transition increments it past every previously stored value. An extra timer can therefore only write a stale count that keeps the next online comparison true and is invisible while offline (the offline render is keyed on reachability alone); while online with count === hidden the write is a same-value no-op setState. The mutant still schedules the legit hide timer whenever the banner actually shows, so visible behavior is identical on every reachable state.',
    locations: exactLocations(21, 9, 21, 76),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'LogicalOperator',
    originals: ["if (reachability !== 'online' || reconnectCount <= hiddenReconnectCount) return;"],
    replacements: ["reachability !== 'online' && reconnectCount <= hiddenReconnectCount"],
    reason:
      'Flipping to && makes the effect schedule in a superset of situations (any online state, or any count > hidden), but every additional scheduling writes a stale-or-current reconnectCount into hidden. Stale values are < the current count, so they can never make `reconnectCount > hiddenReconnectCount` false while the back-online banner shows (the legit hide timer is still scheduled exactly when the banner shows) nor true again after it hides; writes while offline are unobservable because the offline render is keyed on reachability alone, and writes while online with count === hidden are same-value no-ops.',
    locations: exactLocations(21, 9, 21, 76),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (reachability !== 'online' || reconnectCount <= hiddenReconnectCount) return;"],
    replacements: ['false'],
    reason:
      'Replacing only the first operand schedules the timer whenever reconnectCount > hiddenReconnectCount regardless of reachability. All such firings while offline set hidden to a stale count that the next offline-to-online transition still exceeds (reconnectCount is monotone and only stored values <= it ever enter hidden), and the offline render never reads hidden; the legit hide timer for a showing back-online banner is still scheduled. No reachable component state produces a different render or timer-visible transition.',
    locations: exactLocations(21, 9, 21, 34),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (reachability !== 'online' || reconnectCount <= hiddenReconnectCount) return;"],
    replacements: ['false'],
    reason:
      'Replacing only the second operand schedules the timer whenever reachability is online. The only added case is online with reconnectCount === hiddenReconnectCount (or <, impossible since hidden <= count always), where the timer writes the same value React already holds — a bail-out setState with no re-render, and the effect deps do not change. The banner-showing case still gets its identical hide timer.',
    locations: exactLocations(21, 38, 21, 76),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'EqualityOperator',
    originals: ["if (reachability !== 'online' || reconnectCount <= hiddenReconnectCount) return;"],
    replacements: ['reconnectCount < hiddenReconnectCount'],
    reason:
      'The mutant still returns (no timer) exactly when reconnectCount <= hidden except for the boundary count === hidden while online, where it schedules setHiddenReconnectCount(reconnectCount) — a same-value no-op setState with unchanged effect deps. The banner-showing case (count > hidden) schedules the identical hide timer either way.',
    locations: exactLocations(21, 38, 21, 76),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'ArrowFunction',
    originals: ['return () => clearTimeout(timeout);'],
    replacements: ['() => undefined'],
    reason:
      "A never-cleared timer fires setHiddenReconnectCount(reconnectCount-at-schedule), which is always <= the current count. It can never hide a showing banner early (that needs hidden >= count), never re-show a hidden one while online (it writes counts, keeping count > hidden false only when already false), and is invisible while offline since the offline render never reads hidden. After unmount the stale timer only setState's an unmounted component, a React 18 no-op with no observable effect.",
    locations: exactLocations(26, 12, 26, 39),
  },
  {
    file: 'src/components/NetworkStatusBanner.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "const showBackOnline = reachability === 'online' && reconnectCount > hiddenReconnectCount;",
    ],
    replacements: ['true'],
    reason:
      "The mutant differs only when reachability !== 'online' while reconnectCount > hiddenReconnectCount. With reachability 'offline' every rendered output (message, live region, styles, early return) is keyed on `offline` alone, so the render is byte-identical. With reachability 'unknown' the state is unreachable: the store drops unknown observations (publishNetworkState returns before writing) and the initial unknown snapshot has reconnectCount 0 === hidden, so no test can ever construct the divergent state.",
    locations: exactLocations(30, 26, 30, 51),
  },
  {
    file: 'src/lib/network-status.ts',
    mutator: 'BooleanLiteral',
    originals: ['if (snapshot.reachability === reachability) return true;'],
    replacements: ['false'],
    reason:
      'The changed return value is consumed only by `if (publishNetworkState(state)) eventRevision += 1`. A redundant known observation (snapshot.reachability === reachability) implies an earlier transition already published and moved eventRevision off revisionBeforeSample, and eventRevision is read solely through `eventRevision === revisionBeforeSample` (captured before any event can fire, always 0). The redundant increment is therefore never observable, and the line-101 caller ignores the return value.',
    locations: exactLocations(52, 54, 52, 58),
  },
  {
    file: 'src/lib/network-status.ts',
    mutator: 'ConditionalExpression',
    originals: ["snapshot.reachability === 'offline' && reachability === 'online'"],
    replacements: ['true'],
    reason:
      "The ternary is reached only when reachability changed and is known ('offline'/'online'). snapshot.reachability === 'offline' happens only for offline-to-online transitions — the exact transition the clean code increments on — because unknown observations never publish and a transition into 'offline' never has an offline snapshot. Replacing the second operand with true is the identity on every reachable state.",
    locations: exactLocations(57, 46, 57, 71),
  },
  {
    file: 'src/lib/network-status.ts',
    mutator: 'AssignmentOperator',
    originals: ['if (publishNetworkState(state)) eventRevision += 1;'],
    replacements: ['eventRevision -= 1'],
    reason:
      'eventRevision is only ever read through `eventRevision === revisionBeforeSample`, and revisionBeforeSample is captured immediately after subscription, before any listener can fire, so it is always 0. Both += 1 and -= 1 permanently move eventRevision off 0 on the first published event and it never returns to 0 (single mutation site); the magnitude is never read, so the stale-sample arbitration behaves identically.',
    locations: exactLocations(90, 39, 90, 57),
  },
  {
    file: 'src/lib/network-status.ts',
    mutator: 'OptionalChaining',
    originals: ['subscription?.remove();'],
    replacements: ['subscription.remove'],
    reason:
      'subscription is undefined only when Network.addNetworkStateListener threw during registration; the teardown call sits inside a try/catch whose catch block makes the TypeError from `undefined.remove` a silent no-op — exactly what the optional chain produces. When subscription exists both spellings invoke the same method.',
    locations: exactLocations(111, 7, 111, 27),
  },
  {
    file: 'src/lib/network-status.ts',
    mutator: 'ArrayDeclaration',
    originals: ['useEffect(() => startNetworkStatusMonitoring(), []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The replacement deps array holds one compile-time-constant element; React compares deps elementwise with Object.is across renders, so the value is equal on every render, the effect still runs exactly once per mount, and its cleanup still runs on unmount — identical mount-once behavior to [].',
    locations: exactLocations(124, 51, 124, 53),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["phase: pending.stage === 'feedback-pending' ? 'deferred' : 'ready',"],
    replacements: ['""'],
    reason:
      "The false-branch 'ready' can be replaced by '' unobservably: phase is consumed only by the render branches ('checking'/'error'/'deferred'), the deferred-retry effect ('deferred'), and the router effect's `current.phase !== 'ready' || !current.target` — and every state this expression produces carries target:null (initialState never sets a target; both target-writing setStates pair the target with an explicit phase 'ready'), so '' renders children, mounts no banner, and replaces no route exactly like 'ready'.",
    locations: exactLocations(214, 72, 214, 79),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["phase: shouldCheck ? 'checking' : 'ready',"],
    replacements: ['""'],
    reason:
      "The only unoverridden consumer path seeds initialState with shouldCheck=false; a phase of '' is indistinguishable from 'ready' there because every consumer either tests other phase strings ('checking' render, 'error' render, 'deferred' banner/effect) or is the router effect gated by !current.target, and initialState always has target:null. Every other initialState call site overrides phase in the same object literal.",
    locations: exactLocations(67, 39, 67, 46),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'LogicalOperator',
    originals: ["const identity = `${sessionVersion}:${user?.id ?? 'anonymous'}`;"],
    replacements: ["user?.id && 'anonymous'"],
    reason:
      "`user?.id && 'anonymous'` degrades every signed-in identity to `${sessionVersion}:anonymous` and a signed-out one to `${sessionVersion}:undefined`; both remain distinct per sessionVersion and constant within one session, and user cannot change without a sessionVersion rotation (Auth invariant). The string is otherwise an opaque key — see the empty-template pin for why only equality-change semantics are observable, and they are preserved exactly.",
    locations: exactLocations(99, 41, 99, 64),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["const identity = `${sessionVersion}:${user?.id ?? 'anonymous'}`;"],
    replacements: ['""'],
    reason:
      "The 'anonymous' fallback only re-spells an opaque internal key; identity is consumed solely by checkKey equality and the clear-guard, whose mismatch case is already unobservable (superseded-checkKey state is swapped out by the `current` fallback), and all identity transitions remain keyed by the embedded sessionVersion.",
    locations: exactLocations(99, 53, 99, 64),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: [
      "const checkKey = `${identity}:${shouldCheck ? 'check' : 'skip'}:${retryVersion}:${pendingReplayRevision}`;",
    ],
    replacements: ['""'],
    reason:
      "checkKey is an opaque equality key consumed only by `state.checkKey === checkKey` and the effect dependency array; replacing 'check' with '' keeps check-keyed and skip-keyed runs distinct ('' vs 'skip') and no other segment combination can collide (identity embeds sessionVersion and a UUID, retryVersion and pendingReplayRevision are numbers).",
    locations: exactLocations(107, 49, 107, 56),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: [
      "const checkKey = `${identity}:${shouldCheck ? 'check' : 'skip'}:${retryVersion}:${pendingReplayRevision}`;",
    ],
    replacements: ['""'],
    reason:
      "Same opaque-key argument as the 'check' pin: swapping 'skip' for '' keeps the two shouldCheck regimes distinct ('check' vs '') and every other segment is collision-free, so only equality — which is preserved — is observable.",
    locations: exactLocations(107, 59, 107, 65),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!shouldCheck || userId === undefined) return () => controller.abort();'],
    replacements: ['false'],
    reason:
      'shouldCheck is `!!token && !!user && ...`, so userId = user?.id can only be undefined when user is null, which already makes !shouldCheck true — the mutant leaves the early-return decision entirely to !shouldCheck, which is true in exactly the same cases. User.id is a required string on the User type.',
    locations: exactLocations(139, 25, 139, 45),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ArrowFunction',
    originals: ['if (!shouldCheck || userId === undefined) return () => controller.abort();'],
    replacements: ['() => undefined'],
    reason:
      'On this early-return path the controller was never passed to apiFetch and nothing reads its signal, so aborting on effect re-run or unmount is unobservable; the cleanup exists only to satisfy the effect contract.',
    locations: exactLocations(139, 54, 139, 78),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['true'],
    reason:
      "initialState's third parameter only selects `phase: 'checking'` vs 'ready', and this call site overrides phase with 'ready' in the same object literal, so the seeded value never survives the spread.",
    locations: exactLocations(169, 54, 169, 59),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['""'],
    reason:
      "A phase of '' behaves exactly like 'ready' in every consumer: render branches test only 'checking'/'error'/'deferred', and the router effect's 'ready' test is short-circuited by !current.target, which always holds here because initialState sets target:null.",
    locations: exactLocations(169, 69, 169, 76),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['true'],
    reason:
      'The shouldCheck argument only influences the seeded phase, which this call site immediately overrides with an explicit phase property in the same object literal.',
    locations: exactLocations(176, 58, 176, 63),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['""'],
    reason:
      "'' is indistinguishable from 'ready' for every consumer given target:null (see the line-169 pin).",
    locations: exactLocations(176, 73, 176, 80),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['true'],
    reason: 'Seeded phase is overridden by the explicit phase property in the same object literal.',
    locations: exactLocations(184, 58, 184, 63),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['""'],
    reason:
      "'' is indistinguishable from 'ready' for every consumer given target:null (see the line-169 pin).",
    locations: exactLocations(184, 73, 184, 80),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ['...initialState(identity, checkKey, false),'],
    replacements: ['true'],
    reason:
      "The shouldCheck argument only influences the seeded phase, which the very next line overrides with `phase: pending.stage === 'feedback-pending' ? 'deferred' : 'ready'` in the same object literal.",
    locations: exactLocations(213, 49, 213, 54),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The saved feedback pointer changed');"],
    replacements: ['""'],
    reason:
      'The thrown Error is consumed only by the enclosing catch, which reads instanceof/status/code and never the message; no render, log, or observable reads it.',
    locations: exactLocations(224, 27, 224, 63),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ArrowFunction',
    originals: ['const pending = await loadPendingAssessment().catch(() => null);'],
    replacements: ['() => undefined'],
    reason:
      "Inside the catch block, pending is consumed only via pending?.requestId/pending?.stage (identical for null and undefined under optional chaining) and via the classification's `pending !== null` operands — which are only evaluated after the mismatch guard proved a non-null pointer matching queriedPointer (a nullish pending always mismatches queriedPointer.requestId and re-runs the effect instead), so null vs undefined is indistinguishable.",
    locations: exactLocations(254, 61, 254, 71),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'OptionalChaining',
    originals: ['pending?.stage !== queriedPointer.stage)'],
    replacements: ['pending.stage'],
    reason:
      'This operand sits in the second disjunct of `queriedPointer && (requestId-mismatch || stage-mismatch)` and is evaluated only when the first disjunct is false, i.e. when pending?.requestId === queriedPointer.requestId — impossible for a nullish pending (undefined never equals a UUID string) — so pending is provably non-null whenever the mutated property access executes. Empirically confirmed: all lane tests pass under this mutant.',
    locations: exactLocations(259, 13, 259, 27),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: ['pending !== null &&'],
    replacements: ['true'],
    reason:
      "When queriedPointer is null, branch 1 short-circuits on `queriedPointer?.stage === 'feedback-pending'` before this operand; when queriedPointer is set, a nullish catch-reload pending always mismatches queriedPointer.requestId and returns via the setRetryVersion re-run before classification — so `pending !== null` is only ever evaluated with pending non-null.",
    locations: exactLocations(268, 11, 268, 27),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: ['pending !== null &&'],
    replacements: ['true'],
    reason:
      "Same reachable-state argument as the branch-1 pin: branch 2 evaluates this operand only after its `queriedPointer !== null` prefix passed, and any nullish pending was already diverted by the mismatch guard's re-run.",
    locations: exactLocations(273, 17, 273, 33),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'error' });"],
    replacements: ['true'],
    reason:
      "Seeded phase is overridden by the explicit `phase: 'error'` property in the same object literal.",
    locations: exactLocations(284, 62, 284, 67),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: ["queriedPointer.stage !== 'feedback-pending' &&"],
    replacements: ['true'],
    reason:
      "The else-if is reached only after branch 1 rejected the same (stage, pending, instanceof, status) combination; the only stage value where the mutant differs ('feedback-pending') implies branch 1 failed on pending/instanceof/404, and those same operands fail the else-if's own remaining checks identically, routing to the same error branch. The leading `queriedPointer !== null` operand (a different mutant) stays intact here. Empirically confirmed: all lane tests pass.",
    locations: exactLocations(289, 11, 289, 54),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["queriedPointer.stage !== 'feedback-pending' &&"],
    replacements: ['""'],
    reason:
      "`queriedPointer.stage !== ''` differs from the original only when stage === 'feedback-pending'; a feedback-pending pointer reaching this else-if means branch 1 already failed on one of the shared operands (pending/instanceof/404), which fails the else-if identically, so both variants fall through to the error branch. Stage strings come from the parser and are never ''.",
    locations: exactLocations(289, 36, 289, 54),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['true'],
    reason:
      "Seeded phase is overridden by the explicit `phase: 'ready'` property in the same object literal.",
    locations: exactLocations(293, 58, 293, 63),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'ready' });"],
    replacements: ['""'],
    reason:
      "'' is indistinguishable from 'ready' for every consumer given target:null (see the line-169 pin).",
    locations: exactLocations(293, 73, 293, 80),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'error' });"],
    replacements: ['true'],
    reason:
      "Seeded phase is overridden by the explicit `phase: 'error'` property in the same object literal.",
    locations: exactLocations(295, 58, 295, 63),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ['active = false;'],
    replacements: ['true'],
    reason:
      "The cleanup assigns active and then unconditionally calls controller.abort() in the same synchronous block; active is read only inside stillCurrent's `active && !controller.signal.aborted && ...`, so after any cleanup the aborted flag alone forces stillCurrent() false. Nothing can run between the two statements, so the mutated assignment can never flip a decision.",
    locations: exactLocations(301, 16, 301, 21),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (current.phase !== 'ready' || !current.target) return;"],
    replacements: ['false'],
    reason:
      "current.target is only ever non-null in the two setStates that write `phase: 'ready'` and the target together, and the `current` fallback always substitutes an initialState with target null — so the guard reduces to `!current.target` for every reachable state and the phase operand is redundant.",
    locations: exactLocations(321, 9, 321, 34),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "const returnedToForeground = nextState === 'active' && previousAppState !== 'active';",
    ],
    replacements: ['true'],
    reason:
      "The mutant makes returnedToForeground equal `nextState === 'active'`, differing only for an 'active' event while previousAppState is already 'active'. AppState 'change' notifications report actual transitions, so a duplicate consecutive 'active' cannot arrive; previousAppState becomes 'active' only via an earlier 'active' transition, whose retryOnce either consumed the latch and replaced this effect instance (tearing down the listener at the next commit) or was suppressed by the onlineManager.isOnline() gate — which suppresses the mutant identically.",
    locations: exactLocations(345, 62, 345, 91),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'StringLiteral',
    originals: [
      "const returnedToForeground = nextState === 'active' && previousAppState !== 'active';",
    ],
    replacements: ['""'],
    reason:
      "`previousAppState !== ''` is always true (AppState statuses are never the empty string), so the mutant reduces to `nextState === 'active' && true` — identical to the pinned second-operand mutant: the differing case requires a duplicate consecutive 'active' transition, which the OS never reports, and the isOnline() gate masks the offline remainder.",
    locations: exactLocations(345, 83, 345, 91),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'ConditionalExpression',
    originals: ['value.identity === identity && value.diagnosticReplay?.requestId === requestId'],
    replacements: ['true'],
    reason:
      'The identity operand can only be false for state written under a superseded identity; such state always carries a stale checkKey, so `current` already substitutes a null-replay initialState and the stale card is unrendered — clearing it changes nothing observable, and checkKey can never return to a superseded value (retryVersion, sessionVersion, and pendingReplayRevision are monotonic; the check/skip segment differs across flips). The requestId guard the mutant retains still blocks every clear naming a foreign request.',
    locations: exactLocations(365, 9, 365, 36),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'BooleanLiteral',
    originals: ["setState({ ...initialState(identity, checkKey, false), phase: 'deferred' })"],
    replacements: ['true'],
    reason:
      "Seeded phase is overridden by the explicit `phase: 'deferred'` property in the same object literal.",
    locations: exactLocations(415, 62, 415, 67),
  },
  {
    file: 'src/lib/assessment-replay.ts',
    mutator: 'ConditionalExpression',
    originals: ["typeof questionId !== 'string' ||"],
    replacements: ['false'],
    reason:
      "isUuid type-guards first (`typeof value === 'string' && regex.test(value)`), so it returns false for every non-string without throwing; any non-string questionId therefore already fails `!isUuid(questionId)` in the next disjunct and, being never strictly equal to the string pending.questionId, also the final disjunct — the typeof check is subsumed for every input.",
    locations: exactLocations(67, 5, 67, 35),
  },
  {
    file: 'src/lib/assessment-replay.ts',
    mutator: 'ConditionalExpression',
    originals: ["(cycleId !== null && (typeof cycleId !== 'string' || !isUuid(cycleId))) ||"],
    replacements: ['false'],
    reason:
      'expectedCycleId is null or a parser-validated UUID (parsePendingAssessment admits cycleId only when isUuid holds), so every candidate cycleId this group treats differently — any non-null value that is not exactly that well-formed UUID — already fails the trailing `cycleId !== expectedCycleId` disjunct and throws the same ContractError; the mutant only changes which disjunct catches a malformed value.',
    locations: exactLocations(78, 6, 78, 75),
  },
  {
    file: 'src/lib/assessment-replay.ts',
    mutator: 'LogicalOperator',
    originals: ["(cycleId !== null && (typeof cycleId !== 'string' || !isUuid(cycleId))) ||"],
    replacements: ["typeof cycleId !== 'string' && !isUuid(cycleId)"],
    reason:
      'The ||-to-&& change only matters for a non-null cycleId that is a string non-UUID (inner conjunction then false); such a value differs from expectedCycleId (null or a valid UUID) and fails the trailing strict-equality disjunct identically. Non-strings keep `!isUuid(cycleId)` true (isUuid type-guards), so the conjunction stays true for them.',
    locations: exactLocations(78, 27, 78, 74),
  },
  {
    file: 'src/lib/assessment-replay.ts',
    mutator: 'ConditionalExpression',
    originals: ["(cycleId !== null && (typeof cycleId !== 'string' || !isUuid(cycleId))) ||"],
    replacements: ['false'],
    reason:
      'Reducing the inner check to `cycleId !== null && !isUuid(cycleId)` preserves the verdict for every input: non-null non-strings and non-UUID strings all fail !isUuid, and the only values that newly pass the inner check (none — isUuid is exact) would still need to equal expectedCycleId, which is null or a parser-validated UUID, so the trailing `cycleId !== expectedCycleId` disjunct catches everything the mutant lets through.',
    locations: exactLocations(78, 27, 78, 54),
  },
  {
    file: 'src/lib/assessment-replay.ts',
    mutator: 'ConditionalExpression',
    originals: ["if (!Object.hasOwn(candidate, 'response')) throw new ContractError();"],
    replacements: ['false'],
    reason:
      'For a completed status without `response`, the mutant delegates to parseDiagnosticAnswerResult(undefined) / parseAttemptResult(undefined, …), whose isRecord entry guards throw the same ContractError (types.ts), so the hasOwn pre-check is defense-in-depth with no distinguishing observable — same error class either way.',
    locations: exactLocations(90, 7, 90, 44),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'ObjectLiteral',
    originals: [
      'const FORWARD_INCOMPATIBLE: ForwardIncompatiblePendingAssessment = { forwardIncompatible: true };',
    ],
    replacements: ['{}'],
    reason:
      'FORWARD_INCOMPATIBLE is a private module sentinel consumed exclusively by identity comparison in isForwardIncompatible (value === FORWARD_INCOMPATIBLE). The object never escapes the module: every public surface collapses it to null (parsePendingAssessment, loadPendingAssessment), a boolean (pendingAssessmentIsForwardIncompatible), or branches on its identity (ensurePendingAssessment, loadPendingUnsafe). No test can ever read the forwardIncompatible property value, so an empty object behaves identically.',
    locations: exactLocations(125, 68, 125, 97),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'BooleanLiteral',
    originals: [
      'const FORWARD_INCOMPATIBLE: ForwardIncompatiblePendingAssessment = { forwardIncompatible: true };',
    ],
    replacements: ['false'],
    reason:
      'Same identity-only sentinel: { forwardIncompatible: false } still satisfies every === comparison, and the property value is never read by any code path inside or outside the module (the exported type only describes the shape; the value is never exposed).',
    locations: exactLocations(125, 91, 125, 95),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'ConditionalExpression',
    originals: ['const stageKnown = stageRaw !== undefined && STAGE_SET.has(stageRaw);'],
    replacements: ['true'],
    reason:
      'Line 173 already returned null for any non-string stage, so stageRaw is a string or undefined when line 176 evaluates. STAGE_SET.has uses SameValueZero over a set of strings, so has(undefined) is false, and every member is !== undefined; therefore stageRaw !== undefined && STAGE_SET.has(stageRaw) is true for exactly the inputs where STAGE_SET.has(stageRaw) is true. Replacing the first conjunct with true is semantically identical for every reachable input.',
    locations: exactLocations(176, 22, 176, 44),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'ConditionalExpression',
    originals: ['if (isForwardIncompatible(parsed)) {'],
    replacements: ['false'],
    reason:
      'The FORWARD_INCOMPATIBLE sentinel is a truthy object. Skipping this branch falls straight into the immediately following "if (parsed) { memoryValue = parsed; return parsed; }" (lines 276-279), which performs the byte-identical memoryValue assignment and return; every downstream consumer behaves the same, and the delete path is skipped either way because parsed is truthy.',
    locations: exactLocations(268, 9, 268, 38),
  },
  {
    file: 'src/lib/pending-assessment.ts',
    mutator: 'BlockStatement',
    originals: [
      'if (isForwardIncompatible(parsed)) {\n      // A structurally valid record with a newer-schema enum may point at an\n      // already-paid assessment result. Preserve it: this binary must never\n      // delete it, and a later load must not re-read the store to rediscover\n      // that same forward incompatibility.\n      memoryValue = parsed;\n      return parsed;\n    }',
    ],
    replacements: ['{}'],
    reason:
      'The block only contains comments plus "memoryValue = parsed; return parsed;" duplicated verbatim by the next branch (lines 276-279). The sentinel is truthy, so emptying this block routes forward-incompatible records through that identical branch: same cache write, same returned object, same no-delete outcome.',
    locations: exactLocations(268, 40, 275, 6),
  },
  {
    file: 'src/lib/assessment-replay-provider.tsx',
    mutator: 'LogicalOperator',
    originals: ['active && !controller.signal.aborted && isSessionLeaseCurrent(sessionLease);'],
    replacements: ['active || !controller.signal.aborted'],
    reason:
      'The only code that ever aborts this controller is the effect cleanup at lines 300-303, which sets active = false in the same synchronous block before calling controller.abort(); the line-139 early return aborts a controller whose effect body (and therefore stillCurrent) never ran. So aborted implies active === false, and with active === true the mutated operand reduces to active exactly like the clean expression, while with active === false the cleanup has also aborted (making !controller.signal.aborted false) so both variants evaluate false. The lease conjunct is untouched, so stillCurrent is identical on every reachable state.',
    locations: exactLocations(143, 7, 143, 43),
  },
]);

export const equivalentMutantSourceHashes = Object.freeze({
  'src/lib/assessment-replay.ts':
    '5396510cc1a135929e69ab13a8cba5005ce2c75448783abcd0117ae542d8e84c',
  'src/lib/assessment-replay-provider.tsx':
    '0751a95555c500801a71ab2d81ed9480241a21d0752b913cac1173cded3984c2',
  'src/lib/network-status.ts': '76ca03f5e92ea253d11ef63501bed0827f83ebeb6adf4036a4c62c6733a936f0',
  'src/components/NetworkStatusBanner.tsx':
    '5c6c3f7225fb28ec02311265a8507c5cd3b42e5ac670ff9de1b8f3178ea0aad0',
  'src/components/ClientUpgradeModal.tsx':
    '5361252c79e471ee945ed74391da41ca13235604281ed2b898b404dadc4f69b2',
  'src/lib/identity-validation.ts':
    '3042554493dbd55c47f51ef84b79cf3304f682a73c0c02dc56c86ae10b0f4eb0',
  'src/app/(auth)/welcome.tsx': '40864cb050ddff9465f51fe7fbb1ff2d9193e0df9aba036584ade986542bd7bd',
  'src/app/(auth)/forgot-password.tsx':
    'a0fddf6b1d65ebbed3f255cf5416440d0c0a967d22cc5502dfeb041f55e19754',
  'src/app/(auth)/login.tsx': '7a6e2418de6cc2204a937da5f5da0a7625d73fb0cbf59c441a4df6647fbe5b61',
  'src/app/(auth)/reset-password.tsx':
    'c8938621fd8bc2ae02438f752f328fc4238689b98c4031ce8ebe1caa08398e5f',
  'src/app/(auth)/signup.tsx': '1b88c666afaaf05026ea559fdf4377cc588af0db9951b7d082b41c2fdda0b689',
  'src/app/(tabs)/history.tsx': '4ffa8e061912aaef2e2e9bbdff5d962d8a4f72ab24c42bb618688e44c7f5b373',
  'src/app/(tabs)/home.tsx': '09c18806b28331b2e29eb73e8e4e9521799cd162b1c58f7ec0340f183893388b',
  'src/app/(tabs)/practice/feedback.tsx':
    'd0ba7b42d037009c4c0dbb00afaaed580930acf4bfded5a87b2714328d06b202',
  'src/app/(tabs)/practice/help.tsx':
    '8f0ff56562e81985faeafdc1b6b8ba81982ed22fa60a6b155b1fc2ff20f51bad',
  'src/app/(tabs)/practice/index.tsx':
    '02cd47d82764229d17c975daa31526de32ea2b02dbc64bfbfb9acf91d62b092e',
  'src/app/(tabs)/recordings.tsx':
    '7742b348571da4e2218529916d470144cedb53fa422317d75412063fd9add6d0',
  'src/app/_layout.tsx': '56e012e920b05dcc46aa7289dd53e858b6d9a9072bce948f3901de250c97045b',
  'src/app/diagnostic.tsx': 'a145d406ad725ab35af3e1fe23ec4506afe19c72052efd34d8ae71f30834e429',
  'src/app/index.tsx': 'a923ac178e06ae0add27e4d2285e2265328a7869630eb9856f1433895c693ae0',
  'src/app/settings/change-password.tsx':
    '8c3d1393a002d7b6e3b757d380149448c9ed0290a3dfc8ea884c3ba511e6480d',
  'src/app/settings/delete-account.tsx':
    '5ddf63d3356cce3a3b50f125d0f5e88f76bcf8dbb6e8e16b58bf5dd39ed17c6a',
  'src/app/settings/index.tsx': 'd47c4c6ec4f07f3e7bd62b414d71635c2f6952e49e0ca0a1b5459fd05f562f79',
  'src/components/HistoryNativeAdCard.tsx':
    '87d2fc93c03d95785de6fb8563faa233b563510de176d1a9024445454250087c',
  'src/components/HomeBannerAd.tsx':
    'fadfbcf5d14fe6fcd0a223d395b39bae3c8a52635c89ba61eb2e1bb4744f9e05',
  'src/components/Recorder.tsx': '0ecebb5c66cdc45ec371cc25627763a7c064f54474cc1300e914637adc9061eb',
  'src/components/RecordingPlayback.tsx':
    'baf1575320795ec38eb9c1cdf1b4975422927af033d36cc7637b7778c710e29e',
  'src/lib/ads.tsx': '4db444735e7e7e675332e7d6f86dfa98def9afa941b49099d19dc929b6bd2854',
  'src/lib/api.ts': 'ffefee6a126b87aa0d7982dd8e2dda3f938356f13d4b26ff6419a29323b168e5',
  'src/lib/auth.tsx': '13dd2b33dbd74df5f777612ceb64329b541f6cb40f340d117a52c895710f4e3b',
  'src/lib/daily-reminder.ts': '32f19351ab462674902f1ac99a9c24e7f0ff0081582530573da3a34ba9000853',
  'src/lib/pending-assessment.ts':
    'bcd9c6c647b1cf76750b59773384ab7d04e0068f625d763d1aa65a7c8aebd8da',
  'src/lib/practice-flow.tsx': '8c11a33901e1439953724adfc4fde4811d574ae2ed121d211c73af340ac993f6',
  'src/lib/types.ts': '3f9c363d423475cfac1195598cf0a55d0a20a02a112ca91dae6ac7ea9fa1d7c9',
  'src/lib/use-hardware-back.ts':
    '5475b83704855734d76575346649f1d1df70dcf9c8e48b270d15364425f279f2',
});

export const equivalentMutants = Object.freeze(
  [...redesignRePinnedEquivalents].map((entry, index) => {
    const locations = entry.locations ?? equivalentMutantLocations[index];
    const expected = entry.count ?? 1;
    if (locations === undefined || locations.length !== expected) {
      throw new Error(
        `Equivalent mutant entry ${index} must pin exactly ${expected} exact location(s)`,
      );
    }
    return Object.freeze({
      ...entry,
      replacements: Object.freeze(entry.replacements),
      // One guard can be reported under more than one span: Stryker mutates each
      // AST node, so `typeof x === 'number'` and the `typeof x && isFinite(x)`
      // pair around it arrive as separate mutants with different source text.
      originals: Object.freeze(entry.originals ?? [entry.original]),
      locations,
    });
  }),
);
if (
  equivalentMutantLocations.length + redesignRePinnedEquivalents.length !==
  equivalentMutants.length
) {
  throw new Error(
    'Equivalent mutant location sources account for ' +
      (equivalentMutantLocations.length + redesignRePinnedEquivalents.length) +
      ' entries for ' +
      equivalentMutants.length +
      ' registry entries',
  );
}

function normalize(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

/** Accept either a single `original` span or an `originals` list. */
function sourceSpans(entry) {
  return entry.originals ?? [entry.original];
}

function isPosition(position) {
  return (
    position !== null &&
    typeof position === 'object' &&
    Number.isInteger(position.line) &&
    position.line > 0 &&
    Number.isInteger(position.column) &&
    position.column > 0
  );
}

function isExactLocation(location) {
  return (
    location !== null &&
    typeof location === 'object' &&
    isPosition(location.start) &&
    isPosition(location.end)
  );
}

function locationsEqual(first, second) {
  return (
    first.start.line === second.start.line &&
    first.start.column === second.start.column &&
    first.end.line === second.end.line &&
    first.end.column === second.end.column
  );
}

function assertEntryLocations(entry, index) {
  const expected = expectedMatches(entry);
  if (
    !Array.isArray(entry.locations) ||
    entry.locations.length !== expected ||
    entry.locations.some((location) => !isExactLocation(location))
  ) {
    throw new Error(
      `Equivalence entry ${index} (${entry.file ?? 'unknown file'}) must declare ` +
        `${expected} exact start/end location(s)`,
    );
  }
}

/**
 * How many mutants an entry is allowed to excuse. Some mutators produce more
 * than one mutant at the same AST node and exact span, while other reviewed
 * entries intentionally group several equivalent nodes. Pinning the count makes
 * both additions and removals fail closed.
 */
function expectedMatches(entry) {
  return entry.count ?? 1;
}

/**
 * Partition survivors into those covered by a reviewed equivalence entry and
 * those that are not.
 *
 * An entry must match exactly the number of mutants it declares. Matching fewer
 * means the code it excused has changed; matching more means a mutant that used
 * to be killed has started surviving behind an existing exemption. Both are
 * reported so neither can pass quietly.
 */
export function applyEquivalenceAllowlist(
  survivors,
  entries = equivalentMutants,
  sourceHashesByFile,
) {
  for (const [index, entry] of entries.entries()) assertEntryLocations(entry, index);
  if (sourceHashesByFile !== undefined) {
    for (const [index, entry] of entries.entries()) {
      const sourceHash = sourceHashesByFile[entry.file];
      if (!/^[a-f0-9]{64}$/u.test(sourceHash ?? '')) {
        throw new Error(
          `Equivalence entry ${index} (${entry.file ?? 'unknown file'}) must pin its source hash`,
        );
      }
    }
  }
  const matchCounts = new Map();
  const accepted = [];
  const unexplained = [];

  for (const survivor of survivors) {
    const index = entries.findIndex(
      (entry) =>
        entry.file === survivor.file &&
        (sourceHashesByFile === undefined ||
          survivor.sourceSha256 === sourceHashesByFile[entry.file]) &&
        entry.mutator === survivor.mutatorName &&
        entry.replacements.some(
          (replacement) => normalize(replacement) === normalize(survivor.replacement),
        ) &&
        sourceSpans(entry).some(
          (original) => normalize(original) === normalize(survivor.original),
        ) &&
        entry.locations.some((location) => locationsEqual(location, survivor.location)),
    );
    if (index === -1) unexplained.push(survivor);
    else {
      matchCounts.set(index, (matchCounts.get(index) ?? 0) + 1);
      accepted.push({ ...survivor, reason: entries[index].reason });
    }
  }

  const staleEntries = [];
  for (const [index, entry] of entries.entries()) {
    const matched = matchCounts.get(index) ?? 0;
    const expected = expectedMatches(entry);
    if (matched !== expected) staleEntries.push({ ...entry, matched, expected });
  }
  return { accepted, unexplained, staleEntries };
}
