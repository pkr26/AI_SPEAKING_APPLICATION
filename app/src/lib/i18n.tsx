import React, { createContext, useContext, useEffect, useMemo } from 'react';

import type { UiLanguage } from './types';
export type { UiLanguage } from './types';

/**
 * Typed UI string catalog.
 *
 * - `en` is the single source of typed keys; every other language must define
 *   exactly the same keys (enforced at compile time by `Record<MessageKey,
 *   string>` and at runtime by the catalog-completeness test).
 * - English source copy is written at CEFR A1 level: short sentences, everyday
 *   words, no jargon. Translations match that register.
 * - Templates support simple `{placeholder}` substitution via `formatTemplate`.
 *
 * Language selection:
 * - Signed in: the account's `uiLanguage`.
 * - Signed out or before an offline profile loads: the device preference,
 *   initially derived from `deviceLanguage()`.
 * - `nativeLanguage` never selects interface copy; it is reserved for
 *   learning help, native answers, and transcription hints.
 *
 * Components read strings with `useT()`/`useI18n()` so they re-render when the
 * language changes. Non-React code (API error mapping, auth errors, recorder
 * callbacks) uses `translate()`, which resolves the active language at call
 * time; the provider keeps that module-level language in sync.
 */

export const SUPPORTED_UI_LANGUAGES: readonly UiLanguage[] = ['en', 'te', 'hi', 'es', 'zh'];

const en = {
  // ----- Shared -----
  'common.tryAgain': 'Try Again',
  'common.cancel': 'Cancel',
  'common.ok': 'OK',
  'common.show': 'Show',
  'common.hide': 'Hide',
  'common.showPassword': 'Show password',
  'common.hidePassword': 'Hide password',
  'common.logOut': 'Log out on all devices',
  'common.backToPractice': 'Back to Practice',
  'label.word': 'Word',
  'label.question': 'Question',

  // ----- "Please wait" lines built from server retry hints -----
  'wait.second': 'Please wait 1 second.',
  'wait.seconds': 'Please wait {count} seconds.',
  'wait.minute': 'Please wait 1 minute.',
  'wait.minutes': 'Please wait {count} minutes.',
  'wait.hour': 'Please wait 1 hour.',
  'wait.hours': 'Please wait {count} hours.',

  // ----- Errors (status- and code-based) -----
  'error.network': 'We could not connect. Please check your internet and try again.',
  'error.timeout': 'This took too long. Please check your internet and try again.',
  'error.tooLarge': 'The recording is too big. Please record a shorter answer.',
  'error.unsupportedFormat':
    'The app cannot use this type of recording. Please record your answer again.',
  'error.cannotAssess':
    'We could not check this recording. Please speak for a moment, and keep your answer under two minutes.',
  'error.conflict':
    'We are still checking an answer, or the question changed. Please wait a moment and try again.',
  'error.tooMany': 'Too many tries. Please wait a little and try again.',
  'error.serverBusy': 'The app is having a problem right now. Please try again later.',
  'error.validation': 'Some information is missing or wrong. Please check it and try again.',
  'error.wrongCredentials': 'Wrong email or password.',
  'error.emailTaken': 'This email already has an account. Please log in.',
  'error.loginAgain': 'Please log in again.',
  'error.forbidden': 'You cannot do this with this account.',
  'error.notFound': 'We could not find this. Please go back and try again.',
  'error.questionChanged': 'This question changed. Please try again with the new question.',
  'error.diagnosticDone': 'Your level test is already finished.',
  'error.stillChecking': 'We are still checking your last answer. Please wait a moment.',
  'error.alreadySent': 'We already got this answer. Please wait a moment and try again.',
  'error.stateChanged': 'Your progress changed. Please try again.',
  'error.dailyLimit': 'You used all your practice for today. Please come back tomorrow.',
  'error.networkDailyLimit':
    'This internet connection used all its practice for today. Please try again tomorrow.',
  'error.busy': 'Many people are practicing right now. Please wait a little and try again.',
  'error.audioInvalid': 'We could not use this recording. Please record your answer again.',
  'error.audioSilent':
    'We did not hear any sound. Check your microphone, then record your answer again.',
  'error.audioTooLong': 'The recording is too long. Please keep your answer under two minutes.',
  'error.audioUnreadable': 'We could not hear this recording. Please record your answer again.',
  'error.checkFailed': 'We could not check your answer. Please try again.',
  // The reset mail carries a code, never a link: this copy must name the thing
  // the user pasted, and the action that fixes it.
  'error.resetInvalid': 'This code does not work or it is too old. Please ask for a new code.',
  'error.upgradeRequired': 'Please update the app to keep using it.',
  'error.assessmentResultIncompatible':
    'This saved answer cannot be shown after the app update. Your questions were reloaded. Please record a new answer.',
  'error.internal': 'Something went wrong. Please try again.',
  'email.invalid': 'Enter a valid email address.',

  // ----- Auth / session -----
  'auth.sessionExpired': 'You were logged out to keep your account safe. Please log in again.',
  'auth.restoreUnavailable': 'We could not open your saved login. Unlock your phone and try again.',
  'auth.logoutCleanupFailed':
    'You are logged out, but the app could not clean up. Please close and open the app before you log in again.',
  'auth.accountDeletedCleanupFailed':
    'Your account was deleted, but the app could not clean up. Please close and open the app before you log in again.',
  'auth.registrationCompletedLoginRequired':
    'Your account was created, but this device could not save the login.',

  // ----- Password rules -----
  'password.tooShort': 'The password must have at least 8 characters.',
  'password.needsLetterAndNumber': 'The password must have at least one letter and one number.',
  'password.tooLong': 'The password is too long. Please use a shorter one.',
  'password.confirmLabel': 'Confirm password',
  'password.confirmPlaceholder': 'Type the password again',
  'password.mismatch': 'The passwords do not match.',
  'password.showConfirmation': 'Show password confirmation',
  'password.hideConfirmation': 'Hide password confirmation',

  // ----- Language names -----
  'language.appLabel': 'App language',
  'language.appHelp': 'Choose the language used by the app on this device.',
  'language.saveFailed': 'The app language changed, but it could not be saved on this device.',
  'language.en': 'English',
  'language.te': 'Telugu',
  'language.hi': 'Hindi',
  'language.es': 'Spanish',
  'language.zh': 'Chinese',

  // ----- Log in -----
  'login.title': 'AI English Coach',
  'login.subtitle': 'Practice speaking English with your AI coach.',
  'login.emailLabel': 'Email',
  'login.emailPlaceholder': 'you@example.com',
  'login.passwordLabel': 'Password',
  'login.passwordPlaceholder': 'Your password',
  'login.submit': 'Log in',
  'login.submitBusy': 'Logging in…',
  'login.failed': 'We could not log you in. Please try again.',
  'login.footerPrompt': 'New here? ',
  'login.footerLink': 'Create account',

  // ----- Create account -----
  'signup.title': 'Create your account',
  'signup.subtitle': 'We will match your practice to your language.',
  'signup.nameLabel': 'Name',
  'signup.namePlaceholder': 'Your name',
  'signup.passwordPlaceholder': 'At least 8 characters, with a letter and a number',
  'signup.languageLabel': 'Mother tongue',
  'signup.languageHelp':
    'Used for translated help and answers in your language. It is separate from the app language.',
  'signup.submit': 'Create account',
  'signup.submitBusy': 'Creating your account…',
  'signup.failed': 'We could not create your account. Please check your information and try again.',
  'signup.createdLoginBanner':
    'Your account was created, but this device could not save the login. Log in with your new password.',
  'signup.footerPrompt': 'Already have an account? ',
  'signup.footerLink': 'Log in',

  // ----- Entry gate -----
  'gate.restoring': 'Opening your account…',
  'gate.loadingProfile': 'Loading your profile…',
  'gate.signingOut': 'Logging you out…',
  'gate.sessionErrorTitle': 'We cannot open your saved login',
  'gate.resetSession': 'Delete saved login',
  'gate.serverErrorTitle': 'We cannot reach the server',
  'gate.profileFailed': 'We could not load your profile. Please try again.',
  'gate.offlineTitle': 'You are offline',
  'gate.offlineBody': 'Your login is still saved. Reconnect to load your profile.',

  // ----- Global connection / upgrade status -----
  'network.offline': 'No internet connection. Your saved work is safe.',
  'network.backOnline': 'Back online',
  'network.offlineTitle': 'You are offline',
  'network.offlineBody': 'Reconnect to load this screen. It will continue automatically.',
  'refresh.updating': 'Updating…',
  'refresh.failedUsingSaved': 'Could not refresh. Showing your saved information.',
  'pagination.safetyStop':
    'This list stopped at its safe display limit. Pull down to refresh the newest items.',
  'upgrade.title': 'Update required',
  'upgrade.body':
    'You need a newer version of AI English Coach to keep using your learning data safely.',
  'upgrade.action': 'Update App',
  'upgrade.actionHint': 'Opens the app store page for AI English Coach.',
  'upgrade.openFailed':
    'We could not open the app store. Please open it and update AI English Coach.',
  'replay.checkingTitle': 'Checking your saved answer',
  'replay.checkingBody': 'Your answer is safe. We are restoring your feedback.',
  'replay.failedTitle': 'We could not restore your feedback',
  'replay.failedBody': 'Your saved answer is still safe. Try again now or check later.',
  'replay.checkLater': 'Check Later',
  'replay.pendingTitle': 'Saved answer waiting',
  'replay.pendingBody': 'Your answer is safe. Check again to restore feedback when it is ready.',
  'replay.checkNow': 'Check Now',

  // ----- Screen titles -----
  'header.diagnostic': 'English Level Test',
  'header.practice': 'Practice',
  'header.help': 'Help',
  'header.attempt': 'Practice Mode',
  'header.feedback': 'Feedback',
  'header.changePassword': 'Change Password',
  'header.deleteAccount': 'Delete Account',

  // ----- Menus -----
  'menu.accountTitle': 'Account',
  'hint.finishRecordingFirst': 'Please finish your recording first.',

  // ----- Diagnostic test -----
  'diag.preparing': 'Getting your test ready…',
  'diag.loadFailedTitle': 'We could not load the test',
  'diag.loadFailed': 'We could not load the test. Please try again.',
  'diag.introTitle': 'Before you start',
  'diag.introWhat': 'This short test finds your English level.',
  'diag.introCount': 'You will answer 2 or 3 questions.',
  'diag.introRecorded': 'Your answers are recorded.',
  'diag.introSpeakEnglish': 'Please speak in English.',
  'diag.introStart': 'Start Test',
  'diag.progress': 'Question {current} of up to {max}',
  'diag.answerSavedTitle': 'Answer saved',
  'diag.answerSavedBody': 'Your answer is saved. You will see your scores at the end of the test.',
  'diag.answerCheckedTitle': 'Answer checked',
  'diag.noSpeechTitle': 'We could not hear you',
  'diag.recordAgain': 'Record Again',
  'diag.scoreLine': '{score}/100 — {result}',
  'diag.passed': 'pass',
  'diag.notPassed': 'not a pass yet',
  'diag.transcriptLabel': 'What we heard',
  'diag.answerQuestion': '{word}: {question}',
  'diag.nextQuestion': 'Next Question',
  'diag.seeLevel': 'See My Level',
  'diag.completeTitle': 'Test complete!',
  'diag.levelIntro': 'Your English level is',
  'diag.levelHint': 'We will give you practice questions for this level.',
  'diag.startPracticing': 'Start Practicing',
  'diag.startPracticingBusy': 'Opening practice…',
  'diag.ackFailedTitle': 'We could not open practice',
  'diag.ackFailed': 'Your level is saved. Please try again to continue.',
  'diag.answersTitle': 'Your answers',
  'diag.answerLine': 'Question {number} — {score}/100 {mark}',
  'diag.assessFailedTitle': 'We could not check your answer',

  // ----- CEFR level explanations -----
  'cefr.A1': 'A1 = beginner',
  'cefr.A2': 'A2 = basic',
  'cefr.B1': 'B1 = intermediate',
  'cefr.B2': 'B2 = upper intermediate',
  'cefr.C1': 'C1 = advanced',
  'cefr.C2': 'C2 = expert',

  // ----- Log out -----
  'logout.failedTitle': 'We could not log you out',
  'logout.failedBody': 'Please check your internet and try again.',
  'logout.localBody':
    'We could not contact the server. You can remove this login from this device; other devices will stay signed in.',
  'logout.thisDevice': 'Sign Out on This Device',
  'logout.cleanupTitle': 'Logged out',

  // ----- Practice -----
  'practice.greeting': 'Hi, {name}',
  'practice.loadingQuestion': 'Loading your question…',
  'practice.loadFailedTitle': 'We could not load a question',
  'practice.loadFailed': 'We could not load a practice question. Please try again.',
  'practice.helpLabel': 'Help for this question',
  'practice.newWord': 'New word',
  'practice.revision': 'Review',
  'practice.attemptChip': 'Try {current} of {max}',
  'practice.progressLine': '{mastered} of {total} words mastered',
  'practice.progressLearning': ' · {count} to review',
  'practice.answerInMyLanguage': 'Answer in my language',
  'practice.answeringNative': 'You are answering in your language — tap for English',
  'practice.settings': 'Settings',

  // ----- First-visit practice explainer -----
  'practiceIntro.title': 'How practice works',
  'practiceIntro.master': 'Score {score} or more to master a word.',
  'practiceIntro.tries': 'You get {count} tries for each word.',
  'practiceIntro.silence': 'If we hear nothing, it does not count. You can try again.',
  'practiceIntro.native':
    'An answer in your language uses one try and checks understanding, but only an English answer can master the word.',
  'practiceIntro.dismiss': 'Got it',

  // ----- Feedback -----
  'feedback.noResultTitle': 'Nothing to show',
  'feedback.noResultBody': 'We could not show this feedback.',
  'feedback.nativeUnderstoodTitle': 'You understood the question!',
  'feedback.nativeUnderstoodBody': 'Your answer makes sense. Now try to say it in English!',
  'feedback.nativeMissedTitle': 'Not quite the answer',
  'feedback.nativeMissedBody':
    'Your answer did not match the question. Look at the example and try again.',
  'feedback.noSpeechTitle': 'We could not hear you',
  'feedback.noSpeechBody':
    'Do not worry — this did not count as a try. Tap the record button, speak clearly, then tap again to stop. You can also get help first.',
  'feedback.nativeNoSpeechBody':
    'Nothing changed in your practice. Please speak clearly and try again in your language.',
  'feedback.masteredTitle': 'Word mastered!',
  'feedback.masteredBody': 'You scored {score} or more — you know this word now!',
  'feedback.passedTitle': 'Great job!',
  'feedback.passedBody': 'You passed! A score of {score} or more masters a word.',
  'feedback.retryTitle': 'Not quite — try {attempt} of {max}',
  'feedback.retryBodyOne': 'You have 1 try left. Read the feedback and try again.',
  'feedback.retryBodyMany': 'You have {count} tries left. Read the feedback and try again.',
  'feedback.finalTitle': 'No more tries',
  'feedback.finalBody': 'Here is what to work on. You will see this word again later.',
  'feedback.scoreLine': '{score} / 100',
  'feedback.scoreMeaning': '{pass} or more is a pass. {master} or more masters the word.',
  'feedback.weHeard': 'We heard',
  'feedback.feedbackLabel': 'Feedback',
  'feedback.finalFeedbackLabel': 'Final feedback',
  'feedback.sayInEnglish': 'Say it in English',
  'feedback.nextQuestion': 'Next Question',
  'feedback.tryInEnglish': 'Try in English',
  'feedback.tryAgainNative': 'Try Again in My Language',
  'feedback.seeHelp': 'See translation and examples',
  'feedback.attemptLine': 'Try {current} of {max}',
  'feedback.attemptStillAvailable': 'Try {current} of {max} is still available',
  'feedback.wordAndQuestion': 'Word and question',
  'feedback.originalTranscript': 'What we heard in {language}',
  'feedback.englishTranslation': 'English translation',
  'feedback.exampleEnglishAnswer': 'Example English answer',
  'feedback.nativeFinalTitle': 'No more tries',
  'feedback.nativeFinalBody': 'This answer used your last try. You will see this word again later.',

  // ----- Help -----
  'help.invalidLinkTitle': 'This link does not work',
  'help.invalidLinkBody': 'Go back to practice and open help from your question.',
  'help.loading': 'Loading help…',
  'help.loadFailedTitle': 'We could not load help',
  'help.loadFailed': 'We could not load help for this question. Please try again.',
  'help.examplesLabel': 'Example sentences',
  'help.exampleNumber': 'Example {number}',
  'help.startPractice': 'Start Practice',

  // ----- Practice Mode (attempt) -----
  'attempt.invalidLinkBody': 'Go back to practice and choose Practice Mode from your question.',
  'attempt.loading': 'Loading question…',
  'attempt.loadFailedTitle': 'We could not load the question',
  'attempt.loadFailed': 'We could not load this question. Please try again.',

  // ----- Change password -----
  'cp.currentLabel': 'Current password',
  'cp.currentPlaceholder': 'Your current password',
  'cp.newLabel': 'New password',
  'cp.confirmLabel': 'Confirm new password',
  'cp.confirmPlaceholder': 'Type the new password again',
  'cp.mismatch': 'The passwords do not match.',
  'cp.sameAsCurrent': 'Choose a password different from your current password.',
  'cp.wrongCurrent': 'Your current password is wrong.',
  'cp.failed': 'We could not change your password. Please try again.',
  'cp.updatedTitle': 'Password updated',
  'cp.updatedBody': 'Your password is changed. Other devices have been signed out.',
  'cp.submit': 'Update Password',
  'cp.submitBusy': 'Updating…',

  // ----- Delete account -----
  'da.warningTitle': 'This cannot be undone',
  'da.warningBody':
    'Deleting your account immediately removes your profile, results, progress, and access to recordings. Stored recording files are then queued for permanent deletion, which may take additional time. This cannot be undone.',
  'da.passwordLabel': 'Enter your password',
  'da.passwordPlaceholder': 'Your password',
  'da.wrongPassword': 'Wrong password.',
  'da.failed': 'We could not delete your account. Please try again.',
  'da.unconfirmed':
    'We could not confirm whether your account was deleted. Reconnect and try signing in before repeating deletion.',
  'da.deletedTitle': 'Account deleted',
  'da.deletedBody':
    'Your account data is deleted and stored recording files are queued for permanent deletion.',
  'da.confirmTitle': 'Delete your account?',
  'da.confirmBody':
    'This permanently deletes your account and progress. Stored recording files remain queued until asynchronous permanent deletion completes.',
  'da.confirmDelete': 'Delete',
  'da.submit': 'Delete My Account',
  'da.submitBusy': 'Deleting…',

  // ----- Route error boundary / not found -----
  'boundary.title': 'Something went wrong',
  'boundary.body': 'Your learning data is safe. Please try this screen again.',
  'notFound.title': 'Page not found',
  'notFound.body': 'This link does not work or is not part of your lesson.',
  'notFound.goHome': 'Go Home',

  // ----- Recorder UI -----
  'recorder.permissionBody':
    'We need the microphone to record your answer. Please allow the microphone for this app in your phone settings, then try again.',
  'recorder.openSettings': 'Open Settings',
  'recorder.openSettingsFailed':
    'We could not open the settings. Please open your phone settings and allow the microphone for this app.',
  'recorder.startLabel': 'Start recording',
  'recorder.stopLabel': 'Stop recording',
  'recorder.startHint': 'Double tap to record your answer',
  'recorder.stopHint': 'Double tap to stop and review your answer',
  'recorder.listening': 'Listening…',
  'recorder.statusRecording': 'Recording… {elapsed} of 2:00 — tap to stop',
  'recorder.statusRecorded': 'Recorded {elapsed} — ready to send. Keep this app open.',
  'recorder.statusRecovering': 'Checking if your last answer was saved…',
  'recorder.statusIdle': 'Tap the microphone to record your answer',
  'recorder.a11yRecording': 'Recording. Tap the microphone to stop.',
  'recorder.a11ySaved': 'Take ready to send. Leaving or closing deletes it.',
  'recorder.a11yUploading': 'Sending and checking your answer.',
  'recorder.a11yRecovering': 'Checking your last answer.',
  'recorder.a11yIdle': 'Ready to record.',
  'recorder.announceStarted': 'Recording started. Tap the microphone to stop.',
  'recorder.stageUploading': 'Sending your answer…',
  'recorder.stageListening': 'The AI coach is listening…',
  'recorder.stageAlmostDone': 'Almost done — thank you for waiting…',
  'recorder.waitHint': 'This is taking longer than usual — checking your result…',
  'recorder.waitingFor': 'Waiting for {elapsed}',
  'recorder.privacyNote': 'We send your recording only after you tap Send Answer.',
  'recorder.retentionNote':
    'Your score, transcript, and feedback are saved either way. Audio is deleted after checking unless you turn on Save this recording.',
  'recorder.saveRecordingLabel': 'Save this recording',
  'recorder.saveRecordingHint':
    'Off by default. When on, this audio stays in Recordings until you delete it.',
  'recorder.play': 'Play',
  'recorder.pause': 'Pause',
  'recorder.playLabel': 'Play your recording',
  'recorder.pauseLabel': 'Pause playback',
  'recorder.submit': 'Send Answer',
  'recorder.rerecord': 'Record Again',
  'recorder.discard': 'Discard Take',
  'recorder.discardHint': 'Delete this unsent recording from this device.',
  'recorder.discardTitle': 'Discard this take?',
  'recorder.discardBody':
    'This unsent recording will be deleted from this device. Nothing will be sent.',
  'recorder.discarded': 'Take discarded. Nothing was sent.',
  'recorder.errDiscardFailed': "We couldn't discard this take safely. Try again.",
  'recorder.cancelHint': 'Stops sending and keeps your recording.',
  'recorder.cancelSending': 'Cancel Sending',
  'recorder.cancelBeforeTransferHint': 'Stops before audio leaves this device and keeps this take.',
  'recorder.cancelAfterTransferHint':
    'Stops submission. A temporary audio upload may remain briefly and will expire.',
  'recorder.stopWaiting': 'Stop Waiting',
  'recorder.stopWaitingHint':
    'Stops checking on this screen. Your answer may already have been sent or saved.',
  'recorder.permissionRetryBody':
    'Microphone access was not allowed. Tap Start recording to ask again.',
  'recorder.permissionGranted': 'Microphone access is on. Tap Start recording.',
  'recorder.oneMinuteLeft': 'One minute left',
  'recorder.thirtySecondsLeft': 'Thirty seconds left',
  'recorder.tenSecondsLeft': 'Ten seconds left',

  // ----- Recorder errors and recovery -----
  'recorder.errRetryInfoUnavailable':
    'We could not read your saved answer info. Please close and open the app, then record again.',
  'recorder.errNothingToConfirm':
    'We could not check if your answer was saved. If you do not see it, please record it again.',
  'recorder.errRetryInfoClear':
    'We could not clear old answer info. Please close and open the app before you record again.',
  'recorder.errRetryInfoUpdate':
    'We could not save your answer info. Please close and open the app to finish.',
  'recorder.errResultSafeRetryInfo':
    'Your result is safe, but we could not save app info. Please close and open the app to finish.',
  'recorder.errBadRecoveryResponse':
    'The server sent something we could not read. Your questions were reloaded.',
  'recorder.errRecoveryMismatch':
    'The server sent information that does not match. Your questions were reloaded.',
  'recorder.errInterruptedSaved': 'Your earlier answer was saved. Your questions were reloaded.',
  'recorder.errCannotDisplay':
    'Your answer was saved, but the app could not show the result. Your questions were reloaded.',
  'recorder.errAlreadyAnswered':
    'This answer was already sent, or the test moved on. Your questions were reloaded.',
  'recorder.errUploadGone':
    'The old upload is gone. Please send your recording again if the question is still there.',
  'recorder.errUploadUnconfirmed':
    'We could not check the old upload. Your questions were reloaded. Record again only if the question is still there.',
  'recorder.errRecoveryExpired':
    'The check for your old answer ended safely. Your questions were reloaded.',
  'recorder.errAnswerSavedRetryInfo':
    'Your answer was saved, but we could not save app info. Please close and open the app to finish.',
  'recorder.errInfoNotSavedNotUploaded':
    'We could not save app info, so your recording was not sent. Please try again.',
  'recorder.errNotSent': 'We could not send your recording. Please try again.',
  'recorder.errDeviceInterrupted':
    'The phone stopped the recording before it was saved. Nothing was sent. Record again when you are ready.',
  'recorder.errBackgroundDiscarded':
    'Your unsent take was deleted when you left the app. Nothing was sent. Record again when you are ready.',
  'recorder.errTooShort': 'The recording was too short. Please record your answer again.',
  'recorder.errSaveFailed': 'We could not save the recording. Please record your answer again.',
  'recorder.errNoRecording': 'No recording was saved. Please record again.',
  'recorder.errStartFailed':
    'We could not start recording. Please check the microphone and try again.',
  'recorder.errAudioReset':
    'We could not reset audio. If sound does not work correctly, close and reopen the app.',
  'recorder.errPlayFailed': 'We could not play your recording. You can still send it.',
  'recorder.errRejected':
    'The server did not accept this recording. Please read the question and try again.',

  // ----- Screen titles (new routes) -----
  'header.home': 'Home',
  'header.history': 'History',
  'header.recordings': 'My recordings',
  'header.settings': 'Settings',
  'header.privacy': 'Privacy Policy',
  'header.terms': 'Terms of Use',

  // ----- Home / progress -----
  'home.levelLabel': 'Your level',
  'home.masteryLabel': 'Words mastered',
  'home.streakNone': 'No streak yet. Practice today to start one!',
  'home.streakOne': '1 day streak',
  'home.streakMany': '{count} day streak',
  'home.dueChip': '{count} due for review',
  'home.dueNone': 'Nothing to review right now.',
  'home.practicedNoneToday': 'No practice yet today.',
  'home.practicedOnceToday': 'You practiced 1 time today.',
  'home.practicedToday': 'You practiced {count} times today.',
  'home.startPractice': 'Start Practice',
  'home.loading': 'Loading your progress…',
  'home.loadFailedTitle': 'We could not load your progress',
  'home.loadFailed': 'We could not load your progress. Please try again.',

  // ----- Session summary -----
  'summary.title': 'Your practice session',
  'summary.attempts': 'Answers sent: {count}',
  'summary.passed': 'Words passed: {count}',
  'summary.mastered': 'Words mastered: {count}',
  'summary.levelUps': 'Level ups: {count}',
  'summary.dismiss': 'Got it',

  // ----- Level-up celebration -----
  'levelUp.title': 'Level up!',
  'levelUp.body': 'You reached {level}!',
  'levelUp.progress': 'You moved from {from} to {to}.',

  // ----- History -----
  'history.loading': 'Loading your answers…',
  'history.loadFailedTitle': 'We could not load your answers',
  'history.loadFailed': 'We could not load your answers. Please try again.',
  'history.emptyTitle': 'No answers yet',
  'history.emptyBody': 'Practice a little — your answers will show here.',
  'history.loadMore': 'Show older answers',
  'history.loadingMore': 'Loading more…',
  'history.contextDiagnostic': 'Level test',
  'history.contextPractice': 'Practice',
  'history.contextNative': 'Answer in your language',
  'history.attemptNo': 'Try {number}',
  'history.showDetails': 'Show details',
  'history.hideDetails': 'Hide details',
  'history.detailsHint': 'Double tap to expand or collapse this answer',

  // ----- Saved recordings -----
  'recordings.loading': 'Loading your recordings…',
  'recordings.loadFailedTitle': 'We could not load your recordings',
  'recordings.loadFailed': 'We could not load your recordings. Please try again.',
  'recordings.emptyTitle': 'No saved recordings',
  'recordings.emptyBody':
    'Turn on Save this recording before you send an answer. Saved recordings will appear here.',
  'recordings.loadMore': 'Show older recordings',
  'recordings.loadingMore': 'Loading more…',
  'recordings.intro':
    'Listen to recordings you submitted, or delete only the audio while keeping your results.',
  'recordings.contextDiagnostic': 'Level test',
  'recordings.contextPractice': 'English practice',
  'recordings.contextNative': 'Answer in your language',
  'recordings.statusAvailable': 'Ready to play',
  'recordings.statusPending': 'Being prepared',
  'recordings.statusUnavailable': 'Unavailable',
  'recordings.checkPending': 'Check pending recordings',
  'recordings.yourRecording': 'Your recording',
  'recordings.playLabel': 'Play your submitted recording',
  'recordings.pauseLabel': 'Pause your submitted recording',
  'recordings.playFailed': 'We could not play this recording. Please try again.',
  'recordings.shareAction': 'Share audio',
  'recordings.shareLabel': 'Share your submitted recording',
  'recordings.shareHint':
    'Downloads a temporary private copy and opens your device’s sharing options.',
  'recordings.sharing': 'Preparing audio…',
  'recordings.shareUnavailable': 'Sharing does not work on this device.',
  'recordings.shareFailed': 'We could not share this recording. Please try again.',
  'recordings.preparing': 'Preparing…',
  'recordings.pending': 'This recording is still being prepared. We will check again briefly.',
  'recordings.unavailable': 'This recording is unavailable.',
  'recordings.deleteTitle': 'Delete this recording?',
  'recordings.deleteBody':
    'The recording will be removed now and its stored audio queued for permanent deletion. Your score, transcript, and feedback will stay.',
  'recordings.deleteBodyNamed':
    'Remove the recording for “{name}” and queue its stored audio for permanent deletion? Your score, transcript, and feedback will stay.',
  'recordings.deleteAction': 'Delete recording',
  'recordings.deleteHint':
    'Removes the recording now and queues stored audio for permanent deletion; your result stays.',
  'recordings.deleteFailed': 'We could not delete this recording. Please try again.',
  'recordings.deleted':
    'Recording removed; stored audio queued for permanent deletion. Your result is still saved.',
  'recordings.progressLabel': 'Recording playback progress',

  // ----- Skip word -----
  'practice.skipWord': 'Skip this word for now',
  'practice.skipFailedTitle': 'We could not skip this word',
  'practice.skipFailed': 'We could not skip this word. Please try again.',

  // ----- Password reset -----
  'login.forgot': 'Forgot password?',
  'reset.requestTitle': 'Reset your password',
  'reset.requestBody': 'Type your email. We will send you a code.',
  'reset.submitRequest': 'Send code',
  'reset.submitRequestBusy': 'Sending…',
  'reset.requestFailed': 'We could not send the code. Please try again.',
  'reset.sentTitle': 'Check your email',
  'reset.sentBody':
    'If an account exists for this email, we sent a code. The code works for 30 minutes.',
  'reset.continue': 'I have the code',
  'reset.resend': 'Send code again',
  'reset.resendBusy': 'Sending again…',
  'reset.newTitle': 'Choose a new password',
  'reset.codeLabel': 'Code from the email',
  'reset.codePlaceholder': 'Paste the code here',
  'reset.submitNew': 'Save new password',
  'reset.submitNewBusy': 'Saving…',
  'reset.doneBanner':
    'Your password is changed and existing sessions were signed out. Please log in.',
  'reset.backToLogin': 'Back to log in',

  // ----- Settings / profile -----
  'settings.profileTitle': 'Your profile',
  'ads.label': 'Advertisement',
  'ads.privacyOptions': 'Ad privacy choices',
  'ads.privacyOptionsHelp': 'Review or change the privacy choices used for ads.',
  'ads.privacyFailed': 'We could not open ad privacy choices. Please try again.',
  'settings.levelLabel': 'English level',
  'settings.appLanguageLabel': 'App language',
  'settings.appLanguageHelp': 'Choose the language used for buttons and messages.',
  'settings.learningLanguageLabel': 'Mother tongue',
  'settings.learningLanguageHelp':
    'Used only for translated help and answers in your language. It does not change buttons or messages; use App language for that.',
  'settings.levelPending': 'Not tested yet',
  'settings.saveName': 'Save name',
  'settings.saveNameBusy': 'Saving…',
  'settings.saved': 'Saved.',
  'settings.updateFailed': 'We could not save your changes. Please try again.',
  'settings.export': 'Export my data',
  'settings.exportBusy': 'Preparing your data…',
  'settings.exportHelp':
    'The JSON includes your learning data and saved-recording details. Audio files and audio bytes are not included.',
  'settings.exportFailed': 'We could not export your data. Please try again.',
  'settings.exportUnavailable': 'Sharing does not work on this device.',
  'settings.recordingsDeleteAll': 'Delete all recordings',
  'settings.recordingsDeleteAllHint':
    'Removes every saved recording while keeping your scores, transcripts, and feedback.',
  'settings.recordingsDeleteAllBusy': 'Deleting recordings…',
  'settings.recordingsDeleteAllTitle': 'Delete all recordings?',
  'settings.recordingsDeleteAllBody':
    'Every saved recording will be removed now and its stored audio queued for permanent deletion. Your scores, transcripts, and feedback will stay. This cannot be undone.',
  'settings.recordingsDeleteAllConfirm': 'Delete all',
  'settings.recordingsDeleteAllSuccess':
    'All recordings were removed; stored audio was queued for permanent deletion. Your results are still saved.',
  'settings.recordingsDeleteAllFailed': 'We could not delete all recordings. Please try again.',
  'settings.retake': 'Restart Level Test',
  'retake.confirmTitle': 'Restart the level test?',
  'retake.confirmBody':
    'This clears the current level-test progress and starts again. Your practice history is kept.',
  'retake.confirm': 'Restart test',
  'retake.failed': 'We could not restart the test. Please try again.',

  // ----- Daily reminder -----
  'reminder.toggleLabel': 'Daily reminder',
  'reminder.timeLabel': 'Reminder time: {time}',
  'reminder.earlier': 'One hour earlier',
  'reminder.later': 'One hour later',
  'reminder.denied':
    'Notifications are off for this app. Please allow them in your phone settings.',
  'reminder.failed': 'We could not set the reminder. Please try again.',
  'reminder.notificationTitle': 'Practice time!',
  'reminder.notificationBody': 'Take a few minutes to practice English today.',

  // ----- Legal summaries -----
  'legal.placeholderNote':
    'Effective August 28, 2026. This summary describes how the current app handles data.',
  'privacy.p1':
    'We store your name, email, password hash, language settings, level, learning progress, assessment results, transcripts, feedback, and metadata for retained recordings. The service also processes request and network information needed for authentication, security, rate limits, reliability, and abuse prevention.',
  'privacy.p2':
    'Submitted audio and transcripts are processed by OpenAI for transcription and learning feedback. Production audio is stored privately with Amazon S3. Password-reset email uses the configured mail delivery service. When ads are enabled and consent permits, Google Mobile Ads and its consent tools process ad-related data. Unsuccessful uploads and audio you choose not to save are temporary; recordings you choose to retain remain until you delete them or your account.',
  'privacy.p3':
    'Settings lets you export the account data currently included in the export, delete individual recordings, change eligible ad privacy choices, or delete your account. Account data is removed immediately when deletion succeeds; stored recording files remain queued until asynchronous permanent deletion completes.',
  'terms.p1':
    'This app provides AI-assisted English practice and estimated CEFR placement. Results and feedback may be incomplete or wrong, are not professional advice, and are not an official certificate.',
  'terms.p2':
    'Keep your credentials private and use only an account you are authorized to use. Do not misuse the service, evade limits, interfere with other users, upload unlawful content, or try to compromise the app or its providers.',
  'terms.p3':
    'Service availability, AI assessments, recordings, ads, limits, and features may change or be unavailable. You may stop using the app and delete your account in Settings. Deleting an account cannot be undone, and stored recording-file cleanup finishes asynchronously.',
} as const;

