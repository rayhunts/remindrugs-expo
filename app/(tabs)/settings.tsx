import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme, type ThemePreference } from "@/contexts/theme-context";
import { hasNotificationPermission } from "@/services/notification-service";
import {
  clearAllData,
  exportAllData,
} from "@/services/database";
import { setSetting } from "@/services/settings-service";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "theme-light-dark" },
  { value: "light", label: "Light", icon: "white-balance-sunny" },
  { value: "dark", label: "Dark", icon: "moon-waning-crescent" },
];

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { themePreference, setThemePreference } = useTheme();
  const [notifEnabled, setNotifEnabled] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    hasNotificationPermission().then(setNotifEnabled);
  }, []);

  const handleExportData = useCallback(async () => {
    setExporting(true);
    try {
      const data = exportAllData();
      const json = JSON.stringify(data, null, 2);
      const file = new File(Paths.cache, `remindrugs-backup-${Date.now()}.json`);
      file.write(json);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export Remindrugs Data",
        });
      }
    } catch (error) {
      Alert.alert("Export Failed", "Could not export your data.");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleClearData = useCallback(() => {
    Alert.alert(
      "Clear All Data",
      "This will delete all reminders and adherence logs. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: () => {
            clearAllData();
            setSetting("onboarded", "false");
            Alert.alert("Data Cleared", "All data has been deleted.");
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Settings
          </Text>
        </View>

        {/* Notifications */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Notifications
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={styles.row}
            accessibilityLabel="Open notification settings"
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={colors.textPrimary}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  Notifications
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textTertiary }]}>
                  {notifEnabled === null
                    ? "Checking..."
                    : notifEnabled
                      ? "Enabled"
                      : "Disabled"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>

        {/* Appearance */}
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
                    name={option.icon as any}
                    size={22}
                    color={
                      selected
                        ? colors.textInverse
                        : colors.textSecondary
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

        {/* Data */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Data
          </Text>
          <Pressable
            onPress={handleExportData}
            disabled={exporting}
            style={styles.row}
            accessibilityLabel="Export data"
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="download-outline"
                size={22}
                color={colors.textPrimary}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  Export Data
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textTertiary }]}>
                  Save reminders and logs as JSON
                </Text>
              </View>
            </View>
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={colors.textTertiary}
              />
            )}
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={handleClearData}
            style={styles.row}
            accessibilityLabel="Clear all data"
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={22}
                color={colors.danger}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.danger }]}>
                  Clear All Data
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textTertiary }]}>
                  Delete reminders and logs
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>

        {/* About */}
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
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
            All data stored locally on your device. Remindrugs never sends
            your information to any external server.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.xl,
    fontWeight: Typography.bold,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    ...Typography.md,
    fontWeight: Typography.medium,
  },
  rowSubtext: {
    ...Typography.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
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
  privacyNote: {
    ...Typography.sm,
  },
});
