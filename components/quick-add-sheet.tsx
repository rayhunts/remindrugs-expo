import { useState, useCallback, useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { useReminders } from "@/hooks/use-reminders";
import { useDrugs } from "@/hooks/use-drugs";
import { DrugChip } from "@/components/drug-chip";
import { scheduleReminder, scheduleRefillReminder } from "@/services/notification-service";
import { updateReminder as dbUpdateReminder, getDrugById } from "@/services/database";
import type { Drug, Weekday } from "@/types/reminder";
import { router } from "expo-router";

interface QuickAddSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
}

export function QuickAddSheet({ sheetRef }: QuickAddSheetProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();
  const { addReminder } = useReminders();
  const { drugs: existingDrugs, refreshDrugs } = useDrugs();

  const snapPoints = useMemo(() => ["50%", "75%"], []);

  const [name, setName] = useState("");
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => new Date().getMinutes());
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setName("");
    setHour(new Date().getHours());
    setMinute(new Date().getMinutes());
    setSelectedDrugIds([]);
    setErrors({});
    setShowTimePicker(false);
  }, []);

  const toggleDrug = useCallback((drugId: string) => {
    setSelectedDrugIds((prev) =>
      prev.includes(drugId) ? prev.filter((id) => id !== drugId) : [...prev, drugId],
    );
    if (errors.drugs) setErrors((e) => ({ ...e, drugs: "" }));
  }, [errors.drugs]);

  const handleTimeChange = useCallback(
    (_event: unknown, date?: Date) => {
      setShowTimePicker(Platform.OS === "ios");
      if (date) {
        setHour(date.getHours());
        setMinute(date.getMinutes());
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const newErrors: Record<string, string> = {};
    if (!trimmedName) newErrors.name = t.reminders.errorNameRequired;
    if (selectedDrugIds.length === 0) newErrors.drugs = t.reminders.errorDrugsRequired;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const allDays: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

    const reminder = await addReminder({
      name: trimmedName,
      hour,
      minute,
      days: allDays,
      isActive: true,
      startDate: undefined,
      endDate: undefined,
      drugIds: selectedDrugIds,
    });

    const reminderDrugs = selectedDrugIds.map((id) => getDrugById(id)).filter(Boolean) as Drug[];

    try {
      const notificationIds = await scheduleReminder(reminder, reminderDrugs);
      dbUpdateReminder({ ...reminder, notificationIds });
    } catch {
      Alert.alert(
        "Notification issue",
        "Reminder saved but notifications may not work.",
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
    sheetRef.current?.dismiss();
    resetForm();
  }, [name, hour, minute, selectedDrugIds, addReminder, sheetRef, resetForm, t]);

  const handleOpenFullForm = useCallback(() => {
    sheetRef.current?.dismiss();
    router.push("/add-reminder");
  }, [sheetRef]);

  const timeLabel = `${hour % 12 || 12}:${minute.toString().padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  const isValid = name.trim().length > 0 && selectedDrugIds.length > 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={resetForm}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t.reminders.addReminder}
          </Text>
          <Pressable onPress={handleOpenFullForm}>
            <Text style={[styles.moreOptionsLink, { color: colors.primary }]}>
              {t.common.all}
            </Text>
          </Pressable>
        </View>

        {/* Name */}
        <BottomSheetTextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: errors.name ? colors.danger : colors.border }]}
          placeholder={t.reminders.reminderNamePlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((e) => ({ ...e, name: "" }));
          }}
        />
        {errors.name ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>
        ) : null}

        {/* Time */}
        <Pressable
          onPress={() => {
            setTempDate(new Date(2000, 0, 1, hour, minute));
            setShowTimePicker(true);
          }}
          style={[styles.timeButton, { borderColor: colors.border, backgroundColor: colors.background }]}
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{t.components.time}</Text>
          <Text style={[styles.timeValue, { color: colors.textPrimary }]}>{timeLabel}</Text>
        </Pressable>

        {showTimePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {showTimePicker && Platform.OS === "ios" && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            textColor={colors.textPrimary}
          />
        )}

        {/* Drug selection */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t.reminders.medications}
        </Text>
        {existingDrugs.length > 0 ? (
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
        ) : (
          <Pressable
            onPress={handleOpenFullForm}
            style={[styles.addDrugHint, { borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
            <Text style={[styles.addDrugHintText, { color: colors.primary }]}>
              {t.reminders.addNewMedication}
            </Text>
          </Pressable>
        )}
        {errors.drugs ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{errors.drugs}</Text>
        ) : null}

        {/* Default to daily note */}
        <Text style={[styles.dailyNote, { color: colors.textTertiary }]}>
          {t.components.frequencyDaily} · {t.common.everyDay}
        </Text>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: isValid ? colors.primary : colors.divider,
              opacity: pressed && isValid ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.saveText, { color: isValid ? colors.textInverse : colors.textTertiary }]}>
            {t.reminders.saveReminder}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  moreOptionsLink: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.base,
    marginBottom: Spacing.sm,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  timeLabel: {
    ...Typography.sm,
    flex: 1,
  },
  timeValue: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  sectionLabel: {
    ...Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  drugChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addDrugHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addDrugHintText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  dailyNote: {
    ...Typography.xs,
    marginBottom: Spacing.md,
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  saveText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  errorText: {
    ...Typography.xs,
    marginBottom: Spacing.sm,
  },
});