export type MessageKey = keyof typeof en;

const te: Record<MessageKey, string> = {
  'common.tryAgain': 'మళ్లీ ప్రయత్నించండి',
  'common.cancel': 'రద్దు చేయండి',
  'common.ok': 'సరే',
  'common.show': 'చూపించు',
  'common.hide': 'దాచు',
  'common.showPassword': 'పాస్‌వర్డ్ చూపించు',
  'common.hidePassword': 'పాస్‌వర్డ్ దాచు',
  'common.logOut': 'అన్ని పరికరాల్లో లాగ్ అవుట్',
  'common.backToPractice': 'ప్రాక్టీస్‌కు వెళ్లండి',
  'label.word': 'పదం',
  'label.question': 'ప్రశ్న',

  'wait.second': 'దయచేసి 1 సెకను ఆగండి.',
  'wait.seconds': 'దయచేసి {count} సెకన్లు ఆగండి.',
  'wait.minute': 'దయచేసి 1 నిమిషం ఆగండి.',
  'wait.minutes': 'దయచేసి {count} నిమిషాలు ఆగండి.',
  'wait.hour': 'దయచేసి 1 గంట ఆగండి.',
  'wait.hours': 'దయచేసి {count} గంటలు ఆగండి.',

  'error.network': 'కనెక్ట్ చేయలేకపోయాము. దయచేసి మీ ఇంటర్నెట్ చూసుకుని మళ్లీ ప్రయత్నించండి.',
  'error.timeout': 'ఇది చాలా సమయం తీసుకుంది. దయచేసి మీ ఇంటర్నెట్ చూసుకుని మళ్లీ ప్రయత్నించండి.',
  'error.tooLarge': 'రికార్డింగ్ చాలా పెద్దది. దయచేసి చిన్న జవాబు రికార్డ్ చేయండి.',
  'error.unsupportedFormat':
    'ఈ రకమైన రికార్డింగ్‌ను యాప్ ఉపయోగించలేదు. దయచేసి మీ జవాబును మళ్లీ రికార్డ్ చేయండి.',
  'error.cannotAssess':
    'ఈ రికార్డింగ్‌ను తనిఖీ చేయలేకపోయాము. దయచేసి కాసేపు మాట్లాడండి, మీ జవాబు రెండు నిమిషాల లోపు ఉంచండి.',
  'error.conflict':
    'మేము ఇంకా ఒక జవాబును తనిఖీ చేస్తున్నాము, లేదా ప్రశ్న మారింది. దయచేసి కాసేపు ఆగి మళ్లీ ప్రయత్నించండి.',
  'error.tooMany': 'చాలా సార్లు ప్రయత్నించారు. దయచేసి కాసేపు ఆగి మళ్లీ ప్రయత్నించండి.',
  'error.serverBusy': 'యాప్‌కు ఇప్పుడు సమస్య ఉంది. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.',
  'error.validation': 'కొంత సమాచారం లేదు లేదా తప్పుగా ఉంది. దయచేసి చూసుకుని మళ్లీ ప్రయత్నించండి.',
  'error.wrongCredentials': 'ఇమెయిల్ లేదా పాస్‌వర్డ్ తప్పు.',
  'error.emailTaken': 'ఈ ఇమెయిల్‌కు ఇప్పటికే ఖాతా ఉంది. దయచేసి లాగిన్ అవ్వండి.',
  'error.loginAgain': 'దయచేసి మళ్లీ లాగిన్ అవ్వండి.',
  'error.forbidden': 'ఈ ఖాతాతో మీరు ఇది చేయలేరు.',
  'error.notFound': 'ఇది మాకు కనిపించలేదు. దయచేసి వెనక్కి వెళ్లి మళ్లీ ప్రయత్నించండి.',
  'error.questionChanged': 'ఈ ప్రశ్న మారింది. దయచేసి కొత్త ప్రశ్నతో మళ్లీ ప్రయత్నించండి.',
  'error.diagnosticDone': 'మీ స్థాయి పరీక్ష ఇప్పటికే పూర్తయింది.',
  'error.stillChecking': 'మీ చివరి జవాబును ఇంకా తనిఖీ చేస్తున్నాము. దయచేసి కాసేపు ఆగండి.',
  'error.alreadySent': 'ఈ జవాబు మాకు ఇప్పటికే వచ్చింది. దయచేసి కాసేపు ఆగి మళ్లీ ప్రయత్నించండి.',
  'error.stateChanged': 'మీ పురోగతి మారింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'error.dailyLimit': 'ఈ రోజు ప్రాక్టీస్ అంతా అయిపోయింది. దయచేసి రేపు మళ్లీ రండి.',
  'error.networkDailyLimit':
    'ఈ ఇంటర్నెట్ కనెక్షన్‌కు ఈ రోజు ప్రాక్టీస్ అయిపోయింది. దయచేసి రేపు మళ్లీ ప్రయత్నించండి.',
  'error.busy': 'ఇప్పుడు చాలా మంది ప్రాక్టీస్ చేస్తున్నారు. దయచేసి కాసేపు ఆగి మళ్లీ ప్రయత్నించండి.',
  'error.audioInvalid':
    'ఈ రికార్డింగ్‌ను ఉపయోగించలేకపోయాము. దయచేసి మీ జవాబును మళ్లీ రికార్డ్ చేయండి.',
  'error.audioSilent':
    'మాకు ఏ శబ్దమూ వినిపించలేదు. మీ మైక్రోఫోన్‌ను తనిఖీ చేసి, మీ జవాబును మళ్లీ రికార్డ్ చేయండి.',
  'error.audioTooLong': 'రికార్డింగ్ చాలా పొడవుగా ఉంది. దయచేసి మీ జవాబు రెండు నిమిషాల లోపు ఉంచండి.',
  'error.audioUnreadable':
    'ఈ రికార్డింగ్ మాకు వినిపించలేదు. దయచేసి మీ జవాబును మళ్లీ రికార్డ్ చేయండి.',
  'error.checkFailed': 'మీ జవాబును తనిఖీ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'error.resetInvalid': 'ఈ కోడ్ పనిచేయదు లేదా చాలా పాతది. దయచేసి కొత్త కోడ్ అడగండి.',
  'error.upgradeRequired': 'యాప్‌ను ఉపయోగించడానికి దయచేసి యాప్‌ను అప్‌డేట్ చేయండి.',
  'error.assessmentResultIncompatible':
    'యాప్ అప్‌డేట్ తర్వాత ఈ సేవ్ చేసిన జవాబును చూపలేము. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి. దయచేసి కొత్త జవాబును రికార్డ్ చేయండి.',
  'error.internal': 'ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'email.invalid': 'చెల్లుబాటు అయ్యే ఇమెయిల్ చిరునామాను నమోదు చేయండి.',

  'auth.sessionExpired':
    'మీ ఖాతా భద్రత కోసం మిమ్మల్ని లాగ్ అవుట్ చేశాము. దయచేసి మళ్లీ లాగిన్ అవ్వండి.',
  'auth.restoreUnavailable':
    'మీ సేవ్ చేసిన లాగిన్‌ను తెరవలేకపోయాము. ఫోన్‌ను అన్‌లాక్ చేసి మళ్లీ ప్రయత్నించండి.',
  'auth.logoutCleanupFailed':
    'మీరు లాగ్ అవుట్ అయ్యారు, కానీ యాప్ శుభ్రం చేయలేకపోయింది. మళ్లీ లాగిన్ అయ్యే ముందు యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'auth.accountDeletedCleanupFailed':
    'మీ ఖాతా తొలగించబడింది, కానీ యాప్ శుభ్రం చేయలేకపోయింది. మళ్లీ లాగిన్ అయ్యే ముందు యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'auth.registrationCompletedLoginRequired':
    'మీ ఖాతా సృష్టించబడింది, కానీ ఈ పరికరం లాగిన్‌ను సేవ్ చేయలేకపోయింది.',

  'password.tooShort': 'పాస్‌వర్డ్‌లో కనీసం 8 అక్షరాలు ఉండాలి.',
  'password.needsLetterAndNumber': 'పాస్‌వర్డ్‌లో కనీసం ఒక అక్షరం, ఒక అంకె ఉండాలి.',
  'password.tooLong': 'పాస్‌వర్డ్ చాలా పొడవుగా ఉంది. దయచేసి చిన్నది ఉపయోగించండి.',
  'password.confirmLabel': 'పాస్‌వర్డ్‌ను నిర్ధారించండి',
  'password.confirmPlaceholder': 'పాస్‌వర్డ్‌ను మళ్లీ టైప్ చేయండి',
  'password.mismatch': 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు.',
  'password.showConfirmation': 'పాస్‌వర్డ్ నిర్ధారణను చూపించు',
  'password.hideConfirmation': 'పాస్‌వర్డ్ నిర్ధారణను దాచు',
  'language.appLabel': 'యాప్ భాష',
  'language.appHelp': 'ఈ పరికరంలో యాప్ ఉపయోగించే భాషను ఎంచుకోండి.',
  'language.saveFailed': 'యాప్ భాష మారింది, కానీ ఈ పరికరంలో దాన్ని సేవ్ చేయలేకపోయాము.',
  'language.en': 'ఇంగ్లీష్',
  'language.te': 'తెలుగు',
  'language.hi': 'హిందీ',
  'language.es': 'స్పానిష్',
  'language.zh': 'చైనీస్',

  'login.title': 'AI English Coach',
  'login.subtitle': 'మీ AI కోచ్‌తో ఇంగ్లీష్ మాట్లాడడం ప్రాక్టీస్ చేయండి.',
  'login.emailLabel': 'ఇమెయిల్',
  'login.emailPlaceholder': 'you@example.com',
  'login.passwordLabel': 'పాస్‌వర్డ్',
  'login.passwordPlaceholder': 'మీ పాస్‌వర్డ్',
  'login.submit': 'లాగిన్',
  'login.submitBusy': 'లాగిన్ అవుతోంది…',
  'login.failed': 'మిమ్మల్ని లాగిన్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'login.footerPrompt': 'కొత్తవారా? ',
  'login.footerLink': 'ఖాతా సృష్టించండి',

  'signup.title': 'మీ ఖాతా సృష్టించండి',
  'signup.subtitle': 'మీ భాషకు తగ్గట్టు మీ ప్రాక్టీస్‌ను అమర్చుతాము.',
  'signup.nameLabel': 'పేరు',
  'signup.namePlaceholder': 'మీ పేరు',
  'signup.passwordPlaceholder': 'కనీసం 8 అక్షరాలు, ఒక అక్షరం మరియు ఒక అంకెతో',
  'signup.languageLabel': 'మాతృభాష',
  'signup.languageHelp':
    'అనువదించిన సహాయం మరియు మీ భాషలో జవాబుల కోసం ఉపయోగిస్తాము. ఇది యాప్ భాషకు వేరు.',
  'signup.submit': 'ఖాతా సృష్టించండి',
  'signup.submitBusy': 'మీ ఖాతా సృష్టిస్తున్నాము…',
  'signup.failed': 'మీ ఖాతాను సృష్టించలేకపోయాము. దయచేసి మీ సమాచారం చూసుకుని మళ్లీ ప్రయత్నించండి.',
  'signup.createdLoginBanner':
    'మీ ఖాతా సృష్టించబడింది, కానీ ఈ పరికరం లాగిన్‌ను సేవ్ చేయలేకపోయింది. మీ కొత్త పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి.',
  'signup.footerPrompt': 'ఇప్పటికే ఖాతా ఉందా? ',
  'signup.footerLink': 'లాగిన్',

  'gate.restoring': 'మీ ఖాతా తెరుస్తున్నాము…',
  'gate.loadingProfile': 'మీ ప్రొఫైల్ లోడ్ అవుతోంది…',
  'gate.signingOut': 'మిమ్మల్ని లాగ్ అవుట్ చేస్తున్నాము…',
  'gate.sessionErrorTitle': 'మీ సేవ్ చేసిన లాగిన్‌ను తెరవలేకపోతున్నాము',
  'gate.resetSession': 'సేవ్ చేసిన లాగిన్‌ను తొలగించండి',
  'gate.serverErrorTitle': 'సర్వర్‌కు చేరుకోలేకపోతున్నాము',
  'gate.profileFailed': 'మీ ప్రొఫైల్ లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'gate.offlineTitle': 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు',
  'gate.offlineBody':
    'మీ లాగిన్ ఇంకా సేవ్ అయి ఉంది. మీ ప్రొఫైల్ లోడ్ చేయడానికి ఇంటర్నెట్‌కు మళ్లీ కనెక్ట్ అవ్వండి.',

  'network.offline': 'ఇంటర్నెట్ కనెక్షన్ లేదు. మీరు సేవ్ చేసిన పని సురక్షితం.',
  'network.backOnline': 'మళ్లీ ఆన్‌లైన్‌లో ఉన్నారు',
  'network.offlineTitle': 'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు',
  'network.offlineBody':
    'ఈ స్క్రీన్ లోడ్ కావడానికి మళ్లీ కనెక్ట్ అవ్వండి. అది స్వయంగా కొనసాగుతుంది.',
  'refresh.updating': 'అప్‌డేట్ చేస్తున్నాము…',
  'refresh.failedUsingSaved': 'రిఫ్రెష్ చేయలేకపోయాము. సేవ్ చేసిన సమాచారాన్ని చూపిస్తున్నాము.',
  'pagination.safetyStop':
    'ఈ జాబితా సురక్షిత ప్రదర్శన పరిమితి వద్ద ఆగింది. కొత్త అంశాల కోసం క్రిందికి లాగి రిఫ్రెష్ చేయండి.',
  'upgrade.title': 'అప్‌డేట్ అవసరం',
  'upgrade.body':
    'మీ అభ్యాస డేటాను సురక్షితంగా ఉపయోగించడం కొనసాగించడానికి AI English Coach కొత్త వెర్షన్ అవసరం.',
  'upgrade.action': 'యాప్‌ను అప్‌డేట్ చేయండి',
  'upgrade.actionHint': 'AI English Coach కోసం యాప్ స్టోర్ పేజీని తెరుస్తుంది.',
  'upgrade.openFailed':
    'యాప్ స్టోర్‌ను తెరవలేకపోయాము. దయచేసి దాన్ని తెరిచి AI English Coachను అప్‌డేట్ చేయండి.',
  'replay.checkingTitle': 'మీ సేవ్ చేసిన జవాబును చూస్తున్నాము',
  'replay.checkingBody': 'మీ జవాబు సురక్షితంగా ఉంది. మీ ఫీడ్‌బ్యాక్‌ను తిరిగి తెస్తున్నాము.',
  'replay.failedTitle': 'మీ ఫీడ్‌బ్యాక్‌ను తిరిగి తెచ్చలేకపోయాము',
  'replay.failedBody':
    'మీ సేవ్ చేసిన జవాబు ఇంకా సురక్షితంగా ఉంది. ఇప్పుడు మళ్లీ ప్రయత్నించండి లేదా తర్వాత చూడండి.',
  'replay.checkLater': 'తర్వాత చూడండి',
  'replay.pendingTitle': 'సేవ్ చేసిన జవాబు వేచి ఉంది',
  'replay.pendingBody':
    'మీ జవాబు సురక్షితంగా ఉంది. ఫీడ్‌బ్యాక్ సిద్ధమైనప్పుడు తిరిగి తెచ్చేందుకు మళ్లీ తనిఖీ చేయండి.',
  'replay.checkNow': 'ఇప్పుడే తనిఖీ చేయండి',

  'header.diagnostic': 'ఇంగ్లీష్ స్థాయి పరీక్ష',
  'header.practice': 'ప్రాక్టీస్',
  'header.help': 'సహాయం',
  'header.attempt': 'ప్రాక్టీస్ మోడ్',
  'header.feedback': 'ఫీడ్‌బ్యాక్',
  'header.changePassword': 'పాస్‌వర్డ్ మార్చండి',
  'header.deleteAccount': 'ఖాతా తొలగించండి',

  'menu.accountTitle': 'ఖాతా',
  'hint.finishRecordingFirst': 'దయచేసి ముందుగా మీ రికార్డింగ్ పూర్తి చేయండి.',

  'diag.preparing': 'మీ పరీక్షను సిద్ధం చేస్తున్నాము…',
  'diag.loadFailedTitle': 'పరీక్షను లోడ్ చేయలేకపోయాము',
  'diag.loadFailed': 'పరీక్షను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'diag.introTitle': 'మొదలుపెట్టే ముందు',
  'diag.introWhat': 'ఈ చిన్న పరీక్ష మీ ఇంగ్లీష్ స్థాయిని కనుగొంటుంది.',
  'diag.introCount': 'మీరు 2 లేదా 3 ప్రశ్నలకు జవాబిస్తారు.',
  'diag.introRecorded': 'మీ జవాబులు రికార్డ్ అవుతాయి.',
  'diag.introSpeakEnglish': 'దయచేసి ఇంగ్లీషులో మాట్లాడండి.',
  'diag.introStart': 'పరీక్ష మొదలుపెట్టండి',
  'diag.progress': 'ప్రశ్న {current}, గరిష్ఠంగా {max}లో',
  'diag.answerSavedTitle': 'జవాబు సేవ్ అయింది',
  'diag.answerSavedBody': 'మీ జవాబు సేవ్ అయింది. పరీక్ష చివర మీ స్కోర్లు చూస్తారు.',
  'diag.answerCheckedTitle': 'జవాబు తనిఖీ అయింది',
  'diag.noSpeechTitle': 'మీ మాట వినిపించలేదు',
  'diag.recordAgain': 'మళ్లీ రికార్డ్ చేయండి',
  'diag.scoreLine': '{score}/100 — {result}',
  'diag.passed': 'పాస్',
  'diag.notPassed': 'ఇంకా పాస్ కాలేదు',
  'diag.transcriptLabel': 'మేము విన్నది',
  'diag.answerQuestion': '{word}: {question}',
  'diag.nextQuestion': 'తర్వాతి ప్రశ్న',
  'diag.seeLevel': 'నా స్థాయి చూడండి',
  'diag.completeTitle': 'పరీక్ష పూర్తయింది!',
  'diag.levelIntro': 'మీ ఇంగ్లీష్ స్థాయి',
  'diag.levelHint': 'ఈ స్థాయికి తగిన ప్రాక్టీస్ ప్రశ్నలు ఇస్తాము.',
  'diag.startPracticing': 'ప్రాక్టీస్ మొదలుపెట్టండి',
  'diag.startPracticingBusy': 'ప్రాక్టీస్ తెరుస్తున్నాము…',
  'diag.ackFailedTitle': 'ప్రాక్టీస్ తెరవలేకపోయాము',
  'diag.ackFailed': 'మీ స్థాయి సేవ్ అయింది. కొనసాగడానికి మళ్లీ ప్రయత్నించండి.',
  'diag.answersTitle': 'మీ జవాబులు',
  'diag.answerLine': 'ప్రశ్న {number} — {score}/100 {mark}',
  'diag.assessFailedTitle': 'మీ జవాబును తనిఖీ చేయలేకపోయాము',

  'cefr.A1': 'A1 = ప్రారంభ స్థాయి',
  'cefr.A2': 'A2 = ప్రాథమిక స్థాయి',
  'cefr.B1': 'B1 = మధ్య స్థాయి',
  'cefr.B2': 'B2 = మధ్య స్థాయి పైన',
  'cefr.C1': 'C1 = ఉన్నత స్థాయి',
  'cefr.C2': 'C2 = నిపుణ స్థాయి',

  'logout.failedTitle': 'మిమ్మల్ని లాగ్ అవుట్ చేయలేకపోయాము',
  'logout.failedBody': 'దయచేసి మీ ఇంటర్నెట్ చూసుకుని మళ్లీ ప్రయత్నించండి.',
  'logout.localBody':
    'సర్వర్‌ను సంప్రదించలేకపోయాము. ఈ పరికరం నుంచి లాగిన్‌ను తొలగించవచ్చు; ఇతర పరికరాలు లాగిన్‌లోనే ఉంటాయి.',
  'logout.thisDevice': 'ఈ పరికరంలో లాగ్ అవుట్ చేయండి',
  'logout.cleanupTitle': 'లాగ్ అవుట్ అయ్యారు',

  'practice.greeting': 'హాయ్, {name}',
  'practice.loadingQuestion': 'మీ ప్రశ్న లోడ్ అవుతోంది…',
  'practice.loadFailedTitle': 'ప్రశ్నను లోడ్ చేయలేకపోయాము',
  'practice.loadFailed': 'ప్రాక్టీస్ ప్రశ్నను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'practice.helpLabel': 'ఈ ప్రశ్నకు సహాయం',
  'practice.newWord': 'కొత్త పదం',
  'practice.revision': 'పునశ్చరణ',
  'practice.attemptChip': 'ప్రయత్నం {current} / {max}',
  'practice.progressLine': '{total} పదాల్లో {mastered} నేర్చుకున్నారు',
  'practice.progressLearning': ' · {count} పునశ్చరణలో',
  'practice.answerInMyLanguage': 'నా భాషలో జవాబిస్తాను',
  'practice.answeringNative': 'మీ భాషలో జవాబిస్తున్నారు — ఇంగ్లీష్ కోసం నొక్కండి',
  'practice.settings': 'సెట్టింగ్స్',

  'practiceIntro.title': 'ప్రాక్టీస్ ఎలా పనిచేస్తుంది',
  'practiceIntro.master': 'ఒక పదాన్ని నేర్చుకోవడానికి {score} లేదా ఎక్కువ స్కోర్ చేయండి.',
  'practiceIntro.tries': 'ప్రతి పదానికి మీకు {count} ప్రయత్నాలు ఉంటాయి.',
  'practiceIntro.silence': 'ఏమీ వినిపించకపోతే, అది లెక్కలోకి రాదు. మళ్లీ ప్రయత్నించవచ్చు.',
  'practiceIntro.native':
    'మీ భాషలో జవాబు ఒక ప్రయత్నంగా లెక్కపడుతుంది మరియు అర్థం చేసుకున్నారో చూస్తుంది; పదాన్ని నేర్చుకోవడానికి ఇంగ్లీష్‌లో జవాబు ఇవ్వాలి.',
  'practiceIntro.dismiss': 'అర్థమైంది',

  'feedback.noResultTitle': 'చూపించడానికి ఏమీ లేదు',
  'feedback.noResultBody': 'ఈ ఫీడ్‌బ్యాక్‌ను చూపించలేకపోయాము.',
  'feedback.nativeUnderstoodTitle': 'మీరు ప్రశ్నను అర్థం చేసుకున్నారు!',
  'feedback.nativeUnderstoodBody':
    'మీ జవాబు సరైన అర్థంలో ఉంది. ఇప్పుడు దాన్ని ఇంగ్లీషులో చెప్పడానికి ప్రయత్నించండి!',
  'feedback.nativeMissedTitle': 'జవాబు సరిగ్గా కుదరలేదు',
  'feedback.nativeMissedBody': 'మీ జవాబు ప్రశ్నకు సరిపోలేదు. ఉదాహరణ చూసి మళ్లీ ప్రయత్నించండి.',
  'feedback.noSpeechTitle': 'మీ మాట వినిపించలేదు',
  'feedback.noSpeechBody':
    'బాధపడకండి — ఇది ప్రయత్నంగా లెక్కలోకి రాలేదు. రికార్డ్ బటన్ నొక్కి, స్పష్టంగా మాట్లాడి, ఆపడానికి మళ్లీ నొక్కండి. ముందుగా సహాయం కూడా తీసుకోవచ్చు.',
  'feedback.nativeNoSpeechBody':
    'మీ ప్రాక్టీస్‌లో ఏమీ మారలేదు. దయచేసి స్పష్టంగా మాట్లాడి, మీ భాషలో మళ్లీ ప్రయత్నించండి.',
  'feedback.masteredTitle': 'పదం నేర్చుకున్నారు!',
  'feedback.masteredBody': 'మీరు {score} లేదా ఎక్కువ స్కోర్ చేశారు — ఈ పదం ఇప్పుడు మీదే!',
  'feedback.passedTitle': 'చాలా బాగుంది!',
  'feedback.passedBody':
    'మీరు పాస్ అయ్యారు! {score} లేదా ఎక్కువ స్కోర్ చేస్తే పదం మీ సొంతమవుతుంది.',
  'feedback.retryTitle': 'కుదరలేదు — ప్రయత్నం {attempt} / {max}',
  'feedback.retryBodyOne': 'మీకు ఇంకా 1 ప్రయత్నం ఉంది. ఫీడ్‌బ్యాక్ చదివి మళ్లీ ప్రయత్నించండి.',
  'feedback.retryBodyMany':
    'మీకు ఇంకా {count} ప్రయత్నాలు ఉన్నాయి. ఫీడ్‌బ్యాక్ చదివి మళ్లీ ప్రయత్నించండి.',
  'feedback.finalTitle': 'ప్రయత్నాలు అయిపోయాయి',
  'feedback.finalBody': 'దేనిపై పని చేయాలో ఇదిగో. ఈ పదం మళ్లీ తర్వాత వస్తుంది.',
  'feedback.scoreLine': '{score} / 100',
  'feedback.scoreMeaning': '{pass} లేదా ఎక్కువ అంటే పాస్. {master} లేదా ఎక్కువ అంటే పదం మీ సొంతం.',
  'feedback.weHeard': 'మేము విన్నది',
  'feedback.feedbackLabel': 'ఫీడ్‌బ్యాక్',
  'feedback.finalFeedbackLabel': 'చివరి ఫీడ్‌బ్యాక్',
  'feedback.sayInEnglish': 'ఇంగ్లీషులో చెప్పండి',
  'feedback.nextQuestion': 'తర్వాతి ప్రశ్న',
  'feedback.tryInEnglish': 'ఇంగ్లీషులో ప్రయత్నించండి',
  'feedback.tryAgainNative': 'నా భాషలో మళ్లీ ప్రయత్నిస్తాను',
  'feedback.seeHelp': 'అనువాదం, ఉదాహరణలు చూడండి',
  'feedback.attemptLine': 'ప్రయత్నం {current} / {max}',
  'feedback.attemptStillAvailable': 'ప్రయత్నం {current} / {max} ఇంకా అందుబాటులో ఉంది',
  'feedback.wordAndQuestion': 'పదం మరియు ప్రశ్న',
  'feedback.originalTranscript': '{language}లో మేము విన్నది',
  'feedback.englishTranslation': 'ఇంగ్లీష్ అనువాదం',
  'feedback.exampleEnglishAnswer': 'ఉదాహరణ ఇంగ్లీష్ జవాబు',
  'feedback.nativeFinalTitle': 'ప్రయత్నాలు అయిపోయాయి',
  'feedback.nativeFinalBody':
    'ఈ జవాబు మీ చివరి ప్రయత్నాన్ని ఉపయోగించింది. ఈ పదం తర్వాత మళ్లీ కనిపిస్తుంది.',

  'help.invalidLinkTitle': 'ఈ లింక్ పనిచేయదు',
  'help.invalidLinkBody': 'ప్రాక్టీస్‌కు వెళ్లి, మీ ప్రశ్న నుంచి సహాయం తెరవండి.',
  'help.loading': 'సహాయం లోడ్ అవుతోంది…',
  'help.loadFailedTitle': 'సహాయం లోడ్ చేయలేకపోయాము',
  'help.loadFailed': 'ఈ ప్రశ్నకు సహాయం లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'help.examplesLabel': 'ఉదాహరణ వాక్యాలు',
  'help.exampleNumber': 'ఉదాహరణ {number}',
  'help.startPractice': 'ప్రాక్టీస్ మొదలుపెట్టండి',

  'attempt.invalidLinkBody': 'ప్రాక్టీస్‌కు వెళ్లి, మీ ప్రశ్న నుంచి ప్రాక్టీస్ మోడ్ ఎంచుకోండి.',
  'attempt.loading': 'ప్రశ్న లోడ్ అవుతోంది…',
  'attempt.loadFailedTitle': 'ప్రశ్నను లోడ్ చేయలేకపోయాము',
  'attempt.loadFailed': 'ఈ ప్రశ్నను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',

  'cp.currentLabel': 'ప్రస్తుత పాస్‌వర్డ్',
  'cp.currentPlaceholder': 'మీ ప్రస్తుత పాస్‌వర్డ్',
  'cp.newLabel': 'కొత్త పాస్‌వర్డ్',
  'cp.confirmLabel': 'కొత్త పాస్‌వర్డ్‌ను నిర్ధారించండి',
  'cp.confirmPlaceholder': 'కొత్త పాస్‌వర్డ్‌ను మళ్లీ టైప్ చేయండి',
  'cp.mismatch': 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు.',
  'cp.sameAsCurrent': 'ప్రస్తుత పాస్‌వర్డ్‌కు భిన్నమైన పాస్‌వర్డ్‌ను ఎంచుకోండి.',
  'cp.wrongCurrent': 'మీ ప్రస్తుత పాస్‌వర్డ్ తప్పు.',
  'cp.failed': 'మీ పాస్‌వర్డ్ మార్చలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'cp.updatedTitle': 'పాస్‌వర్డ్ మారింది',
  'cp.updatedBody': 'మీ పాస్‌వర్డ్ మార్చబడింది. ఇతర పరికరాలు లాగ్ అవుట్ అయ్యాయి.',
  'cp.submit': 'పాస్‌వర్డ్ మార్చండి',
  'cp.submitBusy': 'మారుస్తున్నాము…',

  'da.warningTitle': 'దీన్ని వెనక్కి తీసుకోలేరు',
  'da.warningBody':
    'మీ ఖాతాను తొలగిస్తే మీ ప్రొఫైల్, ఫలితాలు, పురోగతి మరియు రికార్డింగ్స్‌కు ప్రాప్యత వెంటనే తొలగిపోతాయి. నిల్వ చేసిన రికార్డింగ్ ఫైళ్లు శాశ్వత తొలగింపుకు క్యూలో చేరతాయి; దీనికి కొంత సమయం పట్టవచ్చు. దీన్ని వెనక్కి తీసుకోలేరు.',
  'da.passwordLabel': 'మీ పాస్‌వర్డ్ నమోదు చేయండి',
  'da.passwordPlaceholder': 'మీ పాస్‌వర్డ్',
  'da.wrongPassword': 'పాస్‌వర్డ్ తప్పు.',
  'da.failed': 'మీ ఖాతాను తొలగించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'da.unconfirmed':
    'మీ ఖాతా తొలగించబడిందో నిర్ధారించలేకపోయాము. మళ్లీ తొలగించే ముందు ఇంటర్నెట్‌కు కనెక్ట్ అయి లాగిన్ ప్రయత్నించండి.',
  'da.deletedTitle': 'ఖాతా తొలగించబడింది',
  'da.deletedBody':
    'మీ ఖాతా డేటా తొలగించబడింది. నిల్వ చేసిన రికార్డింగ్ ఫైళ్లు శాశ్వత తొలగింపుకు క్యూలో ఉన్నాయి.',
  'da.confirmTitle': 'మీ ఖాతాను తొలగించాలా?',
  'da.confirmBody':
    'ఇది మీ ఖాతా మరియు పురోగతిని శాశ్వతంగా తొలగిస్తుంది. నిల్వ చేసిన రికార్డింగ్ ఫైళ్లు నేపథ్యంలో శాశ్వత తొలగింపు పూర్తయ్యే వరకు క్యూలో ఉంటాయి.',
  'da.confirmDelete': 'తొలగించండి',
  'da.submit': 'నా ఖాతాను తొలగించండి',
  'da.submitBusy': 'తొలగిస్తున్నాము…',

  'boundary.title': 'ఏదో తప్పు జరిగింది',
  'boundary.body': 'మీ నేర్చుకున్న డేటా భద్రంగా ఉంది. దయచేసి ఈ స్క్రీన్‌ను మళ్లీ ప్రయత్నించండి.',
  'notFound.title': 'పేజీ కనిపించలేదు',
  'notFound.body': 'ఈ లింక్ పనిచేయదు లేదా మీ పాఠంలో భాగం కాదు.',
  'notFound.goHome': 'హోమ్‌కు వెళ్లండి',

  'recorder.permissionBody':
    'మీ జవాబును రికార్డ్ చేయడానికి మైక్రోఫోన్ కావాలి. దయచేసి ఫోన్ సెట్టింగ్స్‌లో ఈ యాప్‌కు మైక్రోఫోన్ అనుమతించి, మళ్లీ ప్రయత్నించండి.',
  'recorder.openSettings': 'సెట్టింగ్స్ తెరవండి',
  'recorder.openSettingsFailed':
    'సెట్టింగ్స్ తెరవలేకపోయాము. దయచేసి ఫోన్ సెట్టింగ్స్ తెరిచి ఈ యాప్‌కు మైక్రోఫోన్ అనుమతించండి.',
  'recorder.startLabel': 'రికార్డింగ్ మొదలుపెట్టండి',
  'recorder.stopLabel': 'రికార్డింగ్ ఆపండి',
  'recorder.startHint': 'మీ సమాధానం రికార్డ్ చేయడానికి రెండుసార్లు నొక్కండి',
  'recorder.stopHint': 'ఆపి మీ సమాధానాన్ని సమీక్షించడానికి రెండుసార్లు నొక్కండి',
  'recorder.listening': 'వింటున్నాము…',
  'recorder.statusRecording': 'రికార్డ్ అవుతోంది… 2:00లో {elapsed} — ఆపడానికి నొక్కండి',
  'recorder.statusRecorded':
    '{elapsed} రికార్డ్ అయింది — పంపడానికి సిద్ధం. ఈ యాప్‌ను తెరిచి ఉంచండి.',
  'recorder.statusRecovering': 'మీ చివరి జవాబు సేవ్ అయిందో లేదో చూస్తున్నాము…',
  'recorder.statusIdle': 'మీ జవాబును రికార్డ్ చేయడానికి మైక్రోఫోన్ నొక్కండి',
  'recorder.a11yRecording': 'రికార్డ్ అవుతోంది. ఆపడానికి మైక్రోఫోన్ నొక్కండి.',
  'recorder.a11ySaved':
    'టేక్ పంపడానికి సిద్ధంగా ఉంది. యాప్‌ను వదిలితే లేదా మూసితే ఇది తొలగిపోతుంది.',
  'recorder.a11yUploading': 'మీ జవాబును పంపి తనిఖీ చేస్తున్నాము.',
  'recorder.a11yRecovering': 'మీ చివరి జవాబును చూస్తున్నాము.',
  'recorder.a11yIdle': 'రికార్డ్ చేయడానికి సిద్ధం.',
  'recorder.announceStarted': 'రికార్డింగ్ మొదలైంది. ఆపడానికి మైక్రోఫోన్ నొక్కండి.',
  'recorder.stageUploading': 'మీ జవాబును పంపుతున్నాము…',
  'recorder.stageListening': 'AI కోచ్ వింటున్నారు…',
  'recorder.stageAlmostDone': 'దాదాపు అయిపోయింది — ఆగినందుకు ధన్యవాదాలు…',
  'recorder.waitHint': 'ఇది మామూలు కంటే ఎక్కువ సమయం తీసుకుంటోంది — మీ ఫలితాన్ని చూస్తున్నాము…',
  'recorder.waitingFor': '{elapsed} నుంచి వేచి ఉన్నాము',
  'recorder.privacyNote': '“జవాబు పంపండి” నొక్కిన తర్వాత మాత్రమే మీ రికార్డింగ్‌ను పంపుతాము.',
  'recorder.retentionNote':
    'మీ స్కోర్, ట్రాన్స్‌క్రిప్ట్ మరియు సూచనలు ఏ ఎంపిక చేసినా సేవ్ అవుతాయి. “ఈ రికార్డింగ్‌ను సేవ్ చేయండి” ఆన్ చేయకపోతే, తనిఖీ చేసిన తర్వాత ఆడియో తొలగించబడుతుంది.',
  'recorder.saveRecordingLabel': 'ఈ రికార్డింగ్‌ను సేవ్ చేయండి',
  'recorder.saveRecordingHint':
    'డిఫాల్ట్‌గా ఆఫ్‌లో ఉంటుంది. ఆన్ చేస్తే, మీరు తొలగించే వరకు ఈ ఆడియో రికార్డింగ్స్‌లో ఉంటుంది.',
  'recorder.play': 'ప్లే',
  'recorder.pause': 'పాజ్',
  'recorder.playLabel': 'మీ రికార్డింగ్ ప్లే చేయండి',
  'recorder.pauseLabel': 'ప్లేబ్యాక్ పాజ్ చేయండి',
  'recorder.submit': 'జవాబు పంపండి',
  'recorder.rerecord': 'మళ్లీ రికార్డ్ చేయండి',
  'recorder.discard': 'టేక్‌ను తొలగించండి',
  'recorder.discardHint': 'పంపని ఈ రికార్డింగ్‌ను ఈ పరికరం నుంచి తొలగించండి.',
  'recorder.discardTitle': 'ఈ టేక్‌ను తొలగించాలా?',
  'recorder.discardBody': 'పంపని ఈ రికార్డింగ్ ఈ పరికరం నుంచి తొలగించబడుతుంది. ఏదీ పంపబడదు.',
  'recorder.discarded': 'టేక్ తొలగించబడింది. ఏదీ పంపబడలేదు.',
  'recorder.errDiscardFailed': 'ఈ టేక్‌ను సురక్షితంగా తొలగించలేకపోయాము. మళ్లీ ప్రయత్నించండి.',
  'recorder.cancelHint': 'పంపడం ఆపి మీ రికార్డింగ్‌ను ఉంచుతుంది.',
  'recorder.cancelSending': 'పంపడం రద్దు చేయండి',
  'recorder.cancelBeforeTransferHint':
    'ఆడియో ఈ పరికరం నుంచి వెళ్లే ముందు ఆపి, ఈ టేక్‌ను ఉంచుతుంది.',
  'recorder.cancelAfterTransferHint':
    'జవాబు పంపడాన్ని ఆపుతుంది. తాత్కాలిక ఆడియో అప్‌లోడ్ కొద్దిసేపు ఉండి తర్వాత తొలగుతుంది.',
  'recorder.stopWaiting': 'వేచి ఉండటం ఆపండి',
  'recorder.stopWaitingHint':
    'ఈ స్క్రీన్‌లో తనిఖీని ఆపుతుంది. మీ జవాబు ఇప్పటికే పంపబడి లేదా సేవ్ అయి ఉండవచ్చు.',
  'recorder.permissionRetryBody':
    'మైక్రోఫోన్ అనుమతి ఇవ్వలేదు. మళ్లీ అడగడానికి “రికార్డింగ్ మొదలుపెట్టండి” నొక్కండి.',
  'recorder.permissionGranted': 'మైక్రోఫోన్ అనుమతి ఆన్‌లో ఉంది. రికార్డింగ్ మొదలుపెట్టండి.',
  'recorder.oneMinuteLeft': 'ఇంకా ఒక నిమిషం ఉంది',
  'recorder.thirtySecondsLeft': 'ఇంకా ముప్పై సెకన్లు ఉన్నాయి',
  'recorder.tenSecondsLeft': 'ఇంకా పది సెకన్లు ఉన్నాయి',

  'recorder.errRetryInfoUnavailable':
    'మీ సేవ్ చేసిన జవాబు సమాచారం చదవలేకపోయాము. దయచేసి యాప్‌ను మూసి మళ్లీ తెరిచి, మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errNothingToConfirm':
    'మీ జవాబు సేవ్ అయిందో లేదో తనిఖీ చేయలేకపోయాము. అది కనిపించకపోతే, దయచేసి మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errRetryInfoClear':
    'పాత జవాబు సమాచారం తీసేయలేకపోయాము. మళ్లీ రికార్డ్ చేసే ముందు యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'recorder.errRetryInfoUpdate':
    'మీ జవాబు సమాచారం సేవ్ చేయలేకపోయాము. పూర్తి చేయడానికి యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'recorder.errResultSafeRetryInfo':
    'మీ ఫలితం భద్రంగా ఉంది, కానీ యాప్ సమాచారం సేవ్ చేయలేకపోయాము. పూర్తి చేయడానికి యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'recorder.errBadRecoveryResponse':
    'సర్వర్ నుంచి చదవలేని సమాచారం వచ్చింది. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి.',
  'recorder.errRecoveryMismatch':
    'సర్వర్ నుంచి సరిపోలని సమాచారం వచ్చింది. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి.',
  'recorder.errInterruptedSaved': 'మీ ముందటి జవాబు సేవ్ అయింది. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి.',
  'recorder.errCannotDisplay':
    'మీ జవాబు సేవ్ అయింది, కానీ యాప్ ఫలితాన్ని చూపించలేకపోయింది. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి.',
  'recorder.errAlreadyAnswered':
    'ఈ జవాబు ఇప్పటికే పంపబడింది, లేదా పరీక్ష ముందుకు వెళ్లింది. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి.',
  'recorder.errUploadGone':
    'పాత అప్‌లోడ్ ఇక లేదు. ప్రశ్న ఇంకా ఉంటే దయచేసి మీ రికార్డింగ్‌ను మళ్లీ పంపండి.',
  'recorder.errUploadUnconfirmed':
    'పాత అప్‌లోడ్‌ను తనిఖీ చేయలేకపోయాము. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి. ప్రశ్న ఇంకా ఉంటే మాత్రమే మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errRecoveryExpired':
    'మీ పాత జవాబు తనిఖీ సురక్షితంగా ముగిసింది. మీ ప్రశ్నలు మళ్లీ లోడ్ అయ్యాయి.',
  'recorder.errAnswerSavedRetryInfo':
    'మీ జవాబు సేవ్ అయింది, కానీ యాప్ సమాచారం సేవ్ చేయలేకపోయాము. పూర్తి చేయడానికి యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'recorder.errInfoNotSavedNotUploaded':
    'యాప్ సమాచారం సేవ్ చేయలేకపోయాము, అందుకే మీ రికార్డింగ్ పంపబడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'recorder.errNotSent': 'మీ రికార్డింగ్‌ను పంపలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'recorder.errDeviceInterrupted':
    'సేవ్ కాకముందే ఫోన్ రికార్డింగ్‌ను ఆపింది. ఏదీ పంపబడలేదు. సిద్ధంగా ఉన్నప్పుడు మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errBackgroundDiscarded':
    'మీరు యాప్‌ను వదిలినప్పుడు పంపని టేక్ తొలగించబడింది. ఏదీ పంపబడలేదు. సిద్ధంగా ఉన్నప్పుడు మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errTooShort': 'రికార్డింగ్ చాలా చిన్నది. దయచేసి మీ జవాబును మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errSaveFailed':
    'రికార్డింగ్‌ను సేవ్ చేయలేకపోయాము. దయచేసి మీ జవాబును మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errNoRecording': 'రికార్డింగ్ సేవ్ కాలేదు. దయచేసి మళ్లీ రికార్డ్ చేయండి.',
  'recorder.errStartFailed':
    'రికార్డింగ్ మొదలుపెట్టలేకపోయాము. దయచేసి మైక్రోఫోన్ చూసుకుని మళ్లీ ప్రయత్నించండి.',
  'recorder.errAudioReset':
    'ఆడియోను రీసెట్ చేయలేకపోయాము. శబ్దం సరిగా పని చేయకపోతే యాప్‌ను మూసి మళ్లీ తెరవండి.',
  'recorder.errPlayFailed': 'మీ రికార్డింగ్ ప్లే చేయలేకపోయాము. అయినా దాన్ని పంపవచ్చు.',
  'recorder.errRejected':
    'సర్వర్ ఈ రికార్డింగ్‌ను తీసుకోలేదు. దయచేసి ప్రశ్నను చదివి మళ్లీ ప్రయత్నించండి.',

  'header.home': 'హోమ్',
  'header.history': 'చరిత్ర',
  'header.recordings': 'నా రికార్డింగ్స్',
  'header.settings': 'సెట్టింగ్స్',
  'header.privacy': 'గోప్యతా విధానం',
  'header.terms': 'వాడుక నియమాలు',

  'home.levelLabel': 'మీ స్థాయి',
  'home.masteryLabel': 'నేర్చుకున్న పదాలు',
  'home.streakNone': 'ఇంకా వరుస లేదు. ఈ రోజు ప్రాక్టీస్ చేసి మొదలుపెట్టండి!',
  'home.streakOne': '1 రోజు వరుస',
  'home.streakMany': '{count} రోజుల వరుస',
  'home.dueChip': '{count} పునశ్చరణకు సిద్ధం',
  'home.dueNone': 'ఇప్పుడు పునశ్చరణకు ఏమీ లేదు.',
  'home.practicedNoneToday': 'ఈ రోజు ఇంకా ప్రాక్టీస్ చేయలేదు.',
  'home.practicedOnceToday': 'ఈ రోజు మీరు 1 సారి ప్రాక్టీస్ చేశారు.',
  'home.practicedToday': 'ఈ రోజు మీరు {count} సార్లు ప్రాక్టీస్ చేశారు.',
  'home.startPractice': 'ప్రాక్టీస్ మొదలుపెట్టండి',
  'home.loading': 'మీ పురోగతి లోడ్ అవుతోంది…',
  'home.loadFailedTitle': 'మీ పురోగతిని లోడ్ చేయలేకపోయాము',
  'home.loadFailed': 'మీ పురోగతిని లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',

  'summary.title': 'మీ ప్రాక్టీస్ సెషన్',
  'summary.attempts': 'పంపిన జవాబులు: {count}',
  'summary.passed': 'పాస్ అయిన పదాలు: {count}',
  'summary.mastered': 'నేర్చుకున్న పదాలు: {count}',
  'summary.levelUps': 'స్థాయి పెరుగుదలలు: {count}',
  'summary.dismiss': 'అర్థమైంది',

  'levelUp.title': 'స్థాయి పెరిగింది!',
  'levelUp.body': 'మీరు {level}కు చేరుకున్నారు!',
  'levelUp.progress': 'మీరు {from} నుంచి {to}కు వెళ్లారు.',

  'history.loading': 'మీ జవాబులు లోడ్ అవుతున్నాయి…',
  'history.loadFailedTitle': 'మీ జవాబులను లోడ్ చేయలేకపోయాము',
  'history.loadFailed': 'మీ జవాబులను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'history.emptyTitle': 'ఇంకా జవాబులు లేవు',
  'history.emptyBody': 'కాస్త ప్రాక్టీస్ చేయండి — మీ జవాబులు ఇక్కడ కనిపిస్తాయి.',
  'history.loadMore': 'పాత జవాబులు చూపించు',
  'history.loadingMore': 'మరిన్ని లోడ్ అవుతున్నాయి…',
  'history.contextDiagnostic': 'స్థాయి పరీక్ష',
  'history.contextPractice': 'ప్రాక్టీస్',
  'history.contextNative': 'మీ భాషలో జవాబు',
  'history.attemptNo': 'ప్రయత్నం {number}',
  'history.showDetails': 'వివరాలు చూపించు',
  'history.hideDetails': 'వివరాలు దాచు',
  'history.detailsHint': 'ఈ సమాధానాన్ని విప్పుటకు లేదా మూసివేయుటకు రెండుసార్లు నొక్కండి',

  'recordings.loading': 'మీ రికార్డింగ్స్ లోడ్ అవుతున్నాయి…',
  'recordings.loadFailedTitle': 'మీ రికార్డింగ్స్‌ను లోడ్ చేయలేకపోయాము',
  'recordings.loadFailed': 'మీ రికార్డింగ్స్‌ను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'recordings.emptyTitle': 'సేవ్ చేసిన రికార్డింగ్స్ లేవు',
  'recordings.emptyBody':
    'జవాబు పంపే ముందు “ఈ రికార్డింగ్‌ను సేవ్ చేయండి” ఆన్ చేయండి. సేవ్ చేసిన రికార్డింగ్స్ ఇక్కడ కనిపిస్తాయి.',
  'recordings.loadMore': 'పాత రికార్డింగ్స్ చూపించు',
  'recordings.loadingMore': 'మరిన్ని లోడ్ అవుతున్నాయి…',
  'recordings.intro':
    'మీరు పంపిన రికార్డింగ్స్ వినండి, లేదా ఫలితాలను ఉంచుకుని ఆడియోను మాత్రమే తొలగించండి.',
  'recordings.contextDiagnostic': 'స్థాయి పరీక్ష',
  'recordings.contextPractice': 'ఇంగ్లీష్ ప్రాక్టీస్',
  'recordings.contextNative': 'మీ భాషలో జవాబు',
  'recordings.statusAvailable': 'ప్లే చేయడానికి సిద్ధం',
  'recordings.statusPending': 'సిద్ధం అవుతోంది',
  'recordings.statusUnavailable': 'అందుబాటులో లేదు',
  'recordings.checkPending': 'సిద్ధమవుతున్న రికార్డింగ్స్ తనిఖీ చేయండి',
  'recordings.yourRecording': 'మీ రికార్డింగ్',
  'recordings.playLabel': 'మీరు పంపిన రికార్డింగ్ ప్లే చేయండి',
  'recordings.pauseLabel': 'మీరు పంపిన రికార్డింగ్‌ను పాజ్ చేయండి',
  'recordings.playFailed': 'ఈ రికార్డింగ్ ప్లే చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'recordings.shareAction': 'ఆడియోను పంచుకోండి',
  'recordings.shareLabel': 'మీరు పంపిన రికార్డింగ్‌ను పంచుకోండి',
  'recordings.shareHint':
    'తాత్కాలిక ప్రైవేట్ కాపీని డౌన్‌లోడ్ చేసి, మీ ఫోన్‌లోని పంచుకునే ఎంపికలను తెరుస్తుంది.',
  'recordings.sharing': 'ఆడియోను సిద్ధం చేస్తున్నాము…',
  'recordings.shareUnavailable': 'ఈ ఫోన్‌లో పంచుకోవడం పనిచేయదు.',
  'recordings.shareFailed': 'ఈ రికార్డింగ్‌ను పంచుకోలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'recordings.preparing': 'సిద్ధం చేస్తున్నాము…',
  'recordings.pending': 'ఈ రికార్డింగ్ ఇంకా సిద్ధమవుతోంది. కొద్దిసేపు మళ్లీ తనిఖీ చేస్తాము.',
  'recordings.unavailable': 'ఈ రికార్డింగ్ అందుబాటులో లేదు.',
  'recordings.deleteTitle': 'ఈ రికార్డింగ్‌ను తొలగించాలా?',
  'recordings.deleteBody':
    'రికార్డింగ్ ఇప్పుడు తీసివేయబడుతుంది; నిల్వ చేసిన ఆడియో శాశ్వత తొలగింపుకు క్యూలో చేరుతుంది. మీ స్కోరు, ట్రాన్స్‌క్రిప్ట్, ఫీడ్‌బ్యాక్ ఉంటాయి.',
  'recordings.deleteBodyNamed':
    '“{name}” రికార్డింగ్‌ను తీసివేసి, నిల్వ చేసిన ఆడియోను శాశ్వత తొలగింపుకు క్యూలో పెట్టాలా? మీ స్కోరు, ట్రాన్స్‌క్రిప్ట్, ఫీడ్‌బ్యాక్ ఉంటాయి.',
  'recordings.deleteAction': 'రికార్డింగ్ తొలగించు',
  'recordings.deleteHint':
    'రికార్డింగ్‌ను ఇప్పుడు తీసివేసి, ఆడియోను శాశ్వత తొలగింపుకు క్యూలో పెడుతుంది; మీ ఫలితం ఉంటుంది.',
  'recordings.deleteFailed': 'ఈ రికార్డింగ్‌ను తొలగించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'recordings.deleted':
    'రికార్డింగ్ తీసివేయబడింది; నిల్వ చేసిన ఆడియో శాశ్వత తొలగింపుకు క్యూలో ఉంది. మీ ఫలితం ఇంకా సేవ్ అయి ఉంది.',
  'recordings.progressLabel': 'రికార్డింగ్ ప్లేబ్యాక్ పురోగతి',

  'practice.skipWord': 'ఈ పదాన్ని ఇప్పటికి దాటవేయండి',
  'practice.skipFailedTitle': 'ఈ పదాన్ని దాటవేయలేకపోయాము',
  'practice.skipFailed': 'ఈ పదాన్ని దాటవేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',

  'login.forgot': 'పాస్‌వర్డ్ మర్చిపోయారా?',
  'reset.requestTitle': 'మీ పాస్‌వర్డ్ రీసెట్ చేయండి',
  'reset.requestBody': 'మీ ఇమెయిల్ టైప్ చేయండి. మీకు ఒక కోడ్ పంపుతాము.',
  'reset.submitRequest': 'కోడ్ పంపండి',
  'reset.submitRequestBusy': 'పంపుతున్నాము…',
  'reset.requestFailed': 'కోడ్ పంపలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'reset.sentTitle': 'మీ ఇమెయిల్ చూడండి',
  'reset.sentBody': 'ఈ ఇమెయిల్‌కు ఖాతా ఉంటే, ఒక కోడ్ పంపాము. కోడ్ 30 నిమిషాలు పనిచేస్తుంది.',
  'reset.continue': 'నా దగ్గర కోడ్ ఉంది',
  'reset.resend': 'కోడ్‌ను మళ్లీ పంపండి',
  'reset.resendBusy': 'మళ్లీ పంపుతున్నాము…',
  'reset.newTitle': 'కొత్త పాస్‌వర్డ్ ఎంచుకోండి',
  'reset.codeLabel': 'ఇమెయిల్‌లోని కోడ్',
  'reset.codePlaceholder': 'కోడ్‌ను ఇక్కడ పెట్టండి',
  'reset.submitNew': 'కొత్త పాస్‌వర్డ్ సేవ్ చేయండి',
  'reset.submitNewBusy': 'సేవ్ చేస్తున్నాము…',
  'reset.doneBanner':
    'మీ పాస్‌వర్డ్ మారింది మరియు ఉన్న సెషన్లు లాగ్ అవుట్ అయ్యాయి. దయచేసి లాగిన్ అవ్వండి.',
  'reset.backToLogin': 'లాగిన్‌కు వెళ్లండి',

  'settings.profileTitle': 'మీ ప్రొఫైల్',
  'ads.label': 'ప్రకటన',
  'ads.privacyOptions': 'ప్రకటన గోప్యత ఎంపికలు',
  'ads.privacyOptionsHelp': 'ప్రకటనల కోసం ఉపయోగించే గోప్యత ఎంపికలను చూడండి లేదా మార్చండి.',
  'ads.privacyFailed': 'ప్రకటన గోప్యత ఎంపికలను తెరవలేకపోయాము. మళ్లీ ప్రయత్నించండి.',
  'settings.levelLabel': 'ఇంగ్లీష్ స్థాయి',
  'settings.appLanguageLabel': 'యాప్ భాష',
  'settings.appLanguageHelp': 'బటన్లు మరియు సందేశాల కోసం ఉపయోగించే భాషను ఎంచుకోండి.',
  'settings.learningLanguageLabel': 'మాతృభాష',
  'settings.learningLanguageHelp':
    'అనువదించిన సహాయం మరియు మీ భాషలో జవాబుల కోసం మాత్రమే ఉపయోగిస్తాము. ఇది బటన్లు లేదా సందేశాలను మార్చదు; వాటికి యాప్ భాషను ఉపయోగించండి.',
  'settings.levelPending': 'ఇంకా పరీక్ష చేయలేదు',
  'settings.saveName': 'పేరు సేవ్ చేయండి',
  'settings.saveNameBusy': 'సేవ్ చేస్తున్నాము…',
  'settings.saved': 'సేవ్ అయింది.',
  'settings.updateFailed': 'మీ మార్పులను సేవ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'settings.export': 'నా డేటాను ఎగుమతి చేయండి',
  'settings.exportBusy': 'మీ డేటాను సిద్ధం చేస్తున్నాము…',
  'settings.exportHelp':
    'JSONలో మీ అభ్యాస డేటా మరియు సేవ్ చేసిన రికార్డింగ్ వివరాలు ఉంటాయి. ఆడియో ఫైళ్లు లేదా ఆడియో బైట్లు ఉండవు.',
  'settings.exportFailed': 'మీ డేటాను ఎగుమతి చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'settings.exportUnavailable': 'ఈ ఫోన్‌లో పంచుకోవడం పనిచేయదు.',
  'settings.recordingsDeleteAll': 'అన్ని రికార్డింగ్స్ తొలగించండి',
  'settings.recordingsDeleteAllHint':
    'మీ స్కోర్లు, ట్రాన్స్‌క్రిప్ట్స్, ఫీడ్‌బ్యాక్‌ను ఉంచి, సేవ్ చేసిన అన్ని రికార్డింగ్స్‌ను తీసివేస్తుంది.',
  'settings.recordingsDeleteAllBusy': 'రికార్డింగ్స్ తొలగిస్తున్నాము…',
  'settings.recordingsDeleteAllTitle': 'అన్ని రికార్డింగ్స్‌ను తొలగించాలా?',
  'settings.recordingsDeleteAllBody':
    'సేవ్ చేసిన అన్ని రికార్డింగ్స్ ఇప్పుడు తీసివేయబడతాయి; వాటి నిల్వ ఆడియో శాశ్వత తొలగింపుకు క్యూలో చేరుతుంది. మీ స్కోర్లు, ట్రాన్స్‌క్రిప్ట్స్, ఫీడ్‌బ్యాక్ ఉంటాయి. దీన్ని తిరిగి మార్చలేరు.',
  'settings.recordingsDeleteAllConfirm': 'అన్నీ తొలగించండి',
  'settings.recordingsDeleteAllSuccess':
    'అన్ని రికార్డింగ్స్ తీసివేయబడ్డాయి; నిల్వ ఆడియో శాశ్వత తొలగింపుకు క్యూలో ఉంది. మీ ఫలితాలు ఇంకా సేవ్ అయి ఉన్నాయి.',
  'settings.recordingsDeleteAllFailed':
    'అన్ని రికార్డింగ్స్‌ను తొలగించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'settings.retake': 'స్థాయి పరీక్షను మళ్లీ ప్రారంభించండి',
  'retake.confirmTitle': 'స్థాయి పరీక్షను మళ్లీ ప్రారంభించాలా?',
  'retake.confirmBody':
    'ఇది ప్రస్తుత స్థాయి పరీక్ష పురోగతిని తొలగించి మళ్లీ మొదలుపెడుతుంది. మీ ప్రాక్టీస్ చరిత్ర అలాగే ఉంటుంది.',
  'retake.confirm': 'పరీక్షను మళ్లీ ప్రారంభించండి',
  'retake.failed': 'పరీక్షను మళ్లీ మొదలుపెట్టలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',

  'reminder.toggleLabel': 'రోజువారీ గుర్తు',
  'reminder.timeLabel': 'గుర్తు సమయం: {time}',
  'reminder.earlier': 'ఒక గంట ముందు',
  'reminder.later': 'ఒక గంట తర్వాత',
  'reminder.denied':
    'ఈ యాప్‌కు నోటిఫికేషన్లు ఆఫ్ ఉన్నాయి. దయచేసి ఫోన్ సెట్టింగ్స్‌లో వాటిని అనుమతించండి.',
  'reminder.failed': 'గుర్తును సెట్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'reminder.notificationTitle': 'ప్రాక్టీస్ సమయం!',
  'reminder.notificationBody': 'ఈ రోజు కొన్ని నిమిషాలు ఇంగ్లీష్ ప్రాక్టీస్ చేయండి.',

  'legal.placeholderNote':
    'ఆగస్టు 28, 2026 నుండి అమల్లో ఉంది. ప్రస్తుత యాప్ డేటాను ఎలా నిర్వహిస్తుందో ఈ సారాంశం వివరిస్తుంది.',
  'privacy.p1':
    'మీ పేరు, ఇమెయిల్, పాస్‌వర్డ్ హాష్, భాష సెట్టింగ్స్, స్థాయి, అభ్యాస పురోగతి, అంచనా ఫలితాలు, ట్రాన్స్‌క్రిప్ట్స్, ఫీడ్‌బ్యాక్ మరియు నిల్వ చేసిన రికార్డింగ్స్ మెటాడేటాను ఉంచుతాము. ధృవీకరణ, భద్రత, రేట్ లిమిట్స్, విశ్వసనీయత మరియు దుర్వినియోగ నిరోధానికి అవసరమైన అభ్యర్థన, నెట్‌వర్క్ సమాచారాన్ని కూడా సేవ ప్రాసెస్ చేస్తుంది.',
  'privacy.p2':
    'పంపిన ఆడియో మరియు ట్రాన్స్‌క్రిప్ట్స్‌ను లిప్యంతరీకరణ, అభ్యాస ఫీడ్‌బ్యాక్ కోసం OpenAI ప్రాసెస్ చేస్తుంది. ప్రొడక్షన్ ఆడియో Amazon S3లో ప్రైవేట్‌గా నిల్వ అవుతుంది. పాస్‌వర్డ్ రీసెట్ ఇమెయిల్ కాన్ఫిగర్ చేసిన మెయిల్ సేవను ఉపయోగిస్తుంది. ప్రకటనలు ఆన్ ఉండి సమ్మతి అనుమతిస్తే Google Mobile Ads మరియు దాని సమ్మతి సాధనాలు ప్రకటన డేటాను ప్రాసెస్ చేస్తాయి. విఫలమైన అప్‌లోడ్లు మరియు మీరు సేవ్ చేయకూడదని ఎంచుకున్న ఆడియో తాత్కాలికం; మీరు సేవ్ చేయాలని ఎంచుకున్న రికార్డింగ్స్‌ను లేదా ఖాతాను తొలగించే వరకు అవి ఉంటాయి.',
  'privacy.p3':
    'సెట్టింగ్స్‌లో ప్రస్తుతం ఎగుమతిలో ఉన్న ఖాతా డేటాను ఎగుమతి చేయవచ్చు, ఒక్కో రికార్డింగ్‌ను తొలగించవచ్చు, అందుబాటులో ఉన్న ప్రకటన గోప్యత ఎంపికలను మార్చవచ్చు లేదా ఖాతాను తొలగించవచ్చు. ఖాతా తొలగింపు విజయవంతమైన వెంటనే ఖాతా డేటా పోతుంది; నిల్వ చేసిన రికార్డింగ్ ఫైళ్లు నేపథ్యంలో శాశ్వత తొలగింపు పూర్తయ్యే వరకు క్యూలో ఉంటాయి.',
  'terms.p1':
    'ఈ యాప్ AI సహాయంతో ఇంగ్లీష్ ప్రాక్టీస్ మరియు అంచనా CEFR స్థాయిని అందిస్తుంది. ఫలితాలు, ఫీడ్‌బ్యాక్ అసంపూర్ణంగా లేదా తప్పుగా ఉండవచ్చు; ఇవి వృత్తిపరమైన సలహా లేదా అధికారిక సర్టిఫికెట్ కావు.',
  'terms.p2':
    'మీ లాగిన్ వివరాలను రహస్యంగా ఉంచండి మరియు మీకు అధికారం ఉన్న ఖాతానే ఉపయోగించండి. సేవను దుర్వినియోగం చేయవద్దు, పరిమితులను తప్పించవద్దు, ఇతరులకు ఆటంకం కలిగించవద్దు, చట్టవిరుద్ధ కంటెంట్ అప్‌లోడ్ చేయవద్దు లేదా యాప్/సేవలను దెబ్బతీయడానికి ప్రయత్నించవద్దు.',
  'terms.p3':
    'సేవ, AI అంచనాలు, రికార్డింగ్స్, ప్రకటనలు, పరిమితులు మరియు ఫీచర్లు మారవచ్చు లేదా అందుబాటులో ఉండకపోవచ్చు. సెట్టింగ్స్‌లో ఖాతాను తొలగించి యాప్ వాడటం ఆపవచ్చు. ఖాతా తొలగింపును వెనక్కి తీసుకోలేరు; రికార్డింగ్ ఫైళ్ల తొలగింపు నేపథ్యంలో పూర్తవుతుంది.',
};

