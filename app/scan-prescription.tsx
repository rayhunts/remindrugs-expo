import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { useDrugs } from "@/hooks/use-drugs";
import { useLanguage } from "@/contexts/language-context";
import { ThemedInput } from "@/components/themed-input";
import { DRUG_FORMS } from "@/constants/drug-forms";
import { parsePrescriptionText, type ParsedMedication } from "@/services/prescription-parser";
import type { DrugForm } from "@/types/reminder";

interface EditableMed extends ParsedMedication {
  _key: string;
}

export default function ScanPrescriptionScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { addDrug } = useDrugs();
  const { t } = useLanguage();
  useHeaderStyle();

  const [medications, setMedications] = useState<EditableMed[]>([]);
  const [processing, setProcessing] = useState(false);
  const [ocrRaw, setOcrRaw] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets[0]) return;
    processImage(result.assets[0].uri);
  }, []);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets[0]) return;
    processImage(result.assets[0].uri);
  }, []);

  const processImage = useCallback(
    async (uri: string) => {
      setProcessing(true);
      try {
        const MlkitOcr = require("rn-mlkit-ocr").default;
        const result = await MlkitOcr.recognizeText(uri);
        const rawText = result.text ?? "";
        setOcrRaw(rawText);

        const parsed = parsePrescriptionText(rawText);
        if (parsed.length === 0) {
          Alert.alert(t.scan.noMedsFound, t.scan.noMedsFoundMessage);
        } else {
          const keyed: EditableMed[] = parsed.map((m, i) => ({
            ...m,
            _key: `med-${i}-${Date.now()}`,
          }));
          setMedications(keyed);
        }
      } catch (err) {
        Alert.alert(t.scan.ocrError, String(err));
      } finally {
        setProcessing(false);
      }
    },
    [t.scan],
  );

  const updateMed = useCallback((index: number, updates: Partial<EditableMed>) => {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  }, []);

  const removeMed = useCallback((index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveAll = useCallback(() => {
    if (medications.length === 0) return;

    for (const med of medications) {
      if (!med.name.trim()) continue;
      addDrug({
        name: med.name.trim(),
        dosage: med.dosage.trim(),
        form: med.form ?? "tablet",
        quantity: med.quantity ?? 1,
        notes: med.notes,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [medications, addDrug]);

  return (
    <>
      <Stack.Screen options={{ title: t.scan.title, headerBackTitle: t.common.back }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Action buttons */}
          <View style={styles.section}>
            <View style={styles.actionRow}>
              <Pressable
                onPress={takePhoto}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                <MaterialCommunityIcons name="camera" size={20} color={colors.textInverse} />
                <Text style={[styles.actionText, { color: colors.textInverse }]}>{t.scan.takePhoto}</Text>
              </Pressable>
              <Pressable
                onPress={pickImage}
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              >
                <MaterialCommunityIcons name="image-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>{t.scan.pickImage}</Text>
              </Pressable>
            </View>
          </View>

          {/* Processing indicator */}
          {processing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t.scan.processing}</Text>
            </View>
          )}

          {/* OCR raw text (collapsible) */}
          {ocrRaw && !processing && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.scan.recognizedText}</Text>
              <View style={[styles.ocrBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.ocrText, { color: colors.textSecondary }]} numberOfLines={6}>
                  {ocrRaw}
                </Text>
              </View>
            </View>
          )}

          {/* Extracted medications */}
          {medications.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t.scan.extractedMeds} ({medications.length})
              </Text>
              {medications.map((med, index) => (
                <View
                  key={med._key}
                  style={[styles.medCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Name */}
                  <ThemedInput
                    placeholder={t.scan.drugName}
                    value={med.name}
                    onChangeText={(text) => updateMed(index, { name: text })}
                  />
                  {/* Dosage + Quantity */}
                  <View style={styles.row}>
                    <ThemedInput
                      style={styles.flex1}
                      placeholder={t.reminders.dosagePlaceholder}
                      value={med.dosage}
                      onChangeText={(text) => updateMed(index, { dosage: text })}
                    />
                    <ThemedInput
                      style={styles.qtyInput}
                      placeholder={t.reminders.qtyPlaceholder}
                      value={med.quantity != null && med.quantity > 0 ? String(med.quantity) : ""}
                      onChangeText={(text) => {
                        const qty = parseFloat(text);
                        if (!isNaN(qty) && qty > 0) updateMed(index, { quantity: qty });
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  {/* Form chips */}
                  <View style={styles.formRow}>
                    {DRUG_FORMS.map((f) => {
                      const selected = med.form === f.value;
                      return (
                        <Pressable
                          key={f.value}
                          onPress={() => updateMed(index, { form: f.value as DrugForm })}
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
                            <Text
                              style={[
                                styles.formChipText,
                                { color: selected ? colors.textInverse : colors.textSecondary },
                              ]}
                            >
                              {f.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  {/* Remove button */}
                  <Pressable
                    onPress={() => removeMed(index)}
                    style={[styles.removeButton, { backgroundColor: colors.dangerLight }]}
                  >
                    <MaterialCommunityIcons name="close" size={14} color={colors.danger} />
                    <Text style={[styles.removeText, { color: colors.danger }]}>{t.common.remove}</Text>
                  </Pressable>
                </View>
              ))}

              {/* Save All button */}
              <Pressable
                onPress={handleSaveAll}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.saveText, { color: colors.textInverse }]}>
                  {t.scan.addAll} ({medications.length})
                </Text>
              </Pressable>
            </View>
          )}

          {/* Empty state */}
          {medications.length === 0 && !processing && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="pill" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {t.scan.emptyTitle}
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textTertiary }]}>
                {t.scan.emptyMessage}
              </Text>
            </View>
          )}

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
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  actionText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.sm,
  },
  ocrBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  ocrText: {
    ...Typography.xs,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  flex1: { flex: 1 },
  qtyInput: { width: 70, flex: undefined },
  formRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
  medCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  removeText: {
    ...Typography.xs,
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    marginTop: Spacing.sm,
  },
  emptyMessage: {
    ...Typography.sm,
    textAlign: "center",
    maxWidth: 280,
  },
  bottomSpacer: { height: 100 },
});
