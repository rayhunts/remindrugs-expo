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
    icon: "cellphone",
    title: "Health &\nSmartwatch",
    description:
      "Optionally link Apple Health or Google Health Connect to see how your sleep and heart rate relate to your meds.",
    buttonText: "Connect Later",
    skipText: "Skip for now",
  },
  {
    icon: "bell-outline",
    title: "Never Miss\na Dose",
    description:
      "Remindrugs sends a gentle reminder at exactly the right time, every day.",
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

    if (step === 2) {
      // Last step — request notifications
      try {
        await requestNotificationPermissions();
      } catch {
        // ignore
      }
      router.replace("/(tabs)");
      return;
    }

    setStep((s) => s + 1);
  }, [step, router]);

  const handleSkip = useCallback(() => {
    if (step === 2) {
      router.replace("/(tabs)");
      return;
    }
    setStep((s) => s + 1);
  }, [step, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Content */}
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={screen.icon}
          size={72}
          color={colors.primary}
        />
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
  },
  emoji: {
    fontSize: 72,
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
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
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
