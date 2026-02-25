# Habitable Depth Indicator — Plan

Branch: `feature/depth-habitable`
Closes: #39

## Scope

Show hexes with water depth > 85m as flat (elevation=0) and dimmed, controlled
by a toggle in the control panel. Uses the existing `depth` field in metadata.
No data changes needed.

## Details

### State

`App.tsx`: add `const [isHabitableShown, setHabitableShown] = useState(true)`

### Connectivity layer changes

`getFillColor`: if `isHabitableShown && metadata[id]?.depth > 85` → dim grey
(e.g. `[100, 100, 100, 60]`), applied before hovered/selected/weight checks.

`getElevation`: if `isHabitableShown && metadata[id]?.depth > 85` → return `0`.

Both need `isHabitableShown` and `metadata` in `updateTriggers`.

### ControlPanel

Add `isHabitableShown` / `onHabitableChange` prop.
Add toggle in Highlights section, label "Habitable (≤85m)", no color swatch
(or a neutral grey swatch).

### theme.ts

Add `theme.highlight.deepWater` RGBA, e.g. `[100, 100, 100, 60]`.
