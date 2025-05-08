// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  build: {
    format: 'file',       // Changed back to 'file' to output XX.html directly
    assets: 'assets'      // Put assets in a proper assets directory
  },
  outDir: './dist',      // Ensure output directory is set
  trailingSlash: 'never' // Ensure no trailing slashes in URLs
});
