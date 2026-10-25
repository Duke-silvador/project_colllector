/* License key helpers for the Gotchi panel.
 * Must stay in step with scripts/publish_status.py (same normalisation,
 * PBKDF2-SHA256, AES-256-GCM). Works in browsers and in Node 20+. */
(function (root) {
  "use strict";

  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols, no 0/O/1/I
  var ITERATIONS = 200000; // what encryptBlob writes; decryptBlob accepts MIN..MAX
  var MIN_ITERATIONS = 100000;
  var MAX_ITERATIONS = 1000000;

  function normalizeKey(key) {
    return String(key).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }

  // GTCH-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX: 25 random symbols, 125 bits.
  function generateKey() {
    var bytes = new Uint8Array(25);
    root.crypto.getRandomValues(bytes);
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % 32]; // 256 % 32 === 0, so no bias
    return "GTCH-" + out.match(/.{5}/g).join("-");
  }

  function fromBase64(text) {
    var bin = atob(text);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function decryptBlob(blob, key) {
    var iterations = Number(blob.iter);
    if (!(iterations >= MIN_ITERATIONS && iterations <= MAX_ITERATIONS)) {
      throw new Error("Unexpected key derivation settings");
    }
    var subtle = root.crypto.subtle;
    var material = await subtle.importKey(
      "raw", new TextEncoder().encode(normalizeKey(key)), "PBKDF2", false, ["deriveKey"]);
    var aes = await subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(blob.salt), iterations: iterations },
      material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var plain = await subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(blob.iv) }, aes, fromBase64(blob.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function toBase64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  // Same blob format as scripts/publish_status.py, so the workflow can read what the panel writes.
  async function encryptBlob(payload, key) {
    var subtle = root.crypto.subtle;
    var salt = new Uint8Array(16), iv = new Uint8Array(12);
    root.crypto.getRandomValues(salt);
    root.crypto.getRandomValues(iv);
    var material = await subtle.importKey(
      "raw", new TextEncoder().encode(normalizeKey(key)), "PBKDF2", false, ["deriveKey"]);
    var aes = await subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: ITERATIONS },
      material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    var ct = new Uint8Array(await subtle.encrypt(
      { name: "AES-GCM", iv: iv }, aes, new TextEncoder().encode(JSON.stringify(payload))));
    return { v: 1, kdf: "PBKDF2-SHA256", iter: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(ct) };
  }

  var api = { normalizeKey: normalizeKey, generateKey: generateKey, decryptBlob: decryptBlob, encryptBlob: encryptBlob };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.GotchiLicense = api;
})(typeof window !== "undefined" ? window : globalThis);