const hi: Record<MessageKey, string> = {
  'common.tryAgain': 'फिर से कोशिश करें',
  'common.cancel': 'रद्द करें',
  'common.ok': 'ठीक है',
  'common.show': 'दिखाएँ',
  'common.hide': 'छिपाएँ',
  'common.showPassword': 'पासवर्ड दिखाएँ',
  'common.hidePassword': 'पासवर्ड छिपाएँ',
  'common.logOut': 'सभी डिवाइस से लॉग आउट',
  'common.backToPractice': 'प्रैक्टिस पर जाएँ',
  'label.word': 'शब्द',
  'label.question': 'सवाल',

  'wait.second': 'कृपया 1 सेकंड रुकें।',
  'wait.seconds': 'कृपया {count} सेकंड रुकें।',
  'wait.minute': 'कृपया 1 मिनट रुकें।',
  'wait.minutes': 'कृपया {count} मिनट रुकें।',
  'wait.hour': 'कृपया 1 घंटा रुकें।',
  'wait.hours': 'कृपया {count} घंटे रुकें।',

  'error.network': 'कनेक्ट नहीं हो पाया। कृपया अपना इंटरनेट देखें और फिर से कोशिश करें।',
  'error.timeout': 'इसमें बहुत समय लग गया। कृपया अपना इंटरनेट देखें और फिर से कोशिश करें।',
  'error.tooLarge': 'रिकॉर्डिंग बहुत बड़ी है। कृपया छोटा जवाब रिकॉर्ड करें।',
  'error.unsupportedFormat':
    'ऐप इस तरह की रिकॉर्डिंग नहीं चला सकता। कृपया अपना जवाब फिर से रिकॉर्ड करें।',
  'error.cannotAssess':
    'हम इस रिकॉर्डिंग की जाँच नहीं कर पाए। कृपया थोड़ी देर बोलें और अपना जवाब दो मिनट से कम रखें।',
  'error.conflict':
    'हम अभी एक जवाब की जाँच कर रहे हैं, या सवाल बदल गया है। कृपया थोड़ा रुकें और फिर से कोशिश करें।',
  'error.tooMany': 'बहुत बार कोशिश की गई। कृपया थोड़ा रुकें और फिर से कोशिश करें।',
  'error.serverBusy': 'ऐप में अभी कोई समस्या है। कृपया बाद में फिर से कोशिश करें।',
  'error.validation': 'कुछ जानकारी गलत है या भरी नहीं गई। कृपया जाँच कर फिर से कोशिश करें।',
  'error.wrongCredentials': 'ईमेल या पासवर्ड गलत है।',
  'error.emailTaken': 'इस ईमेल से पहले से खाता है। कृपया लॉग इन करें।',
  'error.loginAgain': 'कृपया फिर से लॉग इन करें।',
  'error.forbidden': 'इस खाते से आप यह नहीं कर सकते।',
  'error.notFound': 'यह हमें नहीं मिला। कृपया वापस जाएँ और फिर से कोशिश करें।',
  'error.questionChanged': 'यह सवाल बदल गया है। कृपया नए सवाल के साथ फिर से कोशिश करें।',
  'error.diagnosticDone': 'आपका स्तर टेस्ट पहले ही पूरा हो चुका है।',
  'error.stillChecking': 'हम अभी आपके पिछले जवाब की जाँच कर रहे हैं। कृपया थोड़ा रुकें।',
  'error.alreadySent': 'यह जवाब हमें पहले ही मिल गया है। कृपया थोड़ा रुकें और फिर से कोशिश करें।',
  'error.stateChanged': 'आपकी प्रगति बदल गई है। कृपया फिर से कोशिश करें।',
  'error.dailyLimit': 'आज की सारी प्रैक्टिस पूरी हो गई। कृपया कल फिर आएँ।',
  'error.networkDailyLimit':
    'इस इंटरनेट कनेक्शन की आज की प्रैक्टिस पूरी हो गई। कृपया कल फिर से कोशिश करें।',
  'error.busy': 'अभी बहुत से लोग प्रैक्टिस कर रहे हैं। कृपया थोड़ा रुकें और फिर से कोशिश करें।',
  'error.audioInvalid':
    'हम इस रिकॉर्डिंग का इस्तेमाल नहीं कर पाए। कृपया अपना जवाब फिर से रिकॉर्ड करें।',
  'error.audioSilent':
    'हमें कोई आवाज़ नहीं सुनाई दी। अपना माइक्रोफ़ोन जाँचें, फिर अपना जवाब दोबारा रिकॉर्ड करें।',
  'error.audioTooLong': 'रिकॉर्डिंग बहुत लंबी है। कृपया अपना जवाब दो मिनट से कम रखें।',
  'error.audioUnreadable': 'हमें यह रिकॉर्डिंग सुनाई नहीं दी। कृपया अपना जवाब फिर से रिकॉर्ड करें।',
  'error.checkFailed': 'हम आपके जवाब की जाँच नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'error.resetInvalid': 'यह कोड काम नहीं करता या बहुत पुराना है। कृपया नया कोड माँगें।',
  'error.upgradeRequired': 'ऐप का इस्तेमाल जारी रखने के लिए कृपया ऐप अपडेट करें।',
  'error.assessmentResultIncompatible':
    'ऐप अपडेट के बाद यह सेव किया हुआ जवाब नहीं दिखाया जा सकता। आपके सवाल दोबारा लोड किए गए हैं। कृपया नया जवाब रिकॉर्ड करें।',
  'error.internal': 'कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।',
  'email.invalid': 'एक सही ईमेल पता दर्ज करें।',

  'auth.sessionExpired':
    'आपके खाते की सुरक्षा के लिए आपको लॉग आउट कर दिया गया। कृपया फिर से लॉग इन करें।',
  'auth.restoreUnavailable':
    'हम आपका सेव किया हुआ लॉगिन नहीं खोल पाए। फ़ोन अनलॉक करें और फिर से कोशिश करें।',
  'auth.logoutCleanupFailed':
    'आप लॉग आउट हो गए हैं, लेकिन ऐप सफ़ाई नहीं कर पाया। फिर से लॉग इन करने से पहले ऐप बंद करके दोबारा खोलें।',
  'auth.accountDeletedCleanupFailed':
    'आपका खाता हटा दिया गया, लेकिन ऐप सफ़ाई नहीं कर पाया। फिर से लॉग इन करने से पहले ऐप बंद करके दोबारा खोलें।',
  'auth.registrationCompletedLoginRequired':
    'आपका खाता बन गया, लेकिन यह डिवाइस लॉगिन सेव नहीं कर पाया।',

  'password.tooShort': 'पासवर्ड में कम से कम 8 अक्षर होने चाहिए।',
  'password.needsLetterAndNumber': 'पासवर्ड में कम से कम एक अक्षर और एक अंक होना चाहिए।',
  'password.tooLong': 'पासवर्ड बहुत लंबा है। कृपया छोटा पासवर्ड चुनें।',
  'password.confirmLabel': 'पासवर्ड की पुष्टि करें',
  'password.confirmPlaceholder': 'पासवर्ड फिर से लिखें',
  'password.mismatch': 'पासवर्ड मेल नहीं खाते।',
  'password.showConfirmation': 'पासवर्ड पुष्टि दिखाएँ',
  'password.hideConfirmation': 'पासवर्ड पुष्टि छिपाएँ',
  'language.appLabel': 'ऐप की भाषा',
  'language.appHelp': 'इस डिवाइस पर ऐप में इस्तेमाल होने वाली भाषा चुनें।',
  'language.saveFailed': 'ऐप की भाषा बदल गई, लेकिन हम इसे इस डिवाइस पर सेव नहीं कर पाए।',
  'language.en': 'अंग्रेज़ी',
  'language.te': 'तेलुगु',
  'language.hi': 'हिन्दी',
  'language.es': 'स्पेनिश',
  'language.zh': 'चीनी',

  'login.title': 'AI English Coach',
  'login.subtitle': 'अपने AI कोच के साथ अंग्रेज़ी बोलने की प्रैक्टिस करें।',
  'login.emailLabel': 'ईमेल',
  'login.emailPlaceholder': 'you@example.com',
  'login.passwordLabel': 'पासवर्ड',
  'login.passwordPlaceholder': 'आपका पासवर्ड',
  'login.submit': 'लॉग इन करें',
  'login.submitBusy': 'लॉग इन हो रहा है…',
  'login.failed': 'हम आपको लॉग इन नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'login.footerPrompt': 'नए हैं? ',
  'login.footerLink': 'खाता बनाएँ',

  'signup.title': 'अपना खाता बनाएँ',
  'signup.subtitle': 'हम आपकी प्रैक्टिस आपकी भाषा के हिसाब से बनाएँगे।',
  'signup.nameLabel': 'नाम',
  'signup.namePlaceholder': 'आपका नाम',
  'signup.passwordPlaceholder': 'कम से कम 8 अक्षर, एक अक्षर और एक अंक के साथ',
  'signup.languageLabel': 'मातृभाषा',
  'signup.languageHelp':
    'अनुवादित मदद और अपनी भाषा में जवाब देने के लिए इसका उपयोग होता है। यह ऐप की भाषा से अलग है।',
  'signup.submit': 'खाता बनाएँ',
  'signup.submitBusy': 'आपका खाता बन रहा है…',
  'signup.failed': 'हम आपका खाता नहीं बना पाए। कृपया अपनी जानकारी जाँचें और फिर से कोशिश करें।',
  'signup.createdLoginBanner':
    'आपका खाता बन गया, लेकिन यह डिवाइस लॉगिन सेव नहीं कर पाया। अपने नए पासवर्ड से लॉग इन करें।',
  'signup.footerPrompt': 'पहले से खाता है? ',
  'signup.footerLink': 'लॉग इन करें',

  'gate.restoring': 'आपका खाता खुल रहा है…',
  'gate.loadingProfile': 'आपकी प्रोफ़ाइल लोड हो रही है…',
  'gate.signingOut': 'आपको लॉग आउट किया जा रहा है…',
  'gate.sessionErrorTitle': 'हम आपका सेव किया हुआ लॉगिन नहीं खोल पा रहे',
  'gate.resetSession': 'सेव किया हुआ लॉगिन हटाएँ',
  'gate.serverErrorTitle': 'हम सर्वर से जुड़ नहीं पा रहे',
  'gate.profileFailed': 'हम आपकी प्रोफ़ाइल लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'gate.offlineTitle': 'आप ऑफ़लाइन हैं',
  'gate.offlineBody':
    'आपका लॉगिन अभी भी सुरक्षित है। अपनी प्रोफ़ाइल लोड करने के लिए इंटरनेट से फिर जुड़ें।',

  'network.offline': 'इंटरनेट कनेक्शन नहीं है। आपका सहेजा हुआ काम सुरक्षित है।',
  'network.backOnline': 'फिर से ऑनलाइन',
  'network.offlineTitle': 'आप ऑफ़लाइन हैं',
  'network.offlineBody': 'यह स्क्रीन लोड करने के लिए फिर जुड़ें। यह अपने आप जारी रहेगी।',
  'refresh.updating': 'अपडेट हो रहा है…',
  'refresh.failedUsingSaved': 'रीफ़्रेश नहीं हो सका। आपकी सेव की हुई जानकारी दिखाई जा रही है।',
  'pagination.safetyStop':
    'यह सूची सुरक्षित प्रदर्शन सीमा पर रुक गई। नई चीज़ें देखने के लिए नीचे खींचकर रीफ़्रेश करें।',
  'upgrade.title': 'अपडेट ज़रूरी है',
  'upgrade.body':
    'अपने सीखने के डेटा का सुरक्षित उपयोग जारी रखने के लिए AI English Coach का नया संस्करण चाहिए।',
  'upgrade.action': 'ऐप अपडेट करें',
  'upgrade.actionHint': 'AI English Coach का ऐप स्टोर पेज खोलता है।',
  'upgrade.openFailed':
    'हम ऐप स्टोर नहीं खोल पाए। कृपया उसे खोलें और AI English Coach को अपडेट करें।',
  'replay.checkingTitle': 'आपका सेव किया हुआ जवाब देखा जा रहा है',
  'replay.checkingBody': 'आपका जवाब सुरक्षित है। हम आपका फ़ीडबैक वापस ला रहे हैं।',
  'replay.failedTitle': 'हम आपका फ़ीडबैक वापस नहीं ला पाए',
  'replay.failedBody':
    'आपका सेव किया हुआ जवाब अभी सुरक्षित है। अभी फिर कोशिश करें या बाद में देखें।',
  'replay.checkLater': 'बाद में देखें',
  'replay.pendingTitle': 'सेव किया गया जवाब इंतज़ार में है',
  'replay.pendingBody':
    'आपका जवाब सुरक्षित है। फ़ीडबैक तैयार होने पर उसे वापस लाने के लिए फिर से जाँचें।',
  'replay.checkNow': 'अभी जाँचें',

  'header.diagnostic': 'अंग्रेज़ी स्तर टेस्ट',
  'header.practice': 'प्रैक्टिस',
  'header.help': 'मदद',
  'header.attempt': 'प्रैक्टिस मोड',
  'header.feedback': 'फ़ीडबैक',
  'header.changePassword': 'पासवर्ड बदलें',
  'header.deleteAccount': 'खाता हटाएँ',

  'menu.accountTitle': 'खाता',
  'hint.finishRecordingFirst': 'कृपया पहले अपनी रिकॉर्डिंग पूरी करें।',

  'diag.preparing': 'आपका टेस्ट तैयार हो रहा है…',
  'diag.loadFailedTitle': 'हम टेस्ट लोड नहीं कर पाए',
  'diag.loadFailed': 'हम टेस्ट लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'diag.introTitle': 'शुरू करने से पहले',
  'diag.introWhat': 'यह छोटा टेस्ट आपका अंग्रेज़ी स्तर पता करता है।',
  'diag.introCount': 'आप 2 या 3 सवालों के जवाब देंगे।',
  'diag.introRecorded': 'आपके जवाब रिकॉर्ड होते हैं।',
  'diag.introSpeakEnglish': 'कृपया अंग्रेज़ी में बोलें।',
  'diag.introStart': 'टेस्ट शुरू करें',
  'diag.progress': 'सवाल {current}, ज़्यादा से ज़्यादा {max} में से',
  'diag.answerSavedTitle': 'जवाब सेव हो गया',
  'diag.answerSavedBody': 'आपका जवाब सेव हो गया है। टेस्ट के अंत में आप अपने स्कोर देखेंगे।',
  'diag.answerCheckedTitle': 'जवाब जाँचा गया',
  'diag.noSpeechTitle': 'हम आपको सुन नहीं पाए',
  'diag.recordAgain': 'फिर से रिकॉर्ड करें',
  'diag.scoreLine': '{score}/100 — {result}',
  'diag.passed': 'पास',
  'diag.notPassed': 'अभी पास नहीं',
  'diag.transcriptLabel': 'हमने यह सुना',
  'diag.answerQuestion': '{word}: {question}',
  'diag.nextQuestion': 'अगला सवाल',
  'diag.seeLevel': 'मेरा स्तर देखें',
  'diag.completeTitle': 'टेस्ट पूरा हुआ!',
  'diag.levelIntro': 'आपका अंग्रेज़ी स्तर है',
  'diag.levelHint': 'हम आपको इस स्तर के प्रैक्टिस सवाल देंगे।',
  'diag.startPracticing': 'प्रैक्टिस शुरू करें',
  'diag.startPracticingBusy': 'प्रैक्टिस खुल रही है…',
  'diag.ackFailedTitle': 'हम प्रैक्टिस नहीं खोल पाए',
  'diag.ackFailed': 'आपका स्तर सेव है। आगे बढ़ने के लिए फिर से कोशिश करें।',
  'diag.answersTitle': 'आपके जवाब',
  'diag.answerLine': 'सवाल {number} — {score}/100 {mark}',
  'diag.assessFailedTitle': 'हम आपके जवाब की जाँच नहीं कर पाए',

  'cefr.A1': 'A1 = शुरुआती स्तर',
  'cefr.A2': 'A2 = बुनियादी स्तर',
  'cefr.B1': 'B1 = मध्यम स्तर',
  'cefr.B2': 'B2 = मध्यम से ऊपर',
  'cefr.C1': 'C1 = उच्च स्तर',
  'cefr.C2': 'C2 = विशेषज्ञ स्तर',

  'logout.failedTitle': 'हम आपको लॉग आउट नहीं कर पाए',
  'logout.failedBody': 'कृपया अपना इंटरनेट देखें और फिर से कोशिश करें।',
  'logout.localBody':
    'हम सर्वर से संपर्क नहीं कर पाए। आप इस डिवाइस से लॉगिन हटा सकते हैं; दूसरे डिवाइस लॉग इन रहेंगे।',
  'logout.thisDevice': 'इस डिवाइस से साइन आउट करें',
  'logout.cleanupTitle': 'लॉग आउट हो गए',

  'practice.greeting': 'नमस्ते, {name}',
  'practice.loadingQuestion': 'आपका सवाल लोड हो रहा है…',
  'practice.loadFailedTitle': 'हम सवाल लोड नहीं कर पाए',
  'practice.loadFailed': 'हम प्रैक्टिस का सवाल लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'practice.helpLabel': 'इस सवाल के लिए मदद',
  'practice.newWord': 'नया शब्द',
  'practice.revision': 'दोहराना',
  'practice.attemptChip': 'कोशिश {current} / {max}',
  'practice.progressLine': '{total} में से {mastered} शब्द सीख लिए',
  'practice.progressLearning': ' · {count} दोहराने के लिए',
  'practice.answerInMyLanguage': 'अपनी भाषा में जवाब दूँगा',
  'practice.answeringNative': 'आप अपनी भाषा में जवाब दे रहे हैं — अंग्रेज़ी के लिए टैप करें',
  'practice.settings': 'सेटिंग्स',

  'practiceIntro.title': 'प्रैक्टिस कैसे काम करती है',
  'practiceIntro.master': 'किसी शब्द को पक्का करने के लिए {score} या ज़्यादा स्कोर करें।',
  'practiceIntro.tries': 'हर शब्द के लिए आपको {count} कोशिशें मिलती हैं।',
  'practiceIntro.silence':
    'अगर कुछ सुनाई नहीं देता, तो वह गिना नहीं जाता। आप फिर से कोशिश कर सकते हैं।',
  'practiceIntro.native':
    'अपनी भाषा में दिया जवाब एक कोशिश गिनता है और समझ की जाँच करता है, लेकिन शब्द में महारत केवल अंग्रेज़ी जवाब से मिलती है।',
  'practiceIntro.dismiss': 'समझ गया',

  'feedback.noResultTitle': 'दिखाने के लिए कुछ नहीं',
  'feedback.noResultBody': 'हम यह फ़ीडबैक नहीं दिखा पाए।',
  'feedback.nativeUnderstoodTitle': 'आपने सवाल समझ लिया!',
  'feedback.nativeUnderstoodBody': 'आपका जवाब सही है। अब इसे अंग्रेज़ी में कहने की कोशिश करें!',
  'feedback.nativeMissedTitle': 'जवाब ठीक नहीं बैठा',
  'feedback.nativeMissedBody':
    'आपका जवाब सवाल से मेल नहीं खाया। उदाहरण देखें और फिर से कोशिश करें।',
  'feedback.noSpeechTitle': 'हमें आपकी आवाज़ नहीं सुनाई दी',
  'feedback.noSpeechBody':
    'चिंता न करें — यह कोशिश में नहीं गिना गया। रिकॉर्ड बटन दबाएँ, साफ़ बोलें, फिर रोकने के लिए दोबारा दबाएँ। आप पहले मदद भी ले सकते हैं।',
  'feedback.nativeNoSpeechBody':
    'आपकी प्रैक्टिस में कुछ नहीं बदला। कृपया साफ़ बोलें और अपनी भाषा में फिर से कोशिश करें।',
  'feedback.masteredTitle': 'शब्द पक्का हो गया!',
  'feedback.masteredBody': 'आपने {score} या ज़्यादा स्कोर किया — अब यह शब्द आपका है!',
  'feedback.passedTitle': 'बहुत बढ़िया!',
  'feedback.passedBody': 'आप पास हो गए! {score} या ज़्यादा स्कोर से शब्द पक्का होता है।',
  'feedback.retryTitle': 'थोड़ा रह गया — कोशिश {attempt} / {max}',
  'feedback.retryBodyOne': 'आपके पास 1 कोशिश बची है। फ़ीडबैक पढ़ें और फिर से कोशिश करें।',
  'feedback.retryBodyMany': 'आपके पास {count} कोशिशें बची हैं। फ़ीडबैक पढ़ें और फिर से कोशिश करें।',
  'feedback.finalTitle': 'कोशिशें ख़त्म',
  'feedback.finalBody': 'इस पर काम करें। यह शब्द बाद में फिर आएगा।',
  'feedback.scoreLine': '{score} / 100',
  'feedback.scoreMeaning': '{pass} या ज़्यादा यानी पास। {master} या ज़्यादा यानी शब्द पक्का।',
  'feedback.weHeard': 'हमने सुना',
  'feedback.feedbackLabel': 'फ़ीडबैक',
  'feedback.finalFeedbackLabel': 'आख़िरी फ़ीडबैक',
  'feedback.sayInEnglish': 'इसे अंग्रेज़ी में कहें',
  'feedback.nextQuestion': 'अगला सवाल',
  'feedback.tryInEnglish': 'अंग्रेज़ी में कोशिश करें',
  'feedback.tryAgainNative': 'अपनी भाषा में फिर से कोशिश करूँगा',
  'feedback.seeHelp': 'अनुवाद और उदाहरण देखें',
  'feedback.attemptLine': 'कोशिश {current} / {max}',
  'feedback.attemptStillAvailable': '{max} में से कोशिश {current} अभी भी उपलब्ध है',
  'feedback.wordAndQuestion': 'शब्द और सवाल',
  'feedback.originalTranscript': 'हमने {language} में यह सुना',
  'feedback.englishTranslation': 'अंग्रेज़ी अनुवाद',
  'feedback.exampleEnglishAnswer': 'अंग्रेज़ी जवाब का उदाहरण',
  'feedback.nativeFinalTitle': 'कोशिशें पूरी हुईं',
  'feedback.nativeFinalBody':
    'इस जवाब में आपकी आखिरी कोशिश इस्तेमाल हुई। यह शब्द आपको बाद में फिर दिखेगा।',

  'help.invalidLinkTitle': 'यह लिंक काम नहीं करता',
  'help.invalidLinkBody': 'प्रैक्टिस पर वापस जाएँ और अपने सवाल से मदद खोलें।',
  'help.loading': 'मदद लोड हो रही है…',
  'help.loadFailedTitle': 'हम मदद लोड नहीं कर पाए',
  'help.loadFailed': 'हम इस सवाल के लिए मदद लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'help.examplesLabel': 'उदाहरण वाक्य',
  'help.exampleNumber': 'उदाहरण {number}',
  'help.startPractice': 'प्रैक्टिस शुरू करें',

  'attempt.invalidLinkBody': 'प्रैक्टिस पर वापस जाएँ और अपने सवाल से प्रैक्टिस मोड चुनें।',
  'attempt.loading': 'सवाल लोड हो रहा है…',
  'attempt.loadFailedTitle': 'हम सवाल लोड नहीं कर पाए',
  'attempt.loadFailed': 'हम यह सवाल लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',

  'cp.currentLabel': 'मौजूदा पासवर्ड',
  'cp.currentPlaceholder': 'आपका मौजूदा पासवर्ड',
  'cp.newLabel': 'नया पासवर्ड',
  'cp.confirmLabel': 'नया पासवर्ड फिर से लिखें',
  'cp.confirmPlaceholder': 'नया पासवर्ड दोबारा टाइप करें',
  'cp.mismatch': 'पासवर्ड मेल नहीं खाते।',
  'cp.sameAsCurrent': 'मौजूदा पासवर्ड से अलग पासवर्ड चुनें।',
  'cp.wrongCurrent': 'आपका मौजूदा पासवर्ड गलत है।',
  'cp.failed': 'हम आपका पासवर्ड नहीं बदल पाए। कृपया फिर से कोशिश करें।',
  'cp.updatedTitle': 'पासवर्ड बदल गया',
  'cp.updatedBody': 'आपका पासवर्ड बदल दिया गया है। दूसरे डिवाइस लॉग आउट हो गए हैं।',
  'cp.submit': 'पासवर्ड बदलें',
  'cp.submitBusy': 'बदला जा रहा है…',

  'da.warningTitle': 'यह वापस नहीं हो सकता',
  'da.warningBody':
    'खाता हटाने से आपकी प्रोफ़ाइल, नतीजे, प्रगति और रिकॉर्डिंग तक पहुँच तुरंत हट जाती है। रिकॉर्डिंग फ़ाइलें स्थायी रूप से मिटाने की कतार में जाती हैं, जिसमें कुछ समय लग सकता है। यह वापस नहीं हो सकता।',
  'da.passwordLabel': 'अपना पासवर्ड डालें',
  'da.passwordPlaceholder': 'आपका पासवर्ड',
  'da.wrongPassword': 'पासवर्ड गलत है।',
  'da.failed': 'हम आपका खाता नहीं हटा पाए। कृपया फिर से कोशिश करें।',
  'da.unconfirmed':
    'हम पुष्टि नहीं कर पाए कि आपका खाता हटा या नहीं। दोबारा हटाने से पहले इंटरनेट से जुड़कर लॉग इन करने की कोशिश करें।',
  'da.deletedTitle': 'खाता हटा दिया गया',
  'da.deletedBody':
    'आपके खाते का डेटा हटा दिया गया है और रिकॉर्डिंग फ़ाइलें स्थायी रूप से मिटाने की कतार में हैं।',
  'da.confirmTitle': 'अपना खाता हटाएँ?',
  'da.confirmBody':
    'इससे आपका खाता और प्रगति हमेशा के लिए हट जाएगी। रिकॉर्डिंग फ़ाइलें बाद में होने वाला स्थायी मिटाना पूरा होने तक कतार में रहती हैं।',
  'da.confirmDelete': 'हटाएँ',
  'da.submit': 'मेरा खाता हटाएँ',
  'da.submitBusy': 'हटाया जा रहा है…',

  'boundary.title': 'कुछ गड़बड़ हो गई',
  'boundary.body': 'आपका सीखने का डेटा सुरक्षित है। कृपया यह स्क्रीन फिर से खोलें।',
  'notFound.title': 'पेज नहीं मिला',
  'notFound.body': 'यह लिंक काम नहीं करता या आपके पाठ का हिस्सा नहीं है।',
  'notFound.goHome': 'होम पर जाएँ',

  'recorder.permissionBody':
    'आपका जवाब रिकॉर्ड करने के लिए माइक्रोफ़ोन चाहिए। कृपया फ़ोन की सेटिंग्स में इस ऐप को माइक्रोफ़ोन की अनुमति दें, फिर दोबारा कोशिश करें।',
  'recorder.openSettings': 'सेटिंग्स खोलें',
  'recorder.openSettingsFailed':
    'हम सेटिंग्स नहीं खोल पाए। कृपया फ़ोन की सेटिंग्स खोलकर इस ऐप को माइक्रोफ़ोन की अनुमति दें।',
  'recorder.startLabel': 'रिकॉर्डिंग शुरू करें',
  'recorder.startHint': 'अपना उत्तर रिकॉर्ड करने के लिए दो बार टैप करें',
  'recorder.stopHint': 'रोककर अपना उत्तर देखने के लिए दो बार टैप करें',
  'recorder.stopLabel': 'रिकॉर्डिंग रोकें',
  'recorder.listening': 'सुन रहे हैं…',
  'recorder.statusRecording': 'रिकॉर्ड हो रहा है… 2:00 में से {elapsed} — रोकने के लिए टैप करें',
  'recorder.statusRecorded': '{elapsed} रिकॉर्ड हुआ — भेजने के लिए तैयार। ऐप खुला रखें।',
  'recorder.statusRecovering': 'देख रहे हैं कि आपका पिछला जवाब सेव हुआ या नहीं…',
  'recorder.statusIdle': 'अपना जवाब रिकॉर्ड करने के लिए माइक्रोफ़ोन टैप करें',
  'recorder.a11yRecording': 'रिकॉर्ड हो रहा है। रोकने के लिए माइक्रोफ़ोन टैप करें।',
  'recorder.a11ySaved': 'टेक भेजने के लिए तैयार है। ऐप छोड़ने या बंद करने पर यह मिट जाएगा।',
  'recorder.a11yUploading': 'आपका जवाब भेजा और जाँचा जा रहा है।',
  'recorder.a11yRecovering': 'आपका पिछला जवाब देखा जा रहा है।',
  'recorder.a11yIdle': 'रिकॉर्ड करने के लिए तैयार।',
  'recorder.announceStarted': 'रिकॉर्डिंग शुरू हो गई। रोकने के लिए माइक्रोफ़ोन टैप करें।',
  'recorder.stageUploading': 'आपका जवाब भेजा जा रहा है…',
  'recorder.stageListening': 'AI कोच सुन रहा है…',
  'recorder.stageAlmostDone': 'बस होने वाला है — इंतज़ार के लिए धन्यवाद…',
  'recorder.waitHint': 'इसमें सामान्य से ज़्यादा समय लग रहा है — आपका नतीजा देखा जा रहा है…',
  'recorder.waitingFor': '{elapsed} से इंतज़ार हो रहा है',
  'recorder.privacyNote': 'हम आपकी रिकॉर्डिंग तभी भेजते हैं जब आप “जवाब भेजें” दबाते हैं।',
  'recorder.retentionNote':
    'आपका स्कोर, ट्रांसक्रिप्ट और फ़ीडबैक दोनों स्थितियों में सेव होते हैं। “यह रिकॉर्डिंग सेव करें” चालू न होने पर, जाँच के बाद ऑडियो मिट जाता है।',
  'recorder.saveRecordingLabel': 'यह रिकॉर्डिंग सेव करें',
  'recorder.saveRecordingHint':
    'डिफ़ॉल्ट रूप से बंद। चालू करने पर यह ऑडियो रिकॉर्डिंग में तब तक रहेगा, जब तक आप इसे मिटाएँ।',
  'recorder.play': 'चलाएँ',
  'recorder.pause': 'रोकें',
  'recorder.playLabel': 'अपनी रिकॉर्डिंग चलाएँ',
  'recorder.pauseLabel': 'प्लेबैक रोकें',
  'recorder.submit': 'जवाब भेजें',
  'recorder.rerecord': 'फिर से रिकॉर्ड करें',
  'recorder.discard': 'टेक मिटाएँ',
  'recorder.discardHint': 'इस बिना भेजी रिकॉर्डिंग को इस डिवाइस से मिटाएँ।',
  'recorder.discardTitle': 'यह टेक मिटाएँ?',
  'recorder.discardBody': 'यह बिना भेजी रिकॉर्डिंग इस डिवाइस से मिट जाएगी। कुछ भी भेजा नहीं जाएगा।',
  'recorder.discarded': 'टेक मिटा दिया गया। कुछ भी नहीं भेजा गया।',
  'recorder.errDiscardFailed': 'हम इस टेक को सुरक्षित रूप से नहीं मिटा पाए। फिर से कोशिश करें।',
  'recorder.cancelHint': 'भेजना रोकता है और आपकी रिकॉर्डिंग रखता है।',
  'recorder.cancelSending': 'भेजना रद्द करें',
  'recorder.cancelBeforeTransferHint':
    'ऑडियो इस डिवाइस से जाने से पहले रोकता है और यह टेक रखता है।',
  'recorder.cancelAfterTransferHint':
    'जवाब भेजना रोकता है। अस्थायी ऑडियो अपलोड थोड़ी देर रह सकता है और फिर मिट जाएगा।',
  'recorder.stopWaiting': 'इंतज़ार रोकें',
  'recorder.stopWaitingHint':
    'इस स्क्रीन पर जाँच रोकता है। आपका जवाब पहले ही भेजा या सेव किया जा सकता है।',
  'recorder.permissionRetryBody':
    'माइक्रोफ़ोन की अनुमति नहीं मिली। फिर पूछने के लिए रिकॉर्डिंग शुरू करें पर टैप करें।',
  'recorder.permissionGranted': 'माइक्रोफ़ोन की अनुमति चालू है। रिकॉर्डिंग शुरू करें।',
  'recorder.oneMinuteLeft': 'एक मिनट बचा है',
  'recorder.thirtySecondsLeft': 'तीस सेकंड बचे हैं',
  'recorder.tenSecondsLeft': 'दस सेकंड बचे हैं',

  'recorder.errRetryInfoUnavailable':
    'हम आपके सेव किए हुए जवाब की जानकारी नहीं पढ़ पाए। कृपया ऐप बंद करके दोबारा खोलें, फिर से रिकॉर्ड करें।',
  'recorder.errNothingToConfirm':
    'हम जाँच नहीं पाए कि आपका जवाब सेव हुआ या नहीं। अगर वह न दिखे, तो कृपया फिर से रिकॉर्ड करें।',
  'recorder.errRetryInfoClear':
    'हम पुरानी जवाब जानकारी नहीं हटा पाए। फिर से रिकॉर्ड करने से पहले ऐप बंद करके दोबारा खोलें।',
  'recorder.errRetryInfoUpdate':
    'हम आपके जवाब की जानकारी सेव नहीं कर पाए। पूरा करने के लिए ऐप बंद करके दोबारा खोलें।',
  'recorder.errResultSafeRetryInfo':
    'आपका नतीजा सुरक्षित है, लेकिन हम ऐप की जानकारी सेव नहीं कर पाए। पूरा करने के लिए ऐप बंद करके दोबारा खोलें।',
  'recorder.errBadRecoveryResponse':
    'सर्वर से ऐसी जानकारी आई जो हम पढ़ नहीं पाए। आपके सवाल दोबारा लोड कर दिए गए हैं।',
  'recorder.errRecoveryMismatch':
    'सर्वर से ऐसी जानकारी आई जो मेल नहीं खाती। आपके सवाल दोबारा लोड कर दिए गए हैं।',
  'recorder.errInterruptedSaved':
    'आपका पिछला जवाब सेव हो गया था। आपके सवाल दोबारा लोड कर दिए गए हैं।',
  'recorder.errCannotDisplay':
    'आपका जवाब सेव हो गया, लेकिन ऐप नतीजा नहीं दिखा पाया। आपके सवाल दोबारा लोड कर दिए गए हैं।',
  'recorder.errAlreadyAnswered':
    'यह जवाब पहले ही भेजा जा चुका है, या टेस्ट आगे बढ़ गया है। आपके सवाल दोबारा लोड कर दिए गए हैं।',
  'recorder.errUploadGone':
    'पुराना अपलोड अब नहीं है। अगर सवाल अब भी है, तो कृपया अपनी रिकॉर्डिंग फिर से भेजें।',
  'recorder.errUploadUnconfirmed':
    'हम पुराने अपलोड की जाँच नहीं कर पाए। आपके सवाल दोबारा लोड कर दिए गए हैं। सवाल अब भी हो तभी फिर से रिकॉर्ड करें।',
  'recorder.errRecoveryExpired':
    'आपके पुराने जवाब की जाँच सुरक्षित रूप से पूरी हो गई। आपके सवाल दोबारा लोड कर दिए गए हैं।',
  'recorder.errAnswerSavedRetryInfo':
    'आपका जवाब सेव हो गया, लेकिन हम ऐप की जानकारी सेव नहीं कर पाए। पूरा करने के लिए ऐप बंद करके दोबारा खोलें।',
  'recorder.errInfoNotSavedNotUploaded':
    'हम ऐप की जानकारी सेव नहीं कर पाए, इसलिए आपकी रिकॉर्डिंग नहीं भेजी गई। कृपया फिर से कोशिश करें।',
  'recorder.errNotSent': 'हम आपकी रिकॉर्डिंग नहीं भेज पाए। कृपया फिर से कोशिश करें।',
  'recorder.errDeviceInterrupted':
    'सेव होने से पहले फ़ोन ने रिकॉर्डिंग रोक दी। कुछ भी नहीं भेजा गया। तैयार होने पर फिर रिकॉर्ड करें।',
  'recorder.errBackgroundDiscarded':
    'ऐप छोड़ने पर आपका न भेजा गया टेक मिटा दिया गया। कुछ भी नहीं भेजा गया। तैयार होने पर फिर रिकॉर्ड करें।',
  'recorder.errTooShort': 'रिकॉर्डिंग बहुत छोटी थी। कृपया अपना जवाब फिर से रिकॉर्ड करें।',
  'recorder.errSaveFailed': 'हम रिकॉर्डिंग सेव नहीं कर पाए। कृपया अपना जवाब फिर से रिकॉर्ड करें।',
  'recorder.errNoRecording': 'कोई रिकॉर्डिंग सेव नहीं हुई। कृपया फिर से रिकॉर्ड करें।',
  'recorder.errStartFailed':
    'हम रिकॉर्डिंग शुरू नहीं कर पाए। कृपया माइक्रोफ़ोन देखें और फिर से कोशिश करें।',
  'recorder.errAudioReset':
    'हम ऑडियो रीसेट नहीं कर पाए। अगर आवाज़ ठीक से काम न करे, तो ऐप बंद करके फिर खोलें।',
  'recorder.errPlayFailed': 'हम आपकी रिकॉर्डिंग नहीं चला पाए। आप फिर भी उसे भेज सकते हैं।',
  'recorder.errRejected':
    'सर्वर ने यह रिकॉर्डिंग स्वीकार नहीं की। कृपया सवाल पढ़ें और फिर से कोशिश करें।',

  'header.home': 'होम',
  'header.history': 'इतिहास',
  'header.recordings': 'मेरी रिकॉर्डिंग',
  'header.settings': 'सेटिंग्स',
  'header.privacy': 'गोपनीयता नीति',
  'header.terms': 'उपयोग की शर्तें',

  'home.levelLabel': 'आपका स्तर',
  'home.masteryLabel': 'सीखे हुए शब्द',
  'home.streakNone': 'अभी कोई सिलसिला नहीं। आज प्रैक्टिस करके शुरू करें!',
  'home.streakOne': '1 दिन का सिलसिला',
  'home.streakMany': '{count} दिन का सिलसिला',
  'home.dueChip': '{count} दोहराने के लिए',
  'home.dueNone': 'अभी दोहराने के लिए कुछ नहीं है।',
  'home.practicedNoneToday': 'आज अभी तक प्रैक्टिस नहीं हुई।',
  'home.practicedOnceToday': 'आज आपने 1 बार प्रैक्टिस की।',
  'home.practicedToday': 'आज आपने {count} बार प्रैक्टिस की।',
  'home.startPractice': 'प्रैक्टिस शुरू करें',
  'home.loading': 'आपकी प्रगति लोड हो रही है…',
  'home.loadFailedTitle': 'हम आपकी प्रगति लोड नहीं कर पाए',
  'home.loadFailed': 'हम आपकी प्रगति लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',

  'summary.title': 'आपका प्रैक्टिस सेशन',
  'summary.attempts': 'भेजे गए जवाब: {count}',
  'summary.passed': 'पास हुए शब्द: {count}',
  'summary.mastered': 'सीखे हुए शब्द: {count}',
  'summary.levelUps': 'स्तर बढ़े: {count}',
  'summary.dismiss': 'समझ गया',

  'levelUp.title': 'स्तर बढ़ गया!',
  'levelUp.body': 'आप {level} पर पहुँच गए!',
  'levelUp.progress': 'आप {from} से {to} पर पहुँचे।',

  'history.loading': 'आपके जवाब लोड हो रहे हैं…',
  'history.loadFailedTitle': 'हम आपके जवाब लोड नहीं कर पाए',
  'history.loadFailed': 'हम आपके जवाब लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'history.emptyTitle': 'अभी कोई जवाब नहीं',
  'history.emptyBody': 'थोड़ी प्रैक्टिस करें — आपके जवाब यहाँ दिखेंगे।',
  'history.loadMore': 'पुराने जवाब दिखाएँ',
  'history.loadingMore': 'और लोड हो रहे हैं…',
  'history.contextDiagnostic': 'स्तर टेस्ट',
  'history.contextPractice': 'प्रैक्टिस',
  'history.contextNative': 'अपनी भाषा में जवाब',
  'history.attemptNo': 'कोशिश {number}',
  'history.showDetails': 'विवरण दिखाएँ',
  'history.hideDetails': 'विवरण छिपाएँ',
  'history.detailsHint': 'इस उत्तर को खोलने या बंद करने के लिए दो बार टैप करें',

  'recordings.loading': 'आपकी रिकॉर्डिंग लोड हो रही हैं…',
  'recordings.loadFailedTitle': 'हम आपकी रिकॉर्डिंग लोड नहीं कर पाए',
  'recordings.loadFailed': 'हम आपकी रिकॉर्डिंग लोड नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'recordings.emptyTitle': 'कोई रिकॉर्डिंग सहेजी नहीं गई',
  'recordings.emptyBody':
    'जवाब भेजने से पहले “यह रिकॉर्डिंग सेव करें” चालू करें। सेव की गई रिकॉर्डिंग यहाँ दिखेंगी।',
  'recordings.loadMore': 'पुरानी रिकॉर्डिंग दिखाएँ',
  'recordings.loadingMore': 'और लोड हो रहा है…',
  'recordings.intro': 'अपनी भेजी हुई रिकॉर्डिंग सुनें, या अपने नतीजे रखते हुए केवल ऑडियो हटाएँ।',
  'recordings.contextDiagnostic': 'स्तर टेस्ट',
  'recordings.contextPractice': 'अंग्रेज़ी प्रैक्टिस',
  'recordings.contextNative': 'अपनी भाषा में जवाब',
  'recordings.statusAvailable': 'चलाने के लिए तैयार',
  'recordings.statusPending': 'तैयार हो रही है',
  'recordings.statusUnavailable': 'उपलब्ध नहीं',
  'recordings.checkPending': 'तैयार हो रही रिकॉर्डिंग जाँचें',
  'recordings.yourRecording': 'आपकी रिकॉर्डिंग',
  'recordings.playLabel': 'अपनी भेजी हुई रिकॉर्डिंग चलाएँ',
  'recordings.pauseLabel': 'अपनी भेजी हुई रिकॉर्डिंग रोकें',
  'recordings.playFailed': 'हम यह रिकॉर्डिंग नहीं चला पाए। कृपया फिर से कोशिश करें।',
  'recordings.shareAction': 'ऑडियो साझा करें',
  'recordings.shareLabel': 'अपनी भेजी हुई रिकॉर्डिंग साझा करें',
  'recordings.shareHint':
    'एक अस्थायी निजी कॉपी डाउनलोड करके आपके डिवाइस के साझा करने के विकल्प खोलता है।',
  'recordings.sharing': 'ऑडियो तैयार हो रहा है…',
  'recordings.shareUnavailable': 'इस डिवाइस पर साझा करना काम नहीं करता।',
  'recordings.shareFailed': 'हम यह रिकॉर्डिंग साझा नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'recordings.preparing': 'तैयार हो रही है…',
  'recordings.pending': 'यह रिकॉर्डिंग अभी तैयार हो रही है। हम थोड़ी देर तक फिर जाँचेंगे।',
  'recordings.unavailable': 'यह रिकॉर्डिंग उपलब्ध नहीं है।',
  'recordings.deleteTitle': 'यह रिकॉर्डिंग हटाएँ?',
  'recordings.deleteBody':
    'रिकॉर्डिंग अभी हटेगी और सहेजा ऑडियो स्थायी रूप से मिटाने की कतार में जाएगा। आपका स्कोर, ट्रांसक्रिप्ट और फ़ीडबैक सुरक्षित रहेगा।',
  'recordings.deleteBodyNamed':
    '“{name}” की रिकॉर्डिंग हटाकर सहेजे ऑडियो को स्थायी रूप से मिटाने की कतार में डालें? आपका स्कोर, ट्रांसक्रिप्ट और फ़ीडबैक सुरक्षित रहेगा।',
  'recordings.deleteAction': 'रिकॉर्डिंग हटाएँ',
  'recordings.deleteHint':
    'रिकॉर्डिंग अभी हटती है और ऑडियो स्थायी मिटाने की कतार में जाता है; आपका नतीजा रहता है।',
  'recordings.deleteFailed': 'हम यह रिकॉर्डिंग नहीं हटा पाए। कृपया फिर से कोशिश करें।',
  'recordings.deleted':
    'रिकॉर्डिंग हटा दी गई; सहेजा ऑडियो स्थायी रूप से मिटाने की कतार में है। आपका नतीजा अभी भी सहेजा है।',
  'recordings.progressLabel': 'रिकॉर्डिंग चलने की प्रगति',

  'practice.skipWord': 'यह शब्द अभी छोड़ दें',
  'practice.skipFailedTitle': 'हम यह शब्द नहीं छोड़ पाए',
  'practice.skipFailed': 'हम यह शब्द नहीं छोड़ पाए। कृपया फिर से कोशिश करें।',

  'login.forgot': 'पासवर्ड भूल गए?',
  'reset.requestTitle': 'अपना पासवर्ड रीसेट करें',
  'reset.requestBody': 'अपना ईमेल लिखें। हम आपको एक कोड भेजेंगे।',
  'reset.submitRequest': 'कोड भेजें',
  'reset.submitRequestBusy': 'भेज रहे हैं…',
  'reset.requestFailed': 'हम कोड नहीं भेज पाए। कृपया फिर से कोशिश करें।',
  'reset.sentTitle': 'अपना ईमेल देखें',
  'reset.sentBody': 'अगर इस ईमेल से खाता है, तो हमने एक कोड भेजा है। कोड 30 मिनट तक काम करता है।',
  'reset.continue': 'मेरे पास कोड है',
  'reset.resend': 'कोड फिर से भेजें',
  'reset.resendBusy': 'फिर से भेज रहे हैं…',
  'reset.newTitle': 'नया पासवर्ड चुनें',
  'reset.codeLabel': 'ईमेल वाला कोड',
  'reset.codePlaceholder': 'कोड यहाँ डालें',
  'reset.submitNew': 'नया पासवर्ड सहेजें',
  'reset.submitNewBusy': 'सहेज रहे हैं…',
  'reset.doneBanner':
    'आपका पासवर्ड बदल गया है और मौजूदा सत्र लॉग आउट हो गए हैं। कृपया लॉग इन करें।',
  'reset.backToLogin': 'लॉग इन पर जाएँ',

  'settings.profileTitle': 'आपकी प्रोफ़ाइल',
  'ads.label': 'विज्ञापन',
  'ads.privacyOptions': 'विज्ञापन गोपनीयता विकल्प',
  'ads.privacyOptionsHelp': 'विज्ञापनों के लिए उपयोग होने वाले गोपनीयता विकल्प देखें या बदलें।',
  'ads.privacyFailed': 'हम विज्ञापन गोपनीयता विकल्प नहीं खोल पाए। फिर से कोशिश करें।',
  'settings.levelLabel': 'अंग्रेज़ी स्तर',
  'settings.appLanguageLabel': 'ऐप की भाषा',
  'settings.appLanguageHelp': 'बटन और संदेशों के लिए भाषा चुनें।',
  'settings.learningLanguageLabel': 'मातृभाषा',
  'settings.learningLanguageHelp':
    'केवल अनुवादित मदद और अपनी भाषा में जवाब देने के लिए। इससे बटन या संदेश नहीं बदलते; उसके लिए ऐप की भाषा बदलें।',
  'settings.levelPending': 'अभी टेस्ट नहीं हुआ',
  'settings.saveName': 'नाम सहेजें',
  'settings.saveNameBusy': 'सहेज रहे हैं…',
  'settings.saved': 'सहेज लिया।',
  'settings.updateFailed': 'हम आपके बदलाव नहीं सहेज पाए। कृपया फिर से कोशिश करें।',
  'settings.export': 'मेरा डेटा निर्यात करें',
  'settings.exportBusy': 'आपका डेटा तैयार हो रहा है…',
  'settings.exportHelp':
    'JSON में आपका सीखने का डेटा और सहेजी गई रिकॉर्डिंग का विवरण शामिल है। ऑडियो फ़ाइलें या ऑडियो बाइट्स शामिल नहीं हैं।',
  'settings.exportFailed': 'हम आपका डेटा निर्यात नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'settings.exportUnavailable': 'इस फ़ोन पर साझा करना काम नहीं करता।',
  'settings.recordingsDeleteAll': 'सभी रिकॉर्डिंग हटाएँ',
  'settings.recordingsDeleteAllHint':
    'आपके स्कोर, ट्रांसक्रिप्ट और फ़ीडबैक रखते हुए हर सहेजी रिकॉर्डिंग हटाता है।',
  'settings.recordingsDeleteAllBusy': 'रिकॉर्डिंग हट रही हैं…',
  'settings.recordingsDeleteAllTitle': 'सभी रिकॉर्डिंग हटाएँ?',
  'settings.recordingsDeleteAllBody':
    'हर सहेजी रिकॉर्डिंग अभी हटेगी और उसका ऑडियो स्थायी रूप से मिटाने की कतार में जाएगा। आपके स्कोर, ट्रांसक्रिप्ट और फ़ीडबैक सुरक्षित रहेंगे। इसे वापस नहीं किया जा सकता।',
  'settings.recordingsDeleteAllConfirm': 'सभी हटाएँ',
  'settings.recordingsDeleteAllSuccess':
    'सभी रिकॉर्डिंग हटा दी गईं; सहेजा ऑडियो स्थायी रूप से मिटाने की कतार में है। आपके नतीजे अभी भी सहेजे हैं।',
  'settings.recordingsDeleteAllFailed': 'हम सभी रिकॉर्डिंग नहीं हटा पाए। कृपया फिर से कोशिश करें।',
  'settings.retake': 'स्तर टेस्ट फिर से शुरू करें',
  'retake.confirmTitle': 'स्तर टेस्ट फिर से शुरू करें?',
  'retake.confirmBody':
    'यह मौजूदा स्तर टेस्ट की प्रगति साफ़ करके फिर शुरू करता है। आपका प्रैक्टिस इतिहास बना रहेगा।',
  'retake.confirm': 'टेस्ट फिर शुरू करें',
  'retake.failed': 'हम टेस्ट फिर से शुरू नहीं कर पाए। कृपया फिर से कोशिश करें।',

  'reminder.toggleLabel': 'रोज़ का रिमाइंडर',
  'reminder.timeLabel': 'रिमाइंडर समय: {time}',
  'reminder.earlier': 'एक घंटा पहले',
  'reminder.later': 'एक घंटा बाद',
  'reminder.denied': 'इस ऐप के लिए नोटिफ़िकेशन बंद हैं। कृपया फ़ोन सेटिंग्स में उन्हें चालू करें।',
  'reminder.failed': 'हम रिमाइंडर सेट नहीं कर पाए। कृपया फिर से कोशिश करें।',
  'reminder.notificationTitle': 'प्रैक्टिस का समय!',
  'reminder.notificationBody': 'आज कुछ मिनट अंग्रेज़ी की प्रैक्टिस करें।',

  'legal.placeholderNote':
    '28 अगस्त 2026 से प्रभावी। यह सारांश बताता है कि मौजूदा ऐप डेटा कैसे संभालता है।',
  'privacy.p1':
    'हम आपका नाम, ईमेल, पासवर्ड हैश, भाषा सेटिंग, स्तर, सीखने की प्रगति, आकलन के नतीजे, ट्रांसक्रिप्ट, फ़ीडबैक और रखी गई रिकॉर्डिंग का मेटाडेटा सहेजते हैं। सेवा प्रमाणीकरण, सुरक्षा, दर सीमाओं, विश्वसनीयता और दुरुपयोग रोकने के लिए आवश्यक अनुरोध और नेटवर्क जानकारी भी प्रोसेस करती है।',
  'privacy.p2':
    'भेजे गए ऑडियो और ट्रांसक्रिप्ट को OpenAI लिप्यंतरण और सीखने के फ़ीडबैक के लिए प्रोसेस करता है। प्रोडक्शन ऑडियो Amazon S3 में निजी रूप से रखा जाता है। पासवर्ड-रीसेट ईमेल कॉन्फ़िगर की गई मेल सेवा का उपयोग करता है। विज्ञापन चालू हों और सहमति मिले तो Google Mobile Ads और उसके सहमति टूल विज्ञापन डेटा प्रोसेस करते हैं। असफल अपलोड और सेव न करने के लिए चुना गया ऑडियो अस्थायी होता है; जिन रिकॉर्डिंग को आप रखने का विकल्प चुनते हैं, वे आपके रिकॉर्डिंग या खाता हटाने तक रहती हैं।',
  'privacy.p3':
    'सेटिंग्स में आप अभी निर्यात में शामिल खाता डेटा निर्यात कर सकते हैं, रिकॉर्डिंग हटा सकते हैं, उपलब्ध विज्ञापन गोपनीयता विकल्प बदल सकते हैं या खाता हटा सकते हैं। सफल खाता हटाने पर खाता डेटा तुरंत हटता है; रिकॉर्डिंग फ़ाइलें बाद में होने वाला स्थायी मिटाना पूरा होने तक कतार में रहती हैं।',
  'terms.p1':
    'यह ऐप AI की मदद से अंग्रेज़ी प्रैक्टिस और अनुमानित CEFR स्तर देता है। नतीजे और फ़ीडबैक अधूरे या गलत हो सकते हैं, पेशेवर सलाह नहीं हैं और आधिकारिक प्रमाणपत्र नहीं हैं।',
  'terms.p2':
    'अपने लॉगिन विवरण निजी रखें और केवल वही खाता उपयोग करें जिसके लिए आप अधिकृत हैं। सेवा का दुरुपयोग, सीमाओं से बचना, दूसरों को बाधित करना, गैरकानूनी सामग्री अपलोड करना या ऐप/प्रदाताओं को नुकसान पहुँचाने की कोशिश न करें।',
  'terms.p3':
    'सेवा, AI आकलन, रिकॉर्डिंग, विज्ञापन, सीमाएँ और सुविधाएँ बदल सकती हैं या उपलब्ध नहीं हो सकतीं। आप सेटिंग्स में खाता हटाकर उपयोग बंद कर सकते हैं। खाता हटाना वापस नहीं हो सकता और रिकॉर्डिंग फ़ाइलों की सफ़ाई बाद में पूरी होती है।',
};

