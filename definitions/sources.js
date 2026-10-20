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
  description: "Market shift assumptions for LEEP's paint program. One row per country, giving the market shift year with and without LEEP and the gap between them, updated quarterly from PM M&E docs. External table backed by a Google Sheet."
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
  schema: "core",
  name: "program_status",
  description: "Program status and counterfactual assumptions per LEEP program geography. One row per country and program, giving engagement status, source of funding, and the lead paint reduction percentage assumed on program success. External table backed by a Google Sheet."
});
