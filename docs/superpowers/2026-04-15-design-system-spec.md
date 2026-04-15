# ReminDrugs — Design System Specification

> Complete design tokens, component specs, and styling rules.
> Intended as the reference for building the Tauri + Dioxus UI.

---

## Color Palette

### Light Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#16A34A` | Primary actions, active states, FAB, tab bar active icon |
| `primary-light` | `#DCFCE7` | Primary background tints, badges |
| `primary-dark` | `#15803D` | Primary hover/pressed states |
| `background` | `#F8FAF8` | Page background (slight green tint) |
| `card` | `#FFFFFF` | Card surfaces |
| `border` | `#E2E8F0` | Borders, dividers |
| `divider` | `#F1F5F9` | Subtle separators |
| `text-primary` | `#0F172A` | Headings, primary text |
| `text-secondary` | `#475569` | Body text, descriptions |
| `text-tertiary` | `#94A3B8` | Placeholder text, disabled |
| `text-inverse` | `#FFFFFF` | Text on dark backgrounds |

### Dark Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#22C55E` | Slightly brighter green for dark bg contrast |
| `primary-light` | `#14532D` | Dark green tint backgrounds |
| `primary-dark` | `#16A34A` | Hover/pressed |
| `background` | `#0C1410` | Deep green-tinted black |
| `card` | `#1A2620` | Card surfaces |
| `border` | `#2D3B34` | Borders |
| `divider` | `#1E2E26` | Subtle separators |
| `text-primary` | `#F1F5F9` | Headings |
| `text-secondary` | `#94A3B8` | Body text |
| `text-tertiary` | `#64748B` | Placeholder, disabled |

### Semantic Colors

| Token | Light | Light BG | Dark | Dark BG |
|-------|-------|----------|------|---------|
| `success` | `#22C55E` | `#DCFCE7` | `#22C55E` | `#14532D` |
| `warning` | `#F59E0B` | `#FEF3C7` | `#FBBF24` | `#422006` |
| `danger` | `#EF4444` | `#FEE2E2` | `#F87171` | `#450A0A` |
| `info` | `#3B82F6` | `#EFF6FF` | `#60A5FA` | `#172554` |

### Drug Pill Colors (shared across themes)

| Name | Hex |
|------|-----|
| Red | `#EF4444` |
| Orange | `#F97316` |
| Yellow | `#EAB308` |
| Green | `#22C55E` |
| Blue | `#3B82F6` |
| Purple | `#8B5CF6` |

---

## Typography

### Font Family
- **Mobile**: System (iOS) / Roboto (Android)
- **Desktop (Tauri)**: System UI font stack recommended — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

### Type Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `xs` | 11px | 16px | Captions, badges, metadata |
| `sm` | 13px | 18px | Secondary text, helper text |
| `base` | 15px | 22px | Body text, form labels |
| `md` | 17px | 24px | Card titles, emphasis |
| `lg` | 20px | 28px | Section headers |
| `xl` | 24px | 32px | Page titles, greeting |
| `2xl` | 32px | 40px | Large display text |
| `3xl` | 40px | 48px | Hero text (onboarding) |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `regular` | 400 | Body text |
| `medium` | 500 | Emphasis, labels |
| `semibold` | 600 | Subheadings, nav items |
| `bold` | 700 | Headings, numbers |

---

## Spacing

### Scale

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps, icon padding |
| `sm` | 8px | Inner padding, small gaps |
| `md` | 16px | Standard padding, card internal spacing |
| `lg` | 24px | Section gaps, screen edge padding |
| `xl` | 32px | Large section gaps |
| `2xl` | 48px | Page-level vertical spacing |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Small buttons, badges |
| `md` | 12px | Cards, inputs, chips |
| `lg` | 16px | Large cards, modals |
| `xl` | 24px | Bottom sheets, large containers |
| `full` | 9999px | Circular elements, pills |

### Shadows

**Card shadow (subtle elevation):**
```
offset: 0, 2px
color: #000
opacity: 6%
blur: 8px
elevation: 3
```

**FAB shadow (green-tinted, prominent):**
```
offset: 0, 4px
color: #16A34A
opacity: 30%
blur: 12px
elevation: 8
```

---

## Drug Form Icons

| Form | Icon (MaterialCommunityIcons) | Icon (Desktop alternative) |
|------|-------------------------------|---------------------------|
| Tablet | `pill` | 💊 or custom SVG |
| Capsule | `medical-bag` | 💊 variant or custom SVG |
| Liquid | `water` | 💧 or custom SVG |
| Injection | `needle` | 💉 or custom SVG |
| Patch | `bandage` | 🩹 or custom SVG |
| Inhaler | `lungs` | 🫁 or custom SVG |
| Drops | `eye-outline` | 👁️ or custom SVG |