const es: Record<MessageKey, string> = {
  'common.tryAgain': 'Intentar de nuevo',
  'common.cancel': 'Cancelar',
  'common.ok': 'OK',
  'common.show': 'Mostrar',
  'common.hide': 'Ocultar',
  'common.showPassword': 'Mostrar contraseña',
  'common.hidePassword': 'Ocultar contraseña',
  'common.logOut': 'Cerrar sesión en todos los dispositivos',
  'common.backToPractice': 'Volver a practicar',
  'label.word': 'Palabra',
  'label.question': 'Pregunta',

  'wait.second': 'Espera 1 segundo, por favor.',
  'wait.seconds': 'Espera {count} segundos, por favor.',
  'wait.minute': 'Espera 1 minuto, por favor.',
  'wait.minutes': 'Espera {count} minutos, por favor.',
  'wait.hour': 'Espera 1 hora, por favor.',
  'wait.hours': 'Espera {count} horas, por favor.',

  'error.network': 'No pudimos conectar. Revisa tu internet e intenta de nuevo.',
  'error.timeout': 'Esto tardó demasiado. Revisa tu internet e intenta de nuevo.',
  'error.tooLarge': 'La grabación es muy grande. Graba una respuesta más corta.',
  'error.unsupportedFormat':
    'La app no puede usar este tipo de grabación. Graba tu respuesta de nuevo.',
  'error.cannotAssess':
    'No pudimos revisar esta grabación. Habla por un momento y haz tu respuesta de menos de dos minutos.',
  'error.conflict':
    'Todavía estamos revisando una respuesta, o la pregunta cambió. Espera un momento e intenta de nuevo.',
  'error.tooMany': 'Demasiados intentos. Espera un poco e intenta de nuevo.',
  'error.serverBusy': 'La app tiene un problema ahora. Intenta de nuevo más tarde.',
  'error.validation': 'Falta información o hay algo mal. Revísala e intenta de nuevo.',
  'error.wrongCredentials': 'Email o contraseña incorrectos.',
  'error.emailTaken': 'Este email ya tiene una cuenta. Inicia sesión.',
  'error.loginAgain': 'Inicia sesión de nuevo, por favor.',
  'error.forbidden': 'No puedes hacer esto con esta cuenta.',
  'error.notFound': 'No encontramos esto. Vuelve atrás e intenta de nuevo.',
  'error.questionChanged': 'Esta pregunta cambió. Intenta de nuevo con la pregunta nueva.',
  'error.diagnosticDone': 'Tu prueba de nivel ya terminó.',
  'error.stillChecking': 'Todavía estamos revisando tu última respuesta. Espera un momento.',
  'error.alreadySent': 'Ya recibimos esta respuesta. Espera un momento e intenta de nuevo.',
  'error.stateChanged': 'Tu progreso cambió. Intenta de nuevo.',
  'error.dailyLimit': 'Usaste toda tu práctica de hoy. Vuelve mañana, por favor.',
  'error.networkDailyLimit':
    'Esta conexión de internet usó toda su práctica de hoy. Intenta de nuevo mañana.',
  'error.busy': 'Muchas personas están practicando ahora. Espera un poco e intenta de nuevo.',
  'error.audioInvalid': 'No pudimos usar esta grabación. Graba tu respuesta de nuevo.',
  'error.audioSilent':
    'No oímos ningún sonido. Revisa el micrófono y vuelve a grabar tu respuesta.',
  'error.audioTooLong': 'La grabación es muy larga. Haz tu respuesta de menos de dos minutos.',
  'error.audioUnreadable': 'No pudimos oír esta grabación. Graba tu respuesta de nuevo.',
  'error.checkFailed': 'No pudimos revisar tu respuesta. Intenta de nuevo.',
  'error.resetInvalid': 'Este código no funciona o es muy viejo. Pide un código nuevo, por favor.',
  'error.upgradeRequired': 'Actualiza la app para seguir usándola.',
  'error.assessmentResultIncompatible':
    'Esta respuesta guardada no se puede mostrar después de actualizar la app. Tus preguntas se cargaron de nuevo. Graba una respuesta nueva.',
  'error.internal': 'Algo salió mal. Intenta de nuevo.',
  'email.invalid': 'Escribe una dirección de email válida.',

  'auth.sessionExpired':
    'Cerramos tu sesión para proteger tu cuenta. Inicia sesión de nuevo, por favor.',
  'auth.restoreUnavailable':
    'No pudimos abrir tu sesión guardada. Desbloquea tu teléfono e intenta de nuevo.',
  'auth.logoutCleanupFailed':
    'Cerraste sesión, pero la app no pudo limpiar sus datos. Cierra y abre la app antes de iniciar sesión de nuevo.',
  'auth.accountDeletedCleanupFailed':
    'Tu cuenta fue eliminada, pero la app no pudo limpiar sus datos. Cierra y abre la app antes de iniciar sesión de nuevo.',
  'auth.registrationCompletedLoginRequired':
    'Tu cuenta fue creada, pero este dispositivo no pudo guardar la sesión.',

  'password.tooShort': 'La contraseña debe tener al menos 8 caracteres.',
  'password.needsLetterAndNumber': 'La contraseña debe tener al menos una letra y un número.',
  'password.tooLong': 'La contraseña es muy larga. Usa una más corta, por favor.',
  'password.confirmLabel': 'Confirmar contraseña',
  'password.confirmPlaceholder': 'Escribe la contraseña otra vez',
  'password.mismatch': 'Las contraseñas no coinciden.',
  'password.showConfirmation': 'Mostrar confirmación de contraseña',
  'password.hideConfirmation': 'Ocultar confirmación de contraseña',
  'language.appLabel': 'Idioma de la app',
  'language.appHelp': 'Elige el idioma que usa la app en este dispositivo.',
  'language.saveFailed': 'El idioma de la app cambió, pero no se pudo guardar en este dispositivo.',
  'language.en': 'Inglés',
  'language.te': 'Telugu',
  'language.hi': 'Hindi',
  'language.es': 'Español',
  'language.zh': 'Chino',

  'login.title': 'AI English Coach',
  'login.subtitle': 'Practica hablar inglés con tu coach de IA.',
  'login.emailLabel': 'Email',
  'login.emailPlaceholder': 'tu@ejemplo.com',
  'login.passwordLabel': 'Contraseña',
  'login.passwordPlaceholder': 'Tu contraseña',
  'login.submit': 'Iniciar sesión',
  'login.submitBusy': 'Iniciando sesión…',
  'login.failed': 'No pudimos iniciar tu sesión. Intenta de nuevo.',
  'login.footerPrompt': '¿Eres nuevo? ',
  'login.footerLink': 'Crear cuenta',

  'signup.title': 'Crea tu cuenta',
  'signup.subtitle': 'Vamos a adaptar tu práctica a tu idioma.',
  'signup.nameLabel': 'Nombre',
  'signup.namePlaceholder': 'Tu nombre',
  'signup.passwordPlaceholder': 'Al menos 8 caracteres, con una letra y un número',
  'signup.languageLabel': 'Lengua materna',
  'signup.languageHelp':
    'Se usa para la ayuda traducida y las respuestas en tu idioma. Es diferente del idioma de la app.',
  'signup.submit': 'Crear cuenta',
  'signup.submitBusy': 'Creando tu cuenta…',
  'signup.failed': 'No pudimos crear tu cuenta. Revisa tu información e intenta de nuevo.',
  'signup.createdLoginBanner':
    'Tu cuenta fue creada, pero este dispositivo no pudo guardar la sesión. Inicia sesión con tu contraseña nueva.',
  'signup.footerPrompt': '¿Ya tienes una cuenta? ',
  'signup.footerLink': 'Iniciar sesión',

  'gate.restoring': 'Abriendo tu cuenta…',
  'gate.loadingProfile': 'Cargando tu perfil…',
  'gate.signingOut': 'Cerrando tu sesión…',
  'gate.sessionErrorTitle': 'No podemos abrir tu sesión guardada',
  'gate.resetSession': 'Borrar sesión guardada',
  'gate.serverErrorTitle': 'No podemos conectar con el servidor',
  'gate.profileFailed': 'No pudimos cargar tu perfil. Intenta de nuevo.',
  'gate.offlineTitle': 'Estás sin conexión',
  'gate.offlineBody':
    'Tu sesión sigue guardada. Vuelve a conectarte a internet para cargar tu perfil.',

  'network.offline': 'No hay conexión a internet. Tu trabajo guardado está seguro.',
  'network.backOnline': 'Conexión restablecida',
  'network.offlineTitle': 'Estás sin conexión',
  'network.offlineBody':
    'Vuelve a conectarte para cargar esta pantalla. Continuará automáticamente.',
  'refresh.updating': 'Actualizando…',
  'refresh.failedUsingSaved': 'No se pudo actualizar. Mostramos tu información guardada.',
  'pagination.safetyStop':
    'Esta lista se detuvo en su límite seguro de visualización. Desliza hacia abajo para actualizar los elementos más recientes.',
  'upgrade.title': 'Debes actualizar la app',
  'upgrade.body':
    'Necesitas una versión más nueva de AI English Coach para seguir usando tus datos de aprendizaje de forma segura.',
  'upgrade.action': 'Actualizar app',
  'upgrade.actionHint': 'Abre la página de AI English Coach en la tienda de apps.',
  'upgrade.openFailed': 'No pudimos abrir la tienda de apps. Ábrela y actualiza AI English Coach.',
  'replay.checkingTitle': 'Comprobando tu respuesta guardada',
  'replay.checkingBody': 'Tu respuesta está segura. Estamos recuperando tus comentarios.',
  'replay.failedTitle': 'No pudimos recuperar tus comentarios',
  'replay.failedBody':
    'Tu respuesta guardada sigue segura. Intenta de nuevo ahora o revísala después.',
  'replay.checkLater': 'Revisar después',
  'replay.pendingTitle': 'Respuesta guardada en espera',
  'replay.pendingBody':
    'Tu respuesta está segura. Vuelve a comprobar para recuperar los comentarios cuando estén listos.',
  'replay.checkNow': 'Comprobar ahora',

  'header.diagnostic': 'Prueba de nivel de inglés',
  'header.practice': 'Práctica',
  'header.help': 'Ayuda',
  'header.attempt': 'Modo práctica',
  'header.feedback': 'Comentarios',
  'header.changePassword': 'Cambiar contraseña',
  'header.deleteAccount': 'Eliminar cuenta',

  'menu.accountTitle': 'Cuenta',
  'hint.finishRecordingFirst': 'Termina tu grabación primero, por favor.',

  'diag.preparing': 'Preparando tu prueba…',
  'diag.loadFailedTitle': 'No pudimos cargar la prueba',
  'diag.loadFailed': 'No pudimos cargar la prueba. Intenta de nuevo.',
  'diag.introTitle': 'Antes de empezar',
  'diag.introWhat': 'Esta prueba corta encuentra tu nivel de inglés.',
  'diag.introCount': 'Vas a responder 2 o 3 preguntas.',
  'diag.introRecorded': 'Tus respuestas se graban.',
  'diag.introSpeakEnglish': 'Habla en inglés, por favor.',
  'diag.introStart': 'Empezar la prueba',
  'diag.progress': 'Pregunta {current} de hasta {max}',
  'diag.answerSavedTitle': 'Respuesta guardada',
  'diag.answerSavedBody': 'Tu respuesta está guardada. Verás tus puntos al final de la prueba.',
  'diag.answerCheckedTitle': 'Respuesta revisada',
  'diag.noSpeechTitle': 'No pudimos oírte',
  'diag.recordAgain': 'Grabar de nuevo',
  'diag.scoreLine': '{score}/100 — {result}',
  'diag.passed': 'aprobado',
  'diag.notPassed': 'todavía no aprobado',
  'diag.transcriptLabel': 'Lo que oímos',
  'diag.answerQuestion': '{word}: {question}',
  'diag.nextQuestion': 'Siguiente pregunta',
  'diag.seeLevel': 'Ver mi nivel',
  'diag.completeTitle': '¡Prueba completa!',
  'diag.levelIntro': 'Tu nivel de inglés es',
  'diag.levelHint': 'Te daremos preguntas de práctica para este nivel.',
  'diag.startPracticing': 'Empezar a practicar',
  'diag.startPracticingBusy': 'Abriendo la práctica…',
  'diag.ackFailedTitle': 'No pudimos abrir la práctica',
  'diag.ackFailed': 'Tu nivel está guardado. Intenta de nuevo para continuar.',
  'diag.answersTitle': 'Tus respuestas',
  'diag.answerLine': 'Pregunta {number} — {score}/100 {mark}',
  'diag.assessFailedTitle': 'No pudimos revisar tu respuesta',

  'cefr.A1': 'A1 = principiante',
  'cefr.A2': 'A2 = básico',
  'cefr.B1': 'B1 = intermedio',
  'cefr.B2': 'B2 = intermedio alto',
  'cefr.C1': 'C1 = avanzado',
  'cefr.C2': 'C2 = experto',

  'logout.failedTitle': 'No pudimos cerrar tu sesión',
  'logout.failedBody': 'Revisa tu internet e intenta de nuevo, por favor.',
  'logout.localBody':
    'No pudimos contactar con el servidor. Puedes quitar la sesión de este dispositivo; los demás seguirán conectados.',
  'logout.thisDevice': 'Cerrar sesión en este dispositivo',
  'logout.cleanupTitle': 'Sesión cerrada',

  'practice.greeting': 'Hola, {name}',
  'practice.loadingQuestion': 'Cargando tu pregunta…',
  'practice.loadFailedTitle': 'No pudimos cargar una pregunta',
  'practice.loadFailed': 'No pudimos cargar una pregunta de práctica. Intenta de nuevo.',
  'practice.helpLabel': 'Ayuda para esta pregunta',
  'practice.newWord': 'Palabra nueva',
  'practice.revision': 'Repaso',
  'practice.attemptChip': 'Intento {current} de {max}',
  'practice.progressLine': '{mastered} de {total} palabras dominadas',
  'practice.progressLearning': ' · {count} para repasar',
  'practice.answerInMyLanguage': 'Responder en mi idioma',
  'practice.answeringNative': 'Estás respondiendo en tu idioma — toca para inglés',
  'practice.settings': 'Ajustes',

  'practiceIntro.title': 'Cómo funciona la práctica',
  'practiceIntro.master': 'Consigue {score} puntos o más para dominar una palabra.',
  'practiceIntro.tries': 'Tienes {count} intentos para cada palabra.',
  'practiceIntro.silence': 'Si no oímos nada, no cuenta. Puedes intentarlo de nuevo.',
  'practiceIntro.native':
    'Responder en tu idioma usa un intento y comprueba la comprensión, pero solo una respuesta en inglés puede dominar la palabra.',
  'practiceIntro.dismiss': 'Entendido',

  'feedback.noResultTitle': 'Nada que mostrar',
  'feedback.noResultBody': 'No pudimos mostrar estos comentarios.',
  'feedback.nativeUnderstoodTitle': '¡Entendiste la pregunta!',
  'feedback.nativeUnderstoodBody': 'Tu respuesta tiene sentido. ¡Ahora intenta decirla en inglés!',
  'feedback.nativeMissedTitle': 'No es la respuesta',
  'feedback.nativeMissedBody':
    'Tu respuesta no encaja con la pregunta. Mira el ejemplo e intenta de nuevo.',
  'feedback.noSpeechTitle': 'No pudimos oírte',
  'feedback.noSpeechBody':
    'No te preocupes — esto no contó como intento. Toca el botón de grabar, habla claro y toca de nuevo para parar. También puedes pedir ayuda primero.',
  'feedback.nativeNoSpeechBody':
    'Nada cambió en tu práctica. Habla claro e intenta de nuevo en tu idioma.',
  'feedback.masteredTitle': '¡Palabra dominada!',
  'feedback.masteredBody': 'Conseguiste {score} puntos o más — ¡ya conoces esta palabra!',
  'feedback.passedTitle': '¡Muy bien!',
  'feedback.passedBody': '¡Aprobaste! Con {score} puntos o más dominas una palabra.',
  'feedback.retryTitle': 'Casi — intento {attempt} de {max}',
  'feedback.retryBodyOne': 'Te queda 1 intento. Lee los comentarios e intenta de nuevo.',
  'feedback.retryBodyMany': 'Te quedan {count} intentos. Lee los comentarios e intenta de nuevo.',
  'feedback.finalTitle': 'No quedan intentos',
  'feedback.finalBody': 'Esto es lo que puedes mejorar. Verás esta palabra otra vez más adelante.',
  'feedback.scoreLine': '{score} / 100',
  'feedback.scoreMeaning': '{pass} o más es aprobado. {master} o más domina la palabra.',
  'feedback.weHeard': 'Oímos',
  'feedback.feedbackLabel': 'Comentarios',
  'feedback.finalFeedbackLabel': 'Comentarios finales',
  'feedback.sayInEnglish': 'Dilo en inglés',
  'feedback.nextQuestion': 'Siguiente pregunta',
  'feedback.tryInEnglish': 'Intentar en inglés',
  'feedback.tryAgainNative': 'Intentar de nuevo en mi idioma',
  'feedback.seeHelp': 'Ver traducción y ejemplos',
  'feedback.attemptLine': 'Intento {current} de {max}',
  'feedback.attemptStillAvailable': 'El intento {current} de {max} sigue disponible',
  'feedback.wordAndQuestion': 'Palabra y pregunta',
  'feedback.originalTranscript': 'Lo que oímos en {language}',
  'feedback.englishTranslation': 'Traducción al inglés',
  'feedback.exampleEnglishAnswer': 'Ejemplo de respuesta en inglés',
  'feedback.nativeFinalTitle': 'No quedan intentos',
  'feedback.nativeFinalBody':
    'Esta respuesta usó tu último intento. Volverás a ver esta palabra más adelante.',

  'help.invalidLinkTitle': 'Este enlace no funciona',
  'help.invalidLinkBody': 'Vuelve a la práctica y abre la ayuda desde tu pregunta.',
  'help.loading': 'Cargando ayuda…',
  'help.loadFailedTitle': 'No pudimos cargar la ayuda',
  'help.loadFailed': 'No pudimos cargar la ayuda para esta pregunta. Intenta de nuevo.',
  'help.examplesLabel': 'Frases de ejemplo',
  'help.exampleNumber': 'Ejemplo {number}',
  'help.startPractice': 'Empezar práctica',

  'attempt.invalidLinkBody': 'Vuelve a la práctica y elige el modo práctica desde tu pregunta.',
  'attempt.loading': 'Cargando pregunta…',
  'attempt.loadFailedTitle': 'No pudimos cargar la pregunta',
  'attempt.loadFailed': 'No pudimos cargar esta pregunta. Intenta de nuevo.',

  'cp.currentLabel': 'Contraseña actual',
  'cp.currentPlaceholder': 'Tu contraseña actual',
  'cp.newLabel': 'Contraseña nueva',
  'cp.confirmLabel': 'Confirma la contraseña nueva',
  'cp.confirmPlaceholder': 'Escribe la contraseña nueva otra vez',
  'cp.mismatch': 'Las contraseñas no son iguales.',
  'cp.sameAsCurrent': 'Elige una contraseña diferente de la actual.',
  'cp.wrongCurrent': 'Tu contraseña actual es incorrecta.',
  'cp.failed': 'No pudimos cambiar tu contraseña. Intenta de nuevo.',
  'cp.updatedTitle': 'Contraseña cambiada',
  'cp.updatedBody': 'Tu contraseña fue cambiada. Los otros dispositivos cerraron sesión.',
  'cp.submit': 'Cambiar contraseña',
  'cp.submitBusy': 'Cambiando…',

  'da.warningTitle': 'Esto no se puede deshacer',
  'da.warningBody':
    'Eliminar tu cuenta borra de inmediato tu perfil, resultados, progreso y acceso a grabaciones. Los archivos de grabación se ponen en cola para su eliminación permanente, que puede tardar más. Esto no se puede deshacer.',
  'da.passwordLabel': 'Escribe tu contraseña',
  'da.passwordPlaceholder': 'Tu contraseña',
  'da.wrongPassword': 'Contraseña incorrecta.',
  'da.failed': 'No pudimos eliminar tu cuenta. Intenta de nuevo.',
  'da.unconfirmed':
    'No pudimos confirmar si tu cuenta se eliminó. Vuelve a conectarte e intenta iniciar sesión antes de repetir la eliminación.',
  'da.deletedTitle': 'Cuenta eliminada',
  'da.deletedBody':
    'Los datos de tu cuenta fueron eliminados y los archivos de grabación están en cola para su eliminación permanente.',
  'da.confirmTitle': '¿Eliminar tu cuenta?',
  'da.confirmBody':
    'Esto elimina para siempre tu cuenta y progreso. Los archivos de grabación permanecen en cola hasta que termina su eliminación permanente asíncrona.',
  'da.confirmDelete': 'Eliminar',
  'da.submit': 'Eliminar mi cuenta',
  'da.submitBusy': 'Eliminando…',

  'boundary.title': 'Algo salió mal',
  'boundary.body': 'Tus datos de aprendizaje están seguros. Intenta abrir esta pantalla de nuevo.',
  'notFound.title': 'Página no encontrada',
  'notFound.body': 'Este enlace no funciona o no es parte de tu lección.',
  'notFound.goHome': 'Ir al inicio',

  'recorder.permissionBody':
    'Necesitamos el micrófono para grabar tu respuesta. Permite el micrófono para esta app en los ajustes de tu teléfono y luego intenta de nuevo.',
  'recorder.openSettings': 'Abrir ajustes',
  'recorder.openSettingsFailed':
    'No pudimos abrir los ajustes. Abre los ajustes de tu teléfono y permite el micrófono para esta app.',
  'recorder.startLabel': 'Empezar a grabar',
  'recorder.startHint': 'Toca dos veces para grabar tu respuesta',
  'recorder.stopHint': 'Toca dos veces para detener y revisar tu respuesta',
  'recorder.stopLabel': 'Parar la grabación',
  'recorder.listening': 'Escuchando…',
  'recorder.statusRecording': 'Grabando… {elapsed} de 2:00 — toca para parar',
  'recorder.statusRecorded': 'Grabado {elapsed} — listo para enviar. Mantén la app abierta.',
  'recorder.statusRecovering': 'Comprobando si tu última respuesta se guardó…',
  'recorder.statusIdle': 'Toca el micrófono para grabar tu respuesta',
  'recorder.a11yRecording': 'Grabando. Toca el micrófono para parar.',
  'recorder.a11ySaved': 'Toma lista para enviar. Se elimina si sales o cierras la app.',
  'recorder.a11yUploading': 'Enviando y revisando tu respuesta.',
  'recorder.a11yRecovering': 'Comprobando tu última respuesta.',
  'recorder.a11yIdle': 'Listo para grabar.',
  'recorder.announceStarted': 'La grabación empezó. Toca el micrófono para parar.',
  'recorder.stageUploading': 'Enviando tu respuesta…',
  'recorder.stageListening': 'El coach de IA está escuchando…',
  'recorder.stageAlmostDone': 'Casi listo — gracias por esperar…',
  'recorder.waitHint': 'Esto tarda más de lo normal — comprobando tu resultado…',
  'recorder.waitingFor': 'Esperando desde hace {elapsed}',
  'recorder.privacyNote': 'Enviamos tu grabación solo cuando tocas “Enviar respuesta”.',
  'recorder.retentionNote':
    'Tu puntuación, transcripción y comentarios se guardan en ambos casos. El audio se elimina después de revisarlo, salvo que actives Guardar esta grabación.',
  'recorder.saveRecordingLabel': 'Guardar esta grabación',
  'recorder.saveRecordingHint':
    'Está desactivado de forma predeterminada. Si lo activas, el audio se guarda en Grabaciones hasta que lo elimines.',
  'recorder.play': 'Reproducir',
  'recorder.pause': 'Pausar',
  'recorder.playLabel': 'Reproducir tu grabación',
  'recorder.pauseLabel': 'Pausar la reproducción',
  'recorder.submit': 'Enviar respuesta',
  'recorder.rerecord': 'Grabar de nuevo',
  'recorder.discard': 'Descartar toma',
  'recorder.discardHint': 'Elimina esta grabación no enviada de este dispositivo.',
  'recorder.discardTitle': '¿Descartar esta toma?',
  'recorder.discardBody':
    'Esta grabación no enviada se eliminará de este dispositivo. No se enviará nada.',
  'recorder.discarded': 'Toma descartada. No se envió nada.',
  'recorder.errDiscardFailed':
    'No pudimos descartar esta toma de forma segura. Inténtalo de nuevo.',
  'recorder.cancelHint': 'Para el envío y guarda tu grabación.',
  'recorder.cancelSending': 'Cancelar envío',
  'recorder.cancelBeforeTransferHint':
    'Se detiene antes de que el audio salga del dispositivo y conserva esta toma.',
  'recorder.cancelAfterTransferHint':
    'Detiene el envío. Una carga temporal de audio puede quedar brevemente y luego caducará.',
  'recorder.stopWaiting': 'Dejar de esperar',
  'recorder.stopWaitingHint':
    'Deja de comprobar en esta pantalla. Es posible que tu respuesta ya se haya enviado o guardado.',
  'recorder.permissionRetryBody':
    'No se permitió el micrófono. Toca Empezar a grabar para volver a pedir permiso.',
  'recorder.permissionGranted': 'El micrófono está permitido. Toca Empezar a grabar.',
  'recorder.oneMinuteLeft': 'Queda un minuto',
  'recorder.thirtySecondsLeft': 'Quedan treinta segundos',
  'recorder.tenSecondsLeft': 'Quedan diez segundos',

  'recorder.errRetryInfoUnavailable':
    'No pudimos leer la información de tu respuesta guardada. Cierra y abre la app, luego graba de nuevo.',
  'recorder.errNothingToConfirm':
    'No pudimos comprobar si tu respuesta se guardó. Si no la ves, grábala de nuevo, por favor.',
  'recorder.errRetryInfoClear':
    'No pudimos borrar la información de la respuesta vieja. Cierra y abre la app antes de grabar de nuevo.',
  'recorder.errRetryInfoUpdate':
    'No pudimos guardar la información de tu respuesta. Cierra y abre la app para terminar.',
  'recorder.errResultSafeRetryInfo':
    'Tu resultado está seguro, pero no pudimos guardar la información de la app. Cierra y abre la app para terminar.',
  'recorder.errBadRecoveryResponse':
    'El servidor envió algo que no pudimos leer. Tus preguntas se cargaron de nuevo.',
  'recorder.errRecoveryMismatch':
    'El servidor envió información que no encaja. Tus preguntas se cargaron de nuevo.',
  'recorder.errInterruptedSaved':
    'Tu respuesta anterior se guardó. Tus preguntas se cargaron de nuevo.',
  'recorder.errCannotDisplay':
    'Tu respuesta se guardó, pero la app no pudo mostrar el resultado. Tus preguntas se cargaron de nuevo.',
  'recorder.errAlreadyAnswered':
    'Esta respuesta ya se envió, o la prueba siguió adelante. Tus preguntas se cargaron de nuevo.',
  'recorder.errUploadGone':
    'La subida vieja ya no está. Envía tu grabación de nuevo si la pregunta sigue ahí.',
  'recorder.errUploadUnconfirmed':
    'No pudimos comprobar la subida vieja. Tus preguntas se cargaron de nuevo. Graba otra vez solo si la pregunta sigue ahí.',
  'recorder.errRecoveryExpired':
    'La revisión de tu respuesta vieja terminó sin problemas. Tus preguntas se cargaron de nuevo.',
  'recorder.errAnswerSavedRetryInfo':
    'Tu respuesta se guardó, pero no pudimos guardar la información de la app. Cierra y abre la app para terminar.',
  'recorder.errInfoNotSavedNotUploaded':
    'No pudimos guardar la información de la app, así que tu grabación no se envió. Intenta de nuevo.',
  'recorder.errNotSent': 'No pudimos enviar tu grabación. Intenta de nuevo.',
  'recorder.errDeviceInterrupted':
    'El teléfono detuvo la grabación antes de guardarla. No se envió nada. Graba de nuevo cuando estés listo.',
  'recorder.errBackgroundDiscarded':
    'Tu toma sin enviar se eliminó cuando saliste de la app. No se envió nada. Graba de nuevo cuando estés listo.',
  'recorder.errTooShort': 'La grabación fue muy corta. Graba tu respuesta de nuevo.',
  'recorder.errSaveFailed': 'No pudimos guardar la grabación. Graba tu respuesta de nuevo.',
  'recorder.errNoRecording': 'No se guardó ninguna grabación. Graba de nuevo, por favor.',
  'recorder.errStartFailed': 'No pudimos empezar a grabar. Revisa el micrófono e intenta de nuevo.',
  'recorder.errAudioReset':
    'No pudimos restablecer el audio. Si el sonido no funciona bien, cierra y vuelve a abrir la app.',
  'recorder.errPlayFailed': 'No pudimos reproducir tu grabación. Aún puedes enviarla.',
  'recorder.errRejected':
    'El servidor no aceptó esta grabación. Lee la pregunta e intenta de nuevo.',

  'header.home': 'Inicio',
  'header.history': 'Historial',
  'header.recordings': 'Mis grabaciones',
  'header.settings': 'Ajustes',
  'header.privacy': 'Política de privacidad',
  'header.terms': 'Condiciones de uso',

  'home.levelLabel': 'Tu nivel',
  'home.masteryLabel': 'Palabras dominadas',
  'home.streakNone': 'Aún no tienes racha. ¡Practica hoy para empezar una!',
  'home.streakOne': 'Racha de 1 día',
  'home.streakMany': 'Racha de {count} días',
  'home.dueChip': '{count} para repasar',
  'home.dueNone': 'Nada para repasar ahora.',
  'home.practicedNoneToday': 'Hoy todavía no has practicado.',
  'home.practicedOnceToday': 'Hoy practicaste 1 vez.',
  'home.practicedToday': 'Hoy practicaste {count} veces.',
  'home.startPractice': 'Empezar a practicar',
  'home.loading': 'Cargando tu progreso…',
  'home.loadFailedTitle': 'No pudimos cargar tu progreso',
  'home.loadFailed': 'No pudimos cargar tu progreso. Intenta de nuevo.',

  'summary.title': 'Tu sesión de práctica',
  'summary.attempts': 'Respuestas enviadas: {count}',
  'summary.passed': 'Palabras aprobadas: {count}',
  'summary.mastered': 'Palabras dominadas: {count}',
  'summary.levelUps': 'Subidas de nivel: {count}',
  'summary.dismiss': 'Entendido',

  'levelUp.title': '¡Subiste de nivel!',
  'levelUp.body': '¡Llegaste a {level}!',
  'levelUp.progress': 'Pasaste de {from} a {to}.',

  'history.loading': 'Cargando tus respuestas…',
  'history.loadFailedTitle': 'No pudimos cargar tus respuestas',
  'history.loadFailed': 'No pudimos cargar tus respuestas. Intenta de nuevo.',
  'history.emptyTitle': 'Aún no hay respuestas',
  'history.emptyBody': 'Practica un poco — tus respuestas aparecerán aquí.',
  'history.loadMore': 'Ver respuestas anteriores',
  'history.loadingMore': 'Cargando más…',
  'history.contextDiagnostic': 'Prueba de nivel',
  'history.contextPractice': 'Práctica',
  'history.contextNative': 'Respuesta en tu idioma',
  'history.attemptNo': 'Intento {number}',
  'history.showDetails': 'Ver detalles',
  'history.hideDetails': 'Ocultar detalles',
  'history.detailsHint': 'Toca dos veces para expandir o contraer esta respuesta',

  'recordings.loading': 'Cargando tus grabaciones…',
  'recordings.loadFailedTitle': 'No pudimos cargar tus grabaciones',
  'recordings.loadFailed': 'No pudimos cargar tus grabaciones. Intenta de nuevo.',
  'recordings.emptyTitle': 'No hay grabaciones guardadas',
  'recordings.emptyBody':
    'Activa Guardar esta grabación antes de enviar una respuesta. Las grabaciones guardadas aparecerán aquí.',
  'recordings.loadMore': 'Ver grabaciones anteriores',
  'recordings.loadingMore': 'Cargando más…',
  'recordings.intro':
    'Escucha las grabaciones que enviaste o elimina solo el audio y conserva tus resultados.',
  'recordings.contextDiagnostic': 'Prueba de nivel',
  'recordings.contextPractice': 'Práctica de inglés',
  'recordings.contextNative': 'Respuesta en tu idioma',
  'recordings.statusAvailable': 'Lista para reproducir',
  'recordings.statusPending': 'Preparándose',
  'recordings.statusUnavailable': 'No disponible',
  'recordings.checkPending': 'Comprobar grabaciones pendientes',
  'recordings.yourRecording': 'Tu grabación',
  'recordings.playLabel': 'Reproducir tu grabación enviada',
  'recordings.pauseLabel': 'Pausar tu grabación enviada',
  'recordings.playFailed': 'No pudimos reproducir esta grabación. Intenta de nuevo.',
  'recordings.shareAction': 'Compartir audio',
  'recordings.shareLabel': 'Compartir tu grabación enviada',
  'recordings.shareHint':
    'Descarga una copia privada temporal y abre las opciones para compartir de tu dispositivo.',
  'recordings.sharing': 'Preparando el audio…',
  'recordings.shareUnavailable': 'Compartir no funciona en este dispositivo.',
  'recordings.shareFailed': 'No pudimos compartir esta grabación. Intenta de nuevo.',
  'recordings.preparing': 'Preparando…',
  'recordings.pending': 'Esta grabación aún se está preparando. La comprobaremos brevemente.',
  'recordings.unavailable': 'Esta grabación no está disponible.',
  'recordings.deleteTitle': '¿Eliminar esta grabación?',
  'recordings.deleteBody':
    'La grabación se quitará ahora y su audio guardado quedará en cola para eliminación permanente. Tu puntuación, transcripción y comentarios se conservarán.',
  'recordings.deleteBodyNamed':
    '¿Quitar la grabación de “{name}” y poner su audio guardado en cola para eliminación permanente? Tu puntuación, transcripción y comentarios se conservarán.',
  'recordings.deleteAction': 'Eliminar grabación',
  'recordings.deleteHint':
    'Quita la grabación ahora y pone el audio en cola para eliminación permanente; tu resultado se conserva.',
  'recordings.deleteFailed': 'No pudimos eliminar esta grabación. Intenta de nuevo.',
  'recordings.deleted':
    'Grabación quitada; audio guardado en cola para eliminación permanente. Tu resultado sigue guardado.',
  'recordings.progressLabel': 'Progreso de reproducción de la grabación',

  'practice.skipWord': 'Saltar esta palabra por ahora',
  'practice.skipFailedTitle': 'No pudimos saltar esta palabra',
  'practice.skipFailed': 'No pudimos saltar esta palabra. Intenta de nuevo.',

  'login.forgot': '¿Olvidaste tu contraseña?',
  'reset.requestTitle': 'Restablece tu contraseña',
  'reset.requestBody': 'Escribe tu email. Te enviaremos un código.',
  'reset.submitRequest': 'Enviar código',
  'reset.submitRequestBusy': 'Enviando…',
  'reset.requestFailed': 'No pudimos enviar el código. Intenta de nuevo.',
  'reset.sentTitle': 'Revisa tu email',
  'reset.sentBody':
    'Si existe una cuenta con este email, te enviamos un código. El código funciona por 30 minutos.',
  'reset.continue': 'Ya tengo el código',
  'reset.resend': 'Enviar código de nuevo',
  'reset.resendBusy': 'Enviando de nuevo…',
  'reset.newTitle': 'Elige una contraseña nueva',
  'reset.codeLabel': 'Código del email',
  'reset.codePlaceholder': 'Pega el código aquí',
  'reset.submitNew': 'Guardar contraseña nueva',
  'reset.submitNewBusy': 'Guardando…',
  'reset.doneBanner':
    'Tu contraseña cambió y las sesiones existentes se cerraron. Inicia sesión, por favor.',
  'reset.backToLogin': 'Volver a iniciar sesión',

  'settings.profileTitle': 'Tu perfil',
  'ads.label': 'Anuncio',
  'ads.privacyOptions': 'Opciones de privacidad de anuncios',
  'ads.privacyOptionsHelp': 'Revisa o cambia las opciones de privacidad usadas para los anuncios.',
  'ads.privacyFailed': 'No pudimos abrir las opciones de privacidad. Intenta de nuevo.',
  'settings.levelLabel': 'Nivel de inglés',
  'settings.appLanguageLabel': 'Idioma de la aplicación',
  'settings.appLanguageHelp': 'Elige el idioma de los botones y mensajes.',
  'settings.learningLanguageLabel': 'Lengua materna',
  'settings.learningLanguageHelp':
    'Se usa solo para la ayuda traducida y las respuestas en tu idioma. No cambia los botones ni mensajes; usa Idioma de la app para eso.',
  'settings.levelPending': 'Aún sin prueba',
  'settings.saveName': 'Guardar nombre',
  'settings.saveNameBusy': 'Guardando…',
  'settings.saved': 'Guardado.',
  'settings.updateFailed': 'No pudimos guardar tus cambios. Intenta de nuevo.',
  'settings.export': 'Exportar mis datos',
  'settings.exportBusy': 'Preparando tus datos…',
  'settings.exportHelp':
    'El JSON incluye tus datos de aprendizaje y los detalles de las grabaciones guardadas. No incluye archivos ni bytes de audio.',
  'settings.exportFailed': 'No pudimos exportar tus datos. Intenta de nuevo.',
  'settings.exportUnavailable': 'Compartir no funciona en este teléfono.',
  'settings.recordingsDeleteAll': 'Eliminar todas las grabaciones',
  'settings.recordingsDeleteAllHint':
    'Quita todas las grabaciones guardadas y conserva tus puntuaciones, transcripciones y comentarios.',
  'settings.recordingsDeleteAllBusy': 'Eliminando grabaciones…',
  'settings.recordingsDeleteAllTitle': '¿Eliminar todas las grabaciones?',
  'settings.recordingsDeleteAllBody':
    'Todas las grabaciones guardadas se quitarán ahora y su audio quedará en cola para eliminación permanente. Tus puntuaciones, transcripciones y comentarios se conservarán. Esta acción no se puede deshacer.',
  'settings.recordingsDeleteAllConfirm': 'Eliminar todas',
  'settings.recordingsDeleteAllSuccess':
    'Se quitaron todas las grabaciones; el audio guardado quedó en cola para eliminación permanente. Tus resultados siguen guardados.',
  'settings.recordingsDeleteAllFailed':
    'No pudimos eliminar todas las grabaciones. Intenta de nuevo.',
  'settings.retake': 'Reiniciar prueba de nivel',
  'retake.confirmTitle': '¿Reiniciar la prueba de nivel?',
  'retake.confirmBody':
    'Esto borra el progreso de la prueba de nivel actual y empieza de nuevo. Tu historial de práctica se conserva.',
  'retake.confirm': 'Reiniciar prueba',
  'retake.failed': 'No pudimos reiniciar la prueba. Intenta de nuevo.',

  'reminder.toggleLabel': 'Recordatorio diario',
  'reminder.timeLabel': 'Hora del recordatorio: {time}',
  'reminder.earlier': 'Una hora antes',
  'reminder.later': 'Una hora después',
  'reminder.denied':
    'Las notificaciones están apagadas para esta app. Actívalas en los ajustes de tu teléfono, por favor.',
  'reminder.failed': 'No pudimos crear el recordatorio. Intenta de nuevo.',
  'reminder.notificationTitle': '¡Hora de practicar!',
  'reminder.notificationBody': 'Dedica unos minutos hoy a practicar inglés.',

  'legal.placeholderNote':
    'Vigente desde el 28 de agosto de 2026. Este resumen describe cómo la app actual maneja los datos.',
  'privacy.p1':
    'Guardamos tu nombre, email, hash de contraseña, ajustes de idioma, nivel, progreso, resultados de evaluaciones, transcripciones, comentarios y metadatos de grabaciones retenidas. El servicio también procesa información de solicitudes y red necesaria para autenticación, seguridad, límites, fiabilidad y prevención de abuso.',
  'privacy.p2':
    'OpenAI procesa el audio y las transcripciones enviados para transcripción y comentarios de aprendizaje. El audio de producción se guarda de forma privada en Amazon S3. El email de restablecimiento usa el servicio de correo configurado. Cuando los anuncios están activos y el consentimiento lo permite, Google Mobile Ads y sus herramientas de consentimiento procesan datos publicitarios. Las subidas fallidas y el audio que eliges no guardar son temporales; las grabaciones que decides conservar permanecen hasta que las borres o elimines tu cuenta.',
  'privacy.p3':
    'En Ajustes puedes exportar los datos de cuenta actualmente incluidos, borrar grabaciones, cambiar opciones de privacidad publicitaria disponibles o eliminar tu cuenta. Los datos de cuenta se borran de inmediato al completar la eliminación; los archivos de grabación permanecen en cola hasta que termina su eliminación permanente asíncrona.',
  'terms.p1':
    'Esta app ofrece práctica de inglés asistida por IA y una estimación de nivel CEFR. Los resultados y comentarios pueden ser incompletos o incorrectos, no son asesoramiento profesional ni un certificado oficial.',
  'terms.p2':
    'Mantén tus credenciales privadas y usa solo una cuenta autorizada. No abuses del servicio, evadas límites, interfieras con otros, subas contenido ilegal ni intentes comprometer la app o sus proveedores.',
  'terms.p3':
    'La disponibilidad, evaluaciones de IA, grabaciones, anuncios, límites y funciones pueden cambiar o no estar disponibles. Puedes dejar de usar la app y eliminar tu cuenta en Ajustes. La eliminación no se puede deshacer y la limpieza de archivos de grabación termina de forma asíncrona.',
};

