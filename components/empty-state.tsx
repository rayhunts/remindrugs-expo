import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  buttonLabel?: string;
  onPress?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  buttonLabel,
  onPress,
}: EmptyStateProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={48}
        color={colors.textTertiary}
      />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {buttonLabel && onPress && (
        <Pressable
          onPress={onPress}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            {buttonLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    paddingTop: Spacing["2xl"],
  },
  icon: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.lg,
    fontWeight: Typography.bold,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  message: {
    ...Typography.base,
    textAlign: "center",
    marginBottom: Spacing.lg,
    maxWidth: 260,
  },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  buttonText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
});
