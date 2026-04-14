import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { useReminders } from "@/hooks/use-reminders";
import { useDrugs } from "@/hooks/use-drugs";
import { DaySelector } from "@/components/day-selector";
import { TimePickerField } from "@/components/time-picker-field";
import { FrequencyBadge } from "@/components/frequency-badge";
import { DrugChip } from "@/components/drug-chip";
import { ThemedInput } from "@/components/themed-input";
import { generateId } from "@/utils/date-helpers";
import { scheduleReminder, scheduleRefillReminder } from "@/services/notification-service";
import { updateReminder as dbUpdateReminder, getDrugById } from "@/services/database";
import { DRUG_FORMS } from "@/constants/drug-forms";
import type { Drug, DrugForm, Reminder, Weekday } from "@/types/reminder";

export default function AddReminderScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { addReminder } = useReminders();
  const { drugs: existingDrugs, addDrug, refreshDrugs } = useDrugs();
  useHeaderStyle();

  const [name, setName] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inline new drug form
  const [showNewDrugForm, setShowNewDrugForm] = useState(false);
  const [newDrugName, setNewDrugName] = useState("");
  const [newDrugDosage, setNewDrugDosage] = useState("");
  const [newDrugForm, setNewDrugForm] = useState<DrugForm>("tablet");
  const [newDrugQty, setNewDrugQty] = useState(1);

  const frequency = useMemo(() => {
    if (days.length === 7) return "daily" as const;
    if (days.length === 1) return "weekly" as const;
    return "custom" as const;
  }, [days]);

  const toggleDrug = useCallback((drugId: string) => {
    setSelectedDrugIds((prev) =>
      prev.includes(drugId) ? prev.filter((id) => id !== drugId) : [...prev, drugId],
    );
    if (errors.drugs) setErrors((e) => ({ ...e, drugs: "" }));
  }, [errors.drugs]);

  const handleAddNewDrug = useCallback(() => {
    const trimmed = newDrugName.trim();
    if (!trimmed) return;

    const drug = addDrug({
      name: trimmed,
      dosage: newDrugDosage.trim(),
      form: newDrugForm,
      quantity: newDrugQty,
    });

    setSelectedDrugIds((prev) => [...prev, drug.id]);
    setNewDrugName("");
    setNewDrugDosage("");
    setNewDrugForm("tablet");
    setNewDrugQty(1);
    setShowNewDrugForm(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newDrugName, newDrugDosage, newDrugForm, newDrugQty, addDrug]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const newErrors: Record<string, string> = {};
    if (!trimmedName) newErrors.name = "Please enter a reminder name.";
    if (days.length === 0) newErrors.days = "Please select at least one day.";
    if (selectedDrugIds.length === 0) newErrors.drugs = "Please select at least one medication.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const reminder = await addReminder({
      name: trimmedName,
      hour,
      minute,
      days,
      isActive: true,
      startDate: undefined,
      endDate: undefined,
      drugIds: selectedDrugIds,
    });

    // Load drugs for notification scheduling
    const reminderDrugs = selectedDrugIds.map((id) => getDrugById(id)).filter(Boolean) as Drug[];

    try {
      const notificationIds = await scheduleReminder(reminder, reminderDrugs);
      dbUpdateReminder({ ...reminder, notificationIds });
    } catch {
      Alert.alert(
        "Notification issue",
        "Reminder saved but notifications may not work. Check your device settings.",
      );
    }

    for (const drug of reminderDrugs) {
      try {
        await scheduleRefillReminder(drug, reminder.id);
      } catch {
        // ignore
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, hour, minute, days, selectedDrugIds, addReminder]);

  const isValid = useMemo(() => {
    return name.trim().length > 0 && days.length > 0 && selectedDrugIds.length > 0;
  }, [name, days, selectedDrugIds]);

  return (
    <>
      <Stack.Screen options={{ title: "Add Reminder", headerBackTitle: "Back" }} />
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REMINDER NAME</Text>
            <ThemedInput
              placeholder='e.g. "Morning Meds"'
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((e) => ({ ...e, name: "" }));
              }}
              accessibilityLabel="Reminder name"
            />
            {errors.name ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>
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
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.days}</Text>
            ) : null}
          </View>

          {/* Medications */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MEDICATIONS</Text>

            {/* Existing drugs as toggleable chips */}
            {existingDrugs.length > 0 && (
              <View style={styles.drugChipsRow}>
                {existingDrugs.map((drug) => (
                  <DrugChip
                    key={drug.id}
                    name={drug.name}
                    dosage={drug.dosage}
                    color={drug.color}
                    checked={selectedDrugIds.includes(drug.id)}
                    onToggle={() => toggleDrug(drug.id)}
                    strikeThrough={false}
                  />
                ))}
              </View>
            )}

            {/* Selected drugs summary */}
            {selectedDrugIds.length > 0 && (
              <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
                {selectedDrugIds.length} medication{selectedDrugIds.length !== 1 ? "s" : ""} selected
              </Text>
            )}

            {/* Add new drug inline */}
            {!showNewDrugForm ? (
              <Pressable
                onPress={() => setShowNewDrugForm(true)}
                style={[styles.addDrugButton, { borderColor: colors.primary }]}
              >
                <Text style={[styles.addDrugText, { color: colors.primary }]}>+ Add New Medication</Text>
              </Pressable>
            ) : (
              <View style={[styles.newDrugCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.newDrugTitle, { color: colors.textPrimary }]}>New Medication</Text>

                <ThemedInput
                  placeholder="Medication name"
                  value={newDrugName}
                  onChangeText={setNewDrugName}
                />

                <View style={styles.row}>
                  <ThemedInput
                    style={styles.flex1}
                    placeholder="Dosage (e.g. 500mg)"
                    value={newDrugDosage}
                    onChangeText={setNewDrugDosage}
                  />
                  <ThemedInput
                    style={styles.qtyInput}
                    placeholder="Qty"
                    value={newDrugQty > 0 ? String(newDrugQty) : ""}
                    onChangeText={(text) => {
                      const qty = parseInt(text, 10);
                      if (!isNaN(qty) && qty > 0) setNewDrugQty(qty);
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FORM</Text>
                <View style={styles.formRow}>
                  {DRUG_FORMS.map((f) => {
                    const selected = newDrugForm === f.value;
                    return (
                      <Pressable
                        key={f.value}
                        onPress={() => setNewDrugForm(f.value)}
                        style={[
                          styles.formChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.background,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <View style={styles.formChipContent}>
                          <MaterialCommunityIcons
                            name={f.icon as any}
                            size={14}
                            color={selected ? colors.textInverse : colors.textSecondary}
                          />
                          <Text style={[styles.formChipText, { color: selected ? colors.textInverse : colors.textSecondary }]}>
                            {f.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.newDrugActions}>
                  <Pressable onPress={() => setShowNewDrugForm(false)} style={styles.cancelNewDrug}>
                    <Text style={[styles.cancelNewDrugText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddNewDrug}
                    disabled={!newDrugName.trim()}
                    style={[
                      styles.saveNewDrug,
                      { backgroundColor: newDrugName.trim() ? colors.primary : colors.divider },
                    ]}
                  >
                    <Text style={[styles.saveNewDrugText, { color: newDrugName.trim() ? colors.textInverse : colors.textTertiary }]}>
                      Add
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {errors.drugs ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.drugs}</Text>
            ) : null}
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: isValid ? colors.primary : colors.divider,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityLabel="Save reminder"
          >
            <Text style={[styles.saveText, { color: isValid ? colors.textInverse : colors.textTertiary }]}>
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
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.xs,
    marginTop: Spacing.xs,
  },
  frequencyRow: { gap: Spacing.sm },
  frequencyBadgeWrap: { alignItems: "flex-start" },
  drugChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectedCount: {
    ...Typography.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addDrugButton: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  addDrugText: { ...Typography.md, fontWeight: Typography.semibold },
  newDrugCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  newDrugTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex1: { flex: 1 },
  qtyInput: { width: 70, flex: undefined },
  formRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  formChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  formChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  formChipText: { ...Typography.xs },
  newDrugActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelNewDrug: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cancelNewDrugText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  saveNewDrug: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  saveNewDrugText: {
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
