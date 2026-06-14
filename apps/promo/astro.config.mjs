// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Static marketing site for echobits.xyz — native Astro. Output is merged with
// the Vue app build and served by the echobit Worker (see apps/api). `site`
// drives the canonical/OG URLs and the auto-generated sitemap.
export default defineConfig({
  site: 'https://echobits.xyz',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
