# Separate Drugs from Reminders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the data model so drugs are standalone entities, reminders reference drugs via a junction table, adherence tracking is per-drug, and the Medications tab becomes a deduplicated "medicine cabinet" while Home shows per-reminder cards with per-drug marking.

**Architecture:** Migrate from embedded `drugs` JSON in reminders to a relational schema with `drugs`, `reminder_drugs` junction, and per-drug adherence logs. Add a new `useDrugs` hook and `edit-drug/[id]` route. Redesign ReminderCard to show individual drug checkboxes. Replace SwipeableMedicationCard with a new MedicationCard component that displays unique drugs with stock info and cross-references to reminders.

**Tech Stack:** Expo 55, React Native 0.83, expo-sqlite (sync API), expo-router (file-based), FlashList, react-native-reanimated, react-native-gesture-handler, expo-notifications

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `types/reminder.ts` | Modify | Remove `drugs` from Reminder, keep Drug as standalone type |
| `types/adherence.ts` | Modify | Add `drugId` field to AdherenceLog |
| `services/database.ts` | Modify | New tables, migration, all CRUD functions |
| `services/event-bus.ts` | Modify | Add `drugEvents` bus |
| `hooks/use-drugs.ts` | Create | Drug CRUD hook |
| `hooks/use-reminders.ts` | Modify | Reminder no longer has embedded drugs; load drugs via junction |
| `hooks/use-adherence.ts` | Modify | Per-drug adherence tracking |
| `components/reminder-card.tsx` | Modify | Per-drug check marks, "Mark All" shortcut |
| `components/medication-card.tsx` | Create | New card for Medications tab (per-drug) |
| `components/drug-chip.tsx` | Modify | Add checkable variant |
| `app/(tabs)/index.tsx` | Modify | Per-drug progress counting |
| `app/(tabs)/medications.tsx` | Modify | Deduplicated drug list, new card component |
| `app/(tabs)/calendar.tsx` | Modify | Per-drug adherence display |
| `app/add-reminder.tsx` | Modify | Drug picker from existing drugs + inline add |
| `app/edit-reminder/[id].tsx` | Modify | Same drug picker as add-reminder |
| `app/edit-drug/[id].tsx` | Create | Standalone drug detail/edit page |
| `app/_layout.tsx` | Modify | Add edit-drug route |
| `utils/date-helpers.ts` | Modify | Update calculateStreak for per-drug logs |
| `utils/notification-helpers.ts` | Modify | Update buildNotificationBody to accept drugs separately |
| `services/notification-service.ts` | Modify | Update to work with separated drugs |

---

## Task 1: Update Types

**Files:**
- Modify: `types/reminder.ts`
- Modify: `types/adherence.ts`

- [ ] **Step 1: Update `types/reminder.ts`**

Reminder no longer carries `drugs`. A new `ReminderDrug` junction type is added.

```ts
// types/reminder.ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type FrequencyType = "daily" | "weekly" | "custom";

export type DrugForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "injection"
  | "patch"
  | "inhaler"
  | "drops"
  | "other";

export interface Drug {
  id: string;
  name: string;
  dosage: string;
  form: DrugForm;
  quantity: number;
  notes?: string;
  color?: string;
  currentStock?: number;
  stockThreshold?: number;
}

export interface Reminder {
  id: string;
  name: string;
  hour: number;
  minute: number;
  days: Weekday[];
  isActive: boolean;
  notificationIds: string[];
  startDate?: string;
  endDate?: string;
  createdAt: number;
}

export interface ReminderDrug {
  reminderId: string;
  drugId: string;
}
```

- [ ] **Step 2: Update `types/adherence.ts`**

Add `drugId` field for per-drug tracking.

```ts
// types/adherence.ts
export type DoseStatus = "taken" | "missed" | "skipped";

export interface AdherenceLog {
  id: string;
  reminderId: string;
  drugId: string;
  date: string;
  status: DoseStatus;
  takenAt?: number;
  notes?: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add types/reminder.ts types/adherence.ts
git commit -m "refactor: update types to separate drugs from reminders and add drugId to adherence"
```

---

## Task 2: Database Migration & CRUD

**Files:**
- Modify: `services/database.ts`

- [ ] **Step 1: Add migration and new table creation to `services/database.ts`**

Replace the current `db.execSync` block with migration-aware table creation. The migration reads existing `drugs` JSON from reminders, creates the new `drugs` and `reminder_drugs` tables, and populates them. Existing `adherence_logs` gain a `drug_id` column.

```ts
// services/database.ts — replace the db.execSync block at the top with:

const db = SQLite.openDatabaseSync("remindrugs.db");

db.execSync(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    hour INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    days TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    notification_ids TEXT NOT NULL DEFAULT '[]',
    start_date TEXT,
    end_date TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drugs (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL DEFAULT '',
    form TEXT NOT NULL DEFAULT 'tablet',
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    color TEXT,
    current_stock INTEGER,
    stock_threshold INTEGER
  );

  CREATE TABLE IF NOT EXISTS reminder_drugs (
    reminder_id TEXT NOT NULL,
    drug_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (reminder_id, drug_id),
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
    FOREIGN KEY (drug_id) REFERENCES drugs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS adherence_logs (
    id TEXT PRIMARY KEY NOT NULL,
    reminder_id TEXT NOT NULL,
    drug_id TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    taken_at INTEGER,
    notes TEXT,
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
  );
`);

// ── Migration: v1 → v2 (embedded drugs → relational) ─────────────────────────

