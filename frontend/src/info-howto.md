### How to use

- **Click a hex** to select it as a source location for pathogen or infected larval release; click again to deselect
- Connected target hexes are coloured by the **relative concentration** of pathogen reaching each target from that source
- **Multi-select** by clicking additional hexes
- Use **Drifting Depth** and **Time range** to filter dispersal scenarios
- Toggle **Highlights** to show historic populations, aquaculture, restoration, and outbreak sites
- Enable **habitable only** to dim hexes deeper than 85 m
- Click **clear** to deselect all hexes
- Hex colour shows **relative concentration** on a **logarithmic scale** (green = higher; hover for exact value as *a* · 10ⁿ)

#### Drifting depth checkboxes

Selecting multiple depths computes the **arithmetic mean** of the relative concentration across those depths.

#### Time range checkboxes

The three time windows are **non-overlapping**:

| Window | Duration | Biological context |
|---|---|---|
| 0–7 days | 168 h | Free *B. ostreae* cells |
| 7–14 days | 168 h | Early larval development |
| 14–28 days | 336 h | Maximum pelagic duration |

Selecting multiple windows computes a **time-weighted average** dispersal rate over the combined period. Because the 14–28 day window spans twice as many hours as each weekly window, it contributes twice as much weight. Selecting all three windows gives a single rate averaged across the full 0–28 day larval period, with the second half weighted accordingly.
