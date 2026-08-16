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
 * Entries are matched on file, mutator, the mutated replacement, and the trimmed
 * source text of the mutated node, and must excuse exactly the number of mutants
 * they declare. The gate fails on a survivor that matches nothing here, on an
 * entry that matches nothing, and on an entry that matches more than it claims —
 * so neither a stale exemption nor a newly regressed sibling can pass quietly.
 *
 * `lines` is the last resort, used only where a guard repeats verbatim: Recorder
 * has nineteen `if (!isCurrent()) return;` statements of which two are
 * unkillable, and no amount of text matching can separate those. Line numbers
 * drift, but drift makes the gate fail and ask for a review, which is the safe
 * direction.
 */
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
      file: 'src/lib/password-policy.ts',
      mutator: 'ConditionalExpression',
      original: 'if (byteError) return byteError;',
      replacements: ['true'],
      reason:
        'comparablePasswordError returns string | null, so returning it unconditionally is identical. The only distinguishing input is a Translator returning an empty string, which no dictionary-backed translator can produce for a typed MessageKey — and under such a translator the original would wrongly accept a 73-byte password too, so asserting it would pin an accident.',
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
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BlockStatement',
      original: 'if (signal.aborted) {\n      rejectAbort();\n      return;\n    }',
      replacements: ['{}'],
      reason:
        'sleepAbortable is only called from the capacity-retry loop, which checks controller.signal.aborted synchronously immediately before, so signal.aborted is always false on entry and the pre-abort path is dead. The DOMException message and name are never read: the rejection is caught where controller.signal.aborted short-circuits before any inspection. Removing the listener and its once flag are unobservable because an AbortSignal fires at most once and rejecting a settled promise is a no-op.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BlockStatement',
      original:
        "if (!uri) {\n      updatePhase('idle');\n      callbacksRef.current.onError(translate('recorder.errNoRecording'));\n      return;\n    }",
      replacements: ['{}'],
      reason:
        'A documented, unreachable fail-closed block: every path that clears activeUriRef also leaves the recorded phase, so uri is non-null wherever this runs. It is annotated "Unreachable by design" in the source.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "updatePhase('idle');",
      replacements: ['""'],
      reason:
        'A documented, unreachable fail-closed block: every path that clears activeUriRef also leaves the recorded phase, so uri is non-null wherever this runs. It is annotated "Unreachable by design" in the source.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "callbacksRef.current.onError(translate('recorder.errNoRecording'));",
      replacements: ['""'],
      reason:
        'A documented, unreachable fail-closed block: every path that clears activeUriRef also leaves the recorded phase, so uri is non-null wherever this runs. It is annotated "Unreachable by design" in the source.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const cleared = requestId ? await clearRequestTracking(requestId) : true;',
      replacements: ['false'],
      count: 2,
      reason:
        'requestIdRef.current is assigned before any await in submit, and the only sites that null it return immediately, so requestId is never nullish at these branches.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "reject(new DOMException('The operation was aborted.', 'AbortError'));",
      replacements: ['""'],
      count: 2,
      reason:
        'sleepAbortable is only called from the capacity-retry loop, which checks controller.signal.aborted synchronously immediately before, so signal.aborted is always false on entry and the pre-abort path is dead. The DOMException message and name are never read: the rejection is caught where controller.signal.aborted short-circuits before any inspection. Removing the listener and its once flag are unobservable because an AbortSignal fires at most once and rejecting a settled promise is a no-op.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (signal.aborted) {',
      replacements: ['false'],
      reason:
        'sleepAbortable is only called from the capacity-retry loop, which checks controller.signal.aborted synchronously immediately before, so signal.aborted is always false on entry and the pre-abort path is dead. The DOMException message and name are never read: the rejection is caught where controller.signal.aborted short-circuits before any inspection. Removing the listener and its once flag are unobservable because an AbortSignal fires at most once and rejecting a settled promise is a no-op.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "signal.removeEventListener('abort', rejectAbort);",
      replacements: ['""'],
      reason:
        'sleepAbortable is only called from the capacity-retry loop, which checks controller.signal.aborted synchronously immediately before, so signal.aborted is always false on entry and the pre-abort path is dead. The DOMException message and name are never read: the rejection is caught where controller.signal.aborted short-circuits before any inspection. Removing the listener and its once flag are unobservable because an AbortSignal fires at most once and rejecting a settled promise is a no-op.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ObjectLiteral',
      original: "signal.addEventListener('abort', rejectAbort, { once: true });",
      replacements: ['{}'],
      reason:
        'sleepAbortable is only called from the capacity-retry loop, which checks controller.signal.aborted synchronously immediately before, so signal.aborted is always false on entry and the pre-abort path is dead. The DOMException message and name are never read: the rejection is caught where controller.signal.aborted short-circuits before any inspection. Removing the listener and its once flag are unobservable because an AbortSignal fires at most once and rejecting a settled promise is a no-op.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: "signal.addEventListener('abort', rejectAbort, { once: true });",
      replacements: ['false'],
      reason:
        'sleepAbortable is only called from the capacity-retry loop, which checks controller.signal.aborted synchronously immediately before, so signal.aborted is always false on entry and the pre-abort path is dead. The DOMException message and name are never read: the rejection is caught where controller.signal.aborted short-circuits before any inspection. Removing the listener and its once flag are unobservable because an AbortSignal fires at most once and rejecting a settled promise is a no-op.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: "if (typeof metering !== 'number' || !Number.isFinite(metering)) return 0;",
      replacements: ['false'],
      reason:
        'Number.isFinite is already false for every non-number, so the typeof test cannot change the outcome; it narrows the type for the arithmetic below.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BlockStatement',
      original: '} catch {\n    return false;\n  }',
      replacements: ['{}'],
      lines: [178],
      reason:
        'The return value is read only in a truthiness position, so returning undefined instead of false is indistinguishable.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);',
      replacements: ['true'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const [previewPlaying, setPreviewPlaying] = useState(false);',
      replacements: ['true'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const mountedRef = useRef(true);',
      replacements: ['false'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const focusedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const hasObservedRecordingRef = useRef(false);',
      replacements: ['true'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const cancelRequestedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'const assessmentPostedRef = useRef(false);',
      replacements: ['true'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ObjectLiteral',
      original:
        'const callbacksRef = useRef({\n    onError,\n    onRateLimited,\n    onRecoveryEndpointMismatch,\n    onRecoveryUnresolved,\n    onResult,\n    parseResult,\n  });',
      replacements: ['{}'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ObjectLiteral',
      original: 'const identityRef = useRef({ ownerId, endpoint, questionId });',
      replacements: ['{}'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original:
        "waitStartedAtRef.current = next === 'uploading' || next === 'recovering' ? Date.now() : null;",
      replacements: ['true'],
      reason:
        'waitStartedAtRef is only read while the phase is uploading or recovering, and the same updatePhase statement sets both, so a value written in any other phase is never rendered.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) {',
      replacements: ['true'],
      count: 2,
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ArrayDeclaration',
      original: '}, []);',
      replacements: ['["Stryker was here"]'],
      lines: [283, 296, 303, 313, 321, 881],
      count: 6,
      reason:
        'A constant dependency literal compares equal on every render under Object.is, so React runs the effect (or rebuilds the callback) exactly as often either way.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'OptionalChaining',
      original: 'player?.remove();',
      replacements: ['player.remove'],
      reason:
        'The TypeError a nullish player would raise is swallowed by the surrounding try/catch, so the optional chain cannot change the observable outcome.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) setPreviewPlaying(false);',
      replacements: ['true'],
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BlockStatement',
      original: '} catch {\n      return false;\n    }',
      replacements: ['{}'],
      lines: [310],
      reason:
        'The return value is read only in a truthiness position, so returning undefined instead of false is indistinguishable.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (nativeStopPromiseRef.current === promise) {',
      replacements: ['true'],
      reason:
        'The ref is assigned synchronously after the promise is created and the function early-returns while one is in flight, so only one promise can exist at settle time and the identity check always matches.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'AssignmentOperator',
      original: 'lifecycleEpochRef.current += 1;',
      replacements: ['lifecycleEpochRef.current -= 1'],
      reason:
        'lifecycleEpoch is only ever compared for equality, and both directions produce a fresh distinct value.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'hasObservedRecordingRef.current = false;',
      replacements: ['true'],
      lines: [355, 1081, 1117, 1133],
      count: 4,
      reason:
        'hasObservedRecordingRef is only read while phaseRef.current is "recording", and the sole transition into that phase resets it first, so these defensive resets are unobservable.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) setRecordedDurationMillis(0);',
      replacements: ['true', 'false'],
      count: 4,
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (lifecycleStopPromiseRef.current === promise) {',
      replacements: ['true'],
      reason:
        'Same single-in-flight argument as the native stop promise: the identity check can only ever match.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'uploadControllerRef.current !== null ||',
      replacements: ['false'],
      count: 2,
      reason:
        'uploadControllerRef.current is non-null exactly between updatePhase("uploading") and submit\'s finally, and operationRef.current is true for precisely that span, so the controller operand can never be the deciding one.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: '(activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId)',
      replacements: ['true'],
      count: 2,
      reason:
        'activeRecoveryOwner === instanceId is unreachable here: the lease is only taken together with recoveringRef and operationRef, and every release clears them together, so owner-is-self implies operationRef.current, which the enclosing guards already reject.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'uploadControllerRef.current === null &&',
      replacements: ['true'],
      reason:
        'uploadControllerRef.current is non-null exactly between updatePhase("uploading") and submit\'s finally, and operationRef.current is true for precisely that span, so the controller operand can never be the deciding one.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: '(activeRecoveryOwner === null || activeRecoveryOwner === instanceId)',
      replacements: ['false'],
      reason:
        'activeRecoveryOwner === instanceId is unreachable here: the lease is only taken together with recoveringRef and operationRef, and every release clears them together, so owner-is-self implies operationRef.current, which the enclosing guards already reject.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'operationRef.current = true;',
      replacements: ['false'],
      lines: [453, 1171],
      count: 2,
      reason:
        'In recoverPending the operation lock is redundant with recoveringRef and the recovering phase; in submit it is redundant with updatePhase("uploading") three synchronous lines later.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'activeRecoveryOwner === instanceId &&',
      replacements: ['true'],
      reason:
        'activeRecoveryOwner === instanceId is unreachable here: the lease is only taken together with recoveringRef and operationRef, and every release clears them together, so owner-is-self implies operationRef.current, which the enclosing guards already reject.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!isCurrent()) return;',
      replacements: ['false'],
      lines: [477, 487, 779],
      count: 3,
      reason:
        "Only microtasks separate this guard from the caller's own identical guard, so no macrotask can interleave and both branches return with no side effect.",
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "throw new Error('Pending assessment disappeared');",
      replacements: ['""'],
      count: 7,
      reason:
        'Each throw is caught by the immediately enclosing catch, which ignores the error object entirely.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'if (!isCurrent()) return false;',
      replacements: ['true'],
      count: 2,
      reason:
        "Only microtasks separate this guard from the caller's own identical guard, so no macrotask can interleave and both branches return with no side effect.",
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BlockStatement',
      original: '} catch {\n          return false;\n        }',
      replacements: ['{}'],
      lines: [568],
      reason:
        'The return value is read only in a truthiness position, so returning undefined instead of false is indistinguishable.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: "await finishUnresolved(translate('recorder.errInterruptedSaved'), false);",
      replacements: ['true'],
      reason:
        'This call sits inside if (!routeMatches), and finishUnresolved tests !allowRecordedRetry || !activeUriRef.current || !routeMatches — the third operand is already true, so the flag cannot change the branch taken.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (activeRecoveryOwner === instanceId) activeRecoveryOwner = null;',
      replacements: ['true'],
      reason:
        'activeRecoveryOwner === instanceId is unreachable here: the lease is only taken together with recoveringRef and operationRef, and every release clears them together, so owner-is-self implies operationRef.current, which the enclosing guards already reject.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'mountedRef.current = false;',
      replacements: ['true'],
      reason:
        'The useFocusEffect cleanup runs first on unmount and clears focusedRef; every guard reading mountedRef also reads focusedRef, and the remaining readers only gate setState, which React 19 discards after unmount.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) setPermissionDenied(false);',
      replacements: ['true'],
      lines: [864, 1027],
      count: 2,
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (mountedRef.current) setPermissionNeedsSettings(false);',
      replacements: ['true', 'false'],
      count: 2,
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'if (mountedRef.current) setPermissionNeedsSettings(false);',
      replacements: ['true'],
      reason:
        'permissionNeedsSettings is always written together with permissionDenied, and the settings button renders inside the banner that permissionDenied controls.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (active) setReduceMotion(enabled);',
      replacements: ['true'],
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'active = false;',
      replacements: ['true'],
      reason:
        'Guards a state update after unmount. React 19 discards updates aimed at a detached fiber silently — no warning, no act complaint, no state change — so no test can observe the difference.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: "if (phase !== 'recorded') releasePreviewPlayer();",
      replacements: ['true'],
      reason:
        'The effect only runs on a phase change, and entering the recorded phase always follows a phase that has already released the player.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "if (phase !== 'recorded') releasePreviewPlayer();",
      replacements: ['""'],
      reason:
        'Same as the ConditionalExpression on this line: the player has already been released on every path that reaches it.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ArrayDeclaration',
      original: 'useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);',
      replacements: ['[]'],
      reason:
        'A constant dependency literal compares equal on every render under Object.is, so React runs the effect (or rebuilds the callback) exactly as often either way.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: "if (phase !== 'uploading' && phase !== 'recovering') return;",
      replacements: ['false'],
      reason:
        'waitStartedAtRef is non-null exactly in the uploading and recovering phases, and the elapsed line renders only in those phases, so a tick in another phase writes nothing observable.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (startedAt !== null) setWaitElapsedMillis(Date.now() - startedAt);',
      replacements: ['true'],
      reason:
        'Same wait-clock invariant: startedAt is non-null exactly when this interval runs in a wait phase.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ArrowFunction',
      original: 'return () => clearInterval(interval);',
      replacements: ['() => undefined'],
      reason:
        'A leaked interval recomputes an identical elapsed value in a phase that renders nothing, so the cleanup is unobservable. Note: scoring this one needs jest --forceExit, since the leaked real timer keeps the process alive after the suite passes.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "const hapticPhaseRef = useRef<Phase>('idle');",
      replacements: ['""'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'StringLiteral',
      original: "const announcedPhaseRef = useRef<Phase>('idle');",
      replacements: ['""'],
      reason:
        'A useState/useRef seed that is overwritten before any consumer can read it, so its initial value is dead.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (announcedPhaseRef.current === phase) return;',
      replacements: ['false'],
      reason:
        "The effect's dependency list is [phase], so it never re-runs with an unchanged phase and the dedupe guard can never fire.",
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: "if (phaseRef.current === 'recording' && recorderState.isRecording) {",
      replacements: ['true'],
      reason:
        'Setting hasObservedRecordingRef outside the recording phase is unobservable, because the only transition into recording resets it to false first.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'identityRef.current.ownerId === ownerId &&',
      replacements: ['true'],
      count: 3,
      reason:
        'Every identity change routes through stopForLifecycle, which increments lifecycleEpochRef synchronously before any awaited continuation can read the new identityRef. The epoch operand is already false whenever an identity operand would be.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'identityRef.current.endpoint === endpoint &&',
      replacements: ['true'],
      count: 3,
      reason:
        'Every identity change routes through stopForLifecycle, which increments lifecycleEpochRef synchronously before any awaited continuation can read the new identityRef. The epoch operand is already false whenever an identity operand would be.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'identityRef.current.questionId === questionId &&',
      replacements: ['true'],
      count: 3,
      reason:
        'Every identity change routes through stopForLifecycle, which increments lifecycleEpochRef synchronously before any awaited continuation can read the new identityRef. The epoch operand is already false whenever an identity operand would be.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'LogicalOperator',
      original:
        'lifecycleEpoch === lifecycleEpochRef.current &&\n      identityRef.current.ownerId === ownerId &&',
      replacements: [
        'lifecycleEpoch === lifecycleEpochRef.current || identityRef.current.ownerId === ownerId',
      ],
      lines: [1098],
      reason:
        'Dropping the epoch check in stopRecording lets a superseded stop adopt its take, but the stopForLifecycle that bumped the epoch is awaiting the same native stop promise and immediately re-discards the recording and returns to idle, so the final observable state is identical.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'lifecycleEpoch === lifecycleEpochRef.current &&',
      replacements: ['true'],
      lines: [1098],
      reason:
        'Same as the LogicalOperator on this line: a superseded stop is undone by the lifecycle stop that superseded it before anything is rendered.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!uri) {',
      replacements: ['false'],
      reason:
        'A documented, unreachable fail-closed block: every path that clears activeUriRef also leaves the recorded phase, so uri is non-null wherever this runs. It is annotated "Unreachable by design" in the source.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'BooleanLiteral',
      original: 'cancelRequestedRef.current = false;',
      replacements: ['true'],
      lines: [1172, 1361],
      count: 2,
      reason:
        'cancelRequestedRef is reset before any await of the next submission, so leaving it set here cannot leak into a later run.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!isCurrentSubmission()) return;',
      replacements: ['false'],
      lines: [1214, 1228],
      count: 2,
      reason:
        'The only statement between this guard and the next identical one is a pure filename/MIME computation whose result the later guard discards, and only microtasks separate them.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!controller.signal.aborted) assessmentPostedRef.current = true;',
      replacements: ['true'],
      reason:
        'sleepAbortable rejects on abort, so the retry loop never re-enters with an aborted signal.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!cancelRequestedRef.current) return;',
      replacements: ['false'],
      reason:
        'Every non-user abort originates in stopForLifecycle, which increments the lifecycle epoch first, so the submission-currency guard just above already fails.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: "if (phaseRef.current !== 'uploading') return;",
      replacements: ['false'],
      reason:
        'A controller exists only while the phase is uploading, so this phase test is subsumed by the null check immediately below it.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'OptionalChaining',
      original: 'previewPlayerRef.current?.pause();',
      replacements: ['previewPlayerRef.current.pause'],
      reason:
        'Reachable only while previewPlaying is true, which implies a live player, so the optional chain never short-circuits.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'if (!uri) return;',
      replacements: ['false'],
      reason:
        'A documented, unreachable fail-closed block: every path that clears activeUriRef also leaves the recorded phase, so uri is non-null wherever this runs. It is annotated "Unreachable by design" in the source.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ConditionalExpression',
      original: 'isRecording && styles.recordButtonActive,',
      replacements: ['true', 'false'],
      count: 2,
      reason:
        'recordButtonActive sets backgroundColor to the same colors.danger the base recordButton already uses, so the flattened style is identical whichever way the conditional resolves.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'LogicalOperator',
      original: 'isRecording && styles.recordButtonActive,',
      replacements: ['isRecording || styles.recordButtonActive'],
      reason:
        'Same no-op style: StyleSheet.flatten skips the boolean the || variant produces, leaving the rendered style unchanged.',
    },
    {
      file: 'src/components/Recorder.tsx',
      mutator: 'ObjectLiteral',
      original: 'recordButtonActive: {\n    backgroundColor: colors.danger,\n  },',
      replacements: ['{}'],
      reason:
        'recordButtonActive is byte-identical to the base recordButton fill, so emptying it changes no rendered style.',
    },
  ].map((entry) =>
    Object.freeze({
      ...entry,
      replacements: Object.freeze(entry.replacements),
      // One guard can be reported under more than one span: Stryker mutates each
      // AST node, so `typeof x === 'number'` and the `typeof x && isFinite(x)`
      // pair around it arrive as separate mutants with different source text.
      originals: Object.freeze(entry.originals ?? [entry.original]),
    }),
  ),
);

function normalize(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

/** Accept either a single `original` span or an `originals` list. */
function sourceSpans(entry) {
  return entry.originals ?? [entry.original];
}

/**
 * Some guards repeat verbatim across a file — `if (!isCurrent()) return;` occurs
 * nineteen times in Recorder.tsx, of which exactly two are unkillable. Text alone
 * cannot separate those, so such entries additionally pin the lines they cover.
 * Line numbers do drift, but drifting makes the gate fail and ask for a review,
 * which is the safe direction.
 */
function matchesLine(entry, survivor) {
  return entry.lines === undefined || entry.lines.includes(survivor.line);
}

/**
 * How many mutants an entry is allowed to excuse. Spans are whole source lines,
 * so a line holding several mutants of the same mutator and replacement — a
 * chained condition, say — would let one entry cover a sibling that is killed
 * today and regresses tomorrow. Pinning the count turns that into a failure.
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
        matchesLine(entry, survivor),
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
