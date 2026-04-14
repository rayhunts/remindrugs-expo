# Remindrugs — Full Roadmap (Phase 1–9)

> Consumer-ready medication reminder app.
> Last updated: 2026-04-14

---

## Overview

| Phase | Name | What |
|-------|------|------|
| 1 | Consumer-Ready MVP | Core reminders, notifications, adherence, calendar, settings |
| 2 | Health & Wellness | Sleep + heart rate dashboard (HealthKit / Health Connect) |
| 3 | Smartwatch | Apple Watch + WearOS bridge messaging |
| 4 | Gamification | Streaks, achievements, badges, confetti |
| 5 | Advanced Notifications | Follow-up reminders, refill UI, quiet hours |
| 6 | Visual Polish | Custom fonts, Reanimated animations, micro-interactions |
| 7 | Data & Privacy | Export/import, backup, medication detail screen, charts |
| 8 | iOS & Cross-Platform | iOS-specific fixes, HealthKit, Apple Watch native |
| 9 | Production Launch | Store listing, crash reporting, analytics, beta testing |

---

## Phase 1 — Consumer-Ready MVP

**Goal**: Ship to real users. Reminders + notifications + adherence tracking.

**Tabs**: Home · Medications · Calendar · Settings

### P1.0 — Fix TypeScript Errors & Core Stability

- [ ] Fix icon name types — dynamic icon strings need `as any` cast in: `reminder-card.tsx`, `empty-state.tsx`, `swipeable-medication-card.tsx`, `settings.tsx`, `calendar.tsx`, `index.tsx`, `onboarding.tsx`, `action-sheet.tsx`, `permission-banner.tsx`
- [ ] Fix `app/_layout.tsx` — `removeNotificationSubscription` doesn't exist; the subscription itself is a cleanup function, call `sub()` directly
- [ ] Fix `services/notification-service.ts` — `sound: true` → `sound: "default"`; remove `categoryId` from content (use `setNotificationCategoryAsync`); fix snooze trigger `seconds` → `date: new Date(Date.now() + ms)`
- [ ] Fix `components/toast-snackbar.tsx` — `useRef()` needs initial value; remove `._value` access
- [ ] Fix FAB on Home — show always, not only when reminders exist
- [ ] Fix FAB on Medications — show always, not only when reminders exist

**Verify**: `npx tsc --noEmit` = 0 errors

### P1.1 — Notification Actions & Snooze

- [ ] Define action category at module level: `Notifications.setNotificationCategoryAsync("reminder-actions", [{ identifier: "mark-done", ... }, { identifier: "snooze", ... }])`
- [ ] Add `categoryId` to notification content (check SDK support first)
- [ ] Wire response handler in `_layout.tsx`: `mark-done` → log dose + emit event; `snooze` → reschedule 15min
- [ ] Add `scheduleSnooze()` function using `DateTriggerInput`

**Verify**: Device test — tap notification → app opens; "Done" → marked taken; "Snooze" → new notification

### P1.2 — Home Screen Enhancements

- [ ] Show "Completed · N" section below pending reminders (dimmed, opacity 0.8)
- [ ] Add streak badge (`🔥 Nd`) in progress card
- [ ] Long-press → ActionSheet with "Mark as Taken", "Skip This Dose", "Edit Reminder"
- [ ] Show "Skipped" state on card (grey background, "— Skipped" badge)
- [ ] Undo toast after marking taken (5s window, revert log on undo)

**Files**: `app/(tabs)/index.tsx`, `components/reminder-card.tsx`

### P1.3 — Calendar Improvements

- [ ] Show reminder names + drug names + times in day detail (not raw `reminderId`)
- [ ] Retroactive marking buttons ("All Taken" / "All Missed") for past ≤7 days
- [ ] Future date empty state: "No data yet for this day"
- [ ] Replace "Total Doses" stat with "Missed" count (red icon)

**Files**: `app/(tabs)/calendar.tsx`

### P1.4 — Onboarding Polish

