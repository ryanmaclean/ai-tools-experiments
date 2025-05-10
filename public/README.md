# Readme for /public folder

The `/public` folder in an Astro v5 project contains static assets that will be served directly without processing. Files in this directory are copied as-is to the final build output.

Common uses include:
- Images, icons, and other media files
- Downloadable files (PDFs, etc.)
- robots.txt and sitemap.xml
- Favicons
- Static HTML files

**Note:** For images and other assets that should be processed by Astro's build pipeline (e.g., for optimization), place them in the `src` directory instead. Only keep files in `/public` that need to be served exactly as-is.

This folder should NOT be removed as it's a core part of Astro's directory structure. Even if empty, keeping it helps maintain the standard project organization.
