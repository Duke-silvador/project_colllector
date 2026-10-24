import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { basePages, validarAmbientePublico } from './scripts/automation/pages-config';
import { simulationEnabled } from './scripts/automation/simulation-config';

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  validarAmbientePublico(env, process.env.REQUIRE_PUBLIC_CONFIG === 'true');
  return { plugins: [react()], define: { __HML_SIMULATION__: JSON.stringify(simulationEnabled(env, mode, command)) }, base: mode === 'pages' ? basePages() : './', build: { manifest: true } };
});
