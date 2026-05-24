import { SetMetadata } from "@nestjs/common";

export const FEATURE_LICENSE_METADATA = "featureLicense";

export interface FeatureLicenseRequirement {
  moduleKey: string;
  featureKey: string;
}

export const RequireFeature = (moduleKey: string, featureKey: string) =>
  SetMetadata(FEATURE_LICENSE_METADATA, { moduleKey, featureKey });
