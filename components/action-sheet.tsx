import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useEffect, useCallback, useRef } from "react";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";

export interface ActionSheetOption {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  options: ActionSheetOption[];
  onCancel: () => void;
}

export function ActionSheet({ options, onCancel }: ActionSheetProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    sheetTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
  }, [overlayOpacity, sheetTranslateY]);

  const dismiss = useCallback(() => {
    "worklet";
    overlayOpacity.value = withTiming(0, { duration: 150 });
    sheetTranslateY.value = withTiming(300, { duration: 200, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(onCancelRef.current)();
    });
  }, [overlayOpacity, sheetTranslateY]);

  const handleCancel = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleOption = useCallback(
    (option: ActionSheetOption) => {
      option.onPress();
      dismiss();
    },
    [dismiss],
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.overlay, overlayAnimatedStyle]}
      onStartShouldSetResponder={() => true}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleCancel}
        accessibilityLabel="Close action sheet"
      />
      <Animated.View
        style={[styles.sheet, sheetAnimatedStyle, { backgroundColor: colors.card }]}
        onStartShouldSetResponder={() => true}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Options */}
        {options.map((option, index) => (
          <Pressable
            key={index}
            onPress={() => handleOption(option)}
            style={({ pressed }) => [
              styles.option,
              index < options.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityLabel={option.label}
          >
            <MaterialCommunityIcons
              name={option.icon as any}
              size={22}
              color={option.destructive ? colors.danger : colors.textPrimary}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: option.destructive ? colors.danger : colors.textPrimary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}

        {/* Cancel */}
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            {t.common.cancel}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  optionLabel: {
    ...Typography.md,
    fontWeight: Typography.medium,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  cancelText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
});
