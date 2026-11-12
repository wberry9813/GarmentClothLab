import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/GarmentClothLab/' : '/',
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5199 },
  build: { rollupOptions: { input: {
    main: new URL('./index.html', import.meta.url).pathname,
    garment: new URL('./garment.html', import.meta.url).pathname,
  } } },
});
