import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react({
      // Traite aussi les fichiers .js comme JSX (pour les hooks avec JSX)
      include: /\.(jsx?|tsx?)$/,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HerSafety CI',
        short_name: 'HerSafety',
        description: 'Plateforme de sécurité personnelle pour femmes',
        theme_color: '#C2185B',
        background_color: '#0D0D0D',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
      },
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

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
