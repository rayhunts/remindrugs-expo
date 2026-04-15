# ReminDrugs — Desktop Improvements for Tauri + Dioxus

> Enhancements and adaptations for the desktop rewrite that don't exist in the mobile app.

---

## Layout Strategy

### Recommended: Adaptive Layout

Instead of a simple phone-width center column, use a responsive layout that takes advantage of desktop screen real estate.

**Option A: Sidebar Navigation (Recommended)**
- Replace bottom tab bar with a persistent left sidebar (240px width)
- Sidebar contains: navigation links, app branding, theme toggle
- Main content area takes remaining width
- Calendar and medications lists benefit from wider viewport

**Option B: Centered Phone Layout**
- Max-width ~480px centered column
- Simpler to implement, closer to 1:1 mobile parity
- Good for rapid initial port

### Sidebar Layout (Option A)

```
┌────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌───────────────────────────────────┐ │
│ │          │ │                                   │ │
│ │ 💊       │ │        Main Content Area          │ │
│ │ ReminDrugs│ │                                   │ │
│ │          │ │                                   │ │
│ │ ──────── │ │                                   │ │
│ │          │ │                                   │ │
│ │ 🏠 Home  │ │                                   │ │
│ │ 💊 Meds  │ │                                   │ │
│ │ 📅 Cal   │ │                                   │ │
│ │ ⚙️ Settings│ │                                  │ │
│ │          │ │                                   │ │
│ │ ──────── │ │                                   │ │
│ │          │ │                                   │ │
│ │ 🌙 Dark  │ │                                   │ │
│ │ 🌐 EN   │ │                                   │ │
│ │          │ │                                   │ │
│ └──────────┘ └───────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## Window Configuration

### Tauri Window Settings

```json
{
  "window": {
    "title": "ReminDrugs",
    "width": 900,
    "height": 680,
    "minWidth": 640,
    "minHeight": 480,
    "resizable": true,
    "center": true,
    "decorations": true,
    "transparent": false
  }
}
```

### Custom Titlebar (Optional)
- Drag region across the top
- Window controls (minimize, maximize, close) on the right
- App title centered
- Matches the app's theme colors

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + 1` | Navigate to Home |
| `Ctrl/Cmd + 2` | Navigate to Medications |
| `Ctrl/Cmd + 3` | Navigate to Calendar |
| `Ctrl/Cmd + ,` | Navigate to Settings |
| `Ctrl/Cmd + N` | New Reminder |
| `Ctrl/Cmd + Shift + N` | New Drug |
| `Ctrl/Cmd + F` | Search medications (new feature) |
| `Ctrl/Cmd + D` | Toggle dark mode |
| `Escape` | Close modal / go back |

### Calendar Shortcuts

| Shortcut | Action |
|----------|--------|
| `←` / `→` | Previous / Next month |
| `↑` / `↓` | Previous / Next week |
| `Enter` | Select focused day |
| `T` | Mark selected day's doses as Taken |
| `M` | Mark selected day's doses as Missed |

### Form Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Save form |
| `Ctrl/Cmd + W` | Close form without saving |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |

---

## Desktop-Specific UI Adaptations

### Mouse Interactions
- **Hover states:** All buttons, cards, and interactive elements need hover effects
  - Cards: subtle background color shift (`card` → slightly darker)
  - Buttons: background darkens or lightens
  - Links: text color shifts to `primary`
- **Cursor:** `pointer` on all clickable elements
- **Right-click context menus:** On reminder/medication cards
  - Mark Taken, Skip, Edit, Delete

### Scrollbar Styling
- Custom thin scrollbars matching the theme
- Auto-hide on inactivity
- Width: 6-8px

### Window Resize Behavior
- Sidebar width: fixed 240px
- Main content: fluid, fills remaining space
- Calendar grid: expands to fill available width
- Medication list: single column up to 600px, then 2-column grid
- Cards have max-width: 600px in main content

---

## Desktop Notifications

### Tauri Notification API

Replace `expo-notifications` with Tauri's native notification system.

**Capabilities needed:**
```json
{
  "permissions": ["notifications:default"]
}
```

**Behavior:**
- Notifications work the same way as mobile (scheduled, snooze, refill)
- Use `tauri-plugin-notification` for scheduling
- Action buttons may need platform-specific handling
  - Windows: Toast notifications with actions
  - macOS: UserNotifications framework
  - Linux: libnotify (limited action support)

**Notification sound:**
- Bundle `pill_bottle_shake.mp3` as a Tauri asset
- Reference via `tauri://` protocol in notification config

---

## OCR Scanning Adaptation

### Desktop Camera Access

On desktop, camera access differs from mobile:

**Option A: File Picker (Recommended)**
- Replace "Take Photo" with "Open Image" (file dialog)
- Use `tauri-plugin-dialog` for native file picker
- Support image formats: PNG, JPG, WEBP, BMP

