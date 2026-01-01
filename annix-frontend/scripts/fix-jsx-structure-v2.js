const fs = require('fs');

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Problem: Surface Protection is nested inside !steelPipesSpecsConfirmed block
// The closures at lines 6969-6972 should be BEFORE Surface Protection at line 3865

// Step 1: Remove the closures from after Surface Protection
const oldClosures = `
</>
            )}
          </div>
        )}

        {/* HDPE Pipes & Fittings Section */}`;

const newClosuresRemoved = `

        {/* HDPE Pipes & Fittings Section */}`;

if (content.includes(oldClosures)) {
  content = content.replace(oldClosures, newClosuresRemoved);
  console.log('Step 1: Removed closures from after Surface Protection');
} else {
  console.log('Step 1: Could not find closures to remove');
}

// Step 2: Add closures BEFORE Surface Protection section starts
const beforeSurfaceProtection = `        {/* Confirm Button for Steel Pipe Specifications */}
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

const withClosuresBeforeSurfaceProtection = `            </>
            )}
          </div>
        )}

        {/* Confirm Button for Steel Pipe Specifications */}
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

if (content.includes(beforeSurfaceProtection)) {
  content = content.replace(beforeSurfaceProtection, withClosuresBeforeSurfaceProtection);
  console.log('Step 2: Added closures before Surface Protection section');
} else {
  console.log('Step 2: Could not find Surface Protection section to add closures');
}

fs.writeFileSync(filePath, content);
console.log('File saved');