function migrateV1ToV2(): void {
  // Check if migration already ran by looking for the old column
  const tableInfo = db.getAllSync<{ name: string }>("PRAGMA table_info(reminders)");
  const hasDrugsColumn = tableInfo.some((col) => col.name === "drugs");

  if (!hasDrugsColumn) return; // Already migrated or fresh install

  // Read all reminders with their embedded drugs JSON
  const rows = db.getAllSync<{
    id: string;
    drugs: string;
  }>("SELECT id, drugs FROM reminders WHERE drugs != '[]'");

  for (const row of rows) {
    const drugs: Array<{
      id: string;
      name: string;
      dosage: string;
      form: string;
      quantity: number;
      notes?: string;
      color?: string;
      currentStock?: number;
      stockThreshold?: number;
    }> = JSON.parse(row.drugs);

    for (let i = 0; i < drugs.length; i++) {
      const d = drugs[i];

      // Insert drug (ignore if already exists from a prior migration run)
      db.runSync(
        `INSERT OR IGNORE INTO drugs (id, name, dosage, form, quantity, notes, color, current_stock, stock_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          d.id,
          d.name,
          d.dosage,
          d.form,
          d.quantity,
          d.notes ?? null,
          d.color ?? null,
          d.currentStock ?? null,
          d.stockThreshold ?? null,
        ],
      );

      // Insert junction
      db.runSync(
        `INSERT OR IGNORE INTO reminder_drugs (reminder_id, drug_id, sort_order) VALUES (?, ?, ?)`,
        [row.id, d.id, i],
      );
    }
  }

  // Migrate adherence_logs: add drug_id column
  const logTableInfo = db.getAllSync<{ name: string }>("PRAGMA table_info(adherence_logs)");
  const logHasDrugId = logTableInfo.some((col) => col.name === "drug_id");

  if (!logHasDrugId) {
    db.execSync("ALTER TABLE adherence_logs ADD COLUMN drug_id TEXT NOT NULL DEFAULT '';");
  }

  // Drop old drugs column from reminders
  db.execSync(`
    CREATE TABLE IF NOT EXISTS reminders_new (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      days TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notification_ids TEXT NOT NULL DEFAULT '[]',
      start_date TEXT,
      end_date TEXT,
      created_at INTEGER NOT NULL
    );
    INSERT INTO reminders_new SELECT id, name, hour, minute, days, is_active, notification_ids, start_date, end_date, created_at FROM reminders;
    DROP TABLE reminders;
    ALTER TABLE reminders_new RENAME TO reminders;
  `);
}

migrateV1ToV2();
```

- [ ] **Step 2: Add Drug CRUD functions**

Add these functions to `services/database.ts` after the existing Reminder CRUD section:

```ts
// ── Drug CRUD ────────────────────────────────────────────────────────────────

export function getAllDrugs(): Drug[] {
  const rows = db.getAllSync<{
    id: string;
    name: string;
    dosage: string;
    form: string;
    quantity: number;
    notes: string | null;
    color: string | null;
    current_stock: number | null;
    stock_threshold: number | null;
  }>("SELECT * FROM drugs ORDER BY name ASC");

  return rows.map(mapDrugRow);
}

export function getDrugById(id: string): Drug | null {
  const row = db.getFirstSync<{
    id: string;
    name: string;
    dosage: string;
    form: string;
    quantity: number;
    notes: string | null;
    color: string | null;
    current_stock: number | null;
    stock_threshold: number | null;
  }>("SELECT * FROM drugs WHERE id = ?", id);

  return row ? mapDrugRow(row) : null;
}

export function insertDrug(drug: Drug): void {
  db.runSync(
    `INSERT OR REPLACE INTO drugs (id, name, dosage, form, quantity, notes, color, current_stock, stock_threshold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      drug.id,
      drug.name,
      drug.dosage,
      drug.form,
      drug.quantity,
      drug.notes ?? null,
      drug.color ?? null,
      drug.currentStock ?? null,
      drug.stockThreshold ?? null,
    ],
  );
}

export function updateDrug(drug: Drug): void {
  db.runSync(
    `UPDATE drugs SET name = ?, dosage = ?, form = ?, quantity = ?, notes = ?, color = ?, current_stock = ?, stock_threshold = ?
     WHERE id = ?`,
    [
      drug.name,
      drug.dosage,
      drug.form,
      drug.quantity,
      drug.notes ?? null,
      drug.color ?? null,
      drug.currentStock ?? null,
      drug.stockThreshold ?? null,
      drug.id,
    ],
  );
}

export function deleteDrug(id: string): void {
  db.runSync("DELETE FROM drugs WHERE id = ?", id);
}

// ── ReminderDrug Junction CRUD ───────────────────────────────────────────────

export function getDrugsForReminder(reminderId: string): Drug[] {
  const rows = db.getAllSync<{
    id: string;
    name: string;
    dosage: string;
    form: string;
    quantity: number;
    notes: string | null;
    color: string | null;
    current_stock: number | null;
    stock_threshold: number | null;
  }>(
    `SELECT d.* FROM drugs d
     JOIN reminder_drugs rd ON d.id = rd.drug_id
     WHERE rd.reminder_id = ?
     ORDER BY rd.sort_order ASC`,
    reminderId,
  );

  return rows.map(mapDrugRow);
}

export function getRemindersForDrug(drugId: string): Reminder[] {
  const rows = db.getAllSync<{
    id: string;
    name: string;
    hour: number;
    minute: number;
    days: string;
    is_active: number;
    notification_ids: string;
    start_date: string | null;
    end_date: string | null;
    created_at: number;
  }>(
    `SELECT r.* FROM reminders r
     JOIN reminder_drugs rd ON r.id = rd.reminder_id
     WHERE rd.drug_id = ?`,
    drugId,
  );

  return rows.map(mapReminderRow);
}

export function setReminderDrugs(reminderId: string, drugIds: string[]): void {
  db.runSync("DELETE FROM reminder_drugs WHERE reminder_id = ?", reminderId);
  for (let i = 0; i < drugIds.length; i++) {
    db.runSync(
      "INSERT INTO reminder_drugs (reminder_id, drug_id, sort_order) VALUES (?, ?, ?)",
      [reminderId, drugIds[i], i],
    );
  }
}
```

- [ ] **Step 3: Update Reminder CRUD to remove drugs**

Update `insertReminder` and `updateReminder` to not include `drugs`. Update `getAllReminders` and `getReminderById` row mapping.

Replace the existing Reminder CRUD functions:

```ts
// ── Reminder CRUD ───────────────────────────────────────────────────────────

export function getAllReminders(): Reminder[] {
  const rows = db.getAllSync<{
    id: string;
    name: string;
    hour: number;
    minute: number;
    days: string;
    is_active: number;
    notification_ids: string;
    start_date: string | null;
    end_date: string | null;
    created_at: number;
  }>("SELECT * FROM reminders ORDER BY created_at DESC");

  return rows.map(mapReminderRow);
}

export function getReminderById(id: string): Reminder | null {
  const row = db.getFirstSync<{
    id: string;
    name: string;
    hour: number;
    minute: number;
    days: string;
    is_active: number;
    notification_ids: string;
    start_date: string | null;
    end_date: string | null;
    created_at: number;
  }>("SELECT * FROM reminders WHERE id = ?", id);

  return row ? mapReminderRow(row) : null;
}

export function insertReminder(reminder: Reminder): void {
  db.runSync(
    `INSERT INTO reminders (id, name, hour, minute, days, is_active, notification_ids, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.name,
      reminder.hour,
      reminder.minute,
      JSON.stringify(reminder.days),
      reminder.isActive ? 1 : 0,
      JSON.stringify(reminder.notificationIds),
      reminder.startDate ?? null,
      reminder.endDate ?? null,
      reminder.createdAt,
    ],
  );
}

export function updateReminder(reminder: Reminder): void {
  db.runSync(
    `UPDATE reminders
     SET name = ?, hour = ?, minute = ?, days = ?,
         is_active = ?, notification_ids = ?, start_date = ?, end_date = ?
     WHERE id = ?`,
    [
      reminder.name,
      reminder.hour,
      reminder.minute,
      JSON.stringify(reminder.days),
      reminder.isActive ? 1 : 0,
      JSON.stringify(reminder.notificationIds),
      reminder.startDate ?? null,
      reminder.endDate ?? null,
      reminder.id,
    ],
  );
}

export function deleteReminder(id: string): void {
  db.runSync("DELETE FROM reminders WHERE id = ?", id);
}

export function toggleReminderActive(id: string, isActive: boolean): void {
  db.runSync(
    "UPDATE reminders SET is_active = ? WHERE id = ?",
    isActive ? 1 : 0,
    id,
  );
}
```

- [ ] **Step 4: Update Adherence CRUD to include drugId**

Replace the adherence CRUD functions:

```ts
// ── Adherence CRUD ──────────────────────────────────────────────────────────

export function logDose(log: AdherenceLog): void {
  db.runSync(
    `INSERT INTO adherence_logs (id, reminder_id, drug_id, date, status, taken_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.reminderId,
      log.drugId,
      log.date,
      log.status,
      log.takenAt ?? null,
      log.notes ?? null,
    ],
  );
}

export function getLogsForDate(date: string): AdherenceLog[] {
  const rows = db.getAllSync<{
    id: string;
    reminder_id: string;
    drug_id: string;
    date: string;
    status: string;
    taken_at: number | null;
    notes: string | null;
  }>("SELECT * FROM adherence_logs WHERE date = ?", date);

  return rows.map(mapAdherenceRow);
}

export function getLogsForRange(startDate: string, endDate: string): AdherenceLog[] {
  const rows = db.getAllSync<{
    id: string;
    reminder_id: string;
    drug_id: string;
    date: string;
    status: string;
    taken_at: number | null;
    notes: string | null;
  }>(
    "SELECT * FROM adherence_logs WHERE date >= ? AND date <= ? ORDER BY date ASC",
    startDate,
    endDate,
  );

  return rows.map(mapAdherenceRow);
}

export function getLogsForReminder(reminderId: string): AdherenceLog[] {
  const rows = db.getAllSync<{
    id: string;
    reminder_id: string;
    drug_id: string;
    date: string;
    status: string;
    taken_at: number | null;
    notes: string | null;
  }>(
    "SELECT * FROM adherence_logs WHERE reminder_id = ? ORDER BY date DESC",
    reminderId,
  );

  return rows.map(mapAdherenceRow);
}

export function getLogsForDrug(drugId: string): AdherenceLog[] {
  const rows = db.getAllSync<{
    id: string;
    reminder_id: string;
    drug_id: string;
    date: string;
    status: string;
    taken_at: number | null;
    notes: string | null;
  }>(
    "SELECT * FROM adherence_logs WHERE drug_id = ? ORDER BY date DESC",
    drugId,
  );

  return rows.map(mapAdherenceRow);
}

export function updateLogStatus(id: string, status: DoseStatus): void {
  db.runSync("UPDATE adherence_logs SET status = ? WHERE id = ?", status, id);
}

export function deleteLog(id: string): void {
  db.runSync("DELETE FROM adherence_logs WHERE id = ?", id);
}

export function deleteLogByReminderAndDate(reminderId: string, date: string): void {
  db.runSync(
    "DELETE FROM adherence_logs WHERE reminder_id = ? AND date = ?",
    reminderId,
    date,
  );
}

export function deleteLogByDrugAndDate(drugId: string, date: string): void {
  db.runSync(
    "DELETE FROM adherence_logs WHERE drug_id = ? AND date = ?",
    drugId,
    date,
  );
}

export function clearAllData(): void {
  db.execSync("DELETE FROM adherence_logs");
  db.execSync("DELETE FROM reminder_drugs");
  db.execSync("DELETE FROM drugs");
  db.execSync("DELETE FROM reminders");
}

export function exportAllData(): { reminders: Reminder[]; drugs: Drug[]; logs: AdherenceLog[] } {
  const reminders = getAllReminders();
  const drugs = getAllDrugs();
  const logs = db
    .getAllSync<{
      id: string;
      reminder_id: string;
      drug_id: string;
      date: string;
      status: string;
      taken_at: number | null;
      notes: string | null;
    }>("SELECT * FROM adherence_logs ORDER BY date DESC")
    .map(mapAdherenceRow);
  return { reminders, drugs, logs };
}
```

- [ ] **Step 5: Update helper row-mappers**

Replace the helper functions at the bottom:

```ts
// ── Helpers ─────────────────────────────────────────────────────────────────

function mapReminderRow(row: {
  id: string;
  name: string;
  hour: number;
  minute: number;
  days: string;
  is_active: number;
  notification_ids: string;
  start_date: string | null;
  end_date: string | null;
  created_at: number;
}): Reminder {
  return {
    id: row.id,
    name: row.name,
    hour: row.hour,
    minute: row.minute,
    days: JSON.parse(row.days) as Reminder["days"],
    isActive: row.is_active === 1,
    notificationIds: JSON.parse(row.notification_ids) as string[],
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    createdAt: row.created_at,
  };
}

function mapDrugRow(row: {
  id: string;
  name: string;
  dosage: string;
  form: string;
  quantity: number;
  notes: string | null;
  color: string | null;
  current_stock: number | null;
  stock_threshold: number | null;
}): Drug {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    form: row.form as Drug["form"],
    quantity: row.quantity,
    notes: row.notes ?? undefined,
    color: row.color ?? undefined,
    currentStock: row.current_stock ?? undefined,
    stockThreshold: row.stock_threshold ?? undefined,
  };
}

function mapAdherenceRow(row: {
  id: string;
  reminder_id: string;
  drug_id: string;
  date: string;
  status: string;
  taken_at: number | null;
  notes: string | null;
}): AdherenceLog {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    drugId: row.drug_id,
    date: row.date,
    status: row.status as DoseStatus,
    takenAt: row.taken_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}
```

- [ ] **Step 6: Add the Drug import at the top of `database.ts`**

The top of the file should import `Drug` in addition to existing imports:

```ts
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Drug, Reminder } from "@/types/reminder";
```

- [ ] **Step 7: Commit**

```bash
git add services/database.ts
git commit -m "refactor: normalize database with drugs table, junction table, and migration"
```

---

## Task 3: EventBus — Add drugEvents

**Files:**
- Modify: `services/event-bus.ts`

- [ ] **Step 1: Add drugEvents singleton**

```ts
// services/event-bus.ts
type Listener = () => void;

