import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5187,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        service_blueprint_asis: resolve(__dirname, 'service_blueprint_asis.html'),
        user_persona: resolve(__dirname, 'user_persona.html'),
      },
    },
  },
});

