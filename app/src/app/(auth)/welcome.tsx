import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Icon, { type IconName } from '../../components/Icon';
import UiLanguagePicker from '../../components/UiLanguagePicker';
import { useGuestLanguage } from '../../lib/guest-language';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';

/**
 * The value-first welcome screen: show what the app does before asking for an
 * account. Three illustrated promises (speak, instant feedback, placement),
 * one primary growth action, and a quiet path back for returning learners —
 * the pattern Duolingo's onboarding made standard.
 */
export default function WelcomeScreen() {
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { language, setLanguage, persistenceError } = useGuestLanguage();

  const features: {
    icon: IconName;
    title: string;
    body: string;
    tint: 'primary' | 'success' | 'accent';
  }[] = [
    {
      icon: 'mic',
      title: t('welcome.speakTitle'),
      body: t('welcome.speakBody'),
      tint: 'primary',
    },
    {
      icon: 'sparkle',
      title: t('welcome.feedbackTitle'),
      body: t('welcome.feedbackBody'),
      tint: 'success',
    },
    {
      icon: 'trending-up',
      title: t('welcome.levelTitle'),
      body: t('welcome.levelBody'),
      tint: 'accent',
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Icon name="mic" size={34} color={theme.colors.primary} strokeWidth={2.1} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t('login.title')}
        </Text>
        <Text style={styles.tagline}>{t('login.subtitle')}</Text>
        <UiLanguagePicker value={language} onChange={setLanguage} error={persistenceError} />

        {features.map((feature) => (
          <View
            key={feature.title}
            style={styles.featureCard}
            testID={`welcome-feature-${feature.icon}`}
          >
            <View
              style={[
                styles.featureBadge,
                feature.tint === 'primary' && styles.badgePrimary,
                feature.tint === 'success' && styles.badgeSuccess,
                feature.tint === 'accent' && styles.badgeAccent,
              ]}
            >
              <Icon
                name={feature.icon}
                size={22}
                color={
                  feature.tint === 'primary'
                    ? theme.colors.primary
                    : feature.tint === 'success'
                      ? theme.colors.success
                      : theme.colors.accent
                }
              />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureBody}>{feature.body}</Text>
            </View>
          </View>
        ))}

        <Button
          title={t('welcome.getStarted')}
          fullWidth
          size="lg"
          onPress={() => router.push('/signup')}
          style={styles.primaryAction}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.loginLink, pressed && styles.loginLinkPressed]}
        >
          <Text style={styles.loginLinkText}>
            {t('login.footerPrompt')}
            <Text style={styles.loginLinkBold}>{t('login.footerLink')}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, type }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: type.titleLg.fontSize,
    lineHeight: type.titleLg.lineHeight,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.muted,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  featureBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePrimary: { backgroundColor: colors.primaryLight },
  badgeSuccess: { backgroundColor: colors.successLight },
  badgeAccent: { backgroundColor: colors.accentLight },
  featureCopy: {
    flexShrink: 1,
  },
  featureTitle: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    fontWeight: '700',
    color: colors.text,
  },
  featureBody: {
    marginTop: 2,
    fontSize: type.callout.fontSize,
    lineHeight: type.callout.lineHeight,
    color: colors.muted,
  },
  primaryAction: {
    marginTop: spacing.lg,
  },
  loginLink: {
    minHeight: layout.minimumTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  loginLinkPressed: {
    opacity: 0.6,
  },
  loginLinkText: {
    fontSize: type.callout.fontSize,
    lineHeight: type.callout.lineHeight,
    color: colors.muted,
    textAlign: 'center',
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
}));
