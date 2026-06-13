// @ts-check
import { defineConfig } from 'astro/config';

// Phase A: project-pages URL (https://gerardnasser.github.io/GerardNasser/).
// Phase B (custom domain at root): set site to 'https://<domain>', remove
// `base`, and add public/CNAME containing the bare domain.
export default defineConfig({
  site: 'https://gerardnasser.github.io',
  base: '/GerardNasser/',
});
