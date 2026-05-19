
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Fixed vite config to avoid __dirname errors in ESM and correctly define process.env.API_KEY
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Check if custom logo exists
    const hasCustomLogo = fs.existsSync(path.resolve('.', 'public/logo.png'));
    const iconSrc = hasCustomLogo ? 'logo.png' : 'icon.svg';
    const iconType = hasCustomLogo ? 'image/png' : 'image/svg+xml';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg', 'logo.png'],
          manifest: {
            name: 'Smart Creator Tools',
            short_name: 'Smart Creator Tools',
            description: 'AI tools for creators',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            icons: [
              {
                src: iconSrc,
                sizes: '192x192',
                type: iconType
              },
              {
                src: iconSrc,
                sizes: '512x512',
                type: iconType
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      },
      resolve: {
        alias: {
          // Fix: use path.resolve('.') instead of process.cwd() to avoid TS type issues
          '@': path.resolve('.'),
        }
      }
    };
});
