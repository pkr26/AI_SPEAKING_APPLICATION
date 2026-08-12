import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout } from '../lib/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Page not found
        </Text>
        <Text style={styles.body}>
          This link is unavailable or no longer belongs to your current lesson.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Return Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  button: {
    minHeight: layout.minimumTarget,
    marginTop: 24,
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
