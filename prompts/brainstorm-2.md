# Remindrugs — Claude Code Prompt

## Project Overview

Build **Remindrugs**, a mobile app built with **Expo (SDK 52+, Bare Workflow via EAS Build)** that helps users remember to take their medications on a daily, weekly, or custom periodic schedule. All data is stored **locally on the device** using `expo-sqlite`. The app sends **local scheduled notifications** via `expo-notifications`, supports a **calendar-based adherence view**, allows **multiple drugs per reminder**, and optionally integrates with **Apple HealthKit** (iOS) and **Android Health Connect** to read sleep and heart rate data from smartwatches and health platforms.

The project was already initialized with `npx create-expo-app remindrugs` and uses the **default Expo boilerplate** with **Expo Router** (file-based routing).

---

## Tech Stack & Constraints

| Concern               | Solution                                                           |
| --------------------- | ------------------------------------------------------------------ |
| Framework             | Expo SDK 52+ (Bare Workflow) with Expo Router                      |
| Language              | TypeScript (strict mode)                                           |
| Styling               | React Native `StyleSheet` — **no third-party UI libraries**        |
| Local storage         | `expo-sqlite` (structured data)                                    |
| Notifications         | `expo-notifications` (local only, no push)                         |
| Date/Time picker      | `@react-native-community/datetimepicker` via `npx expo install`    |
| Calendar UI           | `react-native-calendars` (Wix, pure JS, no native linking needed)  |
| Navigation            | Expo Router (file-based, tab + stack)                              |
| State                 | React `useState` / `useReducer` / `useContext` — no Redux          |
| Health data (iOS)     | `react-native-health` (HealthKit — sleep, heart rate)              |
| Health data (Android) | `react-native-health-connect` (Health Connect — sleep, heart rate) |
| Watch (iOS)           | `react-native-watch-connectivity` (Apple Watch messaging bridge)   |
| Watch (Android)       | `react-native-wear-connectivity` (WearOS messaging bridge)         |

> ⚠️ **Bare Workflow note**: Health and watch libraries require native code and will NOT work in Expo Go. Use `npx expo run:ios` / `npx expo run:android` or EAS Build. Always gate these features with `Platform.OS` checks and graceful fallbacks.

---

## File & Folder Conventions

Follow the **default Expo boilerplate** convention strictly:

- **File names**: `kebab-case` for all files and folders (e.g., `add-reminder.tsx`, `use-reminders.ts`, `reminder-card.tsx`)
- **Component names**: PascalCase inside the file (e.g., `export default function ReminderCard`)
- **Hooks**: prefix with `use-` in filename (e.g., `use-reminders.ts`) and `use` inside the file
- **Constants/utils**: `kebab-case` files under `utils/` or `constants/`
- **Types**: centralized in `types/`

### Folder Structure

```
remindrugs/
├── app/
│   ├── _layout.tsx                  # Root layout: notification handler, DB init
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Tab navigator layout (4 tabs)
│   │   ├── index.tsx                # Home — today's reminders + health snapshot
│   │   ├── calendar.tsx             # Calendar adherence tracking view
│   │   ├── reminders.tsx            # All reminders management screen
│   │   └── health.tsx               # Health & watch data dashboard (optional)
│   ├── add-reminder.tsx             # Add new reminder (modal or stack screen)
│   ├── edit-reminder/
│   │   └── [id].tsx                 # Edit existing reminder by ID
│   └── onboarding.tsx               # First-launch onboarding flow
├── components/
│   ├── reminder-card.tsx            # Card UI for a single reminder
│   ├── drug-list-item.tsx           # Row for one drug inside a reminder
│   ├── drug-form-row.tsx            # Inline form row for adding a drug to a reminder
│   ├── day-selector.tsx             # Weekday multi-select UI component
│   ├── time-picker-field.tsx        # Cross-platform time picker wrapper
│   ├── empty-state.tsx              # Empty list illustration/message
│   ├── frequency-badge.tsx          # Color-coded Daily/Weekly/Custom pill
│   ├── progress-bar.tsx             # Animated adherence progress bar
│   ├── skeleton-card.tsx            # Loading shimmer placeholder
│   ├── permission-banner.tsx        # Inline notification-off warning
│   ├── action-sheet.tsx             # Bottom sheet for long-press options
│   ├── section-header.tsx           # Styled FlatList section title
│   ├── time-display.tsx             # Bold HH:MM AM/PM display component
│   ├── health-stat-card.tsx         # Sleep/heart rate metric card
│   ├── adherence-heatmap.tsx        # Calendar day dot coloring component
│   └── watch-status-badge.tsx       # Watch connectivity status indicator
├── hooks/
│   ├── use-reminders.ts             # CRUD operations + notification scheduling
│   ├── use-adherence.ts             # Log/query dose-taken history
│   ├── use-health-data.ts           # Unified HealthKit + Health Connect hook
│   └── use-watch.ts                 # Apple Watch / WearOS connectivity hook
├── services/
│   ├── database.ts                  # expo-sqlite setup, migrations, queries
│   ├── notification-service.ts      # Notification scheduling/cancellation logic
│   ├── health-service.ts            # HealthKit (iOS) + Health Connect (Android)
│   └── watch-service.ts             # Watch connectivity bridge
├── types/
│   ├── reminder.ts                  # Reminder, Drug, Weekday, FrequencyType
│   ├── adherence.ts                 # AdherenceLog, DoseStatus
│   └── health.ts                    # HealthData, SleepData, HeartRateData
├── utils/
│   ├── date-helpers.ts              # Day name mapping, formatting utilities
│   └── notification-helpers.ts     # Build trigger inputs from reminder config
└── constants/
    └── colors.ts                    # App color palette & theme tokens
```

