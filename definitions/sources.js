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
  name: "industry_full_raw",
  description: "Raw manufacturer-level industry data. External table backed by Google Sheet with auto-detected (messy) column names."
});

declare({
  schema: "paint",
  name: "market_share_overrides",
  description: "Manual baseline market share estimates for countries without industry tracker data."
});