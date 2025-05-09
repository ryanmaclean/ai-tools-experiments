import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import mcp from 'astro-mcp';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  integrations: [mdx(), mcp()],
  devToolbar: {
    enabled: false,
  },
  build: {
    // Prevent document is not defined errors during build
    format: 'file',
    assets: '_assets',
  },
  // Output directory remains 'dist' by default
  // Specify site URL for correct absolute path generation
  site: 'https://ai-tools-lab-tst.netlify.app', // Updated to match Netlify domain
});