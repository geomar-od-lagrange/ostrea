## OSTREA

**Oyster Spatio-Temporal Dispersal Atlas** — an interactive tool to explore dispersal of European flat oyster (*Ostrea edulis*) larvae and the pathogen *Bonamia ostreae*. Results from biophysical dispersal simulations are visualized for open exploration.

![Connectivity](/methods.png)

### Why?

European flat oysters were once widespread but are now endangered due to overfishing, habitat loss, and disease. A growing community is working to restore oyster reefs through initiatives like the [Native Oyster Restoration Alliance (NORA)](https://noraeurope.eu/). Understanding larval dispersal and disease spread is essential for restoration planning and aquaculture biosecurity.

### Methods

We use Lagrangian particle simulations driven by hydrodynamic ocean models to predict how larvae and pathogens drift with currents. Thousands of virtual particles are released from source locations, and connectivity is calculated based on where they end up.

Relative concentrations of pathogen exposure from each selected start location are aggregated by averaging exposures on the target cells: 

$$\bar{E} = \frac{1}{n}\sum_{i=1}^{n} E_i$$
