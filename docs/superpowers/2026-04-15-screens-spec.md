# ReminDrugs — Screen Specifications

> Detailed layout and behavior spec for every screen.
> Reference this alongside the Design System spec when building the Tauri UI.

---

## Navigation Architecture

### Structure
```
Root
├── (tabs)
│   ├── /home
│   ├── /medications
│   ├── /calendar
│   └── /settings
├── /add-reminder (modal)
├── /edit-reminder/:id
├── /add-drug
├── /edit-drug/:id
├── /scan-prescription
└── /onboarding
```

### Tab Bar
- Position: Bottom (mobile) → Sidebar (desktop improvement)
- 4 tabs: Home, Medications, Calendar, Settings
- Active tab: `primary` color icon
- Inactive tab: `text-tertiary` icon
- Each tab shows icon + label below

---

## S1. Home Screen (`/home`)

### Layout (top to bottom)

```
┌──────────────────────────────────────┐
│ ☀️ Good morning           [weather]   │  ← Greeting row
│    Tuesday, April 15, 2026           │  ← Date
│                                      │
│ ┌──────────────────────────────────┐ │
│ │  Today's Progress          🔥 7  │ │  ← Progress card
│ │  ████████████░░░░  3 of 5 taken │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ⚠️ Notifications disabled            │  ← Permission banner
│    [Fix This]                   [✕]  │     (conditional)
│                                      │
│ Morning                             │  ← Time group header
│ ┌──────────────────────────────────┐ │
│ │ [💊] Morning Meds    08:00 AM   │ │  ← ReminderCard
│ │       Every day    [Daily]      │ │
│ │ ┌────────┐ ┌────────┐ ┌──────┐  │ │
│ │ │Aspirin │ │Metfor- │ │ +2   │  │ │  ← DrugChips
│ │ │500mg ✓ │ │min     │ │ more │  │ │
│ │ └────────┘ └────────┘ └──────┘  │ │
│ │ [✓ Mark Remaining (2)]          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Afternoon                           │  ← Time group header
│ ┌──────────────────────────────────┐ │
│ │ [💉] Afternoon Shot  14:00 PM   │ │
│ │       Mon, Wed, Fri [Custom]    │ │
│ │ ┌────────────────────────────┐  │ │
│ │ │ Insulin         10 units   │  │ │
│ │ └────────────────────────────┘  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Completed                           │  ← Completed group
│ ┌──────────────────────────────────┐ │
│ │ [💊] Night Vitamins  21:00 PM   │ │  ← dimmed
│ │       Every day    [Daily]      │ │
│ │ All doses taken ✓               │ │
│ └──────────────────────────────────┘ │
│                                      │
│                          [+ FAB]    │  ← Floating action button
└──────────────────────────────────────┘
```

### Behavior
- **Greeting logic:** 00:00-11:59 → morning, 12:00-16:59 → afternoon, 17:00+ → evening
- **Time groups:** Morning (<12:00), Afternoon (12:00-16:59), Evening (17:00-20:59), Night (21:00+), Completed
- **Progress calculation:** count of taken doses / total scheduled doses for today
- **Streak badge:** consecutive days with all doses taken (from adherence logs)
- **Pull-to-refresh:** re-fetches reminders and adherence data
- **FAB:** navigates to `/add-reminder`

### Empty State
```
        [💊]
   No meds today!
   Enjoy your day or add
   a new reminder.

   [+ Add Reminder]
```

### Action Sheet (long-press on ReminderCard)
```
┌──────────────────────┐
│  ✓ Mark All Taken    │
│  ─────────────────── │
│  → Skip All          │
│  ─────────────────── │
│  ✏️ Edit Reminder    │
│  ─────────────────── │
│     Cancel           │
└──────────────────────┘
```

---

## S2. Medications Screen (`/medications`)

### Layout

```
┌──────────────────────────────────────┐
│ Medications                    (12)  │  ← Header with count
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [●] Aspirin               [→]   │ │  ← MedicationCard
│ │     500mg · Tablet              │ │
│ │     1x per dose                 │ │
│ │     📦 24 remaining             │ │
│ │     USED IN REMINDERS           │ │
│ │     Morning Meds                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [●] Metformin             [→]   │ │
│ │     850mg · Tablet              │ │
│ │     1x per dose                 │ │
│ │     📦 5 remaining  ⚠️ Low Stock │ │
│ │     USED IN REMINDERS           │ │
│ │     Morning Meds, Evening Meds  │ │
│ └──────────────────────────────────┘ │
│                                      │
│                          [+ FAB]    │
└──────────────────────────────────────┘
```

### Behavior
- **Card tap:** navigates to `/edit-drug/:id`
- **FAB:** navigates to `/add-drug`
- **Color dot:** left side of card, uses drug's assigned color
- **Low stock:** yellow warning badge when `current_stock <= stock_threshold`
- **Linked reminders:** shown as comma-separated names

