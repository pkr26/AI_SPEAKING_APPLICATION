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
  exactLocations(80, 18, 82, 6),
  exactLocations(81, 16, 81, 21),
  exactLocations(54, 6, 54, 8, 83, 6, 83, 8),
  exactLocations(383, 5, 383, 21),
  exactLocations(488, 5, 488, 32, 405, 5, 405, 32, 709, 5, 709, 32),
  exactLocations(431, 32, 431, 58),
  exactLocations(488, 5, 490, 25),
  exactLocations(488, 5, 490, 25),
  exactLocations(488, 5, 489, 34),
  exactLocations(488, 5, 489, 34),
  exactLocations(489, 5, 489, 34),
  exactLocations(579, 79, 579, 97, 546, 70, 546, 88),
  exactLocations(579, 7, 579, 25),
  exactLocations(930, 11, 932, 4),
  exactLocations(1018, 7, 1018, 25),
  exactLocations(1075, 5, 1075, 30),
  exactLocations(1001, 39, 1001, 67),
  exactLocations(1009, 10, 1011, 4),
  exactLocations(207, 7, 207, 25),
  exactLocations(30, 37, 30, 62, 47, 47, 47, 72),
  exactLocations(139, 6, 139, 8),
  exactLocations(116, 7, 116, 33),
  exactLocations(116, 35, 118, 4),
  exactLocations(54, 54, 54, 65),
  exactLocations(67, 52, 67, 57),
  exactLocations(68, 58, 68, 60),
  exactLocations(135, 11, 135, 52),
  exactLocations(55, 5, 55, 44),
  exactLocations(93, 6, 93, 44),
  exactLocations(26, 8, 26, 10),
  exactLocations(114, 6, 114, 8, 135, 6, 135, 8, 154, 6, 154, 8, 251, 6, 251, 8),
  exactLocations(124, 5, 124, 7, 244, 5, 244, 7),
  exactLocations(167, 6, 167, 30),
  exactLocations(250, 36, 250, 47),
  exactLocations(233, 18, 235, 6),
  exactLocations(234, 19, 234, 23),
  exactLocations(60, 10, 60, 35),
  exactLocations(86, 11, 88, 4),
  exactLocations(89, 7, 89, 14),
  exactLocations(81, 6, 81, 8, 82, 62, 82, 64, 83, 77, 83, 79),
  exactLocations(103, 9, 103, 16),
  exactLocations(104, 19, 104, 41),
  exactLocations(85, 6, 85, 8),
  exactLocations(225, 7, 226, 16),
  exactLocations(225, 7, 226, 16),
  exactLocations(533, 35, 533, 43, 533, 46, 533, 55),
  exactLocations(87, 6, 87, 8),
  exactLocations(180, 7, 181, 23),
  exactLocations(180, 7, 181, 23),
  exactLocations(362, 29, 362, 37, 362, 40, 362, 49),
  exactLocations(87, 39, 87, 41),
  exactLocations(131, 39, 131, 44),
  exactLocations(136, 31, 136, 36),
  exactLocations(151, 5, 151, 7),
  exactLocations(188, 6, 188, 43),
  exactLocations(180, 6, 180, 30),
  exactLocations(161, 6, 161, 43),
  exactLocations(196, 8, 196, 10),
  exactLocations(209, 25, 211, 4),
  exactLocations(211, 6, 211, 18),
  exactLocations(213, 9, 213, 53),
  exactLocations(299, 11, 299, 17),
  exactLocations(303, 18, 305, 6),
  exactLocations(304, 16, 304, 21),
  exactLocations(306, 6, 306, 8),
  exactLocations(427, 11, 427, 28),
  exactLocations(428, 35, 428, 39),
  exactLocations(477, 50, 477, 67),
  exactLocations(493, 36, 493, 65),
  exactLocations(493, 67, 493, 79),
  exactLocations(497, 29, 497, 70),
  exactLocations(501, 66, 501, 95),
  exactLocations(548, 11, 548, 27),
  exactLocations(548, 45, 548, 76),
  exactLocations(551, 11, 551, 33),
  exactLocations(551, 51, 551, 84),
  exactLocations(566, 9, 566, 35),
  exactLocations(623, 9, 623, 47),
  exactLocations(623, 9, 623, 47),
  exactLocations(651, 9, 651, 77),
  exactLocations(651, 9, 651, 77),
  exactLocations(651, 9, 651, 52),
  exactLocations(651, 9, 651, 52),
  exactLocations(651, 79, 653, 6),
  exactLocations(652, 14, 652, 19),
  exactLocations(698, 12, 698, 16),
  exactLocations(732, 17, 732, 38),
  exactLocations(717, 11, 717, 32),
  exactLocations(734, 17, 734, 30),
  exactLocations(794, 49, 794, 70),
  exactLocations(794, 74, 794, 76),
  exactLocations(808, 37, 808, 58),
  exactLocations(808, 62, 808, 64),
  exactLocations(171, 38, 171, 67, 204, 38, 204, 71),
  exactLocations(40, 82, 44, 4),
  exactLocations(55, 39, 55, 49, 55, 39, 55, 49),
  exactLocations(136, 10, 136, 35),
  exactLocations(357, 5, 357, 32),
  exactLocations(342, 10, 342, 61),
  exactLocations(351, 7, 351, 14),
  exactLocations(389, 13, 389, 17),
  exactLocations(474, 11, 474, 29, 474, 11, 474, 29),
  exactLocations(474, 11, 474, 29),
  exactLocations(487, 7, 488, 29),
  exactLocations(854, 7, 854, 35),
  exactLocations(1078, 22, 1078, 45, 1108, 22, 1108, 45),
  exactLocations(47, 29, 47, 33),
  exactLocations(53, 29, 53, 33),
  exactLocations(56, 9, 56, 28),
  exactLocations(62, 9, 62, 28),
  exactLocations(106, 11, 106, 30),
  exactLocations(105, 11, 105, 30),
  exactLocations(114, 11, 114, 29),
  exactLocations(113, 11, 113, 29),
  exactLocations(60, 6, 60, 8),
  exactLocations(30, 29, 30, 33),
  exactLocations(45, 29, 45, 33),
  exactLocations(37, 6, 37, 8),
  exactLocations(52, 6, 52, 8),
  exactLocations(39, 9, 39, 28),
  exactLocations(54, 9, 54, 28),
  exactLocations(72, 11, 72, 29, 76, 11, 76, 29, 79, 11, 79, 29),
  exactLocations(99, 11, 99, 29, 102, 11, 102, 29),
  exactLocations(61, 8, 61, 10),
  exactLocations(157, 29, 157, 34),
  exactLocations(173, 6, 173, 8),
  exactLocations(256, 28, 256, 100),
  exactLocations(266, 9, 266, 32, 261, 8, 261, 31),
  exactLocations(292, 37, 292, 61, 283, 45, 283, 69),
  exactLocations(292, 54, 292, 59, 283, 62, 283, 67),
  exactLocations(
    70,
    56,
    70,
    61,
    71,
    36,
    71,
    41,
    72,
    32,
    72,
    37,
    73,
    48,
    73,
    53,
    74,
    35,
    74,
    40,
    76,
    29,
    76,
    34,
  ),
  exactLocations(75, 29, 75, 33, 77, 35, 77, 39),
  exactLocations(93, 25, 102, 4, 95, 18, 101, 6),
  exactLocations(96, 28, 96, 33, 97, 28, 97, 33),
  exactLocations(98, 34, 98, 38, 110, 36, 110, 40),
  exactLocations(102, 6, 102, 8, 112, 8, 112, 10),
  exactLocations(128, 33, 128, 38, 129, 23, 129, 28),
  exactLocations(134, 18, 136, 6),
  exactLocations(135, 11, 135, 52),
  exactLocations(135, 11, 135, 52),
  exactLocations(149, 9, 149, 50),
  exactLocations(205, 7, 205, 21),
  exactLocations(217, 14, 217, 18),
  exactLocations(283, 32, 283, 36),
  exactLocations(286, 17, 286, 22),
  exactLocations(299, 11, 299, 74, 299, 33, 299, 74),
  exactLocations(299, 11, 299, 74),
  exactLocations(301, 13, 301, 18),
  exactLocations(437, 57, 437, 79),
  exactLocations(51, 29, 51, 34),
  exactLocations(45, 29, 45, 34),
  exactLocations(58, 6, 58, 8),
  exactLocations(53, 6, 53, 8),
  exactLocations(108, 11, 108, 30),
  exactLocations(90, 13, 90, 31, 96, 18, 96, 36),
  exactLocations(121, 11, 121, 30, 136, 17, 136, 36),
  exactLocations(45, 6, 45, 36),
  exactLocations(49, 36, 49, 41),
  exactLocations(57, 39, 57, 43, 58, 29, 58, 33),
  exactLocations(70, 54, 70, 65),
  exactLocations(80, 28, 80, 33, 81, 28, 81, 33),
  exactLocations(82, 38, 82, 42),
  exactLocations(127, 58, 127, 66, 127, 69, 127, 78),
  exactLocations(141, 7, 141, 51),
  exactLocations(148, 7, 148, 21),
  exactLocations(158, 5, 158, 7),
  exactLocations(181, 40, 181, 44),
  exactLocations(238, 73, 238, 77),
  exactLocations(340, 17, 340, 22),
  exactLocations(355, 13, 355, 18),
  exactLocations(46, 6, 46, 36),
  exactLocations(46, 29, 46, 34),
  exactLocations(49, 36, 49, 41),
  exactLocations(53, 29, 53, 33, 55, 39, 55, 43),
  exactLocations(65, 54, 65, 65),
  exactLocations(72, 74, 72, 82, 72, 85, 72, 94),
  exactLocations(82, 28, 82, 33, 83, 28, 83, 33),
  exactLocations(84, 38, 84, 42),
  exactLocations(102, 7, 102, 21),
  exactLocations(124, 40, 124, 44),
  exactLocations(193, 76, 193, 80),
  exactLocations(216, 7, 216, 40),
  exactLocations(71, 63, 74, 4),
  exactLocations(72, 9, 72, 18),
  exactLocations(73, 12, 73, 72),
  exactLocations(75, 44, 75, 60, 75, 84, 75, 96),
  exactLocations(85, 29, 85, 33),
  exactLocations(93, 28, 93, 33, 94, 28, 94, 33),
  exactLocations(97, 6, 97, 8, 109, 8, 109, 10),
  exactLocations(152, 7, 153, 26),
  exactLocations(152, 7, 153, 26),
  exactLocations(188, 77, 188, 81),
  exactLocations(936, 37, 936, 42),
  exactLocations(936, 7, 936, 28),
  exactLocations(954, 11, 956, 4),
  exactLocations(119, 9, 119, 31),
  exactLocations(1118, 9, 1118, 28),
  exactLocations(524, 36, 524, 65, 524, 67, 524, 79, 532, 29, 532, 72, 549, 47, 549, 88),
  exactLocations(618, 9, 618, 27),
  exactLocations(342, 10, 342, 35),
  exactLocations(487, 7, 487, 32),
  exactLocations(858, 31, 858, 52, 906, 15, 906, 36),
  exactLocations(478, 39, 478, 70),
  exactLocations(189, 16, 191, 4),
]);

