const fs = require('fs');
const content = fs.readFileSync('js/app.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('world.')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
