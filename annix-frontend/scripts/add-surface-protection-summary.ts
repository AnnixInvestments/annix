import * as fs from 'fs';

const filePath = 'src/app/components/rfq/StraightPipeRfqOrchestrator.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add Surface Protection summary box after the section starts
const oldSectionStart = `        {/* External Coating & Internal Lining - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (
        <>
        {/* External Coating */}`;

const newSectionStart = `        {/* External Coating & Internal Lining - Only show if Surface Protection is selected */}
        {showSurfaceProtection && (
        <>
        {/* Confirmed Surface Protection Summary */}
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
        )}
        {/* External Coating */}`;

if (content.includes(oldSectionStart)) {
  content = content.replace(oldSectionStart, newSectionStart);
  console.log('✅ Added Surface Protection summary box');
} else {
  console.log('❌ Could not find the section start');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
