import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      if (file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
        results.push({ path: filePath, size: stat.size });
      }
    }
  });
  return results;
}

console.log('Image sizes:', walkDir('.'));