- [ ] Add 3rd screen: "Track Your Adherence" (calendar-check icon)
- [ ] Add step indicator: "1 of 3" below dots
- [ ] Add icon background circle (primaryLight)
- [ ] Persist with `setSetting("onboarded", "true")` from `settings-service.ts`
- [ ] Wire check in `_layout.tsx` — redirect to onboarding if not set

**Files**: `app/onboarding.tsx`, `app/_layout.tsx`

### P1.5 — Settings Screen Completion

- [ ] Notifications section: "Notifications" row → `Linking.openSettings()`, show enabled/disabled status
- [ ] Data section: "Export Data" → JSON file; "Clear All Data" → confirmation dialog → wipe DB + reset onboarding
- [ ] Keep: theme toggle, about, privacy note

**Files**: `app/(tabs)/settings.tsx`

### P1.6 — Missing Components

- [ ] `components/skeleton-card.tsx` — shimmer loading card (Animated opacity 0.3→0.7)
- [ ] `components/permission-banner.tsx` — yellow banner "Notifications disabled" + "Fix This" → `Linking.openSettings()`
- [ ] `components/action-sheet.tsx` — modal overlay with option list + cancel
- [ ] `components/toast-snackbar.tsx` — animated bottom snackbar with undo

### P1.7 — UX Polish

- [ ] Haptic feedback audit — mark taken (Medium), skip (Light), delete (Heavy), save (Success), FAB (Medium), calendar tap (Light)
- [ ] Loading states — SkeletonCard while SQLite loads on Home and Medications
- [ ] Error states — try/catch in hooks, error view with "Try Again" button
- [ ] Inline form validation — red text below fields instead of `Alert.alert()`
- [ ] Dark mode verification on all screens

### P1.8 — Build & Launch

- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `bunx expo start` — no crashes on emulator
- [ ] `eas build --platform android --profile preview`
- [ ] Full manual QA: add → notify → mark taken → calendar; edit → reschedule; delete; toggle; dark mode; empty states; 20+ reminders; notification denied

---

## Phase 2 — Health & Wellness Dashboard

**Goal**: Read sleep + heart rate data from HealthKit (iOS) / Health Connect (Android) and display on a new Health tab.

**Prerequisites**: Bare workflow (`expo prebuild` / EAS Build) — health libs require native code.

### P2.0 — Health Data Infrastructure

- [ ] Install: `npx expo install react-native-health` (iOS), `react-native-health-connect` (Android)
- [ ] Create `services/health-service.ts` — unified API that reads sleep + heart rate + steps on both platforms using `Platform.OS` gates
- [ ] Create `hooks/use-health-data.ts` — exposes `healthData`, `isAvailable`, `permissionGranted`, `initialize()`, `fetchTodayData()`
- [ ] Add health permissions to `app.json`:
  - iOS: `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription`
  - Android: `READ_SLEEP`, `READ_HEART_RATE`, `READ_STEPS`, `SCHEDULE_EXACT_ALARM`
- [ ] Wrap all health API calls in try/catch — permissions can be revoked at any time
- [ ] Never block app flow on health permissions — always optional

**Files**: `services/health-service.ts`, `hooks/use-health-data.ts`, `app.json`, `types/health.ts`

### P2.1 — Health Tab Screen

- [ ] Restore 5th tab: `app/(tabs)/health.tsx` (replaces Settings? or add as 5th tab?)
  - Decision needed: keep 4 tabs (merge health into Home) or expand to 5 tabs
- [ ] `WatchStatusBadge` component — green/amber/grey dot for watch state
- [ ] Sleep card: hero number (7h 23m), quality badge (Poor <6h red, Fair 6-7h amber, Good ≥7h green)
- [ ] Heart rate card: resting BPM hero number, min–max range
- [ ] Steps card: progress bar toward 10,000 goal
- [ ] "Request Permissions" card when not granted (non-blocking)
- [ ] "Last updated" timestamp + manual refresh button

**Files**: `app/(tabs)/health.tsx`, `components/health-stat-card.tsx`, `components/watch-status-badge.tsx`

### P2.2 — Health Snapshot on Home

