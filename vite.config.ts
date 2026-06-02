import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // L'app est servie sous https://soreon.github.io/fronce/ sur GitHub Pages.
  base: '/fronce/',
  plugins: [react(), tailwindcss()],
});
