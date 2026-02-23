# Barge Operations & Logistics Data Documentation

**Glossary:**
* **IE:** Import or Export status.
* **Temporal:** Data that changes over time (transactional/operational).
* **Meta:** Reference or master data.

---

## 🏗 Data Hierarchy

The following flow represents the relationship between entities:

```text
BARGE (Master Data)
   │
   ▼
ROTATION (Sequence of terminal visits per barge)
   │
   ▼
VOYAGE (Individual sailing instance)
   │
   ├── VOYTERM (Terminal call details: ETD, ETA, Reservations)
   ├── VOYELM (Capacity and weight usage per segment)
   └── UNITEXP (Individual containers assigned to voyage)

```

---

## 📊 Dataframe Dictionary

### 1. dfBarge (Meta)

*Contains general technical specifications for all vessels.*

* **Rows:** ~14
* **Columns:** `CODE`, `DESCR`, `MAXTEU`, `MAXWEIGHT`, `MAX20FT`, `MAX40FT`, `MAX45FT`

### 2. dfRotation (Temporal)

*Defines the scheduled sequence of locations.*

* **Rows:** ~87
* **Columns:** `SEQ`, `BARGE`, `SCOPEINLOCATION`, `PLANNEDSCOPEINDATE`, `PLANNEDSCOPEINTIME`, `SCOPEOUTLOCATION`, `PLANNEDSCOPEOUTDATE`, `PLANNEDSCOPEOUTTIME`

### 3. dfVoyage (Temporal)

*Links the rotation schedule to actual voyage details.*

* **Rows:** ~160
* **Columns:** `CODE`, `EXTERNALCODE`, `PORT_FROM`, `PORT_TO`, `DEPARTURE_TIME`, `ARRIVAL_TIME`, `IE`, `BARGE`

### 4. dfVoyElm (Temporal)

*Capacity and load metrics per voyage segment. Highly useful for KPI analysis regarding utilization.*

* **Rows:** ~250
* **Columns:** `VOYAGE`, `PORT_FROM`, `PORT_TO`, `MAXTEU`, `TOTALTEU`, `MAXWEIGHT`, `TOTALWEIGHT`

### 5. dfVoyTerm (Temporal)

*Terminal-level operational data and constraints.*

* **Rows:** ~250
* **Columns:** `VOYAGE`, `ADDRESS`, `VOYAGEROTATION`, `EDATE`, `ETIME`, `ETDDATE`, `ETDTIME`, `LD`, `RESERVED[20-40UP]`, `TOTAL[20-45]`, `PORTBASEMCA...`

### 6. dfTransfers (Temporal)

*Inter-terminal truck and container transfer movements.*

* **Rows:** ~100
* **Columns:** `SEQ`, `TERM`, `UNIT`, `BOOKING`, `CNTR`, `UNITTYPE`, `TRANSPORTDATE`, `ADDRESS_TERMFROM`, `ADDRESS_TERMTO`, `NETT`, `STATUS`

### 7. dfUnitExp (Temporal)

*Granular container-level data.*

* **Rows:** ~4,251
* **Columns:** `CONTAINER_ID`, `STATUS_FLAGS`, `PICKUP_DATES`, `NETT_WEIGHT`, `INLAND_INFO`, `TYPE`

---

## 🔗 Join Logic Reference

Use the following keys to connect the dataframes:

| Primary Source | Secondary Source | Join Key(s) | Example Key |
| --- | --- | --- | --- |
| **dfVoyage** | **dfVoyElm** | `CODE` ↔ `VOYAGE` | `DEC0074` |
| **dfVoyage** | **dfVoyTerm** | `CODE` ↔ `VOYAGE` | `DEC0074` |
| **dfVoyage** | **dfRotation** | `EXTERNALCODE` ↔ `SEQ` | `38222` |
| **dfVoyTerm** | **dfRotation** | `VOYAGEROTATION` ↔ `SEQ` | `38222` |
| **dfVoyage** | **dfBarge** | `BARGE` ↔ `CODE` | `DEC` |
| **dfVoyage** | **dfVoyElm** | `PORT_FROM` / `PORT_TO` | `VEGHE`, `ROTTE` |

---

## 💡 Operational Logic Example

### Export (E) vs Import (I)

A voyage is classified based on the direction of travel relative to the inland terminal (e.g., Veghe) and the main port (e.g., Rotterdam).

> **Scenario: Barge DEC Voyage**
> 1. **Export (E):** `DEC0074` leaves **VEGHE** (Feb 5, 14:00) → Arrives **ROTTE** (Feb 6, 10:00).
> 2. **Import (I):** `DEC0075` leaves **ROTTE** (Feb 6, 16:00) → Arrives **VEGHE** (Feb 7, 10:00).
> 
> 

### KPI Monitoring

**dfVoyElm** is the primary source for efficiency tracking. By comparing `TOTALTEU` vs `MAXTEU` or `TOTALWEIGHT` vs `MAXWEIGHT`, we can calculate utilization percentages and identify segments with "dead freight" (unused capacity).

---

## 📍 Concrete Example: Voyage vs. Rotation

This example demonstrates how **dfVoyage** and **dfRotation** are linked using the join key:  
`dfVoyage.EXTERNALCODE` ↔ `dfRotation.SEQ`.

### 1. Export Segment (E)
The barge **DEC** leaves the **VEGHE** inland terminal for the Port of **Rotterdam (ROTTE)**. 
* **Logic:** Exporting goods from the interior of country to the sea port.

**dfVoyage (Row 38)**
| CODE | EXTERNALCODE | PORT_FROM | DEPARTURE_DATE | ETD | PORT_TO | ARRIVAL_DATE | ETA | IE | BARGE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DEC0074 | **38222** | VEGHE | 2026-02-05 | 1400 | ROTTE | 2026-02-06 | 1000 | **E** | DEC |

---

### 2. Import Segment (I)
Later that day, **DEC** departs **ROTTE** to return to **VEGHE**.
* **Logic:** Importing goods from the sea port back to the inland terminal.

**dfVoyage (Row 62)**
| CODE | EXTERNALCODE | PORT_FROM | DEPARTURE_DATE | ETD | PORT_TO | ARRIVAL_DATE | ETA | IE | BARGE |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DEC0075 | **38222** | ROTTE | 2026-02-06 | 1600 | VEGHE | 2026-02-07 | 1000 | **I** | DEC |

---

### 3. The Linked Rotation Record
Both voyages above are part of the same physical rotation sequence (SEQ 38222). This record tracks the barge's passage through specific waypoints during that journey.

**dfRotation**
| SEQ | BARGE | SCOPEIN_LOC | SCOPEIN_DATE | SCOPEIN_TIME | SCOPEOUT_LOC | SCOPEOUT_DATE | SCOPEOUT_TIME |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **38222** | DEC | HEINENOORDTUNNEL | 2026-02-05 | 2100 | HEINENOORDTUNNEL | 2026-02-06 | 2000 |

> **Key Takeaway:** While `dfVoyage` tracks the business logic (Import/Export between ports), `dfRotation` tracks the physical vessel movement through checkpoints like the Heinenoordtunnel.