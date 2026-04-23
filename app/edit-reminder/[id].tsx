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
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { useReminders } from "@/hooks/use-reminders";
import { useDrugs } from "@/hooks/use-drugs";
import { useLanguage } from "@/contexts/language-context";
import { DaySelector } from "@/components/day-selector";
import { TimePickerField } from "@/components/time-picker-field";
import { FrequencyBadge } from "@/components/frequency-badge";
import { DrugChip } from "@/components/drug-chip";
import { ThemedInput } from "@/components/themed-input";
import { generateId } from "@/utils/date-helpers";
import { rescheduleReminder, cancelReminder, scheduleRefillReminder } from "@/services/notification-service";
import { getDrugById } from "@/services/database";
import { DRUG_FORMS } from "@/constants/drug-forms";
import type { Drug, DrugForm, Reminder, Weekday } from "@/types/reminder";

export default function EditReminderScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, deleteReminder, updateReminder, refreshReminders } = useReminders();
  const { drugs: existingDrugs, addDrug } = useDrugs();
  const { t } = useLanguage();
  useHeaderStyle();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<Weekday[]>([]);
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [originalReminder, setOriginalReminder] = useState<Reminder | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inline new drug form
  const [showNewDrugForm, setShowNewDrugForm] = useState(false);
  const [newDrugName, setNewDrugName] = useState("");
  const [newDrugDosage, setNewDrugDosage] = useState("");
  const [newDrugForm, setNewDrugForm] = useState<DrugForm>("tablet");
  const [newDrugQty, setNewDrugQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    const reminder = getById(id);
    if (!reminder) {
      Alert.alert(t.common.notFound, t.reminders.notFoundMessage);
      router.back();
      return;
    }
    setOriginalReminder(reminder);
    setName(reminder.name);
    setHour(reminder.hour);
    setMinute(reminder.minute);
    setDays(reminder.days);
    setSelectedDrugIds(reminder.drugs.map((d) => d.id));
    setLoading(false);
  }, [id, getById, router]);

  const frequency = useMemo(() => {
    if (days.length === 7) return "daily" as const;
    if (days.length === 1) return "weekly" as const;
    return "custom" as const;
  }, [days]);

  const toggleDrug = useCallback((drugId: string) => {
    setSelectedDrugIds((prev) =>
      prev.includes(drugId) ? prev.filter((did) => did !== drugId) : [...prev, drugId],
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
    if (!originalReminder) return;

    const trimmedName = name.trim();
    const newErrors: Record<string, string> = {};
    if (!trimmedName) newErrors.name = t.reminders.errorNameRequired;
    if (days.length === 0) newErrors.days = t.reminders.errorDaysRequired;
    if (selectedDrugIds.length === 0) newErrors.drugs = t.reminders.errorDrugsRequired;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const updated: Reminder = {
      ...originalReminder,
      name: trimmedName,
      hour,
      minute,
      days,
    };

    const reminderDrugs = selectedDrugIds.map((did) => getDrugById(did)).filter(Boolean) as Drug[];

    try {
      const notificationIds = await rescheduleReminder(updated, reminderDrugs);
      updated.notificationIds = notificationIds;
    } catch {
      // ignore
    }

    await updateReminder(updated, selectedDrugIds);

    for (const drug of reminderDrugs) {
      try {
        await scheduleRefillReminder(drug, updated.id);
      } catch {
        // ignore
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, hour, minute, days, selectedDrugIds, originalReminder, updateReminder, refreshReminders, router]);

  const handleDelete = useCallback(() => {
    if (!originalReminder) return;
    Alert.alert(t.reminders.deleteReminderTitle, t.reminders.deleteReminderMessage.replace("{name}", originalReminder.name), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await cancelReminder(originalReminder.notificationIds, originalReminder.id);
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
    return name.trim().length > 0 && days.length > 0 && selectedDrugIds.length > 0;
  }, [name, days, selectedDrugIds]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t.reminders.editReminder, headerBackTitle: t.common.back }} />
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.reminders.reminderName}</Text>
            <ThemedInput
              placeholder={t.reminders.reminderNamePlaceholder}
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.reminders.medications}</Text>

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

            {selectedDrugIds.length > 0 && (
              <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
                {selectedDrugIds.length} {selectedDrugIds.length === 1 ? t.reminders.medicationSelected : t.reminders.medicationsSelected}
              </Text>
            )}

            {!showNewDrugForm ? (
              <Pressable
                onPress={() => setShowNewDrugForm(true)}
                style={[styles.addDrugButton, { borderColor: colors.primary }]}
              >
                <Text style={[styles.addDrugText, { color: colors.primary }]}>+ {t.reminders.addNewMedication}</Text>
              </Pressable>
            ) : (
              <View style={[styles.newDrugCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.newDrugTitle, { color: colors.textPrimary }]}>{t.reminders.newMedication}</Text>
                <ThemedInput
                  placeholder={t.reminders.medicationNamePlaceholder}
                  value={newDrugName}
                  onChangeText={setNewDrugName}
                />
                <View style={styles.row}>
                  <ThemedInput
                    style={styles.flex1}
                    placeholder={t.reminders.dosagePlaceholder}
                    value={newDrugDosage}
                    onChangeText={setNewDrugDosage}
                  />
                  <ThemedInput
                    style={styles.qtyInput}
                    placeholder={t.reminders.qtyPlaceholder}
                    value={newDrugQty > 0 ? String(newDrugQty) : ""}
                    onChangeText={(text) => {
                      const qty = parseFloat(text);
                      if (!isNaN(qty) && qty > 0) setNewDrugQty(qty);
                    }}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.reminders.form}</Text>
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
                    <Text style={[styles.cancelNewDrugText, { color: colors.textSecondary }]}>{t.common.cancel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddNewDrug}
                    disabled={!newDrugName.trim()}
                    style={[styles.saveNewDrug, { backgroundColor: newDrugName.trim() ? colors.primary : colors.divider }]}
                  >
                    <Text style={[styles.saveNewDrugText, { color: newDrugName.trim() ? colors.textInverse : colors.textTertiary }]}>
                      {t.common.add}
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
          >
            <Text style={[styles.saveText, { color: isValid ? colors.textInverse : colors.textTertiary }]}>
              {t.reminders.saveChanges}
            </Text>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.deleteText, { color: colors.danger }]}>{t.reminders.deleteReminder}</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  deleteButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  deleteText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  bottomSpacer: { height: 100 },
});
