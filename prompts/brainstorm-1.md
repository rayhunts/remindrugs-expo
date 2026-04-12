# Remindrugs — Claude Code Prompt

## Project Overview

**App Name:** Remindrugs  
**Framework:** React Native with Expo (SDK 52+, already initialized)  
**Purpose:** A personal medication reminder app that helps users track daily, weekly, or custom periodic drug schedules — with local notifications, calendar tracking, health integrations, and optional smartwatch connectivity.

---

## Core Philosophy

- **Offline-first**: All data stored locally using `expo-secure-store` + `AsyncStorage` (no backend required)
- **Reliable notifications**: Local push notifications via `expo-notifications`
- **Cross-platform safe**: All UI components must behave correctly on both **Android** and **iOS** — never use raw HTML inputs or browser-specific primitives
- **Accessible & clear**: Medical context demands legibility, high contrast, and unambiguous interactions

---

## File & Folder Conventions

Follow the **default Expo Router boilerplate** convention strictly:

- **File naming:** `kebab-case` for all files and folders (e.g., `add-medication.tsx`, `medication-card.tsx`)
- **Routing:** Use `expo-router` with file-based routing inside `app/` directory
- **Components:** `components/` folder for reusable UI
- **Hooks:** `hooks/` folder for custom React hooks
- **Store/data:** `store/` folder for local data management
- **Types:** `types/` folder for shared TypeScript interfaces
- **Constants:** `constants/` for colors, spacing, font sizes, notification channels

```
app/
  (tabs)/
    index.tsx              # Today / Dashboard
    calendar.tsx           # Calendar tracking view
    medications.tsx        # All medications list
    profile.tsx            # Settings & health integrations
  medication/
    [id].tsx               # Medication detail
    add-medication.tsx     # Add new medication
    edit-medication.tsx    # Edit medication
  _layout.tsx
  +not-found.tsx

components/
  medication-card.tsx
  dose-tracker.tsx
  schedule-picker.tsx
  time-picker-safe.tsx     # Cross-platform time picker wrapper
  date-picker-safe.tsx     # Cross-platform date picker wrapper
  notification-badge.tsx
  streak-indicator.tsx
  calendar-day-cell.tsx
  health-ring.tsx
  smartwatch-status.tsx

hooks/
  use-medications.ts
  use-notifications.ts
  use-calendar-tracking.ts
  use-health-data.ts
  use-streak.ts

store/
  medications-store.ts
  tracking-store.ts
  settings-store.ts

types/
  medication.ts
  schedule.ts
  tracking.ts
  health.ts

constants/
  colors.ts
  spacing.ts
  notification-channels.ts
```

---

## Design System & Aesthetic Direction

### Visual Identity: **"Clinical Calm with Organic Warmth"**

The app lives at the intersection of medical precision and human care. Think: a beautifully designed pharmacy meets a wellness journal.

- **Color Palette:**
  - Primary: `#2D6A4F` (deep sage green — trust, health, nature)
  - Secondary: `#52B788` (mid mint — interactive elements)
  - Accent: `#FFB703` (warm amber — alerts, streaks, achievements)
  - Danger: `#E63946` (missed doses, warnings)
  - Background: `#F8FAF9` (light mode) / `#0D1B14` (dark mode)
  - Surface: `#FFFFFF` / `#1A2E22`
  - Text: `#1B2B26` / `#E8F5F0`

- **Typography:**
  - Display/Headings: `DM Serif Display` — authoritative, warm, human
  - Body/UI: `DM Sans` — clean, modern, highly legible
  - Monospace (doses, times): `JetBrains Mono` — precise, clinical feel
  - Load via `expo-google-fonts`

- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- **Border radius:** `8px` cards, `100px` pills/badges, `16px` modals
- **Shadows:** Soft, layered — `elevation: 2` on Android, `shadowColor` on iOS

- **Motion:**
  - Use `react-native-reanimated` for all animations
  - Dose check-off: spring bounce on the checkmark
  - Card entrance: staggered fade-up on list render
  - Tab transitions: smooth fade
  - Streak counter: animated number roll

