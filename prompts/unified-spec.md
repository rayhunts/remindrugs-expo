# Remindrugs — Unified Specification

> Resolved from `brainstorm-1.md`, `brainstorm-2.md`, and `ui-ux-suggestion.md`.
> This is the canonical reference for all implementation decisions.

---

## Resolved Stack Decisions

| Decision | Choice | Source |
|---|---|---|
| Storage | `expo-sqlite` (structured queries, JOINs, CASCADE) | brainstorm-2 |
| Calendar | `react-native-calendars` (pure JS, no native linking) | brainstorm-2 |
| Color palette | Blue-purple (`#5B6EF5`) semantic system | brainstorm-2 / ui-ux |
| Typography | Platform-native (SF on iOS, Roboto on Android) | brainstorm-2 |
| Animations | `react-native-reanimated` (already in package.json) | brainstorm-1 |
| Lists | `FlashList` from `@shopify/flash-list` | brainstorm-1 |
| Bottom sheets | `@gorhom/bottom-sheet` (native feel, gesture support) | brainstorm-1 |
| Data model | Reminder-centric (1 reminder = multiple drugs) | brainstorm-2 |
| Tabs | Today / Calendar / Reminders / Health | brainstorm-2 |
| Workflow | Start managed (Expo Go), add dev build for health/watch | hybrid |
| State | `useState` / `useReducer` / `useContext` — no Redux | brainstorm-2 |
| Styling | `StyleSheet.create()` — no third-party UI libraries | brainstorm-2 |

---

## Color Palette (`constants/colors.ts`)

```ts
export const Colors = {
  // Primary — calm blue-purple (trust + health)
  primary: "#5B6EF5",
  primaryLight: "#EEF0FE",
  primaryDark: "#3D52D5",

  // Semantic
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#EFF6FF",

  // Health-specific
  sleep: "#8B5CF6",
  sleepLight: "#F5F3FF",
  heartRate: "#F43F5E",
  heartRateLight: "#FFF1F2",
  steps: "#10B981",

  // Neutrals
  background: "#F5F6FA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  divider: "#F3F4F6",

  // Text
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textInverse: "#FFFFFF",

  // Drug form colors
  pill: {
    red: "#EF4444",
    orange: "#F97316",
    yellow: "#EAB308",
    green: "#22C55E",
    blue: "#3B82F6",
    purple: "#8B5CF6",
  },

  // Dark mode
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    border: "#334155",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
  },
};
```

---

## Typography (`constants/typography.ts`)

```ts
export const Typography = {
  fontFamily: Platform.select({
    ios: "System",
    android: "Roboto",
  }),

  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },   // minimum body text
  md: { fontSize: 17, lineHeight: 24 },    // primary labels
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 },    // time display
  "2xl": { fontSize: 32, lineHeight: 40 }, // hero metric (BPM, %)
  "3xl": { fontSize: 40, lineHeight: 48 }, // health stat hero number

  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
```

---

## Spacing & Layout (`constants/spacing.ts`)

```ts
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
};

export const Radius = {
  sm: 6,
  md: 12,   // cards, inputs
  lg: 16,   // large cards, health cards
  xl: 24,   // bottom sheets, modals
  full: 9999, // chips, badges, FAB
};

export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  fab: {
    shadowColor: "#5B6EF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
```

---

## Data Models

### `types/reminder.ts`

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FrequencyType = "daily" | "weekly" | "custom";
export type DrugForm = "tablet" | "capsule" | "liquid" | "injection" | "patch" | "inhaler" | "drops" | "other";

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
  drugs: Drug[];
  hour: number;
  minute: number;
  days: Weekday[];
  isActive: boolean;
  notificationIds: string[];
  startDate?: string;
  endDate?: string;
  createdAt: number;
}
```

### `types/adherence.ts`

```ts
export type DoseStatus = "taken" | "missed" | "skipped";

