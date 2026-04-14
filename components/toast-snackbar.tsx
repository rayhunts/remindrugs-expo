import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ToastSnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

export function ToastSnackbar({
  visible,
  message,
  actionLabel = "Undo",
  onAction,
  onDismiss,
  duration = 5000,
}: ToastSnackbarProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      hide();
    }, duration);
  }, [duration, translateY, opacity]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
    if (timer.current) clearTimeout(timer.current);
  }, [translateY, opacity, onDismiss]);

  useEffect(() => {
    if (visible) {
      show();
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, show]);

  const handleAction = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    onAction?.();
  }, [onAction]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.inner,
          {
            borderColor: colors.border,
            shadowColor: "#000",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="check-circle"
          size={20}
          color={colors.success}
        />
        <Text
          style={[styles.message, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {message}
        </Text>
        {onAction && (
          <Pressable
            onPress={handleAction}
            style={styles.actionButton}
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    gap: Spacing.sm,
  },
  message: {
    ...Typography.sm,
    fontWeight: Typography.medium,
    flex: 1,
  },
  actionButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  actionText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
});
