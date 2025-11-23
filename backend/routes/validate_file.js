const fs = require('fs');
const vm = require('vm');

// Read the file
const code = fs.readFileSync('marketplace.js', 'utf8');

// Try to compile the code
try {
  new vm.Script(code);
  console.log('File compiled successfully');
} catch (error) {
  console.log('Compilation error:', error.message);
  console.log('Line:', error.lineNumber);
  console.log('Column:', error.column);
  
  // Show the problematic lines
  const lines = code.split('\n');
  const startLine = Math.max(0, error.lineNumber - 3);
  const endLine = Math.min(lines.length, error.lineNumber + 2);
  
  console.log('\nContext around error:');
  for (let i = startLine; i < endLine; i++) {
    const lineNum = i + 1;
    const marker = lineNum === error.lineNumber ? '>>> ' : '    ';
    console.log(`${marker}${lineNum}: ${lines[i]}`);
  }
}