---

## Data Models

### `types/reminder.ts`

```ts
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// Maps to expo-notifications WeeklyTriggerInput: weekday is 1–7 (1 = Sunday)

export type FrequencyType = "daily" | "weekly" | "custom";

export interface Drug {
  id: string; // UUID
  name: string; // e.g., "Metformin"
  dosage: string; // e.g., "500mg"
  form: DrugForm; // tablet, capsule, liquid, injection, patch, inhaler, drops
  quantity: number; // how many units per dose (e.g., 2 tablets)
  notes?: string; // Optional instructions e.g. "take with food"
  color?: string; // Optional pill color hex for visual identification
  currentStock?: number; // pill count for refill reminder
  stockThreshold?: number; // alert when stock ≤ this number
}

export type DrugForm = "tablet" | "capsule" | "liquid" | "injection" | "patch" | "inhaler" | "drops" | "other";

export interface Reminder {
  id: string; // UUID
  name: string; // Reminder set name e.g. "Morning Meds"
  drugs: Drug[]; // 1 or more drugs in this reminder
  hour: number; // 0–23
  minute: number; // 0–59
  days: Weekday[]; // Selected days of the week (0–6)
  // If days.length === 7  → frequency = 'daily'
  // If days.length === 1  → frequency = 'weekly'
  // If 1 < days.length < 7 → frequency = 'custom'
  isActive: boolean; // Whether notifications are enabled
  notificationIds: string[]; // Stored expo-notifications identifiers
  startDate?: string; // Optional ISO date string — start of schedule
  endDate?: string; // Optional ISO date string — end of schedule (e.g., antibiotics)
  createdAt: number; // Unix timestamp
}
```

### `types/adherence.ts`

```ts
export type DoseStatus = "taken" | "missed" | "skipped";

export interface AdherenceLog {
  id: string; // UUID
  reminderId: string; // FK to Reminder.id
  date: string; // YYYY-MM-DD
  status: DoseStatus;
  takenAt?: number; // Unix timestamp when actually taken (for "taken")
  notes?: string; // Optional user note (e.g., "felt nauseous")
}
```

### `types/health.ts`

```ts
export interface SleepData {
  date: string; // YYYY-MM-DD
  durationHours: number;
  quality?: "poor" | "fair" | "good"; // derived from duration
  stages?: {
    awake: number;
    light: number;
    deep: number;
    rem: number;
  };
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
  lastUpdated: number; // Unix timestamp
}
```

---

## Local Database — `services/database.ts`

Use `expo-sqlite` with the **new API** (SDK 52+):

```ts
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("remindrugs.db");
```

### Schema (run on app startup in `_layout.tsx`)

```sql
-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,                         -- Reminder set name e.g. "Morning Meds"
  drugs TEXT NOT NULL DEFAULT '[]',           -- JSON array of Drug objects
  hour INTEGER NOT NULL,
  minute INTEGER NOT NULL,
  days TEXT NOT NULL,                         -- JSON array: "[0,1,2,3,4,5,6]"
  is_active INTEGER NOT NULL DEFAULT 1,
  notification_ids TEXT NOT NULL DEFAULT '[]',
  start_date TEXT,                            -- ISO date string or NULL
  end_date TEXT,                              -- ISO date string or NULL
  created_at INTEGER NOT NULL
);

-- Adherence log table
CREATE TABLE IF NOT EXISTS adherence_logs (
  id TEXT PRIMARY KEY NOT NULL,
  reminder_id TEXT NOT NULL,
  date TEXT NOT NULL,                         -- YYYY-MM-DD
  status TEXT NOT NULL,                       -- 'taken' | 'missed' | 'skipped'
  taken_at INTEGER,                           -- Unix timestamp or NULL
  notes TEXT,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);
```

