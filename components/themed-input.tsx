import { useState, useCallback } from "react";
import { TextInput, StyleSheet } from "react-native";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ThemedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  accessibilityLabel?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  style?: object;
  multiline?: boolean;
}

export function ThemedInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  accessibilityLabel,
  keyboardType = "default",
  style,
  multiline = false,
}: ThemedInputProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  return (
    <TextInput
      style={[
        styles.input,
        {
          color: colors.textPrimary,
          backgroundColor: colors.card,
          borderColor: focused ? colors.primary : colors.border,
        },
        style,
      ]}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor ?? colors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      accessibilityLabel={accessibilityLabel}
      keyboardType={keyboardType}
      multiline={multiline}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.base,
  },
});
