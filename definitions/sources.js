declare({
  schema: "core",
  name: "country_metadata"
});

declare({
  schema: "core",
  name: "indicators_long"
});

declare({
  schema: "paint",
  name: "counterfactual"
});

declare({
  schema: "paint",
  name: "assumptions"
});

declare({
  schema: "paint",
  name: "country_paint_baseline",
  description: "Baseline (pre-LEEP) lead paint market share per country. External table backed by Google Sheet. Used to calculate potential and to-date market share reductions."
});

declare({
  schema: "paint",
  name: "industry_full_raw",
  description: "Raw manufacturer-level industry data. External table backed by Google Sheet with auto-detected (messy) column names."
});