# Final Polish — Plan

Derived from chat log review (Lara Schmittmann + developer). Two independent agents extracted
todos; results were merged and deduplicated below. GH issue links added.

---

## Blocker: Data

### 1. Include normalized fields (relative dilution) in served dataset
- **GH:** #9 "Use normalized data" (open, assigned to willirath + laraschmittmann)
- The "wgt" field must be replaced / supplemented with the normalized relative dilution values
  as described in the manuscript methods.
- **Prerequisite for:** items 2, 3, 9 below.
- Status: developer said "I'll look at that now" — may already be done; verify.

---

## Tooltip

### 2. Rename tooltip field from `wgt` to `relative dilution`
- **GH:** #48 "Tooltip: Sort out what we show there and group for importance" (open)
  — issue already lists `wgt --> conc or dilution` as the top priority item.
  Also covers grouping: dilution first, then flags (aqc/rest/pop), then location.
- Display as e.g. `dilution = 1.2e-4`.
- Blocked by item 1.

### 3. State scale type (linear or log) somewhere in the UI
- **GH:** #11 "Add a color bar?" (open) — partially covers this. The chat resolved
  that a full colorbar is not needed; a brief linear/log note suffices since
  tooltips give exact values. Could close #11 with this lighter approach.
- Suggested location: a small note in "How to Use" or near the legend.

### 4. Add tooltip explanation bullet to "How to Use"
- **GH:** #48 (same issue — tooltip content and discoverability)
- Add a bullet: `Hover over a hex for information (hex ID, latitude, longitude,
  relative dilution, …)`
- Lara: belongs in "How to Use", not in "Methods".

---

## "How to Use" section

### 5. Add two map-interaction bullets to "How to Use"
- **GH:** no existing issue — new copy, closest to #48 in spirit.
- Lara's exact wording:
  - *Click a hex to select it as a source location for pathogen/infected larvae
    release; click again to deselect.*
  - *The dispersal from this source site will appear as the relative dilution of
    pathogen/infected larvae at all connected target sites.*

---

## Methods section (copy)

### 6. Remove or rewrite the sentence about four source types
- **GH:** no existing issue.
- Current text: *"Simulations start from four source types: known B. ostreae-positive
  sites, O. edulis aquaculture sites, historic oyster beds, and the full potentially
  habitable area (depth < 85 m)."*
- Lara: factually wrong in app context — simulations start from any clicked hex,
  including outside the habitable area. Remove the sentence.

---

## "Why" section (copy)

### 7. Replace "coordinated by NORA" with "under the umbrella of …"
- **GH:** no existing issue.
- Replace: *"more than 40 projects coordinated by NORA"*
- With: *"under the umbrella of the [NORA] alliance"* (matches manuscript language).

### 8. Revise ocean-currents / biosecurity sentence
- **GH:** no existing issue.
- Current: *"Ocean currents can transport free pathogen cells or infected larvae to
  sites with no direct human connection to diseased populations — dispersal-driven
  exposure that biosecurity protocols cannot prevent."*
- Lara's revision (removes confusing "no direct human connection"):
  *"Ocean currents can transport free pathogen cells or infected larvae —
  dispersal-driven exposure that biosecurity protocols limiting human-mediated
  transport of infected oysters cannot prevent."*

---

## Legend / Visual

### 9. Fix time range legend to show "7–28"
- **GH:** #44 "Fix time range label and underlying data: 14d-28d → 07d-28d" (open)
  — issue also requires regenerating connectivity data with correct window.
  Linked to #9 in the issue body; tackle together with item 1.

### 10. Add legend label for historic oyster bed sites + choose color
- **GH:** #38 "Include historic population sites" (open)
  — data is already located at the path noted in the issue.
- Style label as in the paper.
- Proposed brown has insufficient contrast against orange/purple relative dilution
  palette; prefer dark blue or dark green.
- Reference palette: ColorBrewer qualitative "Paired" n=4
  https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=4

### 11. Investigate / reduce 3D shadow effect on hex tiles
- **GH:** no existing issue.
- Current shading shifts as map rotates → different apparent colors on top vs. sides
  → makes a stable fixed legend impossible.
