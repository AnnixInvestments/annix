// Material density (kg/m³) for the cross-sectional weight formula
// mass/m = (OD - WT) × WT × π × ρ / 1e6 = (OD - WT) × WT × k where k
// is the per-material constant below. The steel value matches the
// 0.02466 constant used in calculateLocalPipeResult.
export const PIPE_WEIGHT_K_BY_PRODUCT_TYPE = {
  steel: 0.02466,
  hdpe: 0.003016,
  pvc: 0.004398,
  upvc: 0.004398,
} as const;

// Default SDR fallback when the customer hasn't set a global SDR yet
// — SDR11 is the most common HDPE pressure pipe in the field.
export const DEFAULT_HDPE_SDR = 11;
