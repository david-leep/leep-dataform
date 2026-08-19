# CLAUDE.md — leep-dataform working guide for Claude Code

This file is read automatically by Claude Code when you start it inside this repo.
It tells Claude Code how our pipeline is built and the rules it must follow when
helping you make changes. It is committed and shared, so everyone on the team gets
the same guardrails. **You do not need to memorise any of this** — it exists so that
when you ask Claude Code for help, it already knows our conventions and safety rules.

If you are new here, read `SETUP_GUIDE.md` first (how to install everything and make
your first change), then `README.md` (what the pipeline does) and `CONTRIBUTING.md`
(recipes and the testing ladder).

---

## Who is using this repo

Most people editing this repo are researchers who are strong quantitatively but new
to git, SQL, and Claude Code. When you help them:

- **Explain before you change.** Before editing a file, say in one or two plain-English
  sentences what you're about to do and why. After editing, summarise what changed.
- **Prefer small, single-purpose changes.** If a request is large, propose breaking it
  into smaller steps rather than making one sweeping edit.
- **Teach, don't just do.** When the user asks "how does X work", explain the actual
  code in this repo in plain language, and point to the specific file and lines.
- **Flag uncertainty.** If you're not sure a change is correct, say so and suggest how
  to verify it rather than asserting it works.
- **Always ask the user questions for things that are unclear** If a judgement call is needed,
  e.g. which DALY column is needed for a calculation, ask the user questions before proceeding.

---

## Golden safety rules (never break these)

1. **Never edit or commit on `main`.** Always work on a feature branch
   (`git checkout -b yourname-short-description`). `main` is protected on GitHub and
   direct pushes are rejected anyway — but never try.
2. **Never run `dataform run` without `--schema-suffix <name>`.** The default dataset
   (`paint`) is **production** — the real numbers on the dashboards. A suffixed run
   writes to a private sandbox (e.g. `paint_sarah`) and cannot touch production.
   If a user asks you to run the pipeline, always add `--schema-suffix <theirname>`.
3. **Run `dataform compile` after every edit** to a `.sqlx` or `sources.js` file. It
   needs no credentials, has zero risk, and takes seconds. Fix compile errors before
   moving on. Do this reflexively, not just before committing.
4. **Never destructive-delete data.** Do not run `bq rm`, drop production tables, or
   run with `--full-refresh` against production. The incremental table
   (`int_industry_full`) full-refresh is David's job — flag it, don't do it.
5. **Never open a PR containing a line the user can't explain.** If the user doesn't
   understand a change you made, explain it until they do, or revert it.
6. **Nobody merges their own PR.** Changes require review and approval from David
   (or another maintainer) before they reach `main`.

---

## How the pipeline is structured

Data flows in layers. Each `.sqlx` file is one table and has one job.

```
Google Sheets + native BigQuery tables   (raw sources)
  → staging/    (stg_*)     one file per source; light cleaning, column selection, NO joins
  → intermediate/ (int_*)   joins and derived calculations; not for direct analysis
  → marts/                  final analysis-ready outputs that feed Looker Studio
```

The main calculation chain that produces DALY impact:

```
int_country_profile          births, urban rate (from World Bank indicators)
int_lead_paint_market_share  baseline vs current lead-paint market share per country/month
        ↓ (both feed)
int_paint_program_base       children with averted lead exposure (potential and to-date)
        ↓
paint_country_summary        health + income DALYs, time discounting, probability weighting, tier A–D
```

The two mart outputs:
- `paint_country_summary` — DALY impact per country (potential and to-date).
- `mart_industry_country_summary` — manufacturer engagement milestones and paint volumes.

Sources are declared in `definitions/sources.js` (native BigQuery tables) and created
as external tables in `definitions/sources/external_tables.sqlx` (Google Sheets-backed).

---

## Project facts

- Dataform + BigQuery. GCP project: `leep-data-system`. Region: `europe-west4` (EU).
- Dataform Core version: `3.0.42` (see `workflow_settings.yaml`). Default dataset:
  `paint` (production). Assertions dataset: `dataform_assertions`.
- External tables are backed by **Google Sheets**. The data is live, but
  `INFORMATION_SCHEMA` reflects the schema from when `CREATE EXTERNAL TABLE` last ran —
  so if a sheet column is renamed, the external table won't see it until the DDL in
  `external_tables.sqlx` is re-run. Warn the user about this if they change a source sheet.

---

## Coding conventions (follow these when writing SQL)

- **Join on `country_code`, never on country name.** Names are inconsistent across sources.
- **snake_case** for all column names. Clear descriptive names over abbreviations.
- **Explicit column lists**, never `SELECT *`, in staging and intermediate tables — this
  prevents silent schema drift. The one intentional exception is `stg_counterfactual`;
  leave it as is.
- **CTEs over nested subqueries.** Keep SQL readable and top-to-bottom.
- **One transformation per file.** Each `.sqlx` has a single clear purpose.
- **Add assertions** to the `config` block of new/changed staging, intermediate, and mart
  tables wherever the grain or valid range is known (`uniqueKey`, `nonNull`,
  `rowConditions` such as `market_share BETWEEN 0 AND 1`). Assertions are what make a
  sandbox run fail loudly on plausible-but-wrong output instead of silently passing.
- **Comment non-obvious business logic.** Keep comments to 1 line if at all possible, an skip comments for self-evident code.
- Validate data at source boundaries, not in every downstream transformation.
- Keep transformations **idempotent** — re-running produces the same result.

---

## The standard workflow (what to walk the user through)

1. `git checkout main && git pull` — start from the latest shared code.
2. `git checkout -b yourname-description` — make a private branch.
3. Edit the file(s). Explain each change in plain English.
4. `dataform compile` — fix any errors.
5. If the change affects numbers: `dataform run --schema-suffix yourname --actions <table>`,
   then help the user check the result in BigQuery (row counts, nulls, market shares in
   0–1, plausible tier for a known country like Nigeria). When verifying a materialised
   change, write a **diff-the-data** query comparing the sandbox mart to the prod mart
   (`paint_yourname.<table>` vs `paint.<table>`) and show what changed — don't just
   eyeball the sandbox alone.
6. `git add -A && git commit -m "short message"` — small, atomic commits.
7. `git push -u origin yourname-description`, then open a PR on GitHub and request review.

See `CONTRIBUTING.md` for the two common recipes (adding a column, adding a new Google
Sheet source) and the full testing ladder.

---

## Two recipes you'll be asked for most

**Add a column to an existing table:** add it to the staging `SELECT`, then trace it
downstream through the explicit column lists in `int_paint_program_base` and
`paint_country_summary` so it survives to the mart. Compile, sandbox-run, check.

**Add a new Google Sheet source (three steps):** (1) external table DDL in
`definitions/sources/external_tables.sqlx`; (2) declare it in `definitions/sources.js`;
(3) a staging file `definitions/staging/stg_<name>.sqlx` with explicit columns. The DDL
file is tagged `disabled: true` so it doesn't run on every pipeline execution — it must
be run manually once.
