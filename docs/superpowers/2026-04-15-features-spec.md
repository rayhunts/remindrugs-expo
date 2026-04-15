# ReminDrugs — Feature Specification

> Complete feature inventory of the ReminDrugs medication reminder app.
> Intended as the authoritative reference for the Tauri + Dioxus rewrite.

---

## Core Features

### F1. Medication Management (Drugs)

CRUD operations for standalone drug entries.

**Fields:**
- Name (required, text)
- Dosage (optional, text — e.g. "500mg", "10mL")
- Form (required, enum: tablet | capsule | liquid | injection | patch | inhaler | drops | other)
- Quantity per dose (number, default 1, supports fractions via REAL)
- Notes (optional, text — e.g. "take with food")
- Color tag (optional, one of 6 predefined hex colors)
- Current stock (optional, number — pills/units remaining)
- Stock alert threshold (optional, number — trigger refill reminder at this level)

**Behavior:**
- Drugs can exist standalone or be linked to reminders via a many-to-many junction table
- Deleting a drug cascades: removes it from all reminders and adherence logs
- Stock tracking is optional — only shown on the edit screen, not the add screen
- Low stock triggers an immediate refill notification when saved

**Validation:**
- Name is required
- Quantity must be >= 0
- Stock threshold must be >= 0 if provided

---

### F2. Reminder Management

Create, edit, and delete time-based medication reminders.

**Fields:**
- Name (required, text — e.g. "Morning Meds")
- Time (required, hour + minute)
- Days of week (required, at least one, 0=Sun through 6=Sat)
- Linked drugs (required, at least one — via junction table)
- Active/inactive toggle
- Start date (optional)
- End date (optional)
- Created at (auto-set timestamp)

**Frequency badge:**
- All 7 days selected → "Daily" (green badge)
- Single day selected → "Weekly" (blue badge)
- Mixed selection → "Custom" (amber badge)

**Notification scheduling:**
- One weekly recurring notification per selected day, per linked drug
- Custom notification sound (`pill_bottle_shake.mp3`)
- Notification category with two action buttons: "Done" and "Snooze 15m"
- On save: cancel old notifications, schedule new ones
- On delete: cancel all scheduled notifications

**Behavior:**
- Reminders are filtered on the Home screen: must be active, match current weekday, and fall within start/end date range (if set)
- Long-press on a reminder card shows an action sheet: Mark All Taken, Skip All, Edit

**Validation:**
- Name required
- At least one day must be selected
- At least one drug must be linked

---

### F3. Push Notifications

Local notifications scheduled via the OS notification system.

**Notification types:**
| Type | Trigger | Content |
|------|---------|---------|
| Reminder | Scheduled weekly per day | Drug name + dosage, time |
| Snooze | User taps "Snooze 15m" | Same content, 15 min later |
| Refill | Drug stock at/below threshold | Drug name + "running low" |

**Notification channel:**
- Channel ID: `remindrugs-channel`
- Channel name: "Medication Reminders"
- Importance: high
- Custom sound: `pill_bottle_shake.mp3`
- Badge count: auto-managed

**Action buttons:**
- "Done" → marks all drugs in the reminder as taken
- "Snooze 15m" → schedules a one-shot notification 15 minutes from now

**Foreground handling:**
- Notifications received while app is in foreground still display (banner + sound)
- Action button taps are handled via notification response listeners

---

### F4. Adherence Tracking

Track whether each dose was taken, missed, or skipped per drug per reminder per day.

**Log entry:**
- Reminder ID + Drug ID + Date (composite key — each drug in a reminder is tracked independently)
- Status: taken | missed | skipped
- Taken at timestamp (set when marked taken)
- Notes (optional)

**Operations:**
- Mark individual drug as taken (with undo support via toast)
- Mark all drugs in a reminder as taken at once
- Skip all drugs in a reminder
- Mark individual drug as missed
- Undo last taken action (removes the log entry)
- Bulk mark for past dates: "All Taken" or "All Missed" (within last 7 days only)

