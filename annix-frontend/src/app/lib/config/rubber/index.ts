export type {
  RubberSupplier,
  PolymerBase,
  SANS1198Type,
  SANS1198Grade,
  HardnessClass,
  AbrasionResistance,
  SANS1198Classification,
  RubberProduct,
} from "./rubberProducts";

export {
  rubberProducts,
  rubberProductsBySupplier,
  rubberProductsByPolymer,
  rubberProductsForTemperature,
  rubberProductsForAbrasion,
  rubberProductsBySANS1198Type,
  rubberProductsBySANS1198Grade,
  rubberProductsByHardness,
  bestAbrasionResistantProducts,
  highTensileProducts,
} from "./rubberProducts";

export type {
  RubberLiningRequirements,
  RecommendedRubberLining,
  SANS1198Requirements,
  SANS1198ComplianceResult,
  EquipmentGeometry,
  CureMethodRecommendation,
  SubstrateCondition,
  AdhesiveRecommendation,
  WearConditions,
  WearLifeEstimate,
  DamageMechanismProfile,
  ThicknessOptimization,
} from "./rubberLiningRecommendations";

export {
  recommendRubberLining,
  recommendForWetSlurry,
  recommendForDryAbrasion,
  recommendForCyclones,
  recommendForPipesAndChutes,
  allRubberProducts,
  rubberProductById,
  rubberProductByCompoundCode,
  checkSANS1198Compliance,
  checkSANS1201Compliance,
  recommendCureMethod,
  selectAdhesiveSystem,
  estimateWearLife,
  optimizeThickness,
} from "./rubberLiningRecommendations";
