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
import { useLanguage, type Locale } from "@/contexts/language-context";
import { hasNotificationPermission } from "@/services/notification-service";
import {
  clearAllData,
  exportAllData,
} from "@/services/database";
import { setSetting } from "@/services/settings-service";
import { ToastSnackbar } from "@/components/toast-snackbar";

const THEME_OPTIONS: { value: ThemePreference; icon: string }[] = [
  { value: "system", icon: "theme-light-dark" },
  { value: "light", icon: "white-balance-sunny" },
  { value: "dark", icon: "moon-waning-crescent" },
];

const LANGUAGE_OPTIONS: { value: Locale; icon: string }[] = [
  { value: "en", icon: "alphabetical" },
  { value: "id", icon: "translate" },
];

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { themePreference, setThemePreference } = useTheme();
  const { t, locale, setLocale } = useLanguage();
  const [notifEnabled, setNotifEnabled] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    variant: "success" | "error" | "info";
  }>({ visible: false, message: "", variant: "success" });

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
          dialogTitle: t.settings.exportData,
        });
      }
    } catch (error) {
      setToast({ visible: true, message: t.settings.couldNotExport, variant: "error" });
    } finally {
      setExporting(false);
    }
  }, [t]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      t.settings.clearAllDataTitle,
      t.settings.clearAllDataMessage,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.settings.clearEverything,
          style: "destructive",
          onPress: () => {
            clearAllData();
            setSetting("onboarded", "false");
            setToast({ visible: true, message: t.settings.allDataDeleted, variant: "success" });
          },
        },
      ],
    );
  }, [t]);

  const themeLabels = {
    system: t.settings.system,
    light: t.settings.light,
    dark: t.settings.dark,
  };

  const languageLabels: Record<Locale, string> = {
    en: t.settings.english,
    id: t.settings.indonesian,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t.settings.title}
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
            {t.settings.notifications}
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
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
                  {t.settings.notifications}
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textTertiary }]}>
                  {notifEnabled === null
                    ? t.settings.checking
                    : notifEnabled
                      ? t.settings.enabled
                      : t.settings.disabled}
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
            {t.settings.appearance}
          </Text>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
            {t.settings.theme}
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
                  accessibilityLabel={`${themeLabels[option.value]}${selected ? ", selected" : ""}`}
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
                    {themeLabels[option.value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t.settings.language}
          </Text>
          <View style={styles.themeRow}>
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = locale === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLocale(option.value)}
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
                  accessibilityLabel={`${languageLabels[option.value]}${selected ? ", selected" : ""}`}
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
                    {languageLabels[option.value]}
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
            {t.settings.data}
          </Text>
          <Pressable
            onPress={handleExportData}
            disabled={exporting}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityLabel={t.settings.exportData}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="download-outline"
                size={22}
                color={colors.textPrimary}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  {t.settings.exportData}
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textTertiary }]}>
                  {t.settings.exportDataDescription}
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
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityLabel={t.settings.clearAllData}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={22}
                color={colors.danger}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.danger }]}>
                  {t.settings.clearAllData}
                </Text>
                <Text style={[styles.rowSubtext, { color: colors.textTertiary }]}>
                  {t.settings.clearAllDataDescription}
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
            {t.settings.about}
          </Text>
          <View style={styles.aboutRow}>
            <MaterialCommunityIcons
              name="pill"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.appName, { color: colors.textPrimary }]}>
              ReminDrugs
            </Text>
          </View>
          <Text style={[styles.version, { color: colors.textTertiary }]}>
            Version 1.0.0
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
            {t.settings.privacyNote}
          </Text>
        </View>
      </View>

      <ToastSnackbar
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast({ visible: false, message: "", variant: "success" })}
      />
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
