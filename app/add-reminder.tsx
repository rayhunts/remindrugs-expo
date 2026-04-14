import { useState, useCallback, useMemo } from "react";
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
} from "react-native";
import { Stack, router } from "expo-router";
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
import { scheduleReminder, scheduleRefillReminder } from "@/services/notification-service";
import { updateReminder as dbUpdateReminder } from "@/services/database";
import type { Drug, DrugForm, Reminder, Weekday } from "@/types/reminder";

const EMPTY_DRUG: Drug = {
  id: "",
  name: "",
  dosage: "",
  form: "tablet",
  quantity: 1,
};

export default function AddReminderScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { addReminder } = useReminders();
  useHeaderStyle();

  const [name, setName] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [drugs, setDrugs] = useState<Drug[]>([{ ...EMPTY_DRUG, id: generateId() }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      { ...EMPTY_DRUG, id: generateId() },
    ]);
  }, []);

  const handleSave = useCallback(async () => {
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

    const reminder = await addReminder({
      name: trimmedName,
      drugs: validDrugs.map((d) => ({
        ...d,
        name: d.name.trim(),
        dosage: d.dosage.trim(),
      })),
      hour,
      minute,
      days,
      isActive: true,
      startDate: undefined,
      endDate: undefined,
    });

    try {
      const notificationIds = await scheduleReminder(reminder);
      dbUpdateReminder({ ...reminder, notificationIds });
    } catch {
      // Notification scheduling failed — reminder saved but won't notify
      Alert.alert(
        "Notification issue",
        "Reminder saved but notifications may not work. Check your device settings.",
      );
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, hour, minute, days, drugs, addReminder]);

  const isValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      days.length > 0 &&
      drugs.some((d) => d.name.trim().length > 0)
    );
  }, [name, days, drugs]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Add Reminder",
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
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
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
              style={[
                styles.addDrugButton,
                {
                  borderColor: colors.primary,
                },
              ]}
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
            style={[
              styles.saveButton,
              {
                backgroundColor: isValid
                  ? colors.primary
                  : colors.divider,
              },
            ]}
            accessibilityLabel="Save reminder"
          >
            <Text
              style={[
                styles.saveText,
                {
                  color: isValid
                    ? colors.textInverse
                    : colors.textTertiary,
                },
              ]}
            >
              Save Reminder
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
  addDrugText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  bottomSpacer: { height: 100 },
});