const zh: Record<MessageKey, string> = {
  'common.tryAgain': '再试一次',
  'common.cancel': '取消',
  'common.ok': '好的',
  'common.show': '显示',
  'common.hide': '隐藏',
  'common.showPassword': '显示密码',
  'common.hidePassword': '隐藏密码',
  'common.logOut': '在所有设备上退出登录',
  'common.backToPractice': '返回练习',
  'label.word': '单词',
  'label.question': '问题',

  'wait.second': '请等 1 秒。',
  'wait.seconds': '请等 {count} 秒。',
  'wait.minute': '请等 1 分钟。',
  'wait.minutes': '请等 {count} 分钟。',
  'wait.hour': '请等 1 小时。',
  'wait.hours': '请等 {count} 小时。',

  'error.network': '无法连接。请检查网络后再试一次。',
  'error.timeout': '用时太久了。请检查网络后再试一次。',
  'error.tooLarge': '录音太大了。请录一个短一点的回答。',
  'error.unsupportedFormat': '应用无法使用这种录音。请重新录你的回答。',
  'error.cannotAssess': '我们无法检查这段录音。请说一会儿话，回答不要超过两分钟。',
  'error.conflict': '我们还在检查一个回答，或者问题变了。请稍等一下再试。',
  'error.tooMany': '尝试太多次了。请稍等一下再试。',
  'error.serverBusy': '应用现在出了点问题。请稍后再试。',
  'error.validation': '有些信息缺少或不对。请检查后再试一次。',
  'error.wrongCredentials': '邮箱或密码不对。',
  'error.emailTaken': '这个邮箱已经有账户了。请登录。',
  'error.loginAgain': '请重新登录。',
  'error.forbidden': '这个账户不能做这个操作。',
  'error.notFound': '我们找不到这个内容。请返回再试一次。',
  'error.questionChanged': '这个问题变了。请用新问题再试一次。',
  'error.diagnosticDone': '你的水平测试已经完成了。',
  'error.stillChecking': '我们还在检查你上一个回答。请稍等。',
  'error.alreadySent': '我们已经收到这个回答了。请稍等一下再试。',
  'error.stateChanged': '你的进度变了。请再试一次。',
  'error.dailyLimit': '你今天的练习用完了。请明天再来。',
  'error.networkDailyLimit': '这个网络今天的练习用完了。请明天再试。',
  'error.busy': '现在练习的人很多。请稍等一下再试。',
  'error.audioInvalid': '我们无法使用这段录音。请重新录你的回答。',
  'error.audioSilent': '我们没有听到任何声音。请检查麦克风，然后重新录制你的回答。',
  'error.audioTooLong': '录音太长了。回答请不要超过两分钟。',
  'error.audioUnreadable': '我们听不到这段录音。请重新录你的回答。',
  'error.checkFailed': '我们无法检查你的回答。请再试一次。',
  'error.resetInvalid': '这个验证码无效或者太旧了。请重新申请一个验证码。',
  'error.upgradeRequired': '请更新应用后继续使用。',
  'error.assessmentResultIncompatible':
    '应用更新后无法显示这个已保存的回答。你的题目已重新加载。请录制一个新回答。',
  'error.internal': '出了点问题。请再试一次。',
  'email.invalid': '请输入有效的邮箱地址。',

  'auth.sessionExpired': '为了保护你的账户，你已被退出登录。请重新登录。',
  'auth.restoreUnavailable': '我们无法打开你保存的登录。请解锁手机后再试一次。',
  'auth.logoutCleanupFailed':
    '你已退出登录，但应用没能完成清理。请先关闭应用再打开，然后重新登录。',
  'auth.accountDeletedCleanupFailed':
    '你的账户已删除，但应用没能完成清理。请先关闭应用再打开，然后重新登录。',
  'auth.registrationCompletedLoginRequired': '你的账户已创建，但此设备无法保存登录信息。',

  'password.tooShort': '密码至少要有 8 个字符。',
  'password.needsLetterAndNumber': '密码至少要有一个字母和一个数字。',
  'password.tooLong': '密码太长了。请用短一点的密码。',
  'password.confirmLabel': '确认密码',
  'password.confirmPlaceholder': '再次输入密码',
  'password.mismatch': '两次输入的密码不一致。',
  'password.showConfirmation': '显示确认密码',
  'password.hideConfirmation': '隐藏确认密码',
  'language.appLabel': '应用语言',
  'language.appHelp': '选择此设备上应用使用的语言。',
  'language.saveFailed': '应用语言已更改，但无法保存在此设备上。',
  'language.en': '英语',
  'language.te': '泰卢固语',
  'language.hi': '印地语',
  'language.es': '西班牙语',
  'language.zh': '中文',

  'login.title': 'AI English Coach',
  'login.subtitle': '和你的 AI 教练一起练习说英语。',
  'login.emailLabel': '邮箱',
  'login.emailPlaceholder': 'you@example.com',
  'login.passwordLabel': '密码',
  'login.passwordPlaceholder': '你的密码',
  'login.submit': '登录',
  'login.submitBusy': '正在登录…',
  'login.failed': '我们无法帮你登录。请再试一次。',
  'login.footerPrompt': '新用户？',
  'login.footerLink': '创建账户',

  'signup.title': '创建你的账户',
  'signup.subtitle': '我们会按你的语言安排练习。',
  'signup.nameLabel': '名字',
  'signup.namePlaceholder': '你的名字',
  'signup.passwordPlaceholder': '至少 8 个字符，包含一个字母和一个数字',
  'signup.languageLabel': '母语',
  'signup.languageHelp': '用于翻译帮助和用你的语言回答。这与应用语言是分开的。',
  'signup.submit': '创建账户',
  'signup.submitBusy': '正在创建你的账户…',
  'signup.failed': '我们无法创建你的账户。请检查你的信息后再试一次。',
  'signup.createdLoginBanner': '你的账户已创建，但此设备无法保存登录信息。请用新密码登录。',
  'signup.footerPrompt': '已经有账户？',
  'signup.footerLink': '登录',

  'gate.restoring': '正在打开你的账户…',
  'gate.loadingProfile': '正在加载你的资料…',
  'gate.signingOut': '正在退出登录…',
  'gate.sessionErrorTitle': '我们无法打开你保存的登录',
  'gate.resetSession': '删除保存的登录',
  'gate.serverErrorTitle': '我们无法连接服务器',
  'gate.profileFailed': '我们无法加载你的资料。请再试一次。',
  'gate.offlineTitle': '你已离线',
  'gate.offlineBody': '你的登录信息仍然保留。请重新连接网络以加载个人资料。',

  'network.offline': '没有网络连接。你保存的内容是安全的。',
  'network.backOnline': '网络已恢复',
  'network.offlineTitle': '你已离线',
  'network.offlineBody': '重新联网以加载此页面。它会自动继续。',
  'refresh.updating': '正在更新…',
  'refresh.failedUsingSaved': '无法刷新。正在显示已保存的信息。',
  'pagination.safetyStop': '此列表已达到安全显示上限。下拉刷新以查看最新项目。',
  'upgrade.title': '需要更新',
  'upgrade.body': '你需要更新版 AI English Coach，才能继续安全使用学习数据。',
  'upgrade.action': '更新应用',
  'upgrade.actionHint': '打开 AI English Coach 的应用商店页面。',
  'upgrade.openFailed': '无法打开应用商店。请打开商店并更新 AI English Coach。',
  'replay.checkingTitle': '正在检查你保存的回答',
  'replay.checkingBody': '你的回答是安全的。我们正在恢复反馈。',
  'replay.failedTitle': '无法恢复你的反馈',
  'replay.failedBody': '你保存的回答仍然安全。现在重试，或稍后再查看。',
  'replay.checkLater': '稍后查看',
  'replay.pendingTitle': '已保存的回答正在等待',
  'replay.pendingBody': '你的回答是安全的。反馈准备好后，请再次检查以恢复反馈。',
  'replay.checkNow': '立即检查',

  'header.diagnostic': '英语水平测试',
  'header.practice': '练习',
  'header.help': '帮助',
  'header.attempt': '练习模式',
  'header.feedback': '反馈',
  'header.changePassword': '修改密码',
  'header.deleteAccount': '删除账户',

  'menu.accountTitle': '账户',
  'hint.finishRecordingFirst': '请先完成你的录音。',

  'diag.preparing': '正在准备你的测试…',
  'diag.loadFailedTitle': '我们无法加载测试',
  'diag.loadFailed': '我们无法加载测试。请再试一次。',
  'diag.introTitle': '开始之前',
  'diag.introWhat': '这个小测试会找出你的英语水平。',
  'diag.introCount': '你会回答 2 或 3 个问题。',
  'diag.introRecorded': '你的回答会被录音。',
  'diag.introSpeakEnglish': '请说英语。',
  'diag.introStart': '开始测试',
  'diag.progress': '第 {current} 题，最多 {max} 题',
  'diag.answerSavedTitle': '回答已保存',
  'diag.answerSavedBody': '你的回答已保存。测试结束时你会看到你的分数。',
  'diag.answerCheckedTitle': '回答已检查',
  'diag.noSpeechTitle': '我们没有听到你的声音',
  'diag.recordAgain': '重新录音',
  'diag.scoreLine': '{score}/100 — {result}',
  'diag.passed': '通过',
  'diag.notPassed': '尚未通过',
  'diag.transcriptLabel': '我们听到的内容',
  'diag.answerQuestion': '{word}：{question}',
  'diag.nextQuestion': '下一题',
  'diag.seeLevel': '看我的水平',
  'diag.completeTitle': '测试完成！',
  'diag.levelIntro': '你的英语水平是',
  'diag.levelHint': '我们会给你这个水平的练习题。',
  'diag.startPracticing': '开始练习',
  'diag.startPracticingBusy': '正在打开练习…',
  'diag.ackFailedTitle': '我们无法打开练习',
  'diag.ackFailed': '你的等级已保存。请重试以继续。',
  'diag.answersTitle': '你的回答',
  'diag.answerLine': '第 {number} 题 — {score}/100 {mark}',
  'diag.assessFailedTitle': '我们无法检查你的回答',

  'cefr.A1': 'A1 = 入门',
  'cefr.A2': 'A2 = 基础',
  'cefr.B1': 'B1 = 中级',
  'cefr.B2': 'B2 = 中高级',
  'cefr.C1': 'C1 = 高级',
  'cefr.C2': 'C2 = 精通',

  'logout.failedTitle': '我们无法帮你退出登录',
  'logout.failedBody': '请检查网络后再试一次。',
  'logout.localBody': '无法联系服务器。你可以移除此设备上的登录；其他设备会保持登录。',
  'logout.thisDevice': '在此设备上退出登录',
  'logout.cleanupTitle': '已退出登录',

  'practice.greeting': '你好，{name}',
  'practice.loadingQuestion': '正在加载你的问题…',
  'practice.loadFailedTitle': '我们无法加载问题',
  'practice.loadFailed': '我们无法加载练习题。请再试一次。',
  'practice.helpLabel': '这道题的帮助',
  'practice.newWord': '新单词',
  'practice.revision': '复习',
  'practice.attemptChip': '第 {current} 次，共 {max} 次',
  'practice.progressLine': '{total} 个单词中已掌握 {mastered} 个',
  'practice.progressLearning': ' · {count} 个待复习',
  'practice.answerInMyLanguage': '用我的语言回答',
  'practice.answeringNative': '你正在用自己的语言回答 — 点这里切换英语',
  'practice.settings': '设置',

  'practiceIntro.title': '练习是怎么进行的',
  'practiceIntro.master': '得 {score} 分或更多，就掌握一个单词。',
  'practiceIntro.tries': '每个单词你有 {count} 次机会。',
  'practiceIntro.silence': '如果我们什么都没听到，不算次数。你可以再试。',
  'practiceIntro.native':
    '用你的语言回答会占用一次尝试，并检查理解；只有英语回答才能掌握这个单词。',
  'practiceIntro.dismiss': '知道了',

  'feedback.noResultTitle': '没有可显示的内容',
  'feedback.noResultBody': '我们无法显示这条反馈。',
  'feedback.nativeUnderstoodTitle': '你理解了这个问题！',
  'feedback.nativeUnderstoodBody': '你的回答说得通。现在试着用英语说出来吧！',
  'feedback.nativeMissedTitle': '回答不太对',
  'feedback.nativeMissedBody': '你的回答和问题对不上。看看例子，再试一次。',
  'feedback.noSpeechTitle': '我们听不到你的声音',
  'feedback.noSpeechBody':
    '别担心 — 这次不算。点录音按钮，清楚地说话，再点一次停止。你也可以先看帮助。',
  'feedback.nativeNoSpeechBody': '你的练习没有变化。请清楚地说话，用你的语言再试一次。',
  'feedback.masteredTitle': '单词掌握了！',
  'feedback.masteredBody': '你得了 {score} 分或更多 — 这个单词是你的了！',
  'feedback.passedTitle': '做得好！',
  'feedback.passedBody': '你通过了！得 {score} 分或更多就能掌握一个单词。',
  'feedback.retryTitle': '差一点 — 第 {attempt} 次，共 {max} 次',
  'feedback.retryBodyOne': '你还有 1 次机会。读一读反馈，再试一次。',
  'feedback.retryBodyMany': '你还有 {count} 次机会。读一读反馈，再试一次。',
  'feedback.finalTitle': '没有机会了',
  'feedback.finalBody': '这是你要练的地方。这个单词以后还会出现。',
  'feedback.scoreLine': '{score} / 100',
  'feedback.scoreMeaning': '{pass} 分或更多算通过。{master} 分或更多算掌握。',
  'feedback.weHeard': '我们听到的',
  'feedback.feedbackLabel': '反馈',
  'feedback.finalFeedbackLabel': '最终反馈',
  'feedback.sayInEnglish': '用英语说',
  'feedback.nextQuestion': '下一题',
  'feedback.tryInEnglish': '用英语试试',
  'feedback.tryAgainNative': '用我的语言再试一次',
  'feedback.seeHelp': '看翻译和例子',
  'feedback.attemptLine': '第 {current} 次，共 {max} 次',
  'feedback.attemptStillAvailable': '第 {current} 次尝试（共 {max} 次）仍可使用',
  'feedback.wordAndQuestion': '单词和问题',
  'feedback.originalTranscript': '我们听到的{language}内容',
  'feedback.englishTranslation': '英语翻译',
  'feedback.exampleEnglishAnswer': '英语示例答案',
  'feedback.nativeFinalTitle': '没有更多尝试了',
  'feedback.nativeFinalBody': '这个回答用掉了最后一次尝试。以后你还会再看到这个单词。',

  'help.invalidLinkTitle': '这个链接无效',
  'help.invalidLinkBody': '请返回练习，从你的问题打开帮助。',
  'help.loading': '正在加载帮助…',
  'help.loadFailedTitle': '我们无法加载帮助',
  'help.loadFailed': '我们无法加载这道题的帮助。请再试一次。',
  'help.examplesLabel': '例句',
  'help.exampleNumber': '例子 {number}',
  'help.startPractice': '开始练习',

  'attempt.invalidLinkBody': '请返回练习，从你的问题选择练习模式。',
  'attempt.loading': '正在加载问题…',
  'attempt.loadFailedTitle': '我们无法加载这个问题',
  'attempt.loadFailed': '我们无法加载这道题。请再试一次。',

  'cp.currentLabel': '当前密码',
  'cp.currentPlaceholder': '你现在的密码',
  'cp.newLabel': '新密码',
  'cp.confirmLabel': '确认新密码',
  'cp.confirmPlaceholder': '再输入一次新密码',
  'cp.mismatch': '两次密码不一样。',
  'cp.sameAsCurrent': '请选择与当前密码不同的密码。',
  'cp.wrongCurrent': '你现在的密码不对。',
  'cp.failed': '我们无法修改你的密码。请再试一次。',
  'cp.updatedTitle': '密码已修改',
  'cp.updatedBody': '你的密码已经改好了。其他设备已退出登录。',
  'cp.submit': '修改密码',
  'cp.submitBusy': '正在修改…',

  'da.warningTitle': '此操作无法撤销',
  'da.warningBody':
    '删除账户会立即删除你的资料、结果、进度和录音访问权限。录音文件会排队等待永久删除，这可能需要额外时间。此操作无法撤销。',
  'da.passwordLabel': '输入你的密码',
  'da.passwordPlaceholder': '你的密码',
  'da.wrongPassword': '密码不对。',
  'da.failed': '我们无法删除你的账户。请再试一次。',
  'da.unconfirmed': '无法确认账户是否已删除。请重新联网并尝试登录，再决定是否重复删除。',
  'da.deletedTitle': '账户已删除',
  'da.deletedBody': '你的账户数据已删除，录音文件已排队等待永久删除。',
  'da.confirmTitle': '要删除你的账户吗？',
  'da.confirmBody': '这会永久删除你的账户和进度。录音文件会保留在队列中，直到异步永久删除完成。',
  'da.confirmDelete': '删除',
  'da.submit': '删除我的账户',
  'da.submitBusy': '正在删除…',

  'boundary.title': '出了点问题',
  'boundary.body': '你的学习数据是安全的。请重新打开这个页面。',
  'notFound.title': '找不到页面',
  'notFound.body': '这个链接无效，或者不属于你的课程。',
  'notFound.goHome': '回到首页',

  'recorder.permissionBody':
    '录你的回答需要麦克风。请在手机设置里允许这个应用使用麦克风，然后再试一次。',
  'recorder.openSettings': '打开设置',
  'recorder.openSettingsFailed': '我们无法打开设置。请自己打开手机设置，允许这个应用使用麦克风。',
  'recorder.startLabel': '开始录音',
  'recorder.startHint': '双击录制您的回答',
  'recorder.stopHint': '双击停止并查看您的回答',
  'recorder.stopLabel': '停止录音',
  'recorder.listening': '正在听…',
  'recorder.statusRecording': '正在录音… {elapsed} / 2:00 — 点一下停止',
  'recorder.statusRecorded': '已录 {elapsed} — 可以发送了。请保持应用打开。',
  'recorder.statusRecovering': '正在确认你上一个回答有没有保存…',
  'recorder.statusIdle': '点麦克风，录下你的回答',
  'recorder.a11yRecording': '正在录音。点麦克风停止。',
  'recorder.a11ySaved': '录音已准备发送。离开或关闭应用会删除它。',
  'recorder.a11yUploading': '正在发送并检查你的回答。',
  'recorder.a11yRecovering': '正在确认你上一个回答。',
  'recorder.a11yIdle': '可以开始录音。',
  'recorder.announceStarted': '录音开始了。点麦克风停止。',
  'recorder.stageUploading': '正在发送你的回答…',
  'recorder.stageListening': 'AI 教练正在听…',
  'recorder.stageAlmostDone': '就快好了 — 谢谢你的等待…',
  'recorder.waitHint': '这次比平时慢一点 — 正在查看你的结果…',
  'recorder.waitingFor': '已等待 {elapsed}',
  'recorder.privacyNote': '只有你点“发送回答”之后，我们才会发送你的录音。',
  'recorder.retentionNote':
    '无论是否保存录音，你的分数、文字记录和反馈都会保留。除非你打开“保存这段录音”，否则音频会在检查后删除。',
  'recorder.saveRecordingLabel': '保存这段录音',
  'recorder.saveRecordingHint': '默认关闭。打开后，这段音频会保存在“录音”中，直到你删除它。',
  'recorder.play': '播放',
  'recorder.pause': '暂停',
  'recorder.playLabel': '播放你的录音',
  'recorder.pauseLabel': '暂停播放',
  'recorder.submit': '发送回答',
  'recorder.rerecord': '重新录音',
  'recorder.discard': '丢弃这次录音',
  'recorder.discardHint': '从此设备删除这段尚未发送的录音。',
  'recorder.discardTitle': '丢弃这次录音？',
  'recorder.discardBody': '这段尚未发送的录音将从此设备删除，不会发送任何内容。',
  'recorder.discarded': '这次录音已丢弃，未发送任何内容。',
  'recorder.errDiscardFailed': '无法安全地丢弃这次录音，请重试。',
  'recorder.cancelHint': '停止发送并保留你的录音。',
  'recorder.cancelSending': '取消发送',
  'recorder.cancelBeforeTransferHint': '在音频离开此设备前停止，并保留这次录音。',
  'recorder.cancelAfterTransferHint': '停止提交。临时音频上传可能会短暂保留，之后会自动过期。',
  'recorder.stopWaiting': '停止等待',
  'recorder.stopWaitingHint': '停止在此页面检查。你的回答可能已经发送或保存。',
  'recorder.permissionRetryBody': '麦克风权限未允许。点“开始录音”可再次请求。',
  'recorder.permissionGranted': '麦克风权限已开启。点“开始录音”。',
  'recorder.oneMinuteLeft': '还剩一分钟',
  'recorder.thirtySecondsLeft': '还剩三十秒',
  'recorder.tenSecondsLeft': '还剩十秒',

  'recorder.errRetryInfoUnavailable':
    '我们无法读取你保存的回答信息。请关闭应用再打开，然后重新录音。',
  'recorder.errNothingToConfirm': '我们无法确认你的回答有没有保存。如果看不到它，请重新录一次。',
  'recorder.errRetryInfoClear': '我们无法清除旧的回答信息。重新录音之前，请先关闭应用再打开。',
  'recorder.errRetryInfoUpdate': '我们无法保存你的回答信息。请关闭应用再打开来完成。',
  'recorder.errResultSafeRetryInfo':
    '你的结果是安全的，但我们无法保存应用信息。请关闭应用再打开来完成。',
  'recorder.errBadRecoveryResponse': '服务器发来我们读不懂的内容。你的题目已重新加载。',
  'recorder.errRecoveryMismatch': '服务器发来的信息对不上。你的题目已重新加载。',
  'recorder.errInterruptedSaved': '你之前的回答已保存。你的题目已重新加载。',
  'recorder.errCannotDisplay': '你的回答已保存，但应用无法显示结果。你的题目已重新加载。',
  'recorder.errAlreadyAnswered': '这个回答已经发送过了，或者测试已经继续了。你的题目已重新加载。',
  'recorder.errUploadGone': '旧的上传已经不在了。如果题目还在，请重新发送你的录音。',
  'recorder.errUploadUnconfirmed':
    '我们无法确认旧的上传。你的题目已重新加载。只有题目还在时才需要重新录音。',
  'recorder.errRecoveryExpired': '旧回答的确认已安全结束。你的题目已重新加载。',
  'recorder.errAnswerSavedRetryInfo':
    '你的回答已保存，但我们无法保存应用信息。请关闭应用再打开来完成。',
  'recorder.errInfoNotSavedNotUploaded': '我们无法保存应用信息，所以你的录音没有发送。请再试一次。',
  'recorder.errNotSent': '我们无法发送你的录音。请再试一次。',
  'recorder.errDeviceInterrupted': '录音保存前被手机停止。没有发送任何内容。准备好后请重新录音。',
  'recorder.errBackgroundDiscarded':
    '你离开应用时，未发送的录音已被删除。没有发送任何内容。准备好后请重新录音。',
  'recorder.errTooShort': '录音太短了。请重新录你的回答。',
  'recorder.errSaveFailed': '我们无法保存录音。请重新录你的回答。',
  'recorder.errNoRecording': '没有保存任何录音。请重新录音。',
  'recorder.errStartFailed': '我们无法开始录音。请检查麦克风后再试一次。',
  'recorder.errAudioReset': '我们无法重置音频。如果声音异常，请关闭并重新打开应用。',
  'recorder.errPlayFailed': '我们无法播放你的录音。你还是可以发送它。',
  'recorder.errRejected': '服务器没有接受这段录音。请读一读问题，再试一次。',

  'header.home': '首页',
  'header.history': '历史记录',
  'header.recordings': '我的录音',
  'header.settings': '设置',
  'header.privacy': '隐私政策',
  'header.terms': '使用条款',

  'home.levelLabel': '你的等级',
  'home.masteryLabel': '已掌握的单词',
  'home.streakNone': '还没有连续记录。今天练习就能开始！',
  'home.streakOne': '连续 1 天',
  'home.streakMany': '连续 {count} 天',
  'home.dueChip': '{count} 个待复习',
  'home.dueNone': '现在没有要复习的内容。',
  'home.practicedNoneToday': '今天还没有练习。',
  'home.practicedOnceToday': '今天你练习了 1 次。',
  'home.practicedToday': '今天你练习了 {count} 次。',
  'home.startPractice': '开始练习',
  'home.loading': '正在加载你的进度…',
  'home.loadFailedTitle': '我们无法加载你的进度',
  'home.loadFailed': '我们无法加载你的进度。请再试一次。',

  'summary.title': '你的练习记录',
  'summary.attempts': '已发送的回答：{count}',
  'summary.passed': '通过的单词：{count}',
  'summary.mastered': '掌握的单词：{count}',
  'summary.levelUps': '升级次数：{count}',
  'summary.dismiss': '知道了',

  'levelUp.title': '升级啦！',
  'levelUp.body': '你达到了 {level}！',
  'levelUp.progress': '你从 {from} 升到了 {to}。',

  'history.loading': '正在加载你的回答…',
  'history.loadFailedTitle': '我们无法加载你的回答',
  'history.loadFailed': '我们无法加载你的回答。请再试一次。',
  'history.emptyTitle': '还没有回答',
  'history.emptyBody': '练习一下吧 — 你的回答会显示在这里。',
  'history.loadMore': '查看更早的回答',
  'history.loadingMore': '正在加载更多…',
  'history.contextDiagnostic': '等级测试',
  'history.contextPractice': '练习',
  'history.contextNative': '用你的语言回答',
  'history.attemptNo': '第 {number} 次',
  'history.showDetails': '显示详情',
  'history.hideDetails': '隐藏详情',
  'history.detailsHint': '双击展开或收起此回答',

  'recordings.loading': '正在加载你的录音…',
  'recordings.loadFailedTitle': '我们无法加载你的录音',
  'recordings.loadFailed': '我们无法加载你的录音。请再试一次。',
  'recordings.emptyTitle': '还没有保存的录音',
  'recordings.emptyBody': '发送回答前，请打开“保存这段录音”。保存的录音会显示在这里。',
  'recordings.loadMore': '查看更早的录音',
  'recordings.loadingMore': '正在加载更多…',
  'recordings.intro': '收听你提交的录音，或只删除音频并保留学习结果。',
  'recordings.contextDiagnostic': '等级测试',
  'recordings.contextPractice': '英语练习',
  'recordings.contextNative': '用你的语言回答',
  'recordings.statusAvailable': '可以播放',
  'recordings.statusPending': '正在准备',
  'recordings.statusUnavailable': '不可用',
  'recordings.checkPending': '检查待处理的录音',
  'recordings.yourRecording': '你的录音',
  'recordings.playLabel': '播放你提交的录音',
  'recordings.pauseLabel': '暂停你提交的录音',
  'recordings.playFailed': '我们无法播放这段录音。请再试一次。',
  'recordings.shareAction': '分享音频',
  'recordings.shareLabel': '分享你提交的录音',
  'recordings.shareHint': '下载临时私密副本并打开设备的分享选项。',
  'recordings.sharing': '正在准备音频…',
  'recordings.shareUnavailable': '此设备不支持分享。',
  'recordings.shareFailed': '我们无法分享这段录音。请再试一次。',
  'recordings.preparing': '正在准备…',
  'recordings.pending': '这段录音仍在准备中。我们会短暂重试。',
  'recordings.unavailable': '这段录音不可用。',
  'recordings.deleteTitle': '删除这段录音？',
  'recordings.deleteBody':
    '录音会立即移除，存储的音频将排队等待永久删除。你的分数、转写和反馈会保留。',
  'recordings.deleteBodyNamed':
    '移除“{name}”的录音并将存储音频排队等待永久删除？你的分数、转写和反馈会保留。',
  'recordings.deleteAction': '删除录音',
  'recordings.deleteHint': '立即移除录音并将音频排队等待永久删除；你的结果会保留。',
  'recordings.deleteFailed': '我们无法删除这段录音。请再试一次。',
  'recordings.deleted': '录音已移除；存储的音频已排队等待永久删除。你的结果仍然保留。',
  'recordings.progressLabel': '录音播放进度',

  'practice.skipWord': '暂时跳过这个单词',
  'practice.skipFailedTitle': '我们无法跳过这个单词',
  'practice.skipFailed': '我们无法跳过这个单词。请再试一次。',

  'login.forgot': '忘记密码？',
  'reset.requestTitle': '重置你的密码',
  'reset.requestBody': '输入你的邮箱。我们会给你发送一个验证码。',
  'reset.submitRequest': '发送验证码',
  'reset.submitRequestBusy': '正在发送…',
  'reset.requestFailed': '我们无法发送验证码。请再试一次。',
  'reset.sentTitle': '请查看你的邮箱',
  'reset.sentBody': '如果这个邮箱有账户，我们已发送验证码。验证码 30 分钟内有效。',
  'reset.continue': '我有验证码了',
  'reset.resend': '再次发送验证码',
  'reset.resendBusy': '正在再次发送…',
  'reset.newTitle': '选择一个新密码',
  'reset.codeLabel': '邮件里的验证码',
  'reset.codePlaceholder': '把验证码粘贴到这里',
  'reset.submitNew': '保存新密码',
  'reset.submitNewBusy': '正在保存…',
  'reset.doneBanner': '你的密码已修改，现有会话已退出。请登录。',
  'reset.backToLogin': '返回登录',

  'settings.profileTitle': '你的资料',
  'ads.label': '广告',
  'ads.privacyOptions': '广告隐私选项',
  'ads.privacyOptionsHelp': '查看或更改广告使用的隐私选项。',
  'ads.privacyFailed': '无法打开广告隐私选项。请再试一次。',
  'settings.levelLabel': '英语等级',
  'settings.appLanguageLabel': '应用语言',
  'settings.appLanguageHelp': '选择按钮和消息所用的语言。',
  'settings.learningLanguageLabel': '母语',
  'settings.learningLanguageHelp':
    '仅用于翻译帮助和用你的语言回答。它不会更改按钮或消息；请用“应用语言”更改界面。',
  'settings.levelPending': '还没有测试',
  'settings.saveName': '保存名字',
  'settings.saveNameBusy': '正在保存…',
  'settings.saved': '已保存。',
  'settings.updateFailed': '我们无法保存你的修改。请再试一次。',
  'settings.export': '导出我的数据',
  'settings.exportBusy': '正在准备你的数据…',
  'settings.exportHelp':
    'JSON 包含你的学习数据和已保存录音的详细信息，但不包含音频文件或音频字节。',
  'settings.exportFailed': '我们无法导出你的数据。请再试一次。',
  'settings.exportUnavailable': '这台设备不支持分享。',
  'settings.recordingsDeleteAll': '删除所有录音',
  'settings.recordingsDeleteAllHint': '移除所有已保存的录音，同时保留你的分数、转写和反馈。',
  'settings.recordingsDeleteAllBusy': '正在删除录音…',
  'settings.recordingsDeleteAllTitle': '删除所有录音？',
  'settings.recordingsDeleteAllBody':
    '所有已保存的录音都会立即移除，存储的音频将排队等待永久删除。你的分数、转写和反馈会保留。此操作无法撤销。',
  'settings.recordingsDeleteAllConfirm': '全部删除',
  'settings.recordingsDeleteAllSuccess':
    '所有录音已移除；存储的音频已排队等待永久删除。你的结果仍然保留。',
  'settings.recordingsDeleteAllFailed': '我们无法删除所有录音。请再试一次。',
  'settings.retake': '重新开始等级测试',
  'retake.confirmTitle': '重新开始等级测试？',
  'retake.confirmBody': '这会清除当前等级测试进度并重新开始。你的练习历史会保留。',
  'retake.confirm': '重新开始测试',
  'retake.failed': '我们无法重新开始测试。请再试一次。',

  'reminder.toggleLabel': '每日提醒',
  'reminder.timeLabel': '提醒时间：{time}',
  'reminder.earlier': '提前一小时',
  'reminder.later': '推后一小时',
  'reminder.denied': '这个应用的通知已关闭。请在手机设置里允许通知。',
  'reminder.failed': '我们无法设置提醒。请再试一次。',
  'reminder.notificationTitle': '练习时间到！',
  'reminder.notificationBody': '今天花几分钟练习英语吧。',

  'legal.placeholderNote': '自 2026 年 8 月 28 日起生效。本摘要说明当前应用如何处理数据。',
  'privacy.p1':
    '我们保存你的姓名、邮箱、密码哈希、语言设置、等级、学习进度、评估结果、转写文本、反馈和保留录音的元数据。服务还会处理身份验证、安全、速率限制、可靠性和防止滥用所需的请求与网络信息。',
  'privacy.p2':
    'OpenAI 会处理提交的音频和转写文本，用于转写和学习反馈。生产环境音频私密存储在 Amazon S3。密码重置邮件使用配置的邮件服务。启用广告且同意允许时，Google Mobile Ads 及其同意工具会处理广告相关数据。失败的上传和你选择不保存的音频是临时的；你选择保留的录音会保存到你删除录音或账户为止。',
  'privacy.p3':
    '你可以在设置中导出当前导出范围内的账户数据、删除单个录音、更改可用的广告隐私选项或删除账户。账户删除成功后，账户数据会立即删除；录音文件会保留在队列中，直到异步永久删除完成。',
  'terms.p1':
    '本应用提供 AI 辅助英语练习和估算的 CEFR 等级。结果和反馈可能不完整或错误，不是专业建议，也不是官方证书。',
  'terms.p2':
    '请保密登录信息，只使用你有权使用的账户。不得滥用服务、规避限制、干扰他人、上传违法内容，或试图破坏应用及其服务提供商。',
  'terms.p3':
    '服务可用性、AI 评估、录音、广告、限制和功能可能变化或不可用。你可以在设置中删除账户并停止使用。账户删除无法撤销，录音文件清理会异步完成。',
};

