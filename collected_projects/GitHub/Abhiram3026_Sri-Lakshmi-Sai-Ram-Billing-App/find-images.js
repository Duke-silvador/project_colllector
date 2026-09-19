import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    // Skip node_modules and .git and dist
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      if (file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') || file.toLowerCase().endsWith('.svg')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

console.log('Image files found:', walkDir('.'));
