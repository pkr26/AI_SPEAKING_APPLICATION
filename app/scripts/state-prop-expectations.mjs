import { createHash } from 'node:crypto';

/**
 * Reviewed state/prop sites whose mutation run legitimately classifies as a
 * Timeout or an infrastructure Error even though the owning suite detects the
 * mutant decisively.
 *
 * Entry requirements, validated fail-closed by the campaign runner:
 * - the pinned site id must match exactly one discovered site;
 * - the SHA-256 of the site's exact source text must still match, so source
 *   drift cannot silently carry a stale expectation forward;
 * - the mutant's run must still contain at least one failed test — an
 *   expectation can never excuse an undetected mutant, only the
 *   classification of a detected one.
 *
 * Two reviewed classes exist:
 *
 * Timeout — disconnecting the setter leaves an in-flight native mock promise
 * pending inside Recorder's module-level serialized queues. A later test's
 * `await fireEvent.press(...)` then awaits an act() chain that can never
 * settle, so Jest kills the test at its own deadline. Bounding that await
 * would require racing act()'s thenable, which breaks React's act semantics
 * for every unmutated run (verified: racing act corrupts 640 of the 897
 * recorder tests). In isolation and in unwedged suite order the same mutants
 * fail 570-640 tests with assertion evidence.
 *
 * Error — removing a required prop (a picker's options, a list's sections or
 * renderItem, a provider's value, a field's password, ...) crashes the
 * component's render before any assertion can run. The crash IS the detected
 * behavior, but the strict classifier deliberately counts raw crashes as
 * infrastructure errors rather than kills, and no assertion can precede a
 * render crash.
 */
