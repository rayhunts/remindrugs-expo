import { Text, StyleSheet } from "react-native";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatTime } from "@/utils/date-helpers";

interface TimeDisplayProps {
  hour: number;
  minute: number;
}

export function TimeDisplay({ hour, minute }: TimeDisplayProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <Text style={[styles.time, { color: colors.textPrimary }]}>
      {formatTime(hour, minute)}
    </Text>
  );
}

const styles = StyleSheet.create({
  time: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
});
