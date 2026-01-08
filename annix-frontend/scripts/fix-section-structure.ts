import * as fs from 'fs';

const filePath = 'src/app/components/rfq/StraightPipeRfqOrchestrator.tsx';
let content: string = fs.readFileSync(filePath, 'utf8');

// The Steel confirm button needs to be moved from after Surface Protection to before Surface Protection
// And we need to close the Steel unconfirmed block before Surface Protection

// Step 1: Find and remove the Steel confirm button from its current location
const steelButtonOld = `            {/* Confirm Button for Steel Pipe Specifications */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  steelPipesSpecsConfirmed: true
                })}
                disabled={!globalSpecs?.workingPressureBar || !globalSpecs?.workingTemperatureC}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Steel Pipe Specifications
              </button>
            </div>
            </>
            )}`;

if (content.includes(steelButtonOld)) {
  content = content.replace(steelButtonOld, '</>\\n            )}');
  console.log('✅ Removed Steel button from wrong location');
} else {
  console.log('❌ Could not find Steel button at wrong location');
}

// Step 2: Insert Steel confirm button before Surface Protection
// Find where to insert - right before Surface Protection section
const surfaceProtectionStart = `        {/* Surface Protection - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (`;

const steelButtonAndClosing = `        {/* Confirm Button for Steel Pipe Specifications */}
        {showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onUpdateGlobalSpecs({
                ...globalSpecs,
                steelPipesSpecsConfirmed: true
              })}
              disabled={!globalSpecs?.workingPressureBar || !globalSpecs?.workingTemperatureC}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Steel Pipe Specifications
            </button>
          </div>
        )}

        {/* Surface Protection - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (`;

if (content.includes(surfaceProtectionStart)) {
  content = content.replace(surfaceProtectionStart, steelButtonAndClosing);
  console.log('✅ Added Steel button before Surface Protection');
} else {
  console.log('❌ Could not find Surface Protection start');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');