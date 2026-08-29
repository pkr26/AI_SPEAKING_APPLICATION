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
const equivalentMutantLocations = Object.freeze([
  exactLocations(85, 18, 87, 6),
  exactLocations(86, 16, 86, 21),
  exactLocations(59, 6, 59, 8, 88, 6, 88, 8),
  exactLocations(440, 5, 440, 21),
  exactLocations(598, 5, 598, 32, 495, 5, 495, 32, 889, 7, 889, 34),
  exactLocations(538, 32, 538, 58),
  exactLocations(599, 5, 599, 34),
  exactLocations(693, 79, 693, 97, 661, 62, 661, 80),
  exactLocations(693, 7, 693, 25),
  exactLocations(1130, 11, 1132, 4),
  exactLocations(1218, 7, 1218, 25),
  exactLocations(1275, 5, 1275, 30),
  exactLocations(1201, 39, 1201, 67),
  exactLocations(1209, 10, 1211, 4),
  exactLocations(300, 7, 300, 25),
  exactLocations(65, 37, 65, 62, 83, 33, 83, 58),
  exactLocations(294, 6, 294, 8),
  exactLocations(141, 7, 141, 33),
  exactLocations(141, 35, 143, 4),
  exactLocations(63, 54, 63, 65),
  exactLocations(106, 69, 106, 71),
  exactLocations(194, 11, 194, 52),
  exactLocations(87, 5, 87, 44),
  exactLocations(144, 6, 144, 44),
  exactLocations(26, 8, 26, 10),
  exactLocations(159, 6, 159, 8, 180, 6, 180, 8, 199, 6, 199, 8, 298, 6, 298, 8, 344, 5, 344, 7),
  exactLocations(169, 5, 169, 7, 291, 5, 291, 7),
  exactLocations(212, 6, 212, 30),
  exactLocations(297, 36, 297, 47),
  exactLocations(280, 18, 282, 6),
  exactLocations(281, 19, 281, 23),
  exactLocations(60, 10, 60, 35),
  exactLocations(86, 11, 88, 4),
  exactLocations(89, 7, 89, 14),
  exactLocations(
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
  exactLocations(137, 9, 137, 16),
  exactLocations(138, 19, 138, 41),
  exactLocations(119, 6, 119, 31),
  exactLocations(413, 7, 414, 16),
  exactLocations(413, 7, 414, 16),
  exactLocations(777, 49, 777, 57, 777, 60, 777, 69),
  exactLocations(111, 6, 111, 8),
  exactLocations(216, 7, 217, 23),
  exactLocations(216, 7, 217, 23),
  exactLocations(433, 48, 433, 56, 433, 59, 433, 68),
  exactLocations(122, 39, 122, 41),
  exactLocations(174, 39, 174, 44),
  exactLocations(179, 31, 179, 36),
  exactLocations(197, 5, 197, 7),
  exactLocations(236, 6, 236, 43),
  exactLocations(228, 6, 228, 30),
  exactLocations(207, 6, 207, 43),
  exactLocations(245, 8, 245, 10),
  exactLocations(261, 25, 263, 4),
  exactLocations(263, 6, 263, 18),
  exactLocations(265, 9, 265, 53),
  exactLocations(519, 11, 519, 28),
  exactLocations(520, 35, 520, 39),
  exactLocations(569, 66, 569, 83),
  exactLocations(589, 36, 589, 65),
  exactLocations(589, 36, 589, 65),
  exactLocations(595, 31, 595, 72),
  exactLocations(607, 31, 607, 66),
  exactLocations(693, 11, 693, 27),
  exactLocations(693, 45, 693, 76),
  exactLocations(700, 11, 700, 37),
  exactLocations(700, 55, 700, 88),
  exactLocations(715, 9, 715, 40),
  exactLocations(876, 9, 876, 47),
  exactLocations(876, 9, 876, 47),
  exactLocations(904, 9, 904, 77),
  exactLocations(904, 9, 904, 77),
  exactLocations(904, 9, 904, 77),
  exactLocations(904, 9, 904, 52),
  exactLocations(904, 79, 906, 6),
  exactLocations(905, 14, 905, 19),
  exactLocations(952, 12, 952, 16),
  exactLocations(971, 11, 971, 32),
  exactLocations(971, 11, 971, 32),
  exactLocations(988, 17, 988, 30),
  exactLocations(1084, 49, 1084, 70),
  exactLocations(1084, 74, 1084, 76),
  exactLocations(1098, 37, 1098, 58),
  exactLocations(1098, 62, 1098, 64),
  exactLocations(183, 38, 183, 67, 216, 38, 216, 71),
  exactLocations(40, 82, 44, 4),
  exactLocations(56, 39, 56, 49, 56, 39, 56, 49),
  exactLocations(140, 10, 140, 35),
  exactLocations(364, 5, 364, 32),
  exactLocations(349, 10, 349, 61),
  exactLocations(358, 7, 358, 14),
  exactLocations(396, 13, 396, 17),
  exactLocations(489, 11, 489, 29, 489, 11, 489, 29),
  exactLocations(489, 11, 489, 29),
  exactLocations(502, 7, 503, 29),
  exactLocations(879, 7, 879, 35),
  exactLocations(1145, 22, 1145, 37, 1181, 22, 1181, 37, 1223, 22, 1223, 45),
  exactLocations(52, 29, 52, 33),
  exactLocations(57, 29, 57, 33),
  exactLocations(61, 9, 61, 28),
  exactLocations(66, 9, 66, 28),
  exactLocations(113, 11, 113, 30),
  exactLocations(116, 11, 116, 30),
  exactLocations(121, 11, 121, 29),
  exactLocations(126, 11, 126, 29),
  exactLocations(64, 6, 64, 8),
  exactLocations(33, 29, 33, 33),
  exactLocations(58, 29, 58, 33),
  exactLocations(40, 6, 40, 8),
  exactLocations(65, 6, 65, 8),
  exactLocations(42, 9, 42, 28),
  exactLocations(67, 9, 67, 28),
  exactLocations(80, 11, 80, 29, 84, 11, 84, 29, 87, 11, 87, 29),
  exactLocations(118, 11, 118, 29, 121, 11, 121, 29),
  exactLocations(64, 8, 64, 10),
  exactLocations(233, 29, 233, 34),
  exactLocations(266, 6, 266, 8),
  exactLocations(375, 28, 375, 100),
  exactLocations(385, 9, 385, 32, 380, 8, 380, 31),
  exactLocations(411, 37, 411, 61, 402, 45, 402, 69),
  exactLocations(411, 54, 411, 59, 402, 62, 402, 67),
  exactLocations(
    108,
    36,
    108,
    41,
    109,
    64,
    109,
    69,
    110,
    40,
    110,
    45,
    111,
    32,
    111,
    37,
    112,
    48,
    112,
    53,
    113,
    35,
    113,
    40,
    114,
    62,
    114,
    67,
    116,
    29,
    116,
    34,
  ),
  exactLocations(115, 29, 115, 33, 117, 35, 117, 39),
  exactLocations(142, 25, 151, 4, 144, 18, 150, 6),
  exactLocations(145, 28, 145, 33, 146, 28, 146, 33),
  exactLocations(147, 34, 147, 38, 159, 36, 159, 40),
  exactLocations(151, 6, 151, 8, 161, 8, 161, 10),
  exactLocations(186, 33, 186, 38, 188, 27, 188, 32),
  exactLocations(193, 18, 195, 6),
  exactLocations(194, 11, 194, 52),
  exactLocations(194, 11, 194, 52),
  exactLocations(234, 9, 234, 50),
  exactLocations(376, 7, 376, 21),
  exactLocations(395, 14, 395, 18),
  exactLocations(489, 32, 489, 36),
  exactLocations(492, 17, 492, 22),
  exactLocations(505, 11, 505, 74, 505, 33, 505, 74),
  exactLocations(505, 11, 505, 74),
  exactLocations(507, 13, 507, 18),
  exactLocations(308, 6, 308, 28),
  exactLocations(51, 29, 51, 34),
  exactLocations(46, 29, 46, 34),
  exactLocations(58, 6, 58, 8),
  exactLocations(54, 6, 54, 8),
  exactLocations(111, 11, 111, 30),
  exactLocations(91, 13, 91, 31, 99, 18, 99, 36),
  exactLocations(124, 11, 124, 30, 139, 17, 139, 36),
  exactLocations(64, 6, 64, 36),
  exactLocations(68, 36, 68, 41),
  exactLocations(81, 39, 81, 43, 82, 29, 82, 33),
  exactLocations(99, 54, 99, 65),
  exactLocations(113, 28, 113, 33, 114, 28, 114, 33),
  exactLocations(115, 38, 115, 42),
  exactLocations(163, 73, 163, 81, 163, 84, 163, 93),
  exactLocations(181, 7, 181, 51),
  exactLocations(188, 7, 188, 21),
  exactLocations(199, 5, 199, 7),
  exactLocations(316, 40, 316, 44),
  exactLocations(427, 73, 427, 77),
  exactLocations(556, 17, 556, 22),
  exactLocations(571, 13, 571, 18),
  exactLocations(48, 6, 48, 36),
  exactLocations(48, 29, 48, 34),
  exactLocations(51, 36, 51, 41),
  exactLocations(60, 29, 60, 33, 62, 39, 62, 43),
  exactLocations(85, 54, 85, 65),
  exactLocations(93, 75, 93, 83, 93, 86, 93, 95),
  exactLocations(106, 28, 106, 33, 107, 28, 107, 33),
  exactLocations(108, 38, 108, 42),
  exactLocations(127, 7, 127, 21),
  exactLocations(149, 40, 149, 44),
  exactLocations(233, 76, 233, 80),
  exactLocations(269, 7, 269, 40),
  exactLocations(84, 63, 92, 4),
  exactLocations(85, 9, 85, 18),
  exactLocations(86, 12, 91, 6),
  exactLocations(95, 30, 95, 46, 96, 27, 96, 39, 97, 29, 97, 43, 98, 30, 98, 45),
  exactLocations(114, 29, 114, 33),
  exactLocations(128, 28, 128, 33, 129, 28, 129, 33),
  exactLocations(132, 6, 132, 8, 144, 8, 144, 10),
  exactLocations(193, 7, 194, 26),
  exactLocations(193, 7, 194, 26),
  exactLocations(276, 77, 276, 81),
  exactLocations(1136, 37, 1136, 42),
  exactLocations(1136, 7, 1136, 28),
  exactLocations(1154, 11, 1156, 4),
  exactLocations(181, 9, 181, 31),
  exactLocations(1233, 9, 1233, 28),
  exactLocations(663, 36, 663, 65, 663, 67, 663, 79, 674, 29, 674, 72, 698, 47, 698, 88),
  exactLocations(856, 13, 856, 31),
  exactLocations(349, 10, 349, 35),
  exactLocations(502, 7, 502, 32),
  exactLocations(1148, 31, 1148, 52, 1196, 15, 1196, 36),
  exactLocations(229, 16, 231, 4),
]);

const recorderEquivalentMutantGroups = Object.freeze([
  {
    reason:
      'RecorderScrollTarget requires scrollToEnd whenever the target exists, so the method-level optional access is redundant while the target-level optional access retains the null guard.',
    mutants: [
      [
        '3',
        'OptionalChaining',
        'if (ownsWork) target?.scrollToEnd?.({ animated: true });',
        'target?.scrollToEnd({\n  animated: true\n})',
        81,
        17,
        81,
        58,
      ],
    ],
  },
  {
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    mutants: [
      ['810', 'ConditionalExpression', 'if (!uri) return;', 'false', 828, 7, 828, 11],
      [
        '1162',
        'ConditionalExpression',
        'if (candidateUri) candidates.add(candidateUri);',
        'true',
        1375,
        9,
        1375,
        21,
      ],
      ['1238', 'ConditionalExpression', 'if (uri) ownedUris.add(uri);', 'true', 1483, 11, 1483, 14],
      [
        '2481',
        'ConditionalExpression',
        'if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);',
        'true',
        2794,
        11,
        2794,
        31,
      ],
    ],
  },
  {
    reason:
      'On the only mount for which recordingCacheJanitorHasRun is false, no audio owner can predate the passive janitor; if another Recorder already acquired the session, its earlier mount already set the process-once flag. The owner operand therefore cannot decide the result.',
    mutants: [
      [
        '851',
        'ConditionalExpression',
        'activeAudioSessionOwner !== null,',
        'false',
        881,
        7,
        881,
        39,
      ],
    ],
  },
  {
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    mutants: [
      ['869', 'BooleanLiteral', 'const mountedRef = useRef(true);', 'false', 930, 29, 930, 33],
      ['870', 'BooleanLiteral', 'const unmountingRef = useRef(false);', 'true', 931, 32, 931, 37],
    ],
  },
  {
    reason:
      'The later AppState mount effect writes mountedRef true before external app-state events or async continuations can publish. Writing false in this earlier mount assignment is therefore overwritten before it can be the sole lifecycle currency.',
    mutants: [
      ['1313', 'BooleanLiteral', 'mountedRef.current = true;', 'false', 1609, 26, 1609, 30],
    ],
  },
  {
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    mutants: [
      [
        '904',
        'BooleanLiteral',
        'const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);',
        'true',
        996,
        74,
        996,
        79,
      ],
      [
        '909',
        'BooleanLiteral',
        'const [previewPlaying, setPreviewPlaying] = useState(false);',
        'true',
        1003,
        56,
        1003,
        61,
      ],
      [
        '2189',
        'StringLiteral',
        "const announcedPhaseRef = useRef<Phase>('idle');",
        '""',
        2518,
        43,
        2518,
        49,
      ],
    ],
  },
  {
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    mutants: [
      [
        '913',
        'BooleanLiteral',
        'const hasObservedRecordingRef = useRef(false);',
        'true',
        1019,
        42,
        1019,
        47,
      ],
      [
        '914',
        'BooleanLiteral',
        'const recordingInterruptionHandledRef = useRef(false);',
        'true',
        1020,
        50,
        1020,
        55,
      ],
      [
        '916',
        'BooleanLiteral',
        'const cancelRequestedRef = useRef(false);',
        'true',
        1024,
        37,
        1024,
        42,
      ],
      [
        '917',
        'BooleanLiteral',
        'const assessmentPostedRef = useRef(false);',
        'true',
        1025,
        38,
        1025,
        43,
      ],
      [
        '919',
        'BooleanLiteral',
        'const previewPlayRequestedRef = useRef(false);',
        'true',
        1052,
        42,
        1052,
        47,
      ],
    ],
  },
  {
    reason:
      'The layout effect replaces the callback and full owner/endpoint/question/cycle identity snapshots in the same commit before any focus effect, user input, native event, or continuation can consume the initial object.',
    mutants: [
      [
        '922',
        'ObjectLiteral',
        'const callbacksRef = useRef({\n    disabled,\n    isStartBlocked,\n    onError,\n    onExpandedControlsLayout,\n    onExitLockChange,\n    onInteractionLockChange,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    onResultWithMetadata,\n    parseResult,\n  });',
        '{}',
        1060,
        31,
        1073,
        4,
      ],
      [
        '966',
        'ObjectLiteral',
        'const identityRef = useRef({ ownerId, endpoint, questionId, cycleId });',
        '{}',
        1121,
        30,
        1121,
        72,
      ],
    ],
  },
  {
    reason:
      'The Recorder prop union guarantees that the legacy onResult callback exists in the branch where onResultWithMetadata is absent, so the optional call and direct call are identical.',
    mutants: [
      [
        '929',
        'OptionalChaining',
        'callbacks.onResult?.(data);',
        'callbacks.onResult(data)',
        1079,
        7,
        1079,
        33,
      ],
    ],
  },
  {
    reason:
      'Both callbacks close over stable refs only. Replacing either empty dependency array with the same constant string element preserves callback identity and lifetime across every render.',
    mutants: [
      ['930', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1081, 6, 1081, 8],
      ['3215', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 3593, 6, 3593, 8],
    ],
  },
  {
    reason:
      'The injected array element is a string with no uri or takeGeneration property. Every quarantine predicate compares those properties with a real URI or numeric generation, so it never matches and is eventually shifted out without side effects.',
    mutants: [
      [
        '871',
        'ArrayDeclaration',
        'const terminalEventQuarantineRef = useRef<TerminalEventQuarantine[]>([]);',
        '["Stryker was here"]',
        937,
        72,
        937,
        74,
      ],
    ],
  },
  {
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    mutants: [
      [
        '883',
        'OptionalChaining',
        'recorderStillRecording = currentRecorderRef.current?.isRecording === true;',
        'currentRecorderRef.current.isRecording',
        950,
        34,
        950,
        73,
      ],
      [
        '1151',
        'OptionalChaining',
        'previewListenerRef.current?.remove();',
        'previewListenerRef.current.remove',
        1353,
        7,
        1353,
        41,
      ],
      ['1153', 'OptionalChaining', 'player?.remove();', 'player.remove', 1361, 7, 1361, 21],
    ],
  },
  {
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    mutants: [
      [
        '895',
        'ArithmeticOperator',
        'setRecordingStatusVersion((version) => version + 1);',
        'version - 1',
        975,
        48,
        975,
        59,
      ],
      [
        '1196',
        'AssignmentOperator',
        'recoveryGenerationRef.current += 1;',
        'recoveryGenerationRef.current -= 1',
        1426,
        5,
        1426,
        39,
      ],
      [
        '1268',
        'AssignmentOperator',
        'lifecycleEpochRef.current += 1;',
        'lifecycleEpochRef.current -= 1',
        1528,
        7,
        1528,
        37,
      ],
      [
        '1474',
        'UpdateOperator',
        'const generation = ++recoveryGenerationRef.current;',
        '--recoveryGenerationRef.current',
        1782,
        24,
        1782,
        55,
      ],
    ],
  },
  {
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    mutants: [
      ['896', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 978, 6, 978, 8],
      ['940', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1091, 6, 1091, 8],
      ['965', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1120, 6, 1120, 8],
      ['976', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1167, 6, 1167, 8],
      ['998', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1187, 6, 1187, 8],
      ['1053', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1268, 6, 1268, 8],
      ['1058', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1272, 5, 1272, 7],
      [
        '1064',
        'ArrayDeclaration',
        'const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);',
        '["Stryker was here"]',
        1275,
        89,
        1275,
        91,
      ],
      [
        '1066',
        'ArrayDeclaration',
        'const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);',
        '["Stryker was here"]',
        1277,
        81,
        1277,
        83,
      ],
      ['1079', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1288, 6, 1288, 8],
      ['1127', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1321, 6, 1321, 8],
      ['1141', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1332, 6, 1332, 8],
      ['1157', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1366, 6, 1366, 8],
      ['1160', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1371, 6, 1371, 8],
      ['1164', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1379, 6, 1379, 8],
      ['1170', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1389, 6, 1389, 8],
      ['1179', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1399, 6, 1399, 8],
      ['1204', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1435, 6, 1435, 8],
      ['1234', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1474, 5, 1474, 7],
      ['2021', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2359, 6, 2359, 8],
      ['2136', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2473, 6, 2473, 8],
    ],
  },
  {
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    mutants: [
      ['1011', 'ArrayDeclaration', '[publishOperation],', '[]', 1206, 5, 1206, 23],
      ['1022', 'ArrayDeclaration', '[publishOperation],', '[]', 1224, 5, 1224, 23],
      ['1147', 'ArrayDeclaration', '[updatePhase],', '[]', 1346, 5, 1346, 18],
      [
        '2145',
        'ArrayDeclaration',
        'useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);',
        '[]',
        2481,
        49,
        2481,
        71,
      ],
      [
        '2287',
        'ArrayDeclaration',
        '[\n      adoptOwnedRecording,\n      clearWebAutoStopTimer,\n      discardRecording,\n      restoreOwnedAudioMode,\n      updatePhase,\n    ],',
        '[]',
        2589,
        5,
        2595,
        6,
      ],
    ],
  },
  {
    reason:
      'audioSessionCanBeAcquired plus the awaited global release promise ensures recording start reaches acquisition only with a null owner; Recorder phase and operation currency exclude re-acquiring a session already owned by this instance. The null test is always true.',
    mutants: [
      [
        '935',
        'ConditionalExpression',
        'if (activeAudioSessionOwner === null) {',
        'true',
        1085,
        9,
        1085,
        41,
      ],
    ],
  },
  {
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    mutants: [
      [
        '957',
        'ConditionalExpression',
        'if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {',
        'true',
        1107,
        13,
        1107,
        71,
      ],
      ['960', 'OptionalChaining', 'resolveRelease?.();', 'resolveRelease()', 1112, 11, 1112, 29],
      [
        '962',
        'ConditionalExpression',
        'if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;',
        'true',
        1116,
        11,
        1116,
        53,
      ],
    ],
  },
  {
    reason:
      'operationOwnerRef is non-null only while the in-flight set is non-empty. Ordinary begin is already rejected by the count and superseding begin ignores both checks, so the owner boolean cannot independently decide admission.',
    mutants: [
      [
        '1006',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1194,
        11,
        1194,
        45,
      ],
    ],
  },
  {
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    mutants: [
      [
        '1015',
        'ConditionalExpression',
        '!canResumeRecorderOperation(\n          operationOwnerRef.current !== null,\n          operationsInFlightRef.current.has(token),\n          operationsInFlightRef.current.size,\n        )',
        'false',
        1212,
        9,
        1216,
        10,
      ],
      [
        '1017',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1213,
        11,
        1213,
        45,
      ],
      ['1019', 'BlockStatement', ') {\n        return false;\n      }', '{}', 1217, 9, 1219, 8],
      ['1020', 'BooleanLiteral', 'return false;', 'true', 1218, 16, 1218, 21],
    ],
  },
  {
    reason:
      'A stale token can finish only beneath a newer superseding lifecycle token. Clearing ownership early still leaves another in-flight token, so count-based admission remains blocked, the lock remains active, and lifecycle cleanup has no later owner-current read. The defensive identity guard is unobservable.',
    mutants: [
      [
        '1024',
        'ConditionalExpression',
        'if (operationOwnerRef.current === token) operationOwnerRef.current = null;',
        'true',
        1229,
        9,
        1229,
        44,
      ],
    ],
  },
  {
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    mutants: [
      [
        '1031',
        'ConditionalExpression',
        'if (mountedRef.current) setOperationActive(stillActive);',
        'true',
        1231,
        9,
        1231,
        27,
      ],
      ['1138', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 1328, 9, 1328, 27],
      [
        '1144',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1343,
        11,
        1343,
        29,
      ],
      [
        '1154',
        'ConditionalExpression',
        'if (mountedRef.current) setPreviewPlaying(false);',
        'true',
        1365,
        9,
        1365,
        27,
      ],
      [
        '1411',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1707,
        13,
        1707,
        31,
      ],
      [
        '1471',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(false);',
        'true',
        1781,
        9,
        1781,
        27,
      ],
      [
        '2131',
        'ConditionalExpression',
        'if (active) setReduceMotion(enabled);',
        'true',
        2465,
        13,
        2465,
        19,
      ],
      ['2135', 'BooleanLiteral', 'active = false;', 'true', 2470, 16, 2470, 21],
      ['2366', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 2701, 9, 2701, 27],
    ],
  },
  {
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    mutants: [
      [
        '1129',
        'ConditionalExpression',
        "next === 'uploading' || next === 'recovering' ? monotonicNow() : null;",
        'true',
        1327,
        7,
        1327,
        52,
      ],
      [
        '2157',
        'ConditionalExpression',
        'if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);',
        'true',
        2490,
        11,
        2490,
        29,
      ],
    ],
  },
  {
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    mutants: [
      ['1177', 'BlockStatement', '} catch {\n      return false;\n    }', '{}', 1396, 13, 1398, 6],
      [
        '1616',
        'BlockStatement',
        '} catch {\n          return false;\n        }',
        '{}',
        1930,
        17,
        1932,
        10,
      ],
      [
        '3016',
        'ArrowFunction',
        'const promise = markPendingAssessmentCancelled(requestId).catch(() => false);',
        '() => undefined',
        3397,
        71,
        3397,
        82,
      ],
    ],
  },
  {
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    mutants: [
      [
        '1209',
        'ConditionalExpression',
        'if (nativeStopPromiseRef.current === promise) {',
        'true',
        1440,
        11,
        1440,
        51,
      ],
      [
        '1307',
        'ConditionalExpression',
        'if (lifecycleStopPromiseRef.current === promise) {',
        'true',
        1588,
        11,
        1588,
        54,
      ],
    ],
  },
  {
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    mutants: [
      [
        '1223',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1458,
        15,
        1458,
        86,
      ],
      [
        '1224',
        'LogicalOperator',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'settled && completion && completion.takeGeneration !== takeGeneration',
        1458,
        15,
        1458,
        86,
      ],
      [
        '1225',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1458,
        27,
        1458,
        85,
      ],
      ['1229', 'BooleanLiteral', 'settled = true;', 'false', 1459, 21, 1459, 25],
    ],
  },
  {
    reason:
      'Prepared-recorder disposal runs under an operation while no recording is adoptable. A terminal callback published without suppression can only bump the status version; the consuming effect rejects it through its phase and operation guards.',
    mutants: [
      [
        '1236',
        'BooleanLiteral',
        'suppressRecordingStatusRef.current = true;',
        'false',
        1478,
        42,
        1478,
        46,
      ],
    ],
  },
  {
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    mutants: [
      [
        '1266',
        'ConditionalExpression',
        'if (!operationToken) return Promise.resolve();',
        'false',
        1526,
        9,
        1526,
        24,
      ],
      ['1360', 'ConditionalExpression', 'if (!operationToken) return;', 'false', 1650, 9, 1650, 24],
    ],
  },
  {
    reason:
      'recoverPending calls beginOperation only after operationIsInFlight synchronously proved the owner set empty. With no current owner or token, superseding and ordinary begin have identical admission and ownership effects, so the first false argument is redundant.',
    mutants: [
      [
        '1356',
        'BooleanLiteral',
        'const operationToken = beginOperation(false, false);',
        'true',
        1649,
        43,
        1649,
        48,
      ],
    ],
  },
  {
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    mutants: [
      [
        '1304',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        1582,
        41,
        1582,
        46,
      ],
      [
        '2268',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2573,
        41,
        2573,
        46,
      ],
      [
        '2528',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2850,
        41,
        2850,
        46,
      ],
      [
        '2584',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2906,
        41,
        2906,
        46,
      ],
      [
        '2630',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2937,
        41,
        2937,
        46,
      ],
    ],
  },
  {
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    mutants: [
      ['1316', 'BooleanLiteral', 'unmountingRef.current = true;', 'false', 1612, 31, 1612, 35],
      ['1317', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 1613, 28, 1613, 33],
    ],
  },
  {
    reason:
      'On unmount, the earlier layout-effect cleanup has already set unmounting true and mounted false before this passive cleanup runs. On a passive-effect dependency refresh, React runs cleanup and the replacement setup together before async continuations, and setup immediately restores mounted true. This duplicate false assignment is never the sole lifecycle guard.',
    mutants: [
      ['2104', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 2435, 28, 2435, 33],
    ],
  },
  {
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    mutants: [
      [
        '1324',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder;',
        'true',
        1622,
        7,
        1622,
        46,
      ],
      [
        '2562',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2878,
        7,
        2878,
        46,
      ],
      [
        '2682',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        3002,
        7,
        3002,
        46,
      ],
    ],
  },
  {
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    mutants: [
      [
        '1337',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1624,
        11,
        1624,
        44,
      ],
      [
        '1334',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1624,
        11,
        1624,
        66,
      ],
      [
        '1336',
        'LogicalOperator',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        "phaseRef.current === 'recovering' || mountedRef.current",
        1624,
        11,
        1624,
        66,
      ],
    ],
  },
  {
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    mutants: [
      [
        '1349',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1633,
        9,
        1633,
        45,
      ],
      [
        '1389',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1678,
        9,
        1678,
        45,
      ],
      [
        '1397',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1694,
        11,
        1694,
        47,
      ],
      [
        '1467',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1762,
        11,
        1762,
        47,
      ],
    ],
  },
  {
    reason:
      'No second recovery attempt can start while this loading operation token remains in flight. The attempt ref is therefore this exact symbol or already null from invalidation, and assigning null unconditionally cannot clear a newer attempt.',
    mutants: [
      [
        '1363',
        'ConditionalExpression',
        'if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;',
        'true',
        1655,
        11,
        1655,
        57,
      ],
    ],
  },
  {
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    mutants: [
      [
        '1380',
        'ConditionalExpression',
        'const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1673,
        66,
        1673,
        100,
      ],
      [
        '1460',
        'ConditionalExpression',
        'activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1757,
        41,
        1757,
        75,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    mutants: [
      ['1415', 'ConditionalExpression', 'if (pending === null) {', 'false', 1714, 9, 1714, 25],
      [
        '1417',
        'BlockStatement',
        'if (pending === null) {\n      finishLoading();\n      return;\n    }',
        '{}',
        1714,
        27,
        1717,
        6,
      ],
    ],
  },
  {
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    mutants: [
      [
        '1476',
        'ConditionalExpression',
        'recoveryGenerationRef.current === generation,',
        'true',
        1785,
        9,
        1785,
        53,
      ],
      [
        '1479',
        'ConditionalExpression',
        'activeRecoveryOwner === instanceId,',
        'true',
        1787,
        9,
        1787,
        43,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad already proved operation and lifecycle currency, and the reconcile-stage callback is reached without an intervening await. Callback re-entry is followed immediately by the separate post-callback isCurrent guard before effects.',
    mutants: [
      ['1504', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1808, 13, 1808, 25],
    ],
  },
  {
    reason:
      'The validated prepared-stage path reaches this check without an await or re-entry. releaseUnclaimedHandoff then performs the sole await and immediately rechecks isCurrent before publishing, so the outer guard is redundant.',
    mutants: [
      ['1541', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1836, 13, 1836, 25],
    ],
  },
  {
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    mutants: [
      ['1594', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1910, 36, 1910, 41],
      ['1613', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1919, 36, 1919, 41],
    ],
  },

  {
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    mutants: [
      ['1879', 'ConditionalExpression', 'if (isCurrent()) {', 'true', 2181, 23, 2181, 34],
      ['1950', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 2246, 25, 2246, 37],
    ],
  },
  {
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    mutants: [
      [
        '1957',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errRejected')),",
        '""',
        2256,
        63,
        2256,
        85,
      ],
      [
        '1962',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errNotSent')),",
        '""',
        2264,
        63,
        2264,
        84,
      ],
    ],
  },
  {
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    mutants: [
      [
        '2062',
        'ConditionalExpression',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'true',
        2408,
        17,
        2408,
        54,
      ],
      [
        '2063',
        'LogicalOperator',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'identityMatches || mountedRef.current',
        2408,
        17,
        2408,
        54,
      ],
    ],
  },
  {
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    mutants: [
      [
        '2138',
        'ConditionalExpression',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        'true',
        2478,
        9,
        2478,
        29,
      ],
      [
        '2141',
        'StringLiteral',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        '""',
        2478,
        19,
        2478,
        29,
      ],
    ],
  },
  {
    reason:
      'The effect depends only on phase, so React never reruns it with an unchanged phase. The ref is assigned on every run, making the equality early return unreachable.',
    mutants: [
      [
        '2192',
        'ConditionalExpression',
        'if (announcedPhaseRef.current === phase) return;',
        'false',
        2520,
        9,
        2520,
        44,
      ],
    ],
  },
  {
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    mutants: [
      ['2240', 'ConditionalExpression', 'pulseSteps.length !== 2 ||', 'false', 2546, 7, 2546, 30],
      [
        '2238',
        'ConditionalExpression',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'false',
        2546,
        7,
        2553,
        8,
      ],
      [
        '2239',
        'LogicalOperator',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.length !== 2 && pulseSteps.some(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2546,
        7,
        2553,
        8,
      ],
      [
        '2242',
        'MethodExpression',
        'pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.every(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2547,
        7,
        2553,
        8,
      ],
      [
        '2243',
        'ArrowFunction',
        '(step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '() => undefined',
        2548,
        9,
        2552,
        40,
      ],
      [
        '2249',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        'false',
        2549,
        11,
        2550,
        42,
      ],
      [
        '2250',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        '!Number.isFinite(step.toValue) && !Number.isFinite(step.duration)',
        2549,
        11,
        2550,
        42,
      ],
      [
        '2247',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        'false',
        2549,
        11,
        2551,
        29,
      ],
      [
        '2248',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration)) && step.duration <= 0',
        2549,
        11,
        2551,
        29,
      ],
      [
        '2245',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        'false',
        2549,
        11,
        2552,
        40,
      ],
      [
        '2246',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0) && step.useNativeDriver !== true',
        2549,
        11,
        2552,
        40,
      ],
      ['2253', 'ConditionalExpression', 'step.duration <= 0 ||', 'false', 2551, 11, 2551, 29],
      [
        '2254',
        'EqualityOperator',
        'step.duration <= 0 ||',
        'step.duration < 0',
        2551,
        11,
        2551,
        29,
      ],
      [
        '2256',
        'ConditionalExpression',
        'step.useNativeDriver !== true,',
        'false',
        2552,
        11,
        2552,
        40,
      ],
      [
        '2259',
        'BlockStatement',
        ') {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2554,
        7,
        2557,
        6,
      ],
      [
        '2262',
        'ConditionalExpression',
        'if (animations.length === 0) {',
        'false',
        2559,
        9,
        2559,
        32,
      ],
      [
        '2264',
        'BlockStatement',
        'if (animations.length === 0) {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2559,
        34,
        2562,
        6,
      ],
    ],
  },
  {
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    mutants: [
      [
        '2316',
        'ConditionalExpression',
        'recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2635,
        11,
        2635,
        38,
      ],
      [
        '2564',
        'ConditionalExpression',
        'const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2881,
        29,
        2881,
        56,
      ],
    ],
  },
  {
    reason:
      'Every lifecycle epoch change first installs a superseding operation token. Current operation-token currency therefore already proves the captured epoch equals the live epoch, making this equality operand redundant.',
    mutants: [
      [
        '2353',
        'ConditionalExpression',
        'lifecycleEpoch === lifecycleEpochRef.current,',
        'true',
        2684,
        9,
        2684,
        53,
      ],
    ],
  },
  {
    reason:
      'When no prompt was required, response is the current permission and app context is already active; the extra foreground wait resolves immediately and adopting the same epoch is a no-op. When prompted, the original branch already runs.',
    mutants: [['2400', 'ConditionalExpression', 'if (prompted) {', 'true', 2723, 11, 2723, 19]],
  },
  {
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    mutants: [
      [
        '2406',
        'ConditionalExpression',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        'false',
        2726,
        13,
        2726,
        56,
      ],
      [
        '2407',
        'LogicalOperator',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        '!identityIsCurrent() && !mountedRef.current',
        2726,
        13,
        2726,
        56,
      ],
      [
        '2428',
        'ConditionalExpression',
        'if (!isCurrentLifecycle()) return;',
        'false',
        2742,
        11,
        2742,
        32,
      ],
    ],
  },
  {
    reason:
      'isCurrentLifecycle was checked immediately before this denied-permission branch and includes recorderContextIsActive, which proves mountedRef.current. The nested mounted condition is always true.',
    mutants: [
      ['2433', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 2744, 13, 2744, 31],
    ],
  },
  {
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    mutants: [
      ['2479', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2783, 37, 2783, 42],
      ['2487', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2798, 37, 2798, 42],
    ],
  },
  {
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    mutants: [
      [
        '2501',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'false',
        2817,
        11,
        2817,
        27,
      ],
      [
        '2500',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'true',
        2817,
        11,
        2817,
        27,
      ],
    ],
  },
  {
    reason:
      'After record succeeds, the remaining statements are non-throwing ref and Set updates plus guarded phase publication; the catch cannot observe prepared again. Its reset value is dead.',
    mutants: [['2511', 'BooleanLiteral', 'prepared = false;', 'true', 2831, 18, 2831, 23]],
  },
  {
    reason:
      'Start cleanup preserves the prior active URI whenever it is non-null, so activeUriRef equals previousUri in every recorded fallback case. If both are null, forcing only the equality true still leaves the trailing previousUri falsy and selects idle. The phase result is unchanged.',
    mutants: [
      [
        '2536',
        'ConditionalExpression',
        "updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');",
        'true',
        2854,
        21,
        2854,
        57,
      ],
    ],
  },
  {
    reason:
      'The stop reason is used only to distinguish the literal auto value. Every other value follows the user-stop path, so an empty string and the user default are behaviorally identical.',
    mutants: [
      [
        '2545',
        'StringLiteral',
        "const stopRecording = async (reason: 'user' | 'auto' = 'user') => {",
        '""',
        2866,
        58,
        2866,
        64,
      ],
    ],
  },
  {
    reason:
      'Every owner, endpoint, question, cycle, or recorder replacement synchronously supersedes the lifecycle operation. A current token therefore implies the assessment identity still matches, while the following recorder/context fences reject stale lifecycle work.',
    mutants: [
      [
        '2561',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId)',
        2876,
        7,
        2877,
        93,
      ],
      [
        '2681',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId, cycleId)',
        3000,
        7,
        3001,
        93,
      ],
    ],
  },
  {
    reason:
      'completedTakeIsValid receives the URI separately and rejects null before considering fileIsUsable. Forcing the preceding URI non-null operand true cannot make a null completion valid.',
    mutants: [
      [
        '2588',
        'ConditionalExpression',
        'const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);',
        'true',
        2907,
        28,
        2907,
        40,
      ],
    ],
  },
  {
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    mutants: [
      ['2665', 'ConditionalExpression', 'if (!uri) {', 'false', 2982, 9, 2982, 13],
      [
        '2666',
        'BlockStatement',
        "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      endOperation(operationToken);\n      return;\n    }",
        '{}',
        2982,
        15,
        2987,
        6,
      ],
      ['2667', 'StringLiteral', "updatePhase('idle');", '""', 2983, 19, 2983, 25],
      [
        '2668',
        'StringLiteral',
        "callbacksRef.current.onError(translate('recorder.errNoRecording'));",
        '""',
        2984,
        46,
        2984,
        71,
      ],
      ['3122', 'ConditionalExpression', 'if (!uri) return;', 'false', 3503, 11, 3503, 15],
    ],
  },
  {
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    mutants: [
      [
        '2688',
        'LogicalOperator',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        "controller.signal.reason && new DOMException('The operation was aborted.', 'AbortError')",
        3009,
        11,
        3009,
        99,
      ],
      [
        '2689',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        3009,
        56,
        3009,
        84,
      ],
      [
        '2690',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        3009,
        86,
        3009,
        98,
      ],
      [
        '2828',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        3188,
        32,
        3188,
        60,
      ],
      [
        '2829',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        3188,
        62,
        3188,
        74,
      ],
    ],
  },
  {
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    mutants: [
      [
        '2779',
        'LogicalOperator',
        'throw lastCapacityError ?? new Error();',
        'lastCapacityError && new Error()',
        3145,
        15,
        3145,
        47,
      ],
    ],
  },
  {
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    mutants: [
      [
        '2826',
        'ConditionalExpression',
        'if (cancelPersistence) await cancelPersistence.promise;',
        'true',
        3187,
        13,
        3187,
        30,
      ],
      [
        '2877',
        'BooleanLiteral',
        'const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;',
        'true',
        3238,
        86,
        3238,
        91,
      ],
    ],
  },
  {
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    mutants: [
      ['2878', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 3239, 40, 3239, 45],
      ['2890', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 3255, 38, 3255, 43],
    ],
  },
  {
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    mutants: [
      [
        '2889',
        'BooleanLiteral',
        'const cleared = requestId ? await clearRequestTracking(requestId) : true;',
        'false',
        3254,
        77,
        3254,
        81,
      ],
      ['2954', 'ConditionalExpression', 'if (requestId) {', 'true', 3321, 15, 3321, 24],
    ],
  },
  {
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    mutants: [
      [
        '2969',
        'ConditionalExpression',
        'if (uploadControllerRef.current === controller) {',
        'true',
        3337,
        11,
        3337,
        53,
      ],
    ],
  },
  {
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    mutants: [
      [
        '2993',
        'ConditionalExpression',
        'if (startIsBlocked()) return Promise.resolve();',
        'false',
        3370,
        9,
        3370,
        25,
      ],
    ],
  },
  {
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    mutants: [
      ['3008', 'ConditionalExpression', 'if (!controller) return;', 'false', 3391, 9, 3391, 20],
    ],
  },
  {
    reason:
      'The rewind promise owner handles rejection by releasing the player and reporting once. After finally clears the request flag, the following identity and playability guard returns, so this duplicate catch return has no effect.',
    mutants: [
      [
        '3103',
        'BlockStatement',
        '} catch {\n        // The rewind owner releases the player and reports the failure once.\n        return;\n      } finally {',
        '{}',
        3481,
        15,
        3484,
        8,
      ],
    ],
  },
  {
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    mutants: [
      [
        '3112',
        'ConditionalExpression',
        'previewPlayerRef.current !== null,',
        'true',
        3492,
        11,
        3492,
        44,
      ],
    ],
  },
  {
    reason:
      'If createAudioPlayer throws, continuing reaches addListener on the unset local; the second catch performs best-effort cleanup and emits the same single play-failed callback. The two paths converge.',
    mutants: [
      [
        '3124',
        'BlockStatement',
        "} catch {\n        callbacksRef.current.onError(translate('recorder.errPlayFailed'));\n        return;\n      }",
        '{}',
        3507,
        15,
        3510,
        8,
      ],
    ],
  },
  {
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    mutants: [
      [
        '3143',
        'ConditionalExpression',
        'if (previewPlayerRef.current === player) {',
        'true',
        3527,
        17,
        3527,
        52,
      ],
      [
        '3157',
        'ConditionalExpression',
        'previewRewindPromiseRef.current === rewind &&',
        'true',
        3542,
        17,
        3542,
        59,
      ],
      [
        '3156',
        'LogicalOperator',
        'previewRewindPromiseRef.current === rewind &&\n                previewPlayerRef.current === player',
        'previewRewindPromiseRef.current === rewind || previewPlayerRef.current === player',
        3542,
        17,
        3543,
        52,
      ],
      [
        '3159',
        'ConditionalExpression',
        'previewPlayerRef.current === player',
        'true',
        3543,
        17,
        3543,
        52,
      ],
    ],
  },
  {
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    mutants: [
      ['3175', 'ConditionalExpression', 'if (!player) return;', 'false', 3567, 9, 3567, 16],
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

if (recorderReviewedMutantIds.size !== 191) {
  throw new Error(
    `Recorder equivalence review has ${recorderReviewedMutantIds.size} mutants; expected 191`,
  );
}

// Exact survivors from the completed consent-safe ads campaign. Every
// behaviorally distinct mutant in this lane is killed; these entries retain
// only framework or invariant-level equivalences.
const adsEquivalentMutants = Object.freeze([
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '4',
    mutator: 'BooleanLiteral',
    original: 'const [loadFailed, setLoadFailed] = useState(false);',
    replacements: ['true'],
    reason:
      'The first committed focused effect resets loadFailed to false before any awaited activation can publish success or failure, so the initial seed cannot survive into an actionable placement state.',
    locations: exactLocations(27, 48, 27, 53),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '23',
    mutator: 'ConditionalExpression',
    original: 'if (active) setLoadFailed(false);',
    replacements: ['true'],
    reason:
      'While mounted active is true; after cleanup the extra setter targets a detached component instance and React discards it without a visible effect.',
    locations: exactLocations(50, 11, 50, 17),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '33',
    mutator: 'StringLiteral',
    original: "const unitId = adUnitIdFor('historyNative');",
    replacements: ['""'],
    reason:
      "adUnitIdFor is a closed binary selector: only 'homeBanner' selects the Home key, so every other value selects the same History key.",
    locations: exactLocations(55, 34, 55, 49),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '35',
    mutator: 'ConditionalExpression',
    original: 'if (!native || !unitId) {',
    replacements: ['false'],
    reason:
      'A true history activation has just required the same cached native module and validated unit ID; neither can disappear in production before these synchronous reads.',
    locations: exactLocations(56, 11, 56, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '36',
    mutator: 'LogicalOperator',
    original: 'if (!native || !unitId) {',
    replacements: ['!native && !unitId'],
    reason:
      'Both operands are false after a successful provider activation, so OR and AND produce the same result.',
    locations: exactLocations(56, 11, 56, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '39',
    mutator: 'BlockStatement',
    original:
      'if (!native || !unitId) {\n        if (active) setLoadFailed(true);\n        return;\n      }',
    replacements: ['{}'],
    reason:
      'A true activation has synchronously cached the native module and validated the same History unit ID; neither can disappear before these reads, so this defensive block is unreachable.',
    locations: exactLocations(56, 31, 59, 8),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '40',
    mutator: 'ConditionalExpression',
    original: 'if (active) setLoadFailed(true);',
    replacements: ['true'],
    reason:
      'This statement is inside the unreachable post-activation capability fallback, so changing its nested active guard cannot alter behavior.',
    locations: exactLocations(57, 13, 57, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '41',
    mutator: 'ConditionalExpression',
    original: 'if (active) setLoadFailed(true);',
    replacements: ['false'],
    reason:
      'This statement is inside the unreachable post-activation capability fallback, so changing its nested active guard cannot alter behavior.',
    locations: exactLocations(57, 13, 57, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '42',
    mutator: 'BooleanLiteral',
    original: 'if (active) setLoadFailed(true);',
    replacements: ['false'],
    reason:
      'This setter is inside the unreachable post-activation capability fallback, so changing its assigned value cannot alter behavior.',
    locations: exactLocations(57, 35, 57, 39),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '50',
    mutator: 'ConditionalExpression',
    original: 'if (active) setLoadFailed(true);',
    replacements: ['true'],
    reason:
      'While mounted active is true; after cleanup the extra failure setter targets a detached component instance and React discards it without a visible effect.',
    locations: exactLocations(72, 13, 72, 19),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    reviewedMutantId: '83',
    mutator: 'ConditionalExpression',
    original: 'if (!native) return null;',
    replacements: ['false'],
    reason:
      'nativeAd is assigned only after reading a non-null cached native module; production has no cache-reset operation between that assignment and render.',
    locations: exactLocations(113, 7, 113, 14),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    reviewedMutantId: '129',
    mutator: 'ConditionalExpression',
    original: 'if (active) setValidatedForFocus(ready);',
    replacements: ['true'],
    reason:
      'While mounted the latch is true; after cleanup the continuation can only target a detached component instance, whose state update React 19 discards without a visible effect.',
    locations: exactLocations(34, 11, 34, 17),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    reviewedMutantId: '131',
    mutator: 'BlockStatement',
    original: 'return () => {\n      active = false;\n    };',
    replacements: ['{}'],
    reason:
      'Removing this cleanup only permits the same post-unmount update to a detached component; it cannot validate the newly mounted focus-cycle instance.',
    locations: exactLocations(36, 18, 38, 6),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    reviewedMutantId: '132',
    mutator: 'BooleanLiteral',
    original: 'active = false;',
    replacements: ['true'],
    reason:
      'Leaving the detached instance latch true has the same unobservable post-unmount state-update behavior as removing its cleanup block.',
    locations: exactLocations(37, 16, 37, 21),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    reviewedMutantId: '159',
    mutator: 'ConditionalExpression',
    original: 'setMeasuredSlotWidth((current) => (current === measured ? current : measured));',
    replacements: ['false'],
    reason:
      'When current equals measured, returning measured is the same primitive value as returning current; when unequal, both the original and mutant return measured.',
    locations: exactLocations(53, 46, 53, 66),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ObjectLiteral',
    original: '}>({ promise: null });',
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
    original: 'if (expectedConsentEpoch !== consentEpochRef.current) return false;',
    replacements: ['true'],
    count: 2,
    reason:
      'These returns occur only after privacy invalidation changed both the consent epoch and placement token; every activation consumer rejects itself regardless of the stale promise value.',
    locations: exactLocations(183, 72, 183, 77, 191, 72, 191, 77),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ConditionalExpression',
    original: 'if (!ready && initializationPromiseRef.current === initialization) {',
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
    original: 'const activationToken = activationTokensRef.current[placement] + 1;',
    replacements: ['activationTokensRef.current[placement] - 1'],
    reason:
      'Activation tokens are compared only for exact identity; changing direction still creates one distinct token and the consent epoch independently fences privacy transitions.',
    locations: exactLocations(211, 31, 211, 73),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ConditionalExpression',
    original: 'consentEpochRef.current === consentEpoch;',
    replacements: ['true'],
    reason:
      'Every consent-epoch change synchronously advances both placement tokens, so the sibling token equality already makes the activation stale.',
    locations: exactLocations(216, 9, 216, 49),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'ArrowFunction',
    original: 'const transitionAllowsAds = await privacyTransition.catch(() => false);',
    replacements: ['() => undefined'],
    reason:
      'A rejected privacy transition treats this fallback only as a falsy allow/deny value; false and undefined both block activation.',
    locations: exactLocations(222, 67, 222, 78),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'AssignmentOperator',
    original: 'consentEpochRef.current += 1;',
    replacements: ['consentEpochRef.current -= 1'],
    reason:
      'The consent epoch is an equality-only generation token; either operation changes its identity.',
    locations: exactLocations(251, 7, 251, 35),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'AssignmentOperator',
    original: 'activationTokensRef.current.homeBanner += 1;',
    replacements: ['activationTokensRef.current.homeBanner -= 1'],
    reason:
      'The Home activation token is equality-only; either direction invalidates every captured token.',
    locations: exactLocations(252, 7, 252, 50),
  },
  {
    file: 'src/lib/ads.tsx',
    mutator: 'AssignmentOperator',
    original: 'activationTokensRef.current.historyNative += 1;',
    replacements: ['activationTokensRef.current.historyNative -= 1'],
    reason:
      'The History activation token is equality-only; either direction invalidates every captured token.',
    locations: exactLocations(253, 7, 253, 53),
  },
]);

// Exact survivors from the completed retained-recordings campaign. Every
// reachable race, state, cache, accessibility, and presentation mutant is
// killed; these are only React lifecycle or correlated-token equivalences.
const recordingsEquivalentMutants = Object.freeze([
  {
    file: 'src/app/recordings.tsx',
    reviewedMutantId: '73',
    mutator: 'BooleanLiteral',
    original: 'const queuedOlderRef = useRef(false);',
    replacements: ['true'],
    reason:
      'The mount effect overwrites this seed with false before a rendered list can expose any paging handler, including after the Strict Effects setup/cleanup/setup probe.',
    locations: exactLocations(120, 33, 120, 38),
  },
  {
    file: 'src/app/recordings.tsx',
    reviewedMutantId: '85',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'Both dependency literals contain values that stay Object.is-equal for the component lifetime, so the mount cleanup cadence is identical.',
    locations: exactLocations(135, 6, 135, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '334',
    mutator: 'StringLiteral',
    original: "const [phase, setPhase] = useState<PlaybackPhase>('idle');",
    replacements: ['""'],
    reason:
      "The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
    locations: exactLocations(184, 53, 184, 59),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '336',
    mutator: 'ConditionalExpression',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['true'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison true is unobservable.',
    locations: exactLocations(214, 41, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '337',
    mutator: 'ConditionalExpression',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['false'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison false is unobservable.',
    locations: exactLocations(214, 41, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '338',
    mutator: 'EqualityOperator',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ["recordingStatus !== 'unavailable'"],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so reversing the comparison is unobservable.',
    locations: exactLocations(214, 41, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '339',
    mutator: 'StringLiteral',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['""'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so changing the compared literal is unobservable.',
    locations: exactLocations(214, 61, 214, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '373',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'cancelDelete receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(241, 6, 241, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '399',
    mutator: 'OptionalChaining',
    original: 'playerListenerRef.current?.remove();',
    replacements: ['playerListenerRef.current.remove'],
    reason:
      'When the listener is null the direct dereference throws inside the surrounding best-effort catch; both forms then clear the ref and continue through identical player cleanup.',
    locations: exactLocations(269, 7, 269, 40),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '401',
    mutator: 'OptionalChaining',
    original: 'player?.pause();',
    replacements: ['player.pause'],
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; all following release state is identical.',
    locations: exactLocations(277, 7, 277, 20),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '403',
    mutator: 'OptionalChaining',
    original: 'player?.remove();',
    replacements: ['player.remove'],
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; owner release and ref cleanup are unchanged.',
    locations: exactLocations(282, 7, 282, 21),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '406',
    mutator: 'ArrayDeclaration',
    original: '}, [clearPlaybackPrepareTimer]);',
    replacements: ['[]'],
    reason:
      'clearPlaybackPrepareTimer is an empty-dependency callback with stable identity, so removing it from releasePlayer dependencies cannot stale the callback.',
    locations: exactLocations(291, 6, 291, 33),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '409',
    mutator: 'ConditionalExpression',
    original: 'if (mountedRef.current !== true) return;',
    replacements: ['false'],
    reason:
      'The only added reset calls target an already detached component after layout cleanup; React discards those state setters, while every mounted call already passes the guard.',
    locations: exactLocations(294, 9, 294, 36),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '413',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'resetPlaybackUi receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(298, 6, 298, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '415',
    mutator: 'ArrayDeclaration',
    original: '}, [releasePlayer, resetPlaybackUi]);',
    replacements: ['[]'],
    reason:
      'Both dependencies are empty-dependency callbacks with permanently stable identities, so omitting them cannot change stopPlayback.',
    locations: exactLocations(303, 6, 303, 38),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '420',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, cancelShare, releasePlayer]);',
    replacements: ['[]'],
    reason:
      'cancelDelete, cancelShare, and releasePlayer all retain stable callback identities, so removing them does not alter layout cleanup cadence.',
    locations: exactLocations(313, 6, 313, 48),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '445',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, cancelShare, stopPlayback]),',
    replacements: ['[]'],
    reason:
      'cancelDelete, cancelShare, and stopPlayback all retain stable callback identities, so removing them does not alter focus setup or cleanup.',
    locations: exactLocations(352, 8, 352, 49),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '458',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, cancelShare, stopPlayback]);',
    replacements: ['[]'],
    reason:
      'cancelDelete, cancelShare, and stopPlayback all retain stable callback identities, so removing them does not alter AppState subscription lifetime.',
    locations: exactLocations(364, 6, 364, 47),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '514',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current === identityToken &&',
    replacements: ['true'],
    reason:
      'After the entry identity fence creates an operation, every identity change synchronously replaces both its operation token and lifecycle symbol; either unchanged guard rejects the same continuations.',
    locations: exactLocations(424, 7, 424, 53),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '782',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current !== expectedIdentity ||',
    replacements: ['false'],
    reason:
      'The destructive callback carries the lifecycle captured with this identity token, and every identity commit replaces that lifecycle synchronously; the adjacent context guard rejects exactly the same stale callback.',
    locations: exactLocations(673, 9, 673, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '794',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current === expectedIdentity && contextIsCurrent(lifecycle);',
    replacements: ['true'],
    reason:
      'The delete operation retains the lifecycle captured with expectedIdentity; an identity change replaces that lifecycle, so contextIsCurrent becomes false on every path where this equality becomes false.',
    locations: exactLocations(689, 9, 689, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '822',
    mutator: 'OptionalChaining',
    original: 'void Promise.resolve(onDeletedRef.current?.(recordingId)).catch(() => undefined);',
    replacements: ['onDeletedRef.current(recordingId)'],
    reason:
      'When the optional callback is absent, the direct call throws inside the surrounding try and is swallowed; when present both forms invoke it, so the committed deletion and visible state are identical.',
    locations: exactLocations(706, 32, 706, 67),
  },
]);

// A location can be reused by unrelated code after a refactor. Pinning the
// complete reviewed source file makes that collision fail closed even when the
// new node happens to have identical text and coordinates.
export const equivalentMutantSourceHashes = Object.freeze({
  'src/app/(auth)/forgot-password.tsx':
    '04a04ff536d058fdc04a497584134239e8d22666a748306f4ea688c4689f405b',
  'src/app/(auth)/login.tsx': '7d81667492631ac6ef2872ac7761495d2c28b31902d8a76450c09780605168c4',
  'src/app/(auth)/reset-password.tsx':
    'c8dfd19ee7cf01ae58ad0bca9cd167c6a54f267a18d3995c8f2cfa93c1fa2920',
  'src/app/(auth)/signup.tsx': '095c290d2788ff06c3aa5254acba9928c04eaa34126a76b34e3fd2b4365a472c',
  'src/app/_layout.tsx': '066ff268547b08ce7ce08b27567a339d3bc6fdd7d909c2b5dd6aa928e0f19f1c',
  'src/app/diagnostic.tsx': 'd2742a92f7cf2e9deede04cf722abbb75ce6efad298511f4acb4977e1af696e4',
  'src/app/history.tsx': 'b3499e7112f3a2b3c81a43bb232e6f23ea69fd08a58351bae3b5d50d733628fd',
  'src/app/home.tsx': 'aba9bbb302806ba971175bf3402c07b7977d09b5d39aa1b0cbf7bc631baaa3a8',
  'src/app/index.tsx': 'eff39e0a6c07398ba368cabbc992cb600c054c718305963a7e086702932d34a0',
  'src/app/practice/attempt.tsx':
    'e9c6cbbddda393b87a0696ff512cd072bdc362bbcdf7c7de49f37499db224200',
  'src/app/practice/feedback.tsx':
    '3d0f0b2ca9942f72e36e442a863aa0a1517b7359cb9ddf676bea02146d95698f',
  'src/app/practice/help.tsx': 'be8b118495ef82d1b60e7dd5e3c00050ad584543e1437e69a3b2cff445588b16',
  'src/app/practice/index.tsx': '08ff2d80ca2a2cd1ea4e024483e2b4b8cd12bac5c32985c65e991db93f702070',
  'src/app/recordings.tsx': '7dff9f79d9477ff7b2658ff33e75415ce0f3bd9e771431ad8f07f028a4554b6b',
  'src/app/settings/change-password.tsx':
    'ed5ad50e173d6cbc9621c2ac81b52d4ddc4feba9d64632b311d10ba7263f8f7f',
  'src/app/settings/delete-account.tsx':
    '4f328c3b54650eca959a60092c9c565a3a31f0563a985284e87a1513e1303aeb',
  'src/app/settings/index.tsx': '8181bcdfa8697cb5f02a1370473cd599d31c09d90f98070b3385a7828d757983',
  'src/components/HistoryNativeAdCard.tsx':
    '7b9e73e7bbefd78e19f6fbaf2e05ff3a55c8a39a74a8628f793fa7d925be219f',
  'src/components/HomeBannerAd.tsx':
    'cfe7eb99363fcb307402dc6a61787f16c0461d5efc9322b653abf1996e17ce9a',
  'src/components/Recorder.tsx': '18aab801136a635af991e4295e91f579f555e51386b4d90d26a0028576f48f66',
  'src/components/RecordingPlayback.tsx':
    '6120e0814f92435306eac879f26afd75868f7e2ba3656e0021610e3239e911a3',
  'src/lib/ads.tsx': '4db444735e7e7e675332e7d6f86dfa98def9afa941b49099d19dc929b6bd2854',
  'src/lib/api.ts': '2c6c949e1897a4c11496309ef6b05589d2e9c7d7c769eed610b134c4ccd5ead7',
  'src/lib/auth.tsx': 'f38c3527745a51a845908cca9c6bb2350fb4511dd7922be97d7d4067b2e5ea32',
  'src/lib/daily-reminder.ts': '0e6821bf70540f27f825ea26760e2381236b47b60e84ca995c437f51efba2c4d',
  'src/lib/pending-assessment.ts':
    '0e0645c0109edead61a4f5cb69115bea3112fd4185f56d9f1887b569b44935eb',
  'src/lib/practice-flow.tsx': '8c11a33901e1439953724adfc4fde4811d574ae2ed121d211c73af340ac993f6',
  'src/lib/types.ts': 'c00e66b1dd0a01659e98315731f67259c93508453ca4041a65e383df75da0d9a',
  'src/lib/use-hardware-back.ts':
    '5475b83704855734d76575346649f1d1df70dcf9c8e48b270d15364425f279f2',
});

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
      count: 2,
      reason:
        'The login mount and notice effects each receive a dependency literal whose constant element compares equal on every render. Their setup and cleanup lifetimes are unchanged.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'maxQuestions < 1 ||',
      replacements: ['false'],
      reason:
        'Acceptance also requires asked >= 0 and asked < maxQuestions. For an integer maxQuestions those bounds already imply maxQuestions >= 1, so this clause can never be the sole rejecter.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: "typeof passed !== 'boolean' ||",
      replacements: ['false'],
      count: 3,
      reason:
        'Diagnostic, scored-attempt, and history parsing immediately compare passed with a score-derived boolean using strict inequality. Every non-boolean still fails that invariant, so the explicit type guard cannot decide acceptance.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'if (level !== undefined || nextQuestion === undefined) {',
      replacements: ['false'],
      reason:
        'If nextQuestion is undefined, falling through reaches parseWith(nextQuestion, isQuestion), which throws the identical ContractError. The sibling level guard remains independently exercised.',
    },

    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: "typeof mastered !== 'boolean' ||",
      replacements: ['false'],
      reason:
        'The later strict comparison with the mastery score derives a boolean and rejects every non-boolean mastered value.',
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
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original:
        'if (attemptsLeft !== 0 || !isBoundedNonEmptyString(finalFeedback, 4_000) || next === undefined) {',
      replacements: ['false'],
      reason:
        'The preceding attemptsLeft !== 0 branch either returns or throws. Reaching this final branch therefore already proves attemptsLeft is zero.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'BlockStatement',
      original: '} catch {\n    return false;\n  }',
      replacements: ['{}'],
      reason:
        'safeUploadUrl is private and consumed only inside an && chain, where the undefined fallthrough from an emptied catch and false are indistinguishable.',
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
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original:
        "if (typeof audioKey !== 'string' || typeof endpoint !== 'string' || !safeAudioKey(audioKey)) {",
      replacements: ['false'],
      reason:
        'Every non-string endpoint misses all three strict endpoint comparisons and reaches the explicit false fallback without coercion, so this runtime type clause cannot decide the result.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'BlockStatement',
      original: '} else {\n    return false;\n  }',
      replacements: ['{}'],
      reason:
        'Without the explicit fallback return, expectedScope remains undefined and the final comparison with the string key scope is still false for every unknown endpoint.',
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'ConditionalExpression',
      // Deliberately the whole line: `items.length === 0` also opens lines 205
      // and 223, where the same mutation IS killed. Keying on the enclosing line
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
        'const canPractice = hasProfile && user?.diagnosticCompleted === true && !placementRevealPending;',
        'guard={hasProfile && (user?.diagnosticCompleted === false || placementRevealPending)}',
      ],
      replacements: ['user.diagnosticCompleted'],
      count: 2,
      reason:
        'Both optional accesses remain on the right side of a hasProfile conjunction. hasProfile includes !!user and short-circuits before either access, so direct property access cannot throw.',
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
        'With no user, an enabled profile query has no data while pending, so profile is null and the following loading fallback renders the same LoadingView. With a user, this condition is false already.',
    },
    {
      file: 'src/app/index.tsx',
      mutator: 'BlockStatement',
      original:
        "if (!user && meQuery.isPending) {\n    return <LoadingView label={t('gate.loadingProfile')} />;\n  }",
      replacements: ['{}'],
      reason:
        'Emptying the pending-user block falls through to the profile fallback, which renders the same loading view for the still-null profile.',
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
      mutator: 'ArrayDeclaration',
      original: 'const [answers, setAnswers] = useState<DiagnosticAnswerSummary[]>([]);',
      replacements: ['["Stryker was here"]'],
      reason:
        'Answers are rendered only in the completed-level view, which can be reached only after the identity layout effect has reset this initial array before passive or network publication.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;',
      replacements: ['true'],
      reason:
        'On an identity refresh the ref still equals the closing identity; on unmount the earlier outer layout cleanup has already nulled it. Assigning null in either case is immediately overwritten by the next setup or repeats the existing unmount state.',
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
      originals: ['}, []);', '[],'],
      replacements: ['["Stryker was here"]'],
      count: 5,
      reason:
        'The setUser, isSessionLeaseCurrent, schedulePendingCleanup, retrySessionRestore, and failed-transition lease-rearm callbacks capture only stable setters, refs, or module functions. Either constant dependency literal preserves their lifetime.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArrayDeclaration',
      original: '[],',
      replacements: ['["Stryker was here"]'],
      count: 2,
      reason:
        'The captureSessionLease callback and the unmount-only effect both receive a dependency array that is constant across renders. Replacing one constant element with another cannot change callback recreation or effect setup/cleanup timing.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, [schedulePendingCleanup]);',
      replacements: ['[]'],
      reason:
        'schedulePendingCleanup is itself stable for the provider’s lifetime, so omitting it cannot change waitForPendingCleanup identity or leave the wait loop with a stale cleanup function.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'ArithmeticOperator',
      original: 'setRestoreAttempt((attempt) => attempt + 1);',
      replacements: ['attempt - 1'],
      reason:
        'restoreAttempt is neither rendered nor arithmetically consumed; it is only an effect dependency. Incrementing or decrementing produces a distinct monotonic value on every retry and therefore triggers the same restore cycle.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'BlockStatement',
      original: 'return () => {\n      cancelled = true;\n    };',
      replacements: ['{}'],
      reason:
        'A dependency refresh immediately runs the replacement effect, which increments epochRef, while unmount runs the dedicated epoch increment before promise continuations resume. The captured epoch can therefore never remain current after this cleanup, so the adjacent epoch guard already rejects the stale restore.',
    },
    {
      file: 'src/lib/auth.tsx',
      mutator: 'BooleanLiteral',
      original: 'cancelled = true;',
      replacements: ['false'],
      reason:
        'Leaving cancelled false is covered by the same epoch invalidation as the cleanup-block mutant: dependency refresh and unmount both make the captured epoch stale before asynchronous restore work can publish.',
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
      original: '}, [cancelFocusRevalidation]);',
      replacements: ['[]'],
      reason:
        'cancelFocusRevalidation is an empty-dependency callback with stable identity, so removing it from the mount layout effect dependencies does not alter setup or cleanup cadence.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: '!user ||\n      !question ||',
      replacements: ['false'],
      reason:
        'Recorder onResult exists only in a render with a signed-in user and a parsed question, so this leading subgroup is false whenever the callback can run.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'LogicalOperator',
      original: '!user ||\n      !question ||',
      replacements: ['!user && !question'],
      reason:
        'The same callable-Recorder invariant makes both operands false, so changing OR to AND cannot alter the leading subgroup.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'StringLiteral',
      original: "key={`${cycleId}:${nativeMode ? 'native' : 'english'}`}",
      replacements: ['""'],
      count: 2,
      reason:
        'The Recorder remains its parent’s only child. The cycle prefix is unchanged and either emptied mode branch stays distinct from its sibling, preserving remount behavior.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The mount layout effect receives a constant dependency literal, preserving its setup and cleanup lifetime.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ConditionalExpression',
      original: '!user ||\n      !validQuestionId ||',
      replacements: ['false'],
      reason:
        'Recorder onResult is rendered only after user and the UUID question parameter pass their route gates, so this leading subgroup remains false even though later cycle/content guards were added.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'LogicalOperator',
      original: '!user ||\n      !validQuestionId ||',
      replacements: ['!user && !validQuestionId'],
      reason:
        'Recorder onResult is rendered only after user and the UUID question parameter pass their route gates; changing this constant-false OR subgroup to AND cannot alter the full guard.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'StringLiteral',
      original: "key={`${validCycleId}:${nativeMode ? 'native' : 'english'}`}",
      replacements: ['""'],
      count: 2,
      reason:
        'The Recorder is its parent view’s only child. The cycle prefix remains unchanged and either emptied mode branch stays distinct from its sibling, so remount behavior is identical.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "const canonicalName = user?.name ?? '';",
      replacements: ['"Stryker was here!"'],
      reason:
        'The fallback is rendered only while user is null, when the screen returns null. When a user arrives, the canonical-name layout effect synchronously replaces the hidden seed before interaction.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'const navigationStartedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'The focus effect writes false before a committed screen can receive interaction, so the render-time seed is never the authoritative navigation latch.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'const nameDirtyRef = useRef(false);',
      replacements: ['true'],
      reason:
        'The canonical-name layout effect writes false before the input can receive interaction, so this initial value is dead.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '[],',
      replacements: ['["Stryker was here"]'],
      reason:
        'blockingOperationActive reads only refs whose objects are stable for the component lifetime. Either dependency literal is constant, so callback identity and captures are unchanged.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, [blockingOperationActive, navigation]);',
      replacements: ['[]'],
      reason:
        'blockingOperationActive and the navigator object are stable within the mounted route, so removing them cannot stale publishNavigationLock.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, [navigation, screenBusy]);',
      replacements: ['[]'],
      reason:
        'Every operation synchronously publishes lock and unlock state through its ref latch. This layout effect is a duplicate projection of the same busy state, so dependency-driven repeats cannot change header state.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, [blockingOperationActive, navigation]);',
      replacements: ['[]'],
      reason:
        'The beforeRemove effect captures the same stable ref reader and mounted navigator object, so its subscription behavior is unchanged.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []),',
      replacements: ['["Stryker was here"]'],
      reason:
        'The focus callback dependency literal is constant across renders, so the focus lifecycle is identical.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BlockStatement',
      original:
        'useLayoutEffect(() => {\n    navigationRef.current = navigation;\n  }, [navigation]);',
      replacements: ['{}'],
      reason:
        'navigationRef is initialized from the mounted navigator, whose identity is stable for this route. The defensive refresh never supplies a different object.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, [navigation]);',
      replacements: ['[]'],
      reason: 'Same stable-navigation argument as the layout-effect block entry.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (activeIdentityRef.current !== activeIdentity) {',
      replacements: ['true'],
      reason:
        'The condition is false only on initial setup, where clearing null/false confirmation state and publishing the already-unlocked header are no-ops. Every later setup follows cleanup setting the identity ref null.',
    },

    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (ownsReminderLatch) {',
      replacements: ['true'],
      reason:
        'When another operation owns the latch, entering this setup body only writes the already-true state. The unchanged ownsReminderLatch remains false in finally, so this mutation cannot release the other owner.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'reminderBusyRef.current = true;',
      replacements: ['false'],
      reason:
        'This assignment runs only when the language change owns the reminder latch. languageBusyRef is already true for that entire interval and independently blocks reminder mutations and navigation, while setReminderBusy(true) still publishes the UI busy state; finally writes the reminder ref false in either version.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ObjectLiteral',
      original: 'const exportArtifact: { current: OwnedPrivateFile | null } = { current: null };',
      replacements: ['{}'],
      reason:
        'Undefined and null artifact current values are indistinguishable on every pre-file exit; a valid first export page assigns an OwnedPrivateFile before any required dereference.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "throw new DOMException('The export session expired.', 'AbortError');",
      replacements: ['""'],
      reason:
        'The abort message is never rendered or otherwise consumed; the already-aborted controller suppresses the UI error.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "throw new DOMException('The export session expired.', 'AbortError');",
      replacements: ['""'],
      reason:
        'The DOMException name is likewise unobserved because suppression keys off controller.signal.aborted.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "throw new Error('The export contains an invalid attempt.');",
      replacements: ['""'],
      reason:
        'The internal invalid-attempt serialization message is sanitized to the same localized export fallback.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "throw new Error('The export snapshots are invalid.');",
      replacements: ['""'],
      reason:
        'The internal invalid-snapshot serialization message is sanitized to the same localized export fallback.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: "if (!documentStarted) throw new Error('The export returned no pages.');",
      replacements: ['false'],
      reason:
        'Without an attempt page, the following attempt/practice-cycle/recording completion guards still throw the same sanitized export failure; with a page this condition is already false.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "if (!documentStarted) throw new Error('The export returned no pages.');",
      replacements: ['""'],
      reason: 'The no-page Error text is sanitized to the same localized export fallback.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original:
        "if (completedArtifact === null) throw new Error('The export file is unavailable.');",
      replacements: ['false'],
      reason:
        'documentStarted becomes true only after assigning and writing exportArtifact.current, so the completedArtifact null branch is unreachable.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original:
        "if (completedArtifact === null) throw new Error('The export file is unavailable.');",
      replacements: ['""'],
      reason: 'The missing-artifact Error text is unreachable and sanitized in any case.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'OptionalChaining',
      original: 'exportArtifact.current?.release();',
      replacements: ['exportArtifact.current.release'],
      reason:
        'When no artifact exists, direct dereference throws inside the surrounding best-effort catch; when one exists, both variants release it.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderCanHandle() || !current.enabled) return;',
      replacements: ['false'],
      reason:
        'applyReminder repeats the render fence, and hour-step handlers are rendered only while the captured reminder is enabled.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!renderCanHandle() || !current.enabled) return;',
      replacements: ['!renderCanHandle() && !current.enabled'],
      reason:
        'The render fence is repeated by applyReminder and a disabled reminder has no hour-step handler, so weakening this pair is unobservable.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {',
      replacements: ['false'],
      reason:
        'retakeTest is invoked only by the confirmation callback immediately after owner and render checks; no await permits busy/logout ownership to change between them.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {',
      replacements: ['(!renderCanHandle() || retakeBusyRef.current) && logoutBusyRef.current'],
      reason: 'Same unreachable defensive retake guard as the whole conditional entry.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {',
      replacements: ['false'],
      reason: 'Same unreachable defensive retake guard, for its render/busy prefix node.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {',
      replacements: ['!renderCanHandle() && retakeBusyRef.current'],
      reason: 'Same unreachable defensive retake guard, for its render/busy operator node.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BlockStatement',
      original:
        'if (!renderCanHandle() || retakeBusyRef.current || logoutBusyRef.current) {\n      return false;\n    }',
      replacements: ['{}'],
      reason: 'The guarded return is unreachable on retakeTest’s sole call path.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'return false;',
      replacements: ['true'],
      reason: 'The guarded return is unreachable on retakeTest’s sole call path.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'return true;',
      replacements: ['false'],
      reason:
        'The false return only asks the confirmation callback to publish the already-locked header once more; retakeBusyRef is already true.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderOwnsIdentity()) return;',
      replacements: ['false'],
      reason:
        'Identity and unmount cleanup clear retakeConfirmingRef first, so the preceding owner check rejects every stale close callback before this guard.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderOwnsIdentity()) return;',
      replacements: ['false'],
      reason:
        'The confirmation owner is cleared on identity loss, so the preceding owner check rejects stale confirm callbacks before this guard.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'if (!retakeTest()) publishNavigationLock();',
      replacements: ['retakeTest()'],
      reason:
        'On the only reachable path retakeTest returns true; the mutation performs one redundant publish of the already-locked header.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'OptionalChaining',
      original: "nameDirtyRef.current = value !== (userRef.current?.name ?? '');",
      replacements: ['userRef.current.name'],
      reason:
        'renderCanHandle on a rendered TextInput implies the current session still has a non-null user, so optional chaining cannot short-circuit.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "nameDirtyRef.current = value !== (userRef.current?.name ?? '');",
      replacements: ['"Stryker was here!"'],
      reason:
        'The null-user fallback is unreachable after renderCanHandle succeeds for a rendered profile input.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'OptionalChaining',
      original: "const currentName = userRef.current?.name ?? '';",
      replacements: ['userRef.current.name'],
      reason:
        'renderOwnsIdentity on a rendered profile input implies userRef.current is non-null, so optional chaining cannot short-circuit.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "const currentName = userRef.current?.name ?? '';",
      replacements: ['"Stryker was here!"'],
      reason:
        'The null-user fallback is unreachable after renderOwnsIdentity succeeds for a rendered profile input.',
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
      count: 2,
      reason:
        'host comes from WHATWG URL.hostname, which permits brackets only as the outer delimiters of an IPv6 literal. Dropping either regex anchor therefore cannot change a replacement target.',
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
      mutator: 'OptionalChaining',
      original: "signal?.removeEventListener('abort', listener);",
      replacements: ['signal.removeEventListener'],
      reason:
        "When signal is present both forms remove the same listener. When it is absent, the direct property access throws inside removeAbortListener's best-effort try/catch and is swallowed, so callers observe the same no-throw cleanup.",
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
      original: 'if (body) void Promise.resolve(body.cancel()).catch(() => undefined);',
      replacements: ['true'],
      reason:
        'Response.body is either a stream or null. Forcing the null case through body.cancel throws inside the enclosing best-effort try/catch and is swallowed, exactly like skipping cancellation when no stream exists.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: ': res.status === 503',
      replacements: ['true', 'false'],
      count: 2,
      reason:
        'The 503 and REQUEST_IN_FLIGHT branches select equal 120-second retry ceilings. Forcing the nested status selector either way therefore preserves the parsed bound.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'EqualityOperator',
      original: ': res.status === 503',
      replacements: ['res.status !== 503'],
      reason:
        'Reversing the same selector only swaps two branches whose maximum is the identical value 120.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'LogicalOperator',
      original: "typeof hours === 'number' &&\n      Number.isFinite(hours) &&",
      replacements: ["typeof hours === 'number' || Number.isFinite(hours)"],
      reason:
        'Number.isFinite subsumes the typeof test, and the surviving positive/maximum bounds reject NaN and both infinities regardless of which way this pair is combined.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: "typeof fileSize !== 'number' ||",
      replacements: ['false'],
      reason:
        'The following !Number.isFinite(fileSize) is already true for every non-number, so this clause cannot change which files are rejected. It narrows the snapshotted value for the size comparisons below.',
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
    },
    // Auth-screen lifecycle guards. Navigation dependency and idle-link mutants
    // deliberately remain outside this registry because their owning tests can
    // observe a replaced navigator and an unblocked idle link.
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(true);',
      replacements: ['false'],
      reason:
        'Login synchronously sets mountedRef true in its mount layout effect before an event or async continuation can read the seed.',
    },
    {
      file: 'src/app/(auth)/signup.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(true);',
      replacements: ['false'],
      reason:
        'Signup synchronously sets mountedRef true in its mount layout effect before an event or async continuation can read the seed.',
    },
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'The login navigation-lock publisher is called initially while mounted, and its async-finalizer caller already sits inside an equivalent mountedRef guard.',
    },
    {
      file: 'src/app/(auth)/signup.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'The signup navigation-lock publisher is called initially while mounted, and its async-finalizer caller already sits inside an equivalent mountedRef guard.',
    },
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'After unmount, weakening the login catch guard only computes safe copy and targets detached React state, which React discards without an external effect.',
    },
    {
      file: 'src/app/(auth)/signup.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'After unmount, weakening the signup catch guard only computes safe copy and targets detached React state, which React discards without an external effect.',
    },
    {
      file: 'src/app/(auth)/login.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) {',
      replacements: ['true'],
      reason:
        'In the login finalizer the nested navigation publisher rechecks mountedRef and the remaining setState targets a detached fiber, so forcing the outer guard true cannot publish after unmount.',
    },
    {
      file: 'src/app/(auth)/signup.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) {',
      replacements: ['true'],
      reason:
        'In the signup finalizer the nested navigation publisher rechecks mountedRef and the remaining setState targets a detached fiber, so forcing the outer guard true cannot publish after unmount.',
    },
    {
      file: 'src/app/(auth)/signup.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The signup mount effect receives a dependency literal whose constant element compares equal on every render, preserving its setup and cleanup lifetime.',
    },
    // Forgot/reset-password lifecycle equivalents. The navigator dependencies
    // and idle back-link guards remain live gaps.
    {
      file: 'src/app/(auth)/forgot-password.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(true);',
      replacements: ['false'],
      reason:
        'Forgot password overwrites the mounted seed to true in a layout effect before any user event or async continuation can observe it.',
    },
    {
      file: 'src/app/(auth)/reset-password.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(true);',
      replacements: ['false'],
      reason:
        'Reset password overwrites the mounted seed to true in a layout effect before any user event or async continuation can observe it.',
    },
    {
      file: 'src/app/(auth)/forgot-password.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The forgot-password mount layout effect receives a constant dependency literal, so setup and cleanup still run exactly once.',
    },
    {
      file: 'src/app/(auth)/reset-password.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The reset-password mount layout effect receives a constant dependency literal, so setup and cleanup still run exactly once.',
    },
    {
      file: 'src/app/(auth)/forgot-password.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'The forgot-password navigation-lock publisher is synchronous while mounted, and its async finalizer already guards invocation with mountedRef.',
    },
    {
      file: 'src/app/(auth)/reset-password.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'The reset-password navigation-lock publisher is synchronous while mounted, and its async finalizer already guards invocation with mountedRef.',
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
    },
    {
      file: 'src/app/home.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []),',
      replacements: ['["Stryker was here"]'],
      reason:
        'The focus callback receives a constant dependency literal, so either constant array gives it the same lifetime.',
    },
    // History: page-option differences are unreachable while a fetch is active;
    // the queue/session/lifecycle guards remain deliberately unexempted.
    {
      file: 'src/app/history.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'The mount effect sets the ref true before a native press or end-reached event can invoke loadOlder, its only reader before cleanup.',
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The mount effect dependency literal remains element-wise constant and therefore keeps the same setup and cleanup lifetime.',
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'OptionalChaining',
      original:
        'const fetchDirection = (queryState?.fetchMeta as HistoryFetchMeta | null)?.fetchMore?.direction;',
      replacements: ['(queryState?.fetchMeta as HistoryFetchMeta | null)?.fetchMore.direction'],
      reason:
        'For this infinite query fetchMeta is either null for an ordinary fetch or the observer-supplied object containing fetchMore; a non-null meta with missing fetchMore is unreachable.',
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'OptionalChaining',
      originals: [
        "(queryState?.fetchStatus === 'fetching' && fetchDirection === 'forward')",
        "if (queryState?.fetchStatus === 'fetching') {",
      ],
      replacements: ['queryState.fetchStatus'],
      count: 2,
      reason:
        'A rendered non-empty history list has an active observer for queryKey, so getQueryState cannot be undefined while either load-more check executes.',
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'ObjectLiteral',
      originals: [
        'return historyQuery.fetchNextPage({ cancelRefetch: false });',
        'void historyQuery.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);',
      ],
      replacements: ['{}'],
      count: 2,
      reason:
        'Both calls are reached only with no active fetch: the direct path checks live query state, and the queued path runs immediately after its joined refresh settles. The default cancelRefetch value therefore has nothing to cancel.',
    },
    {
      file: 'src/app/history.tsx',
      mutator: 'BooleanLiteral',
      originals: [
        'return historyQuery.fetchNextPage({ cancelRefetch: false });',
        'void historyQuery.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);',
      ],
      replacements: ['true'],
      count: 2,
      reason:
        'As at the paired ObjectLiteral sites, the fetch is idle when either call occurs, so true and false cancelRefetch values are behaviorally identical.',
    },
    // Diagnostic seeds and redundant lifecycle fences. Recorder-owner, recovery,
    // session, query-cancellation, and logout behavior remains unexempted.
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
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      originals: ['const mountedRef = useRef(true);', 'const accountActionRef = useRef(true);'],
      replacements: ['false'],
      count: 2,
      reason:
        'The mount and focus/identity effects overwrite both seeds before any rendered action or async continuation reads them.',
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
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
      replacements: ['true'],
      count: 2,
      reason:
        'Each mutated cleanup still leaves the sibling mounted/focus fence false and clears active identity and Recorder ownership.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      original: 'accountActionRef.current = true;',
      replacements: ['false'],
      count: 2,
      reason:
        'At both cleanup sites focusedRef is already false, so renderOwnsWork rejects every account action; refocus setup writes the latch false deliberately.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ArrayDeclaration',
      originals: ['}, []);', '}, []),'],
      replacements: ['["Stryker was here"]'],
      count: 2,
      reason:
        'The mount layout effect and focus callback each receive a constant dependency literal, preserving their lifetimes.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      originals: ['recorderLockedRef.current = false;', 'setRecorderExitLocked(false);'],
      replacements: ['true'],
      count: 2,
      reason:
        'The identity reset writes the interaction-lock ref and visible exit-lock state before a Recorder owner can publish. The later owner layout effect repeats the same reset before controls become actionable.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BlockStatement',
      original:
        'return () => {\n      if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;\n    };',
      replacements: ['{}'],
      reason:
        'An identity refresh immediately runs the replacement setup, while unmount has already nulled the ref in the outer layout cleanup.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;',
      replacements: ['false'],
      reason:
        'Skipping the dependency cleanup is immediately overwritten by the next setup; on unmount the outer layout cleanup already holds null.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'EqualityOperator',
      original: 'if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;',
      replacements: ['activeIdentityRef.current !== identityKey'],
      reason:
        'Reversing the cleanup comparison only changes a transient value that the replacement setup immediately overwrites, and repeats null on unmount.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original:
        'if (activeIdentityRef.current !== identityKey || !isSessionLeaseCurrent(sessionLease)) {',
      replacements: ['false'],
      reason:
        'Whenever a mounted render has crossed an Auth identity boundary, its captured SessionLease is stale and the remaining lease half rejects publication; unmount cannot run this passive publication effect.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original: 'owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),',
      replacements: ['true'],
      reason:
        'Recorder callbacks are supplied only by the branch with a non-null currentQuestion, so every callback closure captures a non-null owner.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      original: 'exact: true,',
      replacements: ['false'],
      reason:
        'Every production diagnostic-next key is the complete three-element session/user tuple; the app creates no descendant key that prefix cancellation could additionally match.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      original: 'accountActionRef.current = true;',
      replacements: ['false'],
      reason:
        'logoutBusyRef independently claims the synchronous logout window before accountActionRef is read, so removing this duplicate assignment cannot admit another observable action.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'BooleanLiteral',
      original: 'let rearm = false;',
      replacements: ['true'],
      reason:
        'rearm remains at its seed only after success or LogoutCleanupError, and Auth logout resets the in-memory session before either outcome settles, removing the protected screen before another action.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current && activeIdentityRef.current === identityKey) {',
      replacements: ['true'],
      count: 2,
      reason:
        'A stale finalizer can only repeat setLogoutBusy(false), which is discarded or already reset. rearm can be true only after renderOwnsWork succeeded in the immediately preceding synchronous catch, so both ownership clauses are then true.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'LogicalOperator',
      original: 'if (mountedRef.current && activeIdentityRef.current === identityKey) {',
      replacements: ['mountedRef.current || activeIdentityRef.current === identityKey'],
      reason:
        'As at the paired forced-true sites, the only extra stale state write is discarded/reset and no async boundary separates a rearming catch from this finally.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (rearm) accountActionRef.current = false;',
      replacements: ['true'],
      reason:
        'When rearm is false, logout already synchronously removed the protected session; writing the route-local action latch cannot enable an observable action.',
    },
    {
      file: 'src/app/diagnostic.tsx',
      mutator: 'OptionalChaining',
      original: '(currentProgress?.asked ?? 0) === 0;',
      replacements: ['currentProgress.asked'],
      reason:
        'showIntro now first requires a non-null currentQuestion. The diagnostic-next contract always couples that question with progress, and local advancement preserves it, so currentProgress is non-null whenever this optional access is evaluated.',
    },
    // Settings credential/destructive screens. Navigator dependency and
    // confirmation-owner checks remain live gaps.
    {
      file: 'src/app/settings/change-password.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'Change password synchronously sets mountedRef true in its mount layout effect before events can read its seed.',
    },
    {
      file: 'src/app/settings/delete-account.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'Delete account synchronously sets mountedRef true in its mount layout effect before events can read its seed.',
    },
    {
      file: 'src/app/settings/change-password.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The change-password mount layout effect receives a constant dependency literal and retains the same setup/cleanup lifetime.',
    },
    {
      file: 'src/app/settings/delete-account.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The delete-account mount layout effect receives a constant dependency literal and retains the same setup/cleanup lifetime.',
    },
    {
      file: 'src/app/settings/change-password.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!mountedRef.current) return;',
      replacements: ['false'],
      reason:
        'After unmount, weakening the password-change catch guard only computes safe copy and targets detached React state; the finally navigation update remains mounted-guarded.',
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
    },
    {
      file: 'src/app/settings/delete-account.tsx',
      mutator: 'ConditionalExpression',
      originals: ['if (!mountedRef.current) return;'],
      replacements: ['false'],
      count: 2,
      reason:
        'Layout cleanup first nulls confirmingRef, so the preceding confirmation-owner comparison returns before either mounted guard can become the sole fence.',
    },
    // Practice home: only predicates already subsumed by the same render's
    // ownership/lifecycle state are reviewed here. Every async or navigation
    // fence with independent behavior remains outside the registry.
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ObjectLiteral',
      original: '}>({ owner: null, locked: false });',
      replacements: ['{}'],
      reason:
        'Before the first full Recorder lock update, undefined owner/locked fields compare and coerce exactly like null/false; later updates replace the entire object.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'const recorderLockedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'The Recorder-owner layout effect resets the synchronous interaction-lock ref before a Recorder or question action can consume its seed.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      originals: ['const navigationStartedRef = useRef(true);', 'const mountedRef = useRef(true);'],
      replacements: ['false'],
      count: 2,
      reason:
        'Before focus, focusedRef already rejects actions; the mount/focus layout writes then establish the authoritative navigation and mounted values before interaction.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'StringLiteral',
      original: "const renderOwner = `${sessionVersion}:${userId ?? 'anonymous'}`;",
      replacements: ['""'],
      reason:
        'This literal is only the no-user sentinel. The protected screen returns null with no user, while every signed-in UUID keeps using its actual userId.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
      replacements: ['true'],
      count: 2,
      reason:
        'Each individual cleanup mutation leaves the sibling mounted/focus fence false and clears active render ownership, so no stale callback is admitted.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'navigationStartedRef.current = true;',
      replacements: ['false'],
      reason:
        'The same cleanup has already made mounted/focused ownership false; refocus setup explicitly writes the navigation latch false before actions resume.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'StringLiteral',
      original:
        "? `${renderOwner}:${recorderQuestionId}:${cycleId}:${nativeMode ? 'native' : 'english'}`",
      replacements: ['""'],
      count: 2,
      reason:
        'The cycle-aware owner retains session, question, and cycle segments. Emptying either mode suffix still leaves native and English owners distinct, and the owner is otherwise opaque.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'activeRenderOwnerRef.current === renderOwner &&',
      replacements: ['true'],
      reason:
        'An Auth identity mismatch also makes the render-captured SessionLease stale; on unmount mounted/focused ownership is already false, so this clause is subsumed.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),',
      replacements: ['true'],
      reason:
        'Recorder callbacks are created only for a rendered question branch and therefore always capture a non-null owner.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '[],',
      replacements: ['["Stryker was here"]'],
      reason:
        'interactionLockedNow reads only refs and is intentionally stable; either constant dependency literal preserves that callback lifetime.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'navigationStartedRef.current = true;',
      replacements: ['false'],
      reason:
        'During focus cleanup focusedRef is already false, so render ownership rejects every action; focus setup writes the latch false when actions become valid again.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'void queryClient.cancelQueries({ queryKey: questionQueryKey, exact: true });',
      replacements: ['false'],
      reason:
        'questionQueryKey is the complete three-element practice-question key and the app creates no descendant key, so exact and prefix cancellation match the same query.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'let rearm = false;',
      replacements: ['true'],
      reason:
        'rearm remains at its seed only after logout success or LogoutCleanupError, and Auth has synchronously removed the protected session before either settles.',
    },
    {
      file: 'src/app/practice/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (rearm) navigationStartedRef.current = false;',
      replacements: ['true'],
      reason:
        'When rearm is false Auth logout has already removed the protected session, so changing this route-local latch cannot enable an observable action.',
    },
    // Practice Mode equivalents.
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ObjectLiteral',
      original: '}>({ owner: null, locked: false });',
      replacements: ['{}'],
      reason:
        'Undefined owner/locked fields behave like null/false until the first full lock update, and the initial object is never partially merged.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      original: '}>({ owner: null, locked: false });',
      replacements: ['true'],
      reason:
        'With valid help recorderOwner is non-null, so owner:null cannot report locked; invalid/loading renders expose no switch, and header publication reads recorderLockedRef, not this state field.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      original: 'const recorderLockedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'The Recorder-owner layout effect resets the interaction-lock ref before the Recorder or language switch can consume its render-time seed.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      originals: ['const mountedRef = useRef(true);', 'const navigationStartedRef = useRef(true);'],
      replacements: ['false'],
      count: 2,
      reason:
        'The mount and focus effects establish the authoritative values before interaction; before focus, focusedRef independently rejects every action.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'StringLiteral',
      original: "const renderOwner = `${sessionVersion}:${userId ?? 'anonymous'}`;",
      replacements: ['""'],
      reason:
        'Only the no-user fallback changes; the protected screen returns null without a user and signed-in UUIDs retain their real identity segment.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'StringLiteral',
      original:
        "? `${renderOwner}:${validQuestionId}:${validCycleId}:${nativeMode ? 'native' : 'english'}`",
      replacements: ['""'],
      count: 2,
      reason:
        'The cycle-aware owner keeps owner/session/question/cycle segments unchanged. Emptying either mode suffix still leaves native and English owners distinct, and the owner string is otherwise opaque.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
      replacements: ['true'],
      count: 2,
      reason:
        'Each individual cleanup mutation leaves another lifecycle fence false and clears active Recorder ownership, so stale callbacks remain rejected.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      original: 'navigationStartedRef.current = true;',
      replacements: ['false'],
      reason:
        'The cleanup already makes mounted/focused ownership false, and refocus writes the latch false before interaction resumes.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ConditionalExpression',
      original: 'owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),',
      replacements: ['true'],
      reason:
        'A Recorder callback exists only after a UUID parameter and help content have produced a rendered Recorder with a non-null owner.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      original: 'navigationStartedRef.current = true;',
      replacements: ['false'],
      reason:
        'During focus cleanup focusedRef is already false, and focus setup writes the navigation latch false before actions become valid again.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'BooleanLiteral',
      original: 'void queryClient.cancelQueries({ queryKey: practiceQuestionKey, exact: true });',
      replacements: ['false'],
      reason:
        'practiceQuestionKey is a complete three-element leaf key with no descendants, making exact and prefix cancellation identical.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ConditionalExpression',
      original: 'recoveryExitRef.current === owner',
      replacements: ['false'],
      reason:
        'A recovery exit sets navigationStarted in the same synchronous claim and both latches reset with Recorder ownership, so navigation independently deduplicates it.',
    },
    // Feedback card equivalents.
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'BlockStatement',
      original:
        'const [card, setCard] = useState<FeedbackCard | null>(() => {\n    if (!feedback) return null;\n    return { questionId: feedback.questionId, result: feedback.result };\n  });',
      replacements: ['{}'],
      reason:
        'With feedback, the render-phase identity correction immediately replaces undefined before commit; without feedback both paths render the no-result state.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!feedback) return null;',
      replacements: ['true'],
      reason:
        'With feedback, the forced null initializer is synchronously replaced by the render-phase card correction before commit; without feedback both forms return null.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'ObjectLiteral',
      original:
        'return {\n      questionId: feedback.questionId,\n      result: feedback.result,\n      ...(feedback.question === undefined ? {} : { question: feedback.question }),\n      ...(feedback.requestId === undefined ? {} : { requestId: feedback.requestId }),\n    };',
      replacements: ['{}'],
      reason:
        'With feedback, an empty initializer mismatches and the render-phase correction replaces it before commit; without feedback the preceding guard returns null.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
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
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(true);',
      replacements: ['false'],
      reason:
        'The mount layout effect overwrites this seed to true before a committed card can receive an action.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'BooleanLiteral',
      originals: ['mountedRef.current = false;', 'focusedRef.current = false;'],
      replacements: ['true'],
      count: 2,
      reason:
        'Each individual cleanup mutation leaves the sibling lifecycle fence false and activeCardRef null, so no stale card action can pass.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'ArrayDeclaration',
      originals: ['}, []);', '}, []),'],
      replacements: ['["Stryker was here"]'],
      count: 2,
      reason:
        'The mount layout effect and focus callback each receive a dependency literal whose constant element preserves the same lifetime.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'ConditionalExpression',
      original: '!expectedCard ||\n      !mountedRef.current ||',
      replacements: ['false'],
      reason:
        'Every runOnce caller rendered from a non-null card, and after unmount focusedRef is false and activeCardRef is null, so this leading subgroup is redundant.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'LogicalOperator',
      original: '!expectedCard ||\n      !mountedRef.current ||',
      replacements: ['!expectedCard && !mountedRef.current'],
      reason:
        'The callable-card and independent focus/active-card invariants make changing this leading OR subgroup to AND behaviorally irrelevant.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'BooleanLiteral',
      original: 'void queryClient.cancelQueries({ queryKey: currentQuestionKey, exact: true });',
      replacements: ['false'],
      reason:
        'currentQuestionKey is a complete leaf key and no longer practice-question descendant exists, so exact and prefix cancellation match the same query.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'BooleanLiteral',
      original: 'if (value.length > 16_384) return false;',
      replacements: ['true'],
      reason:
        'safePlaybackUrl is called only after the 16,384-character bounded-string check passes. Overlength input short-circuits before this private helper, so its overlength return value cannot be observed.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: 'if (value.length > 16_384) return false;',
      replacements: ['false'],
      reason:
        'safePlaybackUrl is called only after the 16,384-character bounded-string check passes. Its duplicate internal length guard is therefore unreachable, so removing that bound cannot change parsing.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'BlockStatement',
      original: '} catch {\n    return false;\n  }',
      replacements: ['{}'],
      reason:
        'The caller consumes safePlaybackUrl only through negation. Invalid URL parsing returns false originally and falls through with undefined after the empty catch; both are falsy and produce the same rejection.',
    },
    {
      file: 'src/app/_layout.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!userId || !uiLanguage) return;',
      replacements: ['!userId && !uiLanguage'],
      reason:
        'Authenticated User objects are parsed atomically with both a non-empty id and a valid uiLanguage. The fields are therefore either both present or both absent with user, so OR and AND have the same result.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: 'if (nextCursor !== null) {',
      replacements: ['true'],
      reason:
        'For a terminal null cursor, the private seenCursors set contains only validated UUID strings, so has(null) is false. The forced branch only adds null before the following null guard returns and discards the set.',
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
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderCanHandle()) return;',
      replacements: ['false'],
      reason:
        'toggleReminder immediately delegates to applyReminder, whose first synchronous guard repeats renderCanHandle before any ref, state, notification, or native side effect. The wrapper guard is redundant.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original:
        "return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxSeconds",
      replacements: ['true'],
      reason:
        'Number.isFinite independently rejects every non-number and non-finite value, so the preceding typeof check cannot be the sole reason this bounded-seconds parser rejects input.',
    },
    {
      file: 'src/lib/api.ts',
      mutator: 'ConditionalExpression',
      original: "typeof hours === 'number' &&",
      replacements: ['true'],
      reason:
        'The following Number.isFinite(hours) check independently rejects every non-number and non-finite value, so this explicit typeof check cannot decide acceptance.',
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
    },

    {
      file: 'src/app/practice/help.tsx',
      mutator: 'ObjectLiteral',
      original: 'stateScroll: {\n    flex: 1,\n  },',
      replacements: ['{}'],
      reason:
        'React Native vertical ScrollView already applies flexGrow and flexShrink. In each loading or error branch it is the container’s sole child, so this extra flex value cannot change the filled bounded viewport.',
    },
    ...recorderEquivalentMutants,
    ...adsEquivalentMutants,
    ...recordingsEquivalentMutants,
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
  equivalentMutantLocations.length +
    recorderEquivalentMutants.length +
    adsEquivalentMutants.length +
    recordingsEquivalentMutants.length !==
  equivalentMutants.length
) {
  throw new Error(
    `Equivalent mutant location sources account for ` +
      `${equivalentMutantLocations.length + recorderEquivalentMutants.length + adsEquivalentMutants.length + recordingsEquivalentMutants.length} entries for ` +
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
