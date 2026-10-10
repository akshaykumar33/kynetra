import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The API runs separately (apps/server); in development Vite forwards these paths to it so the
// browser sees one origin and the session cookie stays first-party.
const api = process.env.KNOVRA_API ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': api,
      '/auth': api,
    },
  },
  build: {
    // three alone is ~680 kB minified; the real gate is scripts/check-budget.mjs.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        // three and the R3F stack change rarely; keep them in their own long-cached chunks.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
