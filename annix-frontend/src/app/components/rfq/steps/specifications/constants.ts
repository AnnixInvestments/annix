import type { FeatureType } from "./types";

export const FEATURE_DESCRIPTIONS: Record<
  FeatureType,
  { title: string; description: string; benefits: string[] }
> = {
  "coating-assistant": {
    title: "External Coating Assistant",
    description:
      "An intelligent coating recommendation system based on ISO 12944 and ISO 21809 standards.",
    benefits: [
      "Analyzes atmospheric conditions including marine influence, industrial pollution, and UV exposure",
      "Profiles installation environments (above ground, buried, submerged, splash zone)",
      "Recommends optimal coating systems based on corrosivity category",
      "Provides durability classifications and system specifications",
    ],
  },
  "lining-assistant": {
    title: "Internal Lining Assistant",
    description:
      "A comprehensive lining recommendation system for material transfer applications based on ASTM and ISO standards.",
    benefits: [
      "Analyzes material properties including particle size, hardness, and silica content",
      "Evaluates chemical environment (pH levels, chloride exposure, operating temperatures)",
      "Considers flow characteristics (velocity, solids percentage, impact angles)",
      "Recommends appropriate lining systems (rubber, ceramic, polyurethane, HDPE) with thickness specifications",
    ],
  },
};
