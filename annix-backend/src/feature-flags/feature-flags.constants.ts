export const FEATURE_FLAGS = {
  REMOTE_ACCESS: "REMOTE_ACCESS",
  RUBBER_PORTAL: "RUBBER_PORTAL",
  REFERENCE_DATA: "REFERENCE_DATA",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const FEATURE_FLAG_DESCRIPTIONS: Record<FeatureFlagKey, string> = {
  REMOTE_ACCESS: "Remote access request system for customer documents",
  RUBBER_PORTAL: "Rubber lining portal module",
  REFERENCE_DATA: "Reference data management module",
};
