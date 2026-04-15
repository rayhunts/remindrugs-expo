import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { formatTime } from "@/utils/date-helpers";
import type { Drug, Reminder } from "@/types/reminder";

const FORM_ICONS: Record<string, string> = {
  tablet: "pill",
  capsule: "medical-bag",
  liquid: "water",
  injection: "needle",
  patch: "bandage",
  inhaler: "lungs",
  drops: "eye-outline",
  other: "help-circle-outline",
};

interface MedicationCardProps {
  drug: Drug;
  reminders: Reminder[];
  onPress: () => void;
}

export function MedicationCard({ drug, reminders, onPress }: MedicationCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const hasLowStock =
    drug.currentStock !== undefined &&
    drug.stockThreshold !== undefined &&
    drug.currentStock <= drug.stockThreshold;

  const formIcon = FORM_ICONS[drug.form] ?? "help-circle-outline";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: drug.color ?? colors.primary }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <MaterialCommunityIcons name={formIcon as any} size={18} color={colors.textSecondary} />
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {drug.name}
            </Text>
          </View>
          <View style={[styles.formBadge, { backgroundColor: colors.divider }]}>
            <Text style={[styles.formText, { color: colors.textSecondary }]}>
              {drug.form}
            </Text>
          </View>
        </View>

        <Text style={[styles.dosage, { color: colors.textSecondary }]}>
          {drug.dosage} · {drug.quantity}{t.medications.perDose}
        </Text>

        {drug.currentStock !== undefined && (
          <View style={styles.stockSection}>
            <View style={styles.stockRow}>
              <MaterialCommunityIcons
                name={hasLowStock ? "alert-circle" : "package-variant"}
                size={14}
                color={hasLowStock ? colors.danger : colors.textTertiary}
              />
              <Text
                style={[styles.stockText, { color: hasLowStock ? colors.danger : colors.textTertiary }]}
              >
                {drug.currentStock} {t.common.remaining}
              </Text>
              {drug.stockThreshold !== undefined && (
                <Text style={[styles.stockThreshold, { color: colors.textTertiary }]}>
                  · {t.editDrug.alertPlaceholder} {drug.stockThreshold}
                </Text>
              )}
            </View>
            {drug.stockThreshold !== undefined && (
              <View style={[styles.stockBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.stockBarFill,
                    {
                      width: `${Math.min(100, (drug.currentStock / (drug.stockThreshold * 2)) * 100)}%`,
                      backgroundColor: hasLowStock ? colors.danger : colors.primary,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {drug.notes ? (
          <Text style={[styles.notes, { color: colors.textTertiary }]} numberOfLines={1}>
            {drug.notes}
          </Text>
        ) : null}

        {reminders.length > 0 && (
          <View style={styles.remindersRow}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.remindersText, { color: colors.textTertiary }]} numberOfLines={1}>
              {reminders.map((r) => `${r.name} (${formatTime(r.hour, r.minute)})`).join(" · ")}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  stripe: { width: 4 },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    flex: 1,
  },
  formBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  formText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: "capitalize",
  },
  dosage: {
    ...Typography.sm,
    marginTop: 2,
  },
  stockSection: { marginTop: 4, gap: 4 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stockText: {
    ...Typography.xs,
  },
  stockThreshold: { ...Typography.xs },
  stockBarTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  stockBarFill: { height: "100%", borderRadius: 2 },
  notes: {
    ...Typography.xs,
    marginTop: 2,
    fontStyle: "italic",
  },
  remindersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
  },
  remindersText: {
    ...Typography.xs,
    flex: 1,
  },
});