class EventBus {
  private listeners = new Set<Listener>();

  emit() {
    for (const fn of this.listeners) fn();
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const reminderEvents = new EventBus();
export const drugEvents = new EventBus();
export const adherenceEvents = new EventBus();
```

- [ ] **Step 2: Commit**

```bash
git add services/event-bus.ts
git commit -m "feat: add drugEvents to event bus for drug state reactivity"
```

---

## Task 4: useDrugs Hook

**Files:**
- Create: `hooks/use-drugs.ts`

- [ ] **Step 1: Create `hooks/use-drugs.ts`**

```ts
// hooks/use-drugs.ts
import { useCallback, useEffect, useState } from "react";
import {
  getAllDrugs,
  getDrugById,
  insertDrug,
  updateDrug as dbUpdateDrug,
  deleteDrug as dbDeleteDrug,
  getRemindersForDrug,
} from "@/services/database";
import { drugEvents } from "@/services/event-bus";
import type { Drug, Reminder } from "@/types/reminder";
import { generateId } from "@/utils/date-helpers";

export function useDrugs() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrugs = useCallback(() => {
    try {
      const all = getAllDrugs();
      setDrugs(all);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrugs();
    return drugEvents.on(loadDrugs);
  }, [loadDrugs]);

  const addDrug = useCallback(
    (data: Omit<Drug, "id">): Drug => {
      const drug: Drug = { ...data, id: generateId() };
      insertDrug(drug);
      drugEvents.emit();
      return drug;
    },
    [],
  );

  const updateDrug = useCallback(
    (drug: Drug) => {
      dbUpdateDrug(drug);
      drugEvents.emit();
    },
    [],
  );

  const removeDrug = useCallback(
    (id: string) => {
      dbDeleteDrug(id);
      drugEvents.emit();
    },
    [],
  );

  const getById = useCallback((id: string) => {
    return getDrugById(id);
  }, []);

  const getRemindersFor = useCallback((drugId: string): Reminder[] => {
    return getRemindersForDrug(drugId);
  }, []);

  return {
    drugs,
    loading,
    addDrug,
    updateDrug,
    deleteDrug: removeDrug,
    getById,
    getRemindersFor: getRemindersFor,
    refreshDrugs: loadDrugs,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-drugs.ts
git commit -m "feat: add useDrugs hook for drug CRUD operations"
```

---

## Task 5: Update useReminders Hook

**Files:**
- Modify: `hooks/use-reminders.ts`

- [ ] **Step 1: Update `hooks/use-reminders.ts`**

The hook now loads drugs for each reminder via the junction table. `addReminder` accepts drug IDs separately and calls `setReminderDrugs`.

```ts
// hooks/use-reminders.ts
import { useCallback, useEffect, useState } from "react";
import {
  deleteReminder as dbDeleteReminder,
  getAllReminders,
  getReminderById,
  insertReminder,
  toggleReminderActive as dbToggleActive,
  updateReminder as dbUpdateReminder,
  getDrugsForReminder,
  setReminderDrugs,
} from "@/services/database";
import { reminderEvents } from "@/services/event-bus";
import type { Drug, Reminder, Weekday } from "@/types/reminder";
import { toDateString, generateId } from "@/utils/date-helpers";

export interface ReminderWithDrugs extends Reminder {
  drugs: Drug[];
}

export function useReminders() {
  const [reminders, setReminders] = useState<ReminderWithDrugs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(() => {
    try {
      setError(null);
      const all = getAllReminders();
      const withDrugs: ReminderWithDrugs[] = all.map((r) => ({
        ...r,
        drugs: getDrugsForReminder(r.id),
      }));
      setReminders(withDrugs);
    } catch (e) {
      setError("Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
    return reminderEvents.on(loadReminders);
  }, [loadReminders]);

  const todayReminders = reminders.filter((r) => {
    if (!r.isActive) return false;

    const today = new Date();
    const todayWeekday = today.getDay() as Weekday;
    if (!r.days.includes(todayWeekday)) return false;

    const todayStr = toDateString(today);
    if (r.startDate && todayStr < r.startDate) return false;
    if (r.endDate && todayStr > r.endDate) return false;

    return true;
  });

  const addReminder = useCallback(
    async (data: Omit<Reminder, "id" | "notificationIds" | "createdAt"> & { drugIds: string[] }) => {
      const reminder: Reminder = {
        id: generateId(),
        name: data.name,
        hour: data.hour,
        minute: data.minute,
        days: data.days,
        isActive: data.isActive,
        notificationIds: [],
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: Date.now(),
      };
      insertReminder(reminder);
      setReminderDrugs(reminder.id, data.drugIds);
      reminderEvents.emit();

      const withDrugs: ReminderWithDrugs = {
        ...reminder,
        drugs: data.drugIds
          .map((id) => {
            // Load drugs for this reminder from DB
            const { getDrugsForReminder: gdfR } = require("@/services/database");
            return gdfR(reminder.id);
          })
          .flat(),
      };
      // Re-fetch to get proper drug objects
      return reminder;
    },
    [],
  );

  const update = useCallback(
    async (reminder: Reminder, drugIds: string[]) => {
      dbUpdateReminder(reminder);
      setReminderDrugs(reminder.id, drugIds);
      reminderEvents.emit();
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      dbDeleteReminder(id);
      reminderEvents.emit();
    },
    [],
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      dbToggleActive(id, isActive);
      reminderEvents.emit();
    },
    [],
  );

  const getById = useCallback((id: string): ReminderWithDrugs | null => {
    const reminder = getReminderById(id);
    if (!reminder) return null;
    return { ...reminder, drugs: getDrugsForReminder(id) };
  }, []);

  return {
    reminders,
    todayReminders,
    loading,
    error,
    addReminder,
    updateReminder: update,
    deleteReminder: remove,
    toggleActive,
    getById,
    refreshReminders: loadReminders,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-reminders.ts
git commit -m "refactor: update useReminders to load drugs via junction table"
```

---

## Task 6: Update useAdherence Hook

**Files:**
- Modify: `hooks/use-adherence.ts`

- [ ] **Step 1: Update `hooks/use-adherence.ts`**

All logging functions now take `drugId`. Undo works per-drug. Stats count per-drug doses.

```ts
// hooks/use-adherence.ts
import { useCallback, useEffect, useState } from "react";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Reminder, Drug } from "@/types/reminder";
import {
  deleteLog as dbDeleteLog,
  deleteLogByDrugAndDate as dbDeleteLogByDrugAndDate,
  getLogsForDate,
  getLogsForRange,
  getLogsForReminder,
  logDose as dbLogDose,
  updateLogStatus as dbUpdateLogStatus,
} from "@/services/database";
import { adherenceEvents } from "@/services/event-bus";
import { calculateStreak, generateId, toDateString } from "@/utils/date-helpers";

export interface MonthlyStats {
  adherencePercent: number;
  streak: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
}

export function useAdherence() {
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    try {
      setError(null);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const rangeLogs = getLogsForRange(
        toDateString(startDate),
        toDateString(endDate),
      );
      setLogs(rangeLogs);
    } catch {
      setError("Failed to load adherence data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    return adherenceEvents.on(loadLogs);
  }, [loadLogs]);

  const logDose = useCallback(
    async (reminderId: string, drugId: string, date: string, status: DoseStatus) => {
      const log: AdherenceLog = {
        id: generateId(),
        reminderId,
        drugId,
        date,
        status,
        takenAt: status === "taken" ? Date.now() : undefined,
      };
      dbLogDose(log);
      adherenceEvents.emit();
    },
    [],
  );

  const markTaken = useCallback(
    async (reminderId: string, drugId: string, date?: string) => {
      const d = date ?? toDateString(new Date());
      await logDose(reminderId, drugId, d, "taken");
    },
    [logDose],
  );

  const markMissed = useCallback(
    async (reminderId: string, drugId: string, date: string) => {
      await logDose(reminderId, drugId, date, "missed");
    },
    [logDose],
  );

  const markSkipped = useCallback(
    async (reminderId: string, drugId: string, date: string) => {
      await logDose(reminderId, drugId, date, "skipped");
    },
    [logDose],
  );

  const getMonthlyStats = useCallback(
    (year: number, month: number): MonthlyStats => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      const monthLogs = getLogsForRange(startDate, endDate);

      const total = monthLogs.length;
      const taken = monthLogs.filter((l) => l.status === "taken").length;
      const missed = monthLogs.filter((l) => l.status === "missed").length;

      return {
        adherencePercent: total === 0 ? 0 : Math.round((taken / total) * 100),
        streak: calculateStreak(monthLogs),
        totalDoses: total,
        takenDoses: taken,
        missedDoses: missed,
      };
    },
    [],
  );

  const getMarkedDates = useCallback(
    (
      year: number,
      month: number,
      reminders: Reminder[],
    ): Record<string, { dots: Array<{ color: string }> }> => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      const monthLogs = getLogsForRange(startDate, endDate);

      const dateMap = new Map<string, { taken: number; missed: number }>();

      for (const log of monthLogs) {
        const existing = dateMap.get(log.date) ?? { taken: 0, missed: 0 };
        if (log.status === "taken") existing.taken++;
        if (log.status === "missed") existing.missed++;
        dateMap.set(log.date, existing);
      }

      // Count total drug-doses per day across active reminders
      const totalDrugsPerDay = reminders.reduce((sum, r) => sum + r.drugs.length, 0);
      const total = totalDrugsPerDay || 1;

      const marked: Record<string, { dots: Array<{ color: string }> }> = {};

      for (const [date, counts] of dateMap) {
        const color = counts.taken === 0
          ? "#EF4444"
          : counts.taken >= total
            ? "#22C55E"
            : "#F59E0B";
        marked[date] = { dots: [{ color }] };
      }

      return marked;
    },
    [],
  );

  const getLogsForReminderFn = useCallback((reminderId: string) => {
    return getLogsForReminder(reminderId);
  }, []);

  const getLogsForDateFn = useCallback((date: string) => {
    return getLogsForDate(date);
  }, []);

  const updateLogStatus = useCallback(
    async (id: string, status: DoseStatus) => {
      dbUpdateLogStatus(id, status);
      adherenceEvents.emit();
    },
    [],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      dbDeleteLog(id);
      adherenceEvents.emit();
    },
    [],
  );

  const undoLog = useCallback(
    (drugId: string, date: string) => {
      dbDeleteLogByDrugAndDate(drugId, date);
      adherenceEvents.emit();
    },
    [],
  );

  return {
    logs,
    loading,
    error,
    logDose,
    markTaken,
    markMissed,
    markSkipped,
    getMonthlyStats,
    getMarkedDates,
    getLogsForReminder: getLogsForReminderFn,
    getLogsForDate: getLogsForDateFn,
    updateLogStatus,
    deleteLog,
    undoLog,
    refreshLogs: loadLogs,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-adherence.ts
git commit -m "refactor: update useAdherence for per-drug tracking"
```

---

## Task 7: Update Notification Service & Helpers

**Files:**
- Modify: `utils/notification-helpers.ts`
- Modify: `services/notification-service.ts`

- [ ] **Step 1: Update `utils/notification-helpers.ts`**

```ts
// utils/notification-helpers.ts
import type { Drug } from "@/types/reminder";

export function toExpoWeekday(day: number): number {
  return day + 1;
}

export function buildNotificationBody(drugs: Drug[]): string {
  const drugList = drugs.map((d) => `${d.name} ${d.dosage}`).join(", ");
  return `Time to take: ${drugList}`;
}
```

- [ ] **Step 2: Update `services/notification-service.ts`**

All functions that take a `Reminder` now also take `drugs: Drug[]` separately.

```ts
// services/notification-service.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Drug, Reminder, Weekday } from "@/types/reminder";
import { toExpoWeekday, buildNotificationBody } from "@/utils/notification-helpers";
import { SchedulableTriggerInputTypes } from "expo-notifications";

// ── Handler (call at module level in _layout.tsx) ───────────────────────────

export function setNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ── Channel setup (Android) ─────────────────────────────────────────────────

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("remindrugs-channel", {
      name: "Medication Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }

  await Notifications.setNotificationCategoryAsync("reminder-actions", [
    {
      identifier: "mark-done",
      buttonTitle: "Done",
      options: {} as any,
    },
    {
      identifier: "snooze",
      buttonTitle: "Snooze 15m",
      options: {} as any,
    },
  ]);
}

// ── Permissions ─────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

// ── Scheduling ──────────────────────────────────────────────────────────────

async function scheduleForDay(
  reminder: Reminder,
  drugs: Drug[],
  day: Weekday,
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.name,
      body: buildNotificationBody(drugs),
      sound: true,
      data: { reminderId: reminder.id },
      categoryIdentifier: "reminder-actions",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(day),
      hour: reminder.hour,
      minute: reminder.minute,
      channelId: "remindrugs-channel",
    },
  });
  return id;
}

export async function scheduleReminder(
  reminder: Reminder,
  drugs: Drug[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const day of reminder.days) {
    const id = await scheduleForDay(reminder, drugs, day);
    ids.push(id);
  }
  return ids;
}

export async function cancelReminder(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function rescheduleReminder(
  reminder: Reminder,
  drugs: Drug[],
): Promise<string[]> {
  await cancelReminder(reminder.notificationIds);
  return scheduleReminder(reminder, drugs);
}

// ── Snooze (one-time notification 15 minutes from now) ─────────────────────

export async function scheduleSnooze(
  reminder: Reminder,
  drugs: Drug[],
): Promise<string> {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Snoozed: ${reminder.name}`,
      body: buildNotificationBody(drugs),
      sound: true,
      data: { reminderId: reminder.id, type: "snooze" },
      categoryIdentifier: "reminder-actions",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      channelId: "remindrugs-channel",
      date: new Date(Date.now() + 15 * 60 * 1000),
    } as any,
  });
  return id;
}

// ── Refill reminder ─────────────────────────────────────────────────────────

export async function scheduleRefillReminder(
  drug: Drug,
  reminderId: string,
): Promise<void> {
  if (drug.currentStock === undefined || drug.stockThreshold === undefined) return;
  if (drug.currentStock > drug.stockThreshold) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Refill Needed: ${drug.name}`,
      body: `You only have ${drug.currentStock} ${drug.form}(s) left. Time to refill!`,
      data: { reminderId, drugId: drug.id, type: "refill" },
    },
    trigger: null,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add utils/notification-helpers.ts services/notification-service.ts
git commit -m "refactor: update notification service to accept drugs separately"
```

---

## Task 8: Update DrugChip — Add Checkable Variant

**Files:**
- Modify: `components/drug-chip.tsx`

- [ ] **Step 1: Add checkable variant to DrugChip**

```tsx
// components/drug-chip.tsx
import { Pressable, Text, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface DrugChipProps {
  name: string;
  dosage: string;
  color?: string;
  checked?: boolean;
  onToggle?: () => void;
}

export function DrugChip({ name, dosage, color, checked, onToggle }: DrugChipProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  if (onToggle !== undefined) {
    // Checkable variant
    return (
      <Pressable
        onPress={onToggle}
        style={[
          styles.chip,
          {
            backgroundColor: checked ? colors.successLight : colors.primaryLight,
            borderColor: checked ? colors.success : "transparent",
            borderWidth: 1,
          },
        ]}
      >
        {color && !checked ? (
          <View style={[styles.dot, { backgroundColor: color }]} />
        ) : null}
        <MaterialCommunityIcons
          name={checked ? "check-circle" : "circle-outline"}
          size={16}
          color={checked ? colors.success : colors.textTertiary}
        />
        <Text
          style={[
            styles.text,
            {
              color: checked ? colors.success : colors.textPrimary,
              textDecorationLine: checked ? "line-through" : "none",
            },
          ]}
          numberOfLines={1}
        >
          {name} {dosage}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={1}>
        {name} {dosage}
      </Text>
    </View>
  );
}

interface MoreChipProps {
  count: number;
}

export function MoreChip({ count }: MoreChipProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View style={[styles.chip, { backgroundColor: colors.divider }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        +{count} more
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  text: {
    ...Typography.xs,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/drug-chip.tsx
git commit -m "feat: add checkable variant to DrugChip for per-drug marking"
```

---

## Task 9: Update ReminderCard — Per-Drug Check Marks

**Files:**
- Modify: `components/reminder-card.tsx`

- [ ] **Step 1: Rewrite `components/reminder-card.tsx`**

The card now shows individual drug check marks, a "Mark All Taken" button, and shows a summary status (all taken, partial, none).

```tsx
// components/reminder-card.tsx
import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TimeDisplay } from "@/components/time-display";
import { FrequencyBadge } from "@/components/frequency-badge";
import { DrugChip, MoreChip } from "@/components/drug-chip";
import type { Drug, Reminder } from "@/types/reminder";
import { getFrequencyLabel, getDayAbbreviations } from "@/utils/date-helpers";

interface ReminderCardProps {
  reminder: Reminder;
  drugs: Drug[];
  takenDrugIds: Set<string>;
  skippedDrugIds: Set<string>;
  onMarkDrug: (drugId: string) => void;
  onMarkAll: () => void;
  onLongPress?: () => void;
}

export function ReminderCard({
  reminder,
  drugs,
  takenDrugIds,
  skippedDrugIds,
  onMarkDrug,
  onMarkAll,
  onLongPress,
}: ReminderCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const frequency = getFrequencyLabel(reminder.days) as "daily" | "weekly" | "custom";
  const dayAbbr = getDayAbbreviations(reminder.days);

  const totalDrugs = drugs.length;
  const takenCount = drugs.filter((d) => takenDrugIds.has(d.id)).length;
  const skippedCount = drugs.filter((d) => skippedDrugIds.has(d.id)).length;
  const allDone = takenCount === totalDrugs;
  const someDone = takenCount > 0 || skippedCount > 0;
  const noneDone = takenCount === 0 && skippedCount === 0;

  const stripeColor = allDone ? colors.success : someDone ? colors.warning : colors.primary;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: allDone
            ? colors.successLight
            : someDone
              ? colors.background
              : colors.card,
          borderColor: colors.border,
          opacity: allDone ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              { color: allDone ? colors.success : colors.textPrimary },
            ]}
          >
            {reminder.name}
          </Text>
          <FrequencyBadge type={frequency} />
        </View>

        {/* Drug chips — checkable */}
        <View style={styles.drugRow}>
          {drugs.slice(0, 3).map((drug) => (
            <DrugChip
              key={drug.id}
              name={drug.name}
              dosage={drug.dosage}
              color={drug.color}
              checked={takenDrugIds.has(drug.id)}
              onToggle={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onMarkDrug(drug.id);
              }}
            />
          ))}
          {drugs.length > 3 && <MoreChip count={drugs.length - 3} />}
        </View>

        {/* Time + days row */}
        <View style={styles.metaRow}>
          <TimeDisplay hour={reminder.hour} minute={reminder.minute} />
          <Text style={[styles.days, { color: colors.textTertiary }]}>
            {frequency === "daily" ? "Every day" : dayAbbr}
          </Text>
        </View>

        {/* Actions */}
        {noneDone && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onMarkAll();
            }}
            style={[styles.takenButton, { backgroundColor: colors.success }]}
            accessibilityLabel={`Mark all in ${reminder.name} as taken`}
          >
            <Text style={[styles.takenText, { color: colors.textInverse }]}>
              ✓ Mark All Taken
            </Text>
          </Pressable>
        )}

        {someDone && !allDone && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onMarkAll();
            }}
            style={[styles.takenButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.takenText, { color: colors.textInverse }]}>
              ✓ Mark Remaining ({totalDrugs - takenCount - skippedCount})
            </Text>
          </Pressable>
        )}

