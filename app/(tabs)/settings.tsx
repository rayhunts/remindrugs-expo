import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme, type ThemePreference } from "@/contexts/theme-context";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "theme-light-dark" },
  { value: "light", label: "Light", icon: "white-balance-sunny" },
  { value: "dark", label: "Dark", icon: "moon-waning-crescent" },
];

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { themePreference, setThemePreference } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Settings
        </Text>
      </View>

      <View style={styles.content}>
        {/* Appearance Section */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
            Theme
          </Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const selected = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.background,
                      borderColor: selected
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  accessibilityLabel={`${option.label}${selected ? ", selected" : ""}`}
                  accessibilityRole="radio"
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={22}
                    color={
                      selected ? colors.textInverse : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.themeOptionLabel,
                      {
                        color: selected
                          ? colors.textInverse
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* About Section */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            About
          </Text>
          <View style={styles.aboutRow}>
            <MaterialCommunityIcons
              name="pill"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.appName, { color: colors.textPrimary }]}>
              Remindrugs
            </Text>
          </View>
          <Text style={[styles.version, { color: colors.textTertiary }]}>
            Version 1.0.0
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
            All data stored locally on your device. Remindrugs never sends your information to any external server.
          </Text>
        </View>
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
  sectionCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    ...Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  rowLabel: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
  },
  themeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 72,
  },
  themeOptionLabel: {
    ...Typography.xs,
    fontWeight: Typography.medium,
    marginTop: Spacing.xs,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  appName: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  version: {
    ...Typography.sm,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: Spacing.md,
  },
  privacyNote: {
    ...Typography.sm,
  },
});
