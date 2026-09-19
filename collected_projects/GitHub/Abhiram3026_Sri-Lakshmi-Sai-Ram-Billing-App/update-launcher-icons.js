import fs from 'fs';
import path from 'path';

const sourceFile = 'src/assets/store-logo.png';

if (!fs.existsSync(sourceFile)) {
  console.error('Source logo file does not exist!');
  process.exit(1);
}

const folders = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

const filenames = [
  'ic_launcher.png',
  'ic_launcher_round.png',
  'ic_launcher_foreground.png'
];

folders.forEach(folder => {
  const dirPath = path.join('android/app/src/main/res', folder);
  if (fs.existsSync(dirPath)) {
    filenames.forEach(filename => {
      const destPath = path.join(dirPath, filename);
      fs.copyFileSync(sourceFile, destPath);
      console.log('Copied official logo to:', destPath);
    });
  } else {
    console.warn('Directory does not exist:', dirPath);
  }
});

console.log('Android Launcher Icons have been successfully updated completely with the official logo.');