**Option B: Camera Access**
- Use `tauri-plugin-camera` if available for the platform
- Falls back to file picker if camera not available

**OCR Engine:**
- Replace `rn-mlkit-ocr` with a Rust OCR library:
  - [Tesseract](https://github.com/tesseract-ocr/tesseract) via `tesseract-rs`
  - [LemonOCR](https://github.com/SSARCandy/lemon-ocr) (lightweight)
  - Or keep ML Kit via a WASM wrapper

---

## Data Storage

### SQLite on Desktop

Use `rusqlite` or `sqlx` with SQLite for the persistent store.

**File location:**
- **macOS:** `~/Library/Application Support/com.rayhunts.remindrugs/`
- **Windows:** `%APPDATA%\com.rayhunts.remindrugs\`
- **Linux:** `~/.config/remindrugs/`

### Migration Strategy
- Start at V3 schema directly (no migration needed)
- Use embedded migrations (SQL files bundled with the app)
- Schema version tracked in `settings` table

---

## File Export/Import

### Desktop File Dialogs

Replace `expo-sharing` and `expo-file-system` with Tauri plugins:

**Export:**
- Use `tauri-plugin-dialog` for "Save As" dialog
- Default filename: `remindrugs-export-YYYY-MM-DD.json`
- Write file to user-chosen location

**Import (New Feature):**
- Add "Import Data" to Settings > Data section
- Use "Open File" dialog
- Validate JSON structure before importing
- Merge or replace strategy (ask user)

---

## System Tray (New Feature)

### Tray Icon
- App icon in system tray
- Menu items:
  - Show/Hide ReminDrugs
  - Next Reminder (shows time + name)
  - Mark Next as Taken
  - Quit

### Background Behavior
- Minimize to tray on close (configurable)
- Notifications still fire when window is hidden
- Badge/indicator on tray icon for missed doses

---

## Search (New Feature)

### Medication Search
- Global search bar in sidebar or header
- Filters medications by name, dosage, or form
- Quick keyboard shortcut: `Ctrl/Cmd + F`

### Reminder Search
- Search reminders by name or linked drug name
- Available from Home screen

---

## Drag and Drop

### Prescription Scanning
- Drag and drop an image file onto the Scan Prescription screen or the Add Drug screen
- Automatically triggers OCR processing
- Visual drop zone with dashed border highlight on drag-over

### Data Import
- Drag and drop a JSON export file onto the Settings screen
- Triggers import flow

---

## Accessibility

### Desktop Accessibility Standards

- **Keyboard navigation:** All interactive elements reachable via Tab
- **Focus indicators:** Visible focus rings (2px `primary` outline)
- **ARIA labels:** All interactive elements have descriptive labels
- **Screen reader:** Test with NVDA (Windows), VoiceOver (macOS), Orca (Linux)
- **High contrast:** Ensure all text meets WCAG AA contrast ratio (4.5:1)
- **Reduced motion:** Respect `prefers-reduced-motion` system setting
  - Disable shimmer animations
  - Replace slide animations with instant transitions
  - Keep progress bar fill animation (informational, not decorative)

---

## Desktop-Specific Settings

### Add to Settings Screen

| Setting | Type | Options |
|---------|------|---------|
| Launch at startup | Toggle | On/Off |
| Minimize to tray | Toggle | On/Off |
| Close behavior | Select | Minimize / Quit |
| Default window size | Select | Remember / Compact / Full |
| Keyboard shortcuts | Link | Opens shortcut reference |

---

## Tech Stack Recommendations

### Core
| Layer | Library | Notes |
|-------|---------|-------|
| Framework | Dioxus 0.6+ | RSX syntax, signals, router |
| Backend | Tauri 2.x | Window management, system APIs |
| Database | `rusqlite` or `sqlx` | SQLite with bundled migrations |
| Notifications | `tauri-plugin-notification` | Native OS notifications |
| File dialogs | `tauri-plugin-dialog` | Open/Save file dialogs |
| File system | `tauri-plugin-fs` | Read/write app data files |
| Clipboard | `tauri-plugin-clipboard` | Copy/paste support |

### UI
| Layer | Library | Notes |
|-------|---------|-------|
| Styling | Tailwind CSS | Utility classes matching design tokens |
| Icons | Lucide | Clean, consistent, SVG-based |
| Animations | CSS transitions + `cssparser` | For shimmer, slide, fade effects |
| Calendar | Custom component | Build with Dioxus, no external dep needed |
| Time picker | Custom or `dioxus-chrono` | Desktop-native feel |

### Utilities
| Layer | Library | Notes |
|-------|---------|-------|
| UUID | `uuid` crate | v4 for ID generation |
| Serialization | `serde` + `serde_json` | JSON export/import |
| Date/time | `chrono` | Date formatting, time calculations |
| OCR | `tesseract-rs` or `lemon-ocr` | Prescription scanning |
| i18n | `rust-i18n` or custom | EN/ID translations |
| Logging | `tracing` | App-level logging |
