# TODO: next work on the data system

Planned work on `leep-dataform`, grouped by lead exposure source.

Paint is the only source currently modelled end to end, so it is the template: eyeliners and spices mean reproducing the paint chain (external table DDL, source declaration, `stg_*`, `int_*`, mart) against their own sheets and assumptions.

## Paint (Q3)

| Task | What the work involves | Who | Quarter |
|---|---|---|---|
| Update with assumptions from Evidence Tracker | Point `paint.assumptions` at the Evidence Tracker sheet as the single source of truth, reconcile parameter names against the columns selected in `definitions/staging/stg_assumptions.sqlx`, re-run the external table DDL if columns are renamed, and update the `nonNull` and `rowConditions` assertions for any added or removed parameters. | Emily | Q3 |
| Change counterfactuals sheet | Point the counterfactual sheet at the most up to date counterfactuals sheet, then move `definitions/staging/stg_counterfactual.sqlx` off `SELECT *` to an explicit column list. Program metadata now comes from `core.stg_program_status`, so decide which fields stay on the counterfactual and which are dropped, and check the downstream reads in `int_paint_program_base`. | Jonathan | Q3 |
| Update market share overrides | Refresh the manual baseline market share estimates in the overrides sheet for countries with no industry tracker coverage, confirm every `country_code` still resolves, and verify the override-versus-tracker precedence in `int_lead_paint_market_share` is doing what we expect. | Jonathan | Q3 |

## Eyeliners (Q4)

| Task | What the work involves | Who | Quarter |
|---|---|---|---|
| Update with assumptions from evidence tracker | Agree the eyeliner parameter set (BLL impact per unit exposure, use prevalence, DALY and IQ coefficients, program success probability), create an eyeliner assumptions sheet from the Evidence Tracker, add the external table plus source declaration, and build `stg_eyeliner_assumptions` with assertions on ranges and non-nulls. | Emily and Shreya | Q4 |
| Reproduce components of IPP sheet for eyeliners | Rebuild the Impact per Program calculation in Dataform, mirroring the paint chain: external table DDL in `definitions/sources/external_tables.sqlx`, declarations in `definitions/sources.js`, staging tables for assumptions, program status, and any market or usage data, an `int_eyeliner_program_base` giving children with averted exposure, and a `mart` equivalent to `paint_summary_by_country` with health and income DALYs, time discounting, probability weighting, and tiering. Reuse `int_country_profile` for births and urban rate rather than duplicating it. | Shreya | Q4 |
| Build eyeliner dashboards | Connect the eyeliner mart to Looker Studio and build the country impact views, following the existing paint dashboards. Agree the headline metrics first (potential and to-date DALYs, tier, country coverage) and check whether eyeliners belong on the existing cross-programme dashboard or a separate one. | TBD | Q4 |

## Spices (Q4)

| Task | What the work involves | Who | Quarter |
|---|---|---|---|
| Update with assumptions from evidence tracker | Same pattern as eyeliners, with spice-specific parameters (contaminated spice share, consumption per capita, BLL impact). Discuss exactly which assumptions should be | Emily and David/Akanksha | Q4 |
| Reproduce components of IPP sheet for spices | Build the spice IPP chain end to end: external tables and declarations, staging for assumptions and program status, an `int_spice_program_base`, and a country-level DALY mart matching the paint mart's structure and assertions. Decide whether exposure is modelled per household or per child, since that choice drives the base table's grain. | Emily and David/Akanksha | Q4 |
| Build spice dashboards | Connect the spice mart to Looker Studio and build the country impact views, matching the eyeliner and paint dashboards so the three sources read the same way. | TBD | Q4 |

## Cross-cutting (Q3 and Q4)

- More accurate discount rates for market shift years beyond 2029
- Cross-source comparison dashboards (expected DALY impact per source, number of programs, number of programs by program status, etc.)

## Open questions

- Which Evidence Tracker sheet or tab is authoritative for each source, and who owns updating it.
- Whether eyeliner and spice programs use the same tier definitions and discount rates as paint.
- Whether the counterfactual restructure lands before or after the eyeliner build, since the eyeliner chain should copy the final shape, not the current one.
