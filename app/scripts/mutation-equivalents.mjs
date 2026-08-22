/**
 * Mutants that no test can kill, with the reason each one is unkillable.
 *
 * Why this file exists rather than `// Stryker disable` comments — two reasons,
 * both learned the hard way:
 *
 * 1. The directives are scoped to a line and a mutator name, but these sites put
 *    a killable and an unkillable mutant on the same line under the same mutator.
 *    In `boundedSeconds`, forcing `value > 0` to true is detectable while forcing
 *    the `typeof value === 'number'` beside it is not, and both are
 *    `ConditionalExpression` on one line. A comment would silence real coverage.
 * 2. A `disable all` whose matching `restore` fails to take effect is invisible.
 *    One such pair in `login.tsx` silenced 157 mutants from the disable comment
 *    to the end of the file, and the campaign still reported a 100% score.
 *
 * So exemptions live here, and `Ignored` is not treated as a resolved status.
 *
 * Entries are matched on file, mutator, replacement, source text, and the exact
 * start/end location Stryker reported for the mutated node. They must excuse
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
const equivalentMutantLocations = Object.freeze([
  exactLocations(51, 18, 53, 6),
  exactLocations(52, 16, 52, 21),
  exactLocations(54, 6, 54, 8),
  exactLocations(179, 10, 179, 35, 179, 10, 179, 61),
  exactLocations(179, 10, 179, 61),
  exactLocations(313, 5, 313, 36),
  exactLocations(353, 38, 353, 70),
  exactLocations(395, 5, 395, 38),
  exactLocations(396, 5, 396, 40),
  exactLocations(457, 7, 457, 31, 488, 5, 488, 29),
  exactLocations(719, 11, 721, 4),
  exactLocations(731, 36, 731, 71),
  exactLocations(737, 7, 737, 25),
  exactLocations(774, 5, 774, 30),
  exactLocations(156, 7, 156, 25),
  exactLocations(28, 37, 28, 62, 45, 47, 45, 72),
  exactLocations(121, 6, 121, 8),
  exactLocations(93, 7, 93, 33),
  exactLocations(93, 35, 95, 4, 121, 17, 123, 4),
  exactLocations(121, 7, 121, 15),
  exactLocations(122, 34, 122, 55),
  exactLocations(34, 54, 34, 65),
  exactLocations(46, 52, 46, 57),
  exactLocations(47, 58, 47, 60),
  exactLocations(74, 11, 74, 52),
  exactLocations(48, 5, 48, 44),
  exactLocations(75, 6, 75, 44),
  exactLocations(175, 11, 175, 33),
  exactLocations(175, 51, 175, 74),
  exactLocations(26, 8, 26, 10),
  exactLocations(99, 6, 99, 8, 196, 6, 196, 8),
  exactLocations(189, 5, 189, 7),
  exactLocations(112, 6, 112, 30),
  exactLocations(195, 36, 195, 47),
  exactLocations(108, 11, 108, 52),
  exactLocations(178, 18, 180, 6),
  exactLocations(179, 19, 179, 23),
  exactLocations(40, 10, 40, 35),
  exactLocations(54, 11, 56, 4),
  exactLocations(57, 7, 57, 14),
  exactLocations(19, 7, 19, 31),
  exactLocations(19, 7, 19, 31),
  exactLocations(19, 7, 19, 16),
  exactLocations(81, 6, 81, 8, 82, 62, 82, 64, 83, 77, 83, 79),
  exactLocations(58, 9, 58, 16),
  exactLocations(59, 19, 59, 41),
  exactLocations(95, 6, 95, 8),
  exactLocations(98, 9, 98, 27),
  exactLocations(98, 9, 98, 27),
  exactLocations(110, 9, 110, 30, 110, 9, 110, 48),
  exactLocations(110, 9, 110, 30, 110, 9, 110, 48),
  exactLocations(207, 35, 207, 63, 345, 31, 345, 59, 356, 31, 356, 59),
  exactLocations(329, 47, 329, 73, 329, 47, 329, 73),
  exactLocations(329, 47, 329, 73),
  exactLocations(302, 35, 302, 43, 302, 46, 302, 55),
  exactLocations(80, 6, 80, 8),
  exactLocations(83, 9, 83, 34),
  exactLocations(83, 9, 83, 34),
  exactLocations(201, 29, 201, 37, 201, 40, 201, 49),
  exactLocations(211, 47, 211, 55, 211, 57, 211, 72),
  exactLocations(102, 11, 102, 17),
  exactLocations(106, 18, 108, 6),
  exactLocations(107, 16, 107, 21),
  exactLocations(109, 6, 109, 8),
  exactLocations(232, 9, 232, 18),
  exactLocations(237, 9, 237, 39),
  exactLocations(237, 9, 237, 39),
  exactLocations(418, 39, 418, 65, 435, 39, 435, 65),
  exactLocations(214, 32, 214, 45),
  exactLocations(143, 38, 143, 67, 176, 38, 176, 71),
  exactLocations(38, 82, 42, 4),
  exactLocations(45, 39, 45, 49, 45, 39, 45, 49),
  exactLocations(121, 10, 121, 35),
  exactLocations(312, 10, 312, 35),
  exactLocations(312, 10, 312, 61),
  exactLocations(321, 7, 321, 14),
  exactLocations(337, 18, 337, 50, 337, 26, 337, 50),
  exactLocations(337, 18, 337, 50),
  exactLocations(350, 7, 350, 32),
  exactLocations(350, 7, 351, 29),
  exactLocations(388, 50, 388, 72),
  exactLocations(640, 52, 640, 74),
  exactLocations(444, 13, 444, 39),
  exactLocations(629, 7, 629, 36),
]);

const recorderEquivalentMutantGroups = Object.freeze([
  {
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    mutants: [
      ['733', 'ConditionalExpression', 'if (!uri) return;', 'false', 767, 7, 767, 11],
      [
        '1042',
        'ConditionalExpression',
        'if (candidateUri) candidates.add(candidateUri);',
        'true',
        1270,
        9,
        1270,
        21,
      ],
      ['1103', 'ConditionalExpression', 'if (uri) ownedUris.add(uri);', 'true', 1354, 11, 1354, 14],
      [
        '2261',
        'ConditionalExpression',
        'if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);',
        'true',
        2574,
        11,
        2574,
        31,
      ],
    ],
  },
  {
    reason:
      'On the only mount for which recordingCacheJanitorHasRun is false, no audio owner can predate the passive janitor; if another Recorder already acquired the session, its earlier mount already set the process-once flag. The owner operand therefore cannot decide the result.',
    mutants: [
      [
        '774',
        'ConditionalExpression',
        'activeAudioSessionOwner !== null,',
        'false',
        820,
        7,
        820,
        39,
      ],
    ],
  },
  {
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    mutants: [
      ['793', 'BooleanLiteral', 'const mountedRef = useRef(true);', 'false', 865, 29, 865, 33],
      ['794', 'BooleanLiteral', 'const unmountingRef = useRef(false);', 'true', 866, 32, 866, 37],
    ],
  },
  {
    reason:
      'The later AppState mount effect writes mountedRef true before external app-state events or async continuations can publish. Writing false in this earlier mount assignment is therefore overwritten before it can be the sole lifecycle currency.',
    mutants: [
      ['1177', 'BooleanLiteral', 'mountedRef.current = true;', 'false', 1480, 26, 1480, 30],
    ],
  },
  {
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    mutants: [
      [
        '828',
        'BooleanLiteral',
        'const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);',
        'true',
        931,
        74,
        931,
        79,
      ],
      [
        '830',
        'BooleanLiteral',
        'const [previewPlaying, setPreviewPlaying] = useState(false);',
        'true',
        935,
        56,
        935,
        61,
      ],
      [
        '1975',
        'StringLiteral',
        "const announcedPhaseRef = useRef<Phase>('idle');",
        '""',
        2300,
        43,
        2300,
        49,
      ],
    ],
  },
  {
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    mutants: [
      [
        '833',
        'BooleanLiteral',
        'const hasObservedRecordingRef = useRef(false);',
        'true',
        950,
        42,
        950,
        47,
      ],
      [
        '834',
        'BooleanLiteral',
        'const recordingInterruptionHandledRef = useRef(false);',
        'true',
        951,
        50,
        951,
        55,
      ],
      [
        '836',
        'BooleanLiteral',
        'const cancelRequestedRef = useRef(false);',
        'true',
        955,
        37,
        955,
        42,
      ],
      [
        '837',
        'BooleanLiteral',
        'const assessmentPostedRef = useRef(false);',
        'true',
        956,
        38,
        956,
        43,
      ],
      [
        '839',
        'BooleanLiteral',
        'const previewPlayRequestedRef = useRef(false);',
        'true',
        982,
        42,
        982,
        47,
      ],
    ],
  },
  {
    reason:
      'useLayoutEffect replaces the callback and identity snapshots in the same commit before focus or passive effects, user input, native events, or promise continuations can invoke their consumers. The initial object literal is therefore dead.',
    mutants: [
      [
        '842',
        'ObjectLiteral',
        'const callbacksRef = useRef({\n    disabled,\n    isStartBlocked,\n    onError,\n    onInteractionLockChange,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    parseResult,\n  });',
        '{}',
        990,
        31,
        1000,
        4,
      ],
      [
        '878',
        'ObjectLiteral',
        'const identityRef = useRef({ ownerId, endpoint, questionId });',
        '{}',
        1040,
        30,
        1040,
        63,
      ],
    ],
  },
  {
    reason:
      'The injected array element is a string with no uri or takeGeneration property. Every quarantine predicate compares those properties with a real URI or numeric generation, so it never matches and is eventually shifted out without side effects.',
    mutants: [
      [
        '795',
        'ArrayDeclaration',
        'const terminalEventQuarantineRef = useRef<TerminalEventQuarantine[]>([]);',
        '["Stryker was here"]',
        872,
        72,
        872,
        74,
      ],
    ],
  },
  {
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    mutants: [
      [
        '804',
        'OptionalChaining',
        'recorderStillRecording = currentRecorderRef.current?.isRecording === true;',
        'currentRecorderRef.current.isRecording',
        885,
        34,
        885,
        73,
      ],
      [
        '1030',
        'OptionalChaining',
        'previewListenerRef.current?.remove();',
        'previewListenerRef.current.remove',
        1248,
        7,
        1248,
        41,
      ],
      ['1032', 'OptionalChaining', 'player?.remove();', 'player.remove', 1256, 7, 1256, 21],
    ],
  },
  {
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    mutants: [
      [
        '819',
        'ArithmeticOperator',
        'setRecordingStatusVersion((version) => version + 1);',
        'version - 1',
        910,
        48,
        910,
        59,
      ],
      [
        '1060',
        'AssignmentOperator',
        'recoveryGenerationRef.current += 1;',
        'recoveryGenerationRef.current -= 1',
        1297,
        5,
        1297,
        39,
      ],
      [
        '1132',
        'AssignmentOperator',
        'lifecycleEpochRef.current += 1;',
        'lifecycleEpochRef.current -= 1',
        1399,
        7,
        1399,
        37,
      ],
      [
        '1334',
        'UpdateOperator',
        'const generation = ++recoveryGenerationRef.current;',
        '--recoveryGenerationRef.current',
        1652,
        24,
        1652,
        55,
      ],
    ],
  },
  {
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    mutants: [
      ['820', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 913, 6, 913, 8],
      ['852', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1010, 6, 1010, 8],
      ['877', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1039, 6, 1039, 8],
      ['888', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1080, 6, 1080, 8],
      ['902', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1094, 6, 1094, 8],
      ['957', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1175, 6, 1175, 8],
      ['962', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1179, 5, 1179, 7],
      [
        '968',
        'ArrayDeclaration',
        'const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);',
        '["Stryker was here"]',
        1182,
        89,
        1182,
        91,
      ],
      [
        '970',
        'ArrayDeclaration',
        'const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);',
        '["Stryker was here"]',
        1184,
        81,
        1184,
        83,
      ],
      ['983', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1195, 6, 1195, 8],
      ['1006', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1216, 6, 1216, 8],
      ['1020', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1227, 6, 1227, 8],
      ['1036', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1261, 6, 1261, 8],
      ['1039', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1266, 6, 1266, 8],
      ['1043', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1274, 6, 1274, 8],
      ['1049', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1284, 6, 1284, 8],
      ['1058', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1294, 6, 1294, 8],
      ['1068', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1306, 6, 1306, 8],
      ['1098', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1345, 5, 1345, 7],
      ['1836', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2174, 6, 2174, 8],
      ['1922', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2255, 6, 2255, 8],
    ],
  },
  {
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    mutants: [
      ['915', 'ArrayDeclaration', '[publishOperation],', '[]', 1113, 5, 1113, 23],
      ['926', 'ArrayDeclaration', '[publishOperation],', '[]', 1131, 5, 1131, 23],
      ['1026', 'ArrayDeclaration', '[updatePhase],', '[]', 1241, 5, 1241, 18],
      [
        '1931',
        'ArrayDeclaration',
        'useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);',
        '[]',
        2263,
        49,
        2263,
        71,
      ],
      [
        '2073',
        'ArrayDeclaration',
        '[\n      adoptOwnedRecording,\n      clearWebAutoStopTimer,\n      discardRecording,\n      restoreOwnedAudioMode,\n      updatePhase,\n    ],',
        '[]',
        2371,
        5,
        2377,
        6,
      ],
    ],
  },
  {
    reason:
      'audioSessionCanBeAcquired plus the awaited global release promise ensures recording start reaches acquisition only with a null owner; Recorder phase and operation currency exclude re-acquiring a session already owned by this instance. The null test is always true.',
    mutants: [
      [
        '848',
        'ConditionalExpression',
        'if (activeAudioSessionOwner === null) {',
        'true',
        1004,
        9,
        1004,
        41,
      ],
    ],
  },
  {
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    mutants: [
      [
        '870',
        'ConditionalExpression',
        'if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {',
        'true',
        1026,
        13,
        1026,
        71,
      ],
      ['872', 'OptionalChaining', 'resolveRelease?.();', 'resolveRelease()', 1031, 11, 1031, 29],
      [
        '875',
        'ConditionalExpression',
        'if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;',
        'true',
        1035,
        11,
        1035,
        53,
      ],
    ],
  },
  {
    reason:
      'operationOwnerRef is non-null only while the in-flight set is non-empty. Ordinary begin is already rejected by the count and superseding begin ignores both checks, so the owner boolean cannot independently decide admission.',
    mutants: [
      [
        '909',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1101,
        11,
        1101,
        45,
      ],
    ],
  },
  {
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    mutants: [
      [
        '918',
        'ConditionalExpression',
        '!canResumeRecorderOperation(\n          operationOwnerRef.current !== null,\n          operationsInFlightRef.current.has(token),\n          operationsInFlightRef.current.size,\n        )',
        'false',
        1119,
        9,
        1123,
        10,
      ],
      [
        '920',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1120,
        11,
        1120,
        45,
      ],
      ['923', 'BlockStatement', ') {\n        return false;\n      }', '{}', 1124, 9, 1126, 8],
      ['924', 'BooleanLiteral', 'return false;', 'true', 1125, 16, 1125, 21],
    ],
  },
  {
    reason:
      'A stale token can finish only beneath a newer superseding lifecycle token. Clearing ownership early still leaves another in-flight token, so count-based admission remains blocked, the lock remains active, and lifecycle cleanup has no later owner-current read. The defensive identity guard is unobservable.',
    mutants: [
      [
        '929',
        'ConditionalExpression',
        'if (operationOwnerRef.current === token) operationOwnerRef.current = null;',
        'true',
        1136,
        9,
        1136,
        44,
      ],
    ],
  },
  {
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    mutants: [
      [
        '936',
        'ConditionalExpression',
        'if (mountedRef.current) setOperationActive(stillActive);',
        'true',
        1138,
        9,
        1138,
        27,
      ],
      ['1018', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 1223, 9, 1223, 27],
      [
        '1024',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1238,
        11,
        1238,
        29,
      ],
      [
        '1034',
        'ConditionalExpression',
        'if (mountedRef.current) setPreviewPlaying(false);',
        'true',
        1260,
        9,
        1260,
        27,
      ],
      [
        '1276',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1578,
        13,
        1578,
        31,
      ],
      [
        '1332',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(false);',
        'true',
        1651,
        9,
        1651,
        27,
      ],
      [
        '1918',
        'ConditionalExpression',
        'if (active) setReduceMotion(enabled);',
        'true',
        2247,
        13,
        2247,
        19,
      ],
      ['1921', 'BooleanLiteral', 'active = false;', 'true', 2252, 16, 2252, 21],
      [
        '2153',
        'ConditionalExpression',
        'if (mountedRef.current) setPermissionDenied(false);',
        'true',
        2482,
        9,
        2482,
        27,
      ],
    ],
  },
  {
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    mutants: [
      [
        '1011',
        'ConditionalExpression',
        "next === 'uploading' || next === 'recovering' ? monotonicNow() : null;",
        'true',
        1222,
        7,
        1222,
        52,
      ],
      [
        '1944',
        'ConditionalExpression',
        'if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);',
        'true',
        2272,
        11,
        2272,
        29,
      ],
    ],
  },
  {
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    mutants: [
      ['1056', 'BlockStatement', '} catch {\n      return false;\n    }', '{}', 1291, 13, 1293, 6],
      [
        '1472',
        'BlockStatement',
        '} catch {\n          return false;\n        }',
        '{}',
        1796,
        17,
        1798,
        10,
      ],
      [
        '2748',
        'ArrowFunction',
        'const promise = markPendingAssessmentCancelled(requestId).catch(() => false);',
        '() => undefined',
        3128,
        71,
        3128,
        82,
      ],
    ],
  },
  {
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    mutants: [
      [
        '1074',
        'ConditionalExpression',
        'if (nativeStopPromiseRef.current === promise) {',
        'true',
        1311,
        11,
        1311,
        51,
      ],
      [
        '1172',
        'ConditionalExpression',
        'if (lifecycleStopPromiseRef.current === promise) {',
        'true',
        1459,
        11,
        1459,
        54,
      ],
    ],
  },
  {
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    mutants: [
      [
        '1086',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1329,
        15,
        1329,
        86,
      ],
      [
        '1088',
        'LogicalOperator',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'settled && completion && completion.takeGeneration !== takeGeneration',
        1329,
        15,
        1329,
        86,
      ],
      [
        '1089',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1329,
        27,
        1329,
        85,
      ],
      ['1093', 'BooleanLiteral', 'settled = true;', 'false', 1330, 21, 1330, 25],
    ],
  },
  {
    reason:
      'Prepared-recorder disposal runs under an operation while no recording is adoptable. A terminal callback published without suppression can only bump the status version; the consuming effect rejects it through its phase and operation guards.',
    mutants: [
      [
        '1100',
        'BooleanLiteral',
        'suppressRecordingStatusRef.current = true;',
        'false',
        1349,
        42,
        1349,
        46,
      ],
    ],
  },
  {
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    mutants: [
      [
        '1129',
        'ConditionalExpression',
        'if (!operationToken) return Promise.resolve();',
        'false',
        1397,
        9,
        1397,
        24,
      ],
      ['1223', 'ConditionalExpression', 'if (!operationToken) return;', 'false', 1521, 9, 1521, 24],
    ],
  },
  {
    reason:
      'recoverPending calls beginOperation only after operationIsInFlight synchronously proved the owner set empty. With no current owner or token, superseding and ordinary begin have identical admission and ownership effects, so the first false argument is redundant.',
    mutants: [
      [
        '1220',
        'BooleanLiteral',
        'const operationToken = beginOperation(false, false);',
        'true',
        1520,
        43,
        1520,
        48,
      ],
    ],
  },
  {
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    mutants: [
      [
        '1168',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        1453,
        41,
        1453,
        46,
      ],
      [
        '2054',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2355,
        41,
        2355,
        46,
      ],
      [
        '2306',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2626,
        41,
        2626,
        46,
      ],
      [
        '2362',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2682,
        41,
        2682,
        46,
      ],
      [
        '2408',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2713,
        41,
        2713,
        46,
      ],
    ],
  },
  {
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    mutants: [
      ['1180', 'BooleanLiteral', 'unmountingRef.current = true;', 'false', 1483, 31, 1483, 35],
      ['1181', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 1484, 28, 1484, 33],
    ],
  },
  {
    reason:
      'On unmount, the earlier layout-effect cleanup has already set unmounting true and mounted false before this passive cleanup runs. On a passive-effect dependency refresh, React runs cleanup and the replacement setup together before async continuations, and setup immediately restores mounted true. This duplicate false assignment is never the sole lifecycle guard.',
    mutants: [
      ['1896', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 2220, 28, 2220, 33],
    ],
  },
  {
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    mutants: [
      [
        '1188',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder;',
        'true',
        1493,
        7,
        1493,
        46,
      ],
      [
        '2340',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2654,
        7,
        2654,
        46,
      ],
      [
        '2458',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2775,
        7,
        2775,
        46,
      ],
    ],
  },
  {
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    mutants: [
      [
        '1198',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1495,
        11,
        1495,
        44,
      ],
      [
        '1201',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1495,
        11,
        1495,
        66,
      ],
      [
        '1202',
        'LogicalOperator',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        "phaseRef.current === 'recovering' || mountedRef.current",
        1495,
        11,
        1495,
        66,
      ],
    ],
  },
  {
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    mutants: [
      [
        '1212',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1504,
        9,
        1504,
        45,
      ],
      [
        '1252',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1549,
        9,
        1549,
        45,
      ],
      [
        '1260',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1565,
        11,
        1565,
        47,
      ],
      [
        '1326',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1632,
        11,
        1632,
        47,
      ],
    ],
  },
  {
    reason:
      'No second recovery attempt can start while this loading operation token remains in flight. The attempt ref is therefore this exact symbol or already null from invalidation, and assigning null unconditionally cannot clear a newer attempt.',
    mutants: [
      [
        '1228',
        'ConditionalExpression',
        'if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;',
        'true',
        1526,
        11,
        1526,
        57,
      ],
    ],
  },
  {
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    mutants: [
      [
        '1244',
        'ConditionalExpression',
        'const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1544,
        66,
        1544,
        100,
      ],
      [
        '1320',
        'ConditionalExpression',
        'activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1627,
        41,
        1627,
        75,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    mutants: [
      ['1278', 'ConditionalExpression', 'if (pending === null) {', 'false', 1585, 9, 1585, 25],
      [
        '1281',
        'BlockStatement',
        'if (pending === null) {\n      finishLoading();\n      return;\n    }',
        '{}',
        1585,
        27,
        1588,
        6,
      ],
    ],
  },
  {
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    mutants: [
      [
        '1337',
        'ConditionalExpression',
        'recoveryGenerationRef.current === generation,',
        'true',
        1655,
        9,
        1655,
        53,
      ],
      [
        '1340',
        'ConditionalExpression',
        'activeRecoveryOwner === instanceId,',
        'true',
        1657,
        9,
        1657,
        43,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad already proved operation and lifecycle currency, and the reconcile-stage callback is reached without an intervening await. Callback re-entry is followed immediately by the separate post-callback isCurrent guard before effects.',
    mutants: [
      ['1363', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1678, 13, 1678, 25],
    ],
  },
  {
    reason:
      'The validated prepared-stage path reaches this check without an await or re-entry. releaseUnclaimedHandoff then performs the sole await and immediately rechecks isCurrent before publishing, so the outer guard is redundant.',
    mutants: [
      ['1396', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1703, 13, 1703, 25],
    ],
  },
  {
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    mutants: [
      ['1450', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1777, 36, 1777, 41],
      ['1469', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1785, 36, 1785, 41],
    ],
  },
  {
    reason:
      'This call occurs only inside the not-routeMatches branch. finishUnresolved independently tests not-routeMatches when choosing whether a recording can be retained, so changing allowRecordedRetry cannot change the selected branch.',
    mutants: [
      [
        '1678',
        'BooleanLiteral',
        "await finishUnresolved(translate('recorder.errInterruptedSaved'), false);",
        'true',
        1980,
        85,
        1980,
        90,
      ],
    ],
  },
  {
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    mutants: [
      ['1703', 'ConditionalExpression', 'if (isCurrent()) {', 'true', 2009, 23, 2009, 34],
      ['1764', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 2064, 25, 2064, 37],
    ],
  },
  {
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    mutants: [
      [
        '1772',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errRejected')),",
        '""',
        2074,
        63,
        2074,
        85,
      ],
      [
        '1777',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errNotSent')),",
        '""',
        2082,
        63,
        2082,
        84,
      ],
    ],
  },
  {
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    mutants: [
      [
        '1855',
        'ConditionalExpression',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'true',
        2195,
        17,
        2195,
        54,
      ],
      [
        '1856',
        'LogicalOperator',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'identityMatches || mountedRef.current',
        2195,
        17,
        2195,
        54,
      ],
    ],
  },
  {
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    mutants: [
      [
        '1925',
        'ConditionalExpression',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        'true',
        2260,
        9,
        2260,
        29,
      ],
      [
        '1927',
        'StringLiteral',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        '""',
        2260,
        19,
        2260,
        29,
      ],
    ],
  },
  {
    reason:
      'The effect depends only on phase, so React never reruns it with an unchanged phase. The ref is assigned on every run, making the equality early return unreachable.',
    mutants: [
      [
        '1977',
        'ConditionalExpression',
        'if (announcedPhaseRef.current === phase) return;',
        'false',
        2302,
        9,
        2302,
        44,
      ],
    ],
  },
  {
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    mutants: [
      ['2023', 'ConditionalExpression', 'pulseSteps.length !== 2 ||', 'false', 2328, 7, 2328, 30],
      [
        '2025',
        'ConditionalExpression',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'false',
        2328,
        7,
        2335,
        8,
      ],
      [
        '2027',
        'LogicalOperator',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.length !== 2 && pulseSteps.some(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2328,
        7,
        2335,
        8,
      ],
      [
        '2029',
        'ArrowFunction',
        '(step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '() => undefined',
        2330,
        9,
        2334,
        40,
      ],
      [
        '2031',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        'false',
        2331,
        11,
        2332,
        42,
      ],
      [
        '2032',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        '!Number.isFinite(step.toValue) && !Number.isFinite(step.duration)',
        2331,
        11,
        2332,
        42,
      ],
      [
        '2033',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        'false',
        2331,
        11,
        2333,
        29,
      ],
      [
        '2034',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration)) && step.duration <= 0',
        2331,
        11,
        2333,
        29,
      ],
      [
        '2035',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        'false',
        2331,
        11,
        2334,
        40,
      ],
      [
        '2037',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0) && step.useNativeDriver !== true',
        2331,
        11,
        2334,
        40,
      ],
      ['2039', 'ConditionalExpression', 'step.duration <= 0 ||', 'false', 2333, 11, 2333, 29],
      [
        '2040',
        'EqualityOperator',
        'step.duration <= 0 ||',
        'step.duration < 0',
        2333,
        11,
        2333,
        29,
      ],
      [
        '2042',
        'ConditionalExpression',
        'step.useNativeDriver !== true,',
        'false',
        2334,
        11,
        2334,
        40,
      ],
      [
        '2045',
        'BlockStatement',
        ') {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2336,
        7,
        2339,
        6,
      ],
      [
        '2047',
        'ConditionalExpression',
        'if (animations.length === 0) {',
        'false',
        2341,
        9,
        2341,
        32,
      ],
      [
        '2050',
        'BlockStatement',
        'if (animations.length === 0) {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2341,
        34,
        2344,
        6,
      ],
    ],
  },
  {
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    mutants: [
      [
        '2103',
        'ConditionalExpression',
        'recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2417,
        11,
        2417,
        38,
      ],
      [
        '2343',
        'ConditionalExpression',
        'const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2657,
        29,
        2657,
        56,
      ],
    ],
  },
  {
    reason:
      'Every lifecycle epoch change first installs a superseding operation token. Current operation-token currency therefore already proves the captured epoch equals the live epoch, making this equality operand redundant.',
    mutants: [
      [
        '2140',
        'ConditionalExpression',
        'lifecycleEpoch === lifecycleEpochRef.current,',
        'true',
        2465,
        9,
        2465,
        53,
      ],
    ],
  },
  {
    reason:
      'When no prompt was required, response is the current permission and app context is already active; the extra foreground wait resolves immediately and adopting the same epoch is a no-op. When prompted, the original branch already runs.',
    mutants: [['2184', 'ConditionalExpression', 'if (prompted) {', 'true', 2500, 11, 2500, 19]],
  },
  {
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    mutants: [
      [
        '2187',
        'ConditionalExpression',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        'false',
        2503,
        13,
        2503,
        56,
      ],
      [
        '2188',
        'LogicalOperator',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        '!identityIsCurrent() && !mountedRef.current',
        2503,
        13,
        2503,
        56,
      ],
      [
        '2206',
        'ConditionalExpression',
        'if (!isCurrentLifecycle()) return;',
        'false',
        2518,
        11,
        2518,
        32,
      ],
    ],
  },
  {
    reason:
      'isCurrentLifecycle was checked immediately before this denied-permission branch and includes recorderContextIsActive, which proves mountedRef.current. The nested mounted condition is always true.',
    mutants: [
      ['2213', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 2520, 13, 2520, 31],
    ],
  },
  {
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    mutants: [
      ['2258', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2563, 37, 2563, 42],
      ['2266', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2578, 37, 2578, 42],
    ],
  },
  {
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    mutants: [
      [
        '2279',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'false',
        2597,
        11,
        2597,
        27,
      ],
      [
        '2280',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'true',
        2597,
        11,
        2597,
        27,
      ],
    ],
  },
  {
    reason:
      'After record succeeds, the remaining statements are non-throwing ref and Set updates plus guarded phase publication; the catch cannot observe prepared again. Its reset value is dead.',
    mutants: [['2290', 'BooleanLiteral', 'prepared = false;', 'true', 2611, 18, 2611, 23]],
  },
  {
    reason:
      'Start cleanup preserves the prior active URI whenever it is non-null, so activeUriRef equals previousUri in every recorded fallback case. If both are null, forcing only the equality true still leaves the trailing previousUri falsy and selects idle. The phase result is unchanged.',
    mutants: [
      [
        '2311',
        'ConditionalExpression',
        "updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');",
        'true',
        2630,
        21,
        2630,
        57,
      ],
    ],
  },
  {
    reason:
      'The stop reason is used only to distinguish the literal auto value. Every other value follows the user-stop path, so an empty string and the user default are behaviorally identical.',
    mutants: [
      [
        '2323',
        'StringLiteral',
        "const stopRecording = async (reason: 'user' | 'auto' = 'user') => {",
        '""',
        2642,
        58,
        2642,
        64,
      ],
    ],
  },
  {
    reason:
      'Identity changes synchronously start a superseding lifecycle operation before stale work can continue. A current operation token therefore already implies assessment identity still matches, so weakening this conjunction admits no distinct state.',
    mutants: [
      [
        '2334',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2652,
        7,
        2653,
        84,
      ],
      [
        '2452',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2773,
        7,
        2774,
        84,
      ],
    ],
  },
  {
    reason:
      'completedTakeIsValid receives the URI separately and rejects null before considering fileIsUsable. Forcing the preceding URI non-null operand true cannot make a null completion valid.',
    mutants: [
      [
        '2363',
        'ConditionalExpression',
        'const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);',
        'true',
        2683,
        28,
        2683,
        40,
      ],
    ],
  },
  {
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    mutants: [
      ['2442', 'ConditionalExpression', 'if (!uri) {', 'false', 2757, 9, 2757, 13],
      [
        '2444',
        'BlockStatement',
        "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      endOperation(operationToken);\n      return;\n    }",
        '{}',
        2757,
        15,
        2762,
        6,
      ],
      ['2445', 'StringLiteral', "updatePhase('idle');", '""', 2758, 19, 2758, 25],
      [
        '2446',
        'StringLiteral',
        "callbacksRef.current.onError(translate('recorder.errNoRecording'));",
        '""',
        2759,
        46,
        2759,
        71,
      ],
      ['2791', 'ConditionalExpression', 'if (!uri) return;', 'false', 3184, 11, 3184, 15],
    ],
  },
  {
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    mutants: [
      [
        '2464',
        'LogicalOperator',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        "controller.signal.reason && new DOMException('The operation was aborted.', 'AbortError')",
        2782,
        11,
        2782,
        99,
      ],
      [
        '2465',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2782,
        56,
        2782,
        84,
      ],
      [
        '2466',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2782,
        86,
        2782,
        98,
      ],
      [
        '2574',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2933,
        32,
        2933,
        60,
      ],
      [
        '2575',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2933,
        62,
        2933,
        74,
      ],
    ],
  },
  {
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    mutants: [
      [
        '2528',
        'LogicalOperator',
        'throw lastCapacityError ?? new Error();',
        'lastCapacityError && new Error()',
        2891,
        15,
        2891,
        47,
      ],
    ],
  },
  {
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    mutants: [
      [
        '2573',
        'ConditionalExpression',
        'if (cancelPersistence) await cancelPersistence.promise;',
        'true',
        2932,
        13,
        2932,
        30,
      ],
      [
        '2623',
        'BooleanLiteral',
        'const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;',
        'true',
        2984,
        86,
        2984,
        91,
      ],
    ],
  },
  {
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    mutants: [
      ['2624', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 2985, 40, 2985, 45],
      ['2636', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 2999, 38, 2999, 43],
    ],
  },
  {
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    mutants: [
      [
        '2635',
        'BooleanLiteral',
        'const cleared = requestId ? await clearRequestTracking(requestId) : true;',
        'false',
        2998,
        77,
        2998,
        81,
      ],
      ['2687', 'ConditionalExpression', 'if (requestId) {', 'true', 3052, 15, 3052, 24],
    ],
  },
  {
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    mutants: [
      [
        '2702',
        'ConditionalExpression',
        'if (uploadControllerRef.current === controller) {',
        'true',
        3068,
        11,
        3068,
        53,
      ],
    ],
  },
  {
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    mutants: [
      [
        '2724',
        'ConditionalExpression',
        'if (startIsBlocked()) return Promise.resolve();',
        'false',
        3101,
        9,
        3101,
        25,
      ],
    ],
  },
  {
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    mutants: [
      ['2739', 'ConditionalExpression', 'if (!controller) return;', 'false', 3122, 9, 3122, 20],
    ],
  },
  {
    reason:
      'The rewind promise owner handles rejection by releasing the player and reporting once. After finally clears the request flag, the following identity and playability guard returns, so this duplicate catch return has no effect.',
    mutants: [
      [
        '2773',
        'BlockStatement',
        '} catch {\n        // The rewind owner releases the player and reports the failure once.\n        return;\n      } finally {',
        '{}',
        3162,
        15,
        3165,
        8,
      ],
    ],
  },
  {
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    mutants: [
      [
        '2783',
        'ConditionalExpression',
        'previewPlayerRef.current !== null,',
        'true',
        3173,
        11,
        3173,
        44,
      ],
    ],
  },
  {
    reason:
      'If createAudioPlayer throws, continuing reaches addListener on the unset local; the second catch performs best-effort cleanup and emits the same single play-failed callback. The two paths converge.',
    mutants: [
      [
        '2794',
        'BlockStatement',
        "} catch {\n        callbacksRef.current.onError(translate('recorder.errPlayFailed'));\n        return;\n      }",
        '{}',
        3188,
        15,
        3191,
        8,
      ],
    ],
  },
  {
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    mutants: [
      [
        '2814',
        'ConditionalExpression',
        'if (previewPlayerRef.current === player) {',
        'true',
        3208,
        17,
        3208,
        52,
      ],
      [
        '2824',
        'ConditionalExpression',
        'previewRewindPromiseRef.current === rewind &&',
        'true',
        3223,
        17,
        3223,
        59,
      ],
      [
        '2828',
        'LogicalOperator',
        'previewRewindPromiseRef.current === rewind &&\n                previewPlayerRef.current === player',
        'previewRewindPromiseRef.current === rewind || previewPlayerRef.current === player',
        3223,
        17,
        3224,
        52,
      ],
      [
        '2829',
        'ConditionalExpression',
        'previewPlayerRef.current === player',
        'true',
        3224,
        17,
        3224,
        52,
      ],
    ],
  },
  {
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    mutants: [
      ['2844', 'ConditionalExpression', 'if (!player) return;', 'false', 3248, 9, 3248, 16],
    ],
  },
]);
/**
 * Recorder IDs are audit labels from the completed canonical report. Runtime
 * matching intentionally ignores them and remains pinned to mutator,
 * replacement, source text, and exact start/end location.
 */
