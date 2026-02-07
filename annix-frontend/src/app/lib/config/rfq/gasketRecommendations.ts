export interface GasketRecommendation {
  gasketCode: string;
  gasketName: string;
  reason: string;
}

interface GasketRule {
  minTempC: number;
  maxTempC: number;
  minPressureClass: number;
  maxPressureClass: number;
  isStainless?: boolean;
  gasketCode: string;
  gasketName: string;
  reason: string;
  priority: number;
}

const GASKET_RULES: GasketRule[] = [
  {
    minTempC: -50,
    maxTempC: 260,
    minPressureClass: 600,
    maxPressureClass: 2500,
    gasketCode: "SW-CGI-316-IR",
    gasketName: "Spiral Wound - CGI/316SS with Inner Ring - 3.2mm",
    reason: "High pressure service requires inner ring for blowout protection",
    priority: 10,
  },
  {
    minTempC: 261,
    maxTempC: 450,
    minPressureClass: 150,
    maxPressureClass: 2500,
    gasketCode: "SW-Graphite-316",
    gasketName: "Spiral Wound - Graphite/316SS - 4.5mm (High Temp)",
    reason: "High temperature service requires graphite filler for thermal stability",
    priority: 15,
  },
  {
    minTempC: 261,
    maxTempC: 450,
    minPressureClass: 150,
    maxPressureClass: 2500,
    isStainless: true,
    gasketCode: "Graphite-3.0",
    gasketName: "Flexible Graphite - 3.0mm (High Temp to 450°C)",
    reason: "High temperature with stainless steel - graphite provides excellent sealing",
    priority: 14,
  },
  {
    minTempC: -50,
    maxTempC: 260,
    minPressureClass: 150,
    maxPressureClass: 600,
    isStainless: true,
    gasketCode: "SW-PTFE-316",
    gasketName: "Spiral Wound - PTFE/316SS - 3.2mm (Chemical Service)",
    reason: "Stainless steel system - PTFE filler for chemical compatibility",
    priority: 12,
  },
  {
    minTempC: -50,
    maxTempC: 260,
    minPressureClass: 150,
    maxPressureClass: 600,
    gasketCode: "SW-CGI-316",
    gasketName: "Spiral Wound - CGI/316SS - 3.2mm (Standard)",
    reason: "Standard service - spiral wound provides reliable sealing across temperature cycles",
    priority: 5,
  },
  {
    minTempC: -20,
    maxTempC: 150,
    minPressureClass: 150,
    maxPressureClass: 300,
    gasketCode: "CAF-3.0",
    gasketName: "Compressed Asbestos Free (CAF) - 3.0mm",
    reason: "Low to medium pressure, moderate temperature - cost-effective fiber gasket",
    priority: 3,
  },
  {
    minTempC: -20,
    maxTempC: 120,
    minPressureClass: 150,
    maxPressureClass: 150,
    gasketCode: "EPDM-3.0",
    gasketName: "EPDM Rubber - 3.0mm (Water/Steam)",
    reason: "Low pressure water/steam service - excellent elastomer sealing",
    priority: 2,
  },
];

function extractPressureClassNumber(designation: string | undefined): number {
  if (!designation) return 150;
  const match = designation.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 150;
}

export function recommendGasket(
  temperatureCelsius: number | undefined,
  pressureClassDesignation: string | undefined,
  isStainless: boolean = false,
): GasketRecommendation {
  if (temperatureCelsius === undefined) {
    return {
      gasketCode: "SW-CGI-316",
      gasketName: "Spiral Wound - CGI/316SS - 3.2mm (Standard)",
      reason: "Default recommendation - spiral wound suitable for most applications",
    };
  }

  const pressureClass = extractPressureClassNumber(pressureClassDesignation);

  const matchingRules = GASKET_RULES.filter((rule) => {
    const tempMatch = temperatureCelsius >= rule.minTempC && temperatureCelsius <= rule.maxTempC;
    const pressureMatch =
      pressureClass >= rule.minPressureClass && pressureClass <= rule.maxPressureClass;
    const stainlessMatch = rule.isStainless === undefined || rule.isStainless === isStainless;
    return tempMatch && pressureMatch && stainlessMatch;
  });

  if (matchingRules.length === 0) {
    if (temperatureCelsius > 450) {
      return {
        gasketCode: "RTJ-R-Inconel",
        gasketName: "RTJ Ring - Inconel 625 (High Temp/Corrosive)",
        reason: "Extreme temperature - metal ring joint recommended, consult engineer",
      };
    }
    if (temperatureCelsius < -50) {
      return {
        gasketCode: "SW-PTFE-316",
        gasketName: "Spiral Wound - PTFE/316SS - 3.2mm (Chemical Service)",
        reason: "Cryogenic service - PTFE maintains flexibility at low temperatures",
      };
    }
    return {
      gasketCode: "SW-CGI-316",
      gasketName: "Spiral Wound - CGI/316SS - 3.2mm (Standard)",
      reason: "Default recommendation for unmatched conditions",
    };
  }

  const bestRule = matchingRules.reduce((best, current) =>
    current.priority > best.priority ? current : best,
  );

  return {
    gasketCode: bestRule.gasketCode,
    gasketName: bestRule.gasketName,
    reason: bestRule.reason,
  };
}
