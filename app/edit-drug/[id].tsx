import { useState, useCallback, useEffect, useMemo } from "react";
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
import { useDrugs } from "@/hooks/use-drugs";
import { useLanguage } from "@/contexts/language-context";
import { DrugFormComponent, type DrugFormData } from "@/components/drug-form";
import { formatTime } from "@/utils/date-helpers";
import type { Drug, Reminder } from "@/types/reminder";

export default function EditDrugScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateDrug, deleteDrug, getRemindersFor } = useDrugs();
  const { t } = useLanguage();
  useHeaderStyle();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<DrugFormData>({
    name: "",
    dosage: "",
    form: "tablet",
    quantity: 1,
    notes: "",
    color: undefined,
    currentStock: "",
    stockThreshold: "",
  });
  const [linkedReminders, setLinkedReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!id) return;
    const drug = getById(id);
    if (!drug) {
      Alert.alert(t.common.notFound, t.editDrug.notFoundMessage);
      router.back();
      return;
    }
    setFormData({
      name: drug.name,
      dosage: drug.dosage,
      form: drug.form,
      quantity: drug.quantity,
      notes: drug.notes ?? "",
      color: drug.color,
      currentStock: drug.currentStock !== undefined ? String(drug.currentStock) : "",
      stockThreshold: drug.stockThreshold !== undefined ? String(drug.stockThreshold) : "",
    });
    setLinkedReminders(getRemindersFor(drug.id));
    setLoading(false);
  }, [id, getById, getRemindersFor, router]);

  const isValid = useMemo(() => formData.name.trim().length > 0, [formData.name]);

  const handleChange = useCallback((updates: Partial<DrugFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(() => {
    if (!id || !isValid) return;

    const updated: Drug = {
      id,
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      form: formData.form,
      quantity: formData.quantity,
      notes: formData.notes || undefined,
      color: formData.color,
      currentStock: formData.currentStock ? parseFloat(formData.currentStock) : undefined,
      stockThreshold: formData.stockThreshold ? parseFloat(formData.stockThreshold) : undefined,
    };

    updateDrug(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [id, formData, isValid, updateDrug, router]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert(
      t.editDrug.deleteMedicationTitle,
      t.editDrug.deleteMedicationMessage.replace("{name}", formData.name),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteDrug(id);
            router.back();
          },
        },
      ],
    );
  }, [id, formData.name, deleteDrug, router]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t.editDrug.editMedication, headerBackTitle: t.common.back }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <DrugFormComponent
            data={formData}
            onChange={handleChange}
            showScanLink={false}
          />

          {/* Linked Reminders */}
          {linkedReminders.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t.medications.usedInReminders}
              </Text>
              {linkedReminders.map((r) => (
                <View
                  key={r.id}
                  style={[styles.reminderItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <MaterialCommunityIcons name="bell-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.reminderName, { color: colors.textPrimary }]}>{r.name}</Text>
                  <Text style={[styles.reminderTime, { color: colors.textTertiary }]}>
                    {formatTime(r.hour, r.minute)}
                  </Text>
                </View>
              ))}
            </View>
          )}

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
            <Text style={[styles.deleteText, { color: colors.danger }]}>{t.editDrug.deleteMedication}</Text>
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
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reminderName: {
    ...Typography.sm,
    fontWeight: Typography.medium,
    flex: 1,
  },
  reminderTime: {
    ...Typography.sm,
    color: undefined,
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