### Required database functions

**Reminders:**

- `initDatabase()` — creates tables, runs on app boot
- `getAllReminders(): Reminder[]`
- `getReminderById(id: string): Reminder | null`
- `insertReminder(reminder: Reminder): void`
- `updateReminder(reminder: Reminder): void`
- `deleteReminder(id: string): void`
- `toggleReminderActive(id: string, isActive: boolean): void`

**Adherence:**

- `logDose(log: AdherenceLog): void`
- `getLogsForDate(date: string): AdherenceLog[]`
- `getLogsForRange(startDate: string, endDate: string): AdherenceLog[]`
- `getLogsForReminder(reminderId: string): AdherenceLog[]`
- `updateLogStatus(id: string, status: DoseStatus): void`
- `deleteLog(id: string): void`

Serialize/deserialize `days`, `notificationIds`, and `drugs` as JSON strings in SQLite.

---

## Notification Logic — `services/notification-service.ts`

### Setup (call once in `app/_layout.tsx`):

```ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Android requires a notification channel
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("remindrugs-channel", {
    name: "Medication Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
  });
}
```

### Permission request:

```ts
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
```

### Scheduling logic

For each `day` in `reminder.days`, schedule **one `WeeklyTriggerInput`** notification. This naturally becomes "daily" when all 7 days are selected. The notification body lists all drug names in the reminder.

```ts
import { SchedulableTriggerInputTypes } from "expo-notifications";

// expo-notifications weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
// App internal Weekday:       0 = Sunday, 1 = Monday, ..., 6 = Saturday
// Conversion: expoWeekday = appDay + 1

function buildNotificationBody(reminder: Reminder): string {
  const drugList = reminder.drugs.map((d) => `${d.name} ${d.dosage}`).join(", ");
  return `Time to take: ${drugList}`;
}

async function scheduleForDay(reminder: Reminder, day: Weekday): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 ${reminder.name}`,
      body: buildNotificationBody(reminder),
      sound: true,
      data: { reminderId: reminder.id },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: day + 1, // convert: 0→1, 1→2, ..., 6→7
      hour: reminder.hour,
      minute: reminder.minute,
      channelId: "remindrugs-channel", // Android only, ignored on iOS
    },
  });
  return id;
}

export async function scheduleReminder(reminder: Reminder): Promise<string[]> {
  const ids: string[] = [];
  for (const day of reminder.days) {
    const id = await scheduleForDay(reminder, day);
    ids.push(id);
  }
  return ids;
}