### Empty State
```
        [💊]
   No medications yet
   Add your first medication
   reminder to get started.

   [+ Add Medication]
```

---

## S3. Calendar Screen (`/calendar`)

### Layout

```
┌──────────────────────────────────────┐
│ Calendar                             │
│                                      │
│ ┌──────────┐┌──────────┐┌─────────┐ │
│ │ Adherence││Day Streak││ Missed  │ │  ← Stats row
│ │   87%    ││   7 days ││   3     │ │
│ └──────────┘└──────────┘└─────────┘ │
│                                      │
│      ◀  April 2026  ▶               │  ← Month navigation
│ ┌───┬───┬───┬───┬───┬───┬───┐      │
│ │Sun│Mon│Tue│Wed│Thu│Fri│Sat│      │  ← Day headers
│ ├───┼───┼───┼───┼───┼───┼───┤      │
│ │   │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │      │
│ │   │ ● │ ● │ ● │ ● │ ● │ ● │      │  ← Dots
│ ├───┼───┼───┼───┼───┼───┼───┤      │
│ │ 7 │ 8 │ 9 │10 │11 │12 │13 │      │
│ │ ● │ ● │ ● │ ● │ ● │ ● │ ● │      │
│ ├───┼───┼───┼───┼───┼───┼───┤      │
│ │14 │15 │   │   │   │   │   │      │
│ │ ● │ ◉ │   │   │   │   │   │      │  ← ◉ = selected
│ └───┴───┴───┴───┴───┴───┴───┘      │
│                                      │
│ April 15, 2026                       │  ← Selected date header
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 08:00 AM  Morning Meds          │ │  ← Day detail
│ │   Aspirin 500mg     [Taken ✓]   │ │
│ │   Metformin 850mg   [Taken ✓]   │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 14:00 PM  Afternoon Shot        │ │
│ │   Insulin 10 units   [Missed ✕] │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [All Taken]  [All Missed]           │  ← Bulk actions (past dates)
│                                      │
│ ● All taken  ● Partial  ● Missed   │  ← Legend
└──────────────────────────────────────┘
```

### Behavior
- **Month swipe:** swipe left/right or tap arrows to change month
- **Day tap:** selects day, shows detail panel below
- **Dot colors:** green = all taken, yellow = partial, red = any missed
- **Stats:** calculated for the currently displayed month
- **Bulk actions:** only shown for dates within the last 7 days and only for unlogged drugs
- **"All logged":** shown when every drug for the selected date already has a status

### Empty Day Detail
```
   No medications scheduled
   for this day
```

---

## S4. Settings Screen (`/settings`)

### Layout

