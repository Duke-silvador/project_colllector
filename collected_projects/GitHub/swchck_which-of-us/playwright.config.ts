import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

const PORT = 3311;
/** The screenshot server: same seed every run, so room codes, bots and their faces repeat. */
export const VISUAL_PORT = 3312;
// a fresh folder per run: test rooms must not land in the player's own saved games, and the
// screenshot server must not pick up rooms or «seen» questions left over from an earlier run
const data = (name: string) => join(tmpdir(), `kto-${name}-${process.pid}`);

export default defineConfig({
  testDir: 'tests-ui',
  timeout: 6 * 60_000,
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  // nobody listens to a test run: music and sound effects go through Web Audio, which this flag silences
  use: { baseURL: `http://localhost:${PORT}`, launchOptions: { args: ['--mute-audio'] } },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' } },
  webServer: [
    {
      command: 'node dist-server/server/main.js',
      env: { NODE_ENV: 'production', PORT: String(PORT), GAME_SPEED: '4', KTO_DATA_DIR: data('ui') },
      port: PORT,
      reuseExistingServer: false,
    },
    {
      command: 'node dist-server/server/main.js',
      env: { NODE_ENV: 'production', PORT: String(VISUAL_PORT), GAME_SEED: '7', KTO_DATA_DIR: data('visual') },
      port: VISUAL_PORT,
      reuseExistingServer: false,
    },
  ],
});
