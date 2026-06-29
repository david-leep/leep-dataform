# Contributing to leep-dataform

This guide covers how to make changes to the pipeline — adding tables, editing calculations, testing, and viewing results.

## Editing in the Dataform UI (recommended for non-developers)

1. Open [Dataform in GCP Console](https://console.cloud.google.com/bigquery/dataform)
2. Open your personal workspace
3. Edit `.sqlx` files directly in the browser
4. Click **Commit & push** when done — a developer will review and merge

## Editing in VS Code (for developers)

1. Clone this repo
2. Edit `.sqlx` files directly
3. Open a PR against `main`

To run tables locally, authenticate first:

```bash
dataform init-creds
```

Tables backed by Google Sheets require Drive API access. The sheet must be shared with the Dataform service account.

---

## Adding a new Google Sheet source

Every new Google Sheet source needs three things:

**1. Create the external table** in `definitions/sources/external_tables.sqlx`:

```sql
CREATE OR REPLACE EXTERNAL TABLE `leep-data-system.<dataset>.<table_name>`
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/<sheet_id>/edit'],
  skip_leading_rows = 1
);
```

Run this file manually in BigQuery or via the Dataform UI after adding it. The file is tagged `disabled: true` so it does not run automatically on every pipeline execution.

**2. Declare the source** in `definitions/sources.js`:

```js
declare({
  schema: "<dataset>",
  name: "<table_name>",
  description: "One sentence describing what this table contains."
});
```

This tells Dataform the table exists so `${ref("<table_name>")}` resolves correctly in staging files.

**3. Create a staging file** in `definitions/staging/stg_<table_name>.sqlx`:

```sql
config {
  type: "table",
  name: "stg_<table_name>",
  tags: ["staging"]
}

SELECT
  column_a,
  column_b
FROM ${ref("<table_name>")}
WHERE column_a IS NOT NULL
```

Use explicit column names rather than `SELECT *` to make schema changes visible. Filter out null/header rows.

---

## Adding a column to an existing table

1. If the column comes from a source (Google Sheet), add it to the staging file's `SELECT` list.
2. Trace it downstream: find every file that references that staging table and has an explicit column list. Add the column there too.
3. Use `grep -r "ref(\"stg_<table_name>\")"` to find all dependents quickly.

Common pattern — adding a column from `stg_counterfactual` all the way to the mart:
- Add to `stg_counterfactual.sqlx` (or confirm it comes through via `SELECT *`)
- Add to the `joined` CTE in `int_paint_program_base.sqlx` (explicit list)
- Add to the final `SELECT` in `int_paint_program_base.sqlx`
- Add to the final `SELECT` in `paint_country_summary.sqlx` (intermediate CTEs use `SELECT *` so they pass through automatically)

---

## Adding a new intermediate or mart table

1. Create a `.sqlx` file in `definitions/intermediate/` or `definitions/marts/`
2. Set the appropriate config:

```sql
config {
  type: "table",
  name: "my_table_name",
  description: "What this table contains and why it exists.",
  tags: ["intermediate"]   -- or "marts"
}
```

3. Reference upstream tables with `${ref("table_name")}` — never hardcode BigQuery paths (except for unmanaged external tables like `stg_discount_rates`, which uses a hardcoded path because it sits in a different schema)
4. One transformation per file. If a CTE is getting complex enough to be reused, it probably belongs in its own intermediate table.

---

## Changing a calculation

- Find the file where the metric is first computed (usually an intermediate table)
- Edit the expression there — downstream tables will pick up the change automatically on the next run
- If the change affects column names, update every downstream file that references the old name
- For the paint pipeline, the main calculation chain is:

```
stg_counterfactual + stg_market_share_overrides
        ↓
int_lead_paint_market_share  (market share per country per month)
        ↓
int_paint_program_base       (children averted, cBLL averted)
        ↓
paint_summary_by_country     (DALYs, discounting, tier)
```

---

## Testing changes

Run only the affected layer to iterate quickly:

```bash
dataform run --tags staging
dataform run --tags intermediate
dataform run --tags marts
```

Or run a single file by name:

```bash
dataform run --actions int_paint_program_base
```

For the incremental table (`int_industry_full`), the first run needs `--full-refresh`. Subsequent runs do not:

```bash
dataform run --actions int_industry_full --full-refresh  # first time only
```

After running, check the output in BigQuery:
- Spot-check row counts and nulls for key columns
- For market share: confirm countries you expect are present and baseline values are plausible (0–1 range)
- For the mart: check that `potential_dalys_discounted` and `tier` look reasonable for known countries

---

## Viewing results in Looker Studio

The mart tables (`paint_summary_by_country`, `mart_industry_country_summary`) connect directly to Looker Studio as BigQuery data sources.

**To find a column:**
1. Open the relevant Looker Studio report
2. Click **Resource → Manage added data sources**
3. Click **Edit** on the data source
4. Use the field search box to find the column by name

If a newly added column isn't appearing:
- Confirm the Dataform run completed without errors in the [Dataform UI](https://console.cloud.google.com/bigquery/dataform)
- In the Looker Studio data source editor, click **Refresh fields** to pick up schema changes

**To add a new field to a report:**
1. Drag it from the field list in the right panel onto a chart or table
2. For calculated fields (e.g. ratios not in the mart), use **Add a field → Custom formula** in the data source editor

---

## Coding conventions

- **Joins**: always join on `country_code`, not country name — World Bank names differ from common usage for many countries (DRC, Egypt, Cote D'Ivoire, Türkiye, etc.)
- **Column names**: snake_case, descriptive over abbreviated
- **CTEs over subqueries**: use named CTEs for any logic more than one step deep
- **No `SELECT *` in staging/intermediate**: list columns explicitly to catch schema drift early. Exception: `stg_counterfactual` uses `SELECT *` intentionally so new columns added to the sheet flow through without a code change.
- **One purpose per file**: if a file is doing two unrelated things, split it
- **Comments**: only where the logic isn't self-evident — business rules, non-obvious branch conditions, workarounds
