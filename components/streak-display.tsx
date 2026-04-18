import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";

interface StreakDisplayProps {
  currentStreak: number;
  bestStreak: number;
  averageStreak: number;
}

export default function StreakDisplay({ currentStreak, bestStreak, averageStreak }: StreakDisplayProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={[styles.streakCard, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
        <View style={styles.streakIconRow}>
          <MaterialCommunityIcons name="fire" size={24} color={colors.warning} />
          <Text style={[styles.streakValue, { color: colors.warning }]}>{currentStreak}</Text>
        </View>
        <Text style={[styles.streakLabel, { color: colors.warning }]}>{t.common.streak}</Text>
      </View>
      <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.streakIconRow}>
          <MaterialCommunityIcons name="trophy" size={18} color={colors.chart.amber} />
          <Text style={[styles.streakValueSm, { color: colors.textPrimary }]}>{bestStreak}</Text>
        </View>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{t.common.bestStreak}</Text>
      </View>
      <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.streakIconRow}>
          <MaterialCommunityIcons name="chart-line" size={18} color={colors.chart.teal} />
          <Text style={[styles.streakValueSm, { color: colors.textPrimary }]}>{averageStreak}</Text>
        </View>
        <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Avg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  streakCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
  },
  streakIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakValue: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  streakValueSm: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  streakLabel: {
    ...Typography.xs,
    marginTop: 4,
  },
});