const recorderEquivalentMutantGroups = Object.freeze([
  {
    reason:
      'RecorderScrollTarget requires scrollToEnd whenever the target exists, so the method-level optional access is redundant while the target-level optional access retains the null guard.',
    mutants: [
      [
        '4',
        'OptionalChaining',
        'if (ownsWork) target?.scrollToEnd?.({ animated: true });',
        'target?.scrollToEnd({\n  animated: true\n})',
        77,
        17,
        77,
        58,
      ],
    ],
  },
  {
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    mutants: [
      ['744', 'ConditionalExpression', 'if (!uri) return;', 'false', 787, 7, 787, 11],
      [
        '1061',
        'ConditionalExpression',
        'if (candidateUri) candidates.add(candidateUri);',
        'true',
        1306,
        9,
        1306,
        21,
      ],
      ['1122', 'ConditionalExpression', 'if (uri) ownedUris.add(uri);', 'true', 1390, 11, 1390, 14],
      [
        '2279',
        'ConditionalExpression',
        'if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);',
        'true',
        2609,
        11,
        2609,
        31,
      ],
    ],
  },
  {
    reason:
      'On the only mount for which recordingCacheJanitorHasRun is false, no audio owner can predate the passive janitor; if another Recorder already acquired the session, its earlier mount already set the process-once flag. The owner operand therefore cannot decide the result.',
    mutants: [
      [
        '785',
        'ConditionalExpression',
        'activeAudioSessionOwner !== null,',
        'false',
        840,
        7,
        840,
        39,
      ],
    ],
  },
  {
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    mutants: [
      ['804', 'BooleanLiteral', 'const mountedRef = useRef(true);', 'false', 887, 29, 887, 33],
      ['805', 'BooleanLiteral', 'const unmountingRef = useRef(false);', 'true', 888, 32, 888, 37],
    ],
  },
  {
    reason:
      'The later AppState mount effect writes mountedRef true before external app-state events or async continuations can publish. Writing false in this earlier mount assignment is therefore overwritten before it can be the sole lifecycle currency.',
    mutants: [
      ['1196', 'BooleanLiteral', 'mountedRef.current = true;', 'false', 1516, 26, 1516, 30],
    ],
  },
  {
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    mutants: [
      [
        '839',
        'BooleanLiteral',
        'const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);',
        'true',
        953,
        74,
        953,
        79,
      ],
      [
        '841',
        'BooleanLiteral',
        'const [previewPlaying, setPreviewPlaying] = useState(false);',
        'true',
        957,
        56,
        957,
        61,
      ],
      [
        '1997',
        'StringLiteral',
        "const announcedPhaseRef = useRef<Phase>('idle');",
        '""',
        2340,
        43,
        2340,
        49,
      ],
    ],
  },
  {
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    mutants: [
      [
        '844',
        'BooleanLiteral',
        'const hasObservedRecordingRef = useRef(false);',
        'true',
        972,
        42,
        972,
        47,
      ],
      [
        '845',
        'BooleanLiteral',
        'const recordingInterruptionHandledRef = useRef(false);',
        'true',
        973,
        50,
        973,
        55,
      ],
      [
        '847',
        'BooleanLiteral',
        'const cancelRequestedRef = useRef(false);',
        'true',
        977,
        37,
        977,
        42,
      ],
      [
        '848',
        'BooleanLiteral',
        'const assessmentPostedRef = useRef(false);',
        'true',
        978,
        38,
        978,
        43,
      ],
      [
        '850',
        'BooleanLiteral',
        'const previewPlayRequestedRef = useRef(false);',
        'true',
        1004,
        42,
        1004,
        47,
      ],
    ],
  },
  {
    reason:
      'useLayoutEffect replaces the callback and identity snapshots in the same commit before focus or passive effects, user input, native events, or promise continuations can invoke their consumers. The initial object literal is therefore dead.',
    mutants: [
      [
        '853',
        'ObjectLiteral',
        'const callbacksRef = useRef({\n    disabled,\n    isStartBlocked,\n    onError,\n    onExpandedControlsLayout,\n    onInteractionLockChange,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    onResultWithMetadata,\n    parseResult,\n  });',
        '{}',
        1012,
        31,
        1024,
        4,
      ],
      [
        '897',
        'ObjectLiteral',
        'const identityRef = useRef({ ownerId, endpoint, questionId });',
        '{}',
        1072,
        30,
        1072,
        63,
      ],
    ],
  },
  {
    reason:
      'The Recorder prop union guarantees that the legacy onResult callback exists in the branch where onResultWithMetadata is absent, so the optional call and direct call are identical.',
    mutants: [
      [
        '860',
        'OptionalChaining',
        'callbacks.onResult?.(data);',
        'callbacks.onResult(data)',
        1030,
        7,
        1030,
        33,
      ],
    ],
  },
  {
    reason:
      'Both callbacks close over stable refs only. Replacing either empty dependency array with the same constant string element preserves callback identity and lifetime across every render.',
    mutants: [
      ['861', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1032, 6, 1032, 8],
      ['2896', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 3309, 6, 3309, 8],
    ],
  },
  {
    reason:
      'The injected array element is a string with no uri or takeGeneration property. Every quarantine predicate compares those properties with a real URI or numeric generation, so it never matches and is eventually shifted out without side effects.',
    mutants: [
      [
        '806',
        'ArrayDeclaration',
        'const terminalEventQuarantineRef = useRef<TerminalEventQuarantine[]>([]);',
        '["Stryker was here"]',
        894,
        72,
        894,
        74,
      ],
    ],
  },
  {
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    mutants: [
      [
        '815',
        'OptionalChaining',
        'recorderStillRecording = currentRecorderRef.current?.isRecording === true;',
        'currentRecorderRef.current.isRecording',
        907,
        34,
        907,
        73,
      ],
      [
        '1049',
        'OptionalChaining',
        'previewListenerRef.current?.remove();',
        'previewListenerRef.current.remove',
        1284,
        7,
        1284,
        41,
      ],
      ['1051', 'OptionalChaining', 'player?.remove();', 'player.remove', 1292, 7, 1292, 21],
    ],
  },
  {
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    mutants: [
      [
        '830',
        'ArithmeticOperator',
        'setRecordingStatusVersion((version) => version + 1);',
        'version - 1',
        932,
        48,
        932,
        59,
      ],
      [
        '1079',
        'AssignmentOperator',
        'recoveryGenerationRef.current += 1;',
        'recoveryGenerationRef.current -= 1',
        1333,
        5,
        1333,
        39,
      ],
      [
        '1151',
        'AssignmentOperator',
        'lifecycleEpochRef.current += 1;',
        'lifecycleEpochRef.current -= 1',
        1435,
        7,
        1435,
        37,
      ],
      [
        '1353',
        'UpdateOperator',
        'const generation = ++recoveryGenerationRef.current;',
        '--recoveryGenerationRef.current',
        1688,
        24,
        1688,
        55,
      ],
    ],
  },
  {
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    mutants: [
      ['831', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 935, 6, 935, 8],
      ['871', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1042, 6, 1042, 8],
      ['896', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1071, 6, 1071, 8],
      ['907', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1116, 6, 1116, 8],
      ['921', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1130, 6, 1130, 8],
      ['976', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1211, 6, 1211, 8],
      ['981', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1215, 5, 1215, 7],
      [
        '987',
        'ArrayDeclaration',
        'const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);',
        '["Stryker was here"]',
        1218,
        89,
        1218,
        91,
      ],
      [
        '989',
        'ArrayDeclaration',
        'const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);',
        '["Stryker was here"]',
        1220,
        81,
        1220,
        83,
      ],
      ['1002', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1231, 6, 1231, 8],
      ['1025', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1252, 6, 1252, 8],
      ['1039', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1263, 6, 1263, 8],
      ['1055', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1297, 6, 1297, 8],
      ['1058', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1302, 6, 1302, 8],
      ['1062', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1310, 6, 1310, 8],
      ['1068', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1320, 6, 1320, 8],
      ['1077', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1330, 6, 1330, 8],
      ['1087', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1342, 6, 1342, 8],
      ['1117', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1381, 5, 1381, 7],
      ['1858', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2214, 6, 2214, 8],
      ['1944', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2295, 6, 2295, 8],
    ],
  },
  {
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    mutants: [
      ['934', 'ArrayDeclaration', '[publishOperation],', '[]', 1149, 5, 1149, 23],
      ['945', 'ArrayDeclaration', '[publishOperation],', '[]', 1167, 5, 1167, 23],
      ['1045', 'ArrayDeclaration', '[updatePhase],', '[]', 1277, 5, 1277, 18],
      [
        '1953',
        'ArrayDeclaration',
        'useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);',
        '[]',
        2303,
        49,
        2303,
        71,
      ],
      [
        '2095',
        'ArrayDeclaration',
        '[\n      adoptOwnedRecording,\n      clearWebAutoStopTimer,\n      discardRecording,\n      restoreOwnedAudioMode,\n      updatePhase,\n    ],',
        '[]',
        2411,
        5,
        2417,
        6,
      ],
    ],
  },
  {
    reason:
      'audioSessionCanBeAcquired plus the awaited global release promise ensures recording start reaches acquisition only with a null owner; Recorder phase and operation currency exclude re-acquiring a session already owned by this instance. The null test is always true.',
    mutants: [
      [
        '867',
        'ConditionalExpression',
        'if (activeAudioSessionOwner === null) {',
        'true',
        1036,
        9,
        1036,
        41,
      ],
    ],
  },
  {
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    mutants: [
      [
        '889',
        'ConditionalExpression',
        'if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {',
        'true',
        1058,
        13,
        1058,
        71,
      ],
      ['891', 'OptionalChaining', 'resolveRelease?.();', 'resolveRelease()', 1063, 11, 1063, 29],
      [
        '894',
        'ConditionalExpression',
        'if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;',
        'true',
        1067,
        11,
        1067,
        53,
      ],
    ],
  },
  {
    reason:
      'operationOwnerRef is non-null only while the in-flight set is non-empty. Ordinary begin is already rejected by the count and superseding begin ignores both checks, so the owner boolean cannot independently decide admission.',
    mutants: [
      [
        '928',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1137,
        11,
        1137,
        45,
      ],
    ],
  },
  {
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    mutants: [
      [
        '937',
        'ConditionalExpression',
        '!canResumeRecorderOperation(\n          operationOwnerRef.current !== null,\n          operationsInFlightRef.current.has(token),\n          operationsInFlightRef.current.size,\n        )',
        'false',
        1155,
        9,
        1159,
        10,
      ],
      [
        '939',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1156,
        11,
        1156,
        45,
      ],
      ['942', 'BlockStatement', ') {\n        return false;\n      }', '{}', 1160, 9, 1162, 8],
      ['943', 'BooleanLiteral', 'return false;', 'true', 1161, 16, 1161, 21],
    ],
  },
  {
    reason:
      'A stale token can finish only beneath a newer superseding lifecycle token. Clearing ownership early still leaves another in-flight token, so count-based admission remains blocked, the lock remains active, and lifecycle cleanup has no later owner-current read. The defensive identity guard is unobservable.',
    mutants: [
      [
        '948',
        'ConditionalExpression',
        'if (operationOwnerRef.current === token) operationOwnerRef.current = null;',
        'true',
        1172,
        9,
        1172,
        44,
      ],
    ],
  },
  {
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    mutants: [
      [
        '955',
        'ConditionalExpression',
        'if (mountedRef.current) setOperationActive(stillActive);',
        'true',
        1174,
        9,
        1174,
        27,
      ],
      ['1037', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 1259, 9, 1259, 27],
      [
        '1043',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1274,
        11,
        1274,
        29,
      ],
      [
        '1053',
        'ConditionalExpression',
        'if (mountedRef.current) setPreviewPlaying(false);',
        'true',
        1296,
        9,
        1296,
        27,
      ],
      [
        '1295',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1614,
        13,
        1614,
        31,
      ],
      [
        '1351',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(false);',
        'true',
        1687,
        9,
        1687,
        27,
      ],
      [
        '1940',
        'ConditionalExpression',
        'if (active) setReduceMotion(enabled);',
        'true',
        2287,
        13,
        2287,
        19,
      ],
      ['1943', 'BooleanLiteral', 'active = false;', 'true', 2292, 16, 2292, 21],
      [
        '2175',
        'ConditionalExpression',
        'if (mountedRef.current) setPermissionDenied(false);',
        'true',
        2522,
        9,
        2522,
        27,
      ],
    ],
  },
  {
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    mutants: [
      [
        '1030',
        'ConditionalExpression',
        "next === 'uploading' || next === 'recovering' ? monotonicNow() : null;",
        'true',
        1258,
        7,
        1258,
        52,
      ],
      [
        '1966',
        'ConditionalExpression',
        'if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);',
        'true',
        2312,
        11,
        2312,
        29,
      ],
    ],
  },
  {
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    mutants: [
      ['1075', 'BlockStatement', '} catch {\n      return false;\n    }', '{}', 1327, 13, 1329, 6],
      [
        '1491',
        'BlockStatement',
        '} catch {\n          return false;\n        }',
        '{}',
        1833,
        17,
        1835,
        10,
      ],
      [
        '2766',
        'ArrowFunction',
        'const promise = markPendingAssessmentCancelled(requestId).catch(() => false);',
        '() => undefined',
        3164,
        71,
        3164,
        82,
      ],
    ],
  },
  {
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    mutants: [
      [
        '1093',
        'ConditionalExpression',
        'if (nativeStopPromiseRef.current === promise) {',
        'true',
        1347,
        11,
        1347,
        51,
      ],
      [
        '1191',
        'ConditionalExpression',
        'if (lifecycleStopPromiseRef.current === promise) {',
        'true',
        1495,
        11,
        1495,
        54,
      ],
    ],
  },
  {
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    mutants: [
      [
        '1105',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1365,
        15,
        1365,
        86,
      ],
      [
        '1107',
        'LogicalOperator',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'settled && completion && completion.takeGeneration !== takeGeneration',
        1365,
        15,
        1365,
        86,
      ],
      [
        '1108',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1365,
        27,
        1365,
        85,
      ],
      ['1112', 'BooleanLiteral', 'settled = true;', 'false', 1366, 21, 1366, 25],
    ],
  },
  {
    reason:
      'Prepared-recorder disposal runs under an operation while no recording is adoptable. A terminal callback published without suppression can only bump the status version; the consuming effect rejects it through its phase and operation guards.',
    mutants: [
      [
        '1119',
        'BooleanLiteral',
        'suppressRecordingStatusRef.current = true;',
        'false',
        1385,
        42,
        1385,
        46,
      ],
    ],
  },
  {
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    mutants: [
      [
        '1148',
        'ConditionalExpression',
        'if (!operationToken) return Promise.resolve();',
        'false',
        1433,
        9,
        1433,
        24,
      ],
      ['1242', 'ConditionalExpression', 'if (!operationToken) return;', 'false', 1557, 9, 1557, 24],
    ],
  },
  {
    reason:
      'recoverPending calls beginOperation only after operationIsInFlight synchronously proved the owner set empty. With no current owner or token, superseding and ordinary begin have identical admission and ownership effects, so the first false argument is redundant.',
    mutants: [
      [
        '1239',
        'BooleanLiteral',
        'const operationToken = beginOperation(false, false);',
        'true',
        1556,
        43,
        1556,
        48,
      ],
    ],
  },
  {
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    mutants: [
      [
        '1187',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        1489,
        41,
        1489,
        46,
      ],
      [
        '2076',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2395,
        41,
        2395,
        46,
      ],
      [
        '2324',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2661,
        41,
        2661,
        46,
      ],
      [
        '2380',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2717,
        41,
        2717,
        46,
      ],
      [
        '2426',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2748,
        41,
        2748,
        46,
      ],
    ],
  },
  {
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    mutants: [
      ['1199', 'BooleanLiteral', 'unmountingRef.current = true;', 'false', 1519, 31, 1519, 35],
      ['1200', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 1520, 28, 1520, 33],
    ],
  },
  {
    reason:
      'On unmount, the earlier layout-effect cleanup has already set unmounting true and mounted false before this passive cleanup runs. On a passive-effect dependency refresh, React runs cleanup and the replacement setup together before async continuations, and setup immediately restores mounted true. This duplicate false assignment is never the sole lifecycle guard.',
    mutants: [
      ['1918', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 2260, 28, 2260, 33],
    ],
  },
  {
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    mutants: [
      [
        '1207',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder;',
        'true',
        1529,
        7,
        1529,
        46,
      ],
      [
        '2358',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2689,
        7,
        2689,
        46,
      ],
      [
        '2476',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2810,
        7,
        2810,
        46,
      ],
    ],
  },
  {
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    mutants: [
      [
        '1217',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1531,
        11,
        1531,
        44,
      ],
      [
        '1220',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1531,
        11,
        1531,
        66,
      ],
      [
        '1221',
        'LogicalOperator',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        "phaseRef.current === 'recovering' || mountedRef.current",
        1531,
        11,
        1531,
        66,
      ],
    ],
  },
  {
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    mutants: [
      [
        '1231',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1540,
        9,
        1540,
        45,
      ],
      [
        '1271',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1585,
        9,
        1585,
        45,
      ],
      [
        '1279',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1601,
        11,
        1601,
        47,
      ],
      [
        '1345',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1668,
        11,
        1668,
        47,
      ],
    ],
  },
  {
    reason:
      'No second recovery attempt can start while this loading operation token remains in flight. The attempt ref is therefore this exact symbol or already null from invalidation, and assigning null unconditionally cannot clear a newer attempt.',
    mutants: [
      [
        '1247',
        'ConditionalExpression',
        'if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;',
        'true',
        1562,
        11,
        1562,
        57,
      ],
    ],
  },
  {
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    mutants: [
      [
        '1263',
        'ConditionalExpression',
        'const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1580,
        66,
        1580,
        100,
      ],
      [
        '1339',
        'ConditionalExpression',
        'activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1663,
        41,
        1663,
        75,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    mutants: [
      ['1297', 'ConditionalExpression', 'if (pending === null) {', 'false', 1621, 9, 1621, 25],
      [
        '1300',
        'BlockStatement',
        'if (pending === null) {\n      finishLoading();\n      return;\n    }',
        '{}',
        1621,
        27,
        1624,
        6,
      ],
    ],
  },
  {
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    mutants: [
      [
        '1356',
        'ConditionalExpression',
        'recoveryGenerationRef.current === generation,',
        'true',
        1691,
        9,
        1691,
        53,
      ],
      [
        '1359',
        'ConditionalExpression',
        'activeRecoveryOwner === instanceId,',
        'true',
        1693,
        9,
        1693,
        43,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad already proved operation and lifecycle currency, and the reconcile-stage callback is reached without an intervening await. Callback re-entry is followed immediately by the separate post-callback isCurrent guard before effects.',
    mutants: [
      ['1382', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1714, 13, 1714, 25],
    ],
  },
  {
    reason:
      'The validated prepared-stage path reaches this check without an await or re-entry. releaseUnclaimedHandoff then performs the sole await and immediately rechecks isCurrent before publishing, so the outer guard is redundant.',
    mutants: [
      ['1415', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1739, 13, 1739, 25],
    ],
  },
  {
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    mutants: [
      ['1469', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1813, 36, 1813, 41],
      ['1488', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1822, 36, 1822, 41],
    ],
  },
  {
    reason:
      'This call occurs only inside the not-routeMatches branch. finishUnresolved independently tests not-routeMatches when choosing whether a recording can be retained, so changing allowRecordedRetry cannot change the selected branch.',
    mutants: [
      [
        '1697',
        'BooleanLiteral',
        "await finishUnresolved(translate('recorder.errInterruptedSaved'), false);",
        'true',
        2017,
        85,
        2017,
        90,
      ],
    ],
  },
  {
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    mutants: [
      ['1722', 'ConditionalExpression', 'if (isCurrent()) {', 'true', 2046, 23, 2046, 34],
      ['1786', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 2103, 25, 2103, 37],
    ],
  },
  {
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    mutants: [
      [
        '1794',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errRejected')),",
        '""',
        2113,
        63,
        2113,
        85,
      ],
      [
        '1799',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errNotSent')),",
        '""',
        2121,
        63,
        2121,
        84,
      ],
    ],
  },
  {
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    mutants: [
      [
        '1877',
        'ConditionalExpression',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'true',
        2235,
        17,
        2235,
        54,
      ],
      [
        '1878',
        'LogicalOperator',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'identityMatches || mountedRef.current',
        2235,
        17,
        2235,
        54,
      ],
    ],
  },
  {
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    mutants: [
      [
        '1947',
        'ConditionalExpression',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        'true',
        2300,
        9,
        2300,
        29,
      ],
      [
        '1949',
        'StringLiteral',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        '""',
        2300,
        19,
        2300,
        29,
      ],
    ],
  },
  {
    reason:
      'The effect depends only on phase, so React never reruns it with an unchanged phase. The ref is assigned on every run, making the equality early return unreachable.',
    mutants: [
      [
        '1999',
        'ConditionalExpression',
        'if (announcedPhaseRef.current === phase) return;',
        'false',
        2342,
        9,
        2342,
        44,
      ],
    ],
  },
  {
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    mutants: [
      ['2045', 'ConditionalExpression', 'pulseSteps.length !== 2 ||', 'false', 2368, 7, 2368, 30],
      [
        '2047',
        'ConditionalExpression',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'false',
        2368,
        7,
        2375,
        8,
      ],
      [
        '2049',
        'LogicalOperator',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.length !== 2 && pulseSteps.some(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2368,
        7,
        2375,
        8,
      ],
      [
        '2050',
        'MethodExpression',
        'pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.every(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2369,
        7,
        2375,
        8,
      ],
      [
        '2051',
        'ArrowFunction',
        '(step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '() => undefined',
        2370,
        9,
        2374,
        40,
      ],
      [
        '2053',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        'false',
        2371,
        11,
        2372,
        42,
      ],
      [
        '2054',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        '!Number.isFinite(step.toValue) && !Number.isFinite(step.duration)',
        2371,
        11,
        2372,
        42,
      ],
      [
        '2055',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        'false',
        2371,
        11,
        2373,
        29,
      ],
      [
        '2056',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration)) && step.duration <= 0',
        2371,
        11,
        2373,
        29,
      ],
      [
        '2057',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        'false',
        2371,
        11,
        2374,
        40,
      ],
      [
        '2059',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0) && step.useNativeDriver !== true',
        2371,
        11,
        2374,
        40,
      ],
      ['2061', 'ConditionalExpression', 'step.duration <= 0 ||', 'false', 2373, 11, 2373, 29],
      [
        '2062',
        'EqualityOperator',
        'step.duration <= 0 ||',
        'step.duration < 0',
        2373,
        11,
        2373,
        29,
      ],
      [
        '2064',
        'ConditionalExpression',
        'step.useNativeDriver !== true,',
        'false',
        2374,
        11,
        2374,
        40,
      ],
      [
        '2067',
        'BlockStatement',
        ') {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2376,
        7,
        2379,
        6,
      ],
      [
        '2069',
        'ConditionalExpression',
        'if (animations.length === 0) {',
        'false',
        2381,
        9,
        2381,
        32,
      ],
      [
        '2072',
        'BlockStatement',
        'if (animations.length === 0) {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2381,
        34,
        2384,
        6,
      ],
    ],
  },
  {
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    mutants: [
      [
        '2125',
        'ConditionalExpression',
        'recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2457,
        11,
        2457,
        38,
      ],
      [
        '2361',
        'ConditionalExpression',
        'const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2692,
        29,
        2692,
        56,
      ],
    ],
  },
  {
    reason:
      'Every lifecycle epoch change first installs a superseding operation token. Current operation-token currency therefore already proves the captured epoch equals the live epoch, making this equality operand redundant.',
    mutants: [
      [
        '2162',
        'ConditionalExpression',
        'lifecycleEpoch === lifecycleEpochRef.current,',
        'true',
        2505,
        9,
        2505,
        53,
      ],
    ],
  },
  {
    reason:
      'When no prompt was required, response is the current permission and app context is already active; the extra foreground wait resolves immediately and adopting the same epoch is a no-op. When prompted, the original branch already runs.',
    mutants: [['2206', 'ConditionalExpression', 'if (prompted) {', 'true', 2540, 11, 2540, 19]],
  },
  {
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    mutants: [
      [
        '2209',
        'ConditionalExpression',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        'false',
        2543,
        13,
        2543,
        56,
      ],
      [
        '2210',
        'LogicalOperator',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        '!identityIsCurrent() && !mountedRef.current',
        2543,
        13,
        2543,
        56,
      ],
      [
        '2228',
        'ConditionalExpression',
        'if (!isCurrentLifecycle()) return;',
        'false',
        2558,
        11,
        2558,
        32,
      ],
    ],
  },
  {
    reason:
      'isCurrentLifecycle was checked immediately before this denied-permission branch and includes recorderContextIsActive, which proves mountedRef.current. The nested mounted condition is always true.',
    mutants: [
      ['2235', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 2560, 13, 2560, 31],
    ],
  },
  {
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    mutants: [
      ['2276', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2598, 37, 2598, 42],
      ['2284', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2613, 37, 2613, 42],
    ],
  },
  {
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    mutants: [
      [
        '2297',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'false',
        2632,
        11,
        2632,
        27,
      ],
      [
        '2298',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'true',
        2632,
        11,
        2632,
        27,
      ],
    ],
  },
  {
    reason:
      'After record succeeds, the remaining statements are non-throwing ref and Set updates plus guarded phase publication; the catch cannot observe prepared again. Its reset value is dead.',
    mutants: [['2308', 'BooleanLiteral', 'prepared = false;', 'true', 2646, 18, 2646, 23]],
  },
  {
    reason:
      'Start cleanup preserves the prior active URI whenever it is non-null, so activeUriRef equals previousUri in every recorded fallback case. If both are null, forcing only the equality true still leaves the trailing previousUri falsy and selects idle. The phase result is unchanged.',
    mutants: [
      [
        '2329',
        'ConditionalExpression',
        "updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');",
        'true',
        2665,
        21,
        2665,
        57,
      ],
    ],
  },
  {
    reason:
      'The stop reason is used only to distinguish the literal auto value. Every other value follows the user-stop path, so an empty string and the user default are behaviorally identical.',
    mutants: [
      [
        '2341',
        'StringLiteral',
        "const stopRecording = async (reason: 'user' | 'auto' = 'user') => {",
        '""',
        2677,
        58,
        2677,
        64,
      ],
    ],
  },
  {
    reason:
      'Identity changes synchronously start a superseding lifecycle operation before stale work can continue. A current operation token therefore already implies assessment identity still matches, so weakening this conjunction admits no distinct state.',
    mutants: [
      [
        '2352',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2687,
        7,
        2688,
        84,
      ],
      [
        '2470',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2808,
        7,
        2809,
        84,
      ],
    ],
  },
  {
    reason:
      'completedTakeIsValid receives the URI separately and rejects null before considering fileIsUsable. Forcing the preceding URI non-null operand true cannot make a null completion valid.',
    mutants: [
      [
        '2381',
        'ConditionalExpression',
        'const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);',
        'true',
        2718,
        28,
        2718,
        40,
      ],
    ],
  },
  {
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    mutants: [
      ['2460', 'ConditionalExpression', 'if (!uri) {', 'false', 2792, 9, 2792, 13],
      [
        '2462',
        'BlockStatement',
        "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      endOperation(operationToken);\n      return;\n    }",
        '{}',
        2792,
        15,
        2797,
        6,
      ],
      ['2463', 'StringLiteral', "updatePhase('idle');", '""', 2793, 19, 2793, 25],
      [
        '2464',
        'StringLiteral',
        "callbacksRef.current.onError(translate('recorder.errNoRecording'));",
        '""',
        2794,
        46,
        2794,
        71,
      ],
      ['2809', 'ConditionalExpression', 'if (!uri) return;', 'false', 3220, 11, 3220, 15],
    ],
  },
  {
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    mutants: [
      [
        '2482',
        'LogicalOperator',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        "controller.signal.reason && new DOMException('The operation was aborted.', 'AbortError')",
        2817,
        11,
        2817,
        99,
      ],
      [
        '2483',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2817,
        56,
        2817,
        84,
      ],
      [
        '2484',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2817,
        86,
        2817,
        98,
      ],
      [
        '2592',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2969,
        32,
        2969,
        60,
      ],
      [
        '2593',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2969,
        62,
        2969,
        74,
      ],
    ],
  },
  {
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    mutants: [
      [
        '2546',
        'LogicalOperator',
        'throw lastCapacityError ?? new Error();',
        'lastCapacityError && new Error()',
        2927,
        15,
        2927,
        47,
      ],
    ],
  },
  {
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    mutants: [
      [
        '2591',
        'ConditionalExpression',
        'if (cancelPersistence) await cancelPersistence.promise;',
        'true',
        2968,
        13,
        2968,
        30,
      ],
      [
        '2641',
        'BooleanLiteral',
        'const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;',
        'true',
        3020,
        86,
        3020,
        91,
      ],
    ],
  },
  {
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    mutants: [
      ['2642', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 3021, 40, 3021, 45],
      ['2654', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 3035, 38, 3035, 43],
    ],
  },
  {
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    mutants: [
      [
        '2653',
        'BooleanLiteral',
        'const cleared = requestId ? await clearRequestTracking(requestId) : true;',
        'false',
        3034,
        77,
        3034,
        81,
      ],
      ['2705', 'ConditionalExpression', 'if (requestId) {', 'true', 3088, 15, 3088, 24],
    ],
  },
  {
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    mutants: [
      [
        '2720',
        'ConditionalExpression',
        'if (uploadControllerRef.current === controller) {',
        'true',
        3104,
        11,
        3104,
        53,
      ],
    ],
  },
  {
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    mutants: [
      [
        '2742',
        'ConditionalExpression',
        'if (startIsBlocked()) return Promise.resolve();',
        'false',
        3137,
        9,
        3137,
        25,
      ],
    ],
  },
  {
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    mutants: [
      ['2757', 'ConditionalExpression', 'if (!controller) return;', 'false', 3158, 9, 3158, 20],
    ],
  },
  {
    reason:
      'The rewind promise owner handles rejection by releasing the player and reporting once. After finally clears the request flag, the following identity and playability guard returns, so this duplicate catch return has no effect.',
    mutants: [
      [
        '2791',
        'BlockStatement',
        '} catch {\n        // The rewind owner releases the player and reports the failure once.\n        return;\n      } finally {',
        '{}',
        3198,
        15,
        3201,
        8,
      ],
    ],
  },
  {
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    mutants: [
      [
        '2801',
        'ConditionalExpression',
        'previewPlayerRef.current !== null,',
        'true',
        3209,
        11,
        3209,
        44,
      ],
    ],
  },
  {
    reason:
      'If createAudioPlayer throws, continuing reaches addListener on the unset local; the second catch performs best-effort cleanup and emits the same single play-failed callback. The two paths converge.',
    mutants: [
      [
        '2812',
        'BlockStatement',
        "} catch {\n        callbacksRef.current.onError(translate('recorder.errPlayFailed'));\n        return;\n      }",
        '{}',
        3224,
        15,
        3227,
        8,
      ],
    ],
  },
  {
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    mutants: [
      [
        '2832',
        'ConditionalExpression',
        'if (previewPlayerRef.current === player) {',
        'true',
        3244,
        17,
        3244,
        52,
      ],
      [
        '2842',
        'ConditionalExpression',
        'previewRewindPromiseRef.current === rewind &&',
        'true',
        3259,
        17,
        3259,
        59,
      ],
      [
        '2846',
        'LogicalOperator',
        'previewRewindPromiseRef.current === rewind &&\n                previewPlayerRef.current === player',
        'previewRewindPromiseRef.current === rewind || previewPlayerRef.current === player',
        3259,
        17,
        3260,
        52,
      ],
      [
        '2847',
        'ConditionalExpression',
        'previewPlayerRef.current === player',
        'true',
        3260,
        17,
        3260,
        52,
      ],
    ],
  },
  {
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    mutants: [
      ['2862', 'ConditionalExpression', 'if (!player) return;', 'false', 3284, 9, 3284, 16],
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

if (recorderReviewedMutantIds.size !== 192) {
  throw new Error(
    `Recorder equivalence review has ${recorderReviewedMutantIds.size} mutants; expected 192`,
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
    reviewedMutantId: '78',
    mutator: 'BooleanLiteral',
    original: 'const queuedOlderRef = useRef(false);',
    replacements: ['true'],
    reason:
      'The mount effect overwrites this seed with false before a rendered list can expose any paging handler, including after the Strict Effects setup/cleanup/setup probe.',
    locations: exactLocations(118, 33, 118, 38),
  },
  {
    file: 'src/app/recordings.tsx',
    reviewedMutantId: '90',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'Both dependency literals contain values that stay Object.is-equal for the component lifetime, so the mount cleanup cadence is identical.',
    locations: exactLocations(133, 6, 133, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '292',
    mutator: 'StringLiteral',
    original: "const [phase, setPhase] = useState<PlaybackPhase>('idle');",
    replacements: ['""'],
    reason:
      "The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
    locations: exactLocations(137, 53, 137, 59),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '293',
    mutator: 'ConditionalExpression',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['true'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison true is unobservable.',
    locations: exactLocations(157, 41, 157, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '294',
    mutator: 'ConditionalExpression',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['false'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison false is unobservable.',
    locations: exactLocations(157, 41, 157, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '295',
    mutator: 'EqualityOperator',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ["recordingStatus !== 'unavailable'"],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so reversing the comparison is unobservable.',
    locations: exactLocations(157, 41, 157, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '296',
    mutator: 'StringLiteral',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['""'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so changing the compared literal is unobservable.',
    locations: exactLocations(157, 61, 157, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '330',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'cancelDelete receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(184, 6, 184, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '334',
    mutator: 'OptionalChaining',
    original: 'playerListenerRef.current?.remove();',
    replacements: ['playerListenerRef.current.remove'],
    reason:
      'When the listener is null the direct dereference throws inside the surrounding best-effort catch; both forms then clear the ref and continue through identical player cleanup.',
    locations: exactLocations(192, 7, 192, 40),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '336',
    mutator: 'OptionalChaining',
    original: 'player?.pause();',
    replacements: ['player.pause'],
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; all following release state is identical.',
    locations: exactLocations(200, 7, 200, 20),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '338',
    mutator: 'OptionalChaining',
    original: 'player?.remove();',
    replacements: ['player.remove'],
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; owner release and ref cleanup are unchanged.',
    locations: exactLocations(205, 7, 205, 21),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '340',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'releasePlayer receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(211, 6, 211, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '343',
    mutator: 'ConditionalExpression',
    original: 'if (mountedRef.current !== true) return;',
    replacements: ['false'],
    reason:
      'The only added reset calls target an already detached component after layout cleanup; React discards those state setters, while every mounted call already passes the guard.',
    locations: exactLocations(214, 9, 214, 36),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '347',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'resetPlaybackUi receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(218, 6, 218, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '349',
    mutator: 'ArrayDeclaration',
    original: '}, [releasePlayer, resetPlaybackUi]);',
    replacements: ['[]'],
    reason:
      'Both dependencies are empty-dependency callbacks with permanently stable identities, so omitting them cannot change stopPlayback.',
    locations: exactLocations(223, 6, 223, 38),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '354',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, releasePlayer]);',
    replacements: ['[]'],
    reason:
      'Both layout-cleanup dependencies are empty-dependency callbacks with permanently stable identities, so effect cadence is unchanged.',
    locations: exactLocations(232, 6, 232, 35),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '379',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, stopPlayback]),',
    replacements: ['[]'],
    reason:
      'Both focus-effect dependencies have permanently stable identities, so removing them does not alter focus setup or cleanup.',
    locations: exactLocations(270, 8, 270, 36),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '388',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, stopPlayback]);',
    replacements: ['[]'],
    reason:
      'Both AppState-effect dependencies have permanently stable identities, so removing them does not alter subscription lifetime.',
    locations: exactLocations(281, 6, 281, 34),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '444',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current === identityToken &&',
    replacements: ['true'],
    reason:
      'After the entry identity fence creates an operation, every identity change synchronously replaces both its operation token and lifecycle symbol; either unchanged guard rejects the same continuations.',
    locations: exactLocations(337, 7, 337, 53),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '534',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current !== expectedIdentity ||',
    replacements: ['false'],
    reason:
      'The destructive callback carries the lifecycle captured with this identity token, and every identity commit replaces that lifecycle synchronously; the adjacent context guard rejects exactly the same stale callback.',
    locations: exactLocations(416, 9, 416, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '546',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current === expectedIdentity && contextIsCurrent(lifecycle);',
    replacements: ['true'],
    reason:
      'The delete operation retains the lifecycle captured with expectedIdentity; an identity change replaces that lifecycle, so contextIsCurrent becomes false on every path where this equality becomes false.',
    locations: exactLocations(431, 9, 431, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '574',
    mutator: 'OptionalChaining',
    original: 'void Promise.resolve(onDeletedRef.current?.(recordingId)).catch(() => undefined);',
    replacements: ['onDeletedRef.current(recordingId)'],
    reason:
      'When the optional callback is absent, the direct call throws inside the surrounding try and is swallowed; when present both forms invoke it, so the committed deletion and visible state are identical.',
    locations: exactLocations(448, 32, 448, 67),
  },
]);

// A location can be reused by unrelated code after a refactor. Pinning the
// complete reviewed source file makes that collision fail closed even when the
// new node happens to have identical text and coordinates.
export const equivalentMutantSourceHashes = Object.freeze({
  'src/app/(auth)/forgot-password.tsx':
    'ae0279d0a7eaa30d1785affe20fc48b784b5120c2ea0f488e89504430693adbe',
  'src/app/(auth)/login.tsx': '4a4fc23c3ded1d9039d34cfb56618a724755d6b3728b71080b258b3df2dc643f',
  'src/app/(auth)/reset-password.tsx':
    '7c86d5a9acde4d284b7a751dc587224faf7931c47e3f97f0e3956b1a3f60ccc8',
  'src/app/(auth)/signup.tsx': 'b8ccfcbecaf44dfa2c70c77d25dccf4606a62d818aaec31e917c07857af66248',
  'src/app/_layout.tsx': 'd9016c074126c9e4d482ca9ed4f7e65a113466fe2f7d5051b885b8118fa6eaed',
  'src/app/diagnostic.tsx': 'd960b9573ca657221d16e45028c52e4e4acabea12e2018e90419d95fdb11bfa5',
  'src/app/history.tsx': 'f2c6b17dbc35a6d1258e59e720521b45b8745e8e472f63a28b1d759bac4a8fdb',
  'src/app/home.tsx': '4581de4eec09285192940e2d53cebb820232972139a4b666d33447f80698fc08',
  'src/app/index.tsx': 'd681f61d6bcf279c27b25fce487eee7dbef6b7e1a4adc4b0b1fa2787766f43c4',
  'src/app/practice/attempt.tsx':
    'a8b7ec28900e5e1f5cad5d7751ad55d2d7269f0f95734477105f1ee7e8b12305',
  'src/app/practice/feedback.tsx':
    'd51bd798fa05b1e1dc738e281f6d1567f9f3b6a385302927a740d7330ac32dfb',
  'src/app/practice/help.tsx': '665e19d6320ce6a01a77ee39b6b4510560546137c5c65c889ea23fce0ce42d4a',
  'src/app/practice/index.tsx': 'c3c45eae698fab49c14a310af12bf2c37280154696693289bd18bf7cf6a6d979',
  'src/app/recordings.tsx': '927badb84fe1e2c7dff1efaafc49c0ba08c21837c8a78c72f47a835e2c8b7030',
  'src/app/settings/change-password.tsx':
    '013436d713b577639822256e8ed551246db60bb0226ecb944b4ccf60d53a24cc',
  'src/app/settings/delete-account.tsx':
    '01bd36532e696eed1d919fe263666e128fe39b619819aa83e0f45b7c7f1d47fc',
  'src/app/settings/index.tsx': '00715b158f03cc534f9b6ef8b33a8549071c360480654ffb72cb93f98a87fddf',
  'src/components/HistoryNativeAdCard.tsx':
    '7b9e73e7bbefd78e19f6fbaf2e05ff3a55c8a39a74a8628f793fa7d925be219f',
  'src/components/HomeBannerAd.tsx':
    'cfe7eb99363fcb307402dc6a61787f16c0461d5efc9322b653abf1996e17ce9a',
  'src/components/Recorder.tsx': '875204e48bd6e809be0870111b2d21a3e714ce0232ae62bba993c943d070cffc',
  'src/components/RecordingPlayback.tsx':
    '22068b625a6a0c471aa6e53d8f9c7ccbc5d1704de08f6179d890f91acf19f445',
  'src/lib/ads.tsx': '4db444735e7e7e675332e7d6f86dfa98def9afa941b49099d19dc929b6bd2854',
  'src/lib/api.ts': 'b85cb24698a237d30438d63692d1bbc100528c6ff6f4064d05a3fb8811a17955',
  'src/lib/auth.tsx': 'a5b51a6e7a2e6e8712d850f59e3a398c8af248209c91cafd1ccdf56b04d46a48',
  'src/lib/daily-reminder.ts': '51586320e0b0b2045059306dd41d902890409aa29ada2f47a8fc0d936a1cd4c6',
  'src/lib/pending-assessment.ts':
    'aa491bfd5238aca7e646dbbc90e8f50cff608d185d44a5cf29c0a24c235c2404',
  'src/lib/practice-flow.tsx': '8dee61dc592844e63735c3eea17fe3479de3998c4a9ec55021ff879b5aaee5fd',
  'src/lib/types.ts': '4b4c2b5d7d1b35cfabdca6d1a14bc1ed291069f9b116d7c02c57e44904f98a94',
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
      original:
        "typeof passed !== 'boolean' ||\n    typeof mastered !== 'boolean' ||\n    !isNumber(attemptNo) ||",
      replacements: ['false'],
      reason:
        'Removing the three guards together is still caught by the strict score-derived passed/mastered invariants and Number.isInteger(attemptNo), which rejects every non-number and non-finite value isNumber rejects here.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'LogicalOperator',
      original:
        "typeof passed !== 'boolean' ||\n    typeof mastered !== 'boolean' ||\n    !isNumber(attemptNo) ||",
      replacements: [
        "(typeof passed !== 'boolean' || typeof mastered !== 'boolean') && !isNumber(attemptNo)",
      ],
      reason:
        'Changing the grouped guards from OR to AND cannot admit a response: the later score-derived boolean invariants and Number.isInteger independently reject every value the weakened group could miss.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'ConditionalExpression',
      original: "typeof passed !== 'boolean' ||\n    typeof mastered !== 'boolean' ||",
      replacements: ['false'],
      reason:
        'Both omitted boolean guards are repeated by strict comparisons with score-derived booleans before any result is returned.',
    },
    {
      file: 'src/lib/types.ts',
      mutator: 'LogicalOperator',
      original: "typeof passed !== 'boolean' ||\n    typeof mastered !== 'boolean' ||",
      replacements: ["typeof passed !== 'boolean' && typeof mastered !== 'boolean'"],
      reason:
        'If only one flag is non-boolean, its strict comparison with the corresponding score-derived boolean still rejects the response.',
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
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      count: 4,
      reason:
        'The setUser, isSessionLeaseCurrent, schedulePendingCleanup, and retrySessionRestore callbacks capture only stable setters, refs, or module functions. React compares either constant dependency literal equal on every render, so all four callbacks retain exactly the same lifetime.',
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
        'The mount layout effect receives a dependency literal whose constant element compares equal on every render, so its setup and cleanup lifetime is unchanged.',
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
      reason:
        'The mount layout effect receives a constant dependency literal, preserving its setup and cleanup lifetime.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'ConditionalExpression',
      original: '!user ||\n      !validQuestionId ||',
      replacements: ['false'],
      reason:
        'Recorder onResult is rendered only after the user and UUID question parameter have both passed their early-return gates, so this leading subgroup is false.',
    },
    {
      file: 'src/app/practice/attempt.tsx',
      mutator: 'LogicalOperator',
      original: '!user ||\n      !validQuestionId ||',
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
      original: 'if (active) {',
      replacements: ['true'],
      reason:
        'Guards a post-unmount setReminder, and React discards updates dispatched to a detached fiber without an observable state change.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BlockStatement',
      original: 'return () => {\n      active = false;\n    };',
      replacements: ['{}'],
      reason: 'Same detached-fiber hydration guard as the active conditional.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original: 'active = false;',
      replacements: ['true'],
      reason: 'Same detached-fiber hydration guard as the active conditional.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      reason:
        'The hydration effect dependency literal remains constant, so it mounts and cleans up exactly once either way.',
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
      original: 'const exportFile: { current: File | null } = { current: null };',
      replacements: ['{}'],
      reason:
        'Undefined and null current are indistinguishable on every pre-file exit; a valid first page assigns File before any required dereference.',
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
        'Internal serialization error text is sanitized to the same localized export fallback.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original:
        "if (typeof encodedUser !== 'string') throw new Error('The export user is invalid.');",
      replacements: ['""'],
      reason:
        'Internal serialization error text is sanitized to the same localized export fallback.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: "if (!documentStarted) throw new Error('The export returned no pages.');",
      replacements: ['false'],
      reason:
        'Without an attempt page, the following recordingsStarted guard throws the same sanitized export failure; with a page, this condition is already false.',
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
      original: "if (completedFile === null) throw new Error('The export file is unavailable.');",
      replacements: ['false'],
      reason:
        'documentStarted can become true only after assigning and successfully writing exportFile.current, so this null branch is unreachable.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'StringLiteral',
      original: "if (completedFile === null) throw new Error('The export file is unavailable.');",
      replacements: ['""'],
      reason: 'The missing-file Error text is unreachable and sanitized in any case.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'OptionalChaining',
      original: 'exportFile.current?.delete();',
      replacements: ['exportFile.current.delete'],
      reason:
        'When no file exists, direct dereference throws inside the surrounding best-effort catch; when a file exists, both variants delete it.',
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
        'host comes from `new URL(...).hostname`, and WHATWG parsing rejects brackets anywhere except as the leading and trailing delimiters of an IPv6 literal. A bracket can therefore only ever be first or last, so dropping either anchor cannot change the replacement target.',
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
        'The 503 and REQUEST_IN_FLIGHT branches both select a 120-second maximum. Forcing this selector either way therefore returns the same bound.',
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
      original: 'for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {',
      replacements: ['page <= EXPORT_MAX_PAGES'],
      count: 2,
      reason:
        'In both export walkers, the page-9,999 body either returns on a terminal null cursor or throws before emitting a non-terminal cursor. No execution can reach a page-10,000 loop iteration, so < and <= have identical behaviour.',
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
        'const [recorderLocked, setRecorderLocked] = useState(false);',
        'const recorderLockedRef = useRef(false);',
        'const logoutBusyRef = useRef(false);',
        'const [logoutBusy, setLogoutBusy] = useState(false);',
        'const practiceStartRef = useRef(false);',
        'const focusedRef = useRef(false);',
      ],
      replacements: ['true'],
      count: 6,
      reason:
        'Focus and identity/recorder layout effects reset these seeds before passive /next publication can expose actionable diagnostic UI.',
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
      originals: ['recorderLockedRef.current = false;', 'setRecorderLocked(false);'],
      replacements: ['true'],
      count: 2,
      reason:
        'The recorderOwner layout effect resets both lock values before a newly published owner can expose account controls.',
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
      original:
        'const showIntro = !introStarted && !currentResult && (currentProgress?.asked ?? 0) === 0;',
      replacements: ['currentProgress.asked'],
      reason:
        'The non-done diagnostic-next parser couples every question with progress, and local advancement preserves that progress, so currentProgress is non-null whenever currentQuestion reaches this line.',
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
        'The recorderOwner layout effect resets the synchronous lock ref before a Recorder or an actionable question control can consume its seed.',
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
      original: "`${renderOwner}:${recorderQuestionId}:${nativeMode ? 'native' : 'english'}`;",
      replacements: ['""'],
      count: 2,
      reason:
        'Replacing either mode suffix with an empty string still leaves native and English owners distinct, and the owner string is otherwise opaque.',
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
        'The recorderOwner layout effect resets this ref before a Recorder or the language switch can consume its seed.',
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
        "validQuestionId && `${renderOwner}:${validQuestionId}:${nativeMode ? 'native' : 'english'}`;",
      replacements: ['""'],
      count: 2,
      reason:
        'Either emptied mode suffix remains distinct from the unchanged sibling suffix, and Recorder owner strings are otherwise opaque.',
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
      original: 'return { questionId: feedback.questionId, result: feedback.result };',
      replacements: ['{}'],
      reason:
        'With feedback, the empty initializer mismatches and is synchronously replaced by the render-phase card correction before commit; without feedback the preceding guard returns null.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'OptionalChaining',
      original:
        'if (feedback && (feedback.questionId !== card?.questionId || feedback.result !== card?.result)) {',
      replacements: ['card.questionId', 'card.result'],
      count: 2,
      reason:
        'Whenever feedback is truthy on this route, the initializer or an earlier render-phase correction has supplied a card; the no-feedback branch short-circuits before either access.',
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
      file: 'src/app/practice/index.tsx',
      mutator: 'ObjectLiteral',
      original: 'accessibilityState={{ disabled: interactionLocked }}',
      replacements: ['{}'],
      reason:
        'React Native Pressable derives accessibilityState.disabled from its disabled prop. This control already uses disabled={interactionLocked}, so removing the duplicate authored field leaves the same host accessibility state.',
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
