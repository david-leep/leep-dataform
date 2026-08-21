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
  schema: "spices",
  name: "spices_assumptions",
  description: "Turmeric adulteration assumptions for LEEP's spices programme. One row per programme geography (currently Indian states), giving the share of each turmeric channel estimated to be adulterated with lead chromate. External table backed by a Google Sheet."
});