---

## Component Specifications

### C1. ReminderCard

**Purpose:** Display a reminder with its linked drugs on the Home screen.

**Layout:**
```
┌──────────────────────────────────────────┐
│ [Form Icon] Morning Meds        08:00 AM │
│              Every day     [Daily badge] │
│                                          │
│  ┌────────────┐ ┌────────────┐ ┌──────┐ │
│  │ Aspirin    │ │ Metformin  │ │ +2   │ │
│  │ 500mg  ✓   │ │ 850mg      │ │ more │ │
│  └────────────┘ └────────────┘ └──────┘ │
│                                          │
│  [✓ Mark Remaining (2)]                  │
└──────────────────────────────────────────┘
```

**States:**
- Default: white card, drug chips shown
- All taken: slightly dimmed, moved to "Completed" group
- Drug taken: chip shows strikethrough + checkmark, muted color

**Interactions:**
- Tap drug chip → toggle taken state (with undo toast)
- Long-press card → action sheet overlay
- Tap "Mark Remaining" → mark all untaken drugs

---

### C2. MedicationCard

**Purpose:** Display a drug entry on the Medications screen.

**Layout:**
```
┌──────────────────────────────────────────┐
│ [Color dot] Aspirin              [→]     │
│             500mg · Tablet              │
│             1x per dose                 │
│                                          │
│  📦 24 remaining   ⚠️ Low Stock          │
│                                          │
│  USED IN REMINDERS                       │
│  Morning Meds, Evening Meds              │
└──────────────────────────────────────────┘
```

**States:**
- Normal: full opacity
- Low stock: yellow warning badge visible
- No stock info: stock row hidden

---

### C3. DrugChip

**Purpose:** Toggleable pill-shaped tag for drug name + dosage.

**Variants:**
- Default: `background` fill, `text-primary` text
- Checked (taken): `primary-light` background, strikethrough text, checkmark icon
- Color variant: left border or dot in the drug's assigned color

**Layout:**
```
┌─────────────────┐
│ [dot] Aspirin   │   ← default
│       500mg     │
└─────────────────┘

┌─────────────────┐
│ [✓] Aspirin     │   ← checked (taken)
│     ̶5̶0̶0̶m̶g̶     │   ← strikethrough
└─────────────────┘
```

**Props:** name, dosage, color?, checked?, onToggle?, strikeThrough?

---

### C4. DaySelector

**Purpose:** 7-day chip row for selecting reminder days.

**Layout:**
```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                        ↑ selected (primary bg)
```

**States:**
- Unselected: transparent bg, `text-secondary`
- Selected: `primary` bg, `text-inverse`
- "Select All" / "Clear" toggle above the row

---

### C5. FrequencyBadge

**Purpose:** Color-coded badge showing reminder frequency.

| Type | Label | Color |
|------|-------|-------|
| Daily | "Daily" | Green (`primary`) |
| Weekly | "Weekly" | Blue (`info`) |
| Custom | "Custom" | Amber (`warning`) |

**Logic:**
- All 7 days → Daily
- Exactly 1 day → Weekly
- 2-6 days → Custom

---

### C6. ThemedInput

**Purpose:** Theme-aware text input field.

**Behavior:**
- Default: `border` outline, `text-placeholder` placeholder
- Focused: `primary` outline, slight glow
- Error: `danger` outline
- Supports: single-line, multi-line, keyboard types (text, numeric)

---

### C7. EmptyState

**Purpose:** Centered placeholder when no data exists.

**Layout:**
```
         [Icon]
       Title Text
     Description text

    [Action Button]
```

**Used in:** Home (no reminders today), Medications (no drugs), Calendar (no data for day)

---

### C8. ActionSheet

**Purpose:** Bottom overlay with action options.

**Layout:**
```
┌──────────────────────────┐
│  (dark overlay)          │
│                          │
│  ┌────────────────────┐  │
│  │  ✓ Mark All Taken  │  │
│  ├────────────────────┤  │
│  │  → Skip All        │  │
│  ├────────────────────┤  │
│  │  ✏️ Edit Reminder  │  │
│  ├────────────────────┤  │
│  │     Cancel         │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

**Behavior:**
- Animated slide-up from bottom
- Overlay dims background
- Tap overlay or "Cancel" to dismiss
- Options shown as rows with icons

---

### C9. ToastSnackbar

**Purpose:** Transient notification bar at bottom of screen.

**Variants:**
| Variant | Color | Icon |
|---------|-------|------|
| success | `success` bg | Checkmark |
| error | `danger` bg | X mark |
| warning | `warning` bg | Warning triangle |
| info | `info` bg | Info circle |

**Layout:**
```
┌────────────────────────────────────┐
│  ✓ Aspirin marked as taken  [Undo]│
└────────────────────────────────────┘
```

**Behavior:**
- Slides up from bottom with animation
- Auto-dismisses after configurable duration (default ~3s)
- Optional action button (e.g. "Undo")
- Only one toast visible at a time (new replaces old)

---

### C10. PermissionBanner

**Purpose:** Warning banner when notifications are disabled.

**Layout:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ Notifications disabled                    │
│ ReminDrugs can't remind you without them.   │
│                              [Fix This] [✕]  │
└──────────────────────────────────────────────┘
```

