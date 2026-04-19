const UNREGISTERED_ALLOWED_STEEL_SPECS = [
  { match: "sabs 62", requires: ["medium", "heavy"] },
  { match: "sabs 719", requires: null },
  { match: "astm a106", requires: ["gr.b", "grade b", "gr b"] },
];

export const isSteelSpecAllowedForUnregistered = (specName: string): boolean => {
  const name = specName.toLowerCase();
  return UNREGISTERED_ALLOWED_STEEL_SPECS.some((spec) => {
    if (!name.includes(spec.match)) return false;
    if (spec.requires === null) return true;
    return spec.requires.some((req) => name.includes(req));
  });
};

export const UNREGISTERED_ALLOWED_FLANGE_STANDARDS = [
  "BS 4504",
  "SABS 1123",
  "BS 10",
  "ASME B16.5",
];

export const isFlangeStandardAllowedForUnregistered = (standardCode: string): boolean => {
  return UNREGISTERED_ALLOWED_FLANGE_STANDARDS.some(
    (allowed) =>
      standardCode.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(standardCode.toLowerCase()),
  );
};
