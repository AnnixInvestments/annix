import * as fs from 'fs';

const filePath = 'src/app/components/rfq/StraightPipeRfqOrchestrator.tsx';
let content: string = fs.readFileSync(filePath, 'utf8');

// Fix Band 1 and Band 2 to appear next to each other (not justify-between)
const oldBandRow = `                  <div className="flex justify-between items-center">
                    <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                    <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                  </div>`;

const newBandRow = `                  <div className="flex gap-6 items-center">
                    <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                    <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                  </div>`;

if (content.includes(oldBandRow)) {
  content = content.replace(oldBandRow, newBandRow);
  console.log('✅ Fixed Band 1 and Band 2 to appear side by side');
} else {
  console.log('❌ Could not find Band row pattern');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');