```
┌──────────────────────────────────────┐
│ Settings                             │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🔔 Notifications                 │ │  ← Section: Notifications
│ │    Enabled                       │ │
│ │                          [→]     │ │  → System settings
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🎨 Appearance                    │ │  ← Section: Appearance
│ │    Theme                         │ │
│ │    [System] [Light] [Dark]       │ │  ← Icon buttons
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🌐 Language                      │ │  ← Section: Language
│ │    English                       │ │
│ │                          [→]     │ │  → Language picker
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 💾 Data                          │ │  ← Section: Data
│ │    Export Data                   │ │
│ │    Save reminders and logs as    │ │
│ │    JSON                    [→]   │ │
│ │    ─────────────────────────── │ │
│ │    Clear All Data               │ │
│ │    Delete reminders and logs    │ │
│ │                          [→]   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │          [App Icon]              │ │  ← Section: About
│ │        ReminDrugs                │ │
│ │          v1.0.0                  │ │
│ │                                  │ │
│ │  All data stored locally on your │ │
│ │  device. ReminDrugs never sends  │ │
│ │  your information to any         │ │
│ │  external server.                │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Behavior
- **Notifications row:** shows current status (Enabled/Disabled/Checking...), tap opens system notification settings
- **Theme:** three toggle buttons, active one has `primary` bg, icons are sun/moon/cellphone
- **Language:** tap opens picker (English / Bahasa Indonesia), persists immediately
- **Export Data:** exports JSON via system share dialog
- **Clear All Data:** confirmation dialog → deletes all data → success toast
- All content wrapped in scrollable view

---

## S5. Add Reminder Screen (`/add-reminder`)

### Layout

```
┌──────────────────────────────────────┐
│ [←] Add Reminder                     │
│                                      │
│ REMINDER NAME                        │
│ ┌──────────────────────────────────┐ │
│ │ e.g. "Morning Meds"             │ │
│ └──────────────────────────────────┘ │
│                                      │
│ TIME                                 │
│ ┌──────────────────────────────────┐ │
│ │         08:00         AM         │ │  ← TimePicker
│ └──────────────────────────────────┘ │
│                                      │
│ DAYS                        [Daily]  │  ← FrequencyBadge
│ ┌─────┬─────┬─────┬─────┬─────┐     │
│ │ Sun │ Mon │ Tue │ Wed │ Thu │     │  ← DaySelector
│ │  ●  │  ●  │  ●  │  ●  │  ●  │     │  (all selected = Daily)
│ ├─────┼─────┼─────┼─────┼─────┤     │
│ │ Fri │ Sat │     │     │     │     │
│ │  ●  │  ●  │     │     │     │     │
│ └─────┴─────┴─────┴─────┴─────┘     │
│                                      │
│ MEDICATIONS             2 selected   │
│ ┌────────┐ ┌────────┐               │
│ │Aspirin │ │Metfor- │               │  ← Existing drugs as
│ │500mg ✓ │ │min ✓   │               │     toggleable chips
│ └────────┘ └────────┘               │
│                                      │
│ ── Add New Medication ──             │
│ ┌──────────────────────────────────┐ │
│ │ Medication name                  │ │
│ │ Dosage (e.g. 500mg)  │ Qty      │ │
│ │ [Tablet][Capsule][Liquid]...     │ │  ← Form chips
│ └──────────────────────────────────┘ │
│                                      │
│      [Save Reminder]                 │  ← Primary button
└──────────────────────────────────────┘
```

### Validation
- Name: required → "Please enter a reminder name."
- Days: at least one → "Please select at least one day."
- Drugs: at least one → "Please select at least one medication."

### On Save
- Create reminder in DB
- Link drugs via junction table
- Schedule weekly notifications per day per drug
- Schedule refill reminders for drugs with stock thresholds
- Navigate back to Home

---

## S6. Edit Reminder Screen (`/edit-reminder/:id`)

Same layout as Add Reminder, with these additions:

- **Header:** "Edit Reminder" instead of "Add Reminder"
- **Pre-populated:** all fields filled with existing data
- **Save button label:** "Save Changes"
- **Delete button:** below save button, red text, opens confirmation dialog

### Delete Confirmation
```
┌──────────────────────────────────┐
│        Delete Reminder           │
│                                  │
│  Delete "Morning Meds"?          │
│  This cannot be undone.          │
│                                  │
│    [Cancel]    [Delete]          │
└──────────────────────────────────┘
```

### On Save
- Cancel old scheduled notifications
- Update reminder in DB
- Update drug junction
- Schedule new notifications

### On Delete
- Cancel all scheduled notifications for this reminder
- Delete reminder (cascades to junction and adherence logs)
- Navigate back to Home

---

## S7. Add Drug Screen (`/add-drug`)

### Layout

```
┌──────────────────────────────────────┐
│ [←] Add Drug                         │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │  📸 Scan Prescription            │ │  ← Link to scan
│ └──────────────────────────────────┘ │
│                                      │
│ NAME                                 │
│ ┌──────────────────────────────────┐ │
│ │ Medication name                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ DOSAGE              QUANTITY         │
│ ┌────────────────┐  ┌────────────┐  │
│ │ e.g. 500mg     │  │ 1          │  │
│ └────────────────┘  └────────────┘  │
│                                      │
│ FORM                                 │
│ ┌────────┐┌────────┐┌────────┐      │
│ │ Tablet ││Capsule ││ Liquid │      │  ← Form chip selector
│ └────────┘└────────┘└────────┘      │
│ ┌────────┐┌────────┐┌────────┐      │
│ │Inject. ││ Patch  ││Inhaler │      │
│ └────────┘└────────┘└────────┘      │
│ ┌────────┐┌────────┐               │
│ │ Drops  ││ Other  │               │
│ └────────┘└────────┘               │
│                                      │
│ NOTES                                │
│ ┌──────────────────────────────────┐ │
│ │ Notes (optional, e.g. take      │ │
│ │ with food)                      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ COLOR                                │
│ ● ● ● ● ● ●                        │  ← 6 color dots
│                                      │
│      [Save Medication]               │
└──────────────────────────────────────┘
```

---

## S8. Edit Drug Screen (`/edit-drug/:id`)

Same layout as Add Drug, with additions:

### Additional Sections

```
│                                      │
│ STOCK TRACKING                       │
│ ┌────────────────┐ ┌────────────┐   │
│ │ Pills remaining │ │ Alert at   │   │
│ │ 24              │ │ 5          │   │
│ └────────────────┘ └────────────┘   │
│                                      │
│ USED IN REMINDERS                    │
│ ┌──────────────────────────────────┐ │
│ │ Morning Meds                     │ │
│ │ Evening Meds                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Delete Medication]                  │  ← Red text, destructive
```

### On Save
- If stock updated and below threshold → trigger refill notification
- Drug form row updates drug in DB

### Delete Confirmation
```
┌──────────────────────────────────┐
│     Delete Medication            │
│                                  │
│  Delete "Aspirin"?               │
│  This will also remove it from   │
│  all reminders.                  │
│                                  │
│    [Cancel]    [Delete]          │
└──────────────────────────────────┘
```

---

## S9. Scan Prescription Screen (`/scan-prescription`)

### Layout — Empty State

```
┌──────────────────────────────────────┐
│ [←] Scan Prescription                │
│                                      │
│                                      │
│           [📷 Camera icon]           │
│       Scan a prescription             │
│                                      │
│  Take a photo or pick an image of    │
│  your prescription or pharmacy        │
│  label to automatically add           │
│  medications.                         │
│                                      │
│                                      │
│  ┌────────────────────────────────┐  │
│  │     📸  Take Photo             │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │     🖼️  From Gallery           │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Layout — Results