export async function cancelReminder(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function rescheduleReminder(reminder: Reminder): Promise<string[]> {
  await cancelReminder(reminder.notificationIds);
  return scheduleReminder(reminder);
}
```

### Refill Reminder Notifications

When any drug in a reminder has `currentStock` defined and it reaches or falls below `stockThreshold`, schedule a one-time notification:

```ts
export async function scheduleRefillReminder(drug: Drug, reminderId: string): Promise<void> {
  if (drug.currentStock === undefined || drug.stockThreshold === undefined) return;
  if (drug.currentStock > drug.stockThreshold) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔴 Refill Needed: ${drug.name}`,
      body: `You only have ${drug.currentStock} ${drug.form}(s) left. Time to refill!`,
      data: { reminderId, drugId: drug.id, type: "refill" },
    },
    trigger: null, // immediate
  });
}
```

---

## Date/Time Picker — `components/time-picker-field.tsx`

Install: `npx expo install @react-native-community/datetimepicker`

Use **platform-aware rendering** to avoid UI issues on Android vs iOS:

```tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, Modal, View } from "react-native";

// On Android: show picker only inside a Modal (triggered by a button press)
// because Android DateTimePicker renders as a dialog, not inline.
// On iOS: render inline with display="spinner" or display="compact".

// Pattern:
// - Android: <Pressable onPress={() => setShow(true)}><Text>{time}</Text></Pressable>
//            {show && <DateTimePicker mode="time" display="default" onChange={handleChange} />}
// - iOS: <DateTimePicker mode="time" display="spinner" />
```

**Never** render `DateTimePicker` directly inside a `ScrollView` on Android without a Modal wrapper — it breaks layout.

---

## Weekday Selector — `components/day-selector.tsx`

Build a custom horizontal row of 7 pressable day chips (S M T W T F S). Style selected days with the primary color, unselected as outlined. Must include a **"All" / "Clear" shortcut button**. This must be a **pure React Native** component using `Pressable`, `Text`, and `StyleSheet`.

```tsx
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
// index 0 = Sunday, 6 = Saturday (matches Weekday type)
```

---

## Multi-Drug Per Reminder — Key Implementation Notes

Each `Reminder` has a `drugs: Drug[]` array (minimum 1). In the Add/Edit form:

1. Show a list of added drugs — each row is `drug-form-row.tsx`
2. Provide an **"+ Add Drug"** button to append a new empty `Drug` to the list
3. Each drug row has: Name, Dosage, Form (picker), Quantity (numeric), Notes, Color (optional), Stock count (optional)
4. Allow swiping or a delete icon to remove a drug from the list (minimum 1 must remain)
5. The notification body lists all drugs: `"Time to take: Metformin 500mg, Vitamin D 1000IU"`

### `DrugFormRow` component (`components/drug-form-row.tsx`):

- Drug Name: `TextInput`
- Dosage: `TextInput` (e.g., "500mg")
- Form: a custom picker (flat row of chips: 💊 Tablet, 💊 Capsule, 💧 Liquid, 💉 Injection, 🩹 Patch, 🫁 Inhaler, 👁️ Drops)
- Quantity: numeric `TextInput`
- Notes: optional `TextInput`
- Stock: optional numeric `TextInput` + threshold `TextInput`
- Color dot: 6 preset color swatches (red, orange, yellow, green, blue, purple)

---

## Calendar Adherence Tracking — `app/(tabs)/calendar.tsx`

Use `react-native-calendars` (pure JS, no native linking):

```bash
npx expo install react-native-calendars
```

### Calendar screen features:

1. **Month calendar view** using `<Calendar>` from `react-native-calendars`
2. Each day is **color-coded** by adherence:
   - 🟢 Green dot — all doses taken
   - 🟡 Amber dot — some taken, some missed
   - 🔴 Red dot — all missed
   - ⚪ Grey — no reminders scheduled
3. Tap a day to see a **Day Detail** panel (FlatList below the calendar) showing:
   - Each reminder scheduled that day
   - Each drug within the reminder
   - Status: Taken ✓ / Missed ✗ / Skipped —
   - Ability to retroactively mark a dose (within the past 7 days only)
4. **Monthly summary stats** above the calendar:
   - Adherence % this month
   - Streak (consecutive days with all doses taken)
   - Most missed reminder

### `hooks/use-adherence.ts` must expose:

```ts
export function useAdherence() {
  return {
    logs: AdherenceLog[],
    logDose: (reminderId: string, date: string, status: DoseStatus) => Promise<void>,
    markTaken: (reminderId: string, date?: string) => Promise<void>,  // defaults to today
    markMissed: (reminderId: string, date: string) => Promise<void>,
    getMonthlyStats: (year: number, month: number) => {
      adherencePercent: number;
      streak: number;
      totalDoses: number;
      takenDoses: number;
      missedDoses: number;
    },
    getMarkedDates: (year: number, month: number) => Record<string, { dots: Array<{color: string}> }>,
    // Returns format compatible with react-native-calendars `markedDates` prop
  }
}
```

### Adherence color logic in `utils/date-helpers.ts`:

```ts
export function getAdherenceColor(taken: number, total: number): string {
  if (total === 0) return Colors.border; // no reminders
  if (taken === total) return Colors.success; // all taken
  if (taken === 0) return Colors.danger; // all missed
  return Colors.warning; // partial
}
```

---

## Health & Smartwatch Integration — `services/health-service.ts`

> This is an **optional but included** feature. Always wrap in `try/catch` and provide graceful fallbacks when health data is unavailable.

### Platform Strategy

| Platform | Library                       | Data Source                                                     |
| -------- | ----------------------------- | --------------------------------------------------------------- |
| iOS      | `react-native-health`         | Apple HealthKit (reads from Apple Watch, Fitbit via Health app) |
| Android  | `react-native-health-connect` | Health Connect (reads from Wear OS, Fitbit, Samsung Health)     |

### Install

```bash
npx expo install react-native-health          # iOS only
npx expo install react-native-health-connect  # Android only
```

### Unified hook — `hooks/use-health-data.ts`

```ts
import { Platform } from "react-native";

export function useHealthData() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const initialize = async () => {
    if (Platform.OS === "ios") {
      // Use react-native-health / AppleHealthKit
      // Request: SleepAnalysis, HeartRate, RestingHeartRate
    } else if (Platform.OS === "android") {
      // Use react-native-health-connect
      // Request: SleepSession, HeartRate
    }
  };

  const fetchTodayData = async (): Promise<HealthData> => {
    // iOS: AppleHealthKit.getSleepSamples + getHeartRateSamples
    // Android: readRecords('SleepSession') + readRecords('HeartRate')
    // Return normalized HealthData object
  };

  return { healthData, isAvailable, permissionGranted, initialize, fetchTodayData, refetch: fetchTodayData };
}
```

### Data to Display (in `app/(tabs)/health.tsx` and home screen snapshot card)

- 😴 **Last night's sleep**: duration (e.g., "7h 23m"), quality badge (Poor/Fair/Good)
- ❤️ **Resting heart rate**: BPM from this morning
- 🚶 **Steps today** (bonus, if available)
- 🕐 **Last updated** timestamp

### Sleep + Medication Insight (smart feature)

In `app/(tabs)/health.tsx`, show a simple insight card:

> _"You slept 5h last night — poor sleep can reduce medication effectiveness. Try to get 7–9 hours."_

Logic: if `sleep.durationHours < 6`, show the warning. Use a static insight string, no AI required.

### `app.json` additions for Health permissions

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "Remindrugs reads your sleep and heart rate data to provide health insights alongside your medication schedule.",
        "NSHealthUpdateUsageDescription": "Remindrugs does not write health data."
      }
    },
    "android": {
      "permissions": ["android.permission.health.READ_SLEEP", "android.permission.health.READ_HEART_RATE", "android.permission.SCHEDULE_EXACT_ALARM", "android.permission.RECEIVE_BOOT_COMPLETED"]
    }
  }
}
```

---

## Smartwatch Connectivity — `services/watch-service.ts`

> Requires **Bare Workflow** + EAS Build. Not available in Expo Go.

### Apple Watch (iOS)

Library: `react-native-watch-connectivity`

```bash
npm install react-native-watch-connectivity
cd ios && pod install
```

The watch app itself must be written natively in Swift/WatchKit. The React Native side communicates via message bridge.

**Messages to send to watch:**

- `{ type: 'TODAY_REMINDERS', reminders: [...] }` — on app open
- `{ type: 'MARK_TAKEN', reminderId: string }` — when user marks from phone

**Messages to receive from watch:**

- `{ type: 'MARK_TAKEN', reminderId: string }` — watch user taps "Taken"

### WearOS / Android

Library: `react-native-wear-connectivity`

```bash
npm install react-native-wear-connectivity
```

Same message pattern as above.

### `hooks/use-watch.ts`

```ts
import { Platform } from "react-native";