- [ ] Add compact 2-column health card on Home screen (sleep + resting HR)
- [ ] Only show if health permissions granted (hide entirely if not)
- [ ] Tap → navigate to Health tab

**Files**: `app/(tabs)/index.tsx`

### P2.3 — Smart Insight Card

- [ ] Static insight logic (no AI):
  - Sleep <5h → "Only Xh sleep. Poor rest can reduce medication effectiveness."
  - Sleep 5-6h → "Xh sleep is a little low. Aim for 7–9 hours."
  - Sleep ≥7h → "Great sleep last night! Good rest helps absorption."
  - HR >100 BPM → "Your resting HR seems elevated. Consider mentioning this to your doctor."
- [ ] Show as card in Health tab, below stats

**Files**: `components/insight-card.tsx`, `app/(tabs)/health.tsx`

### P2.4 — Onboarding Health Screen

- [ ] Add health opt-in screen to onboarding (before notification screen)
- [ ] "Connect Your Health Data" — explain sleep/HR integration
- [ ] "Connect Health →" triggers health permission request
- [ ] "Skip for now" moves to next screen

**Files**: `app/onboarding.tsx`

**Verify**: Grant health permissions → see sleep + HR data on Health tab + Home snapshot; deny → app works normally without health data

---

## Phase 3 — Smartwatch Integration

**Goal**: Bridge messaging with Apple Watch (iOS) and WearOS (Android). Phone sends reminders to watch, watch can mark doses as taken.

**Prerequisites**: Bare workflow. Watch apps are native (Swift/Kotlin) — this phase covers the phone-side bridge only.

### P3.0 — Watch Service Infrastructure

- [ ] Install: `npm install react-native-watch-connectivity` (iOS), `react-native-wear-connectivity` (Android)
- [ ] Create `services/watch-service.ts` — Platform.OS-gated messaging bridge
- [ ] Create `hooks/use-watch.ts` — exposes `isReachable`, `isPaired`, `sendTodayReminders()`, `sendMarkTaken()`
- [ ] Gate imports: never import watch libs on wrong platform (crash)
- [ ] Messages from phone → watch: `{ type: 'TODAY_REMINDERS', reminders: [...] }`, `{ type: 'MARK_TAKEN', reminderId }`
- [ ] Messages from watch → phone: `{ type: 'MARK_TAKEN', reminderId }` → log dose + emit adherence event
- [ ] Conflict resolution: if already marked, prefer most recent timestamp

**Files**: `services/watch-service.ts`, `hooks/use-watch.ts`

### P3.1 — Watch Status Badge

- [ ] `WatchStatusBadge` component — 🟢 Connected / 🟡 Paired / ⚫ No Watch
- [ ] Show on Home header (top right) and Health tab header
- [ ] Update in real-time via reachability listener

**Files**: `components/watch-status-badge.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/health.tsx`

### P3.2 — Auto-Sync Reminders

- [ ] On app open: send today's reminders to watch via `sendTodayReminders()`
- [ ] On reminder add/edit/delete: re-sync
- [ ] On mark taken from phone: send `MARK_TAKEN` to watch
- [ ] On mark taken from watch: receive and log, emit adherence event

**Files**: `app/_layout.tsx`, `hooks/use-reminders.ts`, `hooks/use-adherence.ts`

**Verify**: Pair watch → status badge turns green → reminders appear on watch → mark taken on watch → dose logged on phone

---

## Phase 4 — Gamification & Engagement

**Goal**: Keep users engaged with streaks, achievements, and celebratory moments.

### P4.0 — Achievement System

- [ ] Define achievements in `constants/achievements.ts`:
  - "First Step" — add first reminder
  - "Week Warrior" — 7-day streak
  - "Monthly Master" — 30-day streak
  - "Centurion" — 100 doses taken
  - "Never Miss" — 100% adherence for a month
- [ ] Store unlocked achievements in SQLite: `achievements` table (id, key, unlocked_at)
- [ ] Create `hooks/use-achievements.ts` — check/unlock logic, list unlocked

**Files**: `constants/achievements.ts`, `services/database.ts` (new table), `hooks/use-achievements.ts`

