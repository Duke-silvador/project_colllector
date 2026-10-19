// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Plain-Node code (no bundler): the assistant server and the standalone
    // distribution service. Expose Node globals such as Buffer to ESLint.
    files: ["server/**/*.mjs", "dist-service/**/*.mjs"],
    languageOptions: { globals: require("globals").node },
  },
  {
    // Node-only scripts (run through tsx): resolve `../src/campus/db` to `db.ts`. The default
    // React Native extension order tries `.web.ts` first, which makes `import/no-duplicates`
    // think the native and web implementations imported side by side are the same module.
    files: ["scripts/**"],
    settings: {
      "import/extensions": [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"],
      "import/resolver": {
        node: { extensions: [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"] },
        typescript: { extensions: [".ts", ".tsx", ".mjs", ".js", ".cjs", ".json"] },
      },
    },
  },
  {
    // Generated output only. `expo lint` lints just src/app/components, so list the rest
    // explicitly in the `lint` script; these ignores keep a bare `eslint .` usable too.
    ignores: ["dist/*", ".expo/*", "ios/*", "android/*", "docs-site/build/*", "docs-site/.docusaurus/*"],
  }
]);
