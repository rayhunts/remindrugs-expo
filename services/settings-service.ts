import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("remindrugs.db");

db.execSync(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

export function getSetting(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.runSync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    key,
    value,
  );
}

export function getSnoozeDuration(): number {
  const val = getSetting("snooze_duration");
  return val ? parseInt(val, 10) : 10;
}

export function setSnoozeDuration(minutes: number): void {
  setSetting("snooze_duration", String(minutes));
}

export function getAutoDismissTimeout(): number {
  const val = getSetting("auto_dismiss_timeout");
  return val ? parseInt(val, 10) : 5;
}

export function setAutoDismissTimeout(minutes: number): void {
  setSetting("auto_dismiss_timeout", String(minutes));
}
