# Contributing to Restaurant Table Manager

Thank you for your interest in contributing. This is a zero-dependency front-end project — all contributions should keep it that way.

---

## Guiding Principles

1. **No build tools** — no webpack, Vite, npm, or transpilers. Every change must work by opening `index.html` directly in a browser.
2. **No external runtime dependencies** — the only external request is Google Fonts. All logic lives in `src/js/app.js`.
3. **localStorage only** — no backend, no fetch calls to APIs, no IndexedDB (unless explicitly scoped to a feature branch).
4. **One JS file** — keep logic in `app.js`. If the file grows beyond ~4000 lines, split by section into `src/js/` modules loaded via `<script>` tags in order.

---

## Getting Started

```bash
git clone https://github.com/your-org/restaurant-table-manager.git
cd restaurant-table-manager
# No install needed — open index.html directly
open index.html
```

---

## Repository Structure

```
index.html          — HTML markup only; no inline scripts or styles
src/css/styles.css  — All styles; use CSS variables from :root
src/js/app.js       — All logic; organised by section comments
docs/               — Documentation
assets/             — Static assets
```

---

## Code Style

### JavaScript
- Plain ES6+ (no TypeScript, no JSX)
- Use `const` and `let`, never `var`
- Section headers use the pattern:
  ```js
  // ════════════════════════════════════════════
  //  SECTION NAME
  // ════════════════════════════════════════════
  ```
- Keep functions focused and named clearly
- Use `esc()` for all user-generated strings inserted into HTML (XSS prevention)
- Use `save()` after every state mutation; `S` is the global state object

### CSS
- Use CSS variables defined in `:root` for all colours and shadows
- Class names use kebab-case
- No `!important` except for `.table-el.booked` overrides that intentionally cascade
- Media queries at the bottom of their section

### HTML
- Semantic elements where possible (`<button>`, `<label>`, `<select>`)
- No `<form>` elements (to avoid unintended submit behaviour)
- All event handlers use `onclick=` / `oninput=` attributes (consistent with existing code)

---

## Making Changes

### Bug fix
1. Identify the section in `app.js` (look for section header comments)
2. Make the minimal change
3. Test: open `index.html`, reproduce the bug, verify the fix
4. Test edge cases (empty state, cancelled bookings, no tables defined)

### New feature
1. Add HTML markup to `index.html` in the appropriate view section
2. Add styles to `styles.css` with a section comment
3. Add JS to `app.js` under the appropriate section header
4. Update `docs/FEATURES.md` with usage documentation
5. Add an entry to `docs/CHANGELOG.md` under a new version heading
6. Update `docs/DATA_MODEL.md` if any new fields are added to stored objects

---

## Testing Checklist

Before submitting a pull request, manually verify:

- [ ] App opens from `index.html` with no console errors
- [ ] Can create a new booking end-to-end
- [ ] Floor plan drag-drop saves and persists on reload
- [ ] Daily Summary timers start/stop correctly on tab switch
- [ ] End Service stamps time and shows duration toast
- [ ] Guest profile is created/updated on booking save
- [ ] Analytics Dashboard renders with no data (empty state)
- [ ] Analytics Dashboard renders correctly with bookings
- [ ] Report copy and Excel export work
- [ ] localStorage persists across page refresh
- [ ] No regressions in other tabs

---

## Submitting a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit with a clear message: `git commit -m "feat: add walk-in counter to daily stats"`
4. Push and open a PR against `main`
5. Describe what you changed and why in the PR description

---

## Reporting Bugs

Open an issue with:
- Browser and version
- Steps to reproduce
- Expected vs actual behaviour
- Any console errors (F12 → Console)
