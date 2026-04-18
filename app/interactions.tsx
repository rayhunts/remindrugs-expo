import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius, Shadow } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDrugs } from "@/hooks/use-drugs";
import { checkInteraction } from "@/services/interaction-checker";
import type { Drug } from "@/types/reminder";
import type { ColorScheme } from "@/constants/colors";

type Severity = "none" | "mild" | "moderate" | "severe";

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  none: { bg: "#F1F5F9", text: "#64748B" },
  mild: { bg: "#FEF3C7", text: "#92400E" },
  moderate: { bg: "#FED7AA", text: "#9A3412" },
  severe: { bg: "#FEE2E2", text: "#991B1B" },
};

function severityLabel(s: Severity): string {
  switch (s) {
    case "none":
      return "None";
    case "mild":
      return "Mild";
    case "moderate":
      return "Moderate";
    case "severe":
      return "Severe";
  }
}

function severityIcon(s: Severity): string {
  switch (s) {
    case "severe":
      return "alert-octagon";
    case "moderate":
      return "alert";
    case "mild":
      return "information-outline";
    default:
      return "check-circle-outline";
  }
}

function DrugPicker({
  label,
  drugs,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  drugs: Drug[];
  selected: Drug | null;
  onSelect: (drug: Drug) => void;
  colors: ReturnType<typeof getColors>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.pickerSection}>
      <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        style={[styles.pickerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setOpen(!open)}
      >
        <MaterialCommunityIcons
          name="pill"
          size={18}
          color={selected ? colors.primary : colors.textTertiary}
        />
        <Text
          style={[
            styles.pickerText,
            { color: selected ? colors.textPrimary : colors.textTertiary },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.name : "Select medication..."}
        </Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textTertiary}
        />
      </Pressable>
      {open && (
        <View style={[styles.pickerList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {drugs.length === 0 ? (
            <Text style={[styles.emptyPicker, { color: colors.textTertiary }]}>
              No medications added yet
            </Text>
          ) : (
            drugs.map((drug) => (
              <Pressable
                key={drug.id}
                style={[
                  styles.pickerItem,
                  {
                    backgroundColor:
                      selected?.id === drug.id ? colors.primaryLight : "transparent",
                    borderBottomColor: colors.divider,
                  },
                ]}
                onPress={() => {
                  onSelect(drug);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    {
                      color:
                        selected?.id === drug.id
                          ? colors.primary
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {drug.name}
                </Text>
                <Text style={[styles.pickerItemSub, { color: colors.textTertiary }]}>
                  {drug.dosage} · {drug.form}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function InteractionsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { drugs } = useDrugs();
  const [drug1, setDrug1] = useState<Drug | null>(null);
  const [drug2, setDrug2] = useState<Drug | null>(null);

  const result = useMemo(() => {
    if (!drug1 || !drug2) return null;
    return checkInteraction(drug1.name, drug2.name);
  }, [drug1, drug2]);

  const severityStyle = result
    ? SEVERITY_COLORS[result.severity]
    : SEVERITY_COLORS.none;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Drug Interactions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <DrugPicker
          label="Medication 1"
          drugs={drugs}
          selected={drug1}
          onSelect={setDrug1}
          colors={colors}
        />

        <View style={styles.swapRow}>
          <MaterialCommunityIcons
            name="swap-vertical"
            size={24}
            color={colors.textTertiary}
          />
        </View>

        <DrugPicker
          label="Medication 2"
          drugs={drugs}
          selected={drug2}
          onSelect={setDrug2}
          colors={colors}
        />

        {result && (
          <View
            style={[
              styles.resultCard,
              Shadow.card,
              { backgroundColor: colors.card, borderLeftColor: severityStyle.text, borderLeftWidth: 4 },
            ]}
          >
            <View style={styles.resultHeader}>
              <MaterialCommunityIcons
                name={severityIcon(result.severity) as any}
                size={24}
                color={severityStyle.text}
              />
              <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                Interaction Found
              </Text>
            </View>

            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityStyle.bg },
              ]}
            >
              <Text style={[styles.severityText, { color: severityStyle.text }]}>
                {severityLabel(result.severity)} Severity
              </Text>
            </View>

            <Text style={[styles.resultDrugs, { color: colors.textSecondary }]}>
              {result.drug1} + {result.drug2}
            </Text>

            <Text style={[styles.resultDesc, { color: colors.textPrimary }]}>
              {result.description}
            </Text>

            <View style={[styles.disclaimer, { backgroundColor: colors.warningLight }]}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={scheme === "dark" ? "#FBBF24" : "#92400E"}
              />
              <Text
                style={[
                  styles.disclaimerText,
                  { color: scheme === "dark" ? "#FBBF24" : "#92400E" },
                ]}
              >
                This information is for reference only. Always consult your
                pharmacist or doctor.
              </Text>
            </View>
          </View>
        )}

        {drug1 && drug2 && !result && (
          <View
            style={[
              styles.resultCard,
              Shadow.card,
              { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.resultHeader}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={colors.success}
              />
              <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                No Known Interaction
              </Text>
            </View>
            <Text style={[styles.resultDesc, { color: colors.textSecondary }]}>
              No known interactions found between {drug1.name} and{" "}
              {drug2.name} in our database. This does not guarantee safety.
            </Text>

            <View style={[styles.disclaimer, { backgroundColor: colors.warningLight }]}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={scheme === "dark" ? "#FBBF24" : "#92400E"}
              />
              <Text
                style={[
                  styles.disclaimerText,
                  { color: scheme === "dark" ? "#FBBF24" : "#92400E" },
                ]}
              >
                This information is for reference only. Always consult your
                pharmacist or doctor.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  pickerSection: {
    marginBottom: Spacing.sm,
  },
  pickerLabel: {
    ...Typography.sm,
    fontWeight: Typography.medium,
    marginBottom: Spacing.xs,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  pickerText: {
    ...Typography.base,
    flex: 1,
  },
  pickerList: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    maxHeight: 200,
    overflow: "hidden",
  },
  pickerItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    ...Typography.base,
    fontWeight: Typography.medium,
  },
  pickerItemSub: {
    ...Typography.xs,
    marginTop: 2,
  },
  emptyPicker: {
    ...Typography.sm,
    padding: Spacing.md,
    textAlign: "center",
  },
  swapRow: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  resultCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  severityText: {
    ...Typography.xs,
    fontWeight: Typography.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultDrugs: {
    ...Typography.sm,
    fontWeight: Typography.medium,
  },
  resultDesc: {
    ...Typography.sm,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  disclaimerText: {
    ...Typography.xs,
    flex: 1,
    lineHeight: 16,
  },
});
