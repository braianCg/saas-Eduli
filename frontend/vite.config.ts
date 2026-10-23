import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se reenvía al servidor PHP (php -S localhost:8000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173,proxy: {
  '/api': {
    target: 'http://127.0.0.1:8000', // Usa 127.0.0.1 en lugar de localhost
    changeOrigin: true,
    secure: false,
  }
}},
});
