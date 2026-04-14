import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { requestNotificationPermissions } from "@/services/notification-service";
import { setSetting } from "@/services/settings-service";

const SCREENS = [
  {
    icon: "pill",
    title: "Welcome to\nRemindrugs",
    description:
      "Never miss a dose again. Manage all your medications in one simple, private app.",
    buttonText: "Get Started",
    skipText: "Skip",
  },
  {
    icon: "calendar-check",
    title: "Track Your\nAdherence",
    description:
      "See your medication history on a calendar. Track streaks, view monthly stats, and retroactively log doses.",
    buttonText: "Next",
    skipText: "Skip",
  },
  {
    icon: "bell-outline",
    title: "Never Miss\na Dose",
    description:
      "Remindrugs sends a gentle reminder at exactly the right time, every day. You can even snooze for 15 minutes.",
    buttonText: "Enable Reminders",
    skipText: "Maybe later",
  },
];

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const screen = SCREENS[step];

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === SCREENS.length - 1) {
      // Last step — request notifications
      try {
        await requestNotificationPermissions();
      } catch {
        // ignore
      }
      setSetting("onboarded", "true");
      router.replace("/(tabs)");
      return;
    }

    setStep((s) => s + 1);
  }, [step, router]);

  const handleSkip = useCallback(() => {
    if (step === SCREENS.length - 1) {
      setSetting("onboarded", "true");
      router.replace("/(tabs)");
      return;
    }
    setStep((s) => s + 1);
  }, [step, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Content */}
      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <MaterialCommunityIcons
            name={screen.icon as any}
            size={72}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {screen.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {screen.description}
        </Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SCREENS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === step ? colors.primary : colors.border,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Step indicator */}
      <Text style={[styles.stepText, { color: colors.textTertiary }]}>
        {step + 1} of {SCREENS.length}
      </Text>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Pressable
          onPress={handleNext}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>
            {screen.buttonText} →
          </Text>
        </Pressable>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>
            {screen.skipText}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: Spacing.lg,
    paddingTop: Spacing["2xl"],
  },
  content: {
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography["2xl"],
    fontWeight: Typography.bold,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.base,
    textAlign: "center",
    maxWidth: width * 0.75,
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepText: {
    ...Typography.xs,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  buttons: {
    gap: Spacing.sm,
  },
  primaryButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  primaryButtonText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  skipText: {
    ...Typography.base,
  },
});