### P4.1 — Streak Display Enhancement

- [ ] Show streak prominently on Home (not just in progress card — dedicated streak card)
- [ ] Streak animation: number roll/count-up when streak increases
- [ ] "Streak at risk" warning if user hasn't marked today's last dose yet and it's past the time

**Files**: `app/(tabs)/index.tsx`

### P4.2 — Confetti Celebrations

- [ ] Install: `npm install react-native-confetti-cannon`
- [ ] Trigger confetti on streak milestones (7, 14, 30, 60, 90, 365 days)
- [ ] Trigger confetti on first dose marked taken
- [ ] Keep it tasteful — not every action, only milestones

**Files**: `app/(tabs)/index.tsx` or dedicated component

### P4.3 — Achievements Screen

- [ ] Add "Achievements" section in Settings (or dedicated screen)
- [ ] Grid of achievement badges: unlocked (colored, date) vs locked (grey, "???")
- [ ] Show total unlocked count

**Files**: `app/(tabs)/settings.tsx` or new screen

**Verify**: Get 7-day streak → confetti + "Week Warrior" achievement unlocked; check achievements list

---

## Phase 5 — Advanced Notifications

**Goal**: Smarter notification behavior — follow-ups, refill alerts, quiet hours.

### P5.0 — Follow-Up Reminders

- [ ] If a dose time passes without the user marking taken/skipped, send a follow-up notification 30 minutes later
- [ ] Follow-up body: "Still haven't taken [name]? Tap Done or Snooze."
- [ ] Only send once per dose per day (no spam)
- [ ] Use `expo-task-manager` for background check on app open

**Files**: `services/notification-service.ts`, `hooks/use-reminders.ts`

### P5.1 — Refill Reminder UI

- [ ] Add "Track Stock" toggle in drug form row (progressive disclosure)
- [ ] When toggled: show "Pills remaining" + "Alert at" number inputs
- [ ] When `currentStock ≤ stockThreshold`:
  - Show red "Low Stock" badge on reminder card and medications list
  - Send refill notification (already implemented in `scheduleRefillReminder`)
- [ ] Decrement `currentStock` when dose marked taken (in `use-adherence.ts`)
- [ ] Show stock indicator bar (green → yellow → red) in drug form row

**Files**: `components/drug-form-row.tsx`, `components/swipeable-medication-card.tsx`, `hooks/use-adherence.ts`

### P5.2 — Quiet Hours

- [ ] Add "Quiet Hours" in Settings: start time + end time pickers
- [ ] Store in settings table
- [ ] Suppress notification sound during quiet hours (still show silently)
- [ ] Notification body during quiet: "[name] — [drug]" (no sound, no vibration)

**Files**: `app/(tabs)/settings.tsx`, `services/notification-service.ts`

### P5.3 — Vacation Mode

- [ ] Add "Vacation Mode" toggle in Settings
- [ ] When enabled: pause all reminders for a date range
- [ ] Pick start/end dates (DateTimePicker)
- [ ] Auto-resume after vacation end date
- [ ] Show vacation banner on Home when active: "Vacation mode — reminders paused until [date]"

**Files**: `app/(tabs)/settings.tsx`, `services/notification-service.ts`

**Verify**: Enable vacation → all reminders paused → no notifications → after end date → auto-resume

---

## Phase 6 — Visual Polish & Animations

**Goal**: Make the app feel premium with custom typography, smooth animations, and polished micro-interactions.

### P6.0 — Custom Fonts

- [ ] Install: `npx expo install expo-font @expo-google-fonts/dm-sans @expo-google-fonts/dm-serif-display`
- [ ] Load fonts in `_layout.tsx` with `useFonts`
- [ ] Update `constants/typography.ts` to use DM Sans for body/UI, DM Serif Display for headings
- [ ] Apply to all screens via global font family setting

**Files**: `app/_layout.tsx`, `constants/typography.ts`, `constants/colors.ts`

### P6.1 — Reanimated Animations

