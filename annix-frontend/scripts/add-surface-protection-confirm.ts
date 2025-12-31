import * as fs from 'fs';

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add Confirm Surface Protection button before the closing of the Surface Protection section
// The section ends with:  </div>\n          </div>\n        )}\n\n            {/* Confirm Button for Steel Pipe Specifications */}

const oldEnding = `        </div>
          </div>
        )}

            {/* Confirm Button for Steel Pipe Specifications */}`;

const newEnding = `        </div>

            {/* Confirm Surface Protection Button - Only show when not all confirmed */}
            {(!globalSpecs?.externalCoatingConfirmed || !globalSpecs?.internalLiningConfirmed) && (globalSpecs?.externalCoatingType || globalSpecs?.internalLiningType) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: true,
                    internalLiningConfirmed: true,
                    surfaceProtectionConfirmed: true
                  })}
                  disabled={!globalSpecs?.externalCoatingType}
                  className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Surface Protection
                </button>
              </div>
            )}
          </div>
        )}

            {/* Confirm Button for Steel Pipe Specifications */}`;

if (content.includes(oldEnding)) {
  content = content.replace(oldEnding, newEnding);
  console.log('✅ Added Confirm Surface Protection button');
} else {
  console.log('❌ Could not find the ending pattern');
}

// Now update the summary box condition to also check for surfaceProtectionConfirmed
const oldSummaryCondition = `{globalSpecs?.externalCoatingConfirmed && (globalSpecs?.externalCoatingRecommendation || globalSpecs?.externalCoatingType) && (`;

const newSummaryCondition = `{(globalSpecs?.surfaceProtectionConfirmed || globalSpecs?.externalCoatingConfirmed) && (globalSpecs?.externalCoatingRecommendation || globalSpecs?.externalCoatingType) && (`;

if (content.includes(oldSummaryCondition)) {
  content = content.replace(oldSummaryCondition, newSummaryCondition);
  console.log('✅ Updated summary box condition');
} else {
  console.log('❌ Could not find summary condition');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
