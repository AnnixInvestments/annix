import * as fs from 'fs';

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Remove the misplaced Steel confirm button from after Surface Protection
const misplacedButton = `
            {/* Confirm Button for Steel Pipe Specifications */}
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
            )}
          </div>
        )}

        {/* HDPE Pipes & Fittings Section */}`;

const withoutMisplacedButton = `
        {/* HDPE Pipes & Fittings Section */}`;

if (content.includes(misplacedButton)) {
  content = content.replace(misplacedButton, withoutMisplacedButton);
  console.log('✅ Removed misplaced Steel confirm button');
} else {
  console.log('❌ Could not find misplaced button pattern');
}

// Step 2: Add the Steel confirm button in the correct place (before Surface Protection)
// Find the end of the Steel specification fields (before Surface Protection starts)
const beforeSurfaceProtection = `            </div>
          </div>
        </div>

        {/* Surface Protection - Only show if Surface Protection is selected */}`;

const steelConfirmButtonCorrect = `            </div>
          </div>
        </div>

        {/* Confirm Button for Steel Pipe Specifications - Only show when not confirmed */}
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

        {/* Surface Protection - Only show if Surface Protection is selected */}`;

if (content.includes(beforeSurfaceProtection)) {
  content = content.replace(beforeSurfaceProtection, steelConfirmButtonCorrect);
  console.log('✅ Added Steel confirm button in correct location');
} else {
  console.log('❌ Could not find location to add Steel button');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
