import * as fs from 'fs';

const filePath = 'src/app/components/rfq/StraightPipeRfqOrchestrator.tsx';
let content: string = fs.readFileSync(filePath, 'utf8');

// 1. Update getTotalWeight to include BNW weights
const oldGetTotalWeight = `const getTotalWeight = () => {
    return entries.reduce((total: number, entry: StraightPipeEntry) => {
      const entryTotal = (entry.calculation?.totalSystemWeight || 0);
      return total + entryTotal;
    }, 0);
  };`;

const newGetTotalWeight = `const getTotalWeight = () => {
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

if (content.includes(oldGetTotalWeight)) {
  content = content.replace(oldGetTotalWeight, newGetTotalWeight);
  console.log('✅ Updated getTotalWeight to include BNW weights');
} else {
  console.log('❌ Could not find getTotalWeight function');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');