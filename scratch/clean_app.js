import fs from 'fs';

const filePath = 'js/app.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove duplicate chatbot block
const startKeyword = '// Chatbot Welcome Bubble';
const endKeyword = '/* -------------------- sound wiring -------------------- */';

const startIndex = content.indexOf(startKeyword);
const endIndex = content.indexOf(endKeyword);

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
  console.log(`Found duplicate chatbot block from index ${startIndex} to ${endIndex}. Removing...`);
  content = content.slice(0, startIndex) + content.slice(endIndex);
} else {
  console.log('Could not find duplicate chatbot block boundaries!');
}

// 2. Fix the tapToPlayBtn syntax error
const targetPattern = `    setTimeout(() => {
      tapToPlayBtn.style.display = "none";
    }, 300);
  );`;

const replacementPattern = `    setTimeout(() => {
      tapToPlayBtn.style.display = "none";
    }, 300);
  });`;

if (content.includes(targetPattern)) {
  console.log('Found tapToPlayBtn syntax error. Fixing...');
  content = content.replace(targetPattern, replacementPattern);
} else {
  console.log('Could not find tapToPlayBtn syntax error pattern!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished updating app.js.');
