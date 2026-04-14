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

type ToastVariant = "success" | "error" | "info";

interface ToastSnackbarProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: string; colorKey: "success" | "danger" | "info"; lightKey: "successLight" | "dangerLight" | "infoLight" }
> = {
  success: { icon: "check-circle", colorKey: "success", lightKey: "successLight" },
  error: { icon: "alert-circle", colorKey: "danger", lightKey: "dangerLight" },
  info: { icon: "information", colorKey: "info", lightKey: "infoLight" },
};

export function ToastSnackbar({
  visible,
  message,
  variant = "success",
  actionLabel = "Undo",
  onAction,
  onDismiss,
  duration = 4000,
}: ToastSnackbarProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const config = VARIANT_CONFIG[variant];
  const variantColor = colors[config.colorKey];
  const variantBg = colors[config.lightKey];

  const show = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
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
        toValue: 80,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
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
            backgroundColor: variantBg,
            shadowColor: variantColor,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${variantColor}20` }]}>
          <MaterialCommunityIcons
            name={config.icon as any}
            size={18}
            color={variantColor}
          />
        </View>
        <Text
          style={[styles.message, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {message}
        </Text>
        {onAction && (
          <Pressable
            onPress={handleAction}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: `${variantColor}18`, opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.actionText, { color: variantColor }]}>
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
    bottom: 90,
    left: Spacing.md,
    right: Spacing.md,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    ...Typography.sm,
    fontWeight: Typography.medium,
    flex: 1,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  actionText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
});