- [ ] **FAB press**: spring scale 1 → 0.9 → 1 (200ms)
- [ ] **Mark as Taken**: card scale 1 → 0.97, button crossfade to checkmark (300ms)
- [ ] **Card appear**: staggered fade-in + slide-up 20px (250ms delay per card)
- [ ] **Progress bar fill**: width animated 0 → 100% (600ms ease-out)
- [ ] **Frequency badge**: fade-out → fade-in on change (150ms)
- [ ] **Calendar day select**: dot scale 1 → 1.15 → 1 (200ms)
- [ ] **Day detail panel**: slide up from bottom 40px (250ms ease-out)
- [ ] **Delete swipe**: slide out left + height collapse (300ms)
- [ ] **Drug chip added**: scale in from 0.8 → 1 (200ms)
- [ ] **Tab switch**: native (handled by Expo Router)

**Files**: all card/list components

### P6.2 — Tab Bar Badge

- [ ] Home tab: show badge count of pending (not-yet-taken) reminders
- [ ] Health tab: pulsing dot if health data is stale (>4 hours)

**Files**: `app/(tabs)/_layout.tsx`

### P6.3 — Notification Preview

- [ ] Add live notification preview at bottom of Add/Edit Reminder form
- [ ] Shows mock notification card with reminder name + drug list
- [ ] Updates in real-time as user types

**Files**: `components/notification-preview.tsx`, `app/add-reminder.tsx`, `app/edit-reminder/[id].tsx`

**Verify**: All animations feel smooth at 60fps; no jank on lists; custom fonts render correctly

---

## Phase 7 — Data Management & Details

**Goal**: Medication detail screen, charts, data export/import.

### P7.0 — Medication Detail Screen

- [ ] Create `app/medication/[id].tsx` — route from tapping a medication card
- [ ] Full schedule overview: time, days, drugs, start/end dates
- [ ] 30-day adherence bar chart (use `react-native-gifted-charts`)
- [ ] Dose history log: list of all taken/skipped/missed entries with dates
- [ ] Edit / Pause / Delete actions (same as long-press on medications list)

**Files**: `app/medication/[id].tsx`, `hooks/use-adherence.ts`

### P7.1 — Data Export & Import

- [ ] **Export**: serialize all reminders + adherence logs → JSON → save to device via `expo-file-system` + `expo-sharing`
- [ ] **Import**: pick JSON file → validate schema → merge or replace data in SQLite
- [ ] Show export date in Settings
- [ ] Handle conflicts on import (duplicate IDs, overlapping date ranges)

**Files**: `app/(tabs)/settings.tsx`, new `utils/data-export.ts`

### P7.2 — User Profile

- [ ] Add name field in Settings (stored in settings table)
- [ ] Use name in Home greeting: "Good morning, [Name]!"
- [ ] Optional avatar picker (emoji selection)

**Files**: `app/(tabs)/settings.tsx`, `app/(tabs)/index.tsx`

### P7.3 — Charts & Statistics

- [ ] Install: `npm install react-native-gifted-charts`
- [ ] Weekly adherence bar chart (Mon–Sun, green/red bars)
- [ ] Monthly trend line (adherence % over 3 months)
- [ ] "Best day" / "Most missed reminder" stats

**Files**: new `components/adherence-chart.tsx`, integrate into Calendar or dedicated Stats section

**Verify**: Tap medication → see full detail + 30-day chart; export → import on fresh install → data restored

---

## Phase 8 — iOS & Cross-Platform

**Goal**: Full iOS support, platform-specific fixes, native module compatibility.

### P8.0 — iOS Build Setup

- [ ] Configure `eas.json` with iOS build profile
- [ ] Run `npx expo prebuild` to generate native iOS project
- [ ] Install CocoaPods: `cd ios && pod install`
- [ ] Configure `Info.plist` for health permissions
- [ ] Build with `eas build --platform ios --profile preview`

**Files**: `eas.json`, `app.json`, `ios/`

### P8.1 — iOS-Specific Fixes

