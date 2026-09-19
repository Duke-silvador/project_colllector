import fs from 'fs';

function getBase64Length(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    console.log(filePath, 'size:', buffer.length, 'bytes. Base64 length:', buffer.toString('base64').length);
  } catch (e) {
    console.error('Error reading', filePath, ':', e.message);
  }
}

getBase64Length('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png');
getBase64Length('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png');
getBase64Length('android/app/src/main/res/drawable/splash.png');
