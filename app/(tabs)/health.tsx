import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function HealthScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Health & Insights
        </Text>
      </View>

      {/* Placeholder: Health data requires native modules */}
      <View style={styles.content}>
        <View
          style={[
            styles.permissionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MaterialCommunityIcons name="heart" size={48} color={colors.heartRate} />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Health Data
          </Text>
          <Text style={[styles.permissionMessage, { color: colors.textSecondary }]}>
            Connect to Apple Health or Google Health Connect to see sleep and heart rate data alongside your medication schedule.
          </Text>
          <Text style={[styles.permissionNote, { color: colors.textTertiary }]}>
            Health integration requires a development build and cannot run in Expo Go.
          </Text>
          <Pressable
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>
              Coming Soon
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoTitleRow}>
            <MaterialCommunityIcons name="watch" size={20} color={colors.textPrimary} />
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
              Smartwatch Support
            </Text>
          </View>
          <Text style={[styles.infoMessage, { color: colors.textSecondary }]}>
            Apple Watch and WearOS support is planned. Your reminders will be available on your wrist.
          </Text>
          <View
            style={[
              styles.watchBadge,
              { backgroundColor: colors.divider },
            ]}
          >
            <View style={[styles.watchDot, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.watchText, { color: colors.textSecondary }]}>
              No Watch Paired
            </Text>
          </View>
        </View>

        <Text style={[styles.privacyNote, { color: colors.textTertiary }]}>
          All health data is read-only and stays on your device. Remindrugs never writes to HealthKit or Health Connect.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  title: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  permissionCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  permissionEmoji: {
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    ...Typography.lg,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
  },
  permissionMessage: {
    ...Typography.base,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionNote: {
    ...Typography.sm,
    textAlign: "center",
    marginBottom: Spacing.lg,
    fontStyle: "italic",
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  permissionButtonText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoMessage: {
    ...Typography.base,
    marginBottom: Spacing.md,
  },
  watchBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignSelf: "flex-start",
  },
  watchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  watchText: {
    ...Typography.sm,
  },
  privacyNote: {
    ...Typography.xs,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