**State management:**
- Zustand store with optimistic updates for immediate UI feedback
- Event bus (`adherenceEvents`) notifies listeners of changes
- Persisted to SQLite `adherence_logs` table

---

### F5. Calendar View

Monthly calendar with adherence visualization.

**Calendar grid:**
- Standard month grid with day-of-week headers
- Day cells show dot indicators:
  - Green dot = all doses taken
  - Yellow dot = partially taken
  - Red dot = any missed doses
- Selected day is highlighted with primary color ring

**Stats row (top of screen):**
| Stat | Calculation |
|------|-------------|
| Adherence % | (taken / total logged) × 100 for selected month |
| Day Streak | Consecutive days with all doses taken, counting back from today |
| Missed Doses | Count of missed status logs for selected month |

**Day detail panel:**
- When a day is tapped, shows all scheduled reminders and their drugs
- Each drug shows a status badge: Taken (green), Missed (red), Skipped (gray)
- Taken entries show the time they were marked
- Bulk action buttons for past dates (within 7 days): "All Taken" and "All Missed"
- "All logged" message when every drug already has a status

**Legend:**
- Color legend at bottom: green = all taken, yellow = partial, red = missed

---

### F6. Prescription OCR Scanning

On-device OCR to extract medications from prescription images.

**Flow:**
1. User taps "Scan Prescription" button (from Add Drug screen)
2. Choose: Take Photo (camera) or Pick Image (gallery)
3. Image processed by ML Kit OCR (Latin model, on-device)
4. Raw OCR text shown in collapsible box
5. Regex-based parser extracts: drug name, dosage, quantity, form
6. Extracted medications shown as editable cards
7. User can remove individual extractions or edit fields
8. "Add All Medications" saves each as a drug and navigates back

**Parser capabilities:**
- Dosage patterns: mg, mcg, mL, g, %, IU, units
- Quantity patterns: "Take 1 tablet", "half tablet"
- Form detection: maps keywords to DrugForm enum
- SIG code parsing: BID, TID, QID, QD, PRN, HS, AC, PC, PO, numeric patterns (1x1, 2x1, 1-0-1)
- Deduplication by name+dosage

---

### F7. Home Dashboard

Main screen showing today's medication schedule.

**Layout (top to bottom):**
1. Greeting — time-aware ("Good morning/afternoon/evening") with weather icon
2. Date — locale-formatted long date string
3. Progress card — animated progress bar (taken/total doses), streak badge
4. Permission banner — shown only if notifications are disabled
5. Reminder list — grouped by time period:
   - Morning (before 12:00)
   - Afternoon (12:00–17:00)
   - Evening (17:00–21:00)
   - Night (21:00+)
   - Completed (all drugs taken)
6. FAB — floating action button, opens Add Reminder

**Reminder card interactions:**
- Tap drug chip → mark that drug as taken (with undo toast)
- Long-press card → action sheet (Mark All Taken, Skip All, Edit)
- Tap "Mark Remaining" → marks all untaken drugs in that reminder

**Empty state:**
- When no reminders scheduled for today: icon + "No meds today!" + "Add Reminder" button

**Pull-to-refresh:**
- Re-fetches all reminder and adherence data from the database

---

### F8. Data Management

Export and clear all app data.

**Export:**
- Exports reminders, drugs, reminder_drugs, and adherence_logs as JSON
- Uses system share sheet (file sharing intent)
- File format: JSON with all tables as arrays

**Clear all data:**
- Two-step destructive confirmation (alert dialog)
- Deletes all rows from all tables (settings preserved)
- Shows success toast after clearing

---

### F9. Onboarding

Three-step first-run experience.

