import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DRUG_FORMS, PILL_COLORS } from "@/constants/drug-forms";
import type { Drug, DrugForm } from "@/types/reminder";

interface DrugFormRowProps {
  drug: Drug;
  index: number;
  canDelete: boolean;
  onUpdate: (index: number, updates: Partial<Drug>) => void;
  onDelete: (index: number) => void;
}

export function DrugFormRow({
  drug,
  index,
  canDelete,
  onUpdate,
  onDelete,
}: DrugFormRowProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.indexBadge,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Text style={[styles.indexText, { color: colors.primary }]}>
              {index + 1}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Drug {index + 1}
          </Text>
        </View>
        {canDelete && (
          <Pressable
            onPress={() => onDelete(index)}
            hitSlop={8}
            accessibilityLabel={`Remove drug ${index + 1}`}
          >
            <Text style={[styles.deleteText, { color: colors.danger }]}>
              Remove
            </Text>
          </Pressable>
        )}
      </View>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        placeholder="Drug name"
        placeholderTextColor={colors.textTertiary}
        value={drug.name}
        onChangeText={(text) => onUpdate(index, { name: text })}
        accessibilityLabel="Drug name"
      />

      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            styles.flex1,
            {
              color: colors.textPrimary,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          placeholder="Dosage (e.g. 500mg)"
          placeholderTextColor={colors.textTertiary}
          value={drug.dosage}
          onChangeText={(text) => onUpdate(index, { dosage: text })}
          accessibilityLabel="Dosage"
        />
        <TextInput
          style={[
            styles.input,
            styles.qtyInput,
            {
              color: colors.textPrimary,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          placeholder="Qty"
          placeholderTextColor={colors.textTertiary}
          value={drug.quantity > 0 ? String(drug.quantity) : ""}
          onChangeText={(text) => {
            const qty = parseInt(text, 10);
            if (!isNaN(qty) && qty > 0) onUpdate(index, { quantity: qty });
          }}
          keyboardType="numeric"
          accessibilityLabel="Quantity per dose"
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Form
      </Text>
      <View style={styles.formRow}>
        {DRUG_FORMS.map((form) => {
          const selected = drug.form === form.value;
          return (
            <Pressable
              key={form.value}
              onPress={() => onUpdate(index, { form: form.value })}
              style={[
                styles.formChip,
                {
                  backgroundColor: selected
                    ? colors.primary
                    : colors.background,
                  borderColor: selected
                    ? colors.primary
                    : colors.border,
                },
              ]}
              accessibilityLabel={`${form.label}${selected ? ", selected" : ""}`}
            >
              <View style={styles.formChipContent}>
                <MaterialCommunityIcons
                  name={form.icon as any}
                  size={14}
                  color={
                    selected
                      ? colors.textInverse
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.formChipText,
                    {
                      color: selected
                        ? colors.textInverse
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {form.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        placeholder="Notes (optional, e.g. take with food)"
        placeholderTextColor={colors.textTertiary}
        value={drug.notes ?? ""}
        onChangeText={(text) => onUpdate(index, { notes: text || undefined })}
        accessibilityLabel="Notes"
      />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Color
      </Text>
      <View style={styles.colorRow}>
        {PILL_COLORS.map((color) => {
          const selected = drug.color === color;
          return (
            <Pressable
              key={color}
              onPress={() => onUpdate(index, { color: selected ? undefined : color })}
              style={[
                styles.colorDot,
                {
                  backgroundColor: color,
                  borderColor: selected
                    ? colors.textPrimary
                    : "transparent",
                },
              ]}
              accessibilityLabel={`Color ${selected ? "selected" : ""}`}
            >
              {selected && (
                <View
                  style={[
                    styles.colorDotInner,
                    { borderColor: colors.card },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Stock Tracking (optional)
      </Text>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            styles.flex1,
            {
              color: colors.textPrimary,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          placeholder="Pills remaining"
          placeholderTextColor={colors.textTertiary}
          value={
            drug.currentStock !== undefined
              ? String(drug.currentStock)
              : ""
          }
          onChangeText={(text) => {
            const val = parseInt(text, 10);
            if (!isNaN(val) && val >= 0)
              onUpdate(index, { currentStock: val });
            else onUpdate(index, { currentStock: undefined });
          }}
          keyboardType="numeric"
          accessibilityLabel="Pills remaining"
        />
        <TextInput
          style={[
            styles.input,
            styles.flex1,
            {
              color: colors.textPrimary,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          placeholder="Alert at"
          placeholderTextColor={colors.textTertiary}
          value={
            drug.stockThreshold !== undefined
              ? String(drug.stockThreshold)
              : ""
          }
          onChangeText={(text) => {
            const val = parseInt(text, 10);
            if (!isNaN(val) && val >= 0)
              onUpdate(index, { stockThreshold: val });
            else onUpdate(index, { stockThreshold: undefined });
          }}
          keyboardType="numeric"
          accessibilityLabel="Alert threshold"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    ...Typography.xs,
    fontWeight: Typography.bold,
  },
  headerTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  deleteText: {
    ...Typography.sm,
    fontWeight: Typography.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.base,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  qtyInput: {
    width: 70,
    flex: undefined,
  },
  sectionLabel: {
    ...Typography.xs,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
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
  formChipText: {
    ...Typography.xs,
  },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
