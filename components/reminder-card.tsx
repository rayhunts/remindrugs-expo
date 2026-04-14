import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TimeDisplay } from "@/components/time-display";
import { FrequencyBadge } from "@/components/frequency-badge";
import { DrugChip, MoreChip } from "@/components/drug-chip";
import type { Drug, Reminder } from "@/types/reminder";
import { getFrequencyLabel, getDayAbbreviations } from "@/utils/date-helpers";

interface ReminderCardProps {
  reminder: Reminder;
  drugs: Drug[];
  takenDrugIds: Set<string>;
  skippedDrugIds: Set<string>;
  onMarkDrug: (drugId: string) => void;
  onMarkAll: () => void;
  onLongPress?: () => void;
}

export function ReminderCard({
  reminder,
  drugs,
  takenDrugIds,
  skippedDrugIds,
  onMarkDrug,
  onMarkAll,
  onLongPress,
}: ReminderCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const frequency = getFrequencyLabel(reminder.days) as "daily" | "weekly" | "custom";
  const dayAbbr = getDayAbbreviations(reminder.days);

  const totalDrugs = drugs.length;
  const takenCount = drugs.filter((d) => takenDrugIds.has(d.id)).length;
  const skippedCount = drugs.filter((d) => skippedDrugIds.has(d.id)).length;
  const allDone = takenCount === totalDrugs;
  const someDone = takenCount > 0 || skippedCount > 0;
  const noneDone = takenCount === 0 && skippedCount === 0;

  const stripeColor = allDone ? colors.success : someDone ? colors.warning : colors.primary;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: allDone
            ? colors.successLight
            : someDone
              ? colors.background
              : colors.card,
          borderColor: colors.border,
          opacity: allDone ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              { color: allDone ? colors.success : colors.textPrimary },
            ]}
          >
            {reminder.name}
          </Text>
          <FrequencyBadge type={frequency} />
        </View>

        {/* Drug chips — checkable */}
        <View style={styles.drugRow}>
          {drugs.slice(0, 3).map((drug) => (
            <DrugChip
              key={drug.id}
              name={drug.name}
              dosage={drug.dosage}
              color={drug.color}
              checked={takenDrugIds.has(drug.id)}
              onToggle={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onMarkDrug(drug.id);
              }}
            />
          ))}
          {drugs.length > 3 && <MoreChip count={drugs.length - 3} />}
        </View>

        {/* Time + days row */}
        <View style={styles.metaRow}>
          <TimeDisplay hour={reminder.hour} minute={reminder.minute} />
          <Text style={[styles.days, { color: colors.textTertiary }]}>
            {frequency === "daily" ? "Every day" : dayAbbr}
          </Text>
        </View>

        {/* Actions */}
        {noneDone && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onMarkAll();
            }}
            style={[styles.takenButton, { backgroundColor: colors.success }]}
            accessibilityLabel={`Mark all in ${reminder.name} as taken`}
          >
            <Text style={[styles.takenText, { color: colors.textInverse }]}>
              ✓ Mark All Taken
            </Text>
          </Pressable>
        )}

        {someDone && !allDone && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onMarkAll();
            }}
            style={[styles.takenButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.takenText, { color: colors.textInverse }]}>
              ✓ Mark Remaining ({totalDrugs - takenCount - skippedCount})
            </Text>
          </Pressable>
        )}

        {allDone && (
          <View style={[styles.takenBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.takenBadgeText, { color: colors.success }]}>
              ✓ All Taken
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
    marginBottom: Spacing.md,
  },
  stripe: { width: 4 },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  name: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  drugRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  days: {
    ...Typography.sm,
  },
  takenButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  takenText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  takenBadge: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    alignItems: "center",
  },
  takenBadgeText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
});