- [ ] DateTimePicker: use `display="spinner"` or `display="compact"` on iOS (not modal)
- [ ] KeyboardAvoidingView: `behavior="padding"` on iOS vs `"height"` on Android
- [ ] Notification sound: iOS uses default system sound, no channel needed
- [ ] SafeAreaView: already using `react-native-safe-area-context`
- [ ] iOS haptics: verify `expo-haptics` works on iOS device
- [ ] iOS dark mode: verify system dark mode applies correctly

### P8.2 — HealthKit Integration (iOS)

- [ ] Gate `react-native-health` imports with `Platform.OS === 'ios'`
- [ ] Request HealthKit permissions: SleepAnalysis, HeartRate, RestingHeartRate
- [ ] Read sleep samples for last 7 days
- [ ] Read heart rate samples
- [ ] Cache last-known health data in SQLite for offline access
- [ ] Never write health data (read-only)

**Files**: `services/health-service.ts`

### P8.3 — Health Connect (Android)

- [ ] Gate `react-native-health-connect` imports with `Platform.OS === 'android'`
- [ ] Request Health Connect permissions: SleepSession, HeartRate, Steps
- [ ] Read sleep session data
- [ ] Read heart rate records
- [ ] Handle Health Connect availability check (may not be installed)
- [ ] Show "Install Health Connect" prompt if not available

**Files**: `services/health-service.ts`

### P8.4 — Cross-Platform Testing

- [ ] Test on iOS Simulator + Android Emulator
- [ ] Test on physical iPhone + Android device
- [ ] Verify all features work on both platforms
- [ ] Fix any platform-specific layout issues (SafeArea, keyboard, status bar)

**Verify**: App builds and runs identically on iOS and Android

---

## Phase 9 — Production Launch

**Goal**: Store-ready app with monitoring, crash reporting, and polished store listing.

### P9.0 — Crash Reporting & Analytics

- [ ] Install: `npm install expo-sentry` (or `@sentry/react-native`)
- [ ] Configure Sentry DSN in `app.json`
- [ ] Add source maps upload to EAS build config
- [ ] Add error boundaries around health/watch integration sections
- [ ] Add performance monitoring for key screens
- [ ] Strip console.log in production (`__DEV__` gate)

**Files**: `app.json`, `eas.json`, `app/_layout.tsx`

### P9.1 — App Icon & Splash

- [ ] Design app icon (1024x1024, adaptive for Android)
- [ ] Configure icon in `app.json` (expo-icon + adaptive-icon)
- [ ] Design splash screen (background color + icon)
- [ ] Configure splash in `app.json` (expo-splash-screen)
- [ ] Generate all icon sizes via `npx expo prebuild` + asset generation

**Files**: `app.json`, `assets/`

### P9.2 — Store Listing Preparation

- [ ] **Google Play**:
  - Prepare screenshots (6-8 device frames)
  - Write app description (short + full)
  - Set category: Medical / Health & Fitness
  - Content rating: questionnaires
  - Privacy policy URL
  - Target API level
  - `eas build --platform android --profile production`
  - `eas submit --platform android`
- [ ] **App Store**:
  - Prepare screenshots (6.7" and 6.5" device frames)
  - Write app description
  - Set category: Medical
  - Privacy policy + terms of service URLs
  - App Review guidelines compliance (no hardcoded data, no web views for core features)
  - `eas build --platform ios --profile production`
  - `eas submit --platform ios`

**Files**: store assets, metadata

### P9.3 — Final QA Pass

- [ ] **Full regression test** on both platforms:
  1. Fresh install → onboarding (all 4 screens) → add reminder → notification fires → mark taken → calendar shows green → streak updates
  2. Edit reminder → notifications reschedule → old ones cancelled
  3. Delete reminder → notifications cancelled → logs preserved
  4. Toggle active → notifications cancelled/restored
  5. Calendar retroactive marking (past 7 days)
  6. Health permissions (grant + deny) → graceful fallback
  7. Dark mode across all screens
  8. Empty states (0 reminders)
  9. Performance with 50+ reminders
  10. Notification denied → permission banner → system settings
  11. Export → clear all → import → data restored
  12. Vacation mode → pause → auto-resume
  13. Follow-up notification (30 min late)
  14. Refill warning → low stock badge → refill notification
  15. Achievement milestones → confetti
  16. All animations smooth (no jank)
  17. All haptics working
  18. All accessibility labels present
  19. Keyboard avoid on all form screens
  20. Back navigation works correctly on all screens
