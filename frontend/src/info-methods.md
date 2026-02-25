### Methods

Lagrangian particle simulations driven by the Copernicus Marine Service North-West Shelf ocean model (~1.8 km horizontal resolution, hourly, tidal) simulate passive drift across the North-West European shelf. Simulations cover the *O. edulis* reproductive season (May–August) for 2019–2022, with ~100,000 particles released per day, totalling ~48 million trajectories.

Particle trajectories are pre-aggregated into connectivity components on a hexagonal grid (~10 km cell radius), enabling fast interactive exploration without re-running simulations.

Three dispersal time windows reflect distinct biological modes:

- **0–7 days** — free *B. ostreae* cells drifting in seawater
- **7–14 days** — larvae undergoing rapid development
- **7–28 days** — larvae at maximum pelagic duration

Simulations start from four source types: known *B. ostreae*-positive sites, *O. edulis* aquaculture sites, historic oyster beds, and the full potentially habitable area (depth < 85 m).

Relative pathogen exposure at each target hexagon:

$$C_{\mathrm{target}} = \frac{N_{\mathrm{obsh}}}{N \cdot DT_{\mathrm{h}}}$$

$N_{\mathrm{obsh}}$: cumulative particle-hours in target cell;
$N$: particles released at source;
$DT_{\mathrm{h}}$: window duration in hours.
$C_{\mathrm{target}} \in [0,1]$ scales absolute pathogen load at source to expected concentration at target.

**Important:** this metric quantifies potential co-location exposure, not infection probability or disease outcome.

---

Connectivity data: [hdl.handle.net/20.500.12085/…](https://hdl.handle.net/20.500.12085/11cc2d8f-4039-49d3-aaab-04ce0fb23190)

Analysis code: [doi.org/10.5281/zenodo.17061788](https://doi.org/10.5281/zenodo.17061788)

Manuscript: [doi.org/10.1038/s43247-026-03319-z](https://doi.org/10.1038/s43247-026-03319-z)

**Contributors:** Willi Rath, Ingmar Eissfeldt, Felix Kirch, Lara Schmittmann
