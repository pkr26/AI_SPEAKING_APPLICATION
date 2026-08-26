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
  exactLocations(104, 7, 104, 33),
  exactLocations(104, 35, 106, 4),
  exactLocations(35, 54, 35, 65),
  exactLocations(51, 52, 51, 57),
  exactLocations(52, 58, 52, 60),
  exactLocations(118, 11, 118, 52),
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
  exactLocations(95, 9, 95, 16),
  exactLocations(96, 19, 96, 41),
  exactLocations(77, 6, 77, 8),
  exactLocations(213, 7, 214, 16),
  exactLocations(213, 7, 214, 16),
  exactLocations(414, 35, 414, 66, 549, 31, 549, 62, 562, 31, 562, 62),
  exactLocations(514, 35, 514, 43, 514, 46, 514, 55),
  exactLocations(79, 6, 79, 8),
  exactLocations(169, 7, 170, 23),
  exactLocations(169, 7, 170, 23),
  exactLocations(338, 29, 338, 37, 338, 40, 338, 49),
  exactLocations(87, 39, 87, 41),
  exactLocations(129, 39, 129, 44),
  exactLocations(134, 31, 134, 36),
  exactLocations(149, 5, 149, 7),
  exactLocations(186, 6, 186, 43),
  exactLocations(178, 6, 178, 30),
  exactLocations(159, 6, 159, 43),
  exactLocations(194, 8, 194, 10),
  exactLocations(207, 25, 209, 4),
  exactLocations(209, 6, 209, 18),
  exactLocations(211, 9, 211, 53),
  exactLocations(219, 40, 219, 89),
  exactLocations(219, 61, 219, 65),
  exactLocations(219, 83, 219, 87),
  exactLocations(272, 9, 272, 39),
  exactLocations(272, 9, 272, 39),
  exactLocations(292, 11, 292, 17),
  exactLocations(296, 18, 298, 6),
  exactLocations(297, 16, 297, 21),
  exactLocations(299, 6, 299, 8),
  exactLocations(420, 11, 420, 28),
  exactLocations(421, 35, 421, 39),
  exactLocations(470, 50, 470, 67),
  exactLocations(486, 36, 486, 65),
  exactLocations(486, 67, 486, 79),
  exactLocations(490, 29, 490, 70),
  exactLocations(494, 66, 494, 95),
  exactLocations(541, 11, 541, 27),
  exactLocations(541, 45, 541, 76),
  exactLocations(544, 11, 544, 33),
  exactLocations(544, 51, 544, 84),
  exactLocations(559, 9, 559, 35),
  exactLocations(537, 11, 537, 29),
  exactLocations(616, 9, 616, 47),
  exactLocations(616, 9, 616, 47),
  exactLocations(644, 9, 644, 77),
  exactLocations(644, 9, 644, 77),
  exactLocations(644, 9, 644, 52),
  exactLocations(644, 9, 644, 52),
  exactLocations(644, 79, 646, 6),
  exactLocations(645, 14, 645, 19),
  exactLocations(691, 12, 691, 16),
  exactLocations(725, 17, 725, 38),
  exactLocations(710, 11, 710, 32),
  exactLocations(727, 17, 727, 30),
  exactLocations(792, 49, 792, 70),
  exactLocations(792, 74, 792, 76),
  exactLocations(806, 37, 806, 58),
  exactLocations(806, 62, 806, 64),
  exactLocations(171, 38, 171, 67, 204, 38, 204, 71),
  exactLocations(40, 82, 44, 4),
  exactLocations(55, 39, 55, 49, 55, 39, 55, 49),
  exactLocations(136, 10, 136, 35),
  exactLocations(342, 10, 342, 35),
  exactLocations(342, 10, 342, 61),
  exactLocations(351, 7, 351, 14),
  exactLocations(357, 5, 357, 32),
  exactLocations(389, 13, 389, 17),
  exactLocations(474, 11, 474, 29, 474, 11, 474, 29),
  exactLocations(474, 11, 474, 29),
  exactLocations(487, 7, 487, 32),
  exactLocations(487, 7, 488, 29),
  exactLocations(854, 7, 854, 35),
  exactLocations(1078, 22, 1078, 45, 1108, 22, 1108, 45),
  // Auth screens: mounted publication, navigation cleanup, and preview effects.
  exactLocations(47, 29, 47, 33),
  exactLocations(53, 29, 53, 33),
  exactLocations(56, 9, 56, 28),
  exactLocations(62, 9, 62, 28),
  exactLocations(106, 11, 106, 30),
  exactLocations(105, 11, 105, 30),
  exactLocations(114, 11, 114, 29),
  exactLocations(113, 11, 113, 29),
  exactLocations(60, 6, 60, 8),
  // Forgot/reset password screens.
  exactLocations(30, 29, 30, 33),
  exactLocations(45, 29, 45, 33),
  exactLocations(37, 6, 37, 8),
  exactLocations(52, 6, 52, 8),
  exactLocations(39, 9, 39, 28),
  exactLocations(54, 9, 54, 28),
  exactLocations(72, 11, 72, 29, 76, 11, 76, 29, 79, 11, 79, 29),
  exactLocations(99, 11, 99, 29, 102, 11, 102, 29),
  exactLocations(108, 33, 108, 51),
  // Home and history.
  exactLocations(61, 8, 61, 10),
  exactLocations(157, 29, 157, 34),
  exactLocations(173, 6, 173, 8),
  exactLocations(256, 28, 256, 100),
  exactLocations(266, 9, 266, 32, 261, 8, 261, 31),
  exactLocations(292, 37, 292, 61, 283, 45, 283, 69),
  exactLocations(292, 54, 292, 59, 283, 62, 283, 67),
  // Diagnostic lifecycle and async ownership.
  exactLocations(
    54,
    56,
    54,
    61,
    55,
    36,
    55,
    41,
    56,
    32,
    56,
    37,
    57,
    48,
    57,
    53,
    58,
    35,
    58,
    40,
    60,
    29,
    60,
    34,
  ),
  exactLocations(59, 29, 59, 33, 61, 35, 61, 39),
  exactLocations(76, 25, 85, 4, 78, 18, 84, 6),
  exactLocations(79, 28, 79, 33, 80, 28, 80, 33),
  exactLocations(81, 34, 81, 38, 93, 36, 93, 40),
  exactLocations(85, 6, 85, 8, 95, 8, 95, 10),
  exactLocations(111, 33, 111, 38, 112, 23, 112, 28),
  exactLocations(117, 18, 119, 6),
  exactLocations(118, 11, 118, 52),
  exactLocations(118, 11, 118, 52),
  exactLocations(132, 9, 132, 50),
  exactLocations(179, 7, 179, 21),
  exactLocations(188, 14, 188, 18),
  exactLocations(254, 32, 254, 36, 255, 29, 255, 33),
  exactLocations(257, 17, 257, 22),
  exactLocations(270, 11, 270, 74, 270, 33, 270, 74),
  exactLocations(270, 11, 270, 74),
  exactLocations(272, 13, 272, 18),
  exactLocations(402, 57, 402, 79),
  // Change-password/delete-account screens.
  exactLocations(51, 29, 51, 34),
  exactLocations(45, 29, 45, 34),
  exactLocations(58, 6, 58, 8),
  exactLocations(53, 6, 53, 8),
  exactLocations(108, 11, 108, 30),
  exactLocations(90, 13, 90, 31, 96, 18, 96, 36),
  exactLocations(121, 11, 121, 30, 136, 17, 136, 36),
  // Practice home equivalents.
  exactLocations(37, 6, 37, 36),
  exactLocations(41, 36, 41, 41),
  exactLocations(49, 39, 49, 43, 50, 29, 50, 33),
  exactLocations(62, 54, 62, 65),
  exactLocations(72, 28, 72, 33, 73, 28, 73, 33),
  exactLocations(74, 38, 74, 42),
  exactLocations(117, 53, 117, 61, 117, 64, 117, 73),
  exactLocations(132, 7, 132, 51),
  exactLocations(139, 7, 139, 21),
  exactLocations(146, 5, 146, 7),
  exactLocations(169, 40, 169, 44),
  exactLocations(217, 7, 217, 39),
  exactLocations(223, 73, 223, 77),
  exactLocations(325, 17, 325, 22),
  exactLocations(340, 13, 340, 18),
  // Practice Mode equivalents.
  exactLocations(38, 6, 38, 36),
  exactLocations(38, 29, 38, 34),
  exactLocations(41, 36, 41, 41),
  exactLocations(45, 29, 45, 33, 47, 39, 47, 43),
  exactLocations(56, 54, 56, 65),
  exactLocations(63, 57, 63, 65, 63, 68, 63, 77),
  exactLocations(74, 28, 74, 33, 75, 28, 75, 33),
  exactLocations(76, 38, 76, 42),
  exactLocations(94, 7, 94, 21),
  exactLocations(113, 40, 113, 44),
  exactLocations(173, 7, 173, 39),
  exactLocations(179, 76, 179, 80),
  exactLocations(202, 7, 202, 40),
  // Feedback-card equivalents.
  exactLocations(71, 57, 72, 83),
  exactLocations(72, 16, 72, 76),
  exactLocations(74, 44, 74, 60, 74, 84, 74, 96),
  exactLocations(84, 29, 84, 33),
  exactLocations(93, 28, 93, 33, 92, 28, 92, 33),
  exactLocations(96, 6, 96, 8, 108, 8, 108, 10),
  exactLocations(150, 7, 151, 26),
  exactLocations(150, 7, 151, 26),
  exactLocations(186, 77, 186, 81),
  // Fresh cross-lane equivalents reviewed after the state/prop campaign.
  exactLocations(936, 37, 936, 42),
  exactLocations(936, 7, 936, 28),
  exactLocations(954, 11, 956, 4),
  exactLocations(119, 9, 119, 31),
  exactLocations(1118, 9, 1118, 28),
  exactLocations(517, 36, 517, 65, 517, 67, 517, 79, 525, 29, 525, 72, 542, 47, 542, 88),
  exactLocations(611, 9, 611, 27),
  exactLocations(767, 58, 767, 87),
  exactLocations(767, 58, 767, 87),
  exactLocations(878, 10, 878, 44),
  exactLocations(878, 10, 878, 44),
  exactLocations(993, 11, 993, 64),
]);

