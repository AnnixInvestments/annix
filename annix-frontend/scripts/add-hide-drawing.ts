import * as fs from 'fs';

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for hiding drawings - find a good place in ItemUploadStep
// Look for existing useState declarations in ItemUploadStep
const statePattern = /function ItemUploadStep\(\{[^}]+\}[^)]*\)[^{]*\{/;
const stateMatch = content.match(statePattern);

if (stateMatch) {
  const insertPoint = stateMatch.index + stateMatch[0].length;
  const beforeInsert = content.substring(0, insertPoint);
  const afterInsert = content.substring(insertPoint);

  // Check if state already exists
  if (!content.includes('hiddenDrawings')) {
    // Find the first line after the function declaration
    const firstNewline = afterInsert.indexOf('\n');
    const restOfContent = afterInsert.substring(firstNewline);

    content = beforeInsert + '\n  // State for hiding/showing 3D drawings per item\n  const [hiddenDrawings, setHiddenDrawings] = React.useState<Record<string, boolean>>({});' + restOfContent;
    console.log('✅ Added hiddenDrawings state');
  } else {
    console.log('⚠️ hiddenDrawings state already exists');
  }
}

// 2. Update Pipe3DPreview to include hide button and conditional rendering
const oldPipePreview = `              {/* 3D Pipe Preview - below specifications, above calculations */}
              {entry.specs?.nominalBoreMm && (
                <div className="mt-4">
                  <Pipe3DPreview
                    length={entry.specs.individualPipeLength || 12.192}
                    outerDiameter={entry.calculation?.outsideDiameterMm || (entry.specs.nominalBoreMm * 1.1)}
                    wallThickness={entry.calculation?.wallThicknessMm || entry.specs.wallThicknessMm || 5}
                    endConfiguration={entry.specs.pipeEndConfiguration || 'PE'}
                    materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                  />
                </div>
              )}`;

const newPipePreview = `              {/* 3D Pipe Preview - below specifications, above calculations */}
              {entry.specs?.nominalBoreMm && (
                <div className="mt-4 relative">
                  {!hiddenDrawings[entry.id] && (
                    <Pipe3DPreview
                      length={entry.specs.individualPipeLength || 12.192}
                      outerDiameter={entry.calculation?.outsideDiameterMm || (entry.specs.nominalBoreMm * 1.1)}
                      wallThickness={entry.calculation?.wallThicknessMm || entry.specs.wallThicknessMm || 5}
                      endConfiguration={entry.specs.pipeEndConfiguration || 'PE'}
                      materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                    />
                  )}
                  <button
                    onClick={() => setHiddenDrawings(prev => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                    className="absolute bottom-2 right-2 px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-md transition-colors z-10"
                  >
                    {hiddenDrawings[entry.id] ? 'Show Drawing' : 'Hide Drawing'}
                  </button>
                </div>
              )}`;

if (content.includes(oldPipePreview)) {
  content = content.replace(oldPipePreview, newPipePreview);
  console.log('✅ Updated Pipe3DPreview with hide button');
} else {
  console.log('❌ Could not find Pipe3DPreview section');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
