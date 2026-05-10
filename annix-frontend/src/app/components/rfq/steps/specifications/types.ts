export interface RestrictionPopupPosition {
  x: number;
  y: number;
}

export type FeatureType = "coating-assistant" | "lining-assistant";

export interface FeatureRestrictionPopupProps {
  feature: FeatureType;
  position: RestrictionPopupPosition;
  onClose: () => void;
}
