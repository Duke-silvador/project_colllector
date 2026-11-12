// Downloads the ffmpeg and ffprobe executables for one platform from this
// repository's GitHub release and checks them against binaries.json.
"use strict";

const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { gunzipSync } = require("node:zlib");
const { version } = require("./package.json");
const { files } = require("./binaries.json");
const { target, binaryPath } = require("./paths.js");

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

async function install(tool, expected) {
  const dest = binaryPath(tool);
  if (fs.existsSync(dest) && sha256(fs.readFileSync(dest)) === expected.sha256) {
    return;
  }
  const url = `https://github.com/zabuton-app/ffmpeg-binaries/releases/download/v${version}/${tool}-${target}.gz`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  // The size limit stops a replaced asset from expanding without bound
  // before its checksum is looked at.
  const binary = gunzipSync(Buffer.from(await response.arrayBuffer()), {
    maxOutputLength: expected.size,
  });
  const actual = sha256(binary);
  if (actual !== expected.sha256) {
    throw new Error(`${url}: SHA-256 is ${actual}, expected ${expected.sha256}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  // Written under another name first: an interrupted install must not leave
  // half an executable where index.js points.
  fs.writeFileSync(`${dest}.tmp`, binary, { mode: 0o755 });
  fs.renameSync(`${dest}.tmp`, dest);
}

async function main() {
  const tools = files[target];
  if (!tools) {
    // Not an error: index.js exports null paths and the caller decides.
    console.warn(`ffmpeg-binaries: no binaries for ${target}`);
    return;
  }
  for (const [tool, expected] of Object.entries(tools)) {
    await install(tool, expected);
  }
}

main().catch((error) => {
  console.error(`ffmpeg-binaries: ${error.message}`);
  process.exit(1);
});
