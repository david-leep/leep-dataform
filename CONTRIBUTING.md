# Contributing to leep-dataform

This guide covers how to make changes to the pipeline — adding tables, editing calculations, testing, and viewing results.

**Two ways to contribute.** The **Claude Code + VS Code workflow** below is the default and the one we train on — you'll use it for essentially everything. The **Dataform UI workflow** further down is a lighter-weight fallback for quick edits when you can't or don't want to open your laptop's editor. Both end the same way: a pull request that David reviews before anything reaches production.

**`main` is protected.** You cannot push to it directly, and PRs need at least one approving review before they can merge — this applies to everyone, with no exceptions.

---

## How to think about your job here

Most of us editing this repo are researchers, not software engineers, and that's fine — the workflow is built around it. A few principles matter more than any command:

- **You are not here to write SQL from scratch.** Claude Code writes and edits the SQL. Your job is to *direct* it, *read* what it produces, and *decide* whether it's right. The valuable skill is judgment, not syntax.
- **Ask good questions.** Before changing anything, understand it. "Explain this file in plain English", "where is market share calculated?", "what would happen to Nigeria's number if I change this?" are the moves that make you effective. See the prompt patterns below.
- **Verify everything.** Claude Code is confident even when it's wrong. Never trust an explanation or a change without checking it against the code and against the actual numbers (the testing ladder does this). A change isn't done because Claude says so — it's done when you've seen it produce the right output.
- **Stick to the rules.** The golden rules (never edit `main`, always `--schema-suffix`, compile after every edit, never open a PR with a line you can't explain) exist so that a wrong change can't reach production. They're also encoded in `CLAUDE.md`, so Claude Code already knows them.
- **Keep changes small.** One column, one calculation, one source at a time. Small diffs are easy to review, easy to verify, and easy to revert if something's off.

If you can find the relevant calculation, ask Claude Code to change it, run the ladder, and read the diff — you can contribute. That's the whole job.

---

## The Claude Code + VS Code workflow (default)

> **First time?** Follow `SETUP_GUIDE.md` first — it installs everything (VS Code, Git, Node, Dataform, gcloud, Claude Code) and walks you through your very first change. This section is the reference you'll come back to once you're set up.

You run Claude Code (`claude`) from **inside** the `leep-dataform` folder so it can see all the files and already knows our rules from `CLAUDE.md`. It does the typing — git commands, SQL, config blocks — and you direct and check it.

### The change loop, start to finish

Every change follows the same seven steps. Claude Code can do steps 1, 3, 6, and 7 for you if you ask; you own the judgment in steps 2, 4, and 5.

**1. Start fresh and make your own branch.** A branch is your private copy where edits are isolated until reviewed. Never edit `main`.

```bash
git checkout main && git pull
git checkout -b yourname-short-description
```

You can also just ask: *"Start me a new branch called sarah-add-region-column."*

**2. Understand before you change.** Ask Claude Code to orient you first:

> Explain what `definitions/marts/paint_country_summary.sqlx` does in plain English, and show me where `tier` is calculated.

Read the answer. If you can't yet say what the file does in a sentence, keep asking. This is the step that prevents most mistakes.

**3. Make the change with Claude Code.** Describe *what* you want in plain language and let it write the SQL:

> Add a `region` column from `stg_country` through to the mart. Show me each file you'll change and why before you edit.

Ask it to show its plan first, read it, then let it edit. It follows our conventions (join on `country_code`, explicit column lists, no `SELECT *` except `stg_counterfactual`) because they're in `CLAUDE.md`.

**4. Compile — after every edit.**

```bash
dataform compile
```

Zero risk, no credentials, seconds. Catches broken references and syntax errors. If it errors, paste the error to Claude Code and ask it to fix — then compile again.

**5. Test in your sandbox and verify the numbers.** Work the full **testing ladder** (see [Testing changes](#testing-changes) below): a `--schema-suffix` run into your private dataset, assertions, and the diff-the-data check comparing your result to production. **This is where verification happens** — reading that diff and judging whether it matches what you intended is the core skill. Claude Code writes the check query; you read the result.

**6. Save your work (commit).**

```bash
git add -A && git commit -m "Add region column to mart"
```

Or: *"Commit this with a short message describing what changed."* Commit in small steps.

**7. Push and open a pull request.**

```bash
git push -u origin yourname-short-description
```

Then open the PR on GitHub (the push prints a link), write one or two sentences on what changed and why, **paste your diff-the-data result into the description**, and request David as reviewer. An automatic compile check runs on your PR. You cannot merge your own PR — that's the safety guarantee.

### Prompt patterns worth memorising

You don't need to memorise git or SQL — you need a handful of ways to ask. Keep these handy:

| Goal | Ask Claude Code… |
|------|------------------|
| Orient yourself | "Explain this file in plain English." / "Where is `<metric>` calculated?" |
| Find dependencies | "Which files reference `stg_counterfactual`?" / "If I change this column, what downstream files break?" |
| Understand logic | "What does the water/oil branching in `int_lead_paint_market_share` do?" / "Why might a market share exceed 1?" |
| Make a change | "Add column X from sheet Y to the mart. Show me the plan before editing." |
| Verify | "Write a query comparing my sandbox mart to prod and show what changed." / "Does this output look right for Nigeria?" |
| Debug | "This run failed with `<error>` — what does it mean and how do I fix it?" |

### Rerunning the pipeline

To refresh tables into your sandbox after a change (or just to see current output), run with your suffix — **never** a plain `dataform run`:

```bash
dataform run --schema-suffix yourname --actions paint_summary_by_country
```

Note the action name is `paint_summary_by_country`, even though the file is called
`paint_country_summary.sqlx` — `--actions` matches the table name in the `config` block.

You can also trigger a run from the Dataform UI's **Start execution** button if you prefer clicking to typing — same effect. Target your workspace, not production; if you get it wrong the run fails on permissions rather than overwriting anything.

---

## Alternative: editing in the Dataform UI

For a quick edit when you don't want to open VS Code, Dataform's browser UI mirrors the same branch-based workflow. Each **workspace** in the UI is a branch in GitHub, so nothing you do here touches `main` until it's reviewed. You don't get Claude Code's help writing or checking the SQL, so this path suits small, well-understood edits.

1. **Create your workspace.** In [Dataform in the GCP Console](https://console.cloud.google.com/bigquery/dataform), select the `leep-dataform` repository → **Create workspace** → name it `yourname-feature-description`. It starts as a copy of `main`.
2. **Sync with main.** If `main` has moved on, open the **Git** panel (branch icon, left sidebar) → **Pull from remote** before editing, to avoid conflicts.
3. **Edit and commit.** Change `.sqlx` files in the browser editor. In the Git panel, review the diff for each changed file, enter a short message, and **Commit** (to your workspace branch, not `main`). Commit frequently.
4. **Push and open a PR.** Click **Push to remote**, then go to the [GitHub repo](https://github.com/david-leep/leep-dataform) and click **Compare & pull request**. Describe what changed, request review from David, and don't merge your own PR.
5. **After merge**, either **Pull from remote** to reuse the workspace, or create a fresh one for your next change.

You can run the pipeline into your sandbox from the UI's **Start execution** button — always
confirm it targets your workspace, never production. Executions run as a service account
rather than as you, so check the target carefully; see *Who can write what* below.

---

## Who can write what (access model)

The short version: **you can read production, but you cannot write it.** Production is
written by one automated identity, and only after a PR is merged.

### The two service accounts

You never run the pipeline as yourself. Local runs and Dataform UI runs act as a service
account, and which one decides what can be written.

| | `dataform-sandbox` | `dataform-executor` |
|---|---|---|
| **Who uses it** | You — every local run | GitHub Actions, after a merge to `main` |
| **How** | You impersonate it (no key, no password) | A key held only as a GitHub secret |
| **Reads production** | Yes — all of `paint`, `core`, `dataform_assertions` | Yes |
| **Writes production** | **No** | Yes |
| **Writes sandboxes** | Yes — any `paint_*`, `core_*`, `dataform_assertions_*` | Writes `paint_ci` on PRs |

`dataform-sandbox` holds `bigquery.dataEditor` under an IAM condition that only matches
dataset names with a suffix — `paint_sarah` matches, `paint` does not. That single
condition is what makes a forgotten `--schema-suffix` fail instead of overwriting the
dashboards. Nobody can impersonate `dataform-executor`; the permission is granted on
`dataform-sandbox` alone.

> **Note for new pipelines:** the condition matches `paint_`, `core_`, and
> `dataform_assertions_` only. If a new production dataset is added later, sandbox runs
> against it will fail with a permission error until the condition is extended.

### What this means day to day

| You want to | Works? |
|---|---|
| `dataform compile` | Yes — no credentials needed |
| `dataform run --schema-suffix yourname` | Yes — writes your own sandbox |
| `dataform run` with the suffix forgotten | **No** — `Access Denied`, nothing is written |
| Read any production table, in the console or a query | Yes |
| Overwrite a sandbox you created earlier | Yes |
| Create or refresh an external table yourself | **No** — see *Adding a new Google Sheet source* |
| Merge to `main`, then approve the production run | Yes — the normal path to production |

Access comes from the **`research@leadelimination.org`** group, which carries both the
permission to impersonate `dataform-sandbox` and read access to BigQuery. Ask David to be
added. The source Google Sheets are read by the service account, not by you, so you do not
need any Drive setup.

### Sanctioned exceptions

Two things can write production without a merge. Both are deliberate:

- **A maintainer running the pipeline from the Dataform UI.** Used to re-run production
  on demand. Requires Dataform permissions that researchers do not have.
- **The quarterly World Bank ingest** (`monthly-pipeline-sa`), which refreshes
  `core.indicators_long` on a Cloud Scheduler trigger, independently of this repo.

### Why it is set up this way

A forgotten `--schema-suffix` used to silently overwrite the real dashboards. Now it
returns a permission error. The convention still applies — always pass the flag — but
there is a backstop underneath it rather than care alone.

---

## Adding a new Google Sheet source

The most common way you'll extend the system (e.g. adding a new M&E or impact source) is adding a Google Sheet. Ask Claude Code to do all three steps — *"Add a new source `stg_water_tracker` from this sheet: <url>"* — and it will follow this pattern. Understanding the three touch-points lets you check its work:

**1. Add the external table DDL** to `definitions/sources/external_tables.sqlx`:

```sql
CREATE OR REPLACE EXTERNAL TABLE `leep-data-system.<dataset>.<table_name>`
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/<sheet_id>/edit'],
  skip_leading_rows = 1
);
```

**This file is never run by the pipeline.** It is tagged `disabled: true`, so `dataform run`
always skips it. It exists as a versioned record of the DDL, which a person executes by hand
against production when it changes. You add the statement; you do not run it — external
tables live in production datasets and you have no write access there.

So the sequence for a new source is:

1. You open a PR containing all three steps below
2. You share the sheet with both service accounts (see below)
3. A maintainer merges it and runs the DDL once
4. *Then* you can run the pipeline in your sandbox and check the staging table

Step 4 comes last because sources are *declared*, not built: `--schema-suffix` doesn't apply
to them, so your sandbox reads production's external tables. Until the table exists in
production, there's nothing for your sandbox to read. Everything downstream of staging is
testable as normal.

**Share the sheet with both service accounts** as Viewer, before the PR:

- `dataform-sandbox@leep-data-system.iam.gserviceaccount.com` — so sandbox runs can read it
- `dataform-executor@leep-data-system.iam.gserviceaccount.com` — so production runs can read it

Sheets are read by the service account, never by your own Google account, so sharing it with
yourself is not enough.

**If a sheet's columns change later**, the external table keeps serving the schema captured
when the DDL last ran. Ask a maintainer to re-run it before the new column appears.

<details>
<summary><strong>For maintainers: running the DDL</strong></summary>

After merging, run the statements in `external_tables.sqlx` (everything below the `config`
block) against production, as an account with write access — the BigQuery console works.
`CREATE OR REPLACE EXTERNAL TABLE` is idempotent, so running the whole file is safe and also
refreshes any sheet whose schema has changed.

Check the sheet is shared with both service accounts first. Otherwise the table is created
but unreadable, and the failure surfaces later during a pipeline run rather than here.

</details>

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
2. Trace it downstream: find every file that references that staging table and has an explicit column list. Add the column there too. (Ask Claude Code: *"Which files do I need to touch to carry this column to the mart?"*)
3. To find dependents quickly: `grep -r "ref(\"stg_<table_name>\")"` — or just ask Claude Code the same thing.

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

- Find the file where the metric is first computed (usually an intermediate table). Ask Claude Code: *"Where is `<metric>` first calculated?"*
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
paint_country_summary        (DALYs, discounting, tier)
```

---

## Testing changes

**Never run `dataform run` without `--schema-suffix`.** The default dataset (`paint`) is production — running there overwrites real data that Looker Studio and the team depend on. Work through this ladder before opening a PR, cheapest and lowest-risk first. Claude Code does the typing; **your job is to read and judge the output at each rung.**

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

> Write a query comparing `paint_<yourname>.paint_country_summary` to `paint.paint_country_summary` — show me which rows and columns differ.

Read the diff yourself and judge whether it matches what you meant to change:
- Are the rows that changed the ones you expected to change (and no others)?
- For market share: are baseline/current values still plausible for countries you know?
- For the mart: do `potential_dalys_discounted` and `tier` still look reasonable for known countries?

Trainees shouldn't need to write this query themselves — reading the result and judging whether it matches intent is the actual skill being exercised here.

Once you're satisfied, open a PR (see below).

---

## Viewing results in Looker Studio

The mart tables (`paint_country_summary`, `mart_industry_country_summary`) connect directly to Looker Studio as BigQuery data sources.

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

You don't need to memorise these — Claude Code already knows them from `CLAUDE.md` and applies them. They're here so you can recognise and check its work.

- **Joins**: always join on `country_code`, not country name — World Bank names differ from common usage for many countries (DRC, Egypt, Cote D'Ivoire, Türkiye, etc.)
- **Column names**: snake_case, descriptive over abbreviated
- **CTEs over subqueries**: use named CTEs for any logic more than one step deep
- **No `SELECT *` in staging/intermediate**: list columns explicitly to catch schema drift early. Exception: `stg_counterfactual` uses `SELECT *` intentionally so new columns added to the sheet flow through without a code change.
- **One purpose per file**: if a file is doing two unrelated things, split it
- **Comments**: only where the logic isn't self-evident — business rules, non-obvious branch conditions, workarounds
