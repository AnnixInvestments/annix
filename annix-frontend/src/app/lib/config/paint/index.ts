export type {
  PaintSupplier,
  GenericType,
  ProductRole,
  CorrosivityCategory,
  OvercoatInterval,
  CuringTime,
  PaintProduct,
} from "./paintProducts";

export {
  paintProducts,
  productsBySupplier,
  productsByRole,
  productsByGenericType,
  productsForCorrosivity,
  primersForEnvironment,
  topcoatsForEnvironment,
  surfaceTolerantProducts,
  productsForTemperature,
  compatibleTopcoats,
  compatiblePrimers,
} from "./paintProducts";

export type {
  CoatingSystemRequirements,
  RecommendedCoatingSystem,
} from "./paintSystemRecommendations";

export {
  recommendCoatingSystem,
  recommendPrimersForCategory,
  recommendTopcoatsForPrimer,
  systemDftSummary,
  highTempSystemRecommendation,
} from "./paintSystemRecommendations";
