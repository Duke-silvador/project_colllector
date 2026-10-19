import { tamaguiPlugin } from '@tamagui/vite-plugin'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tamaguiPlugin({
      // Design system compartido con la app móvil (mismo archivo copiado)
      config: './src/tamagui.config.ts',
      components: ['tamagui'],
      // Estilos en runtime: evitamos la extracción a CSS estático para
      // mantener paridad 1:1 con el comportamiento de la app móvil.
      disableExtraction: true,
    }),
  ],
  // OJO: el plugin de Tamagui define `envPrefix: ['TAMAGUI_']`, lo que
  // impide que las variables VITE_* lleguen al cliente. Las declaramos aquí
  // para que Vite haga merge y exponga también las nuestras.
  envPrefix: ['VITE_'],
  resolve: {
    alias: [
      // Tamagui necesita react-native-web en web
      { find: 'react-native', replacement: 'react-native-web' },
      { find: '@', replacement: resolve(import.meta.dirname, 'src') },
    ],
  },
  define: {
    global: 'window',
    DEV: `${mode === 'development'}`,
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    port: 5173,
  },
}))
