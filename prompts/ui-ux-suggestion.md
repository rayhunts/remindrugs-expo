# Remindrugs — UI/UX Suggestions

> A companion doc to `prompt.md`. These are opinionated, research-backed design decisions to make the app feel polished, trustworthy, and easy to use — especially for health-critical interactions.

---

## 1. Design Philosophy

Remindrugs is a **health-critical** app. Users may be elderly, have low vision, or manage multiple medications under stress. Every design decision should serve **clarity, trust, and zero-friction interaction**. When in doubt:

- Fewer taps is always better
- Bigger touch targets are always safer
- Calm colors reduce perceived cognitive load
- Positive reinforcement keeps users engaged
- **Never make the user think** — the right action should always be obvious

---

## 2. Color Palette & Theming

### Primary Palette (update in `constants/colors.ts`)

```ts
export const Colors = {
  // Primary — calm blue-purple (trust + health)
  primary: "#5B6EF5",
  primaryLight: "#EEF0FE",
  primaryDark: "#3D52D5",

  // Semantic colors
  success: "#22C55E", // taken / active / daily / good sleep
  successLight: "#DCFCE7",
  warning: "#F59E0B", // custom schedule / partial adherence / fair sleep
  warningLight: "#FEF3C7",
  danger: "#EF4444", // missed / delete / inactive / poor sleep / low stock
  dangerLight: "#FEE2E2",
  info: "#3B82F6", // weekly / watch connected
  infoLight: "#EFF6FF",

  // Health-specific
  sleep: "#8B5CF6", // purple for sleep data
  sleepLight: "#F5F3FF",
  heartRate: "#F43F5E", // rose for heart rate
  heartRateLight: "#FFF1F2",
  steps: "#10B981", // emerald for steps

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

  // Drug form colors (pill identification)
  pill: {
    red: "#EF4444",
    orange: "#F97316",
    yellow: "#EAB308",
    green: "#22C55E",
    blue: "#3B82F6",
    purple: "#8B5CF6",
  },

  // Dark mode variants (optional future enhancement)
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    border: "#334155",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
  },
};
```

### Why This Palette?

- **Blue-purple** — trust, calm, intelligence. Ideal for health apps
- **Green** — positive reinforcement (dose taken, good adherence, good sleep)
- **Amber/orange** — caution without alarm (partial adherence, custom schedule)
- **Red** — reserved _only_ for missed doses, delete actions, low stock. Don't overuse it
- **Purple** — sleep data (dream-like, calming, distinct from primary)
- **Rose** — heart rate (warm, cardiovascular association)
- All color pairs meet **WCAG AA contrast** (4.5:1 minimum for body text)

---

## 3. Typography

Use a clear typographic scale. Apply `Platform.select` for font families:

```ts
export const Typography = {
  fontFamily: Platform.select({
    ios: "System", // San Francisco — highly readable
    android: "Roboto", // Material default
  }),

  // Scale
  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 }, // minimum body text
  md: { fontSize: 17, lineHeight: 24 }, // primary labels
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 }, // time display
  "2xl": { fontSize: 32, lineHeight: 40 }, // hero metric (BPM, %)
  "3xl": { fontSize: 40, lineHeight: 48 }, // health stat hero number

  // Weights
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
```

### Rules:

- **Minimum body text**: 15px — never go smaller for reading content
- **Time display**: 24px bold — time is the most important element on a reminder card
- **Health metrics** (BPM, sleep hours, %): 32–40px bold — hero numbers deserve hero size
- **Adherence %**: Display prominently in the calendar stats row
- **Drug names**: 15px semibold — not the hero but must be clearly readable

---

## 4. Spacing & Layout Grid

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
  md: 12, // cards, inputs
  lg: 16, // large cards, health cards
  xl: 24, // bottom sheets, modals
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

- Consistent **8px grid** — all spacing should be a multiple of 8
- Card inner padding: `16px` horizontal, `12px` vertical
- Screen horizontal padding: `16px`
- Section spacing between cards: `12px`
- Drug chip gap: `6px`
- **Touch targets**: minimum `44×44pt` (iOS) / `48×48dp` (Android)

