# Legal & Credits — Plan

Closes #43 (name, url, impressum) and #36 (tile provider credits).

## YOUR QUESTIONS/NOTES

_Nothing pending — design agreed._

---

## Scope

| File | Change |
|------|--------|
| `frontend/index.html` | Page title → `OSTREA — GEOMAR` |
| `frontend/src/ControlPanel.tsx` | Add `<hr>` + legal line at bottom of expanded panel; add Impressum link in collapsed state |
| `frontend/src/index.css` | Add `.control-panel-legal` style |

`App.tsx` — no change (leave MapLibre auto-attribution in place).

---

## Details

### 1. `index.html`

```html
<title>OSTREA — GEOMAR</title>
```

### 2. `ControlPanel.tsx` — expanded state

After the closing `</fieldset>`, add:

```tsx
<hr className="control-panel-legal-divider" />
<div className="control-panel-legal">
  <a href="https://www.geomar.de/en/impressum" target="_blank" rel="noopener noreferrer">Impressum</a>
  {" · "}Map: © <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
  {" · "}© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
</div>
```

### 3. `ControlPanel.tsx` — collapsed state

Currently renders a single "Controls" button. Add an Impressum link beneath it:

```tsx
<>
  <button ...>Controls</button>
  <a
    href="https://www.geomar.de/en/impressum"
    target="_blank"
    rel="noopener noreferrer"
    className="control-panel-legal-collapsed"
  >
    Impressum
  </a>
</>
```

### 4. `index.css`

```css
.control-panel-legal-divider {
  border: none;
  border-top: 1px solid currentColor;
  opacity: 0.2;
  margin: 8px 0 6px;
}

.control-panel-legal {
  font-size: 11px;
  opacity: 0.7;
  line-height: 1.4;
}

.control-panel-legal a {
  color: inherit;
  text-decoration: underline;
}

.control-panel-legal-collapsed {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: inherit;
  opacity: 0.7;
  text-decoration: underline;
}
```

Font size 11px is below body default but matches existing small controls (clear button, collapse button are 12px). Not tiny, just understated.

---

## Git / PR

- Single commit: `Add impressum and map credits to control panel`
- PR closes #43 and #36