        {allDone && (
          <View style={[styles.takenBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.takenBadgeText, { color: colors.success }]}>
              ✓ All Taken
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  stripe: { width: 4 },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  name: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  drugRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  days: {
    ...Typography.sm,
  },
  takenButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  takenText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  takenBadge: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    alignItems: "center",
  },
  takenBadgeText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/reminder-card.tsx
git commit -m "feat: redesign ReminderCard with per-drug check marks and Mark All"
```

---

## Task 10: Create MedicationCard Component

**Files:**
- Create: `components/medication-card.tsx`

- [ ] **Step 1: Create the medication card for the Medications tab**

This card shows a single drug with stock info, form badge, and which reminders reference it.

```tsx
// components/medication-card.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatTime } from "@/utils/date-helpers";
import type { Drug, Reminder } from "@/types/reminder";

const FORM_ICONS: Record<string, string> = {
  tablet: "pill",
  capsule: "medical-bag",
  liquid: "water",
  injection: "needle",
  patch: "bandage",
  inhaler: "lungs",
  drops: "eye-outline",
  other: "help-circle-outline",
};

interface MedicationCardProps {
  drug: Drug;
  reminders: Reminder[];
  onPress: () => void;
}

export function MedicationCard({ drug, reminders, onPress }: MedicationCardProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  const hasLowStock =
    drug.currentStock !== undefined &&
    drug.stockThreshold !== undefined &&
    drug.currentStock <= drug.stockThreshold;

  const formIcon = FORM_ICONS[drug.form] ?? "help-circle-outline";

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Color stripe */}
      <View style={[styles.stripe, { backgroundColor: drug.color ?? colors.primary }]} />

      <View style={styles.content}>
        {/* Top row: name + form badge */}
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <MaterialCommunityIcons name={formIcon as any} size={18} color={colors.textSecondary} />
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {drug.name}
            </Text>
          </View>
          <View style={[styles.formBadge, { backgroundColor: colors.divider }]}>
            <Text style={[styles.formText, { color: colors.textSecondary }]}>
              {drug.form}
            </Text>
          </View>
        </View>

        {/* Dosage + quantity */}
        <Text style={[styles.dosage, { color: colors.textSecondary }]}>
          {drug.dosage} · {drug.quantity}x per dose
        </Text>

        {/* Stock */}
        {drug.currentStock !== undefined && (
          <View style={styles.stockRow}>
            <MaterialCommunityIcons
              name="package-variant"
              size={14}
              color={hasLowStock ? colors.danger : colors.textTertiary}
            />
            <Text
              style={[styles.stockText, { color: hasLowStock ? colors.danger : colors.textTertiary }]}
            >
              {drug.currentStock} remaining
              {drug.stockThreshold !== undefined ? ` (alert at ${drug.stockThreshold})` : ""}
            </Text>
          </View>
        )}

        {/* Low stock badge */}
        {hasLowStock && (
          <View style={[styles.refillBadge, { backgroundColor: colors.dangerLight }]}>
            <MaterialCommunityIcons name="alert-circle" size={12} color={colors.danger} />
            <Text style={[styles.refillText, { color: colors.danger }]}> Low Stock</Text>
          </View>
        )}

        {/* Notes */}
        {drug.notes ? (
          <Text style={[styles.notes, { color: colors.textTertiary }]} numberOfLines={1}>
            {drug.notes}
          </Text>
        ) : null}

        {/* Used in reminders */}
        {reminders.length > 0 && (
          <View style={styles.remindersRow}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.remindersText, { color: colors.textTertiary }]} numberOfLines={1}>
              {reminders.map((r) => `${r.name} (${formatTime(r.hour, r.minute)})`).join(" · ")}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  stripe: { width: 4 },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    flex: 1,
  },
  formBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  formText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: "capitalize",
  },
  dosage: {
    ...Typography.sm,
    marginTop: 2,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  stockText: {
    ...Typography.xs,
  },
  refillBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
    marginTop: 2,
  },
  refillText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
  notes: {
    ...Typography.xs,
    marginTop: 2,
    fontStyle: "italic",
  },
  remindersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
  },
  remindersText: {
    ...Typography.xs,
    flex: 1,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/medication-card.tsx
git commit -m "feat: add MedicationCard component for medicine cabinet view"
```

---

## Task 11: Update Home Screen — Per-Drug Tracking

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Rewrite `app/(tabs)/index.tsx`**

The home screen now tracks per-drug taken/skipped state. Progress counts total drug doses. The FAB opens add-reminder. Toast undo works per-drug.

Key changes:
- `takenDrugIds` and `skippedDrugIds` are Sets built from today's logs (keyed by `drugId`)
- Progress counts total drugs across today's reminders vs taken drugs
- `handleMarkDrug` marks a single drug as taken
- `handleMarkAll` marks all drugs in a reminder as taken
- `ReminderCard` receives drugs, takenDrugIds, skippedDrugIds, onMarkDrug, onMarkAll

The full implementation is the existing `index.tsx` adapted with:
- Replace `takenIds`/`skippedIds` (reminder-level) with `takenDrugIds`/`skippedDrugIds` (drug-level)
- Replace `takenCount`/`totalCount` with drug-level counting
- Update `handleMarkTaken` → `handleMarkDrug(reminderId, drugId)`
- Add `handleMarkAll(reminder)` that marks all untaken drugs
- Pass new props to `ReminderCard`
- Update toast to reference drug name
- Update `handleUndo` to use `undoLog(drugId, date)` instead of `undoLog(reminderId, date)`

The structure of the file stays the same — greeting, progress card, FlashList with period headers, FAB, action sheet, toast. Only the tracking logic and card props change.

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: update home screen with per-drug marking and progress"
```

---

## Task 12: Update Medications Tab — Medicine Cabinet

**Files:**
- Modify: `app/(tabs)/medications.tsx`

- [ ] **Step 1: Rewrite `app/(tabs)/medications.tsx`**

The Medications tab now shows unique drugs (deduplicated). It uses `useDrugs()` and `getRemindersForDrug()` to build each card. Tapping a drug navigates to the drug detail page. The FAB navigates to add-reminder (or could navigate to a standalone "add drug" page — for now it reuses add-reminder).

```tsx
// app/(tabs)/medications.tsx — key structure:
import { useDrugs } from "@/hooks/use-drugs";
import { MedicationCard } from "@/components/medication-card";
import { getRemindersForDrug } from "@/services/database";

type MedListItem =
  | { type: "header"; title: string; id: string }
  | { type: "med"; drug: Drug; reminders: Reminder[]; id: string };

export default function MedicationsScreen() {
  const { drugs, loading, refreshDrugs } = useDrugs();

  // Build list items with pre-fetched reminders for each drug
  const listItems = useMemo((): MedListItem[] => {
    const items: MedListItem[] = [];
    if (drugs.length > 0) {
      items.push({ type: "header", title: `All Medications · ${drugs.length}`, id: "h-all" });
      drugs.forEach((drug) => {
        const refs = getRemindersForDrug(drug.id);
        items.push({ type: "med", drug, reminders: refs, id: drug.id });
      });
    }
    return items;
  }, [drugs]);

  // renderItem: header or MedicationCard
  // MedicationCard onPress → router.push(`/edit-drug/${drug.id}`)
  // FAB → router.push("/add-reminder")
}
```

Full implementation follows the same FlashList pattern as the current file, replacing `SwipeableMedicationCard` with `MedicationCard`.

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/medications.tsx
git commit -m "feat: redesign medications tab as deduplicated medicine cabinet"
```

---

## Task 13: Create Edit Drug Page

**Files:**
- Create: `app/edit-drug/[id].tsx`
- Modify: `app/_layout.tsx` (add route)

- [ ] **Step 1: Create `app/edit-drug/[id].tsx`**

Standalone drug detail/edit page. Shows name, dosage, form, color, stock, notes. Shows which reminders use this drug. Changes sync to all reminders that reference this drug.

```tsx
// app/edit-drug/[id].tsx
// Structure:
// - Load drug by ID from useDrugs().getById()
// - Load reminders via useDrugs().getRemindersFor()
// - Form fields: name, dosage, form selector, quantity, color picker, notes, stock
// - "Reminders using this drug" section (read-only list)
// - "Save Changes" button → useDrugs().updateDrug()
// - "Delete Drug" button → removes drug, also removes from all reminders
```

Full implementation follows the same pattern as `edit-reminder/[id].tsx` — load state, form fields, save/delete handlers.

- [ ] **Step 2: Add route to `app/_layout.tsx`**

Add inside the `<Stack>`:

```tsx
<Stack.Screen
  name="edit-drug/[id]"
  options={{ title: "Edit Medication" }}
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/edit-drug/[id].tsx app/_layout.tsx
git commit -m "feat: add standalone edit drug page and route"
```

---

## Task 14: Update Add Reminder & Edit Reminder — Drug Picker

**Files:**
- Modify: `app/add-reminder.tsx`
- Modify: `app/edit-reminder/[id].tsx`

- [ ] **Step 1: Update `app/add-reminder.tsx`**

Instead of inline drug creation with `DrugFormRow`, the add-reminder screen now has a drug picker that lets users:
1. Select from existing drugs (shown as a list of chips/cards)
2. Add a new drug inline (simplified form: just name + dosage + form)
3. New drugs get saved to the `drugs` table immediately

The state tracks `selectedDrugIds: string[]` and `newDrugs: Drug[]`.

```tsx
// app/add-reminder.tsx — key changes:
import { useDrugs } from "@/hooks/use-drugs";
import { DrugChip } from "@/components/drug-chip";

// State:
const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
const [newDrugs, setNewDrugs] = useState<Drug[]>([]);

// Drug picker section:
// 1. List existing drugs as toggleable chips
// 2. "+ Add New Drug" button opens inline form (name, dosage, form only)
// 3. New drug → saved via useDrugs().addDrug() and added to selectedDrugIds

// On save:
// - Create reminder
// - setReminderDrugs(reminder.id, selectedDrugIds)
// - Schedule notifications with drugs array
```

- [ ] **Step 2: Update `app/edit-reminder/[id].tsx`**

Same drug picker as add-reminder. Pre-populates with current reminder's drug IDs.

```tsx
// app/edit-reminder/[id].tsx — key changes:
// - Load drugs for this reminder on mount
// - selectedDrugIds pre-populated from reminder drugs
// - Same picker UI as add-reminder
// - On save: updateReminder(reminder, selectedDrugIds)
```

- [ ] **Step 3: Commit**

```bash
git add app/add-reminder.tsx app/edit-reminder/[id].tsx
git commit -m "feat: update add/edit reminder with drug picker from existing medications"
```

---

## Task 15: Update Calendar Screen — Per-Drug Display

**Files:**
- Modify: `app/(tabs)/calendar.tsx`

- [ ] **Step 1: Update `app/(tabs)/calendar.tsx`**

The calendar day detail now shows per-drug status instead of per-reminder status. Each drug in a reminder gets its own status row.

Key changes:
- `selectedLogMap` keyed by `drugId` instead of `reminderId`
- Day detail list iterates over `reminder.drugs` and shows each drug with its log status
- "All Taken" / "All Missed" buttons iterate over all drugs across all selected-date reminders
- `handleMarkDay` takes `drugId` instead of `reminderId`

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/calendar.tsx
git commit -m "feat: update calendar to show per-drug adherence status"
```

---

## Task 16: Update Root Layout — Notification Handler

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Update notification response listener**

The "Done" action from a notification now needs a `drugId` to log per-drug. Since notifications are per-reminder, the "Done" action marks all drugs in that reminder as taken.

```tsx
// In the response listener:
if (actionId === "mark-done") {
  const reminder = getReminderById(reminderId);
  if (reminder) {
    const drugs = getDrugsForReminder(reminderId);
    const today = toDateString(new Date());
    for (const drug of drugs) {
      logDose({
        id: generateId(),
        reminderId,
        drugId: drug.id,
        date: today,
        status: "taken",
        takenAt: Date.now(),
      });
    }
    adherenceEvents.emit();
  }
}
```

Also update `scheduleSnooze` call to pass drugs.

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "fix: update notification handler for per-drug adherence logging"
```

---

## Task 17: Update date-helpers — Streak Calculation

**Files:**
- Modify: `utils/date-helpers.ts`

- [ ] **Step 1: Update `calculateStreak` for per-drug logs**

```ts
// utils/date-helpers.ts — update calculateStreak:
export function calculateStreak(logs: AdherenceLog[]): number {
  if (logs.length === 0) return 0;

  const today = toDateString(new Date());
  const dateMap = new Map<string, { total: number; taken: number }>();

  for (const log of logs) {
    const existing = dateMap.get(log.date) ?? { total: 0, taken: 0 };
    existing.total++;
    if (log.status === "taken") existing.taken++;
    dateMap.set(log.date, existing);
  }

  let streak = 0;
  const current = new Date();

  for (let i = 0; i < 365; i++) {
    const dateStr = toDateString(current);
    const dayData = dateMap.get(dateStr);

    if (dayData && dayData.total > 0) {
      if (dayData.taken < dayData.total) break;
      streak++;
    }
    current.setDate(current.getDate() - 1);
  }

  return streak;
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/date-helpers.ts
git commit -m "fix: update streak calculation for per-drug adherence logs"
```

---

## Task 18: Final Verification & Cleanup

**Files:**
- Scan all files for stale references to old types/APIs

- [ ] **Step 1: Search for stale references**

```bash
grep -r "reminder\.drugs" --include="*.ts" --include="*.tsx" .
grep -r "AdherenceLog" --include="*.ts" --include="*.tsx" . | grep -v "drugId"
```

Fix any remaining references to the old `reminder.drugs` pattern that aren't covered by the `ReminderWithDrugs` type.

- [ ] **Step 2: Verify the app builds**

```bash
npx expo export --platform android 2>&1 | head -50
```

Fix any type errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: clean up stale references and type errors"
```
