import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Traite aussi les fichiers .js comme JSX (pour les hooks avec JSX)
      include: /\.(jsx?|tsx?)$/,
    }),
  ],

  resolve: {
    // Vite tente .jsx avant .js lors d'un import sans extension
    extensions: ['.jsx', '.js', '.tsx', '.ts'],
  },

  optimizeDeps: {
    esbuildOptions: {
      // esbuild parse aussi les .js comme JSX pendant le pre-bundling
      loader: {
        '.js': 'jsx',
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
