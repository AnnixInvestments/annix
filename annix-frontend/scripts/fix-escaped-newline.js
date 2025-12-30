const fs = require('fs');

const filePath = 'src/app/components/rfq/MultiStepStraightPipeRfqForm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the escaped newline that was incorrectly written
const broken = '</>\\n            )}';
const fixed = `</>
            )}`;

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  console.log('✅ Fixed escaped newline');
} else {
  console.log('❌ Pattern not found - may already be fixed or different');
}

fs.writeFileSync(filePath, content);
console.log('✅ File saved');