**Steps:**
| Step | Title | Description | Icon |
|------|-------|-------------|------|
| 1 | Welcome to ReminDrugs | Never miss a dose again. Manage all your medications in one simple, private app. | Pill |
| 2 | Track Your Adherence | See your medication history on a calendar. Track streaks, view monthly stats, and retroactively log doses. | Calendar-check |
| 3 | Never Miss a Dose | Sends a gentle reminder at exactly the right time, every day. You can even snooze for 15 minutes. | Bell |

**Behavior:**
- Animated fade + slide transitions between steps
- Dot indicators showing current step
- "Next" primary button, "Skip" text button
- Step 3 "Enable Reminders" button requests notification permission
- "Maybe later" option on step 3 skips notification setup
- On completion: sets onboarding flag in settings, navigates to Home
- Skipped if `onboarding_completed` setting is already true

---

### F10. Settings

App configuration screen.

**Sections:**

| Section | Options |
|---------|---------|
| Notifications | Status (enabled/disabled), link to system notification settings |
| Appearance | Theme picker: System / Light / Dark (icon buttons) |
| Language | Locale picker: English / Bahasa Indonesia |
| Data | Export Data (JSON), Clear All Data (destructive confirmation) |
| About | App icon, name "ReminDrugs", version, privacy note |

**Persistence:**
- Theme preference stored in SQLite `settings` table
- Language preference stored in SQLite `settings` table
- Theme respects system appearance changes when set to "System"

---

### F11. Theming

Light and dark mode support.

**Behavior:**
- Three modes: System (default), Light, Dark
- Theme provider wraps the entire app
- Each screen/component reads colors from `getColors(scheme)`
- System mode listens to OS appearance change events
- Persisted to settings table, survives app restart

---

### F12. Localization

Multi-language support.

**Supported languages:**
- English (default)
- Bahasa Indonesia

**Coverage:**
- All user-facing strings are externalized
- Translation keys organized by domain: tabs, common, home, medications, calendar, settings, onboarding, reminders, editDrug, components, days, scan
- Date/time formatting uses locale-aware formatters
- Day abbreviations are localized

---

### F13. Haptic Feedback

Tactile feedback on user interactions.

**Triggers:**
- Button presses
- Successful actions (mark taken, save)
- Destructive actions (delete)
- Error states

---

## Feature Dependencies

```
F1 (Medications) ← F2 (Reminders require drugs)
F2 (Reminders) ← F3 (Notifications scheduled per reminder)
F2 (Reminders) ← F4 (Adherence tracked per reminder+drug)
F4 (Adherence) ← F5 (Calendar displays adherence data)
F1 (Medications) ← F6 (OCR creates drugs)
F7 (Home) depends on F2, F4
F9 (Onboarding) ← F3 (requests notification permission)
F10 (Settings) manages F11, F12
F8 (Data) manages F1, F2, F4 data
```

---

## Acceptance Criteria Summary

| ID | Feature | Must Have |
|----|---------|-----------|
| F1 | Drug CRUD | Name, dosage, form, quantity, notes, color, stock tracking |
| F2 | Reminder CRUD | Name, time, days, linked drugs, frequency badge, notifications |
| F3 | Notifications | Scheduled, snooze, refill alerts, action buttons, custom sound |
| F4 | Adherence | Taken/missed/skipped per drug per reminder per day, undo, bulk actions |
| F5 | Calendar | Monthly view with dots, stats row, day detail, bulk mark |
| F6 | OCR Scan | Camera/gallery, OCR, parse, editable results, save all |
| F7 | Home | Greeting, progress, grouped reminders, mark taken, empty state |
| F8 | Data | Export JSON, clear all with confirmation |
| F9 | Onboarding | 3 steps, animated, notification permission request |
| F10 | Settings | Notifications, theme, language, data export/clear, about |
| F11 | Theming | Light/dark/system modes, full palette per mode |
| F12 | i18n | English + Indonesian, all strings externalized |
| F13 | Haptics | Feedback on key interactions |
