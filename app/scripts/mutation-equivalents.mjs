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
    locations: exactLocations(67, 54, 67, 65),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeReplayBinding?.replay === diagnosticReplay &&'],
    replacements: ['true'],
    reason:
      'The replay-binding chain is repaired synchronously in the render body before this expression evaluates: a non-null diagnosticReplay always has a fresh binding, and a null replay short-circuits the operand so the optional chain and equality can never diverge observably.',
    locations: exactLocations(89, 5, 89, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['activeReplayBinding?.replay === diagnosticReplay &&'],
    replacements: ['activeReplayBinding.replay'],
    reason:
      'The replay-binding chain is repaired synchronously in the render body before this expression evaluates: a non-null diagnosticReplay always has a fresh binding, and a null replay short-circuits the operand so the optional chain and equality can never diverge observably.',
    locations: exactLocations(89, 5, 89, 32),
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
    locations: exactLocations(101, 5, 101, 50, 104, 5, 104, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['() => currentDiagnosticReplay?.result ?? null,'],
    replacements: ['currentDiagnosticReplay?.result && null'],
    reason:
      "Both replay-seed and identity-reset layout effects run in the same first commit and overwrite result/resultRequestId state from the replay pointer, so the lazy initializer's value never reaches an observable render.",
    locations: exactLocations(101, 11, 101, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['() => currentDiagnosticReplay?.requestId ?? null,'],
    replacements: ['currentDiagnosticReplay?.requestId && null'],
    reason:
      "Both replay-seed and identity-reset layout effects run in the same first commit and overwrite result/resultRequestId state from the replay pointer, so the lazy initializer's value never reaches an observable render.",
    locations: exactLocations(104, 11, 104, 53),
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
    locations: exactLocations(109, 52, 109, 90),
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
    locations: exactLocations(109, 58, 109, 90),
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
    locations: exactLocations(109, 58, 109, 90),
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
    locations: exactLocations(109, 58, 109, 90),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['const [answers, setAnswers] = useState<DiagnosticAnswerSummary[]>([]);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The identity-reset layout effect resets answers in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(110, 69, 110, 71),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const recorderLockedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses recorderLockedRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(112, 36, 112, 41),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [recorderExitLocked, setRecorderExitLocked] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the exit-lock state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(113, 64, 113, 69),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const recorderExitLockedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect and the recorder-owner layout effect both re-falses this ref in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(114, 40, 114, 45),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const logoutBusyRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses logoutBusyRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(115, 32, 115, 37),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [logoutBusy, setLogoutBusy] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the logout busy state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(116, 48, 116, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const practiceStartRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses practiceStartRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(117, 35, 117, 40),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [practiceStartBusy, setPracticeStartBusy] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the practice-start busy state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(118, 62, 118, 67),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'The mount layout effect sets mountedRef true in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(119, 29, 119, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const focusedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The focus effect sets focusedRef true in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(120, 29, 120, 34),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const accountActionRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'The identity-reset layout effect assigns accountActionRef on the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(121, 35, 121, 39),
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
    locations: exactLocations(130, 59, 130, 98),
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
    locations: exactLocations(131, 52, 131, 94),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['currentDiagnosticReplay?.requestId ?? null,'],
    replacements: ['currentDiagnosticReplay?.requestId && null'],
    reason:
      'The replay-seed and identity-reset layout effects overwrite replayResultRequestIdRef from the replay pointer in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(133, 5, 133, 47),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const resultActionBusyRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses resultActionBusyRef in the same first commit, so the useRef initializer never reaches an observable read.',
    locations: exactLocations(137, 38, 137, 43),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [resultActionBusy, setResultActionBusy] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the action-busy state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(138, 60, 138, 65),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const [resultActionError, setResultActionError] = useState(false);'],
    replacements: ['true'],
    reason:
      'The identity-reset layout effect re-falses the action-error state in the same first commit, so the useState initializer never reaches an observable render.',
    locations: exactLocations(139, 62, 139, 67),
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
    locations: exactLocations(146, 25, 155, 4),
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
    locations: exactLocations(148, 18, 154, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;'],
    replacements: ['true'],
    reason:
      'Writing mountedRef true instead of false only affects post-unmount continuations, which every caller additionally fences with identity and lease checks whose values are already stale at that point.',
    locations: exactLocations(149, 28, 149, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['focusedRef.current = false;'],
    replacements: ['true'],
    reason:
      'Writing focusedRef true instead of false only affects post-blur continuations, which renderOwnsWork already rejects through the same focused check that would have read true.',
    locations: exactLocations(150, 28, 150, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'On blur the focus cleanup sets accountActionRef true; a queued account action is still fenced by the focused conjunct inside renderOwnsWork, so the latch write cannot change any reachable decision.',
    locations: exactLocations(151, 34, 151, 38),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      "The mount effect's dependency literal is empty and its callback identity is stable for the process lifetime; a constant element compares equal on every render and the setup/cleanup lifetimes are unchanged.",
    locations: exactLocations(155, 6, 155, 8),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      "The focus cleanup's accountActionRef=true latches actions while blurred, but renderOwnsWork's focused conjunct already rejects every such action; forcing the latch false cannot let a blurred action run.",
    locations: exactLocations(163, 36, 163, 40),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      "The focus effect's dependency literal is empty and its callback identity is stable for the process lifetime; a constant element compares equal on every render and the setup/cleanup lifetimes are unchanged.",
    locations: exactLocations(165, 8, 165, 10),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(false);'],
    replacements: ['true'],
    reason:
      "Every path that renders a result card (recorder result, replay seed, /next effect, advance claim) re-falses the error flag in the same commit that shows the card, so the reset's mutated value is always overwritten before an alert could render.",
    locations: exactLocations(184, 26, 184, 31),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['setAnswers([]);'],
    replacements: ['["Stryker was here"]'],
    reason:
      "Every path that re-establishes a completion level after an identity reset funnels through the /next done branch, which overwrites answers in the same commit, so the reset's seeded array never reaches the reveal.",
    locations: exactLocations(187, 16, 187, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['recorderLockedRef.current = false;'],
    replacements: ['true'],
    reason:
      'The recorder-owner layout effect re-falses recorderLockedRef in the same commit whenever an owner exists, and the only ownerless states reset it before any lock read is reachable.',
    locations: exactLocations(190, 33, 190, 38),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['recorderExitLockedRef.current = false;'],
    replacements: ['true'],
    reason:
      'The recorder-owner layout effect re-falses this ref in the same commit whenever an owner exists; crossing into an ownerless state always changes the owner key, which re-runs that effect and re-falses the ref before an exit action can read it.',
    locations: exactLocations(191, 37, 191, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setRecorderExitLocked(false);'],
    replacements: ['true'],
    reason:
      'The recorder-owner layout effect re-falses the exit-lock state in the same commit whenever an owner exists, and the only ownerless states reset it before any exit read is reachable.',
    locations: exactLocations(192, 27, 192, 32),
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
    locations: exactLocations(197, 18, 199, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['true'],
    reason:
      'The identity key is already stale at cleanup time in every reachable unmount, so whether the ref is nulled or left pointing at the departing key, no surviving callback can satisfy the identity conjunct that would read it.',
    locations: exactLocations(198, 11, 198, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['false'],
    reason:
      'The identity key is already stale at cleanup time in every reachable unmount, so whether the ref is nulled or left pointing at the departing key, no surviving callback can satisfy the identity conjunct that would read it.',
    locations: exactLocations(198, 11, 198, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['activeIdentityRef.current !== identityKey'],
    reason:
      'The identity key is already stale at cleanup time in every reachable unmount, so whether the ref is nulled or left pointing at the departing key, no surviving callback can satisfy the identity conjunct that would read it.',
    locations: exactLocations(198, 11, 198, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (seededReplayKeyRef.current === replayKey) return;'],
    replacements: ['false'],
    reason:
      'A re-published replay with the same requestId reseeds identical state in the same commit; the dedupe only suppresses a redundant identical commit, and the answers reset it guards is re-derived from the same replay pointer.',
    locations: exactLocations(208, 9, 208, 49),
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
    locations: exactLocations(238, 9, 238, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRequestIdRef.current === replayResultRequestIdRef.current'],
    replacements: ['true'],
    reason:
      'The second conjunct is already true for metadata-less recorder results (both refs null) and exactly mirrors the first conjunct for seeded replays; forcing it true cannot admit a case the first conjunct does not already gate.',
    locations: exactLocations(244, 9, 244, 72),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(false);'],
    replacements: ['true'],
    reason:
      'No result card is mounted on the fresh-/next path that runs this reset; every later result resets the flag in the same commit that shows its card.',
    locations: exactLocations(277, 26, 277, 31),
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
    locations: exactLocations(305, 34, 305, 63),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentQuestion !== null &&'],
    replacements: ['true'],
    reason:
      'The only reader of showIntro sits behind a non-null currentQuestion in the same expression chain; forcing the conjunct true cannot change any rendered branch.',
    locations: exactLocations(309, 5, 309, 29),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['(currentProgress?.asked ?? 0) === 0;'],
    replacements: ['currentProgress.asked'],
    reason:
      'The progress operand short-circuits behind introStarted for replayed states (the seed latches it true), and a canonical question always carries non-null progress, so the optional chain never dereferences null.',
    locations: exactLocations(312, 6, 312, 28),
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
    locations: exactLocations(316, 57, 316, 63),
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
    locations: exactLocations(316, 34, 316, 63),
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
    locations: exactLocations(316, 34, 316, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'StringLiteral',
    count: 2,
    originals: ["? `${identityKey}:${showIntro ? 'intro' : 'question'}:${currentQuestion.id}`"],
    replacements: ['""'],
    reason:
      'The intro/question step-key literals are dedupe-only identities that stay distinct within their branch and are never rendered; swapping the literal cannot change which transitions announce or scroll.',
    locations: exactLocations(318, 41, 318, 48, 318, 51, 318, 61),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['questionScrollRef.current?.scrollTo({ y: 0, animated: false });'],
    replacements: ['questionScrollRef.current.scrollTo'],
    reason:
      'The optional chain only guards a null scroll ref that cannot coexist with an announced step: the only refless branches (loading/error) have a null step key, and the announced branches mount the scroll view before the effect runs.',
    locations: exactLocations(349, 7, 349, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (Platform.OS === 'ios') {"],
    replacements: ['true'],
    reason:
      "The Jest React Native preset reports Platform.OS 'ios', so the true-forcing mutant is behaviorally identical on the test platform while the false-forcing mutant is killed by the announcement assertions.",
    locations: exactLocations(354, 9, 354, 30),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),'],
    replacements: ['true'],
    reason:
      "Every callback invoked while the owner key is null is additionally rejected by renderOwnsWork's identity/lease conjuncts, which fail in every reachable ownerless interleaving (unmount, identity change, or user loss).",
    locations: exactLocations(381, 7, 381, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['exact: true,'],
    replacements: ['false'],
    reason:
      'No registered query key extends the cancelled diagnostic-next prefix, so exact and prefix cancellation address the same single query; the flag cannot change which fetch is aborted.',
    locations: exactLocations(400, 14, 400, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArithmeticOperator',
    originals: ['attemptNo: previous.length + 1,'],
    replacements: ['previous.length - 1'],
    reason:
      'attemptNo is only a React list key here: the reveal numbers rows by index, and the mutated sequence stays unique within a session, so no duplicate-key or rendering difference can be observed.',
    locations: exactLocations(410, 22, 410, 41),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'The logoutBusyRef latch set by the same synchronous block already blocks the account action; the accountAction latch is a deliberately redundant second fence whose removal cannot admit the guarded action.',
    locations: exactLocations(494, 32, 494, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['let rearm = false;'],
    replacements: ['true'],
    reason:
      "rearm only re-arms accountActionRef after a same-identity logout failure; on the success path the route replaces away from this screen, so the initializer's value never reaches a reachable decision.",
    locations: exactLocations(497, 17, 497, 22),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeIdentityRef.current === identityKey &&'],
    replacements: ['true'],
    reason:
      'Reaching the forced conjunct requires an account swap mid-logout while this route keeps focus; every identity transition that swaps the account also reroutes or resets the identity refs the surrounding conjuncts check, so the mutated condition can never differ observably.',
    locations: exactLocations(507, 9, 507, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    count: 2,
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['true'],
    reason:
      "The finally's post-boundary setLogoutBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(518, 11, 518, 74, 518, 33, 518, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      "The finally's post-boundary setLogoutBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(518, 11, 518, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (rearm) accountActionRef.current = false;'],
    replacements: ['true'],
    reason:
      'rearm only re-arms accountActionRef after a same-identity logout failure the catch already localized; forcing it true cannot let a stale handler run because renderOwnsWork re-checks focus and identity synchronously.',
    locations: exactLocations(520, 13, 520, 18),
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
    locations: exactLocations(530, 7, 532, 55, 530, 7, 531, 43, 531, 7, 531, 43, 532, 7, 532, 55),
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
    locations: exactLocations(530, 7, 532, 55),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['!renderOwnsWork() ||\n      resultRef.current !== expectedResult ||'],
    replacements: ['!renderOwnsWork() && resultRef.current !== expectedResult'],
    reason:
      'Defense-in-depth behind its only callers: advance() and the acknowledgement continuation re-validate the same refs immediately before commitAdvance, so the duplicated conjunction can never disagree in a reachable interleaving.',
    locations: exactLocations(530, 7, 531, 43),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BlockStatement',
    originals: [') {\n      return;\n    }'],
    replacements: ['{}'],
    reason:
      'Defense-in-depth behind its only callers: advance() and the acknowledgement continuation re-validate the same refs immediately before commitAdvance, so the duplicated conjunction can never disagree in a reachable interleaving.',
    locations: exactLocations(533, 7, 535, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(false);'],
    replacements: ['true'],
    reason:
      'No result card is mounted after commitAdvance clears the result; the alert renders only inside the card, and every later card resets the flag before rendering.',
    locations: exactLocations(542, 26, 542, 31),
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
    locations: exactLocations(564, 7, 566, 42, 564, 7, 565, 21),
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
    locations: exactLocations(564, 7, 566, 42),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['!renderOwnsWork() ||\n      !currentResult ||'],
    replacements: ['!renderOwnsWork() && !currentResult'],
    reason:
      "Shadowed by commitAdvance's own entry guard: a stale advance that passes this weakened check reaches a commitAdvance whose !renderOwnsWork() conjunct still returns before any observable write, and the durable acknowledgement its path would start is pinned by the not-called assertions.",
    locations: exactLocations(564, 7, 565, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRef.current !== currentResult ||'],
    replacements: ['false'],
    reason:
      "Shadowed by commitAdvance's own entry guard: a stale advance that passes this weakened check reaches a commitAdvance whose identity re-validation still returns before any observable write.",
    locations: exactLocations(566, 7, 566, 42),
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
    locations: exactLocations(578, 18, 582, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!userId) {'],
    replacements: ['false'],
    reason:
      'A null userId unmounts every interactive surface before a result card can exist (the screen returns null), so the branch is unreachable behind the render guard.',
    locations: exactLocations(578, 9, 578, 16),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['setResultActionError(true);'],
    replacements: ['false'],
    reason:
      'A null userId unmounts every interactive surface before a result card can exist (the screen returns null), so the branch is unreachable behind the render guard.',
    locations: exactLocations(580, 28, 580, 32),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['mountedRef.current &&\n        activeIdentityRef.current === identityKey &&'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      'The regroup only matters when the first conjuncts disagree in an unreachable direction: the unmount sweep nulls activeIdentityRef before any continuation runs, and the result/request refs are stable across the acknowledgement await because no setter runs between claim and settlement.',
    locations: exactLocations(595, 9, 596, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['activeIdentityRef.current === identityKey &&'],
    replacements: ['true'],
    reason:
      'The identity conjunct is shadowed by the mounted conjunct in every reachable interleaving: unmount nulls the ref in the same sweep that falses mountedRef, and identity changes rerender the route before the continuation settles.',
    locations: exactLocations(596, 9, 596, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRef.current === currentResult &&'],
    replacements: ['true'],
    reason:
      'resultRef cannot change between the advance claim and the acknowledgement settlement: the recorder is unmounted while the card shows, and every refetch path that could clear it also fails the identity/lease conjuncts checked in the same expression.',
    locations: exactLocations(598, 9, 598, 44),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['resultRequestIdRef.current === requestId;'],
    replacements: ['true'],
    reason:
      'resultRequestIdRef cannot change between the advance claim and the acknowledgement settlement: no setter runs in that window, and every path that could clear it also fails the identity/lease conjuncts checked in the same expression.',
    locations: exactLocations(599, 9, 599, 49),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['resultActionBusyRef.current = false;'],
    replacements: ['true'],
    reason:
      "The acknowledgement path's busy-ref write is immediately re-falsed by commitAdvance's own write in the same synchronous block, so a stuck-true value never reaches a reader.",
    locations: exactLocations(603, 39, 603, 44),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['resultActionBusyRef.current = false;'],
    replacements: ['true'],
    reason:
      'The rearm branch runs only after focus loss; every account action is already fenced by the focused conjunct until refocus, and the refocused advance re-falses the ref in the same commit that resumes the card.',
    locations: exactLocations(617, 39, 617, 44),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['practiceStartRef.current ||\n      accountActionRef.current ||'],
    replacements: ['practiceStartRef.current && accountActionRef.current'],
    reason:
      'Every interleaving where the practice/account latches differ also fails a later conjunct: blur sets accountActionRef while dropping focus, and failures reset both flags together, so the regrouped pair cannot change the decision.',
    locations: exactLocations(627, 7, 628, 31),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'The practiceStart latch set in the same synchronous block already blocks every account action; the accountAction latch is a deliberately redundant second fence whose removal cannot admit the guarded action.',
    locations: exactLocations(637, 32, 637, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['practiceStartRef.current = true;'],
    replacements: ['false'],
    reason:
      'The accountAction latch set in the same synchronous block already blocks every account action; the practiceStart latch is a deliberately redundant second fence whose removal cannot admit the guarded action.',
    locations: exactLocations(638, 32, 638, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    count: 2,
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['true'],
    reason:
      "The finally's post-boundary setPracticeStartBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(665, 11, 665, 74, 665, 33, 665, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      "The finally's post-boundary setPracticeStartBusy(false) either targets an unmounted tree (discarded by React) or writes the same false the identity-reset layout effect already applied in the same pass.",
    locations: exactLocations(665, 11, 665, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ObjectLiteral',
    originals: ["{t('diag.introCount', { count: currentProgress.maxQuestions })}"],
    replacements: ['{}'],
    reason:
      "The English catalog copy for diag.introCount is a fixed 'You will answer 2 or 3 questions.' with no count placeholder, so the params object never reaches the rendered string in any locale.",
    locations: exactLocations(852, 37, 852, 76),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['currentProgress.maxQuestions > 0'],
    replacements: ['true'],
    reason:
      "parseDiagnosticNext rejects maxQuestions < 1, so a committed progress always satisfies maxQuestions > 0; the guard's false direction is killed by the asked-fraction assertion while the true direction cannot diverge.",
    locations: exactLocations(877, 21, 877, 53),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: ['currentProgress.maxQuestions > 0'],
    replacements: ['currentProgress.maxQuestions >= 0'],
    reason:
      "parseDiagnosticNext rejects maxQuestions < 1, so a committed progress always satisfies maxQuestions > 0; the guard's false direction is killed by the asked-fraction assertion while the true direction cannot diverge.",
    locations: exactLocations(877, 21, 877, 53),
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
    locations: exactLocations(1087, 19, 1092, 4),
  },

  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BlockStatement',
    originals: ['return () => {\n      active = false;\n    };'],
    replacements: ['{}'],
    reason:
      'Deleting the effect cleanup only allows setSessionNotice to run after unmount, and React 19 discards updates aimed at a detached fiber silently — no warning, no state change, nothing a test can observe. The latch stays rather than depending on that React internal.',
    locations: exactLocations(90, 18, 92, 6),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'BooleanLiteral',
    originals: ['active = false;'],
    replacements: ['true'],
    reason:
      'Same site as the cleanup BlockStatement: leaving the latch true only permits a post-unmount state update, which React 19 discards without any observable effect.',
    locations: exactLocations(91, 16, 91, 21),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    count: 2,
    reason:
      'The login mount and notice effects each receive a dependency literal whose constant element compares equal on every render. Their setup and cleanup lifetimes are unchanged.',
    locations: exactLocations(64, 6, 64, 8, 93, 6, 93, 8),
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
    locations: exactLocations(67, 54, 67, 65),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['const [answers, setAnswers] = useState<DiagnosticAnswerSummary[]>([]);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'Answers are rendered only in the completed-level view, which can be reached only after the identity layout effect has reset this initial array before passive or network publication.',
    locations: exactLocations(110, 69, 110, 71),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['true'],
    reason:
      'On an identity refresh the ref still equals the closing identity; on unmount the earlier outer layout cleanup has already nulled it. Assigning null in either case is immediately overwritten by the next setup or repeats the existing unmount state.',
    locations: exactLocations(198, 11, 198, 52),
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
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["const canonicalName = user?.name ?? '';"],
    replacements: ['"Stryker was here!"'],
    reason:
      'The fallback is rendered only while user is null, when the screen returns null. When a user arrives, the canonical-name layout effect synchronously replaces the hidden seed before interaction.',
    locations: exactLocations(127, 39, 127, 41),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const navigationStartedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The focus effect writes false before a committed screen can receive interaction, so the render-time seed is never the authoritative navigation latch.',
    locations: exactLocations(179, 39, 179, 44),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const nameDirtyRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'The canonical-name layout effect writes false before the input can receive interaction, so this initial value is dead.',
    locations: exactLocations(184, 31, 184, 36),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['[],'],
    replacements: ['["Stryker was here"]'],
    reason:
      'blockingOperationActive reads only refs whose objects are stable for the component lifetime. Either dependency literal is constant, so callback identity and captures are unchanged.',
    locations: exactLocations(202, 5, 202, 7),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [blockingOperationActive, navigation]);'],
    replacements: ['[]'],
    reason:
      'blockingOperationActive and the navigator object are stable within the mounted route, so removing them cannot stale publishNavigationLock.',
    locations: exactLocations(241, 6, 241, 43),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [navigation, screenBusy]);'],
    replacements: ['[]'],
    reason:
      'Every operation synchronously publishes lock and unlock state through its ref latch. This layout effect is a duplicate projection of the same busy state, so dependency-driven repeats cannot change header state.',
    locations: exactLocations(233, 6, 233, 30),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [blockingOperationActive, navigation]);'],
    replacements: ['[]'],
    reason:
      'The beforeRemove effect captures the same stable ref reader and mounted navigator object, so its subscription behavior is unchanged.',
    locations: exactLocations(212, 6, 212, 43),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []),'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The focus callback dependency literal is constant across renders, so the focus lifecycle is identical.',
    locations: exactLocations(250, 8, 250, 10),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      'useLayoutEffect(() => {\n    navigationRef.current = navigation;\n  }, [navigation]);',
    ],
    replacements: ['{}'],
    reason:
      'navigationRef is initialized from the mounted navigator, whose identity is stable for this route. The defensive refresh never supplies a different object.',
    locations: exactLocations(266, 25, 268, 4),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, [navigation]);'],
    replacements: ['[]'],
    reason: 'Same stable-navigation argument as the layout-effect block entry.',
    locations: exactLocations(268, 6, 268, 18),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current !== activeIdentity) {'],
    replacements: ['true'],
    reason:
      'The condition is false only on initial setup, where clearing null/false confirmation state and publishing the already-unlocked header are no-ops. Every later setup follows cleanup setting the identity ref null.',
    locations: exactLocations(270, 9, 270, 53),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (ownsReminderLatch) {'],
    replacements: ['true'],
    reason:
      'When another operation owns the latch, entering this setup body only writes the already-true state. The unchanged ownsReminderLatch remains false in finally, so this mutation cannot release the other owner.',
    locations: exactLocations(536, 11, 536, 28),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['reminderBusyRef.current = true;'],
    replacements: ['false'],
    reason:
      'This assignment runs only when the language change owns the reminder latch. languageBusyRef is already true for that entire interval and independently blocks reminder mutations and navigation, while setReminderBusy(true) still publishes the UI busy state; finally writes the reminder ref false in either version.',
    locations: exactLocations(537, 35, 537, 39),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ObjectLiteral',
    originals: ['const exportArtifact: { current: OwnedPrivateFile | null } = { current: null };'],
    replacements: ['{}'],
    reason:
      'Undefined and null artifact current values are indistinguishable on every pre-file exit; a valid first export page assigns an OwnedPrivateFile before any required dereference.',
    locations: exactLocations(589, 66, 589, 83),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The export session expired.', 'AbortError');"],
    replacements: ['""'],
    reason:
      'The abort message is never rendered or otherwise consumed; the already-aborted controller suppresses the UI error.',
    locations: exactLocations(609, 36, 609, 65),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The export session expired.', 'AbortError');"],
    replacements: ['""'],
    reason:
      'The DOMException name is likewise unobserved because suppression keys off controller.signal.aborted.',
    locations: exactLocations(609, 67, 609, 79),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The export contains an invalid attempt.');"],
    replacements: ['""'],
    reason:
      'The internal invalid-attempt serialization message is sanitized to the same localized export fallback.',
    locations: exactLocations(615, 31, 615, 72),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new Error('The export snapshots are invalid.');"],
    replacements: ['""'],
    reason:
      'The internal invalid-snapshot serialization message is sanitized to the same localized export fallback.',
    locations: exactLocations(627, 31, 627, 66),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ["if (!documentStarted) throw new Error('The export returned no pages.');"],
    replacements: ['false'],
    reason:
      'Without an attempt page, the following attempt/practice-cycle/recording completion guards still throw the same sanitized export failure; with a page this condition is already false.',
    locations: exactLocations(713, 11, 713, 27),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["if (!documentStarted) throw new Error('The export returned no pages.');"],
    replacements: ['""'],
    reason: 'The no-page Error text is sanitized to the same localized export fallback.',
    locations: exactLocations(713, 45, 713, 76),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "if (completedArtifact === null) throw new Error('The export file is unavailable.');",
    ],
    replacements: ['false'],
    reason:
      'documentStarted becomes true only after assigning and writing exportArtifact.current, so the completedArtifact null branch is unreachable.',
    locations: exactLocations(720, 11, 720, 37),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: [
      "if (completedArtifact === null) throw new Error('The export file is unavailable.');",
    ],
    replacements: ['""'],
    reason: 'The missing-artifact Error text is unreachable and sanitized in any case.',
    locations: exactLocations(720, 55, 720, 88),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: ['exportArtifact.current?.release();'],
    replacements: ['exportArtifact.current.release'],
    reason:
      'When no artifact exists, direct dereference throws inside the surrounding best-effort catch; when one exists, both variants release it.',
    locations: exactLocations(739, 9, 739, 40),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || !current.enabled) return;'],
    replacements: ['false'],
    reason:
      'applyReminder repeats the render fence, and hour-step handlers are rendered only while the captured reminder is enabled.',
    locations: exactLocations(900, 9, 900, 47),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || !current.enabled) return;'],
    replacements: ['!renderCanHandle() && !current.enabled'],
    reason:
      'The render fence is repeated by applyReminder and a disabled reminder has no hour-step handler, so weakening this pair is unobservable.',
    locations: exactLocations(900, 9, 900, 47),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['false'],
    reason:
      'retakeTest is invoked only by the confirmation callback immediately after owner and render checks; no await permits busy/logout ownership to change between them.',
    locations: exactLocations(928, 9, 928, 77),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['(!renderCanHandle() || retakeBusyRef.current) && logoutBusyRef.current'],
    reason: 'Same unreachable defensive retake guard as the whole conditional entry.',
    locations: exactLocations(928, 9, 928, 77),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['false'],
    reason: 'Same unreachable defensive retake guard, for its render/busy prefix node.',
    locations: exactLocations(928, 9, 928, 52),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {'],
    replacements: ['!renderCanHandle() && retakeBusyRef.current'],
    reason: 'Same unreachable defensive retake guard, for its render/busy operator node.',
    locations: exactLocations(928, 9, 928, 52),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BlockStatement',
    originals: [
      'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {\n      return false;\n    }',
    ],
    replacements: ['{}'],
    reason: 'The guarded return is unreachable on retakeTest’s sole call path.',
    locations: exactLocations(928, 79, 930, 6),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['return false;'],
    replacements: ['true'],
    reason: 'The guarded return is unreachable on retakeTest’s sole call path.',
    locations: exactLocations(929, 14, 929, 19),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['return true;'],
    replacements: ['false'],
    reason:
      'The false return only asks the confirmation callback to publish the already-locked header once more; retakeBusyRef is already true.',
    locations: exactLocations(976, 12, 976, 16),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderOwnsIdentity()) return;'],
    replacements: ['false'],
    reason:
      'Identity and unmount cleanup clear retakeConfirmingRef first, so the preceding owner check rejects every stale close callback before this guard.',
    locations: exactLocations(995, 11, 995, 32),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderOwnsIdentity()) return;'],
    replacements: ['false'],
    reason:
      'The confirmation owner is cleared on identity loss, so the preceding owner check rejects stale confirm callbacks before this guard.',
    locations: exactLocations(1010, 17, 1010, 38),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (!retakeTest()) publishNavigationLock();'],
    replacements: ['retakeTest()'],
    reason:
      'On the only reachable path retakeTest returns true; the mutation performs one redundant publish of the already-locked header.',
    locations: exactLocations(1012, 17, 1012, 30),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: ["nameDirtyRef.current = value !== (userRef.current?.name ?? '');"],
    replacements: ['userRef.current.name'],
    reason:
      'renderCanHandle on a rendered TextInput implies the current session still has a non-null user, so optional chaining cannot short-circuit.',
    locations: exactLocations(1108, 49, 1108, 70),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["nameDirtyRef.current = value !== (userRef.current?.name ?? '');"],
    replacements: ['"Stryker was here!"'],
    reason:
      'The null-user fallback is unreachable after renderCanHandle succeeds for a rendered profile input.',
    locations: exactLocations(1108, 74, 1108, 76),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: ["const currentName = userRef.current?.name ?? '';"],
    replacements: ['userRef.current.name'],
    reason:
      'renderOwnsIdentity on a rendered profile input implies userRef.current is non-null, so optional chaining cannot short-circuit.',
    locations: exactLocations(1122, 37, 1122, 58),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: ["const currentName = userRef.current?.name ?? '';"],
    replacements: ['"Stryker was here!"'],
    reason:
      'The null-user fallback is unreachable after renderOwnsIdentity succeeds for a rendered profile input.',
    locations: exactLocations(1122, 62, 1122, 64),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'OptionalChaining',
    originals: [
      'onSubmitEditing={() => newPasswordRef.current?.focus()}',
      'onSubmitEditing={() => confirmPasswordRef.current?.focus()}',
    ],
    replacements: ['newPasswordRef.current.focus', 'confirmPasswordRef.current.focus'],
    count: 2,
    reason:
      'Both refs are attached to unconditionally rendered TextInputs in the same tree as the handler. onSubmitEditing can only fire from a committed, mounted tree, by which point React has assigned every ref, so .current is never null where the guard runs.',
    locations: exactLocations(181, 38, 181, 67, 215, 38, 215, 71),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'ObjectLiteral',
    originals: [
      'const [visibleFields, setVisibleFields] = useState<Record<FieldName, boolean>>({\n    current: false,\n    next: false,\n    confirm: false,\n  });',
    ],
    replacements: ['{}'],
    reason:
      'Every read of visibleFields is truthiness-coerced (secureTextEntry={!visibleFields.X}, and a ternary on the toggle), where undefined and false are interchangeable, and the updater !fields[field] yields true from either. The replacement is also not type-valid, so it could not exist in real source.',
    locations: exactLocations(40, 82, 44, 4),
  },
  {
    file: 'src/lib/api.ts',
    mutator: 'Regex',
    originals: ["const bareHost = host.replace(/^\\[|\\]$/g, '');"],
    replacements: ['/\\[|\\]$/g', '/^\\[|\\]/g'],
    reason:
      'host comes from WHATWG URL.hostname, which permits brackets only as the outer delimiters of an IPv6 literal. Dropping either regex anchor therefore cannot change a replacement target.',
    locations: exactLocations(66, 39, 66, 49),
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
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'Signup synchronously sets mountedRef true in its mount layout effect before an event or async continuation can read the seed.',
    locations: exactLocations(64, 29, 64, 33),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'The login navigation-lock publisher is called initially while mounted, and its async-finalizer caller already sits inside an equivalent mountedRef guard.',
    locations: exactLocations(66, 9, 66, 28),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'The signup navigation-lock publisher is called initially while mounted, and its async-finalizer caller already sits inside an equivalent mountedRef guard.',
    locations: exactLocations(73, 9, 73, 28),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'After unmount, weakening the login catch guard only computes safe copy and targets detached React state, which React discards without an external effect.',
    locations: exactLocations(122, 11, 122, 30),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'After unmount, weakening the signup catch guard only computes safe copy and targets detached React state, which React discards without an external effect.',
    locations: exactLocations(127, 11, 127, 30),
  },
  {
    file: 'src/app/(auth)/login.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'In the login finalizer the nested navigation publisher rechecks mountedRef and the remaining setState targets a detached fiber, so forcing the outer guard true cannot publish after unmount.',
    locations: exactLocations(130, 11, 130, 29),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current) {'],
    replacements: ['true'],
    reason:
      'In the signup finalizer the nested navigation publisher rechecks mountedRef and the remaining setState targets a detached fiber, so forcing the outer guard true cannot publish after unmount.',
    locations: exactLocations(137, 11, 137, 29),
  },
  {
    file: 'src/app/(auth)/signup.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The signup mount effect receives a dependency literal whose constant element compares equal on every render, preserving its setup and cleanup lifetime.',
    locations: exactLocations(71, 6, 71, 8),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'Forgot password overwrites the mounted seed to true in a layout effect before any user event or async continuation can observe it.',
    locations: exactLocations(33, 29, 33, 33),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(true);'],
    replacements: ['false'],
    reason:
      'Reset password overwrites the mounted seed to true in a layout effect before any user event or async continuation can observe it.',
    locations: exactLocations(54, 29, 54, 33),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The forgot-password mount layout effect receives a constant dependency literal, so setup and cleanup still run exactly once.',
    locations: exactLocations(40, 6, 40, 8),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The reset-password mount layout effect receives a constant dependency literal, so setup and cleanup still run exactly once.',
    locations: exactLocations(61, 6, 61, 8),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'The forgot-password navigation-lock publisher is synchronous while mounted, and its async finalizer already guards invocation with mountedRef.',
    locations: exactLocations(42, 9, 42, 28),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'The reset-password navigation-lock publisher is synchronous while mounted, and its async finalizer already guards invocation with mountedRef.',
    locations: exactLocations(63, 9, 63, 28),
  },
  {
    file: 'src/app/(auth)/forgot-password.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      'if (mountedRef.current) setSentEmail(requestedEmail);',
      "if (mountedRef.current) setError(userMessageForError(err, t('reset.requestFailed')));",
      'if (mountedRef.current) {',
    ],
    replacements: ['true'],
    count: 3,
    reason:
      'Across forgot-password success, catch, and finally paths, forcing a late mounted check only targets detached React state; the nested navigation publisher retains its own mounted fence.',
    locations: exactLocations(80, 11, 80, 29, 84, 11, 84, 29, 87, 11, 87, 29),
  },
  {
    file: 'src/app/(auth)/reset-password.tsx',
    mutator: 'ConditionalExpression',
    originals: [
      "if (mountedRef.current) setError(userMessageForError(err, t('cp.failed')));",
      'if (mountedRef.current) {',
    ],
    replacements: ['true'],
    count: 2,
    reason:
      'Across reset-password catch and finally paths, forcing a late mounted check only targets detached React state; the nested navigation publisher retains its own mounted fence.',
    locations: exactLocations(115, 11, 115, 29, 118, 11, 118, 29),
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
      112,
      36,
      112,
      41,
      113,
      64,
      113,
      69,
      114,
      40,
      114,
      45,
      115,
      32,
      115,
      37,
      116,
      48,
      116,
      53,
      117,
      35,
      117,
      40,
      118,
      62,
      118,
      67,
      120,
      29,
      120,
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
    locations: exactLocations(119, 29, 119, 33, 121, 35, 121, 39),
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
    locations: exactLocations(146, 25, 155, 4, 148, 18, 154, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
    replacements: ['true'],
    count: 2,
    reason:
      'Each mutated cleanup still leaves the sibling mounted/focus fence false and clears active identity and Recorder ownership.',
    locations: exactLocations(149, 28, 149, 33, 150, 28, 150, 33),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    count: 2,
    reason:
      'At both cleanup sites focusedRef is already false, so renderOwnsWork rejects every account action; refocus setup writes the latch false deliberately.',
    locations: exactLocations(151, 34, 151, 38, 163, 36, 163, 40),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);', '}, []),'],
    replacements: ['["Stryker was here"]'],
    count: 2,
    reason:
      'The mount layout effect and focus callback each receive a constant dependency literal, preserving their lifetimes.',
    locations: exactLocations(155, 6, 155, 8, 165, 8, 165, 10),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['recorderLockedRef.current = false;', 'setRecorderExitLocked(false);'],
    replacements: ['true'],
    count: 2,
    reason:
      'The identity reset writes the interaction-lock ref and visible exit-lock state before a Recorder owner can publish. The later owner layout effect repeats the same reset before controls become actionable.',
    locations: exactLocations(190, 33, 190, 38, 192, 27, 192, 32),
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
    locations: exactLocations(197, 18, 199, 6),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['false'],
    reason:
      'Skipping the dependency cleanup is immediately overwritten by the next setup; on unmount the outer layout cleanup already holds null.',
    locations: exactLocations(198, 11, 198, 52),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'EqualityOperator',
    originals: ['if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;'],
    replacements: ['activeIdentityRef.current !== identityKey'],
    reason:
      'Reversing the cleanup comparison only changes a transient value that the replacement setup immediately overwrites, and repeats null on unmount.',
    locations: exactLocations(198, 11, 198, 52),
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
    locations: exactLocations(238, 9, 238, 50),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),'],
    replacements: ['true'],
    reason:
      'Recorder callbacks are supplied only by the branch with a non-null currentQuestion, so every callback closure captures a non-null owner.',
    locations: exactLocations(381, 7, 381, 21),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['exact: true,'],
    replacements: ['false'],
    reason:
      'Every production diagnostic-next key is the complete three-element session/user tuple; the app creates no descendant key that prefix cancellation could additionally match.',
    locations: exactLocations(400, 14, 400, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['accountActionRef.current = true;'],
    replacements: ['false'],
    reason:
      'logoutBusyRef independently claims the synchronous logout window before accountActionRef is read, so removing this duplicate assignment cannot admit another observable action.',
    locations: exactLocations(494, 32, 494, 36),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'BooleanLiteral',
    originals: ['let rearm = false;'],
    replacements: ['true'],
    reason:
      'rearm remains at its seed only after success or LogoutCleanupError, and Auth logout resets the in-memory session before either outcome settles, removing the protected screen before another action.',
    locations: exactLocations(497, 17, 497, 22),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['true'],
    count: 2,
    reason:
      'A stale finalizer can only repeat setLogoutBusy(false), which is discarded or already reset. rearm can be true only after renderOwnsWork succeeded in the immediately preceding synchronous catch, so both ownership clauses are then true.',
    locations: exactLocations(518, 11, 518, 74, 518, 33, 518, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (mountedRef.current && activeIdentityRef.current === identityKey) {'],
    replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
    reason:
      'As at the paired forced-true sites, the only extra stale state write is discarded/reset and no async boundary separates a rearming catch from this finally.',
    locations: exactLocations(518, 11, 518, 74),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (rearm) accountActionRef.current = false;'],
    replacements: ['true'],
    reason:
      'When rearm is false, logout already synchronously removed the protected session; writing the route-local action latch cannot enable an observable action.',
    locations: exactLocations(520, 13, 520, 18),
  },
  {
    file: 'src/app/diagnostic.tsx',
    mutator: 'OptionalChaining',
    originals: ['(currentProgress?.asked ?? 0) === 0;'],
    replacements: ['currentProgress.asked'],
    reason:
      'showIntro now first requires a non-null currentQuestion. The diagnostic-next contract always couples that question with progress, and local advancement preserves it, so currentProgress is non-null whenever this optional access is evaluated.',
    locations: exactLocations(312, 6, 312, 28),
  },
  {
    file: 'src/app/settings/change-password.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const mountedRef = useRef(false);'],
    replacements: ['true'],
    reason:
      'Change password synchronously sets mountedRef true in its mount layout effect before events can read its seed.',
    locations: exactLocations(51, 29, 51, 34),
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
    file: 'src/app/settings/change-password.tsx',
    mutator: 'ArrayDeclaration',
    originals: ['}, []);'],
    replacements: ['["Stryker was here"]'],
    reason:
      'The change-password mount layout effect receives a constant dependency literal and retains the same setup/cleanup lifetime.',
    locations: exactLocations(58, 6, 58, 8),
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
    file: 'src/app/settings/change-password.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!mountedRef.current) return;'],
    replacements: ['false'],
    reason:
      'After unmount, weakening the password-change catch guard only computes safe copy and targets detached React state; the finally navigation update remains mounted-guarded.',
    locations: exactLocations(111, 11, 111, 30),
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
    originals: ['if (nextCursor !== null) {'],
    replacements: ['true'],
    reason:
      'For a terminal null cursor, the private seenCursors set contains only validated UUID strings, so has(null) is false. The forced branch only adds null before the following null guard returns and discards the set.',
    locations: exactLocations(1252, 9, 1252, 28),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'StringLiteral',
    originals: [
      "throw new DOMException('The export session expired.', 'AbortError');",
      "throw new Error('The export contains an invalid recording.');",
      "if (!recordingsStarted) throw new Error('The recording export returned no pages.');",
    ],
    replacements: ['""'],
    count: 4,
    reason:
      'These locally constructed export failures are non-ApiError exceptions. userMessageForError always replaces them with localized fallback copy, so their message and DOMException name literals cannot reach UI or alter cleanup.',
    locations: exactLocations(
      683,
      36,
      683,
      65,
      683,
      67,
      683,
      79,
      694,
      29,
      694,
      72,
      718,
      47,
      718,
      88,
    ),
  },
  {
    file: 'src/app/settings/index.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!renderCanHandle()) return;'],
    replacements: ['false'],
    reason:
      'toggleReminder immediately delegates to applyReminder, whose first synchronous guard repeats renderCanHandle before any ref, state, notification, or native side effect. The wrapper guard is redundant.',
    locations: exactLocations(895, 9, 895, 27),
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
    file: 'src/app/settings/index.tsx',
    mutator: 'OptionalChaining',
    originals: [
      "languageBusy && languageTarget?.scope === 'ui' && languageTarget.code === lang.code;",
      "languageTarget?.scope === 'native' &&",
    ],
    replacements: ['languageTarget.scope'],
    count: 2,
    reason:
      'languageBusy and its non-null languageTarget are installed and cleared in the same React batches. The leading languageBusy conjunction prevents either direct property access while the target may be null.',
    locations: exactLocations(1176, 31, 1176, 52, 1228, 15, 1228, 36),
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
    locations: exactLocations(3913, 6, 3913, 8),
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
    locations: exactLocations(3715, 71, 3715, 82),
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
    locations: exactLocations(3823, 11, 3823, 15),
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
    locations: exactLocations(3499, 32, 3499, 60),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'StringLiteral',
    originals: ["throw new DOMException('The operation was aborted.', 'AbortError');"],
    replacements: ['""'],
    reviewedMutantId: '2829',
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    locations: exactLocations(3499, 62, 3499, 74),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'LogicalOperator',
    originals: ['throw lastCapacityError ?? new Error();'],
    replacements: ['lastCapacityError && new Error()'],
    reviewedMutantId: '2779',
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    locations: exactLocations(3456, 15, 3456, 47),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (cancelPersistence) await cancelPersistence.promise;'],
    replacements: ['true'],
    reviewedMutantId: '2826',
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    locations: exactLocations(3498, 13, 3498, 30),
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
    locations: exactLocations(3549, 86, 3549, 91),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['cancelRequestedRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2878',
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    locations: exactLocations(3550, 40, 3550, 45),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['cancelRequestedRef.current = false;'],
    replacements: ['true'],
    reviewedMutantId: '2890',
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    locations: exactLocations(3567, 38, 3567, 43),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'BooleanLiteral',
    originals: ['const cleared = requestId ? await clearRequestTracking(requestId) : true;'],
    replacements: ['false'],
    reviewedMutantId: '2889',
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    locations: exactLocations(3566, 77, 3566, 81),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (requestId) {'],
    replacements: ['true'],
    reviewedMutantId: '2954',
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    locations: exactLocations(3579, 13, 3579, 22),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (uploadControllerRef.current === controller) {'],
    replacements: ['true'],
    reviewedMutantId: '2969',
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    locations: exactLocations(3655, 11, 3655, 53),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (startIsBlocked()) return Promise.resolve();'],
    replacements: ['false'],
    reviewedMutantId: '2993',
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    locations: exactLocations(3688, 9, 3688, 25),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!controller) return;'],
    replacements: ['false'],
    reviewedMutantId: '3008',
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    locations: exactLocations(3709, 9, 3709, 20),
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
    locations: exactLocations(3801, 15, 3804, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['previewPlayerRef.current !== null,'],
    replacements: ['true'],
    reviewedMutantId: '3112',
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    locations: exactLocations(3812, 11, 3812, 44),
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
    locations: exactLocations(3827, 15, 3830, 8),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (previewPlayerRef.current === player) {'],
    replacements: ['true'],
    reviewedMutantId: '3143',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3847, 17, 3847, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['previewRewindPromiseRef.current === rewind &&'],
    replacements: ['true'],
    reviewedMutantId: '3157',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3862, 17, 3862, 59),
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
    locations: exactLocations(3862, 17, 3863, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['previewPlayerRef.current === player'],
    replacements: ['true'],
    reviewedMutantId: '3159',
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    locations: exactLocations(3863, 17, 3863, 52),
  },
  {
    file: 'src/components/Recorder.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!player) return;'],
    replacements: ['false'],
    reviewedMutantId: '3175',
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    locations: exactLocations(3887, 9, 3887, 16),
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
    locations: exactLocations(63, 11, 63, 17),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'StringLiteral',
    originals: ["const unitId = adUnitIdFor('historyNative');"],
    replacements: ['""'],
    reviewedMutantId: '33',
    reason:
      "adUnitIdFor is a closed binary selector: only 'homeBanner' selects the Home key, so every other value selects the same History key.",
    locations: exactLocations(68, 34, 68, 49),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!native || !unitId) {'],
    replacements: ['false'],
    reviewedMutantId: '35',
    reason:
      'A true history activation has just required the same cached native module and validated unit ID; neither can disappear in production before these synchronous reads.',
    locations: exactLocations(69, 11, 69, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'LogicalOperator',
    originals: ['if (!native || !unitId) {'],
    replacements: ['!native && !unitId'],
    reviewedMutantId: '36',
    reason:
      'Both operands are false after a successful provider activation, so OR and AND produce the same result.',
    locations: exactLocations(69, 11, 69, 29),
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
    locations: exactLocations(69, 31, 72, 8),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['true'],
    reviewedMutantId: '40',
    reason:
      'This statement is inside the unreachable post-activation capability fallback, so changing its nested active guard cannot alter behavior.',
    locations: exactLocations(70, 13, 70, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['false'],
    reviewedMutantId: '41',
    reason:
      'This statement is inside the unreachable post-activation capability fallback, so changing its nested active guard cannot alter behavior.',
    locations: exactLocations(70, 13, 70, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'BooleanLiteral',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['false'],
    reviewedMutantId: '42',
    reason:
      'This setter is inside the unreachable post-activation capability fallback, so changing its assigned value cannot alter behavior.',
    locations: exactLocations(70, 35, 70, 39),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setLoadFailed(true);'],
    replacements: ['true'],
    reviewedMutantId: '50',
    reason:
      'While mounted active is true; after cleanup the extra failure setter targets a detached component instance and React discards it without a visible effect.',
    locations: exactLocations(85, 13, 85, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (!native) return null;'],
    replacements: ['false'],
    reviewedMutantId: '83',
    reason:
      'nativeAd is assigned only after reading a non-null cached native module; production has no cache-reset operation between that assignment and render.',
    locations: exactLocations(126, 7, 126, 14),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'ConditionalExpression',
    originals: ['if (active) setValidatedForFocus(ready);'],
    replacements: ['true'],
    reviewedMutantId: '129',
    reason:
      'While mounted the latch is true; after cleanup the continuation can only target a detached component instance, whose state update React 19 discards without a visible effect.',
    locations: exactLocations(34, 11, 34, 17),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'BlockStatement',
    originals: ['return () => {\n      active = false;\n    };'],
    replacements: ['{}'],
    reviewedMutantId: '131',
    reason:
      'Removing this cleanup only permits the same post-unmount update to a detached component; it cannot validate the newly mounted focus-cycle instance.',
    locations: exactLocations(36, 18, 38, 6),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'BooleanLiteral',
    originals: ['active = false;'],
    replacements: ['true'],
    reviewedMutantId: '132',
    reason:
      'Leaving the detached instance latch true has the same unobservable post-unmount state-update behavior as removing its cleanup block.',
    locations: exactLocations(37, 16, 37, 21),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'ConditionalExpression',
    originals: ['setMeasuredSlotWidth((current) => (current === measured ? current : measured));'],
    replacements: ['false'],
    reviewedMutantId: '159',
    reason:
      'When current equals measured, returning measured is the same primitive value as returning current; when unequal, both the original and mutant return measured.',
    locations: exactLocations(53, 46, 53, 66),
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
]);

export const equivalentMutantSourceHashes = Object.freeze({
  'src/app/(auth)/forgot-password.tsx':
    '04a04ff536d058fdc04a497584134239e8d22666a748306f4ea688c4689f405b',
  'src/app/(auth)/login.tsx': '3f3a7b61c934f8157e1bdb14e917671dfcd2b77b3ef57f1864a4cee45691dc31',
  'src/app/(auth)/reset-password.tsx':
    'dd5218dbe0f2a6cddc52e7b831d943fac061c6c01f3a5a8405767062c0a310e6',
  'src/app/(auth)/signup.tsx': '43d01b18d18a3e66196608349fb49c2444dea392305912c8f761c96880741464',
  'src/app/(tabs)/history.tsx': 'bf2b9583ceb92d94dac9acacd11322f8be5544dd49fd1ecb6fbaaa4cb66c9cd5',
  'src/app/(tabs)/home.tsx': 'f58828b066e1995b399da32a69cb7a010cffb2c80877a99fd5d911881d051608',
  'src/app/(tabs)/practice/feedback.tsx':
    '4835379e7f8e332aad6f1b2563ea0a935e7204a32e2ca5c7dcbc04bc11be84ac',
  'src/app/(tabs)/practice/help.tsx':
    '9711de185fba2e5a81aa62066ea69d4ad8af063d5238d8ae364021714925b562',
  'src/app/(tabs)/practice/index.tsx':
    '407cedcfcdfeb740fee06fb5cc2aab29ca7b1341f0c87bbc9abc3fdcf9f3f6fc',
  'src/app/(tabs)/recordings.tsx':
    'bfee55f01a13b5db64f3d69c4a30fa74970057c764bdda4bf2e337e36f29d9ab',
  'src/app/_layout.tsx': 'a88a9601e77be315ae6fc1a1ea5769792fe9847e59603f668b20b18f448bad5c',
  'src/app/diagnostic.tsx': '8b4b807c35eaaff3aa95ee3349ffb8559874d9ec9d4e3af3444be9130a0cf8e0',
  'src/app/index.tsx': 'fa7ed31cce2df2f60b280b78ae62dbbb5882fce0af591ecb8d44c7ef7d76ee3a',
  'src/app/settings/change-password.tsx':
    '4bc072df7153fb2c4cb9ba1c6fd7c43666ad381951457331856d086b9fbd44f1',
  'src/app/settings/delete-account.tsx':
    '2bf5661a5e11267e07e1c8eeecb38e36f29c909194b37b128d0ca2a1e35185ef',
  'src/app/settings/index.tsx': '7ad66f0b715cab4e767ba3bdfba1abb85bced5007ceba8017b37a5ce920712a3',
  'src/components/HistoryNativeAdCard.tsx':
    'd59b6004911e90c3699b6231fc9324df6b22d87202c32c914c0f478b36f9e283',
  'src/components/HomeBannerAd.tsx':
    'cfe7eb99363fcb307402dc6a61787f16c0461d5efc9322b653abf1996e17ce9a',
  'src/components/Recorder.tsx': '0f546b93d66d9475e5bb603c1ab18612ecbb1d5f5cea72e56c2b8ac20a5338f9',
  'src/components/RecordingPlayback.tsx':
    '182f5fa26ce1ba7a32a39cb39b99bcb5a5d6f47483373ec51585195f40aa4988',
  'src/lib/ads.tsx': '4db444735e7e7e675332e7d6f86dfa98def9afa941b49099d19dc929b6bd2854',
  'src/lib/api.ts': 'ffefee6a126b87aa0d7982dd8e2dda3f938356f13d4b26ff6419a29323b168e5',
  'src/lib/auth.tsx': 'c8a37c8fc85f5529c26288aedd3eb8e2e3310628207c84ebd058c85d528b2c4f',
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
