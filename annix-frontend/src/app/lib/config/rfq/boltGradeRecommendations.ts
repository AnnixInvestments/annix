interface BoltGradeRange {
  minTempC: number;
  maxTempC: number;
  carbonSteel: string;
  stainlessSteel: string;
  reason: string;
}

const BOLT_GRADE_RANGES: BoltGradeRange[] = [
  {
    minTempC: -196,
    maxTempC: -101,
    carbonSteel: 'L43/7',
    stainlessSteel: 'B8/8',
    reason: 'Cryogenic service requires impact-tested materials',
  },
  {
    minTempC: -100,
    maxTempC: -46,
    carbonSteel: 'B7M/2HM',
    stainlessSteel: 'B8/8',
    reason: 'Low temperature service with impact testing',
  },
  {
    minTempC: -45,
    maxTempC: 400,
    carbonSteel: 'B7/2H',
    stainlessSteel: 'B8/8',
    reason: 'Standard temperature range',
  },
  {
    minTempC: 401,
    maxTempC: 540,
    carbonSteel: 'B16/4',
    stainlessSteel: 'B8/8',
    reason: 'High temperature service requires elevated temp alloy',
  },
];

export interface BoltGradeRecommendation {
  grade: string;
  reason: string;
}

export function recommendBoltGrade(
  temperatureCelsius: number,
  isStainless: boolean = false
): BoltGradeRecommendation {
  const range = BOLT_GRADE_RANGES.find(
    (r) => temperatureCelsius >= r.minTempC && temperatureCelsius <= r.maxTempC
  );

  if (!range) {
    if (temperatureCelsius < -196) {
      return {
        grade: isStainless ? 'B8/8' : 'L43/7',
        reason: 'Temperature below -196C - consult materials engineer',
      };
    }
    return {
      grade: isStainless ? 'B8/8' : 'B16/4',
      reason: 'Temperature above 540C - consult materials engineer',
    };
  }

  return {
    grade: isStainless ? range.stainlessSteel : range.carbonSteel,
    reason: range.reason,
  };
}

export function isStainlessSteelSpec(steelSpecName: string | undefined): boolean {
  if (!steelSpecName) return false;
  const lowerName = steelSpecName.toLowerCase();
  return (
    lowerName.includes('stainless') ||
    lowerName.includes('a312') ||
    lowerName.includes('304') ||
    lowerName.includes('316') ||
    lowerName.includes('321') ||
    lowerName.includes('347')
  );
}