const recorderReviewedMutantIds = new Set();
const recorderEquivalentMutants = Object.freeze(
  recorderEquivalentMutantGroups.flatMap(({ reason, mutants }) =>
    mutants.map(
      ([
        reviewedMutantId,
        mutator,
        original,
        replacement,
        startLine,
        startColumn,
        endLine,
        endColumn,
      ]) => {
        if (recorderReviewedMutantIds.has(reviewedMutantId)) {
          throw new Error(`Recorder equivalence review repeats mutant ID ${reviewedMutantId}`);
        }
        recorderReviewedMutantIds.add(reviewedMutantId);
        return {
          file: 'src/components/Recorder.tsx',
          reviewedMutantId,
          mutator,
          original,
          replacements: [replacement],
          reason,
          locations: exactLocations(startLine, startColumn, endLine, endColumn),
        };
      },
    ),
  ),
);

if (recorderReviewedMutantIds.size !== 187) {
  throw new Error(
    `Recorder equivalence review has ${recorderReviewedMutantIds.size} mutants; expected 187`,
  );
}

export const equivalentMutants = Object.freeze(
  [
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'BlockStatement',
      original: 'return () => {\n      active = false;\n    };',
      replacements: ['{}'],
      reason:
        'Deleting the effect cleanup only allows setSessionNotice to run after unmount, and React 19 discards updates aimed at a detached fiber silently — no warning, no state change, nothing a test can observe. The latch stays rather than depending on that React internal.',
    },
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'BooleanLiteral',
      original: 'active = false;',
      replacements: ['true'],
      reason:
        'Same site as the cleanup BlockStatement: leaving the latch true only permits a post-unmount state update, which React 19 discards without any observable effect.',
    },
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'A constant dependency literal compares equal on every render, so React runs the effect exactly once whichever constant array is supplied. Already pinned by consumeSessionExpiredNotice being called once.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: "return typeof value === 'number' && Number.isFinite(value);",
      replacements: ['true'],
      count: 2,
      reason:
        'isNumber. Number.isFinite is itself a type check, so forcing either operand true is a no-op, and all seven call sites immediately apply Number.isInteger, which implies typeof number and finite. The helper cannot change an outcome.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'LogicalOperator',
      original: "return typeof value === 'number' && Number.isFinite(value);",
      replacements: ["typeof value === 'number' || Number.isFinite(value)"],
      reason:
        'Differs only for NaN and ±Infinity, which every call site rejects through the adjacent Number.isInteger.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'value.progress.maxQuestions < 1 ||',
      replacements: ['false'],
      reason:
        'Acceptance also requires !(asked < 0) and !(asked >= maxQuestions), i.e. maxQuestions > asked >= 0, which for an integer already forces maxQuestions >= 1. This clause can never be the sole rejecter.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'if (value.level !== undefined || value.nextQuestion === undefined) {',
      replacements: ['false'],
      reason:
        'Falling through reaches parseWith(value.nextQuestion, isQuestion), which throws the identical ContractError for undefined.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: "typeof value.passed !== 'boolean' ||",
      replacements: ['false'],
      reason:
        'Subsumed by `value.passed !== value.score >= PRACTICE_PASS_SCORE`: a strict !== against a boolean can only be satisfied by an actual boolean, so any non-boolean still throws.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: "typeof value.mastered !== 'boolean' ||",
      replacements: ['false'],
      reason:
        'Same shape as the passed check, subsumed by the strict comparison against PRACTICE_MASTER_SCORE.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'value.next === undefined',
      replacements: ['false'],
      count: 2,
      reason:
        'Both sites fall through to parseWith(value.next, isPracticeQuestionPayload), which throws the same ContractError.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'BlockStatement',
      original: '} catch {\n    return false;\n  }',
      replacements: ['{}'],
      reason:
        'safeUploadUrl is consumed only inside an && chain, where undefined and false are indistinguishable.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'OptionalChaining',
      original:
        "return safeAudioKey(audioKey) && audioKey.split('/')[1]?.toLowerCase() === ownerId.toLowerCase();",
      replacements: ["audioKey.split('/')[1].toLowerCase"],
      reason:
        'The right operand only evaluates once safeAudioKey has passed, and its regex requires two / separators, so index 1 is always a string. The ?. is unreachable-safe.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'if (entries.length < 2 || entries.length > 32) return null;',
      replacements: ['false'],
      reason:
        'The caller requires uploadFields.key === value.audioKey and uploadFields[Content-Type] === value.contentType, which cannot both hold with fewer than two distinct entries. The count is pinned at one because the sibling whole-condition mutant on this line is killed today.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'audioKeyExt !== undefined &&',
      replacements: ['true'],
      reason:
        "With audioKeyExt undefined the next clause becomes endsWith('.undefined'), and safeAudioKey has already forced the key to end in one of m4a/mp3/wav/ogg/webm/flac.",
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'ConditionalExpression',
      // Deliberately the whole line: `items.length === 0` also opens lines 171
      // and 189, where the same mutation IS killed. Keying on the enclosing line
      // is what keeps this exemption off those live-tested siblings.
      original: 'if (items.length === 0 && historyQuery.isPending) {',
      replacements: ['true'],
      reason:
        'isPending holds exactly while data is undefined (no initialData, placeholderData or select on this query), and items is data?.pages.flatMap(...) ?? [], so isPending implies items.length === 0. The conjunction and isPending alone denote the same predicate in every reachable state; the !user early return removes the disabled-query case.',
    },
    {
      file: 'src/app/_layout.tsx',
      mutator: 'OptionalChaining',
      originals: [
        'const canPractice = hasProfile && user?.diagnosticCompleted === true;',
        '<Stack.Protected guard={hasProfile && user?.diagnosticCompleted === false}>',
      ],
      replacements: ['user.diagnosticCompleted'],
      count: 2,
      reason:
        'Both are the right operand of `hasProfile && ...`, and hasProfile already includes !!user. && short-circuits, so the node is evaluated only when user is truthy: the ?. can never guard anything and the plain . can never throw.',
    },
    {
      file: 'src/app/_layout.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'QueryFocusBridge’s effect dependency array. Both literals are constant and identical on every render, so the effect fires once on mount and cleans up once on unmount either way.',
    },
    {
      file: 'src/app/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!user && meQuery.isPending) {',
      replacements: ['false'],
      reason:
        'Falling through this guard reaches the byte-identical guard at `if (!profile)`, which renders the same LoadingView with the same label. The rendered tree is unchanged.',
    },
    {
      file: 'src/app/index.tsx',
      mutator: 'BlockStatement',
      // The mutant spans the whole `if` block, and the two guards' conditions
      // differ, so each gets its own entry rather than one shared span.
      originals: [
        "if (!user && meQuery.isPending) {\n    return <LoadingView label={t('gate.loadingProfile')} />;\n  }",
        "if (!profile) {\n    return <LoadingView label={t('gate.loadingProfile')} />;\n  }",
      ],
      replacements: ['{}'],
      count: 2,
      reason:
        'The two loading-profile guards are byte-identical duplicates, so emptying either block still lands on the other and renders the same LoadingView. The second is additionally unreachable — see the ConditionalExpression entry for `if (!profile)`.',
    },
    {
      file: 'src/app/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!profile) {',
      replacements: ['false'],
      reason:
        'profile is `user ?? meQuery.data`. Reaching this line means neither (!user && isPending) nor (!user && isError) held, so either user is truthy or the query succeeded — and TanStack Query v5 treats an undefined resolution as an error, with no initialData configured, so success implies data is defined. !profile is therefore unreachable. The guard is kept as a fail-safe on the routing gate rather than deleted to satisfy the tool.',
    },
    {
      file: 'src/app/index.tsx',
      mutator: 'StringLiteral',
      original: "return <LoadingView label={t('gate.loadingProfile')} />;",
      replacements: ['""'],
      reason:
        'The twin of this literal on the reachable guard IS killed by the loading-profile tests; only the copy inside the unreachable `if (!profile)` block survives, which is why the count here is one.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'StringLiteral',
      original: "const identityKey = `${sessionVersion}:${userId ?? 'anonymous'}`;",
      replacements: ['""'],
      reason:
        'The placeholder is only distinguishable if a real userId collides with it, but User.id is uuid-validated by parseUser, so it is never "" or "anonymous". The key is only ever compared against itself, and both variants stay distinct from every signed-in key.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      original: 'const [introStarted, setIntroStarted] = useState(false);',
      replacements: ['true'],
      reason:
        'The initial value is observable only through showIntro, which needs a non-null question; question can only be set by a passive effect, and the mount useLayoutEffect runs setIntroStarted(false) strictly before any passive effect. The seed is dead.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ArrayDeclaration',
      original: 'const [answers, setAnswers] = useState<AnswerRecord[]>([]);',
      replacements: ['["Stryker was here"]'],
      reason:
        'Same ordering argument: answers is rendered only in the completion view, gated on currentLevel, which can only be set by a passive effect — after the mount layout effect has already run setAnswers([]).',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;',
      replacements: ['true'],
      reason:
        'The ref is written only by that effect’s setup and cleared only by its cleanup, and React always runs a cleanup before the next setup of the same hook. At cleanup time the ref is exactly the identityKey the cleanup closed over, so the guard is always true — it defends against interleaved instances a single component cannot produce.',
    },
    {
      file: 'src/lib/pending-assessment.ts',
      mutator: 'ConditionalExpression',
      original: "typeof candidate.createdAt !== 'number' ||",
      replacements: ['false'],
      reason:
        'The following !Number.isFinite(candidate.createdAt) is already true for every non-number, so this clause cannot change which records are rejected. It narrows the type for the <= 0 comparison below.',
    },
    {
      file: 'src/lib/pending-assessment.ts',
      mutator: 'ConditionalExpression',
      original: "(typeof candidate.audioKey !== 'string' ||",
      replacements: ['false'],
      reason:
        'audioKeyBelongsToOwner short-circuits on safeAudioKey, whose regex test is false for any non-string, so the record is rejected either way. The typeof narrows the argument type for TypeScript.',
    },
    {
      file: 'src/lib/pending-assessment.ts',
      mutator: 'ConditionalExpression',
      original: "...(stage === 's3-granted' ? { audioKey } : { audioKey: undefined }),",
      replacements: ['true'],
      reason:
        'parsePendingAssessment already drops audioKey unless the stage is s3-granted, and it reads candidate.audioKey only under that stage, so supplying a key for a direct post is normalised away. Pinned by the "drops a stale S3 key" test, which documents the resulting behaviour.',
    },
    {
      file: 'src/lib/pending-assessment.ts',
      mutator: 'ObjectLiteral',
      // Two ObjectLiteral mutants sit on this line. The `{ audioKey }` branch
      // is killed by the "replaces the stored S3 key" test; only the
      // `{ audioKey: undefined }` branch survives.
      original: "...(stage === 's3-granted' ? { audioKey } : { audioKey: undefined }),",
      replacements: ['{}'],
      reason:
        'Emptying the non-s3 branch stops the explicit undefined from being written, but parsePendingAssessment already drops audioKey unless the stage is s3-granted, so the persisted record is identical.',
    },
    {
      file: 'src/lib/use-hardware-back.ts',
      mutator: 'ArrayDeclaration',
      original: '}, []),',
      replacements: ['["Stryker was here"]'],
      reason:
        'The useCallback dependency literal is constant, so React compares it equal on every render and the focus effect subscribes exactly once either way.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      count: 2,
      reason:
        'React compares dependency arrays element-wise with Object.is against the previous render. A constant literal always equals itself, so schedulePendingCleanup and retrySessionRestore are recreated exactly as often — never — whichever constant array is written.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArrayDeclaration',
      original: '[],',
      replacements: ['["Stryker was here"]'],
      reason:
        'Same constant-dependency argument for the unmount-only effect: it runs once and cleans up on unmount either way.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, [schedulePendingCleanup]);',
      replacements: ['[]'],
      reason:
        'schedulePendingCleanup is useCallback(..., []), so it is the same object for the provider’s whole life and can never go stale. Dropping it from the dependency list cannot change when the effect re-runs.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArithmeticOperator',
      original: 'setRestoreAttempt((attempt) => attempt + 1);',
      replacements: ['attempt - 1'],
      reason:
        'restoreAttempt is only ever used as a useEffect dependency, so only that it *changes* matters. Both directions move monotonically and never revisit an earlier value.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (pending !== pendingCleanupTailRef.current) continue;',
      replacements: ['false'],
      reason:
        'The tail only changes inside schedulePendingCleanup, and waitForPendingCleanup is awaited only from establishSession — always with transitionRef.current true, which makes logout/deleteAccount throw at beginTransition and expireSession return early. The tail therefore cannot change during the await. The check stays for future callers.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'BlockStatement',
      original: 'return () => {\n      cancelled = true;\n    };',
      replacements: ['{}'],
      reason:
        'Every path that runs this cleanup also advances epochRef: a dependency change runs the new effect body’s increment in the same commit, and unmount runs the dedicated increment. Since every write is an increment, a captured epoch is never seen again, so the epoch guard already rejects every cancelled restore.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'BooleanLiteral',
      original: 'cancelled = true;',
      replacements: ['false'],
      reason:
        'Makes the cancellation flag inert, which the epoch guard beside it fully covers for the same reason as the BlockStatement above.',
    },
    {
      file: 'src/lib/daily-reminder.ts',
      mutator: 'ConditionalExpression',
      original:
        "return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;",
      replacements: ['true'],
      reason:
        'Number.isInteger returns false for every non-number without coercion, so the typeof test is subsumed; it exists only to narrow unknown for TypeScript. Six ConditionalExpression mutants share this line and only this innermost one survives, hence the count of one.',
    },
    {
      file: 'src/lib/daily-reminder.ts',
      mutator: 'BlockStatement',
      // The identical text also closes the JSON.parse catch below, where the
      // same mutant is killed; the count keeps this exemption off it.
      original: '} catch {\n    return null;\n  }',
      replacements: ['{}'],
      reason:
        'Emptying the getItemAsync catch leaves `stored` unassigned, so `if (!stored) return null` returns the same null with no side effects. It is also not type-valid — tsc reports TS2454, used before assigned — so it could not exist in real source.',
    },
    {
      file: 'src/lib/daily-reminder.ts',
      mutator: 'ConditionalExpression',
      original: 'if (!stored) return null;',
      replacements: ['false'],
      reason:
        "The only reachable falsy values are null and ''. JSON.parse(null) yields null, which parseDailyReminder maps to null; JSON.parse('') throws into the second catch, which also returns null. Identical on every path, and not type-valid either.",
    },
    {
      file: 'src/lib/password-policy.ts',
      mutator: 'ConditionalExpression',
      original: 'index + 1 < value.length &&',
      replacements: ['true'],
      reason:
        'The guard only matters when index + 1 === value.length, and there charCodeAt(index + 1) is NaN, so the surrogate-pair branch is rejected either way. Confirmed by an exhaustive differential run over all 30,941 strings of length <= 4 from a surrogate-boundary alphabet: zero differences, while the killable sibling differs on 2,120.',
    },
    {
      file: 'src/lib/password-policy.ts',
      mutator: 'EqualityOperator',
      original: 'index + 1 < value.length &&',
      replacements: ['index + 1 <= value.length'],
      reason:
        'Same boundary: the only newly admitted index makes charCodeAt(index + 1) NaN, which fails the following >= 0xdc00 test.',
    },
    {
      file: 'src/lib/password-policy.ts',
      mutator: 'ArithmeticOperator',
      original: 'index + 1 < value.length &&',
      replacements: ['index - 1'],
      reason:
        'index - 1 < value.length is vacuously true for every index, which is the same as the ConditionalExpression -> true case above.',
    },
    {
      file: 'src/lib/practice-flow.tsx',
      mutator: 'ArrayDeclaration',
      originals: [
        '}, []);',
        'const clearFeedback = useCallback(() => setFeedback(null), []);',
        'const resetSessionTally = useCallback(() => setSessionTally(EMPTY_TALLY), []);',
      ],
      replacements: ['["Stryker was here"]'],
      count: 3,
      reason:
        'Constant useCallback dependency literals: React compares element-wise with Object.is, so each callback is recreated exactly as often — never — either way, and the useMemo value depending on them is equally stable.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!userId) return;',
      replacements: ['false'],
      reason:
        'dismissIntro only runs from the intro card, which renders only when a signed-in learner has an unseen explainer, so userId is always set where the guard runs.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ObjectLiteral',
      original: 'setIntroState({ userId, seen: true });',
      replacements: ['{}'],
      reason:
        'introState is read only as `introState && introState.userId === userId ? introState.seen : null`, and rendering tests only for `=== false`. After dismissal the original yields true and the mutant null — both hide the card, and nothing else reads the value.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'useCallback dependency literal: React compares element-wise with Object.is, and a constant array equals itself on every render, so the callback identity is stable either way.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!user || !question) return;',
      replacements: ['false'],
      reason:
        'Reached only from a render that already passed the earlier early-returns, and the skip Pressable carries disabled={recorderLocked || skipBusy} so Pressability refuses the touch responder in the states the guard defends against. The handler also closes over the same render’s flags, so the condition is constant-false here.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!user || !question) return;',
      replacements: ['!user && !question'],
      reason:
        'Reached only from a render that already passed the earlier early-returns, and the skip Pressable carries disabled={recorderLocked || skipBusy} so Pressability refuses the touch responder in the states the guard defends against. The handler also closes over the same render’s flags, so the condition is constant-false here.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!question || skipBusy || recorderLocked) return;',
      replacements: ['false'],
      count: 2,
      reason:
        'Reached only from a render that already passed the earlier early-returns, and the skip Pressable carries disabled={recorderLocked || skipBusy} so Pressability refuses the touch responder in the states the guard defends against. The handler also closes over the same render’s flags, so the condition is constant-false here.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!question || skipBusy || recorderLocked) return;',
      replacements: ['(!question || skipBusy) && recorderLocked', '!question && skipBusy'],
      count: 2,
      reason:
        'Reached only from a render that already passed the earlier early-returns, and the skip Pressable carries disabled={recorderLocked || skipBusy} so Pressability refuses the touch responder in the states the guard defends against. The handler also closes over the same render’s flags, so the condition is constant-false here.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ObjectLiteral',
      original: 'accessibilityState={{ disabled: recorderLocked }}',
      replacements: ['{}'],
      count: 3,
      reason:
        'Pressable rebuilds accessibilityState from its own non-null disabled prop, so the literal’s disabled key is unobservable. The sibling literal that also carries a busy key IS observable and is pinned.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'accessibilityState={{ disabled: recorderLocked || skipBusy, busy: skipBusy }}',
      replacements: ['true', 'false'],
      count: 2,
      reason:
        'Same Pressable override: only the busy key of this literal reaches the rendered tree, and it is pinned separately.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'LogicalOperator',
      original: 'accessibilityState={{ disabled: recorderLocked || skipBusy, busy: skipBusy }}',
      replacements: ['recorderLocked && skipBusy'],
      reason: 'Same Pressable override as the ConditionalExpression entry on this line.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'StringLiteral',
      original: "key={nativeMode ? 'native' : 'english'}",
      replacements: ['""'],
      count: 2,
      reason:
        'The Recorder is its parent view’s only child, so the key has no sibling to disambiguate; its sole effect is forcing a remount when it changes. Each mutation replaces one branch, leaving the two keys distinct, and React accepts "" as a valid key. Keys are not exposed on the host tree.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason: 'Constant useCallback dependency literal, as on the practice index screen.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!user || !validQuestionId) return;',
      replacements: ['false'],
      reason:
        'The handler is only invoked from renders that already passed the earlier early-returns, so both operands are false where the guard runs.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!user || !validQuestionId) return;',
      replacements: ['!user && !validQuestionId'],
      reason: 'Same constant-false condition as the ConditionalExpression on this line.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'StringLiteral',
      original: "key={nativeMode ? 'native' : 'english'}",
      replacements: ['""'],
      count: 2,
      reason: 'Same single-child Recorder key argument as on the practice index screen.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'OptionalChaining',
      original: "queryKey: ['practice-question', user?.id, user?.cefrLevel],",
      replacements: ['user.id', 'user.cefrLevel'],
      count: 2,
      reason:
        'Inside onRecoveryUnresolved, which is handed to the Recorder only in renders that already passed `if (!user) return null`, so short-circuiting can never trigger and the query key is identical.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (active) {',
      replacements: ['true'],
      reason:
        'Guards a post-unmount setReminder, and React 19 discards updates dispatched to a detached fiber with no warning and no act complaint. Correct defensive code, but nothing a test can observe.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BlockStatement',
      original: 'return () => {\n      active = false;\n    };',
      replacements: ['{}'],
      reason: 'Same cleanup guard as the `if (active)` entry, same reason.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'active = false;',
      replacements: ['true'],
      reason: 'Same cleanup guard as the `if (active)` entry, same reason.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'Effect dependency literal. The array is constant across renders, so Object.is finds it unchanged every time: the effect runs once on mount and cleans up on unmount either way.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!reminder) return;',
      replacements: ['false'],
      reason:
        'toggleReminder is only wired to a Pressable rendered inside {reminder && (...)}, so reminder is non-null wherever the guard runs.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!reminder || !reminder.enabled) return;',
      replacements: ['false'],
      reason:
        'The +/- hour buttons render only inside {reminder && (... {reminder.enabled && (...)} ...)}, so the whole test is always false at this point.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!reminder || !reminder.enabled) return;',
      replacements: ['!reminder && !reminder.enabled'],
      reason:
        'Both operands are always false where this runs (see the ConditionalExpression entry for the same line), so || and && agree.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ObjectLiteral',
      original: 'accessibilityState={{ disabled: reminderBusy }}',
      replacements: ['{}'],
      count: 2,
      reason:
        'Pressable rebuilds accessibilityState from its own disabled prop when that prop is non-null, and both buttons pass disabled={reminderBusy}. The rendered state is identical with or without the literal. The busy key on the sibling literal IS observable and is pinned.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'OptionalChaining',
      original: 'hour: next.hour ?? current?.hour ?? DEFAULT_REMINDER_HOUR,',
      replacements: ['current.hour'],
      reason:
        'Doubly dead: next.hour is a number at every call site, so ?? short-circuits before current is read; and applyReminder is unreachable until reminder is set, which is never set back to null.',
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
    },
    {
      file: 'src/app/settings/change-password.tsx',
      mutator: 'ObjectLiteral',
      original:
        'const [visibleFields, setVisibleFields] = useState<Record<FieldName, boolean>>({\n    current: false,\n    next: false,\n    confirm: false,\n  });',
      replacements: ['{}'],
      reason:
        'Every read of visibleFields is truthiness-coerced (secureTextEntry={!visibleFields.X}, and a ternary on the toggle), where undefined and false are interchangeable, and the updater !fields[field] yields true from either. The replacement is also not type-valid, so it could not exist in real source.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'Regex',
      original: "const bareHost = host.replace(/^\\[|\\]$/g, '');",
      replacements: ['/\\[|\\]$/g', '/^\\[|\\]/g'],
      // Both anchors, dropped independently.
      count: 2,
      reason:
        'host comes from `new URL(...).hostname`, and WHATWG parsing rejects a bracket anywhere except as the delimiters of an IPv6 literal. A bracket can therefore only ever be first or last, so neither anchor can change the result.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: "return typeof value === 'string' && API_ERROR_CODE_SET.has(value);",
      replacements: ['true'],
      reason:
        'API_ERROR_CODE_SET holds only strings, so has() is already false for every non-string value. The typeof test is there to narrow the type for TypeScript, not to change behaviour.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original:
        "return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxSeconds",
      replacements: ['true'],
      reason:
        'Number.isFinite is already false for every non-number, so forcing the typeof test true cannot change the outcome. It exists to narrow unknown to number for TypeScript.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'LogicalOperator',
      original:
        "return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxSeconds",
      replacements: ["typeof value === 'number' || Number.isFinite(value)"],
      reason:
        'Number.isFinite subsumes the typeof test, and the remaining `> 0` / `<= maxSeconds` bounds reject the only non-finite numbers (NaN, ±Infinity) regardless of which way the pair is combined.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: 'if (!header) return undefined;',
      replacements: ['false'],
      reason:
        "The only falsy headers are null and '', and Number(null) === Number('') === 0, which boundedSeconds already rejects through `value > 0`. The guard is a readability shortcut, not a behavioural branch.",
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original:
        "const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;",
      replacements: ['true'],
      // The whole test and the inner typeof operand both forced true.
      count: 2,
      reason:
        'record is only ever read through optional chaining (record?.code, record?.retryAfterSeconds, record?.retryAfterHours). For every value res.json() can yield, those reads are undefined whether record is the primitive itself or undefined.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'LogicalOperator',
      original:
        "const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;",
      replacements: ["body || typeof body === 'object'"],
      reason:
        'Same reason as the ConditionalExpression on this line: every read of record is optional-chained, so widening which bodies reach the cast changes nothing observable.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      // Two spans produce this: the typeof test alone, and the typeof/isFinite pair.
      originals: [
        "typeof hours === 'number' &&",
        "typeof hours === 'number' &&\n      Number.isFinite(hours) &&",
      ],
      replacements: ['true'],
      reason:
        'Number.isFinite is already false for every non-number, so forcing the typeof test true cannot change the outcome.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'LogicalOperator',
      original: "typeof hours === 'number' &&\n      Number.isFinite(hours) &&",
      replacements: ["typeof hours === 'number' || Number.isFinite(hours)"],
      reason:
        'Number.isFinite subsumes the typeof test, and the surviving bounds reject NaN and ±Infinity either way.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'OptionalChaining',
      original: 'const abortFromCaller = () => controller.abort(externalSignal?.reason);',
      replacements: ['externalSignal.reason'],
      reason:
        'abortFromCaller only runs from branches already guarded by the same optional chain (externalSignal?.aborted, or the listener registered via externalSignal?.addEventListener). The timeout path calls controller.abort() directly, so it can never run with a nullish signal.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'OptionalChaining',
      original: 'const abortFromCaller = () => controller.abort(options.signal?.reason);',
      replacements: ['options.signal.reason'],
      reason:
        'Same shape as the JSON request path: the callback is only reachable from branches guarded by options.signal?.aborted or its abort listener.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: 'body: options.body === undefined ? undefined : JSON.stringify(options.body),',
      replacements: ['false'],
      reason:
        'JSON.stringify(undefined) returns undefined, which is exactly what the true branch supplies. The ternary exists so the declared type stays string | undefined rather than string.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: "typeof file.size !== 'number' ||",
      replacements: ['false'],
      reason:
        'The following !Number.isFinite(file.size) is already true for every non-number, so this clause cannot change which files are rejected. It narrows the type for the size comparison below.',
    },
    ...recorderEquivalentMutants,
  ].map((entry, index) => {
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
  equivalentMutantLocations.length + recorderEquivalentMutants.length !==
  equivalentMutants.length
) {
  throw new Error(
    `Equivalent mutant location sources account for ` +
      `${equivalentMutantLocations.length + recorderEquivalentMutants.length} entries for ` +
      `${equivalentMutants.length} registry entries`,
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
export function applyEquivalenceAllowlist(survivors, entries = equivalentMutants) {
  for (const [index, entry] of entries.entries()) assertEntryLocations(entry, index);
  const matchCounts = new Map();
  const accepted = [];
  const unexplained = [];

  for (const survivor of survivors) {
    const index = entries.findIndex(
      (entry) =>
        entry.file === survivor.file &&
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
