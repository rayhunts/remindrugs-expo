import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";

interface PermissionBannerProps {
  onDismiss?: () => void;
}

export function PermissionBanner({ onDismiss }: PermissionBannerProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
        },
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="bell-off-outline"
          size={20}
          color={colors.warning}
        />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.warning }]}>
            {t.components.notificationsDisabled}
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {t.components.notificationsDisabledMessage}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => Linking.openSettings()}
          style={({ pressed }) => [
            styles.fixButton,
            {
              backgroundColor: colors.warning,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel="Fix notification permissions"
        >
          <Text style={[styles.fixText, { color: colors.textInverse }]}>
            {t.components.fixThis}
          </Text>
        </Pressable>
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            style={styles.dismissButton}
            accessibilityLabel="Dismiss notification banner"
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
    marginBottom: 2,
  },
  message: {
    ...Typography.xs,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  fixButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  fixText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  dismissButton: {
    padding: Spacing.xs,
  },
});