export const dictionaries: Readonly<Record<UiLanguage, Record<MessageKey, string>>> = {
  en,
  te,
  hi,
  es,
  zh,
};

export type MessageParams = Record<string, string | number>;

/** Replaces `{name}` placeholders; unknown placeholders are left as-is. */
export function formatTemplate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/** Pure lookup for an explicit language; used by tests and live previews. */
export function translateFor(language: UiLanguage, key: MessageKey, params?: MessageParams) {
  return formatTemplate(dictionaries[language][key], params);
}

/** Maps a BCP-47 locale tag onto a supported UI language, else English. */
export function languageForLocale(locale: string): UiLanguage {
  const tag = locale.trim().toLowerCase();
  for (const language of SUPPORTED_UI_LANGUAGES) {
    if (tag === language || tag.startsWith(`${language}-`)) return language;
  }
  return 'en';
}

let cachedDeviceLanguage: UiLanguage | null = null;

/**
 * The device locale mapped to a supported language; English when unknown.
 * Cached for the process lifetime by design: the persisted preference (user
 * pick or account mirror) always wins after first choice, so a mid-process OS
 * locale change only affects the pre-preference fallback until relaunch — an
 * accepted cosmetic window that keeps the root provider free of an extra
 * AppState subscription.
 */
export function deviceLanguage(): UiLanguage {
  if (cachedDeviceLanguage === null) {
    try {
      // Hermes, web, and jest all provide Intl; expo-localization is not needed.
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (typeof locale === 'string') cachedDeviceLanguage = languageForLocale(locale);
    } catch {
      // No locale information available: fall back to English.
    }
    if (cachedDeviceLanguage === null) cachedDeviceLanguage = 'en';
  }
  return cachedDeviceLanguage;
}

