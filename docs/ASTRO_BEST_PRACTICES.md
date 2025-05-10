# Astro v5 Best Practices & Project Structure

Based on the official Astro documentation and community best practices:

- Follow the [Astro Project Structure Guide](https://docs.astro.build/en/guides/project-structure/).
- Keep only the standard directories: `src/pages/`, `src/components/`, `src/layouts/`, `public/`, and `astro.config.mjs`.
- Place static assets in `public/`, not in `src/`.
- Use `src/pages/` for route files, `src/components/` for UI components, and `src/layouts/` for layout templates.
- Remove legacy, unused, or non-standard directories and files.
- Keep configuration minimal: only `astro.config.mjs`, `tsconfig.json` (if using TypeScript), and essential integration configs.
- Use `.gitignore` and `.env` patterns as recommended by the Astro docs and top open source projects.
- Document custom scripts and project structure in your README.

**Reference:**  
- [Astro Docs: Project Structure](https://docs.astro.build/en/guides/project-structure/)
