import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getColors } from "@/constants/colors";

interface SkeletonCardProps {
  style?: object;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={[styles.card, style, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.stripe, { backgroundColor: colors.border }]} />
      <View style={styles.content}>
        {/* Title skeleton */}
        <Animated.View
          style={[styles.skeletonLine, styles.titleLine, { opacity, backgroundColor: colors.divider }]}
        />
        {/* Drug chips skeleton */}
        <View style={styles.chipRow}>
          <Animated.View
            style={[styles.skeletonChip, { opacity, backgroundColor: colors.divider }]}
          />
          <Animated.View
            style={[styles.skeletonChip, { opacity, backgroundColor: colors.divider }]}
          />
        </View>
        {/* Meta row skeleton */}
        <Animated.View
          style={[styles.skeletonLine, styles.metaLine, { opacity, backgroundColor: colors.divider }]}
        />
        {/* Button skeleton */}
        <Animated.View
          style={[styles.skeletonButton, { opacity, backgroundColor: colors.divider }]}
        />
      </View>
    </View>
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
  skeletonLine: {
    height: 16,
    borderRadius: 4,
  },
  titleLine: {
    width: "60%",
    marginBottom: Spacing.sm,
    height: 18,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  skeletonChip: {
    width: 100,
    height: 24,
    borderRadius: Radius.full,
  },
  metaLine: {
    width: "45%",
    marginBottom: Spacing.md,
  },
  skeletonButton: {
    width: "100%",
    height: 36,
    borderRadius: Radius.md,
  },
});
