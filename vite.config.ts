import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    optimizeDeps: {
      entries: ['index.html', 'src/main.tsx'],
    },
    server: {
      // HMR & WebSocket are disabled in AI Studio preview environment to prevent port 24678 conflicts and WebSocket errors.
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: false as const,
      ws: false as const,
      watch: null,
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
    },
  };
});
