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
  exactLocations(332, 5, 332, 21),
  exactLocations(353, 5, 353, 32, 433, 5, 433, 32, 644, 5, 644, 32),
  exactLocations(377, 32, 377, 58),
  exactLocations(433, 5, 435, 25),
  exactLocations(433, 5, 435, 25),
  exactLocations(433, 5, 434, 34),
  exactLocations(433, 5, 434, 34),
  exactLocations(434, 5, 434, 34),
  exactLocations(489, 70, 489, 88, 522, 79, 522, 97),
  exactLocations(522, 7, 522, 25),
  exactLocations(775, 11, 777, 4),
  exactLocations(814, 7, 814, 25),
  exactLocations(871, 5, 871, 30),
  exactLocations(797, 39, 797, 67),
  exactLocations(805, 10, 807, 4),
  exactLocations(190, 7, 190, 25),
  exactLocations(28, 37, 28, 62, 45, 47, 45, 72),
  exactLocations(124, 6, 124, 8),
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
  exactLocations(58, 10, 58, 35),
  exactLocations(72, 11, 74, 4),
  exactLocations(75, 7, 75, 14),
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
  exactLocations(80, 39, 80, 41),
  exactLocations(116, 39, 116, 44),
  exactLocations(121, 31, 121, 36),
  exactLocations(135, 5, 135, 7),
  exactLocations(145, 6, 145, 43),
  exactLocations(163, 6, 163, 30),
  exactLocations(171, 6, 171, 43),
  exactLocations(179, 8, 179, 10),
  exactLocations(192, 25, 194, 4),
  exactLocations(194, 6, 194, 18),
  exactLocations(196, 9, 196, 53),
  exactLocations(201, 40, 201, 89),
  exactLocations(201, 61, 201, 65),
  exactLocations(201, 83, 201, 87),
  exactLocations(253, 9, 253, 39),
  exactLocations(253, 9, 253, 39),
  exactLocations(273, 11, 273, 17),
  exactLocations(277, 18, 279, 6),
  exactLocations(278, 16, 278, 21),
  exactLocations(280, 6, 280, 8),
  exactLocations(374, 13, 374, 30),
  exactLocations(375, 37, 375, 41),
  exactLocations(423, 50, 423, 67),
  exactLocations(436, 34, 436, 63),
  exactLocations(436, 65, 436, 77),
  exactLocations(440, 27, 440, 68),
  exactLocations(444, 64, 444, 93),
  exactLocations(463, 11, 463, 27),
  exactLocations(463, 45, 463, 76),
  exactLocations(465, 11, 465, 33),
  exactLocations(465, 51, 465, 84),
  exactLocations(480, 9, 480, 35),
  exactLocations(532, 9, 532, 27),
  exactLocations(537, 9, 537, 47),
  exactLocations(537, 9, 537, 47),
  exactLocations(542, 9, 542, 77),
  exactLocations(542, 9, 542, 77),
  exactLocations(542, 9, 542, 52),
  exactLocations(542, 9, 542, 52),
  exactLocations(542, 79, 544, 6),
  exactLocations(543, 14, 543, 19),
  exactLocations(589, 12, 589, 16),
  exactLocations(608, 11, 608, 32),
  exactLocations(623, 17, 623, 38),
  exactLocations(625, 17, 625, 30),
  exactLocations(687, 49, 687, 70),
  exactLocations(687, 74, 687, 76),
  exactLocations(701, 37, 701, 58),
  exactLocations(701, 62, 701, 64),
  exactLocations(171, 38, 171, 67, 204, 38, 204, 71),
  exactLocations(40, 82, 44, 4),
  exactLocations(48, 39, 48, 49, 48, 39, 48, 49),
  exactLocations(129, 10, 129, 35),
  exactLocations(335, 10, 335, 35),
  exactLocations(335, 10, 335, 61),
  exactLocations(344, 7, 344, 14),
  exactLocations(350, 5, 350, 32),
  exactLocations(382, 13, 382, 17),
  exactLocations(467, 11, 467, 29, 467, 11, 467, 29),
  exactLocations(467, 11, 467, 29),
  exactLocations(480, 7, 480, 32),
  exactLocations(480, 7, 481, 29),
  exactLocations(847, 7, 847, 35),
  exactLocations(1041, 22, 1041, 45),
  // Auth screens: mounted publication, navigation cleanup, and preview effects.
  exactLocations(47, 29, 47, 33),
  exactLocations(53, 29, 53, 33),
  exactLocations(56, 9, 56, 28),
  exactLocations(62, 9, 62, 28),
  exactLocations(106, 11, 106, 30),
  exactLocations(119, 11, 119, 30),
  exactLocations(114, 11, 114, 29),
  exactLocations(127, 11, 127, 29),
  exactLocations(96, 68, 96, 88),
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
  exactLocations(59, 8, 59, 10),
  exactLocations(141, 29, 141, 34),
  exactLocations(157, 6, 157, 8),
  exactLocations(239, 28, 239, 100),
  exactLocations(244, 8, 244, 31, 249, 9, 249, 32),
  exactLocations(266, 45, 266, 69, 275, 37, 275, 61),
  exactLocations(266, 62, 266, 67, 275, 54, 275, 59),
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
  exactLocations(70, 57, 71, 83),
  exactLocations(71, 16, 71, 76),
  exactLocations(73, 44, 73, 60, 73, 84, 73, 96),
  exactLocations(83, 29, 83, 33),
  exactLocations(91, 28, 91, 33, 92, 28, 92, 33),
  exactLocations(95, 6, 95, 8, 107, 8, 107, 10),
  exactLocations(149, 7, 150, 26),
  exactLocations(149, 7, 150, 26),
  exactLocations(185, 77, 185, 81),
]);

