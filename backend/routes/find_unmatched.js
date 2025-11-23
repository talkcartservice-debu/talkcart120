const fs = require('fs');

const content = fs.readFileSync('marketplace.js', 'utf8');
let braceCount = 0;
let parenCount = 0;
let lastBraceLine = 0;
let lastParenLine = 0;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      braceCount++;
      lastBraceLine = i + 1;
    }
    if (char === '}') {
      braceCount--;
      lastBraceLine = i + 1;
    }
    if (char === '(') {
      parenCount++;
      lastParenLine = i + 1;
    }
    if (char === ')') {
      parenCount--;
      lastParenLine = i + 1;
    }
  }
}

console.log(`Brace count: ${braceCount}, Last brace line: ${lastBraceLine}`);
console.log(`Paren count: ${parenCount}, Last paren line: ${lastParenLine}`);

if (braceCount !== 0) {
  console.log(`Unmatched brace at line ${lastBraceLine}: ${lines[lastBraceLine - 1]}`);
}

if (parenCount !== 0) {
  console.log(`Unmatched paren at line ${lastParenLine}: ${lines[lastParenLine - 1]}`);
}