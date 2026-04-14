import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { useReminders } from "@/hooks/use-reminders";
import { DaySelector } from "@/components/day-selector";
import { TimePickerField } from "@/components/time-picker-field";
import { DrugFormRow } from "@/components/drug-form-row";
import { FrequencyBadge } from "@/components/frequency-badge";
import { generateId } from "@/utils/date-helpers";
import { rescheduleReminder, cancelReminder, scheduleRefillReminder } from "@/services/notification-service";
import { updateReminder as dbUpdateReminder, deleteReminder as dbDeleteReminder } from "@/services/database";
import type { Drug, Reminder, Weekday } from "@/types/reminder";

export default function EditReminderScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, deleteReminder, refreshReminders } = useReminders();
  useHeaderStyle();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<Weekday[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [originalReminder, setOriginalReminder] = useState<Reminder | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    const reminder = getById(id);
    if (!reminder) {
      Alert.alert("Not found", "This reminder doesn't exist.");
      router.back();
      return;
    }
    setOriginalReminder(reminder);
    setName(reminder.name);
    setHour(reminder.hour);
    setMinute(reminder.minute);
    setDays(reminder.days);
    setDrugs(reminder.drugs.map((d) => ({ ...d })));
    setLoading(false);
  }, [id, getById, router]);

  const frequency = useMemo(() => {
    if (days.length === 7) return "daily" as const;
    if (days.length === 1) return "weekly" as const;
    return "custom" as const;
  }, [days]);

  const updateDrug = useCallback((index: number, updates: Partial<Drug>) => {
    setDrugs((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d)),
    );
  }, []);

  const deleteDrug = useCallback((index: number) => {
    setDrugs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addDrug = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrugs((prev) => [
      ...prev,
      { id: generateId(), name: "", dosage: "", form: "tablet", quantity: 1 },
    ]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!originalReminder) return;

    const trimmedName = name.trim();
    const newErrors: Record<string, string> = {};
    if (!trimmedName) newErrors.name = "Please enter a reminder name.";
    if (days.length === 0) newErrors.days = "Please select at least one day.";
    const validDrugs = drugs.filter((d) => d.name.trim().length > 0);
    if (validDrugs.length === 0) newErrors.drugs = "Please add at least one drug with a name.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const updated: Reminder = {
      ...originalReminder,
      name: trimmedName,
      drugs: validDrugs.map((d) => ({
        ...d,
        name: d.name.trim(),
        dosage: d.dosage.trim(),
      })),
      hour,
      minute,
      days,
    };

    try {
      const notificationIds = await rescheduleReminder(updated);
      updated.notificationIds = notificationIds;
    } catch {
      // Notification scheduling failed
    }

    dbUpdateReminder(updated);
    refreshReminders();

    // Check refill reminders
    for (const drug of updated.drugs) {
      try {
        await scheduleRefillReminder(drug, updated.id);
      } catch {
        // ignore refill notification errors
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, hour, minute, days, drugs, originalReminder, refreshReminders, router]);

  const handleDelete = useCallback(() => {
    if (!originalReminder) return;

    Alert.alert("Delete Reminder", `Delete "${originalReminder.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await cancelReminder(originalReminder.notificationIds);
          } catch {
            // ignore
          }
          deleteReminder(originalReminder.id);
          router.back();
        },
      },
    ]);
  }, [originalReminder, deleteReminder, router]);

  const isValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      days.length > 0 &&
      drugs.some((d) => d.name.trim().length > 0)
    );
  }, [name, days, drugs]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Reminder",
          headerBackTitle: "Back",
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Reminder Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              REMINDER NAME
            </Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder='e.g. "Morning Meds"'
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((e) => ({ ...e, name: "" }));
              }}
              accessibilityLabel="Reminder name"
            />
            {errors.name ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {errors.name}
              </Text>
            ) : null}
          </View>

          {/* Time */}
          <View style={styles.section}>
            <TimePickerField hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
          </View>

          {/* Days */}
          <View style={styles.section}>
            <View style={styles.frequencyRow}>
              <DaySelector selectedDays={days} onChange={setDays} />
              <View style={styles.frequencyBadgeWrap}>
                <FrequencyBadge type={frequency} />
              </View>
            </View>
            {errors.days ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {errors.days}
              </Text>
            ) : null}
          </View>

          {/* Drugs */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              DRUGS
            </Text>
            {drugs.map((drug, index) => (
              <DrugFormRow
                key={drug.id}
                drug={drug}
                index={index}
                canDelete={drugs.length > 1}
                onUpdate={updateDrug}
                onDelete={deleteDrug}
              />
            ))}
            <Pressable
              onPress={addDrug}
              style={[styles.addDrugButton, { borderColor: colors.primary }]}
            >
              <Text style={[styles.addDrugText, { color: colors.primary }]}>
                + Add Another Drug
              </Text>
            </Pressable>
            {errors.drugs ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {errors.drugs}
              </Text>
            ) : null}
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            style={[styles.saveButton, { backgroundColor: isValid ? colors.primary : colors.divider }]}
          >
            <Text style={[styles.saveText, { color: isValid ? colors.textInverse : colors.textTertiary }]}>
              Save Changes
            </Text>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Text style={[styles.deleteText, { color: colors.danger }]}>
              Delete Reminder
            </Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    ...Typography.xs,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.base,
  },
  errorText: {
    ...Typography.xs,
    marginTop: Spacing.xs,
  },
  frequencyRow: { gap: Spacing.sm },
  frequencyBadgeWrap: { alignItems: "flex-start" },
  addDrugButton: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  addDrugText: { ...Typography.md, fontWeight: Typography.semibold },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveText: { ...Typography.md, fontWeight: Typography.semibold },
  deleteButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  deleteText: { ...Typography.md, fontWeight: Typography.semibold },
  bottomSpacer: { height: 100 },
});