const recorderEquivalentMutantGroups = Object.freeze([
  {
    reason:
      'These guards only keep a null or undefined sentinel out of URI sets. Every consumer either compares against a real string URI or rechecks truthiness before deletion, so inserting the sentinel cannot alter ownership, cleanup, or rendered state.',
    mutants: [
      ['744', 'ConditionalExpression', 'if (!uri) return;', 'false', 769, 7, 769, 11],
      [
        '1053',
        'ConditionalExpression',
        'if (candidateUri) candidates.add(candidateUri);',
        'true',
        1272,
        9,
        1272,
        21,
      ],
      ['1114', 'ConditionalExpression', 'if (uri) ownedUris.add(uri);', 'true', 1356, 11, 1356, 14],
      [
        '2275',
        'ConditionalExpression',
        'if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);',
        'true',
        2579,
        11,
        2579,
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
        822,
        7,
        822,
        39,
      ],
    ],
  },
  {
    reason:
      'The mount layout effect writes the authoritative mounted and unmounting values before passive effects, native events, or promise continuations can consume these refs. Their render-time seeds are overwritten before any observable branch.',
    mutants: [
      ['804', 'BooleanLiteral', 'const mountedRef = useRef(true);', 'false', 867, 29, 867, 33],
      ['805', 'BooleanLiteral', 'const unmountingRef = useRef(false);', 'true', 868, 32, 868, 37],
    ],
  },
  {
    reason:
      'The later AppState mount effect writes mountedRef true before external app-state events or async continuations can publish. Writing false in this earlier mount assignment is therefore overwritten before it can be the sole lifecycle currency.',
    mutants: [
      ['1188', 'BooleanLiteral', 'mountedRef.current = true;', 'false', 1482, 26, 1482, 30],
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
        933,
        74,
        933,
        79,
      ],
      [
        '841',
        'BooleanLiteral',
        'const [previewPlaying, setPreviewPlaying] = useState(false);',
        'true',
        937,
        56,
        937,
        61,
      ],
      [
        '1989',
        'StringLiteral',
        "const announcedPhaseRef = useRef<Phase>('idle');",
        '""',
        2305,
        43,
        2305,
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
        952,
        42,
        952,
        47,
      ],
      [
        '845',
        'BooleanLiteral',
        'const recordingInterruptionHandledRef = useRef(false);',
        'true',
        953,
        50,
        953,
        55,
      ],
      [
        '847',
        'BooleanLiteral',
        'const cancelRequestedRef = useRef(false);',
        'true',
        957,
        37,
        957,
        42,
      ],
      [
        '848',
        'BooleanLiteral',
        'const assessmentPostedRef = useRef(false);',
        'true',
        958,
        38,
        958,
        43,
      ],
      [
        '850',
        'BooleanLiteral',
        'const previewPlayRequestedRef = useRef(false);',
        'true',
        984,
        42,
        984,
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
        'const callbacksRef = useRef({\n    disabled,\n    isStartBlocked,\n    onError,\n    onInteractionLockChange,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    parseResult,\n  });',
        '{}',
        992,
        31,
        1002,
        4,
      ],
      [
        '889',
        'ObjectLiteral',
        'const identityRef = useRef({ ownerId, endpoint, questionId });',
        '{}',
        1042,
        30,
        1042,
        63,
      ],
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
        874,
        72,
        874,
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
        887,
        34,
        887,
        73,
      ],
      [
        '1041',
        'OptionalChaining',
        'previewListenerRef.current?.remove();',
        'previewListenerRef.current.remove',
        1250,
        7,
        1250,
        41,
      ],
      ['1043', 'OptionalChaining', 'player?.remove();', 'player.remove', 1258, 7, 1258, 21],
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
        912,
        48,
        912,
        59,
      ],
      [
        '1071',
        'AssignmentOperator',
        'recoveryGenerationRef.current += 1;',
        'recoveryGenerationRef.current -= 1',
        1299,
        5,
        1299,
        39,
      ],
      [
        '1345',
        'UpdateOperator',
        'const generation = ++recoveryGenerationRef.current;',
        '--recoveryGenerationRef.current',
        1654,
        24,
        1654,
        55,
      ],
    ],
  },
  {
    reason:
      'Stryker substitutes one constant dependency array for another. React compares the same constant element on every render, so callback or effect identity and execution cadence are unchanged.',
    mutants: [
      ['831', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 915, 6, 915, 8],
      ['863', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1012, 6, 1012, 8],
      ['888', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1041, 6, 1041, 8],
      ['899', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1082, 6, 1082, 8],
      ['913', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1096, 6, 1096, 8],
      ['968', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1177, 6, 1177, 8],
      ['973', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1181, 5, 1181, 7],
      [
        '979',
        'ArrayDeclaration',
        'const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);',
        '["Stryker was here"]',
        1184,
        89,
        1184,
        91,
      ],
      [
        '981',
        'ArrayDeclaration',
        'const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);',
        '["Stryker was here"]',
        1186,
        81,
        1186,
        83,
      ],
      ['994', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1197, 6, 1197, 8],
      ['1017', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1218, 6, 1218, 8],
      ['1031', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1229, 6, 1229, 8],
      ['1047', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1263, 6, 1263, 8],
      ['1050', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1268, 6, 1268, 8],
      ['1054', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1276, 6, 1276, 8],
      ['1060', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1286, 6, 1286, 8],
      ['1069', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1296, 6, 1296, 8],
      ['1079', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 1308, 6, 1308, 8],
      ['1109', 'ArrayDeclaration', '[],', '["Stryker was here"]', 1347, 5, 1347, 7],
      ['1850', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2179, 6, 2179, 8],
      ['1936', 'ArrayDeclaration', '}, []);', '["Stryker was here"]', 2260, 6, 2260, 8],
    ],
  },
  {
    reason:
      'Every removed dependency is itself a useCallback with stable identity. Replacing the dependency list with an empty array therefore cannot alter callback or effect recreation, cleanup timing, or captured values.',
    mutants: [
      ['926', 'ArrayDeclaration', '[publishOperation],', '[]', 1115, 5, 1115, 23],
      ['937', 'ArrayDeclaration', '[publishOperation],', '[]', 1133, 5, 1133, 23],
      ['1037', 'ArrayDeclaration', '[updatePhase],', '[]', 1243, 5, 1243, 18],
      [
        '1945',
        'ArrayDeclaration',
        'useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);',
        '[]',
        2268,
        49,
        2268,
        71,
      ],
      [
        '2087',
        'ArrayDeclaration',
        '[\n      adoptOwnedRecording,\n      clearWebAutoStopTimer,\n      discardRecording,\n      restoreOwnedAudioMode,\n      updatePhase,\n    ],',
        '[]',
        2376,
        5,
        2382,
        6,
      ],
    ],
  },
  {
    reason:
      'audioSessionCanBeAcquired plus the awaited global release promise ensures recording start reaches acquisition only with a null owner; Recorder phase and operation currency exclude re-acquiring a session already owned by this instance. The null test is always true.',
    mutants: [
      [
        '859',
        'ConditionalExpression',
        'if (activeAudioSessionOwner === null) {',
        'true',
        1006,
        9,
        1006,
        41,
      ],
    ],
  },
  {
    reason:
      'restoreOwnedAudioMode returns before constructing work unless this instance owns the session. Acquisition remains serialized behind its release promise and only one restore promise exists, so the owner, resolver, and promise-identity guards are guaranteed.',
    mutants: [
      [
        '881',
        'ConditionalExpression',
        'if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {',
        'true',
        1028,
        13,
        1028,
        71,
      ],
      ['883', 'OptionalChaining', 'resolveRelease?.();', 'resolveRelease()', 1033, 11, 1033, 29],
      [
        '886',
        'ConditionalExpression',
        'if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;',
        'true',
        1037,
        11,
        1037,
        53,
      ],
    ],
  },
  {
    reason:
      'operationOwnerRef is non-null only while the in-flight set is non-empty. Ordinary begin is already rejected by the count and superseding begin ignores both checks, so the owner boolean cannot independently decide admission.',
    mutants: [
      [
        '920',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1103,
        11,
        1103,
        45,
      ],
    ],
  },
  {
    reason:
      'resumeOperation is called only after the permission-dialog lifecycle stop has cleared ownership while retaining that one operation token. The call site first proves the token is not current, so the in-flight, count-one, and no-owner preconditions hold and the rejection block is unreachable.',
    mutants: [
      [
        '929',
        'ConditionalExpression',
        '!canResumeRecorderOperation(\n          operationOwnerRef.current !== null,\n          operationsInFlightRef.current.has(token),\n          operationsInFlightRef.current.size,\n        )',
        'false',
        1121,
        9,
        1125,
        10,
      ],
      [
        '931',
        'ConditionalExpression',
        'operationOwnerRef.current !== null,',
        'false',
        1122,
        11,
        1122,
        45,
      ],
      ['934', 'BlockStatement', ') {\n        return false;\n      }', '{}', 1126, 9, 1128, 8],
      ['935', 'BooleanLiteral', 'return false;', 'true', 1127, 16, 1127, 21],
    ],
  },
  {
    reason:
      'A stale token can finish only beneath a newer superseding lifecycle token. Clearing ownership early still leaves another in-flight token, so count-based admission remains blocked, the lock remains active, and lifecycle cleanup has no later owner-current read. The defensive identity guard is unobservable.',
    mutants: [
      [
        '940',
        'ConditionalExpression',
        'if (operationOwnerRef.current === token) operationOwnerRef.current = null;',
        'true',
        1138,
        9,
        1138,
        44,
      ],
    ],
  },
  {
    reason:
      'These predicates and latches only suppress React state updates after detach. React 19 discards updates to an unmounted fiber, and while context is current the predicate is already true, so rendered state and callbacks are identical.',
    mutants: [
      [
        '947',
        'ConditionalExpression',
        'if (mountedRef.current) setOperationActive(stillActive);',
        'true',
        1140,
        9,
        1140,
        27,
      ],
      ['1029', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 1225, 9, 1225, 27],
      [
        '1035',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1240,
        11,
        1240,
        29,
      ],
      [
        '1045',
        'ConditionalExpression',
        'if (mountedRef.current) setPreviewPlaying(false);',
        'true',
        1262,
        9,
        1262,
        27,
      ],
      [
        '1287',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(true);',
        'true',
        1580,
        13,
        1580,
        31,
      ],
      [
        '1343',
        'ConditionalExpression',
        'if (mountedRef.current) setRecoveryRetryNeeded(false);',
        'true',
        1653,
        9,
        1653,
        27,
      ],
      [
        '1932',
        'ConditionalExpression',
        'if (active) setReduceMotion(enabled);',
        'true',
        2252,
        13,
        2252,
        19,
      ],
      ['1935', 'BooleanLiteral', 'active = false;', 'true', 2257, 16, 2257, 21],
      [
        '2167',
        'ConditionalExpression',
        'if (mountedRef.current) setPermissionDenied(false);',
        'true',
        2487,
        9,
        2487,
        27,
      ],
    ],
  },
  {
    reason:
      'waitStartedAtRef is stamped exactly when entering uploading or recovering and cleared outside them. The interval exists only in those wait phases, so the nullable guard and phase ternary cannot select a different observable value.',
    mutants: [
      [
        '1022',
        'ConditionalExpression',
        "next === 'uploading' || next === 'recovering' ? monotonicNow() : null;",
        'true',
        1224,
        7,
        1224,
        52,
      ],
      [
        '1958',
        'ConditionalExpression',
        'if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);',
        'true',
        2277,
        11,
        2277,
        29,
      ],
    ],
  },
  {
    reason:
      'Callers consume these catch results only in boolean positions. Removing return false yields undefined, which is equally falsy; the cancellation catch likewise takes the same branch for false and undefined.',
    mutants: [
      ['1067', 'BlockStatement', '} catch {\n      return false;\n    }', '{}', 1293, 13, 1295, 6],
      [
        '1483',
        'BlockStatement',
        '} catch {\n          return false;\n        }',
        '{}',
        1799,
        17,
        1801,
        10,
      ],
      [
        '2762',
        'ArrowFunction',
        'const promise = markPendingAssessmentCancelled(requestId).catch(() => false);',
        '() => undefined',
        3134,
        71,
        3134,
        82,
      ],
    ],
  },
  {
    reason:
      'Each ref is assigned the sole in-flight promise and later calls return that same promise until its finally handler settles. No second promise can replace it, so the identity cleanup check is always true.',
    mutants: [
      [
        '1085',
        'ConditionalExpression',
        'if (nativeStopPromiseRef.current === promise) {',
        'true',
        1313,
        11,
        1313,
        51,
      ],
      [
        '1183',
        'ConditionalExpression',
        'if (lifecycleStopPromiseRef.current === promise) {',
        'true',
        1461,
        11,
        1461,
        54,
      ],
    ],
  },
  {
    reason:
      'One waiter is registered for one take generation and deletes itself on its first timeout or completion. Later calls can only target an already-settled Promise, where repeated clear, delete, and resolve operations are idempotent; another generation cannot own this waiter.',
    mutants: [
      [
        '1097',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1331,
        15,
        1331,
        86,
      ],
      [
        '1099',
        'LogicalOperator',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'settled && completion && completion.takeGeneration !== takeGeneration',
        1331,
        15,
        1331,
        86,
      ],
      [
        '1100',
        'ConditionalExpression',
        'if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;',
        'false',
        1331,
        27,
        1331,
        85,
      ],
      ['1104', 'BooleanLiteral', 'settled = true;', 'false', 1332, 21, 1332, 25],
    ],
  },
  {
    reason:
      'Prepared-recorder disposal runs under an operation while no recording is adoptable. A terminal callback published without suppression can only bump the status version; the consuming effect rejects it through its phase and operation guards.',
    mutants: [
      [
        '1111',
        'BooleanLiteral',
        'suppressRecordingStatusRef.current = true;',
        'false',
        1351,
        42,
        1351,
        46,
      ],
    ],
  },
  {
    reason:
      'beginOperation(true) cannot return null, and the recovery path calls ordinary begin only after synchronously proving that no operation is in flight. Both null-token returns are unreachable defensive branches.',
    mutants: [
      [
        '1140',
        'ConditionalExpression',
        'if (!operationToken) return Promise.resolve();',
        'false',
        1399,
        9,
        1399,
        24,
      ],
      ['1234', 'ConditionalExpression', 'if (!operationToken) return;', 'false', 1523, 9, 1523, 24],
    ],
  },
  {
    reason:
      'recoverPending calls beginOperation only after operationIsInFlight synchronously proved the owner set empty. With no current owner or token, superseding and ordinary begin have identical admission and ownership effects, so the first false argument is redundant.',
    mutants: [
      [
        '1231',
        'BooleanLiteral',
        'const operationToken = beginOperation(false, false);',
        'true',
        1522,
        43,
        1522,
        48,
      ],
    ],
  },
  {
    reason:
      'hasObservedRecordingRef is read only while recording. Every transition into recording resets it before publication, and these sites immediately leave or are outside that phase, so their additional false assignment cannot affect a later take.',
    mutants: [
      [
        '1179',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        1455,
        41,
        1455,
        46,
      ],
      [
        '2068',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2360,
        41,
        2360,
        46,
      ],
      [
        '2320',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2631,
        41,
        2631,
        46,
      ],
      [
        '2376',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2687,
        41,
        2687,
        46,
      ],
      [
        '2422',
        'BooleanLiteral',
        'hasObservedRecordingRef.current = false;',
        'true',
        2718,
        41,
        2718,
        46,
      ],
    ],
  },
  {
    reason:
      'Unmount cleanup sets unmounting true and mounted false together. Operation publication checks both, focus cleanup removes active context, and remaining mounted-only reads guard React state updates discarded after detach; either individual assignment is redundant.',
    mutants: [
      ['1191', 'BooleanLiteral', 'unmountingRef.current = true;', 'false', 1485, 31, 1485, 35],
      ['1192', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 1486, 28, 1486, 33],
    ],
  },
  {
    reason:
      'On unmount, the earlier layout-effect cleanup has already set unmounting true and mounted false before this passive cleanup runs. On a passive-effect dependency refresh, React runs cleanup and the replacement setup together before async continuations, and setup immediately restores mounted true. This duplicate false assignment is never the sole lifecycle guard.',
    mutants: [
      ['1910', 'BooleanLiteral', 'mountedRef.current = false;', 'true', 2225, 28, 2225, 33],
    ],
  },
  {
    reason:
      'Replacing the native recorder triggers layout cleanup and a superseding lifecycle operation before stale work can continue. Current operation and identity currency therefore already imply that currentRecorder is the captured recorder.',
    mutants: [
      [
        '1199',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder;',
        'true',
        1495,
        7,
        1495,
        46,
      ],
      [
        '2354',
        'ConditionalExpression',
        'currentRecorderRef.current === recorder &&',
        'true',
        2659,
        7,
        2659,
        46,
      ],
    ],
  },
  {
    reason:
      'This branch runs only while another instance owns recovery. Setting the retry flag outside recovering is hidden, and an active recovering instance is mounted by the context gate; weakening the phase and mounted conjunction cannot alter visible UI.',
    mutants: [
      [
        '1209',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1497,
        11,
        1497,
        44,
      ],
      [
        '1212',
        'ConditionalExpression',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        'true',
        1497,
        11,
        1497,
        66,
      ],
      [
        '1213',
        'LogicalOperator',
        "if (phaseRef.current === 'recovering' && mountedRef.current) {",
        "phaseRef.current === 'recovering' || mountedRef.current",
        1497,
        11,
        1497,
        66,
      ],
    ],
  },
  {
    reason:
      'A live upload owns an in-flight operation and the uploading phase, which independently make recovery ineligible or its token stale. A current recovery load cannot concurrently own an upload controller, so these controller predicates are redundant.',
    mutants: [
      [
        '1223',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1506,
        9,
        1506,
        45,
      ],
      [
        '1263',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1551,
        9,
        1551,
        45,
      ],
      [
        '1271',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1567,
        11,
        1567,
        47,
      ],
      [
        '1337',
        'ConditionalExpression',
        'uploadControllerRef.current !== null,',
        'false',
        1634,
        11,
        1634,
        47,
      ],
    ],
  },
  {
    reason:
      'No second recovery attempt can start while this loading operation token remains in flight. The attempt ref is therefore this exact symbol or already null from invalidation, and assigning null unconditionally cannot clear a newer attempt.',
    mutants: [
      [
        '1239',
        'ConditionalExpression',
        'if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;',
        'true',
        1528,
        11,
        1528,
        57,
      ],
    ],
  },
  {
    reason:
      'Before this continuation acquires the global recovery lease, this instance cannot already own it: self-ownership implies recovering and operation state rejected by the entry guards. Any non-null owner is necessarily another instance.',
    mutants: [
      [
        '1255',
        'ConditionalExpression',
        'const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1546,
        66,
        1546,
        100,
      ],
      [
        '1331',
        'ConditionalExpression',
        'activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;',
        'true',
        1629,
        41,
        1629,
        75,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad returned true immediately above only when pending is non-null. No assignment intervenes, so the null condition and its type-narrowing fallback block are unreachable.',
    mutants: [
      ['1289', 'ConditionalExpression', 'if (pending === null) {', 'false', 1587, 9, 1587, 25],
      [
        '1292',
        'BlockStatement',
        'if (pending === null) {\n      finishLoading();\n      return;\n    }',
        '{}',
        1587,
        27,
        1590,
        6,
      ],
    ],
  },
  {
    reason:
      'Recovery invalidation changes generation, ownership, recovering state, operation currency, and abort state together. If generation or lease ownership differs, another remaining predicate already makes isCurrent false.',
    mutants: [
      [
        '1348',
        'ConditionalExpression',
        'recoveryGenerationRef.current === generation,',
        'true',
        1657,
        9,
        1657,
        53,
      ],
      [
        '1351',
        'ConditionalExpression',
        'activeRecoveryOwner === instanceId,',
        'true',
        1659,
        9,
        1659,
        43,
      ],
    ],
  },
  {
    reason:
      'canContinueRecoveryLoad already proved operation and lifecycle currency, and the reconcile-stage callback is reached without an intervening await. Callback re-entry is followed immediately by the separate post-callback isCurrent guard before effects.',
    mutants: [
      ['1374', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1680, 13, 1680, 25],
    ],
  },
  {
    reason:
      'The validated prepared-stage path reaches this check without an await or re-entry. releaseUnclaimedHandoff then performs the sole await and immediately rechecks isCurrent before publishing, so the outer guard is redundant.',
    mutants: [
      ['1407', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 1705, 13, 1705, 25],
    ],
  },
  {
    reason:
      'These mutations make the re-upload helper return true instead of false after stale currency is detected. Its sole caller immediately rechecks isCurrent before changing counters or continuing, so the truthy stale result cannot publish.',
    mutants: [
      ['1461', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1779, 36, 1779, 41],
      ['1480', 'BooleanLiteral', 'if (!isCurrent()) return false;', 'true', 1788, 36, 1788, 41],
    ],
  },
  {
    reason:
      'This call occurs only inside the not-routeMatches branch. finishUnresolved independently tests not-routeMatches when choosing whether a recording can be retained, so changing allowRecordedRetry cannot change the selected branch.',
    mutants: [
      [
        '1689',
        'BooleanLiteral',
        "await finishUnresolved(translate('recorder.errInterruptedSaved'), false);",
        'true',
        1983,
        85,
        1983,
        90,
      ],
    ],
  },
  {
    reason:
      'Each weakened guard can only fall into finishUnresolved or an adjacent error route whose first possible effect is another isCurrent check. The stale continuation therefore returns before publishing state, callbacks, or durable changes.',
    mutants: [
      ['1714', 'ConditionalExpression', 'if (isCurrent()) {', 'true', 2012, 23, 2012, 34],
      ['1778', 'ConditionalExpression', 'if (!isCurrent()) return;', 'false', 2069, 25, 2069, 37],
    ],
  },
  {
    reason:
      'These branches handle ApiError classes for which userMessageForError resolves a code or status-specific localized message. The supplied generic fallback is never selected, so replacing its text has no effect.',
    mutants: [
      [
        '1786',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errRejected')),",
        '""',
        2079,
        63,
        2079,
        85,
      ],
      [
        '1791',
        'StringLiteral',
        "userMessageForError(retryError, translate('recorder.errNotSent')),",
        '""',
        2087,
        63,
        2087,
        84,
      ],
    ],
  },
  {
    reason:
      'Deferred permission data is cleared synchronously on identity change and consumed only after focus and mount resume. A retained response therefore matches the current identity, while focus already implies a mounted consumer.',
    mutants: [
      [
        '1869',
        'ConditionalExpression',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'true',
        2200,
        17,
        2200,
        54,
      ],
      [
        '1870',
        'LogicalOperator',
        'if (identityMatches && mountedRef.current && focusedRef.current) {',
        'identityMatches || mountedRef.current',
        2200,
        17,
        2200,
        54,
      ],
    ],
  },
  {
    reason:
      'Entering recorded always follows paths that already released preview, while every other phase releases it. Calling release on the recorded transition is therefore a no-op, and removing or changing the recorded exception has no observable effect.',
    mutants: [
      [
        '1939',
        'ConditionalExpression',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        'true',
        2265,
        9,
        2265,
        29,
      ],
      [
        '1941',
        'StringLiteral',
        "if (phase !== 'recorded') releasePreviewPlayer();",
        '""',
        2265,
        19,
        2265,
        29,
      ],
    ],
  },
  {
    reason:
      'The effect depends only on phase, so React never reruns it with an unchanged phase. The ref is assigned on every run, making the equality early return unreachable.',
    mutants: [
      [
        '1991',
        'ConditionalExpression',
        'if (announcedPhaseRef.current === phase) return;',
        'false',
        2307,
        9,
        2307,
        44,
      ],
    ],
  },
  {
    reason:
      'pulseSteps is a local fixed two-element literal with finite values, positive 550 ms durations, and true native-driver flags; map consequently creates two animations. Its validation and empty-array fallbacks are unreachable current-source redundancy.',
    mutants: [
      ['2037', 'ConditionalExpression', 'pulseSteps.length !== 2 ||', 'false', 2333, 7, 2333, 30],
      [
        '2039',
        'ConditionalExpression',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'false',
        2333,
        7,
        2340,
        8,
      ],
      [
        '2041',
        'LogicalOperator',
        'pulseSteps.length !== 2 ||\n      pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.length !== 2 && pulseSteps.some(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2333,
        7,
        2340,
        8,
      ],
      [
        '2042',
        'MethodExpression',
        'pulseSteps.some(\n        (step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,\n      )',
        'pulseSteps.every(step => !Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0 || step.useNativeDriver !== true)',
        2334,
        7,
        2340,
        8,
      ],
      [
        '2043',
        'ArrowFunction',
        '(step) =>\n          !Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '() => undefined',
        2335,
        9,
        2339,
        40,
      ],
      [
        '2045',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        'false',
        2336,
        11,
        2337,
        42,
      ],
      [
        '2046',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||',
        '!Number.isFinite(step.toValue) && !Number.isFinite(step.duration)',
        2336,
        11,
        2337,
        42,
      ],
      [
        '2047',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        'false',
        2336,
        11,
        2338,
        29,
      ],
      [
        '2048',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration)) && step.duration <= 0',
        2336,
        11,
        2338,
        29,
      ],
      [
        '2049',
        'ConditionalExpression',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        'false',
        2336,
        11,
        2339,
        40,
      ],
      [
        '2051',
        'LogicalOperator',
        '!Number.isFinite(step.toValue) ||\n          !Number.isFinite(step.duration) ||\n          step.duration <= 0 ||\n          step.useNativeDriver !== true,',
        '(!Number.isFinite(step.toValue) || !Number.isFinite(step.duration) || step.duration <= 0) && step.useNativeDriver !== true',
        2336,
        11,
        2339,
        40,
      ],
      ['2053', 'ConditionalExpression', 'step.duration <= 0 ||', 'false', 2338, 11, 2338, 29],
      [
        '2054',
        'EqualityOperator',
        'step.duration <= 0 ||',
        'step.duration < 0',
        2338,
        11,
        2338,
        29,
      ],
      [
        '2056',
        'ConditionalExpression',
        'step.useNativeDriver !== true,',
        'false',
        2339,
        11,
        2339,
        40,
      ],
      [
        '2059',
        'BlockStatement',
        ') {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2341,
        7,
        2344,
        6,
      ],
      [
        '2061',
        'ConditionalExpression',
        'if (animations.length === 0) {',
        'false',
        2346,
        9,
        2346,
        32,
      ],
      [
        '2064',
        'BlockStatement',
        'if (animations.length === 0) {\n      pulse.setValue(1);\n      return;\n    }',
        '{}',
        2346,
        34,
        2349,
        6,
      ],
    ],
  },
  {
    reason:
      'These duration reads occur only after a successful recording start set the timestamp before publishing the recording phase. Lifecycle cleanup first makes the operation stale, so the nullable fallback cannot be selected by current work.',
    mutants: [
      [
        '2117',
        'ConditionalExpression',
        'recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2422,
        11,
        2422,
        38,
      ],
      [
        '2357',
        'ConditionalExpression',
        'const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;',
        'true',
        2662,
        29,
        2662,
        56,
      ],
    ],
  },
  {
    reason:
      'Every lifecycle epoch change first installs a superseding operation token. Current operation-token currency therefore already proves the captured epoch equals the live epoch, making this equality operand redundant.',
    mutants: [
      [
        '2154',
        'ConditionalExpression',
        'lifecycleEpoch === lifecycleEpochRef.current,',
        'true',
        2470,
        9,
        2470,
        53,
      ],
    ],
  },
  {
    reason:
      'When no prompt was required, response is the current permission and app context is already active; the extra foreground wait resolves immediately and adopting the same epoch is a no-op. When prompted, the original branch already runs.',
    mutants: [['2198', 'ConditionalExpression', 'if (prompted) {', 'true', 2505, 11, 2505, 19]],
  },
  {
    reason:
      'After a permission prompt, identity, mount, focus, app activity, operation ownership, and the adopted lifecycle epoch are checked in correlated stages. Invalid context either returns or defers before native work, and the final isCurrentLifecycle guard repeats the full proof; weakening these earlier prompt guards cannot publish.',
    mutants: [
      [
        '2201',
        'ConditionalExpression',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        'false',
        2508,
        13,
        2508,
        56,
      ],
      [
        '2202',
        'LogicalOperator',
        'if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {',
        '!identityIsCurrent() && !mountedRef.current',
        2508,
        13,
        2508,
        56,
      ],
      [
        '2220',
        'ConditionalExpression',
        'if (!isCurrentLifecycle()) return;',
        'false',
        2523,
        11,
        2523,
        32,
      ],
    ],
  },
  {
    reason:
      'isCurrentLifecycle was checked immediately before this denied-permission branch and includes recorderContextIsActive, which proves mountedRef.current. The nested mounted condition is always true.',
    mutants: [
      ['2227', 'ConditionalExpression', 'if (mountedRef.current) {', 'true', 2525, 13, 2525, 31],
    ],
  },
  {
    reason:
      'These branches are reached only after a lifecycle supersession made start stale. That lifecycle stop has already created the notifying audio-restore promise; restoreOwnedAudioMode returns the same in-flight promise before reading this notify argument, so false and true are identical.',
    mutants: [
      ['2272', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2568, 37, 2568, 42],
      ['2280', 'BooleanLiteral', 'await restoreOwnedAudioMode(false);', 'true', 2583, 37, 2583, 42],
    ],
  },
  {
    reason:
      'When a live URI exists it is added unconditionally again at the end of the following normalization block, and Set insertion is idempotent. When it is null, adding or skipping the sentinel has no string-URI cleanup effect.',
    mutants: [
      [
        '2293',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'false',
        2602,
        11,
        2602,
        27,
      ],
      [
        '2294',
        'ConditionalExpression',
        'if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);',
        'true',
        2602,
        11,
        2602,
        27,
      ],
    ],
  },
  {
    reason:
      'After record succeeds, the remaining statements are non-throwing ref and Set updates plus guarded phase publication; the catch cannot observe prepared again. Its reset value is dead.',
    mutants: [['2304', 'BooleanLiteral', 'prepared = false;', 'true', 2616, 18, 2616, 23]],
  },
  {
    reason:
      'Start cleanup preserves the prior active URI whenever it is non-null, so activeUriRef equals previousUri in every recorded fallback case. If both are null, forcing only the equality true still leaves the trailing previousUri falsy and selects idle. The phase result is unchanged.',
    mutants: [
      [
        '2325',
        'ConditionalExpression',
        "updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');",
        'true',
        2635,
        21,
        2635,
        57,
      ],
    ],
  },
  {
    reason:
      'The stop reason is used only to distinguish the literal auto value. Every other value follows the user-stop path, so an empty string and the user default are behaviorally identical.',
    mutants: [
      [
        '2337',
        'StringLiteral',
        "const stopRecording = async (reason: 'user' | 'auto' = 'user') => {",
        '""',
        2647,
        58,
        2647,
        64,
      ],
    ],
  },
  {
    reason:
      'Identity changes synchronously start a superseding lifecycle operation before stale work can continue. A current operation token therefore already implies assessment identity still matches, so weakening this conjunction admits no distinct state.',
    mutants: [
      [
        '2348',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2657,
        7,
        2658,
        84,
      ],
      [
        '2466',
        'LogicalOperator',
        'operationIsCurrent(operationToken) &&\n      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&',
        'operationIsCurrent(operationToken) || assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId)',
        2778,
        7,
        2779,
        84,
      ],
    ],
  },
  {
    reason:
      'completedTakeIsValid receives the URI separately and rejects null before considering fileIsUsable. Forcing the preceding URI non-null operand true cannot make a null completion valid.',
    mutants: [
      [
        '2377',
        'ConditionalExpression',
        'const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);',
        'true',
        2688,
        28,
        2688,
        40,
      ],
    ],
  },
  {
    reason:
      'Recorded phase is established only after adopting a non-null active URI, and every URI-clearing path leaves recorded. These documented fail-closed branches are unreachable, so deleting or changing their body cannot affect a valid state.',
    mutants: [
      ['2456', 'ConditionalExpression', 'if (!uri) {', 'false', 2762, 9, 2762, 13],
      [
        '2458',
        'BlockStatement',
        "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      endOperation(operationToken);\n      return;\n    }",
        '{}',
        2762,
        15,
        2767,
        6,
      ],
      ['2459', 'StringLiteral', "updatePhase('idle');", '""', 2763, 19, 2763, 25],
      [
        '2460',
        'StringLiteral',
        "callbacksRef.current.onError(translate('recorder.errNoRecording'));",
        '""',
        2764,
        46,
        2764,
        71,
      ],
      ['2805', 'ConditionalExpression', 'if (!uri) return;', 'false', 3190, 11, 3190, 15],
    ],
  },
  {
    reason:
      'These errors are handled solely through controller.signal.aborted and cancellation currency; no catch reads the message, name, or thrown object. Falsy-reason operator differences and string changes are unobservable.',
    mutants: [
      [
        '2478',
        'LogicalOperator',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        "controller.signal.reason && new DOMException('The operation was aborted.', 'AbortError')",
        2787,
        11,
        2787,
        99,
      ],
      [
        '2479',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2787,
        56,
        2787,
        84,
      ],
      [
        '2480',
        'StringLiteral',
        "controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')",
        '""',
        2787,
        86,
        2787,
        98,
      ],
      [
        '2588',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2939,
        32,
        2939,
        60,
      ],
      [
        '2589',
        'StringLiteral',
        "throw new DOMException('The operation was aborted.', 'AbortError');",
        '""',
        2939,
        62,
        2939,
        74,
      ],
    ],
  },
  {
    reason:
      'The fixed retry loop reaches its terminal throw only after assigning the caught capacity error on every consumed attempt. lastCapacityError is therefore truthy and both fallback operators throw that same object.',
    mutants: [
      [
        '2542',
        'LogicalOperator',
        'throw lastCapacityError ?? new Error();',
        'lastCapacityError && new Error()',
        2897,
        15,
        2897,
        47,
      ],
    ],
  },
  {
    reason:
      'A cancel can reach these post-request branches only through cancelUpload after assessmentPosted and requestId are set, which creates cancelPersistence. The null and fallback arms are unreachable.',
    mutants: [
      [
        '2587',
        'ConditionalExpression',
        'if (cancelPersistence) await cancelPersistence.promise;',
        'true',
        2938,
        13,
        2938,
        30,
      ],
      [
        '2637',
        'BooleanLiteral',
        'const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;',
        'true',
        2990,
        86,
        2990,
        91,
      ],
    ],
  },
  {
    reason:
      'Before any later submission reads the marker, submit synchronously resets cancelRequestedRef to false; lifecycle and recovery currency own the current exit. Leaving these cleanup assignments true cannot leak into an observable next operation.',
    mutants: [
      ['2638', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 2991, 40, 2991, 45],
      ['2650', 'BooleanLiteral', 'cancelRequestedRef.current = false;', 'true', 3005, 38, 3005, 43],
    ],
  },
  {
    reason:
      'Submit assigns requestIdRef before its first network await, and every site that clears it returns immediately. These continuing cancellation or recovery branches therefore always have a requestId, so their fallback and guard are unreachable.',
    mutants: [
      [
        '2649',
        'BooleanLiteral',
        'const cleared = requestId ? await clearRequestTracking(requestId) : true;',
        'false',
        3004,
        77,
        3004,
        81,
      ],
      ['2701', 'ConditionalExpression', 'if (requestId) {', 'true', 3058, 15, 3058, 24],
    ],
  },
  {
    reason:
      'Only one submission operation can exist. Its controller remains the unique ref value until this finally, or lifecycle cleanup has already set the ref to null; assigning null under either identity outcome produces the same state.',
    mutants: [
      [
        '2716',
        'ConditionalExpression',
        'if (uploadControllerRef.current === controller) {',
        'true',
        3074,
        11,
        3074,
        53,
      ],
    ],
  },
  {
    reason:
      'startRecording begins by evaluating the same startIsBlocked condition before acquiring an operation or touching native state. The press handler check is a duplicate and cannot change effects.',
    mutants: [
      [
        '2738',
        'ConditionalExpression',
        'if (startIsBlocked()) return Promise.resolve();',
        'false',
        3107,
        9,
        3107,
        25,
      ],
    ],
  },
  {
    reason:
      'Uploading phase is entered only after installing this submission controller, and finally leaves or hands off the phase when detaching it. The documented null-controller return is unreachable.',
    mutants: [
      ['2753', 'ConditionalExpression', 'if (!controller) return;', 'false', 3128, 9, 3128, 20],
    ],
  },
  {
    reason:
      'The rewind promise owner handles rejection by releasing the player and reporting once. After finally clears the request flag, the following identity and playability guard returns, so this duplicate catch return has no effect.',
    mutants: [
      [
        '2787',
        'BlockStatement',
        '} catch {\n        // The rewind owner releases the player and reports the failure once.\n        return;\n      } finally {',
        '{}',
        3168,
        15,
        3171,
        8,
      ],
    ],
  },
  {
    reason:
      'A pending rewind is created only for the installed preview player. The preceding identity check requires the ref still equal that captured player, so the non-null operand is guaranteed.',
    mutants: [
      [
        '2797',
        'ConditionalExpression',
        'previewPlayerRef.current !== null,',
        'true',
        3179,
        11,
        3179,
        44,
      ],
    ],
  },
  {
    reason:
      'If createAudioPlayer throws, continuing reaches addListener on the unset local; the second catch performs best-effort cleanup and emits the same single play-failed callback. The two paths converge.',
    mutants: [
      [
        '2808',
        'BlockStatement',
        "} catch {\n        callbacksRef.current.onError(translate('recorder.errPlayFailed'));\n        return;\n      }",
        '{}',
        3194,
        15,
        3197,
        8,
      ],
    ],
  },
  {
    reason:
      'releasePreviewPlayer clears rewind and player refs together, while installation associates both with the same player. Their equality predicates move in lockstep, so weakening either alone or changing and to or cannot select another cleanup target.',
    mutants: [
      [
        '2828',
        'ConditionalExpression',
        'if (previewPlayerRef.current === player) {',
        'true',
        3214,
        17,
        3214,
        52,
      ],
      [
        '2838',
        'ConditionalExpression',
        'previewRewindPromiseRef.current === rewind &&',
        'true',
        3229,
        17,
        3229,
        59,
      ],
      [
        '2842',
        'LogicalOperator',
        'previewRewindPromiseRef.current === rewind &&\n                previewPlayerRef.current === player',
        'previewRewindPromiseRef.current === rewind || previewPlayerRef.current === player',
        3229,
        17,
        3230,
        52,
      ],
      [
        '2843',
        'ConditionalExpression',
        'previewPlayerRef.current === player',
        'true',
        3230,
        17,
        3230,
        52,
      ],
    ],
  },
  {
    reason:
      'After pending-rewind handling, a null player enters the creation branch, which either returns on failure or assigns previewPlayerRef. The final local player is non-null whenever execution reaches play.',
    mutants: [
      ['2858', 'ConditionalExpression', 'if (!player) return;', 'false', 3254, 9, 3254, 16],
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

if (recorderReviewedMutantIds.size !== 186) {
  throw new Error(
    `Recorder equivalence review has ${recorderReviewedMutantIds.size} mutants; expected 186`,
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
      reason:
        'The page-9,999 body either returns on a terminal null cursor or throws before emitting a non-terminal cursor. No execution can reach a page-10,000 loop iteration, so < and <= have identical behaviour.',
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
      original:
        'useFocusEffect(useCallback(() => () => setPreviewLanguage(null), [setPreviewLanguage]));',
      replacements: ['[]'],
      reason:
        'setPreviewLanguage is a stable provider callback, so omitting it cannot stale the focus cleanup or change its subscription lifetime.',
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
