import * as SQLite from "expo-sqlite";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Reminder } from "@/types/reminder";

// ── Init at module level — runs before any component renders ─────────────────

const db = SQLite.openDatabaseSync("remindrugs.db");

db.execSync(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    drugs TEXT NOT NULL DEFAULT '[]',
    hour INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    days TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    notification_ids TEXT NOT NULL DEFAULT '[]',
    start_date TEXT,
    end_date TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS adherence_logs (
    id TEXT PRIMARY KEY NOT NULL,
    reminder_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    taken_at INTEGER,
    notes TEXT,
    FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
  );
`);

export function initDatabase(): void {
  // Tables already created at module level above.
  // This function exists for explicit call in _layout.tsx if needed.
}

// ── Reminder CRUD ───────────────────────────────────────────────────────────

export function getAllReminders(): Reminder[] {
  const rows = db.getAllSync<{
    id: string;
    name: string;
    drugs: string;
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
    drugs: string;
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
    `INSERT INTO reminders (id, name, drugs, hour, minute, days, is_active, notification_ids, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.name,
      JSON.stringify(reminder.drugs),
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
     SET name = ?, drugs = ?, hour = ?, minute = ?, days = ?,
         is_active = ?, notification_ids = ?, start_date = ?, end_date = ?
     WHERE id = ?`,
    [
      reminder.name,
      JSON.stringify(reminder.drugs),
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

// ── Adherence CRUD ──────────────────────────────────────────────────────────

export function logDose(log: AdherenceLog): void {
  db.runSync(
    `INSERT INTO adherence_logs (id, reminder_id, date, status, taken_at, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      log.id,
      log.reminderId,
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
    date: string;
    status: string;
    taken_at: number | null;
    notes: string | null;
  }>("SELECT * FROM adherence_logs WHERE date = ?", date);

  return rows.map(mapAdherenceRow);
}

export function getLogsForRange(
  startDate: string,
  endDate: string,
): AdherenceLog[] {
  const rows = db.getAllSync<{
    id: string;
    reminder_id: string;
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

export function updateLogStatus(id: string, status: DoseStatus): void {
  db.runSync("UPDATE adherence_logs SET status = ? WHERE id = ?", status, id);
}

export function deleteLog(id: string): void {
  db.runSync("DELETE FROM adherence_logs WHERE id = ?", id);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapReminderRow(row: {
  id: string;
  name: string;
  drugs: string;
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
    drugs: JSON.parse(row.drugs) as Reminder["drugs"],
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

function mapAdherenceRow(row: {
  id: string;
  reminder_id: string;
  date: string;
  status: string;
  taken_at: number | null;
  notes: string | null;
}): AdherenceLog {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    date: row.date,
    status: row.status as DoseStatus,
    takenAt: row.taken_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}
