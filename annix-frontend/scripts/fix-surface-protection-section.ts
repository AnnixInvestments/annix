import * as fs from 'fs';

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Update the Surface Protection summary box to also show for manual confirmation
// and show external coating type from manual selection if recommendation not available
const oldSummaryBox = `        {/* Confirmed Surface Protection Summary */}
        {globalSpecs?.externalCoatingConfirmed && globalSpecs?.externalCoatingRecommendation && (
          <div className="bg-green-100 border border-green-400 rounded-md p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Surface Protection Confirmed</span>
                <span className="mx-2">•</span>
                <span className="font-medium">External:</span> {globalSpecs.externalCoatingRecommendation.coating}
                {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="font-medium">Internal:</span> {globalSpecs.internalLiningType}
                    {globalSpecs?.internalRubberType && <span className="ml-1">({globalSpecs.internalRubberType})</span>}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => onUpdateGlobalSpecs({
                  ...globalSpecs,
                  externalCoatingConfirmed: false,
                  internalLiningConfirmed: false
                })}
                className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
              >
                Edit
              </button>
            </div>
          </div>
        )}`;

// New summary box with section header and better condition
const newSummaryBox = `        {/* Surface Protection Section Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
            <span className="text-2xl">🛡️</span>
            <h3 className="text-xl font-bold text-gray-900">Surface Protection</h3>
          </div>

          {/* Confirmed Surface Protection Summary */}
          {globalSpecs?.externalCoatingConfirmed && (globalSpecs?.externalCoatingRecommendation || globalSpecs?.externalCoatingType) && (
            <div className="bg-green-100 border border-green-400 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Surface Protection Confirmed</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">External:</span> {globalSpecs.externalCoatingRecommendation?.coating || globalSpecs.externalCoatingType || 'N/A'}
                  {globalSpecs?.internalLiningConfirmed && globalSpecs?.internalLiningType && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-medium">Internal:</span> {globalSpecs.internalLiningType}
                      {globalSpecs?.internalRubberType && <span className="ml-1">({globalSpecs.internalRubberType})</span>}
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGlobalSpecs({
                    ...globalSpecs,
                    externalCoatingConfirmed: false,
                    internalLiningConfirmed: false
                  })}
                  className="px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600"
                >
                  Edit
                </button>
              </div>
            </div>
          )}`;

if (content.includes(oldSummaryBox)) {
  content = content.replace(oldSummaryBox, newSummaryBox);
  console.log('✅ Updated Surface Protection section with header and fixed summary box');
} else {
  console.log('❌ Could not find the summary box pattern');
}

// Fix 2: Close the space-y-4 div after Internal Lining section ends
// Find the closing tag for the Surface Protection section
const closingPattern = `        </>
        )}`;

// We need to add a closing </div> before </>
const internalLiningSectionEnd = content.indexOf('        {/* Internal Lining */}');
if (internalLiningSectionEnd > -1) {
  // Find the end of the internal lining section - look for the closing </> of showSurfaceProtection
  const surfaceProtectionEnd = content.indexOf('        </>\\n        )}', internalLiningSectionEnd);
  console.log('📍 Found Internal Lining section start at:', internalLiningSectionEnd);
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
