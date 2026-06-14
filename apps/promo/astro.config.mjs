// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static marketing site for echobits.xyz — native Astro. Output is merged with
// the Vue app build and served by the echobit Worker (see apps/api). `site`
// drives the canonical/OG URLs baked into each page at build time.
export default defineConfig({
  site: 'https://echobits.xyz',
  vite: {
    plugins: [tailwindcss()],
  },
});
