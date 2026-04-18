import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography, data, dataLabel } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { formatTime } from "@/utils/date-helpers";
import { estimateDaysUntilEmpty } from "@/services/notification-service";
import type { Drug, Reminder } from "@/types/reminder";
import type { AdherenceLog } from "@/types/adherence";

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
  adherenceLogs?: AdherenceLog[];
  onPress: () => void;
}

export function MedicationCard({ drug, reminders, adherenceLogs, onPress }: MedicationCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const hasLowStock =
    drug.currentStock !== undefined &&
    drug.stockThreshold !== undefined &&
    drug.currentStock <= drug.stockThreshold;

  const formIcon = FORM_ICONS[drug.form] ?? "help-circle-outline";

  const stockPercent =
    drug.stockThreshold !== undefined && drug.currentStock !== undefined
      ? Math.min(100, (drug.currentStock / (drug.stockThreshold * 2)) * 100)
      : 0;

  const daysLeft =
    drug.currentStock !== undefined && adherenceLogs
      ? estimateDaysUntilEmpty(drug, adherenceLogs)
      : null;

  const daysLeftColor =
    daysLeft !== null
      ? daysLeft > 14
        ? colors.success
        : daysLeft >= 7
          ? colors.warning
          : colors.danger
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: hasLowStock ? colors.danger : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.iconColumn, { backgroundColor: drug.color ?? colors.primary }]}>
        <MaterialCommunityIcons name={formIcon as any} size={28} color="#FFFFFF" />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {drug.name}
            </Text>
            <Text style={[styles.dosage, { color: colors.textSecondary }]}>
              {drug.dosage} · {drug.quantity}{t.medications.perDose}
            </Text>
          </View>
          <View style={[styles.formBadge, { backgroundColor: colors.divider }]}>
            <Text style={[styles.formText, { color: colors.textSecondary }]}>
              {drug.form}
            </Text>
          </View>
        </View>

        {drug.currentStock !== undefined && (
          <View style={styles.stockSection}>
            <View style={styles.stockRow}>
              <MaterialCommunityIcons
                name={hasLowStock ? "alert-circle" : "package-variant"}
                size={16}
                color={hasLowStock ? colors.danger : colors.textTertiary}
              />
              <Text
                style={[
                  styles.stockText,
                  { color: hasLowStock ? colors.danger : colors.textTertiary },
                  dataLabel,
                ]}
              >
                {drug.currentStock} {t.common.remaining}
              </Text>
              {drug.stockThreshold !== undefined && (
                <Text style={[styles.stockThreshold, { color: colors.textTertiary }]}>
                  / {drug.stockThreshold}
                </Text>
              )}
              {hasLowStock && (
                <View style={[styles.lowStockBadge, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.lowStockText, { color: colors.danger }]}>
                    {t.medications.lowStock}
                  </Text>
                </View>
              )}
            </View>
            {drug.stockThreshold !== undefined && (
              <View style={[styles.stockBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.stockBarFill,
                    {
                      width: `${stockPercent}%`,
                      backgroundColor: hasLowStock
                        ? colors.danger
                        : stockPercent > 50
                          ? colors.success
                          : colors.warning,
                    },
                  ]}
                />
              </View>
            )}
            {daysLeft !== null && daysLeftColor !== null && (
              <Text style={[styles.daysLeftText, { color: daysLeftColor }]}>
                ~{daysLeft} {t.settings.daysRemaining.toLowerCase()}
              </Text>
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
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textTertiary} />
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
  iconColumn: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  nameSection: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  dosage: {
    ...Typography.sm,
    marginTop: 2,
  },
  formBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  formText: {
    ...Typography.xs,
    fontWeight: Typography.medium,
    textTransform: "capitalize",
  },
  stockSection: { marginTop: 4, gap: 4 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stockText: {
    ...data,
  },
  stockThreshold: { ...Typography.xs },
  lowStockBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: Radius.full,
    marginLeft: Spacing.xs,
  },
  lowStockText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
  stockBarTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  stockBarFill: { height: "100%", borderRadius: 3 },
  daysLeftText: {
    ...Typography.xs,
    fontWeight: Typography.medium,
    marginTop: 2,
  },
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
