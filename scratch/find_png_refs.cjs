const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.gemini' && file !== 'scratch') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('rr_chatboat.png') || content.includes('rr_contact.png')) {
        console.log(`Found reference in ${fullPath}`);
      }
    }
  }
}

searchDir('.');
