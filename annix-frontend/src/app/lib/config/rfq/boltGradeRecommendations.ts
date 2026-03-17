interface BoltGradeRange {
  minTempC: number;
  maxTempC: number;
  carbonSteel: string;
  carbonSteelSA: string;
  stainlessSteel: string;
  stainlessSteelSA: string;
  reason: string;
}

const BOLT_GRADE_RANGES: BoltGradeRange[] = [
  {
    minTempC: -196,
    maxTempC: -101,
    carbonSteel: "L43/7",
    carbonSteelSA: "10.9/10",
    stainlessSteel: "B8/8",
    stainlessSteelSA: "A2-70",
    reason: "Cryogenic service requires impact-tested materials",
  },
  {
    minTempC: -100,
    maxTempC: -46,
    carbonSteel: "B7M/2HM",
    carbonSteelSA: "10.9/10",
    stainlessSteel: "B8/8",
    stainlessSteelSA: "A2-70",
    reason: "Low temperature service with impact testing",
  },
  {
    minTempC: -45,
    maxTempC: 400,
    carbonSteel: "B7/2H",
    carbonSteelSA: "8.8/8",
    stainlessSteel: "B8/8",
    stainlessSteelSA: "A2-70",
    reason: "Standard temperature range",
  },
  {
    minTempC: 401,
    maxTempC: 540,
    carbonSteel: "B16/4",
    carbonSteelSA: "10.9/10",
    stainlessSteel: "B8/8",
    stainlessSteelSA: "A4-80",
    reason: "High temperature service requires elevated temp alloy",
  },
];

const SA_BOLT_GRADES = new Set([
  "4.6/5",
  "8.8/8",
  "10.9/10",
  "12.9/12",
  "8.8/8-HDG",
  "A2-70",
  "A4-70",
  "A4-80",
]);

export interface BoltGradeRecommendation {
  grade: string;
  reason: string;
}

const ASTM_TO_SA_EQUIVALENTS: Record<string, string> = {
  "B7/2H": "8.8/8",
  "B7/2H-HDG": "8.8/8-HDG",
  "B16/4": "10.9/10",
  "B7M/2HM": "10.9/10",
  "L7/7": "10.9/10",
  "L7M/7M": "10.9/10",
  "L43/7": "10.9/10",
  "B8/8": "A2-70",
  "B8M/8M": "A4-70",
  "B8C/8C": "A2-70",
  "B8T/8T": "A2-70",
};

export function isSABoltGrade(grade: string | undefined): boolean {
  if (!grade) return false;
  return SA_BOLT_GRADES.has(grade);
}

export function isSABoltGradeEquivalent(
  selectedGrade: string | undefined,
  recommendedGrade: string | undefined,
): boolean {
  if (!selectedGrade || !recommendedGrade) return false;
  if (selectedGrade === recommendedGrade) return true;
  const saEquiv = ASTM_TO_SA_EQUIVALENTS[recommendedGrade];
  return saEquiv === selectedGrade;
}

export function recommendBoltGrade(
  temperatureCelsius: number,
  isStainless: boolean = false,
): BoltGradeRecommendation {
  const range = BOLT_GRADE_RANGES.find(
    (r) => temperatureCelsius >= r.minTempC && temperatureCelsius <= r.maxTempC,
  );

  if (!range) {
    if (temperatureCelsius < -196) {
      const grade = isStainless ? "B8/8" : "L43/7";
      const saGrade = isStainless ? "A2-70" : "10.9/10";
      return {
        grade,
        reason: `Temperature below -196C - consult materials engineer (SA equiv: ${saGrade})`,
      };
    }
    const grade = isStainless ? "B8/8" : "B16/4";
    const saGrade = isStainless ? "A4-80" : "10.9/10";
    return {
      grade,
      reason: `Temperature above 540C - consult materials engineer (SA equiv: ${saGrade})`,
    };
  }

  const grade = isStainless ? range.stainlessSteel : range.carbonSteel;
  const saGrade = isStainless ? range.stainlessSteelSA : range.carbonSteelSA;

  return {
    grade,
    reason: `${range.reason} (SA equiv: ${saGrade})`,
  };
}

export function isStainlessSteelSpec(steelSpecName: string | undefined): boolean {
  if (!steelSpecName) return false;
  const lowerName = steelSpecName.toLowerCase();
  return (
    lowerName.includes("stainless") ||
    lowerName.includes("a312") ||
    lowerName.includes("304") ||
    lowerName.includes("316") ||
    lowerName.includes("321") ||
    lowerName.includes("347")
  );
}
