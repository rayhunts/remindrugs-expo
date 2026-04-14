import { View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { Spacing, Radius } from "@/constants/spacing";

interface SkeletonCardProps {
  style?: object;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
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
    <View style={[styles.card, style]}>
      <View style={[styles.stripe, { backgroundColor: "#E5E7EB" }]} />
      <View style={styles.content}>
        {/* Title skeleton */}
        <Animated.View
          style={[styles.skeletonLine, styles.titleLine, { opacity }]}
        />
        {/* Drug chips skeleton */}
        <View style={styles.chipRow}>
          <Animated.View
            style={[styles.skeletonChip, { opacity }]}
          />
          <Animated.View
            style={[styles.skeletonChip, { opacity }]}
          />
        </View>
        {/* Meta row skeleton */}
        <Animated.View
          style={[styles.skeletonLine, styles.metaLine, { opacity }]}
        />
        {/* Button skeleton */}
        <Animated.View
          style={[styles.skeletonButton, { opacity }]}
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
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: Spacing.md,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#E5E7EB",
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
    backgroundColor: "#E5E7EB",
    borderRadius: Radius.full,
  },
  metaLine: {
    width: "45%",
    marginBottom: Spacing.md,
  },
  skeletonButton: {
    width: "100%",
    height: 36,
    backgroundColor: "#E5E7EB",
    borderRadius: Radius.md,
  },
});
