import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
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
