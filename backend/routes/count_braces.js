const fs = require('fs');

const content = fs.readFileSync('marketplace.js', 'utf8');
let openBraces = 0;
let closeBraces = 0;
let openParens = 0;
let closeParens = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') openBraces++;
  if (char === '}') closeBraces++;
  if (char === '(') openParens++;
  if (char === ')') closeParens++;
}

console.log(`Braces - Open: ${openBraces}, Close: ${closeBraces}, Difference: ${openBraces - closeBraces}`);
console.log(`Parens - Open: ${openParens}, Close: ${closeParens}, Difference: ${openParens - closeParens}`);