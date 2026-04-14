import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHeaderStyle } from "@/hooks/use-header-style";
import { useDrugs } from "@/hooks/use-drugs";
import { formatTime } from "@/utils/date-helpers";
import type { Drug, DrugForm, Reminder } from "@/types/reminder";

const DRUG_FORMS: { label: string; icon: string; value: DrugForm }[] = [
  { label: "Tablet", icon: "pill", value: "tablet" },
  { label: "Capsule", icon: "medical-bag", value: "capsule" },
  { label: "Liquid", icon: "water", value: "liquid" },
  { label: "Injection", icon: "needle", value: "injection" },
  { label: "Patch", icon: "bandage", value: "patch" },
  { label: "Inhaler", icon: "lungs", value: "inhaler" },
  { label: "Drops", icon: "eye-outline", value: "drops" },
];

const PILL_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
];

export default function EditDrugScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateDrug, deleteDrug, getRemindersFor } = useDrugs();
  useHeaderStyle();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [form, setForm] = useState<DrugForm>("tablet");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [currentStock, setCurrentStock] = useState<string>("");
  const [stockThreshold, setStockThreshold] = useState<string>("");
  const [linkedReminders, setLinkedReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!id) return;
    const drug = getById(id);
    if (!drug) {
      Alert.alert("Not found", "This medication doesn't exist.");
      router.back();
      return;
    }
    setName(drug.name);
    setDosage(drug.dosage);
    setForm(drug.form);
    setQuantity(drug.quantity);
    setNotes(drug.notes ?? "");
    setColor(drug.color);
    setCurrentStock(drug.currentStock !== undefined ? String(drug.currentStock) : "");
    setStockThreshold(drug.stockThreshold !== undefined ? String(drug.stockThreshold) : "");
    setLinkedReminders(getRemindersFor(drug.id));
    setLoading(false);
  }, [id, getById, getRemindersFor, router]);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSave = useCallback(() => {
    if (!id || !isValid) return;

    const updated: Drug = {
      id,
      name: name.trim(),
      dosage: dosage.trim(),
      form,
      quantity,
      notes: notes || undefined,
      color,
      currentStock: currentStock ? parseInt(currentStock, 10) : undefined,
      stockThreshold: stockThreshold ? parseInt(stockThreshold, 10) : undefined,
    };

    updateDrug(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [id, name, dosage, form, quantity, notes, color, currentStock, stockThreshold, isValid, updateDrug, router]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert(
      "Delete Medication",
      `Delete "${name}"? This will also remove it from all reminders.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteDrug(id);
            router.back();
          },
        },
      ],
    );
  }, [id, name, deleteDrug, router]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit Medication", headerBackTitle: "Back" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="Medication name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Dosage + Quantity */}
          <View style={styles.section}>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="Dosage (e.g. 500mg)"
                placeholderTextColor={colors.textTertiary}
                value={dosage}
                onChangeText={setDosage}
              />
              <TextInput
                style={[styles.input, styles.qtyInput, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="Qty"
                placeholderTextColor={colors.textTertiary}
                value={quantity > 0 ? String(quantity) : ""}
                onChangeText={(text) => {
                  const qty = parseInt(text, 10);
                  if (!isNaN(qty) && qty > 0) setQuantity(qty);
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Form */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FORM</Text>
            <View style={styles.formRow}>
              {DRUG_FORMS.map((f) => {
                const selected = form === f.value;
                return (
                  <Pressable
                    key={f.value}
                    onPress={() => setForm(f.value)}
                    style={[
                      styles.formChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.background,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.formChipContent}>
                      <MaterialCommunityIcons
                        name={f.icon as any}
                        size={14}
                        color={selected ? colors.textInverse : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.formChipText,
                          { color: selected ? colors.textInverse : colors.textSecondary },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTES</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="Notes (optional, e.g. take with food)"
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COLOR</Text>
            <View style={styles.colorRow}>
              {PILL_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setColor(selected ? undefined : c)}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: c,
                        borderColor: selected ? colors.textPrimary : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <View style={[styles.colorDotInner, { borderColor: colors.card }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Stock Tracking */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STOCK TRACKING</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="Pills remaining"
                placeholderTextColor={colors.textTertiary}
                value={currentStock}
                onChangeText={setCurrentStock}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.flex1, { color: colors.textPrimary, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="Alert at"
                placeholderTextColor={colors.textTertiary}
                value={stockThreshold}
                onChangeText={setStockThreshold}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Linked Reminders */}
          {linkedReminders.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                USED IN REMINDERS
              </Text>
              {linkedReminders.map((r) => (
                <View
                  key={r.id}
                  style={[styles.reminderItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <MaterialCommunityIcons name="bell-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.reminderName, { color: colors.textPrimary }]}>{r.name}</Text>
                  <Text style={[styles.reminderTime, { color: colors.textTertiary }]}>
                    {formatTime(r.hour, r.minute)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            style={[styles.saveButton, { backgroundColor: isValid ? colors.primary : colors.divider }]}
          >
            <Text style={[styles.saveText, { color: isValid ? colors.textInverse : colors.textTertiary }]}>
              Save Changes
            </Text>
          </Pressable>

          {/* Delete */}
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Medication</Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { marginBottom: Spacing.lg },
  sectionLabel: {
    ...Typography.xs,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.base,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex1: { flex: 1 },
  qtyInput: { width: 70, flex: undefined },
  formRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  formChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  formChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  formChipText: { ...Typography.xs },
  colorRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reminderName: {
    ...Typography.sm,
    fontWeight: Typography.medium,
    flex: 1,
  },
  reminderTime: {
    ...Typography.sm,
    color: undefined,
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  deleteButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  deleteText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  bottomSpacer: { height: 100 },
});
