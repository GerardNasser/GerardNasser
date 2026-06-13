// @ts-check
import { defineConfig } from 'astro/config';

// Custom domain at the root (gerardnasser.com). No `base` needed — the site is
// served from the domain root, and public/CNAME tells GitHub Pages the domain.
export default defineConfig({
  site: 'https://gerardnasser.com',
});
