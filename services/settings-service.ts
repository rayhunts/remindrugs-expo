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
