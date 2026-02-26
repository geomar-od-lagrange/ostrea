# Update InfoBox — Plan

Branch: `update-infobox`

## YOUR QUESTIONS/NOTES

_Nothing pending._

---

## Scope

| # | Change | File(s) |
|---|--------|---------|
| 1+4 | Add About / Methods tabs to InfoBox | `InfoBox.tsx`, `index.css` |
| 2+3+5 | Rewrite info.md (corrected content, no geography sentence, data DOI, manuscript DOI) | `info.md` |

---

## Details

### 1+4 — Tabs in InfoBox

Add `tab: "about" | "methods"` to InfoBox state alongside existing `state`.

Tab bar rendered as two small buttons below the title/collapse row.
Active tab underlined or highlighted using existing panel text color.

- **About** tab: intro paragraph + Why? section + How to use bullets
- **Methods** tab: Methods section + formula + caveat + data/paper links

Content stored as two separate imported markdown files:
- `frontend/src/info-about.md`
- `frontend/src/info-methods.md`

CSS: `.info-box-tabs`, `.info-box-tab-btn`, `.info-box-tab-btn[aria-selected="true"]`

### 2+3+5 — info-about.md

```markdown
## OSTREA

**Oyster Spatio-Temporal Dispersal Atlas** — an interactive tool to explore
dispersal of European flat oyster (*Ostrea edulis*) larvae and the pathogen
*Bonamia ostreae*. Results from biophysical dispersal simulations are
visualized for open exploration.

### Why?

European flat oysters were once widespread but are now locally extinct in many
areas due to overharvesting, habitat destruction, and disease. Active reef
restoration is underway through more than 40 projects coordinated by the
[Native Oyster Restoration Alliance (NORA)](https://noraeurope.eu/).

*Bonamia ostreae* is a unicellular parasite that infects oyster immune cells
and causes mass mortality. Ocean currents can transport free pathogen cells or
infected larvae to sites with no direct human connection to diseased
populations — dispersal-driven exposure that biosecurity protocols cannot
prevent. Understanding these pathways is essential for site selection, disease
zoning, and biosecurity planning.

### How to use

- **Click a hex** to select it as a source location
- **Multi-select** by clicking additional hexes
- Use **Depth** and **Time range** to filter dispersal scenarios
- Toggle **Highlights** to show aquaculture, restoration, and outbreak sites
- Click **clear** to deselect all hexes
```

### 2+3+5 — info-methods.md

```markdown
### Methods

Lagrangian particle simulations driven by the Copernicus Marine Service
North-West Shelf ocean model (~1.8 km horizontal resolution, hourly, tidal)
simulate passive drift across the North-West European shelf. Simulations cover
the *O. edulis* reproductive season (May–August) for 2019–2022, with ~100,000
particles released per day, totalling ~48 million trajectories.

Particle trajectories are pre-aggregated into connectivity components on a
hexagonal grid (~10 km cell radius), enabling fast interactive exploration
without re-running simulations.

Three dispersal time windows reflect distinct biological modes:

- **0–7 days** — free *B. ostreae* cells drifting in seawater
- **7–14 days** — larvae undergoing rapid development
- **7–28 days** — larvae at maximum pelagic duration

Simulations start from four source types: known *B. ostreae*-positive sites,
*O. edulis* aquaculture sites, historic oyster beds, and the full potentially
habitable area (depth < 85 m).

Relative pathogen exposure at each target hexagon:

$$C_{\mathrm{target}} = \frac{N_{\mathrm{obsh}}}{N \cdot DT_{\mathrm{h}}}$$

$N_{\mathrm{obsh}}$: cumulative particle-hours in target cell;
$N$: particles released at source;
$DT_{\mathrm{h}}$: window duration in hours.
$C_{\mathrm{target}} \in [0,1]$ scales absolute pathogen load at source to
expected concentration at target.

**Important:** this metric quantifies potential co-location exposure, not
infection probability or disease outcome.

---

Connectivity data: [hdl.handle.net/20.500.12085/11cc2d8f-4039-49d3-aaab-04ce0fb23190](https://hdl.handle.net/20.500.12085/11cc2d8f-4039-49d3-aaab-04ce0fb23190)

Analysis code: [doi.org/10.5281/zenodo.17061788](https://doi.org/10.5281/zenodo.17061788)

Manuscript: [doi.org/10.1038/s43247-026-03319-z](https://doi.org/10.1038/s43247-026-03319-z)
```

---

## Git

- Commit per logical change, single PR closes on merge
