import { Fragment, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { toDateString } from "@/utils/date-helpers";
import type { AdherenceLog } from "@/types/adherence";

interface DayData {
  label: string;
  dateStr: string;
  percent: number;
}

interface WeeklyChartProps {
  logs: AdherenceLog[];
  totalRemindersPerDay: number;
}

function getLast7Days(dayAbbr: readonly string[]): DayData[] {
  const days: DayData[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayIndex = d.getDay();
    days.push({
      label: dayAbbr[dayIndex],
      dateStr: toDateString(d),
      percent: 0,
    });
  }
  return days;
}

function getBarColor(percent: number, colors: ReturnType<typeof getColors>): string {
  if (percent === 0) return colors.divider;
  if (percent >= 80) return colors.success;
  if (percent >= 50) return colors.warning;
  return colors.danger;
}

export function WeeklyChart({ logs, totalRemindersPerDay }: WeeklyChartProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    const days = getLast7Days(t.days.abbr);

    for (const day of days) {
      const dayLogs = logs.filter((l) => l.date === day.dateStr);
      const taken = dayLogs.filter((l) => l.status === "taken").length;
      const total = dayLogs.length;
      day.percent = total > 0 ? Math.round((taken / total) * 100) : 0;
    }
    return days;
  }, [logs, t.days.abbr]);

  const chartWidth = 300;
  const chartHeight = 80;
  const barWidth = 24;
  const barGap = (chartWidth - barWidth * 7) / 6;
  const labelY = chartHeight + 14;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        This Week
      </Text>
      <View style={styles.chartWrap}>
        <Svg width={chartWidth} height={chartHeight + 20}>
          {chartData.map((day, i) => {
            const x = i * (barWidth + barGap);
            const barHeight = day.percent === 0 ? 4 : Math.max(4, (day.percent / 100) * chartHeight);
            const y = chartHeight - barHeight;
            const barColor = getBarColor(day.percent, colors);

            return (
              <Fragment key={day.dateStr}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  ry={4}
                  fill={barColor}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={labelY}
                  fontSize={11}
                  fill={colors.textTertiary}
                  textAnchor="middle"
                  fontFamily={Typography.fontFamily as string}
                >
                  {day.label}
                </SvgText>
              </Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  chartWrap: {
    alignItems: "center",
  },
});