export function useWatch() {
  const [isReachable, setIsReachable] = useState(false);
  const [isPaired, setIsPaired] = useState(false);

  // On iOS: use react-native-watch-connectivity hooks
  // On Android: use react-native-wear-connectivity events
  // Always Platform.OS gate — don't import watch libs on wrong platform

  const sendTodayReminders = (reminders: Reminder[]) => {
    /* ... */
  };
  const sendMarkTaken = (reminderId: string) => {
    /* ... */
  };

  return { isReachable, isPaired, sendTodayReminders, sendMarkTaken };
}
```

### `components/watch-status-badge.tsx`

Shows a small badge in the Health tab header:

- 🟢 "Watch Connected" (green)
- 🟡 "Watch Paired" (amber — paired but out of range)
- ⚫ "No Watch" (grey — not paired)

---

## Screen Designs & UI Principles

### Design Language

- **Color palette**: Define in `constants/colors.ts` (see `ui-ux-suggestions.md` for full token set)
  - Primary: `#5B6EF5` (calm blue-purple)
  - Success: `#22C55E`
  - Warning: `#F59E0B`
  - Danger: `#EF4444`
  - Background: `#F5F6FA`
  - Card: `#FFFFFF`
  - Text primary: `#111827`
  - Text secondary: `#6B7280`

- **Typography**: Use `Platform.select` for font families where needed
- **Spacing**: Use an 8px grid (8, 16, 24, 32)
- **Border radius**: 12px for cards, 8px for inputs, 50 for pills/chips
- **Shadows**: Use `elevation` on Android, `shadowColor/shadowOffset/shadowOpacity/shadowRadius` on iOS

### Tab Bar (4 Tabs)

| Tab       | Icon                | Screen          |
| --------- | ------------------- | --------------- |
| Today     | 🏠 `home`           | `index.tsx`     |
| Calendar  | 📅 `calendar-month` | `calendar.tsx`  |
| Reminders | 💊 `medical-bag`    | `reminders.tsx` |
| Health    | ❤️ `heart-pulse`    | `health.tsx`    |