export interface AdherenceLog {
  id: string;
  reminderId: string;
  date: string;       // YYYY-MM-DD
  status: DoseStatus;
  takenAt?: number;
  notes?: string;
}
```

### `types/health.ts`

```ts
export interface SleepData {
  date: string;
  durationHours: number;
  quality?: "poor" | "fair" | "good";
  stages?: { awake: number; light: number; deep: number; rem: number };
}

export interface HeartRateData {
  date: string;
  averageBpm: number;
  restingBpm?: number;
  minBpm?: number;
  maxBpm?: number;
}

export interface HealthData {
  sleep: SleepData | null;
  heartRate: HeartRateData | null;
  steps?: number;
  lastUpdated: number;
}
```

---

## SQLite Schema (`services/database.ts`)

```sql
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
```

---

## Folder Structure

```
remindrugs/
├── app/
│   ├── _layout.tsx                  # Root layout: DB init, notification handler, splash
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Tab navigator (4 tabs)
│   │   ├── index.tsx                # Today — reminders + health snapshot
│   │   ├── calendar.tsx             # Calendar adherence view
│   │   ├── reminders.tsx            # All reminders management
│   │   └── health.tsx               # Health & watch dashboard
│   ├── add-reminder.tsx             # Add new reminder
│   ├── edit-reminder/
│   │   └── [id].tsx                 # Edit existing reminder
│   └── onboarding.tsx               # First-launch onboarding
├── components/
│   ├── reminder-card.tsx
│   ├── drug-list-item.tsx
│   ├── drug-form-row.tsx
│   ├── day-selector.tsx
│   ├── time-picker-field.tsx
│   ├── empty-state.tsx
│   ├── frequency-badge.tsx
│   ├── progress-bar.tsx
│   ├── skeleton-card.tsx
│   ├── permission-banner.tsx
│   ├── action-sheet.tsx
│   ├── section-header.tsx
│   ├── time-display.tsx
│   ├── health-stat-card.tsx
│   ├── adherence-heatmap.tsx
│   ├── watch-status-badge.tsx
│   ├── drug-chip.tsx
│   ├── insight-card.tsx
│   ├── stats-row.tsx
│   ├── toast-snackbar.tsx
│   └── notification-preview.tsx
├── hooks/
│   ├── use-reminders.ts
│   ├── use-adherence.ts
│   ├── use-health-data.ts
│   └── use-watch.ts
├── services/
│   ├── database.ts
│   ├── notification-service.ts
│   ├── health-service.ts
│   └── watch-service.ts
├── types/
│   ├── reminder.ts
│   ├── adherence.ts
│   └── health.ts
├── utils/
│   ├── date-helpers.ts
│   └── notification-helpers.ts
└── constants/
    ├── colors.ts
    ├── typography.ts
    └── spacing.ts
```

---

## Tab Structure (4 tabs)

| Tab | Icon | Screen |
|---|---|---|
| Today | `home` | `app/(tabs)/index.tsx` |
| Calendar | `calendar-month` | `app/(tabs)/calendar.tsx` |
| Reminders | `medical-bag` | `app/(tabs)/reminders.tsx` |
| Health | `heart-pulse` | `app/(tabs)/health.tsx` |

---

## Packages to Install

```bash
# Core
bunx expo install expo-sqlite
bunx expo install expo-notifications
bunx expo install expo-device

# Date/Time Picker
bunx expo install @react-native-community/datetimepicker

# Calendar
bunx expo install react-native-calendars

# Lists
bunx expo install @shopify/flash-list

# Bottom sheets
bunx expo install @gorhom/bottom-sheet
bunx expo install react-native-gesture-handler  # already installed

