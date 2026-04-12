import { View, Text, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ProgressBarProps {
  taken: number;
  total: number;
}

export function ProgressBar({ taken, total }: ProgressBarProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const percent = total === 0 ? 0 : Math.round((taken / total) * 100);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent, widthAnim]);

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Today&apos;s Progress
        </Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {taken} of {total} doses
        </Text>
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.divider },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
              backgroundColor:
                percent === 100
                  ? colors.success
                  : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.sm,
  },
  value: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.full,
  },
});