### Home Screen (`app/(tabs)/index.tsx`)

- Time-of-day greeting header ("Good morning, [name]! ☀️")
- Today's adherence progress bar ("3 of 5 doses taken")
- Health snapshot card (sleep + resting HR — compact, 2 columns)
- Watch status badge (if paired)
- `FlatList` of today's `ReminderCard` components
- Each card: reminder name, drug list (inline chips), time, frequency badge, **"Mark as Taken"** CTA button
- FAB (+) to navigate to `add-reminder`
- Empty state if no reminders today

### Calendar Screen (`app/(tabs)/calendar.tsx`)

- Monthly calendar with colored dot markers
- Summary stats row (adherence %, streak, missed count)
- Selected day panel below calendar: list of reminders + mark-status buttons
- Month/year navigation built into `react-native-calendars`

### All Reminders Screen (`app/(tabs)/reminders.tsx`)

- Active / Inactive section headers
- Each card shows: reminder name, drug count + names, time, frequency badge
- Long-press or swipe → action sheet (Edit / Toggle / Delete)
- Toggle switch per card
- Edit navigates to `edit-reminder/[id]`

### Health Screen (`app/(tabs)/health.tsx`)

- `WatchStatusBadge` in header
- Sleep card: duration bar, quality badge
- Heart rate card: large BPM number, min/max range
- Steps card (if available)
- Smart insight card (sleep warning if < 6 hours)
- "Request Permissions" button if not granted yet
- Platform-specific messaging: "Connect Apple Watch via the Health app" / "Connect Wear OS watch via Health Connect"

### Add/Edit Reminder Screen (`app/add-reminder.tsx`, `app/edit-reminder/[id].tsx`)

**Section 1 — Reminder Info:**

- Reminder Name (TextInput) e.g. "Morning Meds"
- Time picker (`time-picker-field.tsx`)
- Day selector (`day-selector.tsx`) — live frequency label updates
- Start Date / End Date (optional, for temporary meds like antibiotics)

**Section 2 — Drugs:**

- List of `DrugFormRow` components
- "＋ Add Another Drug" button
- Each drug: Name, Dosage, Form chips, Quantity, Notes, Color swatch, Stock count + threshold

**Section 3 — Actions:**

- Save button (validates → schedules → saves → navigates back)
- On edit: pre-populates all fields, reschedules notifications on save
- Delete button (edit only) — confirmation action sheet before deleting

### Reminder Card (`components/reminder-card.tsx`)

```
┌──────────────────────────────────────────────┐
│ ● Morning Meds                    [DAILY]    │
│   💊 Metformin 500mg  💊 Vitamin D 1000IU   │
│   08:00 AM                     Mon–Fri       │
│                         [✓ Mark as Taken]    │
└──────────────────────────────────────────────┘
```

- Left color stripe: green (active) / grey (inactive)
- Frequency badge: "Daily" (green), "Weekly" (blue), "Custom" (orange)
- Drug chips inline (truncated if > 3 drugs: "Metformin +2 more")
- "Mark as Taken" button — only on Home screen cards, not All Reminders

---

## `hooks/use-reminders.ts`

Custom hook exposing:

```ts
export function useReminders() {
  return {
    reminders: Reminder[],
    todayReminders: Reminder[],         // filtered by current weekday + date range
    addReminder: (data: Omit<Reminder, 'id' | 'notificationIds' | 'createdAt'>) => Promise<void>,
    updateReminder: (reminder: Reminder) => Promise<void>,
    deleteReminder: (id: string) => Promise<void>,
    toggleActive: (id: string, isActive: boolean) => Promise<void>,
    refreshReminders: () => void,
  }
}
```

This hook also:

- Checks `startDate` / `endDate` when computing `todayReminders` — exclude reminders outside their date range
- Decrements `drug.currentStock` when `markTaken` is called (via `useAdherence`)
- Triggers `scheduleRefillReminder()` if stock drops to or below threshold

---

## Frequency Detection Utility — `utils/date-helpers.ts`

