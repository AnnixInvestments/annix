const fs = require('fs');

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Gasket weight lookup table (weights in kg)
// Based on EN 1514-1 dimensions for PN16 flanges
// Spiral wound: from industry data
// Flat gaskets: calculated from dimensions × density
const gasketWeightTable = `
// Gasket weight lookup table (weights in kg)
// NB size in mm -> weight in kg for each gasket type category
const GASKET_WEIGHTS: Record<number, { spiralWound: number; rtj: number; ptfe: number; graphite: number; caf: number; rubber: number }> = {
  15: { spiralWound: 0.025, rtj: 0.045, ptfe: 0.003, graphite: 0.002, caf: 0.004, rubber: 0.003 },
  20: { spiralWound: 0.030, rtj: 0.055, ptfe: 0.004, graphite: 0.003, caf: 0.005, rubber: 0.004 },
  25: { spiralWound: 0.035, rtj: 0.065, ptfe: 0.005, graphite: 0.004, caf: 0.007, rubber: 0.005 },
  32: { spiralWound: 0.045, rtj: 0.080, ptfe: 0.007, graphite: 0.005, caf: 0.009, rubber: 0.006 },
  40: { spiralWound: 0.055, rtj: 0.095, ptfe: 0.009, graphite: 0.007, caf: 0.012, rubber: 0.008 },
  50: { spiralWound: 0.070, rtj: 0.120, ptfe: 0.013, graphite: 0.010, caf: 0.017, rubber: 0.011 },
  65: { spiralWound: 0.090, rtj: 0.150, ptfe: 0.018, graphite: 0.014, caf: 0.023, rubber: 0.015 },
  80: { spiralWound: 0.110, rtj: 0.180, ptfe: 0.024, graphite: 0.018, caf: 0.031, rubber: 0.020 },
  100: { spiralWound: 0.150, rtj: 0.250, ptfe: 0.035, graphite: 0.027, caf: 0.045, rubber: 0.030 },
  125: { spiralWound: 0.200, rtj: 0.320, ptfe: 0.050, graphite: 0.038, caf: 0.064, rubber: 0.042 },
  150: { spiralWound: 0.260, rtj: 0.400, ptfe: 0.068, graphite: 0.052, caf: 0.087, rubber: 0.057 },
  200: { spiralWound: 0.400, rtj: 0.600, ptfe: 0.110, graphite: 0.085, caf: 0.140, rubber: 0.092 },
  250: { spiralWound: 0.550, rtj: 0.850, ptfe: 0.165, graphite: 0.127, caf: 0.210, rubber: 0.138 },
  300: { spiralWound: 0.720, rtj: 1.100, ptfe: 0.220, graphite: 0.170, caf: 0.285, rubber: 0.187 },
  350: { spiralWound: 0.900, rtj: 1.400, ptfe: 0.290, graphite: 0.225, caf: 0.375, rubber: 0.245 },
  400: { spiralWound: 1.100, rtj: 1.700, ptfe: 0.370, graphite: 0.285, caf: 0.475, rubber: 0.310 },
  450: { spiralWound: 1.350, rtj: 2.000, ptfe: 0.460, graphite: 0.355, caf: 0.590, rubber: 0.385 },
  500: { spiralWound: 1.600, rtj: 2.400, ptfe: 0.560, graphite: 0.430, caf: 0.720, rubber: 0.470 },
  600: { spiralWound: 2.200, rtj: 3.300, ptfe: 0.780, graphite: 0.600, caf: 1.000, rubber: 0.655 },
  700: { spiralWound: 2.900, rtj: 4.300, ptfe: 1.050, graphite: 0.810, caf: 1.350, rubber: 0.880 },
  800: { spiralWound: 3.700, rtj: 5.500, ptfe: 1.350, graphite: 1.040, caf: 1.730, rubber: 1.130 },
  900: { spiralWound: 4.600, rtj: 6.900, ptfe: 1.700, graphite: 1.310, caf: 2.180, rubber: 1.420 },
  1000: { spiralWound: 5.600, rtj: 8.400, ptfe: 2.100, graphite: 1.620, caf: 2.700, rubber: 1.760 },
  1200: { spiralWound: 7.900, rtj: 11.800, ptfe: 3.000, graphite: 2.310, caf: 3.850, rubber: 2.510 }
};

// Get gasket weight based on type and size
function getGasketWeight(gasketType: string, nbMm: number): number {
  // Find closest NB size
  const sizes = Object.keys(GASKET_WEIGHTS).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nbMm) closestSize = size;
    else break;
  }

  const weights = GASKET_WEIGHTS[closestSize];
  if (!weights) return 0;

  // Determine weight category based on gasket type
  if (gasketType.startsWith('SW-') || gasketType.includes('Spiral')) {
    return weights.spiralWound;
  } else if (gasketType.startsWith('RTJ-')) {
    return weights.rtj;
  } else if (gasketType.startsWith('PTFE-') || gasketType.includes('PTFE')) {
    return weights.ptfe;
  } else if (gasketType.startsWith('Graphite-') || gasketType.includes('Graphite')) {
    return weights.graphite;
  } else if (gasketType.startsWith('CAF-')) {
    return weights.caf;
  } else if (gasketType.startsWith('Rubber-') || gasketType.includes('EPDM') || gasketType.includes('NBR')) {
    return weights.rubber;
  }

  // Default to spiral wound as middle estimate
  return weights.spiralWound;
}
`;

// 1. Add the gasket weight lookup table after the BNW lookup tables
const insertAfterPattern = /const BOLT_HOLES_PER_FLANGE:.*?\};/s;
const match = content.match(insertAfterPattern);

