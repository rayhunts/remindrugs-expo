import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

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

  return (
    <Pressable
      style={styles.overlay}
      onPress={onCancel}
      accessibilityLabel="Close action sheet"
    >
      <View
        style={[styles.sheet, { backgroundColor: colors.card }]}
        onStartShouldSetResponder={() => true}
      >
        {/* Handle */}
        <View
          style={[styles.handle, { backgroundColor: colors.border }]}
        />

        {/* Options */}
        {options.map((option, index) => (
          <Pressable
            key={index}
            onPress={() => {
              option.onPress();
              onCancel();
            }}
            style={[
              styles.option,
              index < options.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
            accessibilityLabel={option.label}
          >
            <MaterialCommunityIcons
              name={option.icon as any}
              size={22}
              color={
                option.destructive ? colors.danger : colors.textPrimary
              }
            />
            <Text
              style={[
                styles.optionLabel,
                {
                  color: option.destructive
                    ? colors.danger
                    : colors.textPrimary,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}

        {/* Cancel */}
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