export const expectedTimeoutSites = Object.freeze([
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:setter:setState:751:8-751:88',
    expectedStatus: 'Timeout',
    file: 'src/components/Recorder.tsx',
    kind: 'setter',
    siteSourceSha256: '8c0dbb1b037bf2c21fefc2449eafbe2a77e30878b9ae693d4cdbd5b2c60441ac',
    reason:
      'Disconnecting the scoped status poll strands later tests behind never-settling native promises; unwedged runs fail 640 tests with assertion evidence.',
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:setter:setOperationActive:1335:28-1335:59',
    expectedStatus: 'Timeout',
    file: 'src/components/Recorder.tsx',
    kind: 'setter',
    siteSourceSha256: '30bbab83840d08a09d3f8e81c09b6ba7da873b83ba3d62f723a03f6c5b25caae',
    reason:
      'Disconnecting the operation latch release strands later tests behind never-settling native promises; unwedged runs fail 640 tests with assertion evidence.',
  }),
  // Required-prop removals: each one crashes the component's render before
  // any assertion can run, so the strict classifier reports an infrastructure
  // Error even though the owning test detects the removal. Every entry still
  // requires at least one failing test (detection proof) to be excused.
  Object.freeze({
    id: 'sp:prop:src/app/(auth)/signup.tsx:expression:password:292:35-292:54',
    expectedStatus: 'Error',
    file: 'src/app/(auth)/signup.tsx',
    kind: 'expression',
    siteSourceSha256: '0ad128b8a643c5cc2371bc831a692d466ff480d84ea6576982dc68af2295a147',
    reason:
      'The field component dereferences the required value (password.length); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(auth)/signup.tsx:expression:options:348:14-348:47',
    expectedStatus: 'Error',
    file: 'src/app/(auth)/signup.tsx',
    kind: 'expression',
    siteSourceSha256: 'ae171d3ac7a56d58e0f62994262b21d36c033120bb38337bb715c635019b17d4',
    reason:
      'The picker component iterates the required options array (options.map); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(auth)/reset-password.tsx:expression:password:263:33-263:52',
    expectedStatus: 'Error',
    file: 'src/app/(auth)/reset-password.tsx',
    kind: 'expression',
    siteSourceSha256: '0ad128b8a643c5cc2371bc831a692d466ff480d84ea6576982dc68af2295a147',
    reason:
      'The field component dereferences the required value (password.length); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/settings/change-password.tsx:expression:password:240:33-240:55',
    expectedStatus: 'Error',
    file: 'src/app/settings/change-password.tsx',
    kind: 'expression',
    siteSourceSha256: '4420b8e9adba2ddc34ad624e92ccb9841c73e5045b89259c344d126a4c4a8401',
    reason:
      'The field component dereferences the required value (password.length); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/settings/index.tsx:expression:options:1218:10-1218:39',
    expectedStatus: 'Error',
    file: 'src/app/settings/index.tsx',
    kind: 'expression',
    siteSourceSha256: '28b3c926af68e588950d2cc7b7e65d4a1f89cb10c7bf6125162ef9589150dc25',
    reason:
      'The picker component iterates the required options array (options.map); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/settings/index.tsx:expression:options:1252:10-1252:43',
    expectedStatus: 'Error',
    file: 'src/app/settings/index.tsx',
    kind: 'expression',
    siteSourceSha256: 'ae171d3ac7a56d58e0f62994262b21d36c033120bb38337bb715c635019b17d4',
    reason:
      'The picker component iterates the required options array (options.map); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/components/UiLanguagePicker.tsx:expression:options:36:8-36:37',
    expectedStatus: 'Error',
    file: 'src/components/UiLanguagePicker.tsx',
    kind: 'expression',
    siteSourceSha256: '28b3c926af68e588950d2cc7b7e65d4a1f89cb10c7bf6125162ef9589150dc25',
    reason:
      'The picker component iterates the required options array (options.map); removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/history.tsx:expression:sections:448:6-448:25',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/history.tsx',
    kind: 'expression',
    siteSourceSha256: 'de3fafedcf5c2cf1839bfe5592d59877d0244eb26723d3fca4292199992ed9d8',
    reason:
      'SectionList requires sections; removal throws inside the list renderer before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/history.tsx:expression:keyExtractor:452:6-452:38',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/history.tsx',
    kind: 'expression',
    siteSourceSha256: '882706ca66d9ebf9b9162ae040ad16dc3cdd768c189ce3bc6269d8d5bc8f91f8',
    reason:
      'The list implementation calls props.keyExtractor; removal throws before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/history.tsx:expression:renderItem:453:6-458:8',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/history.tsx',
    kind: 'expression',
    siteSourceSha256: 'ef420e817877b5e93777ae700cb6ecceb7410b84cbacc34c79f4f5e2cb6e48c4',
    reason:
      'The list implementation calls props.renderItem; removal throws before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/recordings.tsx:expression:data:291:6-291:18',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/recordings.tsx',
    kind: 'expression',
    siteSourceSha256: '4bfec71506e528d2fecf219452072f6c6adae6828552c953a8e7352d40e14bc0',
    reason:
      'FlatList dereferences the required data array; removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/recordings.tsx:expression:keyExtractor:292:6-292:38',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/recordings.tsx',
    kind: 'expression',
    siteSourceSha256: '882706ca66d9ebf9b9162ae040ad16dc3cdd768c189ce3bc6269d8d5bc8f91f8',
    reason:
      'The list implementation calls props.keyExtractor; removal throws before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/recordings.tsx:expression:renderItem:293:6-295:8',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/recordings.tsx',
    kind: 'expression',
    siteSourceSha256: '527fe4e1337ad0ffed0ec290f0c4af37fe7d7e3a907e0b436dd96a8baaaaf3d4',
    reason:
      'The list implementation calls props.renderItem; removal throws before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/_layout.tsx:expression:client:309:31-309:51',
    expectedStatus: 'Error',
    file: 'src/app/_layout.tsx',
    kind: 'expression',
    siteSourceSha256: 'b2a5d762bd1d7fb9e29594ad5a2b85daaab512c948081baa47a6f64b6d664337',
    reason:
      'The provider dereferences its required client; removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/lib/auth.tsx:expression:value:740:31-740:44',
    expectedStatus: 'Error',
    file: 'src/lib/auth.tsx',
    kind: 'expression',
    siteSourceSha256: 'f97ea738823c2657ed74f57d1411dec4c07ff30360b3b8a9250a2980744b1666',
    reason:
      'Context consumers dereference the required provider value; removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/lib/practice-flow.tsx:expression:value:200:39-200:52',
    expectedStatus: 'Error',
    file: 'src/lib/practice-flow.tsx',
    kind: 'expression',
    siteSourceSha256: 'f97ea738823c2657ed74f57d1411dec4c07ff30360b3b8a9250a2980744b1666',
    reason:
      'Context consumers dereference the required provider value; removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/practice/feedback.tsx:expression:art:421:36-421:62',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/practice/feedback.tsx',
    kind: 'expression',
    siteSourceSha256: 'e182d2ec43dd71c9d76ba53b8902d814241ab8460b9112f4de960b53a42b9d18',
    reason:
      'The vector-art consumer dereferences art.ink; removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/practice/index.tsx:expression:parseResult:835:16-839:17',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/practice/index.tsx',
    kind: 'expression',
    siteSourceSha256: '46ce49b69c00c2937d9857dfb2209434b8932c5579a05629b6fa6aac4116efc5',
    reason:
      'The flow calls the required parseResult callback; removal throws before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/components/ClientUpgradeModal.tsx:expression:visible:136:6-136:24',
    expectedStatus: 'Error',
    file: 'src/components/ClientUpgradeModal.tsx',
    kind: 'expression',
    siteSourceSha256: 'b822fedc1257e45a54a31568d4198b80a29eee2e1c469ac9271c8571224ded7c',
    reason:
      'The modal internals dereference the required visible flag; removal crashes render before any assertion can run.',
  }),
  Object.freeze({
    id: 'sp:prop:src/components/StatTile.tsx:expression:style:57:12-57:32',
    expectedStatus: 'Error',
    file: 'src/components/StatTile.tsx',
    kind: 'expression',
    siteSourceSha256: '1f21edb7366623aef5e9b5db4a806a43847a39189bad5d308894f90cffbb0b85',
    reason:
      'The owning assertion chain dereferences the removed style before a matcher can run; the crash is the detected behavior.',
  }),
  Object.freeze({
    id: 'sp:prop:src/components/NetworkStatusBanner.tsx:expression:style:46:14-46:82',
    expectedStatus: 'Error',
    file: 'src/components/NetworkStatusBanner.tsx',
    kind: 'expression',
    siteSourceSha256: 'd8d189eae65c0fd52756a8aa4e571e8764c76eb8a0023f8a528f83dfbd14887f',
    reason:
      'The owning assertion chain dereferences the removed style before a matcher can run; the crash is the detected behavior.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/practice/feedback.tsx:expression:style:650:12-650:86',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/practice/feedback.tsx',
    kind: 'expression',
    siteSourceSha256: '4c6f04e041afe8b7f78b7b9189c081c391949289e8484de3027f22a65d0733e2',
    reason:
      'The owning assertion chain dereferences the removed style before a matcher can run; the crash is the detected behavior.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/practice/help.tsx:expression:style:195:16-195:90',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/practice/help.tsx',
    kind: 'expression',
    siteSourceSha256: '4c6f04e041afe8b7f78b7b9189c081c391949289e8484de3027f22a65d0733e2',
    reason:
      'The owning assertion chain dereferences the removed style before a matcher can run; the crash is the detected behavior.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/history.tsx:expression:refreshing:466:6-466:44',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/history.tsx',
    kind: 'expression',
    siteSourceSha256: 'bec1126459f6105539a8dcadd4176c34f29bc82c5e78680781255a1144da656b',
    reason:
      'The refresh-control wiring assertion chain dereferences the removed refreshing flag before a matcher can run; the crash is the detected behavior.',
  }),
  Object.freeze({
    id: 'sp:prop:src/app/(tabs)/_layout.tsx:expression:tabBar:64:6-131:7',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/_layout.tsx',
    kind: 'expression',
    siteSourceSha256: '14301ada70fa458e508fb525b7b522d6b33ced065cebca6fad68ece7446309ed',
    reason:
      'Removing the custom tabBar renderer falls back to the stock bar against a mocked navigation tree; the harness mismatch is a detected raw error, not an assertion.',
  }),
  // Ported survivors: the general Stryker campaign already reviewed these
  // initializer mutants as unobservable (the identity-reset layout effect
  // re-writes the state in the same first commit), with the reason pinned in
  // scripts/mutation-equivalents.mjs. Each entry cites that review; source
  // drift fails closed exactly like every other pin.
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:resultRequestId:108:4-108:52',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '52b2a39cb52bdc02a24f82d9cdbc4d58abcbdfe16ca9e7a123e894b12cd7adbd',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (ArrowFunction on diagnostic.tsx:108): The identity-reset layout effect re-initializes introStarted in the same first commit (false, or true via the replay seed), so the lazy initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:level:110:55-110:59',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (ArrowFunction on diagnostic.tsx:110): The identity-reset layout effect re-initializes introStarted in the same first commit (false, or true via the replay seed), so the lazy initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:introStarted:113:51-113:89',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '1319c80753c8bf74045928e12894a10d960f1b696a3c259083f6569ce813bcf5',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on diagnostic.tsx:113): The identity-reset layout effect re-falses the exit-lock state in the same first commit, so the useState initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:answers:114:68-114:70',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on diagnostic.tsx:114): The identity-reset layout effect re-falses the exit-lock state in the same first commit, so the useState initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:stateIdentity:115:53-115:64',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: 'c8438d5257c0983d6cee904f6e4f7b8b43141492f7171d17e98c169ebe8f4da5',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on diagnostic.tsx:115): The identity-reset layout effect re-falses the exit-lock state in the same first commit, so the useState initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:recorderExitLocked:117:63-117:68',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on diagnostic.tsx:117): The identity-reset layout effect re-falses the logout busy state in the same first commit, so the useState initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:logoutBusy:120:47-120:52',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on diagnostic.tsx:120): The identity-reset layout effect re-falses the practice-start busy state in the same first commit, so the useState initializer never reaches an observable render.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:practiceStartBusy:122:61-122:66',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on diagnostic.tsx:122): Focus plus identity/Recorder layout effects reset the Recorder locks, exit lock, logout latch, practice-start latch, and focus seed before asynchronous diagnostic state can expose any actionable view.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/change-password.tsx:initializer:currentPassword:38:57-38:59',
    expectedStatus: 'Survived',
    file: 'src/app/settings/change-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '6f49cdbd80e1b95d5e6427e1501fc217790daee87055fa5b4e71064288bddede',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (ObjectLiteral on change-password.tsx:38): Every read of visibleFields is truthiness-coerced (secureTextEntry={!visibleFields.X}, and a ternary on the toggle), where undefined and false are interchangeable, and the updater !fields[field] yields true from either. The replacement is also not type-valid, so it could not exist in real source.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/change-password.tsx:initializer:newPassword:39:49-39:51',
    expectedStatus: 'Survived',
    file: 'src/app/settings/change-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '6f49cdbd80e1b95d5e6427e1501fc217790daee87055fa5b4e71064288bddede',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (ObjectLiteral on change-password.tsx:39): Every read of visibleFields is truthiness-coerced (secureTextEntry={!visibleFields.X}, and a ternary on the toggle), where undefined and false are interchangeable, and the updater !fields[field] yields true from either. The replacement is also not type-valid, so it could not exist in real source.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/change-password.tsx:initializer:confirmPassword:40:57-40:59',
    expectedStatus: 'Survived',
    file: 'src/app/settings/change-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '6f49cdbd80e1b95d5e6427e1501fc217790daee87055fa5b4e71064288bddede',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (ObjectLiteral on change-password.tsx:40): Every read of visibleFields is truthiness-coerced (secureTextEntry={!visibleFields.X}, and a ternary on the toggle), where undefined and false are interchangeable, and the updater !fields[field] yields true from either. The replacement is also not type-valid, so it could not exist in real source.",
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/change-password.tsx:initializer:visibleFields:41:81-45:3',
    expectedStatus: 'Survived',
    file: 'src/app/settings/change-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '185e0935be8aed7eec048c22c94f04ad3926309aa39cb09967b3b9026c0b8a98',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (ObjectLiteral on change-password.tsx:41): Every read of visibleFields is truthiness-coerced (secureTextEntry={!visibleFields.X}, and a ternary on the toggle), where undefined and false are interchangeable, and the updater !fields[field] yields true from either. The replacement is also not type-valid, so it could not exist in real source.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/HistoryNativeAdCard.tsx:initializer:nativeAd:26:60-26:64',
    expectedStatus: 'Survived',
    file: 'src/components/HistoryNativeAdCard.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on HistoryNativeAdCard.tsx:26): The first committed focused effect resets loadFailed to false before any awaited activation can publish success or failure, so the initial seed cannot survive into an actionable placement state.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/HistoryNativeAdCard.tsx:initializer:loadFailed:27:47-27:52',
    expectedStatus: 'Survived',
    file: 'src/components/HistoryNativeAdCard.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on HistoryNativeAdCard.tsx:27): The first committed focused effect resets loadFailed to false before any awaited activation can publish success or failure, so the initial seed cannot survive into an actionable placement state.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:recoveryRetryNeeded:1089:65-1089:70',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1089): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:permissionDenied:1090:59-1090:64',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1090): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:permissionNeedsSettings:1091:73-1091:78',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1091): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:waitElapsedMillis:1095:61-1095:62',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1095): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:remoteTransferStarted:1096:69-1096:74',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1096): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:assessmentRequestStarted:1097:75-1097:80',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1097): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:previewPlaying:1098:55-1098:60',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1098): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:retainRecording:1099:57-1099:62',
    expectedStatus: 'Survived',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (BooleanLiteral on Recorder.tsx:1099): permissionNeedsSettings is hidden until permissionDenied, previewPlaying is hidden outside recorded, and the initial idle announcement produces no message. Each seed is reset before its first visible phase, so its mutated initial value cannot render or notify.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/RecordingPlayback.tsx:initializer:phase:184:52-184:58',
    expectedStatus: 'Survived',
    file: 'src/components/RecordingPlayback.tsx',
    kind: 'initializer',
    siteSourceSha256: 'a1fa3f865f3334a62c88898f2001c9d74970190cc017ca4b60f31b10fc1a9825',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (StringLiteral on RecordingPlayback.tsx:184): The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/RecordingPlayback.tsx:initializer:sharing:185:41-185:46',
    expectedStatus: 'Survived',
    file: 'src/components/RecordingPlayback.tsx',
    kind: 'initializer',
    siteSourceSha256: 'fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (StringLiteral on RecordingPlayback.tsx:185): The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
  }),
  Object.freeze({
    id: 'sp:state:src/components/RecordingPlayback.tsx:initializer:errorMessage:186:66-186:70',
    expectedStatus: 'Survived',
    file: 'src/components/RecordingPlayback.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      "Ported from the general campaign's reviewed equivalence for the same file/line (StringLiteral on RecordingPlayback.tsx:186): The identity layout effect synchronously sets phase to 'idle' before paint on the initial mount; before that effect, both values render the same default Play controls and no handler is callable.",
  }),
  // Reviewed under the fixed initializer instrumentation: object-typed
  // hostiles crash render before assertions, hostile wedges hang owning
  // waits, and null-kind initializers admit no observable-and-safe scalar
  // hostile at all (falsy is unobservable; truthy crashes Jest's own result
  // serialization through cyclic element diffs).
  Object.freeze({
    id: 'sp:state:src/app/(auth)/forgot-password.tsx:initializer:sentEmail:40:60-40:64',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/forgot-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/forgot-password.tsx:initializer:error:45:52-45:56',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/forgot-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/login.tsx:initializer:focusedField:48:80-48:84',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/login.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/login.tsx:initializer:error:54:52-54:56',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/login.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/reset-password.tsx:initializer:email:45:37-45:73',
    expectedStatus: 'Error',
    file: 'src/app/(auth)/reset-password.tsx',
    kind: 'initializer',
    siteSourceSha256: 'a8775ab8ae6cdf17d1214fe583d3531ee40b22ce500232bf724881b2c64686a7',
    reason:
      'The hostile arrow initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/reset-password.tsx:initializer:focusedField:53:4-53:8',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/reset-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/reset-password.tsx:initializer:error:58:52-58:56',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/reset-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/signup.tsx:initializer:focusedField:54:4-54:8',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/signup.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(auth)/signup.tsx:initializer:error:63:52-63:56',
    expectedStatus: 'Survived',
    file: 'src/app/(auth)/signup.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(tabs)/practice/feedback.tsx:initializer:card:113:56-121:3',
    expectedStatus: 'Error',
    file: 'src/app/(tabs)/practice/feedback.tsx',
    kind: 'initializer',
    siteSourceSha256: 'ab966ca9a7c87592c3333093ea5b776241fc41be12dab3eb763503fc07549c88',
    reason:
      'The hostile arrow initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(tabs)/practice/feedback.tsx:initializer:cardActionState:152:12-152:16',
    expectedStatus: 'Survived',
    file: 'src/app/(tabs)/practice/feedback.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(tabs)/practice/index.tsx:initializer:rateLimitNotice:81:72-81:76',
    expectedStatus: 'Survived',
    file: 'src/app/(tabs)/practice/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/(tabs)/practice/index.tsx:initializer:introState:98:89-98:93',
    expectedStatus: 'Survived',
    file: 'src/app/(tabs)/practice/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:replayBinding:85:12-85:16',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:question:101:4-101:51',
    expectedStatus: 'Error',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: 'eeeb428d40d65fb6c4a748b6b562163656ee72df7b05d19361615254750914bf',
    reason:
      'The hostile arrow initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:progress:103:70-103:74',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/diagnostic.tsx:initializer:rateLimitNotice:146:72-146:76',
    expectedStatus: 'Survived',
    file: 'src/app/diagnostic.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/change-password.tsx:initializer:focusedField:46:69-46:73',
    expectedStatus: 'Survived',
    file: 'src/app/settings/change-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/change-password.tsx:initializer:error:49:52-49:56',
    expectedStatus: 'Survived',
    file: 'src/app/settings/change-password.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/delete-account.tsx:initializer:error:43:52-43:56',
    expectedStatus: 'Survived',
    file: 'src/app/settings/delete-account.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:nameDraft:144:45-144:58',
    expectedStatus: 'Error',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '3f7ee711fcd6101f2bd70bc73c888a8b005da348599b9ac504f68a73c1eb1a2d',
    reason:
      'The hostile expression initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:nameError:150:60-150:64',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:languageTarget:155:4-155:8',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:languageError:156:68-156:72',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:languageErrorScope:157:87-157:91',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:exportError:160:64-160:68',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:recordingsDeleteError:165:84-165:88',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:reminder:167:65-167:69',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:reminderError:169:68-169:72',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:privacyError:172:66-172:70',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/app/settings/index.tsx:initializer:retakeError:176:64-176:68',
    expectedStatus: 'Survived',
    file: 'src/app/settings/index.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/components/HomeBannerAd.tsx:initializer:failedConsentVersion:26:82-26:86',
    expectedStatus: 'Survived',
    file: 'src/components/HomeBannerAd.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:state:746:52-746:78',
    expectedStatus: 'Error',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: '17f245658571ddc25df4da1888b8abc7d97cbe88138b46974fcf245afce05b49',
    reason:
      'The hostile arrow initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/components/Recorder.tsx:initializer:phase:1036:44-1036:50',
    expectedStatus: 'Timeout',
    file: 'src/components/Recorder.tsx',
    kind: 'initializer',
    siteSourceSha256: 'a1fa3f865f3334a62c88898f2001c9d74970190cc017ca4b60f31b10fc1a9825',
    reason:
      'The hostile initial state wedges the component state machine so owning waits never settle; detected through the wedge, unclassifiable as a kill.',
  }),
  Object.freeze({
    id: 'sp:state:src/lib/ads.tsx:initializer:statuses:117:43-117:59',
    expectedStatus: 'Error',
    file: 'src/lib/ads.tsx',
    kind: 'initializer',
    siteSourceSha256: '82f885eb58bbd25759c08254264d1e281ec8da34661e044adc620e66139b7ccc',
    reason:
      'The hostile expression initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/lib/assessment-replay-provider.tsx:initializer:state:108:50-109:49',
    expectedStatus: 'Error',
    file: 'src/lib/assessment-replay-provider.tsx',
    kind: 'initializer',
    siteSourceSha256: '00c0c87c288b47ae32cf2020875c0e298b394e99ee99a9d82637fc022aab3ac4',
    reason:
      'The hostile arrow initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
  Object.freeze({
    id: 'sp:state:src/lib/auth.tsx:initializer:user:137:53-137:57',
    expectedStatus: 'Survived',
    file: 'src/lib/auth.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/lib/guest-language.tsx:initializer:isRestoring:89:49-89:53',
    expectedStatus: 'Timeout',
    file: 'src/lib/guest-language.tsx',
    kind: 'initializer',
    siteSourceSha256: 'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b',
    reason:
      'The hostile initial state wedges the component state machine so owning waits never settle; detected through the wedge, unclassifiable as a kill.',
  }),
  Object.freeze({
    id: 'sp:state:src/lib/guest-language.tsx:initializer:persistenceError:90:74-90:78',
    expectedStatus: 'Survived',
    file: 'src/lib/guest-language.tsx',
    kind: 'initializer',
    siteSourceSha256: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
    reason:
      'No scalar hostile for a null initializer is both observable and safe: falsy hostiles are unobservable through falsy-gated rendering by construction, and truthy hostiles crash Jest result serialization through cyclic element diffs (verified).',
  }),
  Object.freeze({
    id: 'sp:state:src/lib/practice-flow.tsx:initializer:sessionTally:96:65-96:76',
    expectedStatus: 'Error',
    file: 'src/lib/practice-flow.tsx',
    kind: 'initializer',
    siteSourceSha256: '12f02aaea041e78c1c7b8db2a90ce53fa7824d7277db643a850c88c878912dbd',
    reason:
      'The hostile expression initializer for this object-typed state dereferences a field before any assertion can run; the crash is the detected behavior but the strict classifier counts raw render crashes as infrastructure errors.',
  }),
]);

export function expectedTimeoutSiteIds(exclusions = expectedTimeoutSites) {
  return new Set(exclusions.map(({ id }) => id));
}

/** The reviewed classification ('Timeout' or 'Error') expected for a site id. */
export function reviewedStatusFor(id, exclusions = expectedTimeoutSites) {
  return exclusions.find((entry) => entry.id === id)?.expectedStatus ?? null;
}

export function validateExpectedTimeoutPins(sites, exclusions = expectedTimeoutSites) {
  const problems = [];
  const sitesById = new Map(sites.map((site) => [site.id, site]));
  for (const entry of exclusions) {
    const site = sitesById.get(entry.id);
    if (!site) {
      problems.push(`Expected-timeout entry matches no discovered site: ${entry.id}`);
      continue;
    }
    if (site.file !== entry.file || site.kind !== entry.kind) {
      problems.push(`Expected-timeout entry metadata drifted for ${entry.id}`);
    }
    const digest = createHash('sha256').update(site.siteSource).digest('hex');
    if (digest !== entry.siteSourceSha256) {
      problems.push(
        `Expected-timeout entry source hash drifted for ${entry.id}; re-review and re-pin`,
      );
    }
  }
  return problems;
}