if (match) {
  // Find the end of both lookup tables (after BOLT_HOLES and BNW_WEIGHT)
  const bnwWeightPattern = /const BNW_WEIGHT_PER_HOLE:.*?\};/s;
  const bnwMatch = content.match(bnwWeightPattern);

  if (bnwMatch && !content.includes('GASKET_WEIGHTS')) {
    const insertPoint = bnwMatch.index + bnwMatch[0].length;
    content = content.substring(0, insertPoint) + '\n' + gasketWeightTable + content.substring(insertPoint);
    console.log('✅ Added GASKET_WEIGHTS lookup table');
  } else if (content.includes('GASKET_WEIGHTS')) {
    console.log('⚠️ GASKET_WEIGHTS already exists');
  } else {
    console.log('❌ Could not find BNW_WEIGHT_PER_HOLE table');
  }
} else {
  console.log('❌ Could not find BOLT_HOLES_PER_FLANGE table');
}

// 2. Update the gasket line item to show weight
const oldGasketLine = `{showBnw && totalFlanges > 0 && globalSpecs?.gasketType && (
                        <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                          <td className="py-2 px-2 font-medium text-green-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                          <td className="py-2 px-2 text-green-700 text-xs">
                            {globalSpecs.gasketType} Gasket (1 per pipe)
                          </td>
                          <td className="py-2 px-2 text-center font-medium text-green-800">{qty}</td>
                          <td className="py-2 px-2 text-right text-green-700">-</td>
                          <td className="py-2 px-2 text-right font-semibold text-green-800">-</td>
                        </tr>
                      )}`;

const newGasketLine = `{showBnw && totalFlanges > 0 && globalSpecs?.gasketType && (() => {
                        const gasketWeight = getGasketWeight(globalSpecs.gasketType, entry.specs?.nominalBoreMm || 100);
                        const gasketTotalWeight = gasketWeight * qty;
                        return (
                          <tr className="border-b border-green-100 bg-green-50/50 hover:bg-green-100/50">
                            <td className="py-2 px-2 font-medium text-green-800">GAS-{itemNumber.replace(/#?AIS-?/g, '')}</td>
                            <td className="py-2 px-2 text-green-700 text-xs">
                              {globalSpecs.gasketType} Gasket (1 per pipe)
                            </td>
                            <td className="py-2 px-2 text-center font-medium text-green-800">{qty}</td>
                            <td className="py-2 px-2 text-right text-green-700">{gasketWeight.toFixed(2)} kg</td>
                            <td className="py-2 px-2 text-right font-semibold text-green-800">{gasketTotalWeight.toFixed(2)} kg</td>
                          </tr>
                        );
                      })()}`;

if (content.includes(oldGasketLine)) {
  content = content.replace(oldGasketLine, newGasketLine);
  console.log('✅ Updated gasket line item with weight');
} else {
  console.log('❌ Could not find gasket line item to update');
}

// 3. Update getTotalWeight to include gasket weights
const oldGetTotalWeight = `const getTotalWeight = () => {
    // Check if BNW should be included
    const showBnw = requiredProducts.includes('fasteners_gaskets');

    return entries.reduce((total: number, entry: StraightPipeEntry) => {
      const entryTotal = (entry.calculation?.totalSystemWeight || 0);

      // Add BNW weight if applicable
      let bnwWeight = 0;
      if (showBnw) {
        const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
        const flangesPerPipe = getFlangesPerPipe(pipeEndConfig);
        const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;

        if (flangesPerPipe > 0 && qty > 0) {
          const pressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
          const pressureClass = pressureClassId
            ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
            : 'PN16';
          const nbMm = entry.specs?.nominalBoreMm || 100;
          const bnwInfo = getBnwSetInfo(nbMm, pressureClass || 'PN16');
          const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
          bnwWeight = bnwWeightPerSet * qty;
        }
      }

      return total + entryTotal + bnwWeight;
    }, 0);
  };`;

const newGetTotalWeight = `const getTotalWeight = () => {
    // Check if BNW should be included
    const showBnw = requiredProducts.includes('fasteners_gaskets');

    return entries.reduce((total: number, entry: StraightPipeEntry) => {
      const entryTotal = (entry.calculation?.totalSystemWeight || 0);

      // Add BNW and gasket weights if applicable
      let bnwWeight = 0;
      let gasketWeight = 0;
      if (showBnw) {
        const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
        const flangesPerPipe = getFlangesPerPipe(pipeEndConfig);
        const qty = entry.calculation?.calculatedPipeCount || entry.specs?.quantityValue || 0;

        if (flangesPerPipe > 0 && qty > 0) {
          const pressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
          const pressureClass = pressureClassId
            ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
            : 'PN16';
          const nbMm = entry.specs?.nominalBoreMm || 100;
          const bnwInfo = getBnwSetInfo(nbMm, pressureClass || 'PN16');
          const bnwWeightPerSet = bnwInfo.weightPerHole * bnwInfo.holesPerFlange;
          bnwWeight = bnwWeightPerSet * qty;

          // Add gasket weight
          if (globalSpecs?.gasketType) {
            const singleGasketWeight = getGasketWeight(globalSpecs.gasketType, nbMm);
            gasketWeight = singleGasketWeight * qty;
          }
        }
      }

      return total + entryTotal + bnwWeight + gasketWeight;
    }, 0);
  };`;

if (content.includes(oldGetTotalWeight)) {
  content = content.replace(oldGetTotalWeight, newGetTotalWeight);
  console.log('✅ Updated getTotalWeight to include gasket weights');
} else {
  console.log('❌ Could not find getTotalWeight function');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
