// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// Static marketing site for echobits.xyz. Output is merged with the Vue app
// build and served by the echobit Worker (see apps/api). `site` drives the
// canonical/OG URLs baked into each page at build time (the SEO payoff).
export default defineConfig({
  site: 'https://echobits.xyz',
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});
