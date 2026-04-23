import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Vibration,
  BackHandler,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { startAlarmSound, stopAlarmSound } from "@/services/alarm-sound-service";
import { recordDosesForReminder } from "@/services/dose-recording";
import { getReminderById, getDrugsForReminder } from "@/services/database";
import { scheduleSnooze } from "@/services/notification-service";
import { getSnoozeDuration, getAutoDismissTimeout } from "@/services/settings-service";
import { toDateString } from "@/utils/date-helpers";
import * as Haptics from "expo-haptics";
import type { Drug, Reminder } from "@/types/reminder";

function formatCurrentTime(date: Date): string {
  const h = date.getHours() % 12 || 12;
  const m = date.getMinutes().toString().padStart(2, "0");
  const period = date.getHours() >= 12 ? "PM" : "AM";
  return `${h}:${m} ${period}`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AlarmScreen() {
  const router = useRouter();
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [currentTime, setCurrentTime] = useState(formatCurrentTime(new Date()));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const snoozeMinutes = getSnoozeDuration();
  const autoDismissMinutes = getAutoDismissTimeout();
  const todayStr = toDateString(new Date());

  const dismissedRef = useRef(false);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  }, []);

  const dismiss = useCallback(
    (status: "taken" | "skipped" | "missed") => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      Vibration.cancel();
      stopAlarmSound();
      clearTimers();
      recordDosesForReminder({
        reminderId: reminderId!,
        date: todayStr,
        status,
        ...(status === "taken" ? { takenAt: Date.now() } : {}),
      });
      router.back();
    },
    [reminderId, todayStr, clearTimers, router],
  );

  const handleTakeDose = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dismiss("taken");
  }, [dismiss]);

  const handleSnooze = useCallback(async () => {
    if (!reminder) return;
    Vibration.cancel();
    await stopAlarmSound();
    clearTimers();
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    const reminderDrugs = getDrugsForReminder(reminderId!);
    await scheduleSnooze(reminder, reminderDrugs);
    router.back();
  }, [reminder, reminderId, clearTimers, router]);

  const handleSkip = useCallback(() => {
    dismiss("skipped");
  }, [dismiss]);

  // Load reminder data
  useEffect(() => {
    if (!reminderId) {
      router.back();
      return;
    }
    const r = getReminderById(reminderId);
    if (!r) {
      router.back();
      return;
    }
    setReminder(r);
    setDrugs(getDrugsForReminder(reminderId));
    setLoaded(true);
  }, [reminderId]);

  // Start alarm sound, vibration, and timers
  useEffect(() => {
    if (!loaded) return;

    startAlarmSound();
    Vibration.vibrate([500, 500, 500, 500, 500], true);

    const totalAutoDismissSeconds = autoDismissMinutes * 60;
    setRemainingSeconds(totalAutoDismissSeconds);

    const startTime = Date.now();

    clockIntervalRef.current = setInterval(() => {
      const now = new Date();
      setCurrentTime(formatCurrentTime(now));
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      setRemainingSeconds(Math.max(0, totalAutoDismissSeconds - elapsed));
    }, 1000);

    autoDismissRef.current = setTimeout(() => {
      dismiss("missed");
    }, totalAutoDismissSeconds * 1000);

    return () => {
      Vibration.cancel();
      stopAlarmSound();
      clearTimers();
    };
  }, [loaded, autoDismissMinutes, dismiss, clearTimers]);

  // Prevent back navigation
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backHandler.remove();
  }, []);

  if (!loaded || !reminder) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {/* Current time */}
        <Text style={styles.currentTime}>{currentTime}</Text>

        {/* Label */}
        <Text style={styles.label}>MEDICATION TIME</Text>

        {/* Reminder name */}
        <Text style={styles.reminderName}>{reminder.name}</Text>

        {/* Drug list */}
        <View style={styles.drugList}>
          {drugs.map((drug) => (
            <View key={drug.id} style={styles.drugChip}>
              <Text style={styles.drugText}>
                {drug.name}
                {drug.dosage ? ` — ${drug.dosage}` : ""}
              </Text>
            </View>
          ))}
        </View>

        {/* Elapsed + countdown */}
        <Text style={styles.elapsed}>Elapsed: {formatElapsed(elapsedSeconds)}</Text>
        <Text style={styles.countdown}>
          Auto-dismiss in {formatElapsed(remainingSeconds)}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.skipButton]} onPress={handleSkip}>
          <MaterialCommunityIcons name="skip-next" size={20} color="#fff" />
          <Text style={styles.buttonText}>SKIP</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.takeButton]} onPress={handleTakeDose}>
          <MaterialCommunityIcons name="pill" size={24} color="#fff" />
          <Text style={[styles.buttonText, styles.takeButtonText]}>TAKE DOSE</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.snoozeButton]} onPress={handleSnooze}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>SNOOZE</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#065F46",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 3,
    marginTop: Spacing.xs,
  },
  reminderName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginVertical: Spacing.sm,
  },
  drugList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  drugChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  drugText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
  },
  elapsed: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: Spacing.sm,
  },
  countdown: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  skipButton: {
    backgroundColor: "#374151",
    paddingHorizontal: Spacing.md,
  },
  takeButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: Spacing.lg,
  },
  snoozeButton: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: Spacing.md,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  takeButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
