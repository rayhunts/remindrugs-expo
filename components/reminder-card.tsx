import React, { useCallback, useRef } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { RectButton } from "react-native-gesture-handler";
import Swipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
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
  onMarkSkipped?: () => void;
  onLongPress?: () => void;
}

function SwipeAction({ color, label, onPress }: { color: string; label: string; onPress: () => void }) {
  const colors = getColors(useColorScheme());
  return (
    <RectButton style={[styles.swipeAction, { backgroundColor: color }]} onPress={onPress}>
      <Text style={[styles.swipeLabel, { color: colors.textInverse }]}>{label}</Text>
    </RectButton>
  );
}

export function ReminderCard({
  reminder,
  drugs,
  takenDrugIds,
  skippedDrugIds,
  onMarkDrug,
  onMarkAll,
  onMarkSkipped,
  onLongPress,
}: ReminderCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const frequency = getFrequencyLabel(reminder.days);
  const dayAbbr = getDayAbbreviations(reminder.days, t.days.abbr);

  const totalDrugs = drugs.length;
  const takenCount = drugs.filter((d) => takenDrugIds.has(`${reminder.id}:${d.id}`)).length;
  const skippedCount = drugs.filter((d) => skippedDrugIds.has(`${reminder.id}:${d.id}`)).length;
  const allDone = takenCount === totalDrugs;
  const someDone = takenCount > 0 || skippedCount > 0;
  const noneDone = takenCount === 0 && skippedCount === 0;

  const stripeColor = allDone ? colors.success : someDone ? colors.warning : colors.primary;

  const swipeableRef = useRef<SwipeableMethods>(null);

  const handleTakeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkAll();
    swipeableRef.current?.close();
  }, [onMarkAll]);

  const handleSkipAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMarkSkipped?.();
    swipeableRef.current?.close();
  }, [onMarkSkipped]);

  const renderLeftActions = useCallback(
    () => (
      <SwipeAction
        color={colors.success}
        label={t.components.markAllTaken}
        onPress={handleTakeAll}
      />
    ),
    [colors.success, t.components.markAllTaken, handleTakeAll],
  );

  const renderRightActions = useCallback(
    () => (
      <SwipeAction
        color={colors.textTertiary}
        label={t.home.skipAll}
        onPress={handleSkipAll}
      />
    ),
    [colors.textTertiary, t.home.skipAll, handleSkipAll],
  );

  const card = (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: allDone
            ? colors.successLight
            : someDone
              ? colors.background
              : colors.card,
          borderColor: colors.border,
          opacity: (allDone ? 0.85 : 1) * (pressed ? 0.7 : 1),
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
              checked={takenDrugIds.has(`${reminder.id}:${drug.id}`)}
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
            {frequency === "daily" ? t.common.everyDay : dayAbbr}
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
            accessibilityLabel={t.components.markAllTakenA11y.replace("{name}", reminder.name)}
          >
            <Text style={[styles.takenText, { color: colors.textInverse }]}>
              {t.components.markAllTaken}
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
              {t.components.markRemaining.replace("{count}", String(totalDrugs - takenCount - skippedCount))}
            </Text>
          </Pressable>
        )}

        {allDone && (
          <View style={[styles.takenBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.takenBadgeText, { color: colors.success }]}>
              {t.components.allTaken}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  if (allDone) {
    return <Reanimated.View entering={FadeIn.duration(200)} style={styles.swipeContainer}>{card}</Reanimated.View>;
  }

  return (
    <Reanimated.View entering={FadeIn.duration(200)} style={styles.swipeContainer}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        friction={2}
        overshootLeft={false}
        overshootRight={false}
      >
        {card}
      </Swipeable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginBottom: Spacing.md },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  swipeLabel: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
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
