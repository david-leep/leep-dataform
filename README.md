# leep-dataform

SQL transformation pipeline for LEEP data, built with [Dataform](https://cloud.google.com/dataform) on Google Cloud.

This repo is connected to the Dataform project in GCP (`leep-data-system`, region `europe-west4`). Changes made here are reflected in the Dataform UI, and changes made in the Dataform UI are committed back to this repo.

## What this does

Raw data is ingested into BigQuery by Cloud Functions (see [leep-data-system](https://github.com/david-leep/leep-data-system)). This Dataform project takes those raw tables and transforms them into analysis-ready tables.

The current pipeline produces two mart tables:
- `paint_summary_by_country` — DALY impact estimates per country for LEEP paint programs, covering two scenarios: potential impact (full program success) and to-date impact (actual market share reduction observed so far)
- `mart_industry_country_summary` — manufacturer engagement milestones and paint volumes aggregated by country

## Folder structure

```
definitions/
├── sources.js                        # Declares native BigQuery tables (indicators_long, country_metadata) as Dataform sources
├── sources/                          # DDL to create Google Sheets-backed external tables in BigQuery
│   └── external_tables.sqlx          # CREATE OR REPLACE EXTERNAL TABLE statements for all Google Sheets sources
├── staging/                          # One file per source — light cleaning and column selection only, no joins
│   ├── stg_country.sqlx              # LMIC country list filtered from country_metadata
│   ├── stg_indicators_long.sqlx      # World Bank indicators pre-filtered to the 3 used downstream
│   ├── stg_industry_full.sqlx        # Dynamic column cleaning for industry_full_raw (EXECUTE IMMEDIATE)
│   ├── stg_counterfactual.sqlx       # Counterfactual assumptions per country (market shift timing, reduction target)
│   └── stg_assumptions.sqlx          # Global model parameters (BLL impact, DALYs, discount rates, etc.)
├── intermediate/                     # Joins and derived calculations, not intended for direct analysis
│   ├── int_country_profile.sqlx      # Joins country list with World Bank indicators; pivots to one row per country
│   ├── int_industry_full.sqlx        # Incremental table partitioned by month — monthly snapshots of industry data
│   ├── int_lead_paint_market_share.sqlx  # Baseline and current lead paint market share per country per month (current excludes reformulated manufacturers)
│   └── int_paint_program_base.sqlx   # Joins all sources; computes exposure and children averted (potential and to-date)
└── marts/                            # Final output tables used for analysis and reporting
    ├── paint_country_summary.sqlx    # DALY estimates per country (undiscounted, discounted, probability-weighted)
    └── mart_industry_country_summary.sqlx  # Manufacturer milestone counts and volumes per country
```

## Pipeline diagram

```
 GOOGLE SHEETS                        BIGQUERY (native)
 ─────────────                        ─────────────────
 industry_full_raw   ──┐              indicators_long  ──┐
 counterfactual      ──┤              country_metadata ──┤
 assumptions         ──┘                                 │
        │                                                │
        ▼                                                ▼
 sources/external_tables.sqlx        sources.js
 (CREATE EXTERNAL TABLE)             (declare)
        │                                                │
        └──────────────────┬──────────────────────────── ┘
                           │
                           ▼  STAGING
              ┌────────────────────────────┐
              │  stg_industry_full     ────│── dynamic column cleaning (EXECUTE IMMEDIATE)
              │  stg_counterfactual        │
              │  stg_assumptions           │
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
              └───────────┬────────────────┘
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
 ┌────────────────────────────┐  ┌────────────────────────────┐
 │  int_lead_paint_market_    │  │  mart_industry_country_    │◄── int_country_profile
 │    share                   │  │    summary                 │
 │  (baseline + current       │  │  (milestone counts,        │
 │   per country per month)   │  │   volumes per country)     │
 └────────────────────────────┘  └────────────────────────────┘
                 │
                 ▼
 ┌────────────────────────────┐
 │  int_paint_program_base    │◄── int_country_profile
 │  (children averted,        │    int_lead_paint_market_share
 │   cbll_averted)            │    stg_counterfactual
 └────────────────────────────┘    stg_assumptions
                 │
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
3. **Lead paint market share** (`int_lead_paint_market_share`) — calculates two market share figures per country per month: `baseline_lead_paint_market_share` (all manufacturers with high-Pb volume count as leaded) and `current_lead_paint_market_share` (excludes manufacturers who have completed reformulation). The water/oil branching logic accounts for whether a country has water-based paint manufacturers (volume-weighted share) or only oil-based (high-lead volume / total oil volume)
4. **Exposure base** (`int_paint_program_base`) — uses the latest month's baseline and current market share from `int_lead_paint_market_share` to compute children born in lead-painted homes, then calculates how many children's exposure is averted under two scenarios:
   - **Potential**: assumes the full `lead_paint_reduction_percentage` is achieved
   - **To-date**: uses the actual observed reduction (`baseline − current` market share)
5. **DALY estimates** (`paint_summary_by_country`) — converts averted exposure into health DALYs and income-equivalent DALYs, applies time discounting and probability weighting

## Data sources (raw BigQuery tables)

Split across two datasets in `leep-data-system`:

| Table | Dataset | Description |
|---|---|---|
| `country_metadata` | `core` | Country classifications — income group, country code |
| `indicators_long` | `core` | World Bank development indicators (ingested by Cloud Function) |
| `industry_full_raw` | `paint` | Full manufacturer-level industry data from Google Sheet ("All Manu Data" tab) — column names auto-detected and cleaned at runtime |
| `counterfactual` | `paint` | Counterfactual scenario assumptions per country |
| `assumptions` | `paint` | Global model parameters — BLL impact, DALY rates, discount rates, etc. |

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

Note: tables backed by Google Sheets (e.g. `assumptions`, `industry_full_raw`) require Drive API access. The Google Sheet must be shared with the service account used by Dataform. To run tables locally, authenticate for Dataform access in your terminal by running

```bash
dataform init-creds
```