const recorderEquivalentMutantGroups = Object.freeze([
  {
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    mutants: [
      ['737', 'ConditionalExpression', 'if (!uri) return;', 'false', 759, 7, 759, 11],
      [
        '1046',
        'ConditionalExpression',
        'if (candidateUri) candidates.add(candidateUri);',
        'true',
        1262,
        9,
        1262,
        21,
      ],
      ['1107', 'ConditionalExpression', 'if (uri) ownedUris.add(uri);', 'true', 1346, 11, 1346, 14],
      [
        '2264',
        'ConditionalExpression',
        'if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);',
        'true',
        2564,
        11,
        2564,
        31,
      ],
    ],
  },
  {
    reason:
      'On the only mount for which recordingCacheJanitorHasRun is false, no audio owner can predate the passive janitor; if another Recorder already acquired the session, its earlier mount already set the process-once flag. The owner operand therefore cannot decide the result.',
    mutants: [
      [
        '778',
        'ConditionalExpression',
        'activeAudioSessionOwner !== null,',
        'false',
        812,
        7,
        812,
        39,
      ],
    ],
  },
  {
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    mutants: [
      ['797', 'BooleanLiteral', 'const mountedRef = useRef(true);', 'false', 857, 29, 857, 33],
      ['798', 'BooleanLiteral', 'const unmountingRef = useRef(false);', 'true', 858, 32, 858, 37],
    ],
  },
  {
    reason:
      'The later AppState mount effect writes mountedRef true before external app-state events or async continuations can publish. Writing false in this earlier mount assignment is therefore overwritten before it can be the sole lifecycle currency.',
    mutants: [
      ['1181', 'BooleanLiteral', 'mountedRef.current = true;', 'false', 1472, 26, 1472, 30],
    ],
  },
  {
    reason:
      'permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.',
    mutants: [
      [
        '832',
        'BooleanLiteral',
        'const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);',
        'true',
        923,
        74,
        923,
        79,
      ],
      [
        '834',
        'BooleanLiteral',
        'const [previewPlaying, setPreviewPlaying] = useState(false);',
        'true',
        927,
        56,
        927,
        61,
      ],
      [
        '1982',
        'StringLiteral',
        "const announcedPhaseRef = useRef<Phase>('idle');",
        '""',
        2295,
        43,
        2295,
        49,
      ],
    ],
  },
  {
    reason:
      'Each ref is consulted only after the recording, submission, interruption, or preview operation that owns it synchronously initializes it. The idle component never consumes these seeds, so changing their initial booleans is unobservable.',
    mutants: [
      [
        '837',
        'BooleanLiteral',
        'const hasObservedRecordingRef = useRef(false);',
        'true',
        942,
        42,
        942,
        47,
      ],
      [
        '838',
        'BooleanLiteral',
        'const recordingInterruptionHandledRef = useRef(false);',
        'true',
        943,
        50,
        943,
        55,
      ],
      [
        '840',
        'BooleanLiteral',
        'const cancelRequestedRef = useRef(false);',
        'true',
        947,
        37,
        947,
        42,
      ],
      [
        '841',
        'BooleanLiteral',
        'const assessmentPostedRef = useRef(false);',
        'true',
        948,
        38,
        948,
        43,
      ],
      [
        '843',
        'BooleanLiteral',
        'const previewPlayRequestedRef = useRef(false);',
        'true',
        974,
        42,
        974,
        47,
      ],
    ],
  },
  {
    reason:
      'useLayoutEffect replaces the callback and identity snapshots in the same commit before focus or passive effects, user input, native events, or promise continuations can invoke their consumers. The initial object literal is therefore dead.',
    mutants: [
      [
        '846',
        'ObjectLiteral',
        'const callbacksRef = useRef({\n    disabled,\n    isStartBlocked,\n    onError,\n    onInteractionLockChange,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    parseResult,\n  });',
        '{}',
        982,
        31,
        992,
        4,
      ],
      [
        '882',
        'ObjectLiteral',
        'const identityRef = useRef({ ownerId, endpoint, questionId });',
        '{}',
        1032,
        30,
        1032,
        63,
      ],
    ],
  },
  {
    reason:
      'The injected array element is a string with no uri or takeGeneration property. Every quarantine predicate compares those properties with a real URI or numeric generation, so it never matches and is eventually shifted out without side effects.',
    mutants: [
      [
        '799',
        'ArrayDeclaration',
        'const terminalEventQuarantineRef = useRef<TerminalEventQuarantine[]>([]);',
        '["Stryker was here"]',
        864,
        72,
        864,
        74,
      ],
    ],
  },
  {
    reason:
      'Replacing optional access can only throw when the target is nullish, and every listed access is inside a try/catch whose fallback already leaves the same false or cleared state. Non-null targets execute identically.',
    mutants: [
      [
        '808',
        'OptionalChaining',
        'recorderStillRecording = currentRecorderRef.current?.isRecording === true;',
        'currentRecorderRef.current.isRecording',
        877,
        34,
        877,
        73,
      ],
      [
        '1034',
        'OptionalChaining',
        'previewListenerRef.current?.remove();',
        'previewListenerRef.current.remove',
        1240,
        7,
        1240,
        41,
      ],
      ['1036', 'OptionalChaining', 'player?.remove();', 'player.remove', 1248, 7, 1248, 21],
    ],
  },
  {
    reason:
      'These values are used only as change or freshness tokens: the state version merely forces a render, while generations and epochs are compared only for equality with captured values. Incrementing or decrementing creates the same distinct token.',
    mutants: [
      [
        '823',
        'ArithmeticOperator',
        'setRecordingStatusVersion((version) => version + 1);',
        'version - 1',
        902,
        48,
        902,
        59,
      ],
      [
        '1064',
        'AssignmentOperator',
        'recoveryGenerationRef.current += 1;',
        'recoveryGenerationRef.current -= 1',
        1289,
        5,
        1289,
        39,
      ],
      [
        '1136',
        'AssignmentOperator',
        'lifecycleEpochRef.current += 1;',
        'lifecycleEpochRef.current -= 1',
        1391,
        7,
        1391,
        37,
      ],
      [
        '1338',
        'UpdateOperator',
        'const generation = ++recoveryGenerationRef.current;',
        '--recoveryGenerationRef.current',
        1644,
        24,
        1644,
        55,
      ],
    ],
  },
  {
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    mutants: [
      ['824', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 905, 6, 905, 8],
      ['856', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1002, 6, 1002, 8],
      ['881', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1031, 6, 1031, 8],
      ['892', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1072, 6, 1072, 8],
      ['906', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1086, 6, 1086, 8],
      ['961', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1167, 6, 1167, 8],
      ['966', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1171, 5, 1171, 7],
      [
        '972',
        'ArrayDeclaration',
        'const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);',
        '["Stryker was here"]',
        1174,
        89,
        1174,
        91,
      ],
      [
        '974',
        'ArrayDeclaration',
        'const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);',
        '["Stryker was here"]',
        1176,
        81,
        1176,
        83,
      ],
      ['987', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1187, 6, 1187, 8],
      ['1010', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1208, 6, 1208, 8],
      ['1024', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1219, 6, 1219, 8],
      ['1040', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1253, 6, 1253, 8],
      ['1043', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1258, 6, 1258, 8],
      ['1047', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1266, 6, 1266, 8],
      ['1053', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1276, 6, 1276, 8],
      ['1062', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1286, 6, 1286, 8],
      ['1072', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1298, 6, 1298, 8],
      ['1102', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1337, 5, 1337, 7],
      ['1843', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2169, 6, 2169, 8],
      ['1929', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2250, 6, 2250, 8],
    ],
  },
  {
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    mutants: [
      ['919', 'ArrayDeclaration', '[publishOperation],', '[]', 1105, 5, 1105, 23],
      ['930', 'ArrayDeclaration', '[publishOperation],', '[]', 1123, 5, 1123, 23],
      ['1030', 'ArrayDeclaration', '[updatePhase],', '[]', 1233, 5, 1233, 18],
      [
        '1938',
        'ArrayDeclaration',
        'useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);',
        '[]',
        2258,
        49,
        2258,
        71,
      ],
      [
        '2080',
        'ArrayDeclaration',
        '[\n      adoptOwnedRecording,\n      clearWebAutoStopTimer,\n      discardRecording,\n      restoreOwnedAudioMode,\n      updatePhase,\n    ],',
        '[]',
        2366,
        5,
        2372,
        6,
      ],
    ],
  },
  {
    reason:
      'audioSessionCanBeAcquired plus the awaited global release promise ensures recording start reaches acquisition only with a null owner; Recorder phase and operation currency exclude re-acquiring a session already owned by this instance. The null test is always true.',
    mutants: [
      [
        '852',
        'ConditionalExpression',
        'if (activeAudioSessionOwner === null) {',
        'true',
        996,
        9,
        996,
        41,
      ],
    ],
  },
  {
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    mutants: [
      [
        '874',
        'ConditionalExpression',
        'if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {',
        'true',
        1018,
        13,
        1018,
        71,
      ],
      ['876', 'OptionalChaining', 'resolveRelease?.();', 'resolveRelease()', 1023, 11, 1023, 29],
      [
        '879',
        'ConditionalExpression',
        'if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;',
        'true',
        1027,
        11,
        1027,
        53,
      ],
    ],
  },
  {
    reason:
      'operationOwnerRef is non-null only while the in-flight set is non-empty. Ordinary begin is already rejected by the count and superseding begin ignores both checks, so the owner boolean cannot independently decide admission.',
    mutants: [
      [
        '913',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1093,
        11,
        1093,
        45,
      ],
    ],
  },
  {
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    mutants: [
      [
        '922',
        'ConditionalExpression',
        '!canResumeRecorderOperation(\n          operationOwnerRef.current !== null,\n          operationsInFlightRef.current.has(token),\n          operationsInFlightRef.current.size,\n        )',
        'false',
        1111,
        9,
        1115,
        10,
      ],
      [
        '924',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1112,
        11,
        1112,
        45,
      ],
      ['927', 'BlockStatement', ') {\n        return false;\n      }', '{}', 1116, 9, 1118, 8],
      ['928', 'BooleanLiteral', 'return false;', 'true', 1117, 16, 1117, 21],
    ],
  },
  {
    reason:
      'A stale token can finish only beneath a newer superseding lifecycle token. Clearing ownership early still leaves another in-flight token, so count-based admission remains blocked, the lock remains active, and lifecycle cleanup has no later owner-current read. The defensive identity guard is unobservable.',
    mutants: [
      [
        '933',
        'ConditionalExpression',
        'if (operationOwnerRef.current === token) operationOwnerRef.current = null;',
        'true',
        1128,
        9,
        1128,
        44,
      ],
    ],
  },
  {
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    mutants: [
      [
        '940',
        'ConditionalExpression',
        'if (mountedRef.current) setOperationActive(stillActive);',
        'true',
        1130,
        9,
        1130,
        27,
      ],
      ['1022', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 1215, 9, 1215, 27],
      [
        '1028',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1230,
        11,
        1230,
        29,
      ],
      [
        '1038',
        'ConditionalExpression',
        'if (mountedRef.current) setPreviewPlaying(false);',
        'true',
        1252,
        9,
        1252,
        27,
      ],
      [
        '1280',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1570,
        13,
        1570,
        31,
      ],
      [
        '1336',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(false);',
        'true',
        1643,
        9,
        1643,
        27,
      ],
      [
        '1925',
        'ConditionalExpression',
        'if (active) setReduceMotion(enabled);',
        'true',
        2242,
        13,
        2242,
        19,
      ],
      ['1928', 'BooleanLiteral', 'active = false;', 'true', 2247, 16, 2247, 21],
      [
        '2160',
        'ConditionalExpression',
        'if (mountedRef.current) setPermissionDenied(false);',
        'true',
        2477,
        9,
        2477,
        27,
      ],
    ],
  },
  {
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    mutants: [
      [
        '1015',
        'ConditionalExpression',
        "next === 'uploading' || next === 'recovering' ? monotonicNow() : null;",
        'true',
        1214,
        7,
        1214,
        52,
      ],
      [
        '1951',
        'ConditionalExpression',
        'if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);',
        'true',
        2267,
        11,
        2267,
        29,
      ],
    ],
  },
  {
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    mutants: [
      ['1060', 'BlockStatement', '} catch {\n      return false;\n    }', '{}', 1283, 13, 1285, 6],
      [
        '1476',
        'BlockStatement',
        '} catch {\n          return false;\n        }',
        '{}',
        1789,
        17,
        1791,
        10,
      ],
      [
        '2751',
        'ArrowFunction',
        'const promise = markPendingAssessmentCancelled(requestId).catch(() => false);',
        '() => undefined',
        3119,
        71,
        3119,
        82,
      ],
    ],
  },
  {
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    mutants: [
      [
        '1078',
        'ConditionalExpression',
        'if (nativeStopPromiseRef.current === promise) {',
        'true',
        1303,
        11,
        1303,
        51,
      ],
      [
        '1176',
        'ConditionalExpression',
        'if (lifecycleStopPromiseRef.current === promise) {',
        'true',
        1451,
        11,
        1451,
        54,
      ],
    ],
  },
  {
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    mutants: [
      [
        '1090',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1321,
        15,
        1321,
        86,
      ],
      [
        '1092',
        'LogicalOperator',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'settled && completion && completion.takeGeneration !== takeGeneration',
        1321,
        15,
        1321,
        86,
      ],
      [
        '1093',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1321,
        27,
        1321,
        85,
      ],
      ['1097', 'BooleanLiteral', 'settled = true;', 'false', 1322, 21, 1322, 25],
    ],
  },
  {
    reason:
      'Prepared-recorder disposal runs under an operation while no recording is adoptable. A terminal callback published without suppression can only bump the status version; the consuming effect rejects it through its phase and operation guards.',
    mutants: [
      [
        '1104',
        'BooleanLiteral',
        'suppressRecordingStatusRef.current = true;',
        'false',
        1341,
        42,
        1341,
        46,
      ],
    ],
  },
  {
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    mutants: [
      [
        '1133',
        'ConditionalExpression',
        'if (!operationToken) return Promise.resolve();',
        'false',
        1389,
        9,
        1389,
        24,
      ],
      ['1227', 'ConditionalExpression', 'if (!operationToken) return;', 'false', 1513, 9, 1513, 24],
    ],
  },
  {
    reason:
      'recoverPending calls beginOperation only after operationIsInFlight synchronously proved the owner set empty. With no current owner or token, superseding and ordinary begin have identical admission and ownership effects, so the first false argument is redundant.',
    mutants: [
      [
        '1224',
        'BooleanLiteral',
        'const operationToken = beginOperation(false, false);',
        'true',
        1512,
        43,
        1512,
        48,
      ],
    ],
  },
  {
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    mutants: [
      [
        '1172',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        1445,
        41,
        1445,
        46,
      ],
      [
        '2061',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2350,
        41,
        2350,
        46,
      ],
      [
        '2309',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2616,
        41,
        2616,
        46,
      ],
      [
        '2365',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2672,
        41,
        2672,
        46,
      ],
      [
        '2411',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2703,
        41,
        2703,
        46,
      ],
    ],
  },
  {
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    mutants: [
      ['1184', 'BooleanLiteral', 'unmountingRef.current = true;', 'false', 1475, 31, 1475, 35],
      ['1185', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 1476, 28, 1476, 33],
    ],
  },
  {
    reason:
      'On unmount, the earlier layout-effect cleanup has already set unmounting true and mounted false before this passive cleanup runs. On a passive-effect dependency refresh, React runs cleanup and the replacement setup together before async continuations, and setup immediately restores mounted true. This duplicate false assignment is never the sole lifecycle guard.',
    mutants: [
      ['1903', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 2215, 28, 2215, 33],
    ],
  },
  {
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    mutants: [
      [
        '1192',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder;',
        'true',
        1485,
        7,
        1485,
        46,
      ],
      [
        '2343',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2644,
        7,
        2644,
        46,
      ],
      [
        '2461',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2765,
        7,
        2765,
        46,
      ],
    ],
  },
  {
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    mutants: [
      [
        '1202',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1487,
        11,
        1487,
        44,
      ],
      [
        '1205',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1487,
        11,
        1487,
        66,
      ],
      [
        '1206',
        'LogicalOperator',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        "phaseRef.current === 'recovering' || mountedRef.current",
        1487,
        11,
        1487,
        66,
      ],
    ],
  },
  {
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    mutants: [
      [
        '1216',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1496,
        9,
        1496,
        45,
      ],
      [
        '1256',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1541,
        9,
        1541,
        45,
      ],
      [
        '1264',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1557,
        11,
        1557,
        47,
      ],
      [
        '1330',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1624,
        11,
        1624,
        47,
      ],
    ],
  },
  {
    reason:
      'No second recovery attempt can start while this loading operation token remains in flight. The attempt ref is therefore this exact symbol or already null from invalidation, and assigning null unconditionally cannot clear a newer attempt.',
    mutants: [
      [
        '1232',
        'ConditionalExpression',
        'if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;',
        'true',
        1518,
        11,
        1518,
        57,
      ],
    ],
  },
  {
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    mutants: [
      [
        '1248',
        'ConditionalExpression',
        'const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1536,
        66,
        1536,
        100,
      ],
      [
        '1324',
        'ConditionalExpression',
        'activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1619,
        41,
        1619,
        75,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    mutants: [
      ['1282', 'ConditionalExpression', 'if (pending === null) {', 'false', 1577, 9, 1577, 25],
      [
        '1285',
        'BlockStatement',
        'if (pending === null) {\n      finishLoading();\n      return;\n    }',
        '{}',
        1577,
        27,
        1580,
        6,
      ],
    ],
  },
  {
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    mutants: [
      [
        '1341',
        'ConditionalExpression',
        'recoveryGenerationRef.current === generation,',
        'true',
        1647,
        9,
        1647,
        53,
      ],
      [
        '1344',
        'ConditionalExpression',
        'activeRecoveryOwner === instanceId,',
        'true',
        1649,
        9,
        1649,
        43,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad already proved operation and lifecycle currency, and the reconcile-stage callback is reached without an intervening await. Callback re-entry is followed immediately by the separate post-callback isCurrent guard before effects.',
    mutants: [
      ['1367', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1670, 13, 1670, 25],
    ],
  },
  {
    reason:
      'The validated prepared-stage path reaches this check without an await or re-entry. releaseUnclaimedHandoff then performs the sole await and immediately rechecks isCurrent before publishing, so the outer guard is redundant.',
    mutants: [
      ['1400', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1695, 13, 1695, 25],
    ],
  },
  {
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    mutants: [
      ['1454', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1769, 36, 1769, 41],
      ['1473', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1778, 36, 1778, 41],
    ],
  },
  {
    reason:
      'This call occurs only inside the not-routeMatches branch. finishUnresolved independently tests not-routeMatches when choosing whether a recording can be retained, so changing allowRecordedRetry cannot change the selected branch.',
    mutants: [
      [
        '1682',
        'BooleanLiteral',
        "await finishUnresolved(translate('recorder.errInterruptedSaved'), false);",
        'true',
        1973,
        85,
        1973,
        90,
      ],
    ],
  },
  {
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    mutants: [
      ['1707', 'ConditionalExpression', 'if (isCurrent()) {', 'true', 2002, 23, 2002, 34],
      ['1771', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 2059, 25, 2059, 37],
    ],
  },
  {
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    mutants: [
      [
        '1779',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errRejected')),",
        '""',
        2069,
        63,
        2069,
        85,
      ],
      [
        '1784',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errNotSent')),",
        '""',
        2077,
        63,
        2077,
        84,
      ],
    ],
  },
  {
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    mutants: [
      [
        '1862',
        'ConditionalExpression',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'true',
        2190,
        17,
        2190,
        54,
      ],
      [
        '1863',
        'LogicalOperator',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'identityMatches || mountedRef.current',
        2190,
        17,
        2190,
        54,
      ],
    ],
  },
  {
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    mutants: [
      [
        '1932',
        'ConditionalExpression',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        'true',
        2255,
        9,
        2255,
        29,
      ],
      [
        '1934',
        'StringLiteral',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        '""',
        2255,
        19,
        2255,
        29,
      ],
    ],
  },
  {
    reason:
      'The effect depends only on phase, so React never reruns it with an unchanged phase. The ref is assigned on every run, making the equality early return unreachable.',
    mutants: [
      [
        '1984',
        'ConditionalExpression',
        'if (announcedPhaseRef.current === phase) return;',
        'false',
        2297,
        9,
        2297,
        44,
      ],
    ],
  },
  {
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    mutants: [
      ['2030', 'ConditionalExpression', 'pulseSteps.length !== 2 ||', 'false', 2323, 7, 2323, 30],
      [
        '2032',
        'ConditionalExpression',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'false',
        2323,
        7,
        2330,
        8,
      ],
      [
        '2034',
        'LogicalOperator',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.length !== 2 && pulseSteps.some(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2323,
        7,
        2330,
        8,
      ],
      [
        '2035',
        'MethodExpression',
        'pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.every(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2324,
        7,
        2330,
        8,
      ],
      [
        '2036',
        'ArrowFunction',
        '(step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '() => undefined',
        2325,
        9,
        2329,
        40,
      ],
      [
        '2038',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        'false',
        2326,
        11,
        2327,
        42,
      ],
      [
        '2039',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        '!Number.isFinite(step.toValue) && !Number.isFinite(step.duration)',
        2326,
        11,
        2327,
        42,
      ],
      [
        '2040',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        'false',
        2326,
        11,
        2328,
        29,
      ],
      [
        '2041',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration)) && step.duration <= 0',
        2326,
        11,
        2328,
        29,
      ],
      [
        '2042',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        'false',
        2326,
        11,
        2329,
        40,
      ],
      [
        '2044',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0) && step.useNativeDriver !== true',
        2326,
        11,
        2329,
        40,
      ],
      ['2046', 'ConditionalExpression', 'step.duration <= 0 ||', 'false', 2328, 11, 2328, 29],
      [
        '2047',
        'EqualityOperator',
        'step.duration <= 0 ||',
        'step.duration < 0',
        2328,
        11,
        2328,
        29,
      ],
      [
        '2049',
        'ConditionalExpression',
        'step.useNativeDriver !== true,',
        'false',
        2329,
        11,
        2329,
        40,
      ],
      [
        '2052',
        'BlockStatement',
        ') {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2331,
        7,
        2334,
        6,
      ],
      [
        '2054',
        'ConditionalExpression',
        'if (animations.length === 0) {',
        'false',
        2336,
        9,
        2336,
        32,
      ],
      [
        '2057',
        'BlockStatement',
        'if (animations.length === 0) {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2336,
        34,
        2339,
        6,
      ],
    ],
  },
  {
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    mutants: [
      [
        '2110',
        'ConditionalExpression',
        'recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2412,
        11,
        2412,
        38,
      ],
      [
        '2346',
        'ConditionalExpression',
        'const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2647,
        29,
        2647,
        56,
      ],
    ],
  },
  {
    reason:
      'Every lifecycle epoch change first installs a superseding operation token. Current operation-token currency therefore already proves the captured epoch equals the live epoch, making this equality operand redundant.',
    mutants: [
      [
        '2147',
        'ConditionalExpression',
        'lifecycleEpoch === lifecycleEpochRef.current,',
        'true',
        2460,
        9,
        2460,
        53,
      ],
    ],
  },
  {
    reason:
      'When no prompt was required, response is the current permission and app context is already active; the extra foreground wait resolves immediately and adopting the same epoch is a no-op. When prompted, the original branch already runs.',
    mutants: [['2191', 'ConditionalExpression', 'if (prompted) {', 'true', 2495, 11, 2495, 19]],
  },
  {
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    mutants: [
      [
        '2194',
        'ConditionalExpression',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        'false',
        2498,
        13,
        2498,
        56,
      ],
      [
        '2195',
        'LogicalOperator',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        '!identityIsCurrent() && !mountedRef.current',
        2498,
        13,
        2498,
        56,
      ],
      [
        '2213',
        'ConditionalExpression',
        'if (!isCurrentLifecycle()) return;',
        'false',
        2513,
        11,
        2513,
        32,
      ],
    ],
  },
  {
    reason:
      'isCurrentLifecycle was checked immediately before this denied-permission branch and includes recorderContextIsActive, which proves mountedRef.current. The nested mounted condition is always true.',
    mutants: [
      ['2220', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 2515, 13, 2515, 31],
    ],
  },
  {
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    mutants: [
      ['2261', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2553, 37, 2553, 42],
      ['2269', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2568, 37, 2568, 42],
    ],
  },
  {
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    mutants: [
      [
        '2282',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'false',
        2587,
        11,
        2587,
        27,
      ],
      [
        '2283',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'true',
        2587,
        11,
        2587,
        27,
      ],
    ],
  },
  {
    reason:
      'After record succeeds, the remaining statements are non-throwing ref and Set updates plus guarded phase publication; the catch cannot observe prepared again. Its reset value is dead.',
    mutants: [['2293', 'BooleanLiteral', 'prepared = false;', 'true', 2601, 18, 2601, 23]],
  },
  {
    reason:
      'Start cleanup preserves the prior active URI whenever it is non-null, so activeUriRef equals previousUri in every recorded fallback case. If both are null, forcing only the equality true still leaves the trailing previousUri falsy and selects idle. The phase result is unchanged.',
    mutants: [
      [
        '2314',
        'ConditionalExpression',
        "updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');",
        'true',
        2620,
        21,
        2620,
        57,
      ],
    ],
  },
  {
    reason:
      'The stop reason is used only to distinguish the literal auto value. Every other value follows the user-stop path, so an empty string and the user default are behaviorally identical.',
    mutants: [
      [
        '2326',
        'StringLiteral',
        "const stopRecording = async (reason: 'user' | 'auto' = 'user') => {",
        '""',
        2632,
        58,
        2632,
        64,
      ],
    ],
  },
  {
    reason:
      'Identity changes synchronously start a superseding lifecycle operation before stale work can continue. A current operation token therefore already implies assessment identity still matches, so weakening this conjunction admits no distinct state.',
    mutants: [
      [
        '2337',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2642,
        7,
        2643,
        84,
      ],
      [
        '2455',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2763,
        7,
        2764,
        84,
      ],
    ],
  },
  {
    reason:
      'completedTakeIsValid receives the URI separately and rejects null before considering fileIsUsable. Forcing the preceding URI non-null operand true cannot make a null completion valid.',
    mutants: [
      [
        '2366',
        'ConditionalExpression',
        'const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);',
        'true',
        2673,
        28,
        2673,
        40,
      ],
    ],
  },
  {
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    mutants: [
      ['2445', 'ConditionalExpression', 'if (!uri) {', 'false', 2747, 9, 2747, 13],
      [
        '2447',
        'BlockStatement',
        "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      endOperation(operationToken);\n      return;\n    }",
        '{}',
        2747,
        15,
        2752,
        6,
      ],
      ['2448', 'StringLiteral', "updatePhase('idle');", '""', 2748, 19, 2748, 25],
      [
        '2449',
        'StringLiteral',
        "callbacksRef.current.onError(translate('recorder.errNoRecording'));",
        '""',
        2749,
        46,
        2749,
        71,
      ],
      ['2794', 'ConditionalExpression', 'if (!uri) return;', 'false', 3175, 11, 3175, 15],
    ],
  },
  {
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    mutants: [
      [
        '2467',
        'LogicalOperator',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        "controller.signal.reason && new DOMException('The operation was aborted.', 'AbortError')",
        2772,
        11,
        2772,
        99,
      ],
      [
        '2468',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2772,
        56,
        2772,
        84,
      ],
      [
        '2469',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2772,
        86,
        2772,
        98,
      ],
      [
        '2577',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2924,
        32,
        2924,
        60,
      ],
      [
        '2578',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2924,
        62,
        2924,
        74,
      ],
    ],
  },
  {
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    mutants: [
      [
        '2531',
        'LogicalOperator',
        'throw lastCapacityError ?? new Error();',
        'lastCapacityError && new Error()',
        2882,
        15,
        2882,
        47,
      ],
    ],
  },
  {
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    mutants: [
      [
        '2576',
        'ConditionalExpression',
        'if (cancelPersistence) await cancelPersistence.promise;',
        'true',
        2923,
        13,
        2923,
        30,
      ],
      [
        '2626',
        'BooleanLiteral',
        'const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;',
        'true',
        2975,
        86,
        2975,
        91,
      ],
    ],
  },
  {
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    mutants: [
      ['2627', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 2976, 40, 2976, 45],
      ['2639', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 2990, 38, 2990, 43],
    ],
  },
  {
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    mutants: [
      [
        '2638',
        'BooleanLiteral',
        'const cleared = requestId ? await clearRequestTracking(requestId) : true;',
        'false',
        2989,
        77,
        2989,
        81,
      ],
      ['2690', 'ConditionalExpression', 'if (requestId) {', 'true', 3043, 15, 3043, 24],
    ],
  },
  {
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    mutants: [
      [
        '2705',
        'ConditionalExpression',
        'if (uploadControllerRef.current === controller) {',
        'true',
        3059,
        11,
        3059,
        53,
      ],
    ],
  },
  {
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    mutants: [
      [
        '2727',
        'ConditionalExpression',
        'if (startIsBlocked()) return Promise.resolve();',
        'false',
        3092,
        9,
        3092,
        25,
      ],
    ],
  },
  {
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    mutants: [
      ['2742', 'ConditionalExpression', 'if (!controller) return;', 'false', 3113, 9, 3113, 20],
    ],
  },
  {
    reason:
      'The rewind promise owner handles rejection by releasing the player and reporting once. After finally clears the request flag, the following identity and playability guard returns, so this duplicate catch return has no effect.',
    mutants: [
      [
        '2776',
        'BlockStatement',
        '} catch {\n        // The rewind owner releases the player and reports the failure once.\n        return;\n      } finally {',
        '{}',
        3153,
        15,
        3156,
        8,
      ],
    ],
  },
  {
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    mutants: [
      [
        '2786',
        'ConditionalExpression',
        'previewPlayerRef.current !== null,',
        'true',
        3164,
        11,
        3164,
        44,
      ],
    ],
  },
  {
    reason:
      'If createAudioPlayer throws, continuing reaches addListener on the unset local; the second catch performs best-effort cleanup and emits the same single play-failed callback. The two paths converge.',
    mutants: [
      [
        '2797',
        'BlockStatement',
        "} catch {\n        callbacksRef.current.onError(translate('recorder.errPlayFailed'));\n        return;\n      }",
        '{}',
        3179,
        15,
        3182,
        8,
      ],
    ],
  },
  {
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    mutants: [
      [
        '2817',
        'ConditionalExpression',
        'if (previewPlayerRef.current === player) {',
        'true',
        3199,
        17,
        3199,
        52,
      ],
      [
        '2827',
        'ConditionalExpression',
        'previewRewindPromiseRef.current === rewind &&',
        'true',
        3214,
        17,
        3214,
        59,
      ],
      [
        '2831',
        'LogicalOperator',
        'previewRewindPromiseRef.current === rewind &&\n                previewPlayerRef.current === player',
        'previewRewindPromiseRef.current === rewind || previewPlayerRef.current === player',
        3214,
        17,
        3215,
        52,
      ],
      [
        '2832',
        'ConditionalExpression',
        'previewPlayerRef.current === player',
        'true',
        3215,
        17,
        3215,
        52,
      ],
    ],
  },
  {
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    mutants: [
      ['2847', 'ConditionalExpression', 'if (!player) return;', 'false', 3239, 9, 3239, 16],
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

if (recorderReviewedMutantIds.size !== 188) {
  throw new Error(
    `Recorder equivalence review has ${recorderReviewedMutantIds.size} mutants; expected 188`,
  );
}

// Exact survivors from the completed consent-safe ads campaign. Every
// behaviorally distinct mutant in this lane is killed; these entries retain
// only framework or invariant-level equivalences.
const adsEquivalentMutants = Object.freeze([
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'StringLiteral',
    original: "const unitId = adUnitIdFor('historyNative');",
    replacements: ['""'],
    reason:
      "adUnitIdFor is a closed binary selector: only 'homeBanner' selects the Home key, so every other value selects the same History key.",
    locations: exactLocations(41, 34, 41, 49),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    original: 'if (!native || !unitId) return;',
    replacements: ['false'],
    reason:
      'A true history activation has just required the same cached native module and validated unit ID; neither can disappear in production before these synchronous reads.',
    locations: exactLocations(42, 11, 42, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'LogicalOperator',
    original: 'if (!native || !unitId) return;',
    replacements: ['!native && !unitId'],
    reason:
      'Both operands are false after a successful provider activation, so OR and AND produce the same result.',
    locations: exactLocations(42, 11, 42, 29),
  },
  {
    file: 'src/components/HistoryNativeAdCard.tsx',
    mutator: 'ConditionalExpression',
    original: 'if (!native) return null;',
    replacements: ['false'],
    reason:
      'nativeAd is assigned only after reading a non-null cached native module; production has no cache-reset operation between that assignment and render.',
    locations: exactLocations(76, 7, 76, 14),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'ConditionalExpression',
    original: 'if (active) setValidatedForFocus(ready);',
    replacements: ['true'],
    reason:
      'While mounted the latch is true; after cleanup the continuation can only target a detached component instance, whose state update React 19 discards without a visible effect.',
    locations: exactLocations(24, 11, 24, 17),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'BlockStatement',
    original: 'return () => {\n      active = false;\n    };',
    replacements: ['{}'],
    reason:
      'Removing this cleanup only permits the same post-unmount update to a detached component; it cannot validate the newly mounted focus-cycle instance.',
    locations: exactLocations(26, 18, 28, 6),
  },
  {
    file: 'src/components/HomeBannerAd.tsx',
    mutator: 'BooleanLiteral',
    original: 'active = false;',
    replacements: ['true'],
    reason:
      'Leaving the detached instance latch true has the same unobservable post-unmount state-update behavior as removing its cleanup block.',
    locations: exactLocations(27, 16, 27, 21),
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
    reviewedMutantId: '77',
    mutator: 'BooleanLiteral',
    original: 'const queuedOlderRef = useRef(false);',
    replacements: ['true'],
    reason:
      'The mount effect overwrites this seed with false before a rendered list can expose any paging handler, including after the Strict Effects setup/cleanup/setup probe.',
    locations: exactLocations(117, 33, 117, 38),
  },
  {
    file: 'src/app/recordings.tsx',
    reviewedMutantId: '89',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'Both dependency literals contain values that stay Object.is-equal for the component lifetime, so the mount cleanup cadence is identical.',
    locations: exactLocations(132, 6, 132, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '288',
    mutator: 'StringLiteral',
    original: "const [phase, setPhase] = useState<PlaybackPhase>('idle');",
    replacements: ['""'],
    reason:
      "The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
    locations: exactLocations(134, 53, 134, 59),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '289',
    mutator: 'ConditionalExpression',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['true'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison true is unobservable.',
    locations: exactLocations(154, 41, 154, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '290',
    mutator: 'ConditionalExpression',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['false'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so forcing the comparison false is unobservable.',
    locations: exactLocations(154, 41, 154, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '291',
    mutator: 'EqualityOperator',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ["recordingStatus !== 'unavailable'"],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so reversing the comparison is unobservable.',
    locations: exactLocations(154, 41, 154, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '292',
    mutator: 'StringLiteral',
    original: "const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');",
    replacements: ['""'],
    reason:
      'The recording-status layout effect overwrites this render-time ref seed before any committed handler or asynchronous continuation can read it, so changing the compared literal is unobservable.',
    locations: exactLocations(154, 61, 154, 74),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '326',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'cancelDelete receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(181, 6, 181, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '330',
    mutator: 'OptionalChaining',
    original: 'playerListenerRef.current?.remove();',
    replacements: ['playerListenerRef.current.remove'],
    reason:
      'When the listener is null the direct dereference throws inside the surrounding best-effort catch; both forms then clear the ref and continue through identical player cleanup.',
    locations: exactLocations(189, 7, 189, 40),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '332',
    mutator: 'OptionalChaining',
    original: 'player?.pause();',
    replacements: ['player.pause'],
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; all following release state is identical.',
    locations: exactLocations(197, 7, 197, 20),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '334',
    mutator: 'OptionalChaining',
    original: 'player?.remove();',
    replacements: ['player.remove'],
    reason:
      'When player is null the direct dereference is swallowed by the same best-effort catch; owner release and ref cleanup are unchanged.',
    locations: exactLocations(202, 7, 202, 21),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '336',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'releasePlayer receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(208, 6, 208, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '339',
    mutator: 'ConditionalExpression',
    original: 'if (mountedRef.current !== true) return;',
    replacements: ['false'],
    reason:
      'The only added reset calls target an already detached component after layout cleanup; React discards those state setters, while every mounted call already passes the guard.',
    locations: exactLocations(211, 9, 211, 36),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '343',
    mutator: 'ArrayDeclaration',
    original: '}, []);',
    replacements: ['["Stryker was here"]'],
    reason:
      'resetPlaybackUi receives a constant dependency in either form, so its callback identity never changes.',
    locations: exactLocations(215, 6, 215, 8),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '345',
    mutator: 'ArrayDeclaration',
    original: '}, [releasePlayer, resetPlaybackUi]);',
    replacements: ['[]'],
    reason:
      'Both dependencies are empty-dependency callbacks with permanently stable identities, so omitting them cannot change stopPlayback.',
    locations: exactLocations(220, 6, 220, 38),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '350',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, releasePlayer]);',
    replacements: ['[]'],
    reason:
      'Both layout-cleanup dependencies are empty-dependency callbacks with permanently stable identities, so effect cadence is unchanged.',
    locations: exactLocations(229, 6, 229, 35),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '375',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, stopPlayback]),',
    replacements: ['[]'],
    reason:
      'Both focus-effect dependencies have permanently stable identities, so removing them does not alter focus setup or cleanup.',
    locations: exactLocations(267, 8, 267, 36),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '384',
    mutator: 'ArrayDeclaration',
    original: '}, [cancelDelete, stopPlayback]);',
    replacements: ['[]'],
    reason:
      'Both AppState-effect dependencies have permanently stable identities, so removing them does not alter subscription lifetime.',
    locations: exactLocations(278, 6, 278, 34),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '440',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current === identityToken &&',
    replacements: ['true'],
    reason:
      'After the entry identity fence creates an operation, every identity change synchronously replaces both its operation token and lifecycle symbol; either unchanged guard rejects the same continuations.',
    locations: exactLocations(334, 7, 334, 53),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '530',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current !== expectedIdentity ||',
    replacements: ['false'],
    reason:
      'The destructive callback carries the lifecycle captured with this identity token, and every identity commit replaces that lifecycle synchronously; the adjacent context guard rejects exactly the same stale callback.',
    locations: exactLocations(413, 9, 413, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '542',
    mutator: 'ConditionalExpression',
    original: 'committedIdentityRef.current === expectedIdentity && contextIsCurrent(lifecycle);',
    replacements: ['true'],
    reason:
      'The delete operation retains the lifecycle captured with expectedIdentity; an identity change replaces that lifecycle, so contextIsCurrent becomes false on every path where this equality becomes false.',
    locations: exactLocations(428, 9, 428, 58),
  },
  {
    file: 'src/components/RecordingPlayback.tsx',
    reviewedMutantId: '570',
    mutator: 'OptionalChaining',
    original: 'void Promise.resolve(onDeletedRef.current?.(recordingId)).catch(() => undefined);',
    replacements: ['onDeletedRef.current(recordingId)'],
    reason:
      'When the optional callback is absent, the direct call throws inside the surrounding try and is swallowed; when present both forms invoke it, so the committed deletion and visible state are identical.',
    locations: exactLocations(445, 32, 445, 67),
  },
]);

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
      mutator: 'ObjectLiteral',
      original: 'accessibilityState={{ disabled: interactionLocked }}',
      replacements: ['{}'],
      count: 3,
      reason:
        'Pressable rebuilds accessibilityState from its own non-null disabled prop, so omitting the explicit disabled key leaves the same accessible state at all three controls.',
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
      mutator: 'ObjectLiteral',
      original:
        'navigationRef.current.setOptions({ headerBackVisible: true, gestureEnabled: true });',
      replacements: ['{}'],
      reason:
        'setRetakeConfirming(false) drives screenBusy false and the screenBusy layout effect publishes the same unlocked options. This direct write is redundant.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original:
        'navigationRef.current.setOptions({ headerBackVisible: true, gestureEnabled: true });',
      replacements: ['false'],
      reason:
        'The headerBackVisible value is redundantly restored by the screenBusy layout effect.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'BooleanLiteral',
      original:
        'navigationRef.current.setOptions({ headerBackVisible: true, gestureEnabled: true });',
      replacements: ['false'],
      reason: 'The gestureEnabled value is redundantly restored by the screenBusy layout effect.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!renderCanHandle() || !current || current.id !== updated.id) return false;',
      replacements: ['false'],
      reason:
        'This node removes only the render/current prefix. commitUser independently rechecks identity, null current is unreachable for a live profile handler, and the separate updated-id clause remains.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'LogicalOperator',
      original: 'if (!renderCanHandle() || !current || current.id !== updated.id) return false;',
      replacements: ['!renderCanHandle() && !current'],
      reason:
        'Weakening the render/current pair is still covered by commitUser, while the independent updated-id mismatch clause remains intact.',
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
        'Without a page, completedFile is absent and the following write fails inside the same sanitized catch. With a page, this condition is already false.',
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
      original: 'if (!renderCanHandle()) return;',
      replacements: ['false'],
      reason:
        'toggleReminder immediately delegates to applyReminder, which repeats renderCanHandle before any device or state effect.',
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
      mutator: 'OptionalChaining',
      original: "signal?.removeEventListener('abort', listener);",
      replacements: ['signal.removeEventListener'],
      reason:
        'removeAbortListener wraps cleanup in a best-effort try/catch. With no signal the mutant’s dereference is swallowed; with a signal both variants remove the listener, so request settlement is identical.',
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
      mutator: 'ConditionalExpression',
      original: "typeof hours === 'number' &&",
      replacements: ['true'],
      reason:
        'Number.isFinite is already false for every non-number, so forcing the typeof check true cannot change the outcome.',
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
      file: 'src/app/(auth)/forgot-password.tsx',
      mutator: 'ObjectLiteral',
      original: 'accessibilityState={{ disabled: busy }}',
      replacements: ['{}'],
      reason:
        'This back link is rendered only in the post-request sent state, after busy has returned to false, so omitting disabled:false preserves the same accessibility state.',
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
      originals: ['accountActionRef.current = true;', 'logoutBusyRef.current = true;'],
      replacements: ['false'],
      count: 2,
      reason:
        'The account-action and logout-busy refs independently claim and deduplicate the same synchronous logout window; mutating either one leaves the other fence active.',
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
      original: "? `${renderOwner}:${question.id}:${nativeMode ? 'native' : 'english'}`",
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
      mutator: 'ConditionalExpression',
      original: 'resultClaimRef.current === owner',
      replacements: ['false'],
      reason:
        'A result claim and navigationStarted are set synchronously for the same owner and reset only when owner state changes, so the navigation latch independently rejects duplicates.',
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
      original: "? `${renderOwner}:${validQuestionId}:${nativeMode ? 'native' : 'english'}`",
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
      mutator: 'ConditionalExpression',
      original: 'resultClaimRef.current === owner',
      replacements: ['false'],
      reason:
        'The result claim is set and reset with the same owner as navigationStarted; that independent navigation latch rejects every duplicate result.',
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
      mutator: 'ArrowFunction',
      original:
        'const [card, setCard] = useState<FeedbackCard | null>(() =>\n    feedback ? { questionId: feedback.questionId, result: feedback.result } : null,',
      replacements: ['() => undefined'],
      reason:
        'With feedback, the render-phase identity correction immediately replaces undefined before commit; without feedback both paths render the no-result state.',
    },
    {
      file: 'src/app/practice/feedback.tsx',
      mutator: 'ObjectLiteral',
      original: 'feedback ? { questionId: feedback.questionId, result: feedback.result } : null,',
      replacements: ['{}'],
      reason:
        'An empty object mismatches the current feedback and is synchronously replaced by the render-phase card correction before the first commit.',
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
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original:
        'const selectedUiLanguage = UI_LANGUAGES.find((lang) => lang.code === user.uiLanguage);',
      replacements: ['true'],
      reason:
        'uiLanguage is validated against the non-empty closed UI_LANGUAGES catalog. This mutation still returns an element, and selectedUiLanguage is only truthiness-tested, so which element was found is unobservable.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'EqualityOperator',
      original:
        'const selectedUiLanguage = UI_LANGUAGES.find((lang) => lang.code === user.uiLanguage);',
      replacements: ['lang.code !== user.uiLanguage'],
      reason:
        'UI_LANGUAGES contains at least two entries and user.uiLanguage is a validated member. Reversing the predicate still finds an element, and selectedUiLanguage is only truthiness-tested, so its identity is unobservable.',
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: "{selectedUiLanguage && languageBusy && languageOperation === 'ui' && (",
      replacements: ['true'],
      reason:
        "A valid User always yields a truthy selectedUiLanguage, and languageOperation can equal 'ui' only while chooseUiLanguage has synchronously set languageBusy true. The leading conjunction is therefore already true whenever the remaining operand is true.",
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'LogicalOperator',
      original: "{selectedUiLanguage && languageBusy && languageOperation === 'ui' && (",
      replacements: ['selectedUiLanguage || languageBusy'],
      reason:
        "A valid User always yields a truthy selectedUiLanguage, and languageOperation can equal 'ui' only while chooseUiLanguage has synchronously set languageBusy true. AND and OR therefore have identical truthiness inside this complete render guard.",
    },
    {
      file: 'src/app/settings/index.tsx',
      mutator: 'ConditionalExpression',
      original: '{(privacyOptionsRequired || privacyBusy || privacyError) && (',
      replacements: ['true'],
      reason:
        'When all three privacy values are falsy, forcing the outer condition renders only a Fragment whose three independently guarded children all render nothing. Otherwise the original condition already renders it.',
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
