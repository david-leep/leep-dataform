# leep-dataform

SQL transformation pipeline for LEEP data, built with [Dataform](https://cloud.google.com/dataform) on Google Cloud.

This repo is connected to the Dataform project in GCP (`leep-data-system`, region `europe-west4`). Changes made here are reflected in the Dataform UI, and changes made in the Dataform UI are committed back to this repo.

## What this does

Raw data is ingested into BigQuery by Cloud Functions (see [leep-data-system](https://github.com/david-leep/leep-data-system)). This Dataform project takes those raw tables and transforms them into analysis-ready tables.

The current pipeline produces `paint_summary_by_country` — a joined, cleaned table combining paint industry data, country demographics, counterfactual scenarios, and model parameters.

## Folder structure

```
definitions/
├── sources.js               # Declares the raw BigQuery tables as Dataform sources
├── staging/                 # One file per source table — light cleaning and column selection
│   ├── stg_country.sqlx     # Country demographics (continent, births, urbanisation)
│   ├── stg_counterfactual.sqlx  # Counterfactual scenarios per country
│   ├── stg_industry.sqlx    # Paint industry data (volumes, manufacturers)
│   └── stg_paint.sqlx       # Paint model parameters (BLL impact, DALYs, etc.)
└── marts/
    └── paint_country_summary.sqlx  # Final joined table for analysis
```

### Layer logic

- **sources.js** — tells Dataform which raw BigQuery tables exist, without transforming them
- **staging/** — one-to-one with source tables; selects and renames columns, no joins
- **marts/** — joins staging tables together into the final output used for analysis

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

## Data sources (raw BigQuery tables)

All in the `example` dataset in `leep-data-system`:

| Table | Description |
|---|---|
| `industry` | Paint volumes and manufacturer data by country |
| `counterfactual` | Counterfactual scenario assumptions per country |
| `country_metadata` | Country demographics — births, urbanisation, continent |
| `paint` | Global model parameters for health/economic impact |
| `indicators_long` | World Bank development indicators (ingested by Cloud Function) |