```
┌──────────────────────────────────────┐
│ [←] Scan Prescription                │
│                                      │
│ RECOGNIZED TEXT                [▼]   │  ← Collapsible
│ ┌──────────────────────────────────┐ │
│ │ Patient: John Doe               │ │
│ │ Rx:                             │ │
│ │ Aspirin 500mg - Take 1 tablet   │ │
│ │ Metformin 850mg - Take 1 tablet │ │
│ │ atorvastatin 20mg - 1x1        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ EXTRACTED MEDICATIONS                │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Aspirin                         │ │
│ │ Dosage: 500mg                   │ │
│ │ Qty: 1    Form: [Tablet]        │ │
│ │                        [Remove] │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Metformin                       │ │
│ │ Dosage: 850mg                   │ │
│ │ Qty: 1    Form: [Tablet]        │ │
│ │                        [Remove] │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Atorvastatin                    │ │
│ │ Dosage: 20mg                    │ │
│ │ Qty: 1    Form: [Tablet]        │ │
│ │                        [Remove] │ │
│ └──────────────────────────────────┘ │
│                                      │
│      [Add All Medications]           │
└──────────────────────────────────────┘
```

### Behavior
- "Take Photo" → opens camera, captures image
- "From Gallery" → opens image picker
- Processing shows loading indicator ("Reading prescription...")
- OCR text shown in collapsible section (collapsed by default)
- Each extracted medication is editable inline
- "Remove" deletes one extraction
- "Add All Medications" creates Drug entries for each and navigates back

---

## S10. Onboarding Screen (`/onboarding`)

### Layout — Step 1

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│              [💊]                    │  ← Large animated icon
│                                      │
│         Welcome to                   │
│          ReminDrugs                  │
│                                      │
│    Never miss a dose again.          │
│    Manage all your medications       │
│    in one simple, private app.       │
│                                      │
│                                      │
│         [Get Started]                │  ← Primary button
│              Skip                    │  ← Text button
│                                      │
│           ● ○ ○                      │  ← Dot indicators
│                                      │
└──────────────────────────────────────┘
```

### Step 2: "Track Your Adherence" (calendar-check icon)
### Step 3: "Never Miss a Dose" (bell icon)

Step 3 buttons:
- "Enable Reminders" → requests notification permission
- "Maybe later" → skips permission setup

### Transitions
- Fade in + slide up (translateY 20→0), 300ms ease-out
- Dot indicators update with opacity + scale

### Completion
- Sets `onboarding_completed = "true"` in settings
- Navigates to Home tab
- Not shown again on subsequent launches

---

## Screen Flow Diagram

```
                    ┌─────────────┐
                    │ Onboarding  │  (first launch only)
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │         Home           │◄──────────────┐
              │  (today's reminders)   │               │
              └──┬────┬────┬────┬──────┘               │
                 │    │    │    │                      │
         ┌───────┘    │    │    └───────┐              │
         ▼            ▼    ▼            ▼              │
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐   │
   │Medications│ │ Calendar │ │ Settings │ │ + Add  │   │
   │          │ │          │ │          │ │Reminder│   │
   └────┬─────┘ └──────────┘ └──────────┘ └───┬────┘   │
        │                                          │       │
   ┌────▼─────┐                                    │       │
   │ + Add    │◄──── Scan Prescription ───────────┤       │
   │  Drug    │                                    │       │
   └────┬─────┘                                    │       │
        │                                          │       │
   ┌────▼─────┐                                    │       │
   │ Edit Drug │                                    │       │
   └──────────┘                                    │       │
                                                   │       │
   ┌───────────────┐                               │       │
   │ Edit Reminder │◄──────────────────────────────┘       │
   └───────────────┘                                       │
        │ (long-press → action sheet → edit)               │
        └──────────────────────────────────────────────────┘
```
