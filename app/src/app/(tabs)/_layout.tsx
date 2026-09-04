import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon, { type IconName } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { usePracticeExitLocked } from '../../lib/practice-exit-lock';
import { createThemedStyles, useTheme } from '../../lib/theme';

/**
 * The authenticated primary navigation: four bottom tabs (HIG: tabs switch
 * sections; ≤5 tabs). Settings stays a pushed stack screen reached from the
 * Home header, so a learner mid-diagnostic keeps exactly the focused,
 * chrome-free flow the placement test needs.
 *
 * Home, Practice, and History require a completed placement (the inner
 * Tabs.Protected guard, the same gate the old stack enforced); Recordings is
 * available to every signed-in learner.
 *
 * While the practice flow holds an exit lock (an active recording, upload, or
 * recovery — or the statically locked feedback card), every other tab and the
 * Settings action are disabled: switching away would blur the practice stack
 * and Recorder's blur cleanup would discard a held take, exactly what the
 * in-screen exit locks prevent.
 */
export default function TabLayout() {
  const theme = useTheme();
  const t = useT();
  const styles = themedStyles(theme);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const canPractice = user?.diagnosticCompleted === true && user.diagnosticAcknowledged !== false;
  const practiceExitLocked = usePracticeExitLocked();

  // The custom bar replaces the default BottomTabBar, so the stock
  // `tabBarHideOnKeyboard` option no longer applies — hide it here instead
  // (Android only, where adjustResize would otherwise ride the bar above the
  // soft keyboard; iOS keeps the bar beneath the keyboard as before).
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.colors.text,
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
      }}
      tabBar={
        keyboardVisible
          ? () => null
          : (props) => (
              <View
                accessibilityRole="tablist"
                style={[
                  styles.tabBar,
                  {
                    paddingBottom: Math.max(insets.bottom, 6),
                    paddingStart: Math.max(insets.left, theme.spacing.xs),
                    paddingEnd: Math.max(insets.right, theme.spacing.xs),
                  },
                ]}
              >
                {props.state.routes.map((route, index) => {
                  const isFocused = props.state.index === index;
                  // The practice flow keeps its exits locked while a take or a
                  // feedback card is active; the tab that owns the lock stays
                  // reachable so the learner can always return to resolve it.
                  const exitLocked = practiceExitLocked && route.name !== 'practice';
                  const onPress = () => {
                    if (exitLocked) return;
                    const event = props.navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                      props.navigation.navigate(route.name as never);
                    }
                  };
                  const label = props.descriptors[route.key]?.options?.title ?? route.name;
                  const icon = TAB_ICONS[route.name as TabRouteName] ?? 'home';
                  return (
                    <Pressable
                      key={route.key}
                      accessibilityRole="tab"
                      accessibilityLabel={label}
                      accessibilityHint={exitLocked ? t('hint.finishRecordingFirst') : undefined}
                      accessibilityState={{ selected: isFocused, disabled: exitLocked }}
                      disabled={exitLocked}
                      onPress={onPress}
                      style={({ pressed }) => [
                        styles.tabButton,
                        isFocused && styles.tabButtonFocused,
                        exitLocked && styles.tabButtonExitLocked,
                        pressed && styles.tabButtonPressed,
                      ]}
                    >
                      <Icon
                        name={icon}
                        size={24}
                        color={isFocused ? theme.colors.primary : theme.colors.muted}
                      />
                      <Text
                        style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.3}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )
      }
    >
      <Tabs.Protected guard={canPractice}>
        <Tabs.Screen
          name="home"
          options={{
            title: t('header.home'),
            headerRight: () => <SettingsHeaderAction />,
          }}
        />
        {/* The tab-level title feeds the tab bar label and its accessibility
            name; the nested stack's own titles never propagate up to it. */}
        <Tabs.Screen
          name="practice"
          options={{ headerShown: false, title: t('header.practice') }}
        />
        <Tabs.Screen name="history" options={{ title: t('header.history') }} />
      </Tabs.Protected>
      <Tabs.Screen name="recordings" options={{ title: t('header.recordings') }} />
    </Tabs>
  );
}

type TabRouteName = 'home' | 'practice' | 'history' | 'recordings';

const TAB_ICONS: Record<TabRouteName, IconName> = {
  home: 'home',
  practice: 'mic',
  history: 'clock',
  recordings: 'audio-lines',
};

function SettingsHeaderAction() {
  const theme = useTheme();
  const t = useT();
  const styles = themedStyles(theme);
  const practiceExitLocked = usePracticeExitLocked();
  // One navigation per tap: a double-tap on the header action must not push
  // Settings twice (the singleton-navigation convention).
  const navigationStartedRef = useRef(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('header.settings')}
      accessibilityHint={practiceExitLocked ? t('hint.finishRecordingFirst') : undefined}
      accessibilityState={{ disabled: practiceExitLocked }}
      disabled={practiceExitLocked}
      hitSlop={6}
      onPress={() => {
        if (navigationStartedRef.current) return;
        navigationStartedRef.current = true;
        router.navigate('/settings');
        // Reset on the next tick so the push has started before re-arming.
        setTimeout(() => {
          navigationStartedRef.current = false;
        }, 400);
      }}
      style={({ pressed }) => [styles.settingsAction, pressed && styles.settingsActionPressed]}
    >
      {/* The glyph intentionally takes Icon's own theme-text ink default; an
          explicit color here would restate the same value the fallback
          already derives from the identical theme context. */}
      <Icon name="sliders" size={22} />
    </Pressable>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, type, elevation }) => ({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    paddingStart: spacing.xs,
    paddingEnd: spacing.xs,
    minHeight: 56,
    ...elevation.raised,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: layout.minimumTarget,
    borderRadius: radii.input,
    paddingHorizontal: spacing.xs,
  },
  tabButtonFocused: {
    // A quiet tinted pill marks the active section without moving content.
    backgroundColor: colors.primaryLight,
  },
  tabButtonExitLocked: {
    opacity: 0.5,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  settingsAction: {
    padding: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: 20,
  },
  settingsActionPressed: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    fontWeight: '600',
    color: colors.muted,
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: '700',
  },
}));
