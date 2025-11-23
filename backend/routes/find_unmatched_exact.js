const fs = require('fs');

const content = fs.readFileSync('marketplace.js', 'utf8');
let braceCount = 0;
let parenCount = 0;
let lastOpenBraceLine = 0;
let lastOpenParenLine = 0;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      braceCount++;
      lastOpenBraceLine = i + 1;
    }
    if (char === '}') {
      braceCount--;
    }
    if (char === '(') {
      parenCount++;
      lastOpenParenLine = i + 1;
    }
    if (char === ')') {
      parenCount--;
    }
  }
}

console.log(`Final brace count: ${braceCount}, Last open brace line: ${lastOpenBraceLine}`);
console.log(`Final paren count: ${parenCount}, Last open paren line: ${lastOpenParenLine}`);

// Now let's find the actual unmatched brace/paren
let currentBraceCount = 0;
let currentParenCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      currentBraceCount++;
    }
    if (char === '}') {
      currentBraceCount--;
      if (currentBraceCount < 0) {
        console.log(`Extra closing brace at line ${i + 1}, column ${j + 1}`);
        currentBraceCount = 0;
      }
    }
    if (char === '(') {
      currentParenCount++;
    }
    if (char === ')') {
      currentParenCount--;
      if (currentParenCount < 0) {
        console.log(`Extra closing paren at line ${i + 1}, column ${j + 1}`);
        currentParenCount = 0;
      }
    }
  }
}

if (currentBraceCount > 0) {
  console.log(`Missing ${currentBraceCount} closing brace(s)`);
}

if (currentParenCount > 0) {
  console.log(`Missing ${currentParenCount} closing paren(s)`);
}