# Health (Bare Workflow only, add later)
# bun add react-native-health              # iOS
# bun add react-native-health-connect      # Android
```

---

## Implementation Order

1. **Types & constants** — `types/`, `constants/colors.ts`, `constants/typography.ts`, `constants/spacing.ts`
2. **Storage layer** — `services/database.ts` (schema, CRUD functions)
3. **Core hooks** — `hooks/use-reminders.ts`, `hooks/use-adherence.ts`
4. **Utility helpers** — `utils/date-helpers.ts`, `utils/notification-helpers.ts`
5. **Safe UI primitives** — `components/time-picker-field.tsx`, `components/day-selector.tsx`
6. **Notification service** — `services/notification-service.ts`
7. **Add Reminder screen** — `app/add-reminder.tsx` (the core input flow)
8. **Edit Reminder screen** — `app/edit-reminder/[id].tsx`
9. **Today Dashboard** — `app/(tabs)/index.tsx` (dose cards, progress bar, mark as taken)
10. **Calendar view** — `app/(tabs)/calendar.tsx` (adherence grid, day detail)
11. **Reminders list** — `app/(tabs)/reminders.tsx` (management screen)
12. **Onboarding** — `app/onboarding.tsx` (3-screen first-launch flow)
13. **Health integrations** — `app/(tabs)/health.tsx` (sleep, HR, watch)
14. **Polish** — animations, haptics, empty states, skeleton loading, edge cases

---

## Progress Tracker

| Phase | Status | Notes |
|---|---|---|
| 1. Types & constants | Done | types/, constants/ |
| 2. Storage layer | Done | services/database.ts |
| 3. Core hooks | Done | hooks/use-reminders.ts, use-adherence.ts |
| 4. Utility helpers | Done | utils/date-helpers.ts, notification-helpers.ts |
| 5. Safe UI primitives | Done | time-picker, day-selector, drug-chip, etc. |
| 6. Notification service | Done | services/notification-service.ts |
| 7. Add Reminder screen | Done | app/add-reminder.tsx |
| 8. Edit Reminder screen | Done | app/edit-reminder/[id].tsx |
| 9. Today Dashboard | Done | app/(tabs)/index.tsx |
| 10. Calendar view | Done | app/(tabs)/calendar.tsx |
| 11. Reminders list | Done | app/(tabs)/reminders.tsx |
| 12. Onboarding | Done | app/onboarding.tsx |
| 13. Health integrations | Done | app/(tabs)/health.tsx (placeholder) |
| 14. Polish | Not started | | |

---

## Key Rules

### React Native / Expo
- Always use `StyleSheet.create({})` — never inline styles
- `Platform.OS` checks wherever behavior differs
- `KeyboardAvoidingView` with platform-specific `behavior` on forms
- `ScrollView` with `keyboardShouldPersistTaps="handled"` on form screens
- `SafeAreaView` from `react-native-safe-area-context` on all screens
- `ActivityIndicator` while loading from SQLite
- Validate all form inputs before saving
- `try/catch` on notification scheduling and DB operations
- `FlashList` with `estimatedItemSize` for lists (drop-in replacement for `FlatList`)
- Never nest `ScrollView` inside `FlashList`
- Never render `DateTimePicker` on Android outside a modal

### Notifications
- Check and request permissions before scheduling
- Cancel existing notification IDs before rescheduling
- Store all `notificationIds` per reminder in DB
- Always assign `channelId` on Android
- Weekday mapping: app `0-6` → expo `1-7` (add 1)
- Never use `CalendarTriggerInput` (not supported on Android)

### SQLite
- Use `openDatabaseSync` (SDK 52+ API)
- Serialize arrays/objects as `JSON.stringify` before storing
- Deserialize with `JSON.parse` when reading
- Call `initDatabase()` once at app startup

### Code Quality
- TypeScript strict, no `any`
- Kebab-case file names, PascalCase component/type names
- `useCallback` / `useMemo` for performance in lists
- Extract reusable logic into hooks and services — keep screens thin
- `accessibilityLabel` on all interactive elements
- Touch targets minimum 44x44pt (iOS) / 48x48dp (Android)
- WCAG AA contrast (4.5:1 minimum for body text)

---

_Reference: brainstorm-1.md, brainstorm-2.md, ui-ux-suggestion.md_
