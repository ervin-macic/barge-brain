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

## Tech stack

- React 19 (Create React App / `react-scripts`)
- Recharts for charts
- Express + better-sqlite3 backend (`server/`)

## Deployment (Railway)

The repo is structured for two Railway services from the same Git repository.

| Service | Root directory | railway.json |
|---------|----------------|--------------|
| Frontend | `.` (repo root) | `railway.json` |
| Backend | `server/` | `server/railway.json` |

**Frontend environment variable (build time):**

```
REACT_APP_API_URL=https://<backend>.up.railway.app
```

CRA bakes this in at build time. Without it, the app uses the bundled static dataset (fine for local development and tests).

**Backend environment variables:**

```
DATABASE_PATH=/data/barge-brain.sqlite    # must match the volume mount path
FRONTEND_URL=https://<frontend>.up.railway.app
```

Attach a Railway volume to the backend service and mount it at `/data`. On first boot the server copies the bundled seed database (`server/data/barge-brain.sqlite`) onto the empty volume automatically.

To regenerate the seed database after a data update:

```bash
npm run seed:server-db
```

Commit the updated `server/data/barge-brain.sqlite`.

## Data

Voyage and barge master data live under `src/data/`. For a detailed description of the upstream dataframe hierarchy (barges, rotations, voyages, terminals, units) and join keys, see **`data documentation.md`**.

---

## Acknowledgements

This project was developed as part of the **Group Design Practical** at the **University of Oxford** — a structured group engineering course focused on delivering a real-world design outcome.

The tool was built **in collaboration with practising barge planners**, with their feedback shaping priorities and usability throughout.

The work was **supervised under [Squid Software](https://squid.software/)**.