**Behavior:**
- `warning-light` background, `warning` icon
- "Fix This" opens system notification settings
- Dismiss button hides the banner (reappears on next app launch if still disabled)

---

### C11. SkeletonCard

**Purpose:** Loading placeholder matching ReminderCard layout.

**Behavior:**
- Shimmer animation (gradient sweep left to right)
- Same dimensions as ReminderCard
- Shows 2-3 shimmer rectangles mimicking text lines + chips

---

### C12. ProgressBar

**Purpose:** Animated progress indicator for daily dose completion.

**Layout:**
```
┌──────────────────────────────────────┐
│ ████████████░░░░░░░░  3 of 5 taken  │
└──────────────────────────────────────┘
```

**Behavior:**
- Track: `divider` background, `radius-full`
- Fill: `primary` color, animated width transition
- Label: "{taken} of {total} taken" below the bar

---

### C13. DrugFormRow

**Purpose:** Full drug editing row used in reminder forms for inline drug creation.

**Contains:**
- Drug name input
- Dosage input
- Quantity input
- Form chip selector (scrollable row)
- Notes input (optional)
- Color dot picker (6 colors)
- Delete button (removable)

---

### C14. TimePickerField

**Purpose:** Time selection field.

**Mobile:** Native DateTimePicker (modal on iOS, dialog on Android)
**Desktop (Tauri):** Native HTML `<input type="time">` or custom time picker dropdown

---

## Icon System

**Current:** MaterialCommunityIcons (via @expo/vector-icons)

**Desktop recommendation:** Use an icon library with good coverage:
- [Lucide](https://lucide.dev/) — clean, consistent, tree-shakeable
- [Material Icons](https://fonts.google.com/icons) — if staying consistent with mobile
- Custom SVGs for drug form icons

**Key icons used:**
| Context | Icon |
|---------|------|
| Home tab | `home-variant` |
| Medications tab | `pill` |
| Calendar tab | `calendar-month` |
| Settings tab | `cog-outline` |
| Add/FAB | `plus` |
| Edit | `pencil-outline` |
| Delete | `delete-outline` |
| Notification bell | `bell-outline` |
| Theme | `white-balance-sunny` / `moon-waning-crescent` / `cellphone` |
| Language | `translate` |
| Export | `export-variant` |
| Low stock | `alert-circle-outline` |
| Checkmark | `check` |
| Camera | `camera-outline` |
| Gallery | `image-outline` |
| Back | `arrow-left` |

---

## Animation Patterns

| Animation | Where | Spec |
|-----------|-------|------|
| Fade + slide | Onboarding steps | Fade in (opacity 0→1) + slide up (translateY 20→0), 300ms ease-out |
| Shimmer | Skeleton loading | Gradient sweep left→right, 1.5s loop |
| Slide up | Toast, ActionSheet | translateY 100%→0, 250ms spring |
| Progress bar | Home progress card | Width transition, 500ms ease-out |
| Scale | Button press | Scale 1.0→0.95 on press, 100ms |
| Dot indicators | Onboarding | Opacity + scale transition on step change |

---

## Desktop-Specific CSS Considerations

For the Tauri rewrite, adapt the mobile-first design system:

1. **Max content width:** Constrain to ~480px centered on desktop (phone-like layout) OR expand to full desktop width with sidebar navigation
2. **Cursor:** Add `cursor: pointer` on all interactive elements
3. **Focus rings:** Visible focus indicators for keyboard navigation (use `primary` color ring)
4. **Hover states:** Cards and buttons should have subtle hover effects (background color shift, slight shadow increase)
5. **Transitions:** All color/opacity/transform changes should have 150-200ms ease transitions
6. **Scroll behavior:** Smooth scrolling for long lists, custom scrollbar styling
7. **Window chrome:** Respect system title bar or use custom titlebar with drag region
8. **Font rendering:** Use `font-smoothing: antialiased` for crisp text on all platforms
