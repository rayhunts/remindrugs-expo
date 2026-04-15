# ReminDrugs — Data Models Specification

> Complete database schema, type definitions, and data relationships.
> Target: SQLite (current) → any persistent store for Tauri rewrite (SQLite recommended).

---

## Database Schema

### Table: `settings`

Key-value store for app configuration.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Known keys:**
| Key | Type | Values |
|-----|------|--------|
| `onboarding_completed` | string | `"true"` / `"false"` |
| `theme` | string | `"system"` / `"light"` / `"dark"` |
| `language` | string | `"en"` / `"id"` |

---

### Table: `reminders`

Stores medication reminder schedules.

```sql
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hour INTEGER NOT NULL,          -- 0-23
  minute INTEGER NOT NULL,         -- 0-59
  days TEXT NOT NULL,              -- JSON array of weekday numbers [0,1,2,3,4,5,6]
  is_active INTEGER DEFAULT 1,     -- 1 = active, 0 = inactive
  notification_ids TEXT DEFAULT '[]', -- JSON array of platform notification IDs
  start_date TEXT,                 -- ISO date string, optional
  end_date TEXT,                   -- ISO date string, optional
  created_at INTEGER NOT NULL      -- Unix timestamp ms
);
```

**Fields detail:**
- `days`: JSON array, e.g. `[1,2,3,4,5]` for weekdays only. 0=Sunday, 6=Saturday.
- `notification_ids`: JSON array of notification scheduling IDs, used for cancellation
- `start_date` / `end_date`: Optional date range for the reminder. If null, reminder is always active within selected days.
- `is_active`: Soft toggle — inactive reminders are filtered out of the home screen but not deleted

---

### Table: `drugs`

Stores medication entries.

```sql
CREATE TABLE IF NOT EXISTS drugs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dosage TEXT DEFAULT '',
  form TEXT DEFAULT 'tablet',      -- DrugForm enum
  quantity REAL DEFAULT 1,          -- Supports fractional doses (e.g. 0.5)
  notes TEXT,
  color TEXT,                       -- Hex color string from PILL_COLORS
  current_stock REAL,               -- Current quantity on hand
  stock_threshold REAL              -- Alert when stock <= this value
);
```

**Fields detail:**
- `form`: One of `tablet`, `capsule`, `liquid`, `injection`, `patch`, `inhaler`, `drops`, `other`
- `quantity`: Number of units per dose. REAL type supports half-tablets etc.
- `color`: Nullable hex string from the predefined palette: `#EF4444`, `#F97316`, `#EAB308`, `#22C55E`, `#3B82F6`, `#8B5CF6`
- `current_stock` / `stock_threshold`: Nullable. When current_stock <= stock_threshold, a refill notification fires.

---

### Table: `reminder_drugs`

Many-to-many junction between reminders and drugs.

```sql
CREATE TABLE IF NOT EXISTS reminder_drugs (
  reminder_id TEXT NOT NULL,
  drug_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (reminder_id, drug_id),
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (drug_id) REFERENCES drugs(id) ON DELETE CASCADE
);
```

**Fields detail:**
- `sort_order`: Display order of the drug within the reminder's drug list
- CASCADE deletes ensure cleanup when either side is removed

---

### Table: `adherence_logs`

Tracks dose adherence per drug per reminder per day.

```sql
CREATE TABLE IF NOT EXISTS adherence_logs (
  id TEXT PRIMARY KEY,
  reminder_id TEXT NOT NULL,
  drug_id TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,               -- ISO date string (YYYY-MM-DD)
  status TEXT NOT NULL,             -- "taken" | "missed" | "skipped"
  taken_at INTEGER,                 -- Unix timestamp ms, set when status = "taken"
  notes TEXT,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);
```

**Fields detail:**
- `drug_id`: Empty string for legacy logs from before V2 migration; always populated for new entries
- `date`: ISO date string, used as the grouping key for calendar views
- `status`: Enum — `taken`, `missed`, `skipped`
- `taken_at`: Populated when status is `taken`; used to display "Taken at HH:MM AM/PM"
- Composite key for business logic: `(reminder_id, drug_id, date)` — only one log per drug per reminder per day

---

## Entity Relationships (ER Diagram)

