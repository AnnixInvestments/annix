import * as fs from "node:fs";

const filePath = "src/app/components/rfq/StraightPipeRfqOrchestrator.tsx";
let content: string = fs.readFileSync(filePath, "utf8");

// The problem: Steel Pipes unconfirmed block at line 3556 never closes
// The fragment <> from line 3557 never closes with </>
// The conditional from 3556 never closes with )}
// The Steel Pipes div from line 3511 never closes
// The showSteelPipes conditional from line 3510 never closes

// This causes Surface Protection to be nested inside it, hiding it when Steel is confirmed

// Find the exact pattern and add the missing closures
const oldPattern = `            </div>
          </div>
        </div>

        {/* Confirm Button for Steel Pipe Specifications */}
        {showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed && (`;

const newPattern = `            </div>
          </div>
        </div>
            </>
            )}
          </div>
        )}

        {/* Confirm Button for Steel Pipe Specifications */}
        {showSteelPipes && !globalSpecs?.steelPipesSpecsConfirmed && (`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  console.log("Fixed: Added missing closures for Steel Pipes section");
  console.log("Added: </> to close fragment");
  console.log("Added: )} to close !steelPipesSpecsConfirmed conditional");
  console.log("Added: </div> to close Steel Pipes inner div");
  console.log("Added: )} to close showSteelPipes conditional");
} else {
  console.log("Could not find the exact pattern");

  // Debug: show what's in the file around that area
  const lines = content.split("\n");
  console.log("Lines around 3843-3848:");
  for (let i = 3842; i < 3850 && i < lines.length; i++) {
    console.log(`${i + 1}: "${lines[i]}"`);
  }
}

fs.writeFileSync(filePath, content);
console.log("File saved");
