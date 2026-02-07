import * as fs from "node:fs";

const filePath = "src/app/components/rfq/StraightPipeRfqOrchestrator.tsx";
let content: string = fs.readFileSync(filePath, "utf8");

// Fix Band 1 and Band 2 in Review box (amber)
const oldReviewBandRow = `                      <div className="flex justify-between items-center">
                        <span className="text-amber-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-amber-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>`;

const newReviewBandRow = `                      <div className="flex gap-6 items-center">
                        <span className="text-amber-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-amber-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>`;

if (content.includes(oldReviewBandRow)) {
  content = content.replace(oldReviewBandRow, newReviewBandRow);
  console.log("Fixed Band 1 and Band 2 in Review box (amber)");
} else {
  console.log("Could not find Band row in Review box");
}

// Fix Band 1 and Band 2 in LOCKED box (green)
const oldLockedBandRow = `                      <div className="flex justify-between items-center">
                        <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>`;

const newLockedBandRow = `                      <div className="flex gap-6 items-center">
                        <span className="text-green-700"><span className="font-medium">Band 1:</span> {globalSpecs?.externalBand1Colour || <span className="text-gray-400 italic">None</span>}</span>
                        <span className="text-green-700"><span className="font-medium">Band 2:</span> {globalSpecs?.externalBand2Colour || <span className="text-gray-400 italic">None</span>}</span>
                      </div>`;

if (content.includes(oldLockedBandRow)) {
  content = content.replace(oldLockedBandRow, newLockedBandRow);
  console.log("Fixed Band 1 and Band 2 in LOCKED box (green)");
} else {
  console.log("Could not find Band row in LOCKED box");
}

fs.writeFileSync(filePath, content);
console.log("File saved");
