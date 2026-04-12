import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TimeDisplay } from "@/components/time-display";
import { FrequencyBadge } from "@/components/frequency-badge";
import { DrugChip, MoreChip } from "@/components/drug-chip";
import type { Reminder } from "@/types/reminder";
import { getFrequencyLabel, getDayAbbreviations } from "@/utils/date-helpers";

interface ReminderCardProps {
  reminder: Reminder;
  isTaken: boolean;
  onMarkTaken: () => void;
  onLongPress?: () => void;
}

export function ReminderCard({
  reminder,
  isTaken,
  onMarkTaken,
  onLongPress,
}: ReminderCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const frequency = getFrequencyLabel(reminder.days) as "daily" | "weekly" | "custom";
  const dayAbbr = getDayAbbreviations(reminder.days);

  const handleMarkTaken = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkTaken();
  };

  const displayedDrugs = reminder.drugs.slice(0, 3);
  const moreCount = reminder.drugs.length - 3;

  const stripeColor = isTaken ? colors.success : colors.primary;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: isTaken ? colors.successLight : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Left stripe */}
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              {
                color: isTaken
                  ? colors.success
                  : colors.textPrimary,
              },
            ]}
          >
            {reminder.name}
          </Text>
          <FrequencyBadge type={frequency} />
        </View>

        {/* Drug chips */}
        <View style={styles.drugRow}>
          {displayedDrugs.map((drug) => (
            <DrugChip
              key={drug.id}
              name={drug.name}
              dosage={drug.dosage}
              color={drug.color}
            />
          ))}
          {moreCount > 0 && <MoreChip count={moreCount} />}
        </View>

        {/* Time + days row */}
        <View style={styles.metaRow}>
          <TimeDisplay hour={reminder.hour} minute={reminder.minute} />
          <Text style={[styles.days, { color: colors.textTertiary }]}>
            {frequency === "daily" ? "Every day" : dayAbbr}
          </Text>
        </View>

        {/* Mark as taken */}
        {!isTaken && (
          <Pressable
            onPress={handleMarkTaken}
            style={[
              styles.takenButton,
              { backgroundColor: colors.success },
            ]}
            accessibilityLabel={`Mark ${reminder.name} as taken`}
          >
            <Text style={[styles.takenText, { color: colors.textInverse }]}>
              ✓ Mark as Taken
            </Text>
          </Pressable>
        )}

        {isTaken && (
          <View
            style={[
              styles.takenBadge,
              { backgroundColor: colors.successLight },
            ]}
          >
            <Text style={[styles.takenBadgeText, { color: colors.success }]}>
              ✓ Taken
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
  stripe: {
    width: 4,
  },
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
