import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import type { AdherenceLog } from "@/types/adherence";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Shadow, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDrugs } from "@/hooks/use-drugs";
import { MedicationCard } from "@/components/medication-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { EmptyState } from "@/components/empty-state";
import { getRemindersForDrug, getLogsForDrug } from "@/services/database";
import type { Drug, Reminder, DrugForm } from "@/types/reminder";
import { useLanguage } from "@/contexts/language-context";

const FORM_FILTERS: { value: DrugForm | "all"; icon: string }[] = [
  { value: "all", icon: "filter-variant" },
  { value: "tablet", icon: "pill" },
  { value: "capsule", icon: "medical-bag" },
  { value: "liquid", icon: "water" },
  { value: "injection", icon: "needle" },
  { value: "other", icon: "dots-horizontal" },
];

type MedListItem =
  | { type: "header"; title: string; id: string }
  | { type: "med"; drug: Drug; reminders: Reminder[]; logs: AdherenceLog[]; id: string };

export default function MedicationsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { drugs, loading, refreshDrugs } = useDrugs();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formFilter, setFormFilter] = useState<DrugForm | "all">("all");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshDrugs();
    setRefreshing(false);
  }, [refreshDrugs]);

  const filteredDrugs = useMemo(() => {
    let result = drugs;
    if (formFilter !== "all") {
      result = result.filter((d) => d.form === formFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.dosage.toLowerCase().includes(q) ||
          d.form.toLowerCase().includes(q),
      );
    }
    return result;
  }, [drugs, formFilter, searchQuery]);

  const listItems = useMemo((): MedListItem[] => {
    const items: MedListItem[] = [];
    if (filteredDrugs.length > 0) {
      items.push({
        type: "header",
        title: `${t.medications.allMedications} · ${filteredDrugs.length}`,
        id: "h-all",
      });
      filteredDrugs.forEach((drug) => {
        const refs = getRemindersForDrug(drug.id);
        const logs = getLogsForDrug(drug.id);
        items.push({ type: "med", drug, reminders: refs, logs, id: drug.id });
      });
    }
    return items;
  }, [filteredDrugs]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t.medications.title}
          </Text>
        </View>
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t.medications.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {drugs.length} {drugs.length === 1 ? t.common.dose : t.common.doses}
          </Text>
        </View>
        {drugs.length >= 2 && (
          <Pressable
            onPress={() => router.push("/interactions")}
            style={[styles.headerButton, { backgroundColor: colors.primaryLight }]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="shield-alert-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchInputWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.textTertiary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t.common.notFound}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FORM_FILTERS.map((f) => {
          const active = formFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setFormFilter(f.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={f.icon as any}
                size={16}
                color={active ? colors.textInverse : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterText,
                  {
                    color: active ? colors.textInverse : colors.textSecondary,
                  },
                ]}
              >
                {f.value === "all" ? t.common.all : f.value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlashList
        data={listItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="pill"
            title={
              searchQuery || formFilter !== "all"
                ? t.common.notFound
                : t.medications.noMedications
            }
            message={
              searchQuery || formFilter !== "all"
                ? t.common.clear
                : t.medications.noMedicationsMessage
            }
            buttonLabel={
              searchQuery || formFilter !== "all"
                ? undefined
                : t.medications.addMedication
            }
            onPress={
              searchQuery || formFilter !== "all"
                ? undefined
                : () => router.push("/add-drug")
            }
          />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                {item.title}
              </Text>
            );
          }
          return (
            <MedicationCard
              drug={item.drug}
              reminders={item.reminders}
              adherenceLogs={item.logs}
              onPress={() => router.push(`/edit-drug/${item.drug.id}`)}
            />
          );
        }}
        contentContainerStyle={styles.list}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/add-drug");
        }}
        style={[styles.fab, Shadow.fab, { backgroundColor: colors.primary }]}
        accessibilityLabel={t.medications.addNewMedicationA11y}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  subtitle: {
    ...Typography.sm,
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  filterText: {
    ...Typography.xs,
    fontWeight: Typography.medium,
    textTransform: "capitalize",
  },
  sectionHeader: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  list: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