- Consider flattening or removing the lighting effect so hex colors are constant.
- Lara: detail-level concern; evaluate whether visual benefit is worth the complexity.

---

## Issue coverage summary

| Plan item | GH issue | Status |
|-----------|----------|--------|
| 1. Normalized data | #9 | open |
| 2. Tooltip rename wgt→dilution | #48 | open |
| 3. Linear/log scale note | #11 | open (lighter resolution) |
| 4. Tooltip bullet in How to Use | #48 | open |
| 5. Map-interaction bullets | — | **→ new issue A** |
| 6. Remove four-source-types sentence | — | **→ new issue B** |
| 7. NORA wording | — | **→ new issue B** |
| 8. Ocean currents sentence | — | **→ new issue B** |
| 9. Time range 7–28 | #44 | open |
| 10. Historic sites legend + color | #38 | open |
| 11. 3D shadow effect | — | **→ new issue C** |

---

## Suggested new issues

### New issue A — "How to Use": add map-interaction explanation
**Labels:** `ui`

The "How to Use" section needs two additional bullets explaining the core interaction
pattern so that non-expert users (esp. biologists) understand what they are looking at:

- *Click a hex to select it as a source location for pathogen/infected larvae release;
  click again to deselect.*
- *The dispersal from this source site will appear as the relative dilution of
  pathogen/infected larvae at all connected target sites.*

Also add a bullet describing hover tooltip content:
`Hover over a hex for information (hex ID, latitude, longitude, relative dilution, …)`

---

### New issue B — Info box copy edits (Methods + Why sections)
**Labels:** `ui`

Items 6, 7, 8 are bundled into one issue: all are small copy edits in the same info
box component, easier to implement and review together.

Three targeted copy edits from manuscript review with Lara Schmittmann:

1. **Methods — remove four-source-types sentence.**
   *"Simulations start from four source types: …"* is factually wrong in the app
   context (simulations start from any clicked hex, incl. outside habitable area).
   Remove it.

2. **Why — NORA phrasing.**
   Change *"more than 40 projects coordinated by NORA"* →
   *"under the umbrella of the [NORA] alliance"* (matches manuscript language).

3. **Why — ocean currents / biosecurity sentence.**
   Current: *"… to sites with no direct human connection to diseased populations —
   dispersal-driven exposure that biosecurity protocols cannot prevent."*
   Replace with: *"… — dispersal-driven exposure that biosecurity protocols limiting
   human-mediated transport of infected oysters cannot prevent."*
   (Removes the ambiguous "no direct human connection" phrase.)

---

### New issue C — Hex tile 3D shadow / lighting effect
**Labels:** `ui`

The 3D shading on hex tiles shifts as the user rotates the map, causing the same hex
to display different apparent colors on its top face vs. its sides. This makes a
stable color legend impossible to define.

Options to evaluate:
- Remove the lighting/shadow effect entirely so hex face colors are constant.
- Reduce the effect to a minimal ambient level.

Ref: ColorBrewer qualitative "Paired" n=4 palette recommended for category colors
once shadows are resolved: https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=4

---

## Resolved / No Action Needed

- **Contact email:** Both agreed not needed — readers find authors via the paper.
- **Staging vs. prod:** Two-environment setup confirmed; no code change needed.

---

## YOUR QUESTIONS / NOTES

- Item 1: Is the normalized data already in the served dataset, or still pending?
- Item 3 / #11: Close #11 with a linear/log note, or still want a colorbar somewhere?
- New issue C: Remove hex shadows entirely, or just reduce to minimal ambient level?
- Item 10 / #38: Use ColorBrewer Paired palette for all category colors, or pick ad-hoc?
- New issues A–C: Ready to open on GH as written, or adjust wording first?
  - Issue A covers plan items 4 + 5 (tooltip bullet + interaction bullets)
  - Issue B covers plan items 6 + 7 + 8 (all info box copy edits bundled)
  - Issue C covers plan item 11 (hex shadow effect)
