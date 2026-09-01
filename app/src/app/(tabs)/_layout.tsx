import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { router, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon, { type IconName } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';

/**
 * The authenticated primary navigation: four bottom tabs (HIG: tabs switch
 * sections; ≤5 tabs). Settings stays a pushed stack screen reached from the
 * Home header and the Recordings/Settings actions, so a learner mid-diagnostic
 * keeps exactly the focused, chrome-free flow the placement test needs.
 *
 * Home, Practice, and History require a completed placement (the same gate the
 * old stack enforced); Recordings is available to every signed-in learner.
 */
export default function TabLayout() {
  const theme = useTheme();
  const t = useT();
  const styles = themedStyles(theme);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const canPractice = user?.diagnosticCompleted === true && user.diagnosticAcknowledged !== false;

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
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
      tabBar={(props) => (
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 6) },
            theme.scheme === 'dark' ? styles.tabBarDark : null,
          ]}
        >
          {props.state.routes.map((route, index) => {
            const isFocused = props.state.index === index;
            const onPress = () => {
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
                accessibilityState={{ selected: isFocused }}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabButton,
                  isFocused && styles.tabButtonFocused,
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
      )}
    >
      <Tabs.Protected guard={canPractice}>
        <Tabs.Screen
          name="home"
          options={{
            title: t('header.home'),
            headerRight: () => <SettingsHeaderAction />,
          }}
        />
        <Tabs.Screen name="practice" options={{ headerShown: false }} />
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('header.settings')}
      hitSlop={6}
      onPress={() => router.navigate('/settings')}
      style={({ pressed }) => [
        { padding: 8, marginRight: 4, borderRadius: 20 },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon name="sliders" size={22} color={theme.colors.text} />
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
    paddingHorizontal: spacing.xs,
    minHeight: 56,
    ...elevation.raised,
  },
  tabBarDark: {
    // The raised dark cast reads as elevation above the darker background.
    shadowOpacity: 0.5,
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
  tabButtonPressed: {
    opacity: 0.7,
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
