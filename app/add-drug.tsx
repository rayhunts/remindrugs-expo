import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useDrugs } from "@/hooks/use-drugs";
import { useLanguage } from "@/contexts/language-context";
import { ThemedInput } from "@/components/themed-input";
import { DRUG_FORMS, PILL_COLORS } from "@/constants/drug-forms";
import type { DrugForm } from "@/types/reminder";

export default function AddDrugScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { addDrug } = useDrugs();
  const { t } = useLanguage();
  useHeaderStyle();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState<DrugForm>("tablet");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSave = useCallback(() => {
    if (!isValid) return;

    addDrug({
      name: name.trim(),
      dosage: dosage.trim(),
      form,
      quantity,
      notes: notes || undefined,
      color,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [name, dosage, form, quantity, notes, color, isValid, addDrug]);

  return (
    <>
      <Stack.Screen options={{ title: t.medications.addMedication, headerBackTitle: t.common.back }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.editDrug.name}</Text>
            <ThemedInput
              placeholder={t.reminders.medicationNamePlaceholder}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Dosage + Quantity */}
          <View style={styles.section}>
            <View style={styles.row}>
              <ThemedInput
                style={styles.flex1}
                placeholder={t.reminders.dosagePlaceholder}
                value={dosage}
                onChangeText={setDosage}
              />
              <ThemedInput
                style={styles.qtyInput}
                placeholder={t.reminders.qtyPlaceholder}
                value={quantity > 0 ? String(quantity) : ""}
                onChangeText={(text) => {
                  const qty = parseInt(text, 10);
                  if (!isNaN(qty) && qty > 0) setQuantity(qty);
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Form */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.reminders.form}</Text>
            <View style={styles.formRow}>
              {DRUG_FORMS.map((f) => {
                const selected = form === f.value;
                return (
                  <Pressable
                    key={f.value}
                    onPress={() => setForm(f.value)}
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
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.editDrug.notes}</Text>
            <ThemedInput
              placeholder={t.components.notesPlaceholder}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.editDrug.color}</Text>
            <View style={styles.colorRow}>
              {PILL_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setColor(selected ? undefined : c)}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: c,
                        borderColor: selected ? colors.textPrimary : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <View style={[styles.colorDotInner, { borderColor: colors.card }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
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
              {t.common.add}
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
  colorRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
