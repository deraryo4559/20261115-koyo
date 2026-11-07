import { defineConfig } from 'vite';
import vinext from 'vinext';

export default defineConfig({
  plugins: [vinext({
    nextConfig: {
      output: 'export',
      basePath: process.env.SITE_BASE_PATH ?? '',
      trailingSlash: true,
    },
  })],
  server: {
    host: '127.0.0.1',
    fs: {
      deny: ['**/requirment/**', '**/requirements/**', '**/.env*', '**/.git/**', '**/.local/**', '**/*.pem', '**/*.key'],
    },
  },
  build: { sourcemap: false },
});