---

## 5. Home Screen UX

### Header Component

```
┌─────────────────────────────────────────────┐
│  Good morning! ☀️              [Bell] [Watch]│
│  Monday, 3 March 2025                       │
│                                             │
│  ████████████░░░░░░  3 of 5 doses taken     │
└─────────────────────────────────────────────┘
```

- **Time-of-day greeting**: "Good morning ☀️" / "Good afternoon 🌤️" / "Good evening 🌙"
- **Date**: Full format "Monday, 3 March 2025"
- **Adherence progress bar**: animated, green fill, fraction label
- **Bell icon**: taps open notification settings
- **Watch icon** (if paired): green = connected, amber = paired/unreachable

### Health Snapshot Card (compact, 2 columns)

```
┌─────────────────────────────────────────────┐
│  😴 Last Night         ❤️ Resting HR        │
│  7h 23m  [Good]        62 BPM               │
└─────────────────────────────────────────────┘
```

- Show only if health permissions granted
- Tap to navigate to the Health tab
- If health data unavailable: hide the card entirely (don't show empty state here)
- Keep it compact — 2 columns, icon + label + value pattern

### Reminder Cards List

- Use `SectionList` (not FlatList) if there are AM/PM natural groupings
- Or keep as `FlatList` ordered by time ascending
- **"Mark as Taken"** button: 100% width, green, pill shape, at the bottom of each card
- When tapped: animate the card (scale down slightly, check icon replaces button), log to adherence

### Empty State (no reminders today)

```
        💊
  No meds today!
  Enjoy your day or add
  a new reminder below.

  [+ Add Reminder]
```

---

## 6. Multi-Drug Form UX

### Drug Form Row Design (`components/drug-form-row.tsx`)

Each drug in the list should appear as a **card within the form**:

```
┌──────────────────────────────────────────────┐
│  ● Drug 1                            [Delete] │
│  Name:   [Metformin              ]           │
│  Dosage: [500mg                  ]           │
│                                              │
│  Form:  💊Tablet  💊Capsule  💧Liquid  💉 →  │
│         (horizontal scroll if needed)        │
│                                              │
│  Qty per dose: [  2  ]                       │
│  Notes: [Take with food           ] (opt)    │
│                                              │
│  Color:  🔴  🟠  🟡  🟢  🔵  🟣           │
│  Stock:  [60 tablets left] Alert at [10]    │
└──────────────────────────────────────────────┘
```

### Drug Form UX Rules:

- The **form field for drug name** should auto-focus when a new drug is added
- **Drug form chips** (tablet, capsule, etc.) should be horizontally scrollable — don't wrap
- **Emoji icons** on form chips make them immediately scannable: 💊 Tablet, 💊 Capsule, 💧 Liquid, 💉 Injection, 🩹 Patch, 🫁 Inhaler, 👁 Drops
- **Color swatches**: 6 solid circle pressables (24px diameter, 44px touch area). Selected = border ring
- **Stock tracking**: shown collapsed by default. A "Track Stock" toggle reveals the stock fields (progressive disclosure)
- **Delete drug button**: only show if there are 2+ drugs (can't delete the last one)
- **"+ Add Another Drug" button**: shown below all drug cards, full width, outlined style

### Live Notification Preview

At the bottom of the form, show a live-updating notification preview:

```
┌──────────────────────────────────────────────┐
│  📱 Notification Preview                     │
│  ┌────────────────────────────────────────┐  │
│  │ 💊 Morning Meds                        │  │
│  │ Time to take: Metformin 500mg,         │  │
│  │ Vitamin D 1000IU                       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 7. Calendar Screen UX

### Layout

```
┌──────────────────────────────────────────────┐
│  March 2025                        ← →       │
│                                              │
│  Su Mo Tu We Th Fr Sa                        │
│  23 24 25 26 27 28  1                        │
│   2  3  4  5  6  7  8                        │
│           🟢 🟡 🔴                           │
│   9 10 11 12 13 14 15                        │
│  🟢    🔴                                    │
│  ...                                         │
├──────────────────────────────────────────────┤
│  📊 This Month                               │
│  87% Adherence  •  5-day streak  •  3 missed │
├──────────────────────────────────────────────┤
│  Selected: Wednesday, 5 March                │
│  ┌────────────────────────────────────────┐  │
│  │ 💊 Morning Meds — 08:00 AM    ✅ Taken │  │
│  │    Metformin 500mg, Vitamin D 1000IU  │  │
│  ├────────────────────────────────────────┤  │
│  │ 💊 Evening Meds — 08:00 PM  ❌ Missed │  │
│  │    Aspirin 100mg                      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Calendar Dot System

Use `react-native-calendars` `markingType="multi-dot"` or `markingType="custom"`:

```ts
// markedDates format for react-native-calendars
{
  '2025-03-05': {
    dots: [
      { color: '#22C55E' },  // taken
    ]
  },
  '2025-03-06': {
    dots: [
      { color: '#F59E0B' },  // partial
    ]
  },
}
```

### Stats Row (between calendar and day detail)

| Metric            | Icon | Display                    |
| ----------------- | ---- | -------------------------- |
| Adherence %       | 📊   | "87%" in bold, label below |
| Current streak    | 🔥   | "5 days" in bold           |
| Missed this month | ❌   | "3" in bold, red color     |

### Day Detail Panel

- Shows **all reminders scheduled for that day**
- Each reminder row shows: name, time, drug list (as text), and a status badge
- **Retroactive marking** (past 7 days only):
  - Show "Mark Taken" / "Mark Missed" / "Mark Skipped" action buttons
  - For future dates: show "Scheduled" in grey — no action buttons
- If no reminders on selected day: "No medications scheduled" empty message

### Calendar UX Rules:

- **Today's date** should always be highlighted with a ring/border
- **Future days**: no dots (no data yet)
- **Selecting today** is the default on screen load
- Smooth animated transition when tapping a date (the day detail panel slides in)
- Month navigation with `<` / `>` arrow buttons — don't navigate beyond today's month + 1

---

## 8. Health Dashboard UX (`app/(tabs)/health.tsx`)

### Layout

```
┌──────────────────────────────────────────────┐
│  Health & Insights        🟢 Watch Connected  │
├──────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │ 😴 Sleep         │  │ ❤️ Heart Rate    │  │
│  │                  │  │                  │  │
│  │   7h 23m         │  │    62 BPM        │  │
│  │   [Good ✓]       │  │   55–78 range    │  │
│  └──────────────────┘  └──────────────────┘  │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ 🚶 Steps Today                           ││
│  │ ████████████░░░░  8,432 / 10,000         ││
│  └──────────────────────────────────────────┘│
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ 💡 Insight                               ││
│  │ You slept only 4h last night. Poor sleep ││
│  │ can reduce how well your medications     ││
│  │ work. Aim for 7–9 hours.                 ││
│  └──────────────────────────────────────────┘│
│                                              │
│  Last updated: 7 minutes ago    [Refresh]    │
└──────────────────────────────────────────────┘
```

### Health Card Design (`components/health-stat-card.tsx`)

```
┌─────────────────────────┐
│  😴 Sleep               │   ← icon + label (small, secondary)
│                         │
│      7h 23m             │   ← hero number (32px bold)
│    [Good ✓]             │   ← quality badge (green/amber/red pill)
│                         │
│  Last night             │   ← caption (11px tertiary)
└─────────────────────────┘
```

- Two cards per row in a grid layout
- Cards are tappable (placeholder for future drill-down)
- Sleep quality badge: `< 6h = Poor (red)`, `6–7h = Fair (amber)`, `≥ 7h = Good (green)`
- Heart rate: show resting BPM as hero, min–max range below in secondary text

### Permission Not Granted State

```
┌──────────────────────────────────────────────┐
│  Health data not available                   │
│  Connect to Apple Health / Google Health     │
│  Connect to see sleep and heart rate data.   │
│                                              │
│  [Grant Health Permissions]                  │
└──────────────────────────────────────────────┘
```

- Non-blocking — user can dismiss and continue using the app
- "Grant Health Permissions" button re-triggers the permission request

### Smart Insight Cards

Insight logic (all static, no AI):

| Condition             | Insight Message                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Sleep < 5h            | "⚠️ Only [X]h sleep. Poor rest can reduce medication effectiveness. Aim for 7–9 hours."  |
| Sleep 5–6h            | "💤 [X]h sleep is a little low. Try to get 7–9 hours for optimal medication absorption." |
| Sleep ≥ 7h            | "✅ Great sleep last night! Good rest helps your body absorb medications properly."      |
| No sleep data         | Don't show insight                                                                       |
| Heart rate > 100 BPM  | "❤️ Your resting HR seems elevated. Consider mentioning this to your doctor."            |
| No health data at all | Show permission prompt card instead                                                      |

---

## 9. Watch Connectivity UX

### `WatchStatusBadge` (`components/watch-status-badge.tsx`)

```
🟢 Watch Connected      ← green dot + text
🟡 Watch Paired          ← amber dot (out of range)
⚫ No Watch              ← grey dot
```

Shown in:

- **Home screen header** (top right icon)
- **Health tab header** (inline text badge)

### Watch UX Principles

- **Never make watch connectivity a requirement** — the app must work 100% without a watch
- When watch is connected: today's reminders are automatically synced to the watch face
- Watch "Mark as Taken" action → syncs back to phone → logs to adherence
- If watch sends a mark that conflicts (already marked): silently prefer the most recent
- Watch connectivity state should update in real-time (use the reachability hook)

### What the Watch Should Display (informational spec)

The **native WatchKit / WearOS** app (written separately in Swift/Kotlin) should show:

- Upcoming reminder name + time (next dose)
- Drug list for that reminder
- "✓ Mark as Taken" button (large, green)
- Complication: next dose time on watch face

---

## 10. Reminder Card Design (updated for multi-drug)

```
┌───────────────────────────────────────────────┐
│▌  Morning Meds                    [DAILY] ●   │  ← left color stripe
│                                               │
│   💊 Metformin 500mg  💊 Vitamin D  +1 more  │  ← drug chips
│   08:00 AM                      Mon–Fri       │
│                                               │
│   [          ✓  Mark as Taken          ]      │  ← home screen only
└───────────────────────────────────────────────┘
```

### Drug Chips (inline, horizontal)

- Each drug shown as a small rounded chip: `💊 Metformin 500mg`
- If > 3 drugs: show first 2 + `+N more` chip
- Chip background: `Colors.primaryLight` (#EEF0FE)
- If drug has a color assigned: use a colored dot instead of 💊 emoji

### Card States

| State               | Left Stripe      | Background            | Opacity |
| ------------------- | ---------------- | --------------------- | ------- |
| Active, not taken   | `Colors.primary` | White                 | 100%    |
| Active, taken today | `Colors.success` | `Colors.successLight` | 100%    |
| Active, missed      | `Colors.danger`  | White                 | 100%    |
| Inactive            | `Colors.border`  | `Colors.background`   | 70%     |

### Stock Warning Indicator

If any drug in the reminder has `currentStock ≤ stockThreshold`, show a small red badge on the card:

```
💊 Morning Meds  [DAILY] ●  🔴 Low Stock
```

---

## 11. Navigation & Tabs

### Tab Bar (4 tabs)

```
┌──────────────────────────────────────────────┐
│                                              │
│                 (screen content)             │
│                                              │
└─────────┬──────────┬──────────┬─────────────┘
   🏠         📅        💊         ❤️
  Today    Calendar  Reminders   Health
```

- **Badge on Today tab**: count of pending (not-yet-taken) reminders for today
- **Badge on Health tab**: pulsing dot if health data is stale (> 4 hours old)
- Use `@expo/vector-icons` (`MaterialCommunityIcons` or `Ionicons`) for tab icons
- Tab bar background: white with a subtle top border

### FAB (Floating Action Button)

- Position: bottom-right of Today and Reminders screens
- Size: 56×56dp circle
- Color: `Colors.primary` with the `Shadow.fab` shadow
- Icon: `+` white, 28px
- On press: spring scale animation (0.9 → 1.0), navigate to `add-reminder`
- `accessibilityLabel="Add new reminder"`

---

## 12. Notification Permission Flow

### Pre-Permission Screen (shown before system dialog, on first launch)

```
        🔔

   Stay on Track

Remindrugs sends you a gentle
reminder at exactly the right
time so you never miss a dose.

   • One tap to mark as taken
   • Quiet hours respected
   • No spam, just your meds

  [Enable Notifications →]

  Maybe later
```

- Must appear **before** the OS system dialog
- "Enable Notifications →" triggers `requestNotificationPermissions()`
- "Maybe later" skips for now, shows a `PermissionBanner` on the Home screen

### Denied State Banner (`components/permission-banner.tsx`)

```
┌──────────────────────────────────────────────┐
│ 🔕 Notifications are disabled                │
│    Remindrugs can't remind you without them. │
│    [Fix This →]                              │
└──────────────────────────────────────────────┘
```

- Persistent banner at the top of the Home screen
- "Fix This →" opens `Linking.openSettings()` (system Settings app)
- Dismissible with an `×` button (hides for the session, re-appears on next launch)
- Color: `Colors.warningLight` background, `Colors.warning` border

---

## 13. Micro-Interactions & Animations

All animations use the **React Native `Animated` API** only — no third-party animation libraries.

| Interaction             | Animation                                      | Duration        |
| ----------------------- | ---------------------------------------------- | --------------- |
| FAB press               | Scale 1 → 0.9 → 1 (spring)                     | 200ms           |
| Mark as Taken           | Card scale 1 → 0.97, button fades to checkmark | 300ms           |
| Card appear (list load) | Fade in + slide up 20px                        | 250ms staggered |
| Frequency badge update  | Fade out → fade in                             | 150ms           |
| Progress bar fill       | Width animated left to right                   | 600ms ease-out  |
| Tab switch              | Native (handled by Expo Router)                | —               |
| Calendar day select     | Dot scale 1 → 1.15 → 1                         | 200ms           |
| Day detail panel        | Slide up from bottom 40px                      | 250ms ease-out  |
| Health card load        | Shimmer → actual content                       | 400ms           |
| Watch status change     | Dot fade between colors                        | 300ms           |
| Delete swipe/action     | Slide out left + height collapse               | 300ms           |
| Drug chip added         | Scale in from 0.8 to 1                         | 200ms           |

---

## 14. Adherence Tracking UX

### "Mark as Taken" Interaction

The most important action in the app. Make it unmissable:

1. **Size**: full-width button inside the card, 48px height
2. **Color**: `Colors.success` background, white text
3. **Label**: "✓ Mark as Taken" (large, bold)
4. **After tap**:
   - Button changes to ✓ (check icon only, no text) with `Colors.successLight` background
   - Card border/stripe changes to green
   - Progress bar increments with animation
   - Haptic feedback: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`

### Undo Grace Period

After marking as taken, show a **snackbar/toast** for 5 seconds:

```
✅ Metformin taken  [Undo]
```

- If user taps Undo: revert the log status back to pending
- After 5 seconds: dismiss toast, action is committed

### Mark as Skipped

Available via long-press or the action sheet on a card:

- Adds an `AdherenceLog` with `status: 'skipped'`
- Card shows a grey "— Skipped" badge instead of the taken button
- Does NOT count as a missed dose in adherence stats (it was intentional)

### Retroactive Logging (from Calendar)

- Allow marking doses for up to **7 days in the past**
- For dates beyond 7 days: show in read-only mode (can't retroactively log)
- Present 3 buttons per reminder-day: `[✓ Taken] [— Skip] [✗ Missed]`

---

## 15. Loading & Error States

### Skeleton Cards (`components/skeleton-card.tsx`)

Show while data loads from SQLite (usually < 100ms but still implement it):

```
┌────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓               │
│  ▓▓▓▓▓▓  ▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
└────────────────────────────────────────────┘
```

- Implement a shimmer effect using `Animated` (looping opacity 0.3 → 0.7 → 0.3)
- Show 2–3 skeleton cards while loading
- Transition to real content with a fade-in

### Error States

```
        ⚠️
  Something went wrong
  We couldn't load your reminders.

  [Try Again]
```

- Show on DB read failures
- Include a retry button that calls `refreshReminders()`
- Log errors to console but never crash the app

---

## 16. Accessibility (A11y)

- ✅ All buttons: `accessibilityLabel`, `accessibilityRole="button"`
- ✅ All icons used as buttons: `accessibilityLabel` describing the action
- ✅ Cards: `accessibilityRole="none"`, but "Mark as Taken" button has full label: `"Mark Metformin 500mg as taken"`
- ✅ Status badges: `accessibilityLabel="Frequency: Daily"`
- ✅ Progress bar: `accessibilityLabel="3 of 5 doses taken today"`
- ✅ Drug chips: `accessibilityLabel="Metformin 500mg, tablet"`
- ✅ Calendar days: `accessibilityLabel="March 5, 2025, 2 doses taken"` or `"March 5, no data"`
- ✅ Switch: `accessibilityLabel="Enable reminder for Morning Meds"`
- ✅ Health cards: `accessibilityLabel="Sleep: 7 hours 23 minutes, quality: Good"`
- ✅ Watch badge: `accessibilityLabel="Apple Watch connected"` / `"No watch paired"`
- ✅ Never use color alone to convey information — always pair with text/icon
- ✅ Support system font size scaling (`allowFontScaling` is `true` by default — don't set it to `false`)
- ✅ All text contrast meets WCAG AA at 4.5:1 minimum

---

## 17. Haptic Feedback Map

Use `expo-haptics` consistently:

```ts
import * as Haptics from "expo-haptics";
```

| Action                              | Haptic Type                        |
| ----------------------------------- | ---------------------------------- |
| Mark as Taken                       | `ImpactFeedbackStyle.Medium`       |
| Mark as Skipped                     | `ImpactFeedbackStyle.Light`        |
| Delete reminder                     | `ImpactFeedbackStyle.Heavy`        |
| Toggle reminder active              | `ImpactFeedbackStyle.Light`        |
| Day chip selected (in day selector) | `ImpactFeedbackStyle.Light`        |
| "Select All" days                   | `NotificationFeedbackType.Success` |
| Save reminder (success)             | `NotificationFeedbackType.Success` |
| Form validation error               | `NotificationFeedbackType.Error`   |
| FAB press                           | `ImpactFeedbackStyle.Medium`       |
| Add drug to form                    | `ImpactFeedbackStyle.Light`        |
| Calendar day tap                    | `ImpactFeedbackStyle.Light`        |
| Watch connectivity gained           | `NotificationFeedbackType.Success` |
| Stock warning triggered             | `NotificationFeedbackType.Warning` |

---

## 18. Onboarding Flow (`app/onboarding.tsx`)

3 steps, skippable at any step. Store `hasSeenOnboarding: true` in SQLite after completion.

### Step 1 — Welcome

```
        💊

    Welcome to
   Remindrugs

Never miss a dose again.
Manage all your medications
in one simple, private app.

        [Get Started →]
        Skip
```

### Step 2 — Health & Watch (new!)

```
        📱 + ⌚

  Connect Your Health Data

Optionally link Apple Health
or Google Health Connect to
see how your sleep and heart
rate relate to your meds.

Your smartwatch can even
remind you on your wrist!

        [Connect Health →]
        Skip for now
```

- "Connect Health →" triggers health permission request
- "Skip for now" moves to Step 3 without requesting

### Step 3 — Notifications

```
        🔔

  Never Miss a Dose

Remindrugs sends a gentle
reminder at exactly the right
time, every day.

        [Enable Reminders →]
        Maybe later
```

- "Enable Reminders →" triggers `requestNotificationPermissions()`
- After completion: navigate to main app

---

## 19. Visual Hierarchy Summary

For every reminder card, ensure this hierarchy is clear at a glance:

| Priority | Element           | Visual Treatment                             |
| -------- | ----------------- | -------------------------------------------- |
| 1st      | Time of dose      | Bold, 24px, primary or dark text             |
| 2nd      | Reminder name     | Semibold, 17px, dark text                    |
| 3rd      | Drug chips        | 13px, rounded chips in primaryLight          |
| 4th      | Frequency badge   | Small chip, color-coded                      |
| 5th      | Day abbreviations | 13px, secondary text                         |
| 6th      | Notes             | Italic, 13px, tertiary (only in edit/detail) |

For health cards:

| Priority | Element                       | Visual Treatment                |
| -------- | ----------------------------- | ------------------------------- |
| 1st      | Metric value (7h 23m, 62 BPM) | Bold, 32px                      |
| 2nd      | Quality badge / range         | Colored badge or secondary text |
| 3rd      | Label (Sleep, Heart Rate)     | Semibold, 13px, secondary       |
| 4th      | Timestamp (Last night)        | 11px, tertiary                  |

---

## 20. Suggested Component File List

| Component             | File                                  | Purpose                            |
| --------------------- | ------------------------------------- | ---------------------------------- |
| `FrequencyBadge`      | `components/frequency-badge.tsx`      | Reusable color-coded pill badge    |
| `SkeletonCard`        | `components/skeleton-card.tsx`        | Loading shimmer placeholder        |
| `ProgressBar`         | `components/progress-bar.tsx`         | Animated adherence bar             |
| `PermissionBanner`    | `components/permission-banner.tsx`    | Notification-off banner            |
| `ActionSheet`         | `components/action-sheet.tsx`         | Bottom sheet for card actions      |
| `SectionHeader`       | `components/section-header.tsx`       | Styled FlatList section title      |
| `TimeDisplay`         | `components/time-display.tsx`         | Bold `HH:MM AM/PM` text component  |
| `HealthStatCard`      | `components/health-stat-card.tsx`     | Sleep / HR / Steps metric card     |
| `AdherenceHeatmap`    | `components/adherence-heatmap.tsx`    | Calendar day dot logic wrapper     |
| `WatchStatusBadge`    | `components/watch-status-badge.tsx`   | Watch connection state badge       |
| `DrugChip`            | `components/drug-chip.tsx`            | Inline drug name chip in card      |
| `DrugFormRow`         | `components/drug-form-row.tsx`        | Full drug form within add/edit     |
| `InsightCard`         | `components/insight-card.tsx`         | Sleep insight / health advice card |
| `StatsRow`            | `components/stats-row.tsx`            | Calendar adherence % + streak row  |
| `ToastSnackbar`       | `components/toast-snackbar.tsx`       | Undo toast after marking taken     |
| `NotificationPreview` | `components/notification-preview.tsx` | Live notification preview in form  |

---

## 21. Quick Wins (Highest Impact, Lowest Effort)

If short on time, implement these first — they have the most visible impact:

1. **Multi-drug notification body** — list all drugs: "Metformin 500mg, Vitamin D 1000IU"
2. **Color-coded left border on reminder cards** — communicates status at a glance
3. **"Mark as Taken" button** — core interaction, make it full-width and green
4. **Calendar dot coloring** — even simple green/red dots make the calendar feel alive
5. **Drug chips in reminder card** — visual pill chips look professional
6. **Auto-label (Daily / Weekly / Custom)** — updates live as days are selected
7. **Health snapshot on home screen** — compact 2-column card, huge perceived value
8. **Adherence % in calendar stats** — users love seeing their progress number
9. **Pre-permission notification screen** — avoids the raw OS dialog feeling
10. **Friendly empty states** — emoji + message + CTA, never a blank screen

---

## 22. Privacy & Data Principles

Remindrugs is a **privacy-first** app — all data stays on-device:

- ✅ No user accounts required
- ✅ No cloud sync, no telemetry, no analytics
- ✅ Health data is **read-only** — Remindrugs never writes to HealthKit / Health Connect
- ✅ All health data is only used in-memory for display — never stored in SQLite
- ✅ Clearly explain health data usage in onboarding and in `app.json` usage strings
- ✅ "Data stored locally on your device" messaging visible in the Health tab
- ✅ User can delete all data by uninstalling the app
- ❌ Never send medication data to any external server

---

_Reference: Apple Human Interface Guidelines · Material Design 3 · WCAG 2.2 AA · Health App UX Research (2024–2025) · Medisafe / DoseMed / MyTherapy feature analysis_