```
┌─────────────┐       ┌──────────────────┐       ┌──────────┐
│  reminders  │───────│  reminder_drugs  │───────│   drugs  │
│             │  1:N  │                  │  N:1  │          │
│  id (PK)    │       │  reminder_id(FK) │       │  id (PK) │
│  name       │       │  drug_id (FK)    │       │  name    │
│  hour       │       │  sort_order      │       │  dosage  │
│  minute     │       └──────────────────┘       │  form    │
│  days       │                                  │  quantity│
│  is_active  │       ┌──────────────────┐       │  color   │
│  ...        │       │ adherence_logs   │       │  stock   │
└──────┬──────┘       │                  │       └──────────┘
       │              │  reminder_id(FK) │
       │              │  drug_id         │
       │              │  date            │
       │  1:N         │  status          │
       └─────────────>│  taken_at        │
                      │  notes           │
                      └──────────────────┘

┌─────────────┐
│  settings   │  (standalone key-value store)
│  key (PK)   │
│  value      │
└─────────────┘
```

---

## TypeScript / Rust Type Definitions

### Enums

```rust
// Rust enums for the rewrite
enum Weekday {
    Sunday = 0, Monday = 1, Tuesday = 2, Wednesday = 3,
    Thursday = 4, Friday = 5, Saturday = 6,
}

enum FrequencyType {
    Daily,
    Weekly,
    Custom,
}

enum DrugForm {
    Tablet,
    Capsule,
    Liquid,
    Injection,
    Patch,
    Inhaler,
    Drops,
    Other,
}

enum DoseStatus {
    Taken,
    Missed,
    Skipped,
}

enum ColorScheme {
    Light,
    Dark,
    System,
}

enum Locale {
    En,
    Id,
}
```

### Structs

```rust
struct Drug {
    id: String,
    name: String,
    dosage: String,
    form: DrugForm,
    quantity: f64,
    notes: Option<String>,
    color: Option<String>,
    current_stock: Option<f64>,
    stock_threshold: Option<f64>,
}

struct Reminder {
    id: String,
    name: String,
    hour: u32,
    minute: u32,
    days: Vec<Weekday>,
    is_active: bool,
    notification_ids: Vec<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    created_at: i64,
}

struct ReminderDrug {
    reminder_id: String,
    drug_id: String,
    sort_order: i32,
}

struct AdherenceLog {
    id: String,
    reminder_id: String,
    drug_id: String,
    date: String,         // YYYY-MM-DD
    status: DoseStatus,
    taken_at: Option<i64>,
    notes: Option<String>,
}
```

---

## Migration History

| Version | Changes |
|---------|---------|
| V1 | Initial schema: reminders with embedded `drugs` JSON column |
| V2 | Extracted drugs into separate table, created `reminder_drugs` junction, added `drug_id` to adherence_logs |
| V3 | Changed `quantity`, `current_stock`, `stock_threshold` from INTEGER to REAL for fractional dose support |

**For the rewrite:** Start at the V3 schema directly. No migration needed.

---

## Data Access Patterns

### Home Screen Queries
1. Load all active reminders where current weekday is in `days` and date is within start/end range
2. For each reminder, load linked drugs via `reminder_drugs` JOIN `drugs`
3. Load adherence logs for today's date, grouped by `(reminder_id, drug_id)`

### Calendar Queries
1. Load adherence logs for the selected month (date range filter)
2. Calculate stats: adherence %, streak, missed count
3. Load all reminders that were active on the selected date
4. Load per-drug status for the selected date

### Medications Screen Queries
1. Load all drugs
2. For each drug, load linked reminder names via `reminder_drugs` JOIN `reminders`

### Export Query
1. Load all rows from all 4 data tables
2. Serialize as JSON with table names as keys

---

## State Management Architecture

```
┌─────────────────────────────────────────────┐
│                  UI Layer                   │
│  (Components / Screens)                    │
└──────────┬──────────────┬──────────────────┘
           │              │
     ┌─────▼─────┐  ┌────▼─────┐
     │   Hooks   │  │  Contexts │
     │ useReminders │ ThemeProvider │
     │ useDrugs     │ LanguageProvider│
     │ useAdherence │               │
     └─────┬─────┘  └──────────────┘
           │
     ┌─────▼─────────────────────┐
     │      Zustand Store        │
     │  (adherence-store.ts)     │
     │  Optimistic updates       │
     └─────┬─────────────────────┘
           │
     ┌─────▼─────────────────────┐
     │     Event Bus             │
     │  reminderEvents           │
     │  drugEvents               │
     │  adherenceEvents          │
     │  (pub/sub for reactivity) │
     └─────┬─────────────────────┘
           │
     ┌─────▼─────────────────────┐
     │   Database Service        │
     │  (database.ts → SQLite)   │
     └───────────────────────────┘
```

**For the rewrite:** Replace Zustand + Event Bus with Dioxus signals/state management. The pub/sub event bus pattern maps well to Dioxus's reactive signal system.
