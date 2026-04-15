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
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { useDrugs } from "@/hooks/use-drugs";
import { useLanguage } from "@/contexts/language-context";
import { DrugFormComponent, type DrugFormData } from "@/components/drug-form";

export default function AddDrugScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { addDrug } = useDrugs();
  const { t } = useLanguage();
  useHeaderStyle();

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

  const handleChange = useCallback((updates: Partial<DrugFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const isValid = useMemo(
    () => formData.name.trim().length > 0,
    [formData.name]
  );

  const handleSave = useCallback(() => {
    if (!isValid) return;

    addDrug({
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      form: formData.form,
      quantity: formData.quantity,
      notes: formData.notes || undefined,
      color: formData.color,
      currentStock: formData.currentStock
        ? parseFloat(formData.currentStock)
        : undefined,
      stockThreshold: formData.stockThreshold
        ? parseFloat(formData.stockThreshold)
        : undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [formData, isValid, addDrug]);

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
          <DrugFormComponent
            data={formData}
            onChange={handleChange}
            showScanLink
          />

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
