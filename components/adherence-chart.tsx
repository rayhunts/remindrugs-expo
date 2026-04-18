import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { CartesianChart, Line, Bar } from "victory-native";
import { getColors } from "@/constants/colors";
import { Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { AdherenceLog } from "@/types/adherence";
import { toDateString } from "@/utils/date-helpers";

type TimeRange = "week" | "month" | "all";

interface AdherenceChartProps {
  logs: AdherenceLog[];
  range: TimeRange;
}

interface ChartDatum {
  label: string;
  index: number;
  adherence: number;
  [key: string]: unknown;
}

function buildData(logs: AdherenceLog[], range: TimeRange): ChartDatum[] {
  const now = new Date();
  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const points: ChartDatum[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = toDateString(d);
    const dayLogs = logs.filter((l) => l.date === dateStr);
    const taken = dayLogs.filter((l) => l.status === "taken").length;
    const total = dayLogs.length;
    const dayNum = d.getDate();
    const monthAbbr = d.toLocaleDateString(undefined, { month: "short" });
    points.push({
      label: range === "week" ? String(dayNum) : `${monthAbbr} ${dayNum}`,
      index: days - 1 - i,
      adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
    });
  }
  return points;
}

export default function AdherenceChart({ logs, range }: AdherenceChartProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const data = useMemo(() => buildData(logs, range), [logs, range]);
  const isLine = range === "all";

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <CartesianChart
        data={data}
        xKey="index"
        yKeys={["adherence"]}
        domain={{ y: [0, 100] }}
        padding={4}
        domainPadding={{ left: 20, right: 20, top: 10 }}
        axisOptions={{
          tickCount: { x: Math.min(data.length, 7), y: 5 },
          formatXLabel: (val) => {
            const idx = Math.round(val as number);
            return data[idx]?.label ?? "";
          },
          formatYLabel: (val) => `${val}%`,
          labelColor: colors.textTertiary,
          lineColor: { grid: { x: "transparent", y: colors.divider }, frame: "transparent" },
          lineWidth: { grid: { x: 0, y: 0.5 }, frame: 0 },
        }}
      >
        {({ points, chartBounds }) =>
          isLine ? (
            <Line
              points={points.adherence}
              color={colors.chart.teal}
              strokeWidth={2.5}
              curveType="natural"
              animate={{ type: "timing", duration: 300 }}
            />
          ) : (
            <Bar
              points={points.adherence}
              chartBounds={chartBounds}
              color={colors.chart.teal}
              innerPadding={0.2}
              roundedCorners={{ topLeft: 4, topRight: 4 }}
              animate={{ type: "timing", duration: 300 }}
            />
          )
        }
      </CartesianChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: Radius.lg,
  },
});
