import * as SQLite from "expo-sqlite";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Drug, Reminder } from "@/types/reminder";

// ── Init at module level ─────────────────────────────────────────────────────

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
    quantity REAL NOT NULL DEFAULT 1,
    notes TEXT,
    color TEXT,
    current_stock REAL,
    stock_threshold REAL
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
  const tableInfo = db.getAllSync<{ name: string }>("PRAGMA table_info(reminders)");
  const hasDrugsColumn = tableInfo.some((col) => col.name === "drugs");

  if (!hasDrugsColumn) return;

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

      db.runSync(
        `INSERT OR IGNORE INTO reminder_drugs (reminder_id, drug_id, sort_order) VALUES (?, ?, ?)`,
        [row.id, d.id, i],
      );
    }
  }

  const logTableInfo = db.getAllSync<{ name: string }>("PRAGMA table_info(adherence_logs)");
  const logHasDrugId = logTableInfo.some((col) => col.name === "drug_id");

  if (!logHasDrugId) {
    db.execSync("ALTER TABLE adherence_logs ADD COLUMN drug_id TEXT NOT NULL DEFAULT '';");
  }

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

// ── Migration: v2 → v3 (INTEGER → REAL for quantity/stock) ─────────────────────

function migrateV2ToV3(): void {
  const tableInfo = db.getAllSync<{ name: string; type: string }>("PRAGMA table_info(drugs)");
  const quantityCol = tableInfo.find((col) => col.name === "quantity");

  if (!quantityCol || quantityCol.type === "REAL") return;

  db.execSync(`
    CREATE TABLE IF NOT EXISTS drugs_new (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL DEFAULT '',
      form TEXT NOT NULL DEFAULT 'tablet',
      quantity REAL NOT NULL DEFAULT 1,
      notes TEXT,
      color TEXT,
      current_stock REAL,
      stock_threshold REAL
    );
    INSERT INTO drugs_new SELECT id, name, dosage, form, quantity, notes, color, current_stock, stock_threshold FROM drugs;
    DROP TABLE drugs;
    ALTER TABLE drugs_new RENAME TO drugs;
  `);
}
migrateV2ToV3();

// ── Migration: v3 → v4 (unique index on adherence_logs for duplicate prevention) ──

db.execSync(
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_adherence_unique ON adherence_logs(reminder_id, drug_id, date)`,
);

export function initDatabase(): void {
  // Tables already created at module level above.
}

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

export function deductDrugStock(drugId: string): number | null {
  const drug = getDrugById(drugId);
  if (!drug || drug.currentStock === undefined || drug.currentStock <= 0) {
    return null;
  }

  const newStock = Math.max(0, drug.currentStock - drug.quantity);
  db.runSync(
    "UPDATE drugs SET current_stock = ? WHERE id = ?",
    newStock,
    drugId,
  );
  return newStock;
}

export function getDrugsNeedingRefill(): Array<{ drug: Drug; reminderId: string }> {
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
    reminder_id: string;
  }>(
    `SELECT d.*, rd.reminder_id
     FROM drugs d
     JOIN reminder_drugs rd ON d.id = rd.drug_id
     WHERE d.current_stock IS NOT NULL AND d.stock_threshold IS NOT NULL AND d.current_stock <= d.stock_threshold`,
  );

  return rows.map((row) => ({
    drug: mapDrugRow(row),
    reminderId: row.reminder_id,
  }));
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

export function logDoseIgnoreDuplicate(log: AdherenceLog): boolean {
  const result = db.runSync(
    `INSERT OR IGNORE INTO adherence_logs (id, reminder_id, drug_id, date, status, taken_at, notes)
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
  return (result.changes ?? 0) > 0;
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

export function deleteLogByReminderDrugAndDate(reminderId: string, drugId: string, date: string): void {
  db.runSync(
    "DELETE FROM adherence_logs WHERE reminder_id = ? AND drug_id = ? AND date = ?",
    reminderId,
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
