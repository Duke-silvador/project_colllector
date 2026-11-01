import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Vite가 TSX 안의 Tailwind 클래스를 생성하도록 플러그인 추가
  ],
  base: '/Typing-practice-app/',
})