### Component Rules

- **NEVER** use `<input type="time">` or `<input type="date">` — use `@react-native-community/datetimepicker` wrapped in a safe cross-platform component (`time-picker-safe.tsx` / `date-picker-safe.tsx`)
- **NEVER** use raw `<select>` — use `react-native-picker/picker` or a custom bottom sheet picker
- **ALL** modals must use `@gorhom/bottom-sheet` for native feel
- **ALL** lists must use `FlashList` from `@shopify/flash-list` for performance
- **Haptics** on every important interaction via `expo-haptics`

---

## Features to Build

### 1. 💊 Medication Management

**Data model (`types/medication.ts`):**

```typescript
interface Medication {
  id: string;
  name: string;
  dosage: string; // e.g., "500mg", "1 tablet"
  unit: string; // tablet | capsule | ml | drops | puff | patch
  color: string; // pill color for visual identification
  icon: string; // emoji or icon key
  schedule: Schedule;
  instructions: string; // "Take with food", "Before bed", etc.
  refillReminder: boolean;
  pillsRemaining?: number;
  pillsTotal?: number;
  startDate: string; // ISO date
  endDate?: string; // ISO date or null for ongoing
  notes?: string;
  createdAt: string;
}

interface Schedule {
  type: "daily" | "weekly" | "interval" | "as-needed";
  times: string[]; // ["08:00", "20:00"] — 24h format
  days?: number[]; // 0=Sun..6=Sat — for weekly; if all 7 days = treat as daily
  intervalDays?: number; // for interval type (every N days)
  startDate: string;
}
```

**Logic rule:** If `schedule.type === 'weekly'` and `schedule.days` contains all 7 days `[0,1,2,3,4,5,6]`, treat and display it as **Daily**.

**Add Medication flow:**

1. Name + search (autocomplete from a local drug name list)
2. Dosage amount + unit picker (bottom sheet)
3. Schedule type selector (Daily / Weekly / Every N Days / As Needed)
4. Time picker(s) — allow multiple times per day
5. Day picker (for weekly) — visual pill buttons for each day
6. Start/End date (optional end)
7. Instructions text input
8. Pill color picker (8 preset colors)
9. Refill reminder toggle + current pill count
10. Review & Save

### 2. 🔔 Notifications

Use `expo-notifications`. Request permissions on first launch.

**Notification channels (Android):**

- `remindrugs-doses` — High priority, sound on
- `remindrugs-refill` — Default priority
- `remindrugs-streak` — Low priority

**Scheduling logic:**

- On save/edit of a medication, cancel all existing notifications for it and reschedule
- Schedule notifications up to **60 days** ahead (Expo limit workaround: re-schedule on app open)
- Notification body: `"Time to take your [Name] — [Dosage]"`
- Notification action buttons: **"Done"** | **"Snooze 15min"**

**Snooze:** Reschedule a one-time notification 15 minutes from now.

### 3. 📅 Today Dashboard (`app/(tabs)/index.tsx`)

The home screen — the most important screen.

**Layout:**

```
┌─────────────────────────────────────┐
│  Good morning, [Name] 🌿            │
│  Sunday, April 12                   │
├─────────────────────────────────────┤
│  [Streak card: 🔥 14 days]          │
│  [Progress ring: 2 / 5 taken today] │
├─────────────────────────────────────┤
│  UPCOMING                           │
│  ┌──────────────────────────────┐   │
│  │ 🟢 Vitamin D  500mg  08:00  │   │
│  │    [✓ Done] [Skip]          │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 🔵 Metformin  1 tab  08:00  │   │
│  │    [✓ Done] [Skip]          │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  COMPLETED TODAY                    │
│  [dimmed cards with ✓]              │
└─────────────────────────────────────┘
```

- Greeting changes by time of day (morning 🌅 / afternoon ☀️ / evening 🌙)
- **Progress ring** animates using `react-native-svg` + Reanimated
- **Streak card** shows current streak in days
- Swipe right on a card → **Mark as done** (green)
- Swipe left on a card → **Skip** (amber)
- Long press → quick options bottom sheet

