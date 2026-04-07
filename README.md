# leep-dataform

SQL transformation pipeline for LEEP data, built with [Dataform](https://cloud.google.com/dataform) on Google Cloud.

This repo is connected to the Dataform project in GCP (`leep-data-system`, region `europe-west4`). Changes made here are reflected in the Dataform UI, and changes made in the Dataform UI are committed back to this repo.

## What this does

Raw data is ingested into BigQuery by Cloud Functions (see [leep-data-system](https://github.com/david-leep/leep-data-system)). This Dataform project takes those raw tables and transforms them into analysis-ready tables.

The current pipeline produces `paint_summary_by_country` — DALY impact estimates per country for LEEP paint programs, covering two scenarios: potential impact (full program success) and to-date impact (actual market share reduction observed so far).

## Folder structure

```
definitions/
├── sources.js                        # Declares native BigQuery tables (indicators_long, country_metadata) as Dataform sources
├── sources/                          # DDL to create Google Sheets-backed external tables in BigQuery
│   └── external_tables.sqlx          # CREATE OR REPLACE EXTERNAL TABLE statements for all Google Sheets sources
├── staging/                          # One file per source — light cleaning and column selection only, no joins
│   ├── stg_country.sqlx              # LMIC country list filtered from country_metadata
│   ├── stg_indicators_long.sqlx      # World Bank indicators pre-filtered to the 3 used downstream
│   ├── stg_industry.sqlx             # Paint industry volumes per manufacturer per country
│   ├── stg_industry_full.sqlx        # Dynamic column cleaning for industry_full_raw (EXECUTE IMMEDIATE)
│   ├── stg_counterfactual.sqlx       # Counterfactual assumptions per country (market shift timing, reduction target)
│   ├── stg_country_paint_baseline.sqlx  # Baseline lead paint market share before LEEP intervention
│   └── stg_paint.sqlx                # Global model parameters (BLL impact, DALYs, discount rates, etc.)
├── intermediate/                     # Joins and derived calculations, not intended for direct analysis
│   ├── int_country_profile.sqlx      # Joins country list with World Bank indicators; pivots to one row per country
│   ├── int_industry_full.sqlx        # Incremental table partitioned by month — monthly snapshots of industry data
│   ├── int_lead_paint_market_share.sqlx  # Lead paint market share per country per month, accounting for water/oil split
│   └── int_paint_program_base.sqlx   # Joins all sources; computes exposure and children averted (potential and to-date)
└── marts/                            # Final output tables used for analysis and reporting
    └── paint_country_summary.sqlx    # DALY estimates per country (undiscounted, discounted, probability-weighted)
```

## Pipeline diagram

```
 GOOGLE SHEETS                        BIGQUERY (native)
 ─────────────                        ─────────────────
 industry            ──┐              indicators_long  ──┐
 industry_full_raw   ──┤              country_metadata ──┤
 counterfactual      ──┤                                 │
 paint               ──┤                                 │
 country_paint_      ──┘                                 │
   baseline                                              │
        │                                                │
        ▼                                                ▼
 sources/external_tables.sqlx        sources.js
 (CREATE EXTERNAL TABLE)             (declare)
        │                                                │
        └──────────────────┬──────────────────────────── ┘
                           │
                           ▼  STAGING
              ┌────────────────────────────┐
              │  stg_industry              │
              │  stg_industry_full     ────│── dynamic column cleaning (EXECUTE IMMEDIATE)
              │  stg_counterfactual        │
              │  stg_paint                 │
              │  stg_country_paint_        │
              │    baseline                │
              │  stg_country           ───┐│
              │  stg_indicators_long   ───┘│
              └────────────────────────────┘
                           │
                           ▼  INTERMEDIATE
              ┌────────────────────────────┐
              │  int_country_profile       │◄── stg_country
              │  (births, urban rate)      │    stg_indicators_long
              └────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │  int_industry_full         │◄── stg_industry_full
              │  (monthly snapshots,       │
              │   partitioned by month)    │
              └────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │  int_lead_paint_market_    │◄── int_industry_full
              │    share                   │
              │  (per country per month)   │
              └────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │  int_paint_program_base    │◄── int_country_profile
              │  (children averted,        │    int_lead_paint_market_share
              │   cbll_averted)            │    stg_counterfactual
              └────────────────────────────┘    stg_paint
                           │                    stg_country_paint_baseline
                           ▼  MARTS
              ┌────────────────────────────┐
              │  paint_summary_by_country  │
              │  (DALYs averted,           │
              │   discounted,              │
              │   probability-weighted)    │
              └────────────────────────────┘
```

## Layer logic

- **sources.js** — tells Dataform which raw BigQuery tables exist, without transforming them
- **staging/** — one-to-one with source tables; selects and renames columns, minimal logic, no joins
- **intermediate/** — joins staging tables together and computes derived metrics; not the final output but too complex to live in a mart
- **marts/** — reads from intermediate tables and produces the final analysis-ready output

Each layer has a tag so you can run selectively:

```bash
dataform run --tags sources
dataform run --tags staging
dataform run --tags intermediate
dataform run --tags marts
```

## Key calculations (paint pipeline)

This Dataform pipeline creates program-level estimates of impact for LEEP's paint programs:

1. **Country profile** (`int_country_profile`) — joins World Bank birth rate, population, and urbanisation data to produce `annual_number_of_births` and `urban_rate` per LMIC country
2. **Industry data** (`stg_industry_full` → `int_industry_full`) — dynamically cleans column names from the raw Google Sheet at runtime (trimming whitespace, lowercasing, replacing special characters), then stores monthly snapshots in a partitioned incremental table
3. **Lead paint market share** (`int_lead_paint_market_share`) — calculates lead paint market share per country per month, with logic that accounts for whether a country has water-based paint manufacturers (volume-weighted share) or only oil-based (high-lead volume / total oil volume)
4. **Exposure base** (`int_paint_program_base`) — uses the latest month's market share to compute children born in lead-painted homes, then calculates how many children's exposure is averted under two scenarios:
   - **Potential**: assumes the full `lead_paint_reduction_percentage` is achieved
   - **To-date**: uses the actual observed reduction (`baseline − current` market share)
5. **DALY estimates** (`paint_summary_by_country`) — converts averted exposure into health DALYs and income-equivalent DALYs, applies time discounting and probability weighting

## Data sources (raw BigQuery tables)

All in the `example` dataset in `leep-data-system`:

| Table | Description |
|---|---|
| `industry` | Paint volumes and manufacturer data by country (one row per manufacturer) |
| `industry_full_raw` | Full manufacturer-level industry data from Google Sheet ("All Manu Data" tab) — column names auto-detected and cleaned at runtime |
| `counterfactual` | Counterfactual scenario assumptions per country |
| `country_metadata` | Country classifications — income group, country code |
| `indicators_long` | World Bank development indicators (ingested by Cloud Function) |
| `paint` | Global model parameters — BLL impact, DALY rates, discount rates, etc. |
| `country_paint_baseline` | Baseline lead paint market share per country before LEEP intervention (Google Sheet) |

## How to make changes

**In the Dataform UI (recommended for non-developers):**
1. Open [Dataform in GCP Console](https://console.cloud.google.com/bigquery/dataform)
2. Open your personal workspace
3. Edit the `.sqlx` files directly
4. Click "Commit & push" when done — a developer will review and merge

**In VS Code (for developers):**
1. Clone this repo
2. Edit `.sqlx` files directly
3. Open a PR against `main`

Note: tables backed by Google Sheets (e.g. `country_paint_baseline`, `paint`, `industry_full_raw`) require Drive API access. The Google Sheet must be shared with the service account used by Dataform. To run tables locally, authenticate for Dataform access in your terminal by running

```bash
dataform init-creds
```