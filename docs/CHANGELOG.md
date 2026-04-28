# Changelog

All notable changes to Restaurant Table Manager are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.4.0] — Analytics & Zoom

### Added
- **Analytics Dashboard** in Reporting tab with 7/30/90-day range selector
  - 6 KPI tiles: Total Bookings, Total Covers, Cancellation Rate, Walk-ins, Avg Dining Time, Rescheduled
  - Covers-over-time sparkline (SVG, filled area + polyline)
  - Covers by Time Slot horizontal bar chart (Lunch / Dinner / Other)
  - Booking Status donut chart (Active / Cancelled / Rescheduled)
  - Busiest Tables bar chart (top 6)
  - Booking Channels bar chart (RSVP source breakdown)
  - Top Guests bar chart (top 5 by visit count)
- **Floor Plan Zoom & Pan** in Daily Summary → Table Status
  - `−` / `+` step buttons (20% increments)
  - Scroll-wheel zoom towards cursor
  - Pinch-to-zoom (touch devices)
  - Click-drag pan with edge clamping
  - Reset button
  - Range: 50%–300%

### Fixed
- Daily Summary and Bookings tabs now re-render synchronously when a booking is saved or deleted from the Edit modal

---

## [1.3.0] — Live Dining Timers & End Service

### Added
- **End Service** button on each Booking Schedule row in Daily Summary
  - Stamps current time as `endTime` on the booking
  - Confirmation dialog prevents misclicks
  - Toast notification with duration summary (e.g. "1h 45m")
- **Live Dining Timer** in Booking Schedule rows
  - Pulsing green badge showing elapsed dining time for Seated bookings
  - Ticks every 30 seconds
  - Shows static `✅ Xh Xm total` after End Service is stamped
- **Live Dining Timer** in Table Status floor plan tiles
  - `⏱ Xh Xm` inside actively-seated table tiles
  - Deeper green background + glow ring for actively-seated tables
- Timer starts on Daily Summary load, stops on tab switch (no background drain)

---

## [1.2.0] — Guest Tags & Profiles

### Added
- **Special Tags** in New Booking → Additional Info → Details:
  - 👨‍👩‍👧 Friends & Family (5% Discount)
  - 📣 KOL
  - 👔 BOD (10% Discount)
- **Special Tags in Guest History Edit modal** — same three tags can be set directly on a profile
- Tags from bookings are automatically merged into the guest profile on save
- Tags display as coloured pills on guest cards (green / blue / orange)

---

## [1.1.0] — Rescheduling & Reporting

### Added
- Reschedule modal — move a booking to a new date and time
- `originalDate` and `rescheduled` fields on booking record
- Rescheduled bookings shown separately in Daily Guest Report
- Daily Guest Report copy-to-clipboard (plain text, WhatsApp-friendly)
- Daily Guest Report Excel export (`.xlsx`)
- Guest Data Export (CSV and Excel)

---

## [1.0.0] — Initial Release

### Added
- Booking CRUD with conflict detection
- Floor Plan Editor with drag-drop, small/large tables, merge groups
- Daily Summary with schedule list and interactive floor map
- Guest History CRM with phone/name/email autofill
- Daily Guest Report (Lunch / Dinner breakdown)
- localStorage persistence
- Toast notifications
- Print / Save PDF support
