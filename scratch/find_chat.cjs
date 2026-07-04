const fs = require('fs');
const content = fs.readFileSync('css/style.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('chat')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
