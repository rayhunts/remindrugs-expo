import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { useLanguage } from "@/contexts/language-context";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { generateReport, type Report, type DrugReport } from "@/services/report-generator";

type PeriodOption = 7 | 30 | 90;

export default function ReportScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();
  useHeaderStyle();
  const [period, setPeriod] = useState<PeriodOption>(30);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const periodOptions: { value: PeriodOption; label: string }[] = useMemo(
    () => [
      { value: 7, label: t.reports.last7Days },
      { value: 30, label: t.reports.last30Days },
      { value: 90, label: t.reports.last90Days },
    ],
    [t],
  );

  const handleGenerate = useCallback(() => {
    setLoading(true);
    const result = generateReport(period);
    setReport(result);
    setLoading(false);
  }, [period]);

  const handleShare = useCallback(async () => {
    if (!report) return;
    try {
      const text = formatReportAsText(report);
      const file = new File(Paths.cache, `adherence-report-${Date.now()}.txt`);
      file.write(text);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/plain",
          dialogTitle: t.reports.shareReport,
        });
      }
    } catch {
      // Silently fail
    }
  }, [report, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t.reports.title}
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {periodOptions.map((opt) => {
            const selected = period === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPeriod(opt.value)}
                style={[
                  styles.periodOption,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodLabel,
                    { color: selected ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Generate Button */}
        <Pressable
          onPress={handleGenerate}
          disabled={loading}
          style={[styles.generateButton, { backgroundColor: colors.primary }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.textInverse} />
          )}
          <Text style={[styles.generateLabel, { color: colors.textInverse }]}>
            {t.reports.generateReport}
          </Text>
        </Pressable>

        {report && (
          <>
            {/* Medication List */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="pill" size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t.reports.medications}
                </Text>
              </View>
              {report.medications.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  {t.reports.noData}
                </Text>
              ) : (
                report.medications.map((med) => (
                  <MedicationRow key={med.id} med={med} colors={colors} />
                ))
              )}
            </View>

            {/* Adherence Summary */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chart-bar" size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t.reports.adherenceSummary}
                </Text>
              </View>
              <View style={styles.summaryGrid}>
                <SummaryCell label={t.reports.adherenceSummary.split(" ")[0]} value={`${report.adherenceSummary.rate}%`} color={colors.primary} colors={colors} />
                <SummaryCell label={t.reports.taken} value={String(report.adherenceSummary.taken)} color={colors.success} colors={colors} />
                <SummaryCell label={t.reports.missed} value={String(report.adherenceSummary.missed)} color={colors.danger} colors={colors} />
                <SummaryCell label={t.reports.skipped} value={String(report.adherenceSummary.skipped)} color={colors.warning} colors={colors} />
              </View>
            </View>

            {/* Streak Info */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="fire" size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t.reports.streakInfo}
                </Text>
              </View>
              <View style={styles.streakRow}>
                <View style={styles.streakItem}>
                  <Text style={[styles.streakValue, { color: colors.success }]}>
                    {report.streakInfo.current}
                  </Text>
                  <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                    {t.common.streak}
                  </Text>
                </View>
                <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
                <View style={styles.streakItem}>
                  <Text style={[styles.streakValue, { color: colors.info }]}>
                    {report.streakInfo.best}
                  </Text>
                  <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                    {t.common.bestStreak}
                  </Text>
                </View>
              </View>
            </View>

            {/* Daily Breakdown */}
            {report.dailyBreakdown.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="calendar-text" size={18} color={colors.textSecondary} />
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {t.reports.dailyBreakdown}
                  </Text>
                </View>
                <View style={styles.breakdownHeader}>
                  <Text style={[styles.breakdownHeaderText, { color: colors.textTertiary }]}>Date</Text>
                  <Text style={[styles.breakdownHeaderText, { color: colors.textTertiary }]}>Status</Text>
                </View>
                {report.dailyBreakdown.slice(-14).map((day) => (
                  <DailyRow key={day.date} day={day} colors={colors} />
                ))}
                {report.dailyBreakdown.length > 14 && (
                  <Text style={[styles.moreText, { color: colors.textTertiary }]}>
                    ... {report.dailyBreakdown.length - 14} more days
                  </Text>
                )}
              </View>
            )}

            {/* Share Button */}
            <Pressable
              onPress={handleShare}
              style={[styles.shareButton, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.primary} />
              <Text style={[styles.shareLabel, { color: colors.primary }]}>
                {t.reports.shareReport}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MedicationRow({ med, colors }: { med: DrugReport; colors: Record<string, any> }) {
  return (
    <View style={styles.medRow}>
      <View style={styles.medInfo}>
        <Text style={[styles.medName, { color: colors.textPrimary }]}>
          {med.name}
        </Text>
        {med.dosage ? (
          <Text style={[styles.medDosage, { color: colors.textTertiary }]}>
            {med.dosage}
          </Text>
        ) : null}
      </View>
      <View style={styles.medStats}>
        <Text style={[styles.medPercent, { color: getAdherenceColor(med.adherencePercent) }]}>
          {med.adherencePercent}%
        </Text>
        <Text style={[styles.medDetail, { color: colors.textTertiary }]}>
          {med.taken}/{med.total}
        </Text>
      </View>
    </View>
  );
}

function SummaryCell({ label, value, color, colors }: { label: string; value: string; color: string; colors: Record<string, any> }) {
  return (
    <View style={[styles.summaryCell, { backgroundColor: colors.background, borderRadius: Radius.md }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function DailyRow({ day, colors }: { day: { date: string; taken: number; missed: number; total: number }; colors: Record<string, any> }) {
  const pct = day.total === 0 ? -1 : Math.round((day.taken / day.total) * 100);
  return (
    <View style={styles.dailyRow}>
      <Text style={[styles.dailyDate, { color: colors.textPrimary }]}>
        {day.date.slice(5)}
      </Text>
      <View style={[styles.dailyBar, { backgroundColor: colors.divider }]}>
        {pct >= 0 && (
          <View style={[styles.dailyBarFill, {
            backgroundColor: pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger,
            width: `${Math.max(pct, 4)}%`,
            borderRadius: Radius.sm,
          }]} />
        )}
      </View>
      <Text style={[styles.dailyStatus, { color: colors.textTertiary }]}>
        {day.total === 0 ? "--" : `${day.taken}/${day.total}`}
      </Text>
    </View>
  );
}

function getAdherenceColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function formatReportAsText(report: Report): string {
  const lines: string[] = [];
  lines.push("=== ReminDrugs Adherence Report ===");
  lines.push(`Period: ${report.period.start} to ${report.period.end} (${report.period.days} days)`);
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push("");

  lines.push("--- Medications ---");
  for (const med of report.medications) {
    lines.push(`${med.name}${med.dosage ? ` (${med.dosage})` : ""}: ${med.adherencePercent}% (${med.taken}/${med.total})`);
  }
  lines.push("");

  lines.push("--- Adherence Summary ---");
  lines.push(`Rate: ${report.adherenceSummary.rate}%`);
  lines.push(`Taken: ${report.adherenceSummary.taken}`);
  lines.push(`Missed: ${report.adherenceSummary.missed}`);
  lines.push(`Skipped: ${report.adherenceSummary.skipped}`);
  lines.push(`Total: ${report.adherenceSummary.total}`);
  lines.push("");

  lines.push("--- Streak ---");
  lines.push(`Current: ${report.streakInfo.current} days`);
  lines.push(`Best: ${report.streakInfo.best} days`);
  lines.push("");

  lines.push("--- Daily Breakdown ---");
  for (const day of report.dailyBreakdown) {
    if (day.total > 0) {
      lines.push(`${day.date}: ${day.taken}/${day.total} taken`);
    }
  }

  return lines.join("\n");
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  periodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  periodOption: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodLabel: {
    ...Typography.sm,
    fontWeight: Typography.medium,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  generateLabel: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    ...Typography.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: Typography.semibold,
  },
  emptyText: {
    ...Typography.sm,
  },
  medRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    ...Typography.md,
    fontWeight: Typography.medium,
  },
  medDosage: {
    ...Typography.xs,
    marginTop: 1,
  },
  medStats: {
    alignItems: "flex-end",
  },
  medPercent: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  medDetail: {
    ...Typography.xs,
    marginTop: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryCell: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  summaryLabel: {
    ...Typography.xs,
    fontWeight: Typography.medium,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  streakItem: {
    alignItems: "center",
    gap: 2,
  },
  streakValue: {
    ...Typography["2xl"],
    fontWeight: Typography.bold,
  },
  streakLabel: {
    ...Typography.xs,
    fontWeight: Typography.medium,
  },
  streakDivider: {
    width: 1,
    height: 36,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  breakdownHeaderText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs + 1,
    gap: Spacing.sm,
  },
  dailyDate: {
    ...Typography.xs,
    width: 40,
    fontWeight: Typography.medium,
  },
  dailyBar: {
    flex: 1,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0,0,0,0.06)", // overridden inline via colors.divider
    overflow: "hidden",
  },
  dailyBarFill: {
    height: "100%",
  },
  dailyStatus: {
    ...Typography.xs,
    width: 36,
    textAlign: "right",
  },
  moreText: {
    ...Typography.xs,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  shareLabel: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
});
