import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, Modal, View, StyleSheet } from "react-native";
import { useState, useCallback } from "react";
import { Colors, getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TimePickerFieldProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export function TimePickerField({
  hour,
  minute,
  onChange,
}: TimePickerFieldProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(
    new Date(2000, 0, 1, hour, minute),
  );

  const label = `${hour % 12 || 12}:${minute.toString().padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;

  const handleChange = useCallback(
    (_event: unknown, date?: Date) => {
      setShow(Platform.OS === "ios");
      if (date) {
        setTempDate(date);
        onChange(date.getHours(), date.getMinutes());
      }
    },
    [onChange],
  );

  const handlePress = useCallback(() => {
    setTempDate(new Date(2000, 0, 1, hour, minute));
    setShow(true);
  }, [hour, minute]);

  return (
    <View>
      <Pressable
        onPress={handlePress}
        style={[styles.button, { borderColor: colors.border, backgroundColor: colors.card }]}
        accessibilityLabel={`Select time, currently ${label}`}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Time
        </Text>
        <Text style={[styles.time, { color: colors.textPrimary }]}>
          {label}
        </Text>
      </Pressable>

      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleChange}
        />
      )}

      {Platform.OS === "ios" && show && (
        <Modal transparent animationType="fade" visible={show}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShow(false)}
          >
            <View
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  label: {
    ...Typography.sm,
    marginBottom: Spacing.xs,
  },
  time: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
});
