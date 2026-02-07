import * as fs from "node:fs";

const filePath = "src/app/components/rfq/StraightPipeRfqOrchestrator.tsx";
let content = fs.readFileSync(filePath, "utf8");

// Fix the closing tag for Surface Protection section
// Replace </>  at the end of Surface Protection with </div>
const oldPattern = `        </div>
        </>
        )}

            {/* Confirm Button for Steel Pipe Specifications */}`;

const newPattern = `        </div>
          </div>
        )}

            {/* Confirm Button for Steel Pipe Specifications */}`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  console.log("✅ Fixed closing tag");
} else {
  console.log("❌ Could not find pattern");

  // Try an alternative approach - replace any standalone </> that's followed by )}
  const simplePattern = "        </>\n        )}";
  const simpleReplacement = "          </div>\n        )}";

  if (content.includes(simplePattern)) {
    content = content.replace(simplePattern, simpleReplacement);
    console.log("✅ Fixed closing tag (simple pattern)");
  } else {
    console.log("❌ Could not find simple pattern either");
  }
}

fs.writeFileSync(filePath, content);
console.log("✅ File saved");
