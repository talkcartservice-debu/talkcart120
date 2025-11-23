const fs = require('fs');

const content = fs.readFileSync('marketplace.js', 'utf8');
let braceCount = 0;
let parenCount = 0;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      braceCount++;
    }
    if (char === '}') {
      braceCount--;
      if (braceCount < 0) {
        console.log(`Negative brace count at line ${i + 1}, column ${j + 1}: ${line}`);
        console.log(`Character: ${char}`);
        braceCount = 0; // Reset to avoid further negative counts
      }
    }
    if (char === '(') {
      parenCount++;
    }
    if (char === ')') {
      parenCount--;
      if (parenCount < 0) {
        console.log(`Negative paren count at line ${i + 1}, column ${j + 1}: ${line}`);
        console.log(`Character: ${char}`);
        parenCount = 0; // Reset to avoid further negative counts
      }
    }
  }
}

console.log(`Final brace count: ${braceCount}`);
console.log(`Final paren count: ${parenCount}`);