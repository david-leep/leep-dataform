# leep-dataform

SQL transformation pipeline for LEEP data, built with [Dataform](https://cloud.google.com/dataform) on Google Cloud.

This repo is connected to the Dataform project in GCP (`leep-data-system`, region `europe-west4`). Changes made here are reflected in the Dataform UI, and changes made in the Dataform UI are committed back to this repo.

## What this does

Raw data is ingested into BigQuery by Cloud Functions (see [leep-data-system](https://github.com/david-leep/leep-data-system)). This Dataform project takes those raw tables and transforms them into analysis-ready tables.

The current pipeline produces `paint_summary_by_country` — DALY impact estimates per country for LEEP paint programs, covering two scenarios: potential impact (full program success) and to-date impact (actual market share reduction observed so far).

## Folder structure

```
definitions/
├── sources.js                        # Declares raw BigQuery tables as Dataform sources
├── staging/                          # One file per source — light cleaning and column selection only, no joins
│   ├── stg_country.sqlx              # LMIC country list filtered from country_metadata
│   ├── stg_indicators_long.sqlx      # World Bank indicators pre-filtered to the 3 used downstream
│   ├── stg_industry.sqlx             # Paint industry volumes per manufacturer per country
│   ├── stg_counterfactual.sqlx       # Counterfactual assumptions per country (market shift timing, reduction target)
│   ├── stg_country_paint_baseline.sqlx  # Baseline lead paint market share before LEEP intervention
│   └── stg_paint.sqlx                # Global model parameters (BLL impact, DALYs, discount rates, etc.)
├── intermediate/                     # Joins and derived calculations, not intended for direct analysis
│   ├── int_country_profile.sqlx      # Joins country list with World Bank indicators; pivots to one row per country
│   └── int_paint_program_base.sqlx   # Joins all sources; computes exposure and children averted (potential and to-date)
└── marts/                            # Final output tables used for analysis and reporting
    └── paint_country_summary.sqlx    # DALY estimates per country (undiscounted, discounted, probability-weighted)
```

## Layer logic

- **sources.js** — tells Dataform which raw BigQuery tables exist, without transforming them
- **staging/** — one-to-one with source tables; selects and renames columns, minimal logic, no joins
- **intermediate/** — joins staging tables together and computes derived metrics; not the final output but too complex to live in a mart
- **marts/** — reads from intermediate tables and produces the final analysis-ready output

Each layer has a tag so you can run selectively:

```bash
dataform run --tags staging
dataform run --tags intermediate
dataform run --tags marts
```

## Key calculations (paint pipeline)

The pipeline replicates the LEEP "Paint Programs" Excel model:

1. **Country profile** (`int_country_profile`) — joins World Bank birth rate, population, and urbanisation data to produce `annual_number_of_births` and `urban_rate` per LMIC country
2. **Exposure base** (`int_paint_program_base`) — computes children born in lead-painted homes using baseline market share, then calculates how many children's exposure is averted under two scenarios:
   - **Potential**: assumes the full `lead_paint_reduction_percentage` is achieved
   - **To-date**: uses the actual observed reduction (`baseline − current` market share)
3. **DALY estimates** (`paint_summary_by_country`) — converts averted exposure into health DALYs and income-equivalent DALYs, applies time discounting and probability weighting

## Data sources (raw BigQuery tables)

All in the `example` dataset in `leep-data-system`:

| Table | Description |
|---|---|
| `industry` | Paint volumes and manufacturer data by country (one row per manufacturer) |
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

Note: tables backed by Google Sheets (e.g. `country_paint_baseline`, `paint`) require Drive API access. Run these via the GCP Dataform console rather than the CLI, as service accounts need Domain-Wide Delegation to access Sheets-backed external tables from the command line.