```ts
export function getFrequencyLabel(days: Weekday[]): "Daily" | "Weekly" | "Custom" {
  if (days.length === 7) return "Daily";
  if (days.length === 1) return "Weekly";
  return "Custom";
}

export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
}

export function getTodayWeekday(): Weekday {
  return new Date().getDay() as Weekday; // 0 = Sunday
}

export function getDayAbbreviations(days: Weekday[]): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((d) => names[d]).join(" ");
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getAdherenceColor(taken: number, total: number): string {
  if (total === 0) return "#E5E7EB";
  if (taken === total) return "#22C55E";
  if (taken === 0) return "#EF4444";
  return "#F59E0B";
}

export function calculateStreak(logs: AdherenceLog[]): number {
  // Count consecutive days (backwards from today) where all doses were taken
  // Return streak count
}

export function getMonthAdherencePercent(logs: AdherenceLog[]): number {
  const taken = logs.filter((l) => l.status === "taken").length;
  return logs.length === 0 ? 0 : Math.round((taken / logs.length) * 100);
}
```

---

## App Initialization — `app/_layout.tsx`

On mount (in a `useEffect` or via `SplashScreen.preventAutoHideAsync` pattern):

1. Call `initDatabase()` to set up SQLite tables
2. Call `requestNotificationPermissions()` — show rationale if denied
3. Set up `Notifications.setNotificationHandler(...)` at module level (outside component)
4. Set up Android notification channel
5. Check `hasSeenOnboarding` in SQLite — route to `onboarding.tsx` if false
6. Hide splash screen after init

```tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { initDatabase } from "../services/database";
import { requestNotificationPermissions } from "../services/notification-service";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      try {
        initDatabase();
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("remindrugs-channel", {
            name: "Medication Reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          });
        }
        await requestNotificationPermissions();
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    init();
  }, []);

  return <Stack />;
}
```

---

## Packages to Install

Run these with `npx expo install` (not `npm install`) to ensure SDK-compatible versions:

```bash
# Core
npx expo install expo-sqlite
npx expo install expo-notifications
npx expo install expo-device
npx expo install expo-splash-screen
npx expo install expo-haptics

# Date/Time Picker
npx expo install @react-native-community/datetimepicker

# Calendar UI (pure JS, no native linking)
npx expo install react-native-calendars

# Health data (platform-specific)
npx expo install react-native-health              # iOS / HealthKit
npx expo install react-native-health-connect      # Android / Health Connect

# Watch connectivity (native, Bare Workflow only)
npm install react-native-watch-connectivity       # iOS / Apple Watch
npm install react-native-wear-connectivity        # Android / WearOS

# Safe area + vector icons (usually pre-installed by Expo boilerplate)
npx expo install react-native-safe-area-context
npx expo install @expo/vector-icons
```

---

## `app.json` Configuration

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#5B6EF5",
          "defaultChannel": "remindrugs-channel"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "Remindrugs reads your sleep and heart rate data to show health insights alongside your medication schedule.",
        "NSHealthUpdateUsageDescription": "Remindrugs does not write health data."
      }
    },
    "android": {
      "permissions": ["android.permission.SCHEDULE_EXACT_ALARM", "android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.health.READ_SLEEP", "android.permission.health.READ_HEART_RATE", "android.permission.health.READ_STEPS"]
    }
  }
}
```

---

## Key Rules & Best Practices

### React Native / Expo

- ✅ Always use `StyleSheet.create({})` — never inline styles in JSX
- ✅ Use `Platform.OS === 'android'` checks wherever behavior differs
- ✅ Use `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` on forms
- ✅ Use `ScrollView` with `keyboardShouldPersistTaps="handled"` on form screens
- ✅ Use `SafeAreaView` from `react-native-safe-area-context` on all screens
- ✅ Use `ActivityIndicator` while loading data from SQLite
- ✅ Validate all form inputs before saving (non-empty reminder name, at least 1 drug, at least 1 day selected)
- ✅ Always `try/catch` notification scheduling and DB operations — show user-friendly `Alert` on error
- ✅ Use `FlatList` (not `map` + `ScrollView`) for long reminder lists
- ✅ Add `keyExtractor` to all `FlatList` components
- ❌ Never use `View` without explicit `flex` or dimensions at the root of a screen
- ❌ Never nest `ScrollView` inside `FlatList` or vice versa
- ❌ Never render `DateTimePicker` on Android outside a modal/dialog pattern

### Notifications

- ✅ Always check and request permissions before scheduling
- ✅ Cancel existing notification IDs before rescheduling (avoid duplicates)
- ✅ Store all `notificationIds` per reminder in the DB so they can be cancelled later
- ✅ On Android, always assign `channelId` in the trigger
- ✅ Weekday mapping: app day `0–6` → expo `weekday` `1–7` (add 1)
- ❌ Never use `CalendarTriggerInput` — it is **not supported on Android**
- ❌ Never assume notifications fire in Expo Go on a simulator — test on a physical device

### SQLite

- ✅ Use `openDatabaseSync` (new SDK 52 API)
- ✅ Serialize arrays and objects (`days`, `notificationIds`, `drugs`) as `JSON.stringify` before storing
- ✅ Deserialize with `JSON.parse` when reading
- ✅ Call `initDatabase()` once at app startup, not per component
- ❌ Never use the deprecated legacy `expo-sqlite` API

### Health & Watch Integration

- ✅ Always gate health/watch imports with `Platform.OS` to avoid cross-platform crashes
- ✅ Wrap all health API calls in `try/catch` — health permissions can be revoked at any time
- ✅ Show a clear empty/unavailable state if health data cannot be retrieved
- ✅ Never block the main app flow on health permissions — they are optional
- ✅ Cache last-known health data in SQLite so it survives app restarts
- ❌ Never import `react-native-watch-connectivity` on Android or `react-native-wear-connectivity` on iOS

### Code Quality

- ✅ All components and hooks must be typed with TypeScript
- ✅ Extract reusable logic into hooks and services — keep screens thin
- ✅ Use `useCallback` and `useMemo` for performance in lists
- ✅ Follow kebab-case for file names, PascalCase for component/type names
- ❌ Never use `any` type — define proper interfaces

---

## UI/UX Reference

A detailed UI/UX design guide lives in **`ui-ux-suggestions.md`** alongside this file. It covers:

- Full color palette & dark mode tokens
- Typography scale & minimum sizes for accessibility
- Home screen header with time-of-day greeting & health snapshot
- Reminder card with left-border status, drug chips, "Mark as Taken" CTA
- Multi-drug form UX: drug form rows, form chip selectors, stock tracking UI
- Calendar adherence view: dot colors, day detail panel, monthly stats
- Health dashboard: sleep card, heart rate card, insight card, watch status
- Today's adherence progress bar
- Empty state designs for every screen
- Form UX: inline validation, progressive disclosure, live frequency label
- Day selector: "Select All / Clear All" shortcut, haptic feedback
- Micro-interactions & animation specs (Animated API)
- Notification pre-permission explanation screen + denied-state banner
- Accessibility (A11y) checklist
- Loading skeleton cards & error states
- Haptic feedback map (using `expo-haptics`)
- Onboarding flow (3 steps, first-launch detection)
- Visual hierarchy table (what's most important on every card)
- Additional component suggestions
- Quick wins list — highest impact, lowest effort

> Always consult `ui-ux-suggestions.md` when making any styling, layout, or interaction decision.

---

## Acceptance Criteria

- [ ] App launches and initializes SQLite database without errors
- [ ] User can create a reminder with a custom name and add multiple drugs to it
- [ ] Each drug has name, dosage, form, quantity — all validated before save
- [ ] Selecting all 7 days shows "Daily" frequency label (live update)
- [ ] Selecting 1 day shows "Weekly" frequency label
- [ ] Selecting 2–6 days shows "Custom" frequency label
- [ ] Notifications are scheduled correctly for each selected weekday at the given time
- [ ] Notification body lists all drugs in the reminder
- [ ] Cancelling/toggling off a reminder cancels its scheduled notifications
- [ ] Editing a reminder reschedules its notifications
- [ ] Start/End date range is respected — reminders outside range don't appear in Today
- [ ] Home screen shows only today's active reminders with "Mark as Taken" button
- [ ] "Mark as Taken" logs to `adherence_logs` table
- [ ] Calendar screen shows color-coded adherence dots for past 30 days
- [ ] Tapping a calendar day shows that day's reminder + dose log detail
- [ ] Monthly adherence % and streak are correctly calculated
- [ ] Health tab shows sleep and heart rate data (or graceful unavailable state)
- [ ] Health permissions are optional — declining them does not break the app
- [ ] Watch tab/badge shows connectivity state (or graceful "no watch" state)
- [ ] Refill notification fires when drug stock reaches threshold
- [ ] Date/time picker works correctly on both Android and iOS without layout issues
- [ ] App requests notification permissions via a custom pre-permission screen
- [ ] All data persists after app restart (SQLite)
- [ ] No TypeScript errors, no use of `any`
- [ ] All filenames use kebab-case
- [ ] Home screen shows a time-of-day greeting and today's adherence progress bar
- [ ] Every empty state shows an emoji, a message, and a CTA button
- [ ] Form validation is inline (red border + text), not via Alert
- [ ] All touch targets are minimum 44×44pt (iOS) / 48×48dp (Android)
- [ ] All interactive elements have `accessibilityLabel` props
