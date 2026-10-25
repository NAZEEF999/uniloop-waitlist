import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use esbuild transformer instead of oxc to avoid parsing issues
  optimizeDeps: {
    transformer: 'esbuild'
  }
})