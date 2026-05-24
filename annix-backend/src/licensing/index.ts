export { ModuleLicense } from "./entities/module-license.entity";
export {
  FEATURE_LICENSE_METADATA,
  type FeatureLicenseRequirement,
  RequireFeature,
} from "./feature.decorator";
export { FeatureLicenseGuard } from "./feature-license.guard";
export { FeatureRegistry } from "./feature-registry.service";
export { LicensingModule } from "./licensing.module";
export { LicensingService } from "./licensing.service";
export type {
  FeatureDefinition,
  LicenseSnapshot,
  ModuleLicensingDefinition,
  TierDefinition,
  TierVisibility,
} from "./licensing.types";