/**
 * The language used by non-React code (API error mapping, auth errors,
 * recorder callbacks). The provider keeps it in sync with the UI language; it
 * starts in English only until the root language preference finishes loading.
 */
let activeLanguage: UiLanguage | null = null;

export function getActiveLanguage(): UiLanguage {
  return activeLanguage ?? 'en';
}

export function setActiveLanguage(language: UiLanguage): void {
  activeLanguage = language;
}

/** Translates with the active language, resolved at call time. */
export function translate(key: MessageKey, params?: MessageParams): string {
  return translateFor(getActiveLanguage(), key, params);
}

export type Translator = (key: MessageKey, params?: MessageParams) => string;

interface I18nContextValue {
  language: UiLanguage;
  t: Translator;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Keeps hook users working (in the device/active language) without a provider. */
const FALLBACK_CONTEXT: I18nContextValue = {
  get language() {
    return getActiveLanguage();
  },
  t: translate,
};

export function I18nProvider({
  accountLanguage,
  guestLanguage = 'en',
  children,
}: {
  /** The signed-in account's UI language; null when signed out. */
  accountLanguage: UiLanguage | null;
  /** Persisted device preference used while signed out or before profile load. */
  guestLanguage?: UiLanguage;
  children: React.ReactNode;
}) {
  const language: UiLanguage = accountLanguage ?? guestLanguage;

  // Alerts and API errors are built outside React at event time; keep the
  // module-level language they read in sync with the rendered language.
  useEffect(() => {
    setActiveLanguage(language);
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      t: (key, params) => translateFor(language, key, params),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? FALLBACK_CONTEXT;
}

export function useT(): Translator {
  return useI18n().t;
}
