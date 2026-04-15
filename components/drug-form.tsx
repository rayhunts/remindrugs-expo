import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { ThemedInput } from "@/components/themed-input";
import { DRUG_FORMS, PILL_COLORS } from "@/constants/drug-forms";
import type { DrugForm } from "@/types/reminder";

export interface DrugFormData {
  name: string;
  dosage: string;
  form: DrugForm;
  quantity: number;
  notes: string;
  color: string | undefined;
  currentStock: string;
  stockThreshold: string;
}

export interface DrugFormProps {
  data: DrugFormData;
  onChange: (updates: Partial<DrugFormData>) => void;
  showScanLink?: boolean;
}

export function DrugFormComponent({
  data,
  onChange,
  showScanLink = true,
}: DrugFormProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  return (
    <>
      {/* Scan Prescription */}
      {showScanLink && (
        <Link asChild href="/scan-prescription">
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={20} color={colors.primary} />
            <Text style={[styles.scanText, { color: colors.primary }]}>{t.scan.scanPrescription}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
          </Pressable>
        </Link>
      )}

      {/* Name */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.editDrug.name}</Text>
        <ThemedInput
          placeholder={t.reminders.medicationNamePlaceholder}
          value={data.name}
          onChangeText={(text) => onChange({ name: text })}
        />
      </View>

      {/* Dosage + Quantity */}
      <View style={styles.section}>
        <View style={styles.row}>
          <ThemedInput
            style={styles.flex1}
            placeholder={t.reminders.dosagePlaceholder}
            value={data.dosage}
            onChangeText={(text) => onChange({ dosage: text })}
          />
          <ThemedInput
            style={styles.qtyInput}
            placeholder={t.reminders.qtyPlaceholder}
            value={data.quantity > 0 ? String(data.quantity) : ""}
            onChangeText={(text) => {
              const qty = parseFloat(text);
              if (!isNaN(qty) && qty > 0) onChange({ quantity: qty });
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
            const selected = data.form === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => onChange({ form: f.value })}
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
          value={data.notes}
          onChangeText={(text) => onChange({ notes: text })}
        />
      </View>

      {/* Color */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.editDrug.color}</Text>
        <View style={styles.colorRow}>
          {PILL_COLORS.map((c) => {
            const selected = data.color === c;
            return (
              <Pressable
                key={c}
                onPress={() => onChange({ color: selected ? undefined : c })}
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

      {/* Stock Tracking */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.editDrug.stockTracking}</Text>
        <View style={styles.row}>
          <ThemedInput
            style={styles.flex1}
            placeholder={t.editDrug.stockPlaceholder}
            value={data.currentStock}
            onChangeText={(text) => onChange({ currentStock: text })}
            keyboardType="numeric"
          />
          <ThemedInput
            style={styles.flex1}
            placeholder={t.editDrug.alertPlaceholder}
            value={data.stockThreshold}
            onChangeText={(text) => onChange({ stockThreshold: text })}
            keyboardType="numeric"
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  scanText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
    flex: 1,
  },
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
});
