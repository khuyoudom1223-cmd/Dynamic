const fs = require('fs');
const path = require('path');

function getFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, allFiles);
    } else {
      if (file.endsWith('.ejs')) {
        allFiles.push(name);
      }
    }
  }
  return allFiles;
}

const viewsDir = path.join(__dirname, '../views');
const files = getFiles(viewsDir);
const templates = {};

for (const file of files) {
  const relativePath = path.relative(viewsDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  templates[relativePath] = content;
}

const output = `// Auto-generated file. Do not edit manually.
module.exports = ${JSON.stringify(templates, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/config/templates.js'), output);
console.log('✅ Templates bundled successfully!');
