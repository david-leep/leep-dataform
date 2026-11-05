declare({
  schema: "core",
  name: "country_metadata",
  description: "World Bank country metadata. One row per country, including country_code and income_group. Used to filter for LMICs and join country context across pipelines."
});

declare({
  schema: "core",
  name: "indicators_long",
  description: "World Bank development indicators in long format. One row per country, indicator, and year. Supplies birth rate, total population, and urban population percentage to the impact model."
});

declare({
  schema: "paint",
  name: "counterfactual",
  description: "Country-level program metadata for LEEP's paint programme. One row per country, including engagement status, source of funding, and the counterfactual scenario assumed in the impact model."
});

declare({
  schema: "paint",
  name: "assumptions",
  description: "Global model parameters shared across the paint impact calculation (e.g. DALY weights, paint application rates, income loss coefficients). Single-row lookup table — one value per parameter."
});

declare({
  schema: "paint",
  name: "industry_full_raw",
  description: "Raw manufacturer-level industry data. External table backed by Google Sheet with auto-detected (messy) column names."
});

declare({
  schema: "paint",
  name: "market_share_overrides",
  description: "Manual baseline market share estimates for countries without industry tracker data."
});

declare({
  schema: "eyeliner",
  name: "eyeliner_counterfactual",
  description: "Country-level program metadata for LEEP's eyeliner programme. One row per country, including engagement status, source of funding, market shift years, target market reduction, and program success probability."
});

declare({
  schema: "eyeliner",
  name: "eyeliner_prevalence",
  description: "Country-level traditional eyeliner usage rates (mother, sustained/neonatal/occasional child exposure) and the share of the traditional eyeliner market testing as high-lead. One row per country."
});

declare({
  schema: "eyeliner",
  name: "eyeliner_bll_impact",
  description: "Country-level estimated average BLL impact (ug/dL) from eyeliner exposure, by exposure route: sustained frequent, neonatal intensive, indirect (via mother), and occasional. One row per country."
});

declare({
  schema: "eyeliner",
  name: "eyeliner_assumptions",
  description: "Global model parameters shared across the eyeliner impact calculation (DALY weights, IQ loss per BLL by route, income loss coefficients). Single-row lookup table."
});

declare({
  schema: "eyeliner",
  name: "eyeliner_discount_rates",
  description: "Time discount rates for the eyeliner impact model, by market shift year. Dedicated to the eyeliner programme, not shared with paint's core.discount_rates."
});