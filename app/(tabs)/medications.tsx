import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Shadow } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDrugs } from "@/hooks/use-drugs";
import { MedicationCard } from "@/components/medication-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { EmptyState } from "@/components/empty-state";
import { getRemindersForDrug } from "@/services/database";
import type { Drug, Reminder } from "@/types/reminder";
import { useLanguage } from "@/contexts/language-context";

type MedListItem =
  | { type: "header"; title: string; id: string }
  | { type: "med"; drug: Drug; reminders: Reminder[]; id: string };

export default function MedicationsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { drugs, loading, refreshDrugs } = useDrugs();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshDrugs();
    setRefreshing(false);
  }, [refreshDrugs]);

  const listItems = useMemo((): MedListItem[] => {
    const items: MedListItem[] = [];
    if (drugs.length > 0) {
      items.push({ type: "header", title: `${t.medications.allMedications} · ${drugs.length}`, id: "h-all" });
      drugs.forEach((drug) => {
        const refs = getRemindersForDrug(drug.id);
        items.push({ type: "med", drug, reminders: refs, id: drug.id });
      });
    }
    return items;
  }, [drugs]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.medications.title}</Text>
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t.medications.title}</Text>
      </View>

      <FlashList
        data={listItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="pill"
            title={t.medications.noMedications}
            message={t.medications.noMedicationsMessage}
            buttonLabel={t.medications.addMedication}
            onPress={() => router.push("/add-drug")}
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
        accessibilityLabel="Add new medication"
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
    ...Typography.lg,
    fontWeight: Typography.bold,
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
