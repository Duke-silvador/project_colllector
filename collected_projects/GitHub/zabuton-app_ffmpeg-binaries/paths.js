"use strict";

const path = require("node:path");

// npm_config_platform / npm_config_arch let a build install the binaries of
// the platform it packages for instead of the one it runs on.
const platform = process.env.npm_config_platform || process.platform;
const arch = process.env.npm_config_arch || process.arch;

exports.target = `${platform}-${arch}`;

exports.binaryPath = (tool) =>
  path.join(__dirname, "bin", platform === "win32" ? `${tool}.exe` : tool);
