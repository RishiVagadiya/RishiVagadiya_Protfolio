const fs = require('fs');
const lines = fs.readFileSync('js/world.js', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('shadow')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
