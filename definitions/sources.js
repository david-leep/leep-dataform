declare({
  schema: "example",
  name: "counterfactual"
});

declare({
  schema: "example",
  name: "country_metadata"
});

declare({
  schema: "example",
  name: "indicators_long"
});

declare({
  schema: "example",
  name: "paint"
});

declare({
  schema: "example",
  name: "country_paint_baseline",
  description: "Baseline (pre-LEEP) lead paint market share per country. External table backed by Google Sheet. Used to calculate potential and to-date market share reductions."
});

declare({
  schema: "example",
  name: "industry_full_raw",
  description: "Raw manufacturer-level industry data. External table backed by Google Sheet with auto-detected (messy) column names."
});