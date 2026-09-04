import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is structured as one unified codebase.
// Public pages + admin/student flows live together so the project is simple
// to run, deploy and hand over to future union volunteers.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Preview environments may proxy requests through their own hostname.
    allowedHosts: true,
    // Forward API calls to the Express server during development.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
