# Barge Brain - intelligent data-driven barge planning software

A React web application for viewing and planning inland barge schedules and capacity across terminals. App specifically tailored to Rotterdam inland ports (Veghel, Oss, Tiel, Katendrecht, etc.). It turns operational voyage data into interactive timelines, utilization views, and a route-planning assistant.

## Overview

- **Barge view** — Leg-by-leg schedule with port graph layout, filters, tooltips, and status summaries for each voyage segment.
- **Weekly barge view** — The same idea scoped to a rolling weekly horizon for nearer-term planning.
- **Transport capacity** — TEU and weight utilization by corridor segment and by barge, with filtering to compare lanes and spot under-used capacity.
- **Scatter plot** — Delay and timing issues plotted against operational stages (using Recharts), with filters by issue severity and stage.
- **Route planner** — Given origin, destination, container type/count, and dates, suggests how containers can be spread across eligible voyages subject to departure windows, due dates, hub routing via Rotterdam where relevant, and per-voyage TEU limits.

The planning horizon and voyage counts shown in the UI reflect the bundled dataset (see `src/data/`).

## Getting started

```bash
npm install
npm start
```

Build for production:

```bash
npm run build
```

## Data

Voyage and barge master data live under `src/data/`. For a detailed description of the upstream dataframe hierarchy (barges, rotations, voyages, terminals, units) and join keys, see **`data documentation.md`**.

---

## Acknowledgements

This project was developed as part of the **Group Design Practical** at the **University of Oxford** — a structured group engineering course focused on delivering a real-world design outcome.

The tool was built **in collaboration with practising barge planners**, with their feedback shaping priorities and usability throughout.

The work was **supervised under [Squid Software](https://squid.software/)**.