### 4. 📆 Calendar Tracking (`app/(tabs)/calendar.tsx`)

Monthly calendar view showing medication adherence per day.

**Color coding per day cell:**

- 🟢 Full green: All doses taken
- 🟡 Amber: Some doses taken
- 🔴 Red: No doses taken (and day has passed)
- ⚪ Grey: No medications scheduled
- Today: Outlined with primary color

**Below calendar:**

- Selected day detail — shows each medication and its status for that day
- Monthly adherence stat: "85% adherence this month"

**Implementation:** Use a custom calendar built with `FlashList` in a grid layout — do NOT use `react-native-calendars` as it has known layout issues. Build it from scratch using the grid approach.

### 5. 💊 Medications List (`app/(tabs)/medications.tsx`)

- All active medications as cards
- Filter: Active / Paused / Completed
- Each card shows: name, dosage, next dose time, days remaining (if end date set), pill count indicator
- FAB (+) button to add new medication
- Swipe actions: Edit | Pause | Delete
- Refill warning badge when `pillsRemaining < 7`

### 6. 📊 Profile & Health (`app/(tabs)/profile.tsx`)

Sections:

1. **Personal Info** — Name, avatar (emoji picker)
2. **Health Integrations** (see section below)
3. **Notification Settings** — per-medication overrides
4. **Theme** — Light / Dark / System
5. **Data** — Export as JSON, Import backup
6. **About**

---

## Health & Smartwatch Integration

### Apple Health / Google Fit

Use `expo-health` or `react-native-health` (for bare workflow) — if not available with managed Expo, use a placeholder UI with a clear "coming soon" note and a toggle that's disabled but shows the integration plan.

**Data to read (with permission):**

- Sleep duration & quality (last 7 days)
- Heart rate (latest)
- Steps today

**Data to write:**

- Medication log entries (when dose is marked as taken)

### Smartwatch Support

Display a **"Connect Wearable"** section in Profile. Support:

- **Apple Watch** (via HealthKit bridge) — show sleep rings, heart rate widget
- **WearOS / Fitbit / Garmin** — show a connection status card; for now use mock data with a clear "Connected via Google Fit" label
- **Samsung Health** — future

**Sleep Tracking Widget (Dashboard):**
When health is connected, show a sleep card on the Today dashboard:

```
┌─────────────────────────────────────┐
│ 😴 Last Night's Sleep               │
│  7h 23min  ████████░░  Good         │
│  Deep: 1h 45min  REM: 2h 10min     │
└─────────────────────────────────────┘
```

Use sleep data to surface smart suggestions:

- "You slept less than 6h — consider taking your vitamins after breakfast today"

---

## Additional UX Enhancements

### Streak & Gamification

- **Daily streak counter** — consecutive days with 100% adherence
- **Achievement badges** — "7-day streak", "30-day streak", "First medication added"
- Animated celebration (confetti via `react-native-confetti-cannon`) when streak milestone hit

### Smart Reminders

- **"Did you take your meds?"** — If a dose time passes without action, send a follow-up notification 30 min later
- **Refill alert** — When `pillsRemaining <= 7`, show a banner + send a notification
- **Vacation mode** — Pause all reminders for a date range

### Medication Details Screen (`app/medication/[id].tsx`)

- Full schedule overview
- 30-day adherence chart (bar chart via `victory-native` or `react-native-gifted-charts`)
- Edit / Pause / Delete actions
- History log of all taken/skipped doses

### Onboarding

- 3-screen onboarding on first launch (using `react-native-onboarding-swiper` or a custom Reanimated version)
- Screens: Welcome → Add First Medication → Enable Notifications
- Skip option always visible

---

## Required Packages