- [ ] **Performance**: cold start < 3s, screen transitions < 300ms
- [ ] **Memory**: no leaks (check with React DevTools profiler)
- [ ] **Battery**: minimal background usage
- [ ] **Offline**: app works 100% without internet
- [ ] **Accessibility**: test with TalkBack (Android) and VoiceOver (iOS)

### P9.4 — Post-Launch Monitoring

- [ ] Set up Sentry alert rules (new crash rate > threshold)
- [ ] Monitor notification delivery rate
- [ ] Monitor daily/weekly active users
- [ ] Plan v1.1 hotfix timeline based on early user feedback

**Verify**: App published to both stores, crash-free, monitoring active

---

## Dependency Graph (All Phases)

```
Phase 1 (MVP) ──┬──► Phase 2 (Health)
                ├──► Phase 3 (Watch) ── depends on Phase 2
                ├──► Phase 4 (Gamification) ── independent
                ├──► Phase 5 (Adv Notifications) ── independent
                └──► Phase 6 (Visual Polish) ── independent

Phase 7 (Data) ── independent of 2-6, but benefits from 4 (achievements)

Phase 8 (iOS) ── depends on Phase 2 (health libs)

Phase 9 (Launch) ── depends on all above
```

**Recommended execution order**: 1 → 2 → 6 → 5 → 4 → 7 → 3 → 8 → 9

---

## Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout: DB init, notifications, splash |
| `app/(tabs)/_layout.tsx` | Tab navigator |
| `app/(tabs)/index.tsx` | Home — today's reminders + health snapshot |
| `app/(tabs)/calendar.tsx` | Calendar adherence view |
| `app/(tabs)/medications.tsx` | All reminders management |
| `app/(tabs)/settings.tsx` | Theme, notifications, data, about |
| `app/add-reminder.tsx` | Add new reminder form |
| `app/edit-reminder/[id].tsx` | Edit existing reminder |
| `app/onboarding.tsx` | First-launch onboarding |
| `services/database.ts` | SQLite CRUD |
| `services/notification-service.ts` | Notification scheduling |
| `services/settings-service.ts` | Key-value settings |
| `services/event-bus.ts` | Pub/sub for reminders + adherence |
| `hooks/use-reminders.ts` | Reminder CRUD + filtering |
| `hooks/use-adherence.ts` | Dose logging + stats |
| `types/reminder.ts` | Reminder, Drug, Weekday types |
| `types/adherence.ts` | AdherenceLog, DoseStatus |
| `types/health.ts` | SleepData, HeartRateData, HealthData |
| `utils/date-helpers.ts` | Formatting, streak, color logic |
| `constants/colors.ts` | Color palette + dark mode |
| `constants/typography.ts` | Font scale + weights |
| `constants/spacing.ts` | Spacing, radius, shadow tokens |

### Packages to Install (by phase)
| Package | Phase |
|---------|-------|
| `expo-sqlite` | P1 (done) |
| `expo-notifications` | P1 (done) |
| `expo-haptics` | P1 (done) |
| `@shopify/flash-list` | P1 (done) |
| `react-native-calendars` | P1 (done) |
| `react-native-reanimated` | P1 (done) |
| `react-native-gesture-handler` | P1 (done) |
| `@gorhom/bottom-sheet` | P1 (done) |
| `react-native-health` | P2 |
| `react-native-health-connect` | P2 |
| `react-native-watch-connectivity` | P3 |
| `react-native-wear-connectivity` | P3 |
| `react-native-confetti-cannon` | P4 |
| `react-native-gifted-charts` | P7 |
| `expo-font` | P6 |
| `@expo-google-fonts/dm-sans` | P6 |
| `@expo-google-fonts/dm-serif-display` | P6 |
| `expo-file-system` | P7 |
| `expo-sharing` | P7 |
| `expo-sentry` | P9 |
