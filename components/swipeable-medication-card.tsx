import { useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Switch } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TimeDisplay } from "@/components/time-display";
import { FrequencyBadge } from "@/components/frequency-badge";
import { getFrequencyLabel, getDayAbbreviations } from "@/utils/date-helpers";
import type { Reminder } from "@/types/reminder";

const ACTION_WIDTH = 80;
const SWIPE_THRESHOLD = 40;

// Module-level tracker so only one card is open at a time
let activeSwipeX: { value: number } | null = null;

function snapClosed(ref: { value: number }) {
  "worklet";
  ref.value = withSpring(0, { damping: 20, stiffness: 200 });
}

interface SwipeableMedicationCardProps {
  reminder: Reminder;
  colors: ReturnType<typeof getColors>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SwipeableMedicationCard({
  reminder,
  colors,
  onToggle,
  onEdit,
  onDelete,
}: SwipeableMedicationCardProps) {
  const translateX = useSharedValue(0);
  const cardId = useRef(reminder.id);

  const frequency = getFrequencyLabel(reminder.days) as
    | "daily"
    | "weekly"
    | "custom";
  const dayAbbr = getDayAbbreviations(reminder.days);

  const drugNames = reminder.drugs
    .slice(0, 3)
    .map((d) => d.name)
    .join(", ");
  const moreCount = reminder.drugs.length - 3;

  const hasLowStock = reminder.drugs.some(
    (d) =>
      d.currentStock !== undefined &&
      d.stockThreshold !== undefined &&
      d.currentStock <= d.stockThreshold,
  );

  const closeActiveSwipe = useCallback(() => {
    if (activeSwipeX && activeSwipeX !== translateX) {
      snapClosed(activeSwipeX);
    }
    activeSwipeX = translateX;
  }, [translateX]);

  const handleLongPress = useCallback(() => {
    Alert.alert(reminder.name, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: onEdit },
      {
        text: reminder.isActive ? "Pause" : "Resume",
        onPress: onToggle,
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  }, [reminder.name, reminder.isActive, onEdit, onToggle, onDelete]);

  const triggerEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateX.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onEdit)();
    });
    activeSwipeX = null;
  }, [translateX, onEdit]);

  const triggerDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    translateX.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDelete)();
    });
    activeSwipeX = null;
  }, [translateX, onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      runOnJS(closeActiveSwipe)();
    })
    .onUpdate((event) => {
      let next = event.translationX;
      // Dampen if past the action width
      if (next < -ACTION_WIDTH) next = -ACTION_WIDTH + (next + ACTION_WIDTH) * 0.3;
      if (next > ACTION_WIDTH) next = ACTION_WIDTH + (next - ACTION_WIDTH) * 0.3;
      translateX.value = next;
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const tx = translateX.value;

      if (tx < -SWIPE_THRESHOLD || (tx < 0 && velocity < -500)) {
        // Snap to delete revealed
        translateX.value = withSpring(-ACTION_WIDTH, { damping: 20, stiffness: 180 });
      } else if (tx > SWIPE_THRESHOLD || (tx > 0 && velocity > 500)) {
        // Snap to edit revealed
        translateX.value = withSpring(ACTION_WIDTH, { damping: 20, stiffness: 180 });
      } else {
        // Snap closed
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    })
    .enabled(true);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const editButtonOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const deleteButtonOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, -ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.container}>
      {/* Edit action (behind, left side) */}
      <Animated.View
        style={[
          styles.actionLeft,
          { backgroundColor: colors.primary },
          editButtonOpacity,
        ]}
      >
        <Pressable onPress={triggerEdit} style={styles.actionInner}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={22}
            color={colors.textInverse}
          />
          <Text style={[styles.actionLabel, { color: colors.textInverse }]}>
            Edit
          </Text>
        </Pressable>
      </Animated.View>

      {/* Delete action (behind, right side) */}
      <Animated.View
        style={[
          styles.actionRight,
          { backgroundColor: colors.danger },
          deleteButtonOpacity,
        ]}
      >
        <Pressable onPress={triggerDelete} style={styles.actionInner}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={22}
            color={colors.textInverse}
          />
          <Text style={[styles.actionLabel, { color: colors.textInverse }]}>
            Delete
          </Text>
        </Pressable>
      </Animated.View>

      {/* Card content (slides over actions) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedCardStyle}>
          <Pressable
            onLongPress={handleLongPress}
            onPress={onEdit}
            style={[
              styles.card,
              {
                backgroundColor: reminder.isActive ? colors.card : colors.background,
                borderColor: colors.border,
                opacity: reminder.isActive ? 1 : 0.6,
              },
            ]}
          >
            <View
              style={[
                styles.stripe,
                {
                  backgroundColor: reminder.isActive ? colors.primary : colors.border,
                },
              ]}
            />
            <View style={styles.content}>
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    styles.name,
                    {
                      color: reminder.isActive
                        ? colors.textPrimary
                        : colors.textTertiary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {reminder.name}
                </Text>
                <Switch
                  value={reminder.isActive}
                  onValueChange={onToggle}
                  trackColor={{ false: colors.divider, true: colors.primary }}
                />
              </View>

              <Text
                style={[styles.drugs, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {drugNames}
                {moreCount > 0 ? ` +${moreCount} more` : ""}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <TimeDisplay hour={reminder.hour} minute={reminder.minute} />
                  <Text style={[styles.dot, { color: colors.textTertiary }]}>
                    ·
                  </Text>
                  <Text style={[styles.days, { color: colors.textTertiary }]}>
                    {frequency === "daily" ? "Every day" : dayAbbr}
                  </Text>
                </View>
                <FrequencyBadge type={frequency} />
              </View>

              {hasLowStock && (
                <View
                  style={[styles.refillBadge, { backgroundColor: colors.dangerLight }]}
                >
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={14}
                    color={colors.danger}
                  />
                  <Text style={[styles.refillText, { color: colors.danger }]}>
                    {" "}
                   Low Stock
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  actionLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  actionRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  actionInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    ...Typography.xs,
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
  cardHeader: {
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
  drugs: {
    ...Typography.sm,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    fontSize: 14,
  },
  days: {
    ...Typography.sm,
  },
  refillBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
    marginTop: Spacing.sm,
  },
  refillText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
});
