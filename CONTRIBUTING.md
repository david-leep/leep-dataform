# Contributing to leep-dataform

This guide covers how to make changes to the pipeline — adding tables, editing calculations, testing, and viewing results.

**`main` is protected.** You cannot push to it directly, and PRs need at least one approving review before they can merge — this applies to everyone, with no exceptions. All work happens on your own branch (in the Dataform UI, your workspace *is* your branch). Never work directly on `main`.

## Editing in the Dataform UI (recommended for non-developers)

1. Open [Dataform in GCP Console](https://console.cloud.google.com/bigquery/dataform)
2. Open your personal workspace — this is your branch; you never edit on `main`
3. Before starting new work, **pull from remote** (see "Working with Git in the Dataform workspace" below) so you're building on the latest `main`, not a stale copy
4. Edit `.sqlx` files directly in the browser
5. Click **Commit & push** when done — a developer will review and merge

## Editing in VS Code (for developers)

1. Clone this repo
2. Create your own branch off `main` — never commit directly on `main`, it will be rejected:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b yourname-short-description
   ```
3. Edit `.sqlx` files directly
4. Push your branch and open a PR against `main`

### Keeping your branch up to date

If `main` moves while you're working (someone else's PR merges), sync before you keep going — otherwise your PR will conflict or your local testing will be against a stale `main`:

```bash
git fetch origin
git rebase origin/main   # or: git merge origin/main
```

Do this before opening a PR, and again if `main` moves further while your PR is still open for review.

To run tables locally, authenticate first:

```bash
dataform init-creds
```

Tables backed by Google Sheets require Drive API access. The sheet must be shared with the Dataform service account.

---

## Working with Git in the Dataform workspace

Dataform's built-in Git integration mirrors a standard branch-based workflow. Each workspace in the Dataform UI corresponds to a branch in the GitHub repo. The steps below cover how to set up, sync, and submit changes from the browser without needing a local clone.

### 1. Create your own workspace

A workspace is a personal branch where your edits are isolated until you're ready to merge.

1. Go to [Dataform in the GCP Console](https://console.cloud.google.com/bigquery/dataform)
2. Select the `leep-dataform` repository
3. Click **Create workspace**
4. Name it something like `yourname-feature-description` (e.g. `david-add-water-source`) — this becomes the branch name in GitHub

Your workspace starts as a copy of `main` at the time you create it.

### 2. Pull changes from main into your workspace

If `main` has moved on since you created your workspace, sync it before making further changes to avoid conflicts.

1. Open your workspace in the Dataform UI
2. Click the **Git** icon (branch icon) in the left sidebar
3. Click **Pull from remote** — this fetches and merges the latest `main` into your workspace branch

If there are conflicts, Dataform will surface them in the UI. Resolve them by editing the affected files, then commit the resolution.

### 3. Edit files and commit

1. Make your changes in the Dataform file editor
2. Click the **Git** icon in the left sidebar — changed files appear under "Uncommitted changes"
3. Review the diff for each file
4. Enter a short, descriptive commit message (e.g. `Add stg_water_source staging table`)
5. Click **Commit** — this commits to your workspace branch (not yet to `main`)

Commit frequently — small commits are easier to review and to revert if something breaks.

### 4. Push your branch and open a pull request

Once your changes are ready for review:

1. In the Git panel, click **Push to remote** — this pushes your workspace branch to GitHub
2. Go to the [leep-dataform GitHub repo](https://github.com/leadelimination/leep-dataform)
3. GitHub will prompt you to open a pull request for your recently pushed branch — click **Compare & pull request**
4. Write a short description of what changed and why
5. Request a review from a developer; do not merge your own PR unless it's trivial

### 5. After your PR is merged

Once merged into `main`, your workspace branch is stale. You have two options:

- **Reuse the workspace**: pull from remote (step 2 above) to bring your branch up to date with the newly merged `main`
- **Create a fresh workspace**: for the next piece of work, create a new workspace branching from the updated `main`

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

**Never run `dataform run` without `--schema-suffix`.** The default dataset (`paint`) is production — running there overwrites real data that Looker Studio and the team depend on. Work through this ladder before opening a PR, cheapest and lowest-risk first.

### 1. Compile check

```bash
dataform compile
```

Catches broken `${ref()}`s, missing declarations, and syntax errors. No BigQuery credentials needed, zero risk, takes seconds. Run this after every edit — not just before committing.

### 2. Isolated run — your own sandbox dataset

```bash
dataform run --schema-suffix <yourname> --tags staging
dataform run --schema-suffix <yourname> --tags intermediate
dataform run --schema-suffix <yourname> --tags marts
```

This materializes every table into `paint_<yourname>` / `core_<yourname>` instead of `paint` / `core` — a full personal copy of the pipeline you can break freely without touching prod. Or run a single action:

```bash
dataform run --schema-suffix <yourname> --actions int_paint_program_base
```

For the incremental table (`int_industry_full`), the first run in a fresh sandbox needs `--full-refresh`:

```bash
dataform run --schema-suffix <yourname> --actions int_industry_full --full-refresh  # first time in this sandbox only
```

### 3. Assertions

Assertions defined in each table's `config` block (`uniqueKey`, `nonNull`, `rowConditions`) run automatically as part of step 2 — no separate command needed. They fail the run loudly if the output is plausible-but-wrong: a duplicate country row, a market share outside 0–1, an unexpected null in a key column. If a sandbox run fails on an assertion, that's the safety net working — investigate the cause before proceeding. Don't rerun with `--disable-assertions` to make the red go away.

### 4. Diff-the-data check

Once a sandbox run is clean, confirm the change actually did what you intended — this is the step that verifies correctness, not just that nothing broke. Ask Claude Code to compare your sandbox mart against prod, e.g.:

> Write a query comparing `paint_<yourname>.paint_summary_by_country` to `paint.paint_summary_by_country` — show me which rows and columns differ.

Read the diff yourself and judge whether it matches what you meant to change:
- Are the rows that changed the ones you expected to change (and no others)?
- For market share: are baseline/current values still plausible for countries you know?
- For the mart: do `potential_dalys_discounted` and `tier` still look reasonable for known countries?

Trainees shouldn't need to write this query themselves — reading the result and judging whether it matches intent is the actual skill being exercised here.

Once you're satisfied, open a PR (see below).

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
