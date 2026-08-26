# TODO: next work on the data system

Planned work on `leep-dataform`, grouped by lead exposure source. Tasks and quarters come from the data system roadmap slide; the descriptions below are our reading of what each task involves in this repo. Owners come from the same slide.

Paint is the only source currently modelled end to end, so it is the template: eyeliners and spices mean reproducing the paint chain (external table DDL, source declaration, `stg_*`, `int_*`, mart) against their own sheets and assumptions.

## Paint (Q3)

| Task | What the work involves | Who | Quarter |
|---|---|---|---|
| Update with assumptions from Evidence Tracker | Point `paint.assumptions` at the Evidence Tracker sheet as the single source of truth, reconcile parameter names against the columns selected in `definitions/staging/stg_assumptions.sqlx`, re-run the external table DDL if columns are renamed, and update the `nonNull` and `rowConditions` assertions for any added or removed parameters. Sandbox-run and diff `paint_summary_by_country` against production to show which countries move and why. | Emily | Q3 |
| Change counterfactuals sheet | Restructure the counterfactual sheet and its external table, then move `definitions/staging/stg_counterfactual.sqlx` off `SELECT *` to an explicit column list. Program metadata now comes from `core.stg_program_status`, so decide which fields stay on the counterfactual and which are dropped, and check the downstream reads in `int_paint_program_base`. | Jonathan | Q3 |
| Update market share overrides | Refresh the manual baseline market share estimates in the overrides sheet for countries with no industry tracker coverage, confirm every `country_code` still resolves, and verify the override-versus-tracker precedence in `int_lead_paint_market_share` is doing what we expect. | Jonathan | Q3 |

## Eyeliners (Q4)

| Task | What the work involves | Who | Quarter |
|---|---|---|---|
| Update with assumptions from evidence tracker | Agree the eyeliner parameter set (BLL impact per unit exposure, use prevalence, DALY and IQ coefficients, program success probability), create an eyeliner assumptions sheet from the Evidence Tracker, add the external table plus source declaration, and build `stg_eyeliner_assumptions` with assertions on ranges and non-nulls. | Emily and Shreya | Q4 |
| Reproduce components of IPP sheet for eyeliners | Rebuild the Impact per Program calculation in Dataform, mirroring the paint chain: external table DDL in `definitions/sources/external_tables.sqlx`, declarations in `definitions/sources.js`, staging tables for assumptions, program status, and any market or usage data, an `int_eyeliner_program_base` giving children with averted exposure, and a `mart` equivalent to `paint_summary_by_country` with health and income DALYs, time discounting, probability weighting, and tiering. Reuse `int_country_profile` for births and urban rate rather than duplicating it. | Shreya | Q4 |

## Spices (Q4)

| Task | What the work involves | Who | Quarter |
|---|---|---|---|
| Update with assumptions from evidence tracker | Same pattern as eyeliners, with spice-specific parameters (contaminated spice share, consumption per capita, BLL impact). The spices assumptions staging table, declaration, and external table DDL were removed on this branch, so this rebuilds them against the agreed sheet rather than the earlier draft. | Emily and David/Akanksha | Q4 |
| Reproduce components of IPP sheet for spices | Build the spice IPP chain end to end: external tables and declarations, staging for assumptions and program status, an `int_spice_program_base`, and a country-level DALY mart matching the paint mart's structure and assertions. Decide whether exposure is modelled per household or per child, since that choice drives the base table's grain. | Emily and David/Akanksha | Q4 |

## Cross-cutting

- Keep a single shared `core` layer (country metadata, indicators, program status) so the three sources join on `country_code` and stay comparable.
- Every sheet-backed staging table needs `dependencies: ["external_tables"]`, and each new sheet must be shared with both the `dataform-sandbox` and `dataform-executor` service accounts.
- Decide whether the three marts stay separate or are unioned into one cross-source impact table for Looker Studio before building the second one.

## Open questions

- Which Evidence Tracker sheet or tab is authoritative for each source, and who owns updating it.
- Whether eyeliner and spice programs use the same tier definitions and discount rates as paint.
- Whether the counterfactual restructure lands before or after the eyeliner build, since the eyeliner chain should copy the final shape, not the current one.
