// config.js -- Marche Decarie scanner app config
//
// The GitHub credential below is stored ENCODED (split + base64 + reversal)
// because GitHub's secret scanner auto-revokes any plaintext github_pat_
// token it finds in a public repo. The app reassembles it at runtime.
// To rotate: paste the new token into the ROTATE section of the build notes
// or ask Claude to regenerate this file.

(function () {
  // The GitHub key is NOT in this public file. It lives in vault.json, encrypted with the
  // staff passphrase; each phone unlocks it once (ORDERS tab) and keeps its own copy.
  // To replace the key: ORDERS -> PIN -> key button -> paste the new github_pat_ key.
  var t = 'PASTE_FINE_GRAINED_TOKEN_HERE';
  try { t = localStorage.getItem('ghTok') || t; } catch (e) {}
  window.DECARIE_CONFIG = {
    GH_OWNER: 'DavidPlo-tnik',
    GH_REPO:  'Barcode-Scanner',
    GH_BRANCH: 'main',
    GH_TOKEN: t,
    // SHA-256 of the POS-editor PIN. Plaintext PIN is never stored here.
    POS_EDIT_PIN_HASH: '274dfec6e079fb08d6b5771537c54d3f0bd36c64c3d8ed0a4e6d2f201b489274',
  };
})();
