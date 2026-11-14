// Copies the entry.png competition image to the configured output directory.
// The copy is byte-for-byte deterministic, so repeated runs produce identical output.
import fs from 'node:fs';
import path from 'node:path';

const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const sourcePath = path.join(import.meta.dirname, 'entry.png');
const destPath = path.join(outputDir, 'entry.png');

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(sourcePath, destPath);
console.log(`Successfully copied entry.png to ${destPath}`);