```bash
# Navigation & routing (already in Expo Router boilerplate)
expo-router

# Storage
@react-native-async-storage/async-storage
expo-secure-store

# Notifications
expo-notifications
expo-task-manager           # for background notification rescheduling

# UI & Animation
react-native-reanimated
react-native-gesture-handler
@gorhom/bottom-sheet
@shopify/flash-list
react-native-svg
expo-haptics

# Date/Time pickers (SAFE cross-platform)
@react-native-community/datetimepicker

# Fonts
expo-font
@expo-google-fonts/dm-sans
@expo-google-fonts/dm-serif-display

# Charts
react-native-gifted-charts

# Health (optional / conditional)
react-native-health           # iOS HealthKit
react-native-google-fit       # Android Google Fit

# Misc
expo-constants
expo-status-bar
react-native-safe-area-context
```

---

## Local Data Architecture

### AsyncStorage keys:

```
@remindrugs/medications        → Medication[]
@remindrugs/tracking/{date}    → DoseLog[] (keyed by YYYY-MM-DD)
@remindrugs/settings           → AppSettings
@remindrugs/onboarded          → boolean
@remindrugs/streak             → StreakData
```

### Tracking model:

```typescript
interface DoseLog {
  medicationId: string;
  scheduledTime: string; // "08:00"
  date: string; // "2026-04-12"
  status: "taken" | "skipped" | "pending";
  takenAt?: string; // actual ISO timestamp
  note?: string;
}
```

---

## Cross-Platform Rules (CRITICAL)

| Don't use             | Use instead                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `<input type="time">` | `@react-native-community/datetimepicker` in `time-picker-safe.tsx` |
| `<input type="date">` | `@react-native-community/datetimepicker` in `date-picker-safe.tsx` |
| `<select>`            | `@react-native-picker/picker` inside a bottom sheet                |
| `alert()`             | `Alert` from `react-native`                                        |
| `console.log` in prod | Remove or gate behind `__DEV__`                                    |
| `position: fixed`     | `position: absolute` with `SafeAreaView`                           |
| CSS animations        | `react-native-reanimated`                                          |

**Date/Time picker pattern:**

```tsx
// components/time-picker-safe.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState, Platform } from "react-native";

// On Android: show picker in a modal
// On iOS: show inline or in an action sheet
// Always store time as "HH:mm" string, not a Date object
```

---

## Code Quality Standards

- **TypeScript strict mode** — all props typed, no `any`
- **No inline styles** — use `StyleSheet.create()` or a theme system
- **Memoization** — `useMemo` / `useCallback` on expensive renders
- **Error boundaries** around health integration sections
- **Loading states** — every async operation has a loading indicator
- **Empty states** — every list has a friendly empty state illustration
- **Accessibility** — `accessibilityLabel` on all interactive elements, `accessibilityRole` on buttons

---

## Implementation Order

Build in this order for a working MVP fast:

1. **Types & constants** — `types/`, `constants/colors.ts`, `constants/spacing.ts`
2. **Storage layer** — `store/medications-store.ts`, `store/tracking-store.ts`
3. **Core hooks** — `use-medications.ts`, `use-notifications.ts`
4. **Safe UI primitives** — `time-picker-safe.tsx`, `date-picker-safe.tsx`, bottom sheet wrapper
5. **Add Medication screen** — the core input flow
6. **Today Dashboard** — dose cards, progress ring, mark as done
7. **Notifications** — scheduling on save, snooze action
8. **Calendar view** — adherence grid
9. **Medications list** — management screen
10. **Streak & gamification** — streak counter, badges
11. **Health integrations** — sleep card, HealthKit/Google Fit
12. **Onboarding** — 3-screen first-launch flow
13. **Profile & settings** — theme, export, notification config
14. **Polish** — animations, haptics, empty states, edge cases

---

## Notes for Claude Code

- Always check if a package supports **Expo managed workflow** before installing
- For any native module that requires `expo prebuild`, note it clearly in a comment
- Prefer **Expo SDK packages** (`expo-*`) over third-party when functionality overlaps
- Run `bunx expo install <package>` not `bun add` to ensure SDK version compatibility
- After adding native modules, remind to rebuild: `bunx expo run:ios` / `bunx expo run:android`
- The app should work with `bunx expo start` + Expo Go for all non-native features, with native features gracefully degrading

---

_Remindrugs — because remembering your meds shouldn't be hard._
