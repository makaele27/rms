# 🍽️ Restaurant Table Manager

A fully front-end restaurant operations platform built with HTML, CSS, and vanilla JavaScript. No server, no build tools, no dependencies — open `index.html` in any modern browser and you're running.

---

## ✨ Features

| Module | Description |
|---|---|
| **Bookings** | Create, edit, cancel, reschedule reservations with full conflict detection |
| **Floor Plan Editor** | Drag-and-drop table layout with merge/group support |
| **Daily Summary** | Live booking schedule, zoomable floor map, dining timers |
| **Guest History** | CRM-style profiles with visit history, tags, and autofill |
| **Analytics Dashboard** | KPI tiles, sparklines, bar charts, donut charts (7/30/90-day ranges) |
| **Reporting** | Daily guest report with copy-to-clipboard and Excel export |

---

## 🚀 Quick Start

```bash
git clone https://github.com/your-org/restaurant-table-manager.git
cd restaurant-table-manager
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

No npm install. No build step. Works offline after the Google Fonts request resolves on first load.

---

## 📁 Project Structure

```
restaurant-table-manager/
├── index.html              # Entry point — markup and layout
├── src/
│   ├── css/
│   │   └── styles.css      # All styles — components, layout, animations
│   └── js/
│       └── app.js          # All application logic
├── docs/
│   ├── FEATURES.md         # Detailed feature documentation
│   ├── DATA_MODEL.md       # localStorage schema reference
│   ├── CHANGELOG.md        # Version history
│   └── CONTRIBUTING.md     # Contribution guide
├── assets/                 # Static assets (icons, images)
└── README.md
```

---

## 🗄️ Data Storage

All data is stored in the browser's `localStorage` under the key `rtm_state`. No data leaves the device. See [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) for the full schema.

To back up your data, use the **Export Excel** button in the Reporting tab. To reset, clear `localStorage` in your browser's DevTools.

---

## 🖥️ Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 14+ | ✅ Full |
| iOS Safari 14+ | ✅ Full (pinch-to-zoom on floor plan) |
| Internet Explorer | ❌ Not supported |

---

## 🧩 Module Overview

### Bookings
Create reservations with guest name, party size, date/time, table assignment, RSVP channel, and special tags. Built-in conflict detection prevents double-booking a table for overlapping time windows. Supports filter by date, upcoming, or all bookings.

### Floor Plan Editor
Drag tables around a visual canvas to match your physical layout. Add small (2–4 seat) or large (6–8 seat) tables, name them, and merge tables into groups for large parties.

### Daily Summary
View a selected day's schedule in list form alongside a live interactive floor map. Actively seated tables show a live elapsed dining timer (ticks every 30 seconds). Click any table tile to see its full day schedule.

**End Service:** Tap 🏁 End Service on any seated booking to instantly timestamp the end time — no modal required. A confirmation dialog prevents misclicks.

**Floor Plan Zoom:** Scroll-wheel or pinch to zoom 50%–300%. Click-drag to pan. Reset button returns to 100%.

### Guest History
Automatically creates and updates a guest profile on every booking save. Supports phone/name/email autofill when creating new bookings. Tags (Friends & Family, KOL, BOD) are stored on the profile and shown as coloured pills.

### Analytics Dashboard
Renders on-the-fly from booking data across a selectable 7/30/90-day window:
- KPI tiles: bookings, covers, cancellation rate, walk-ins, avg dining time, rescheduled count
- Covers-over-time sparkline
- Covers by time slot (Lunch / Dinner / Other)
- Booking status donut chart
- Busiest tables bar chart
- Booking channels breakdown
- Top guests by visit count

### Daily Report
Formatted text report split into Lunch (10:00–17:59) and Dinner (18:00–22:00) with reservation, walk-in, cancellation, and reschedule counts and pax. Copy as plain text (WhatsApp-ready) or export to Excel.

---

## 🏷️ Guest Tags

Three special tags can be applied at booking time or directly from Guest History > Edit:

| Tag | Colour | Meaning |
|---|---|---|
| 👨‍👩‍👧 Friends & Family (5% Discount) | Green | Apply 5% discount |
| 📣 KOL | Blue | Key Opinion Leader / influencer |
| 👔 BOD (10% Discount) | Orange | Board of Directors — 10% discount |

Tags are merged into the guest's profile and persist across bookings.

---

## 📊 Analytics Reference

| Metric | Calculation |
|---|---|
| Cancellation Rate | `cancelled / total × 100` |
| Avg Party Size | `total pax / active bookings` |
| Avg Dining Time | Mean of `endTime − startTime` for all bookings with an end time |
| Covers by Slot | Lunch = 10:00–17:59, Dinner = 18:00–22:00, Other = everything else |

---

## 🤝 Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

---

## 📄 License

MIT — free to use, modify, and distribute.
