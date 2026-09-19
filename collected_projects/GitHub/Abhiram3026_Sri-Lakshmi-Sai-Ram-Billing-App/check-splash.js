import fs from 'fs';
import path from 'path';

try {
  const filePath = 'android/app/src/main/res/drawable/splash.png';
  const stats = fs.statSync(filePath);
  console.log('File size of splash.png:', stats.size, 'bytes');
  
  // Let's read the dimensions of splash.png (PNG dimensions are at bytes 16-24)
  const buffer = fs.readFileSync(filePath);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log('splash.png dimensions:', width, 'x', height);
} catch (e) {
  console.error('Error analyzing splash.png:', e);
}
