export type {
  CorrosivityCategory,
  CuringTime,
  GenericType,
  OvercoatInterval,
  PaintProduct,
  PaintSupplier,
  ProductRole,
} from "./paintProducts";

export {
  compatiblePrimers,
  compatibleTopcoats,
  paintProducts,
  primersForEnvironment,
  productsByGenericType,
  productsByRole,
  productsBySupplier,
  productsForCorrosivity,
  productsForTemperature,
  surfaceTolerantProducts,
  topcoatsForEnvironment,
} from "./paintProducts";

export type {
  CoatingSystemRequirements,
  RecommendedCoatingSystem,
} from "./paintSystemRecommendations";

export {
  highTempSystemRecommendation,
  recommendCoatingSystem,
  recommendPrimersForCategory,
  recommendTopcoatsForPrimer,
  systemDftSummary,
} from "./paintSystemRecommendations";
