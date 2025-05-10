- [ ] Test the Helm chart using `helm/test-helm.sh` to confirm all resources deploy and are ready
- [ ] Review and update `helm/README.md` for usage and security notes

# Project Cleanup (Staff Engineer Review)

## Docker & Compose
- [x] Keep only one Dockerfile for production. Delete `Dockerfile.dev`, `Dockerfile.test`, `Dockerfile.test.simple` unless actively used.
- [x] Keep only one docker-compose.yml. Remove `docker-compose-test.yml` unless you have a strong use case.

## Helm

## Terraform
- [x] Review all `.tf` and `.js` files in `terraform/`. Remove any that are not referenced in CI or docs. (N/A - no terraform/ directory)
- [x] Remove `.bak` and backup files: `terraform/browser_test.tf.bak`, `terraform/datadog_synthetics.tf.bak`. (N/A)

## Netlify
- [x] Keep only `netlify.toml` and essential plugins/functions. Remove unused files.

## Scripts
- [x] Remove or consolidate scripts with similar names (e.g., `fix-*`, `run-*`, `check-*`, `verify-*`). (No scripts/ directory, only relevant scripts in package.json)
- [x] Delete scripts that are not referenced in CI, docs, or README. (No extraneous scripts found)

## Test & Build Artifacts
- [x] Delete `test-build/`, `test-results/`, `build-perf-testing/` unless actively used.
- [x] Delete `logs/` and all log files (`*.log`), or add to `.gitignore`.

## Datadog & Misc
- [x] Remove `datadog-agent-run/`, `datadog-config/`, `datadog-synthetics.json`, `static-analysis.datadog.yml` unless required for current monitoring.
- [x] Remove `windsurf_deployment.yaml`, `windsurfrules.json` if not referenced.

## Root Directory
- [x] Delete `Untitled`, `script.js`, `prod-homepage.html`, `test-homepage.html` unless referenced.
- [x] Remove backup files: `netlify.toml.backup`.

## Documentation
- [x] Keep only up-to-date docs: `README.md`, `helm/README.md`, `STYLE-GUIDE.md`.
- [x] Remove or archive `CLAUDE.md`, `DOCKER-GUIDE.md` if outdated.

## .gitignore & .dockerignore
- [x] Ensure `.gitignore` includes:
  - `logs/`
  - `*.log`
  - `test-results/`
  - `test-build/`
  - `build-perf-testing/`
  - `.env*`
  - `datadog-agent-run/`
  - `datadog-config/`
  - `*.bak`
  - `Untitled`
  - `*.backup`
- [x] Ensure `.dockerignore` excludes node_modules, logs, test/build artifacts, and secrets.

## Misc
- [x] Remove `.npmrc` if not needed.
- [x] Remove or update `.env.example` to match actual env usage.
---
**Summary:**  
This repo has significant legacy and duplicate files. Remove all unused Dockerfiles, Compose files, scripts, logs, test/build artifacts, and backup files. Clean up documentation and ignore files. Only keep what is referenced in CI, docs, or actively used in development.

**Be ruthless. You want to go home. Fewer files than you started with. Tidy up and ship.**

# Astro v5 Best Practices & Structure (from official docs)

- [ ] Follow the [Astro Project Structure Guide](https://docs.astro.build/en/guides/project-structure/).
- [ ] Keep only the standard directories: `src/pages/`, `src/components/`, `src/layouts/`, `public/`, and `astro.config.mjs`.
- [ ] Place static assets in `public/`, not in `src/`.
- [ ] Use `src/pages/` for route files, `src/components/` for UI components, and `src/layouts/` for layout templates.
- [ ] Remove legacy, unused, or non-standard directories and files.
- [ ] Keep configuration minimal: only `astro.config.mjs`, `tsconfig.json` (if using TypeScript), and essential integration configs.
- [ ] Use `.gitignore` and `.env` patterns as recommended by the Astro docs and top open source projects.
- [ ] Document custom scripts and project structure in your README.

# NPM/Astro/package.json/package-lock.json Cleanup

- [ ] Remove unused dependencies and devDependencies from package.json.
- [ ] Remove unused scripts from package.json.
- [ ] Regenerate package-lock.json after cleanup (`rm package-lock.json && npm install`).
- [ ] Run `npm audit fix` and address any remaining vulnerabilities.
- [ ] Only include packages actually used in your codebase.
- [ ] Use the latest Astro v5 and plugin versions.
- [ ] Only include scripts you use in development, CI, or deployment.
- [x] Avoid scripts that run arbitrary shell commands or expose secrets.
- [x] Prefer `astro build`, `astro dev`, and `astro check` for core workflows.
- [x] Always commit package-lock.json for reproducible builds.
- [x] Avoid manual edits to the lockfile.
- [x] Run `npm audit` regularly and address any remaining vulnerabilities.
- [x] Avoid dependencies with known security issues (check Snyk, npm audit).
- [x] Do not store secrets in scripts or package.json.
- [ ] Remove legacy, test, or infra dependencies not needed for Astro v5.
- [ ] Keep package.json fields (name, version, description, scripts, dependencies, devDependencies) concise and accurate.
- [ ] Use only officially supported Astro plugins and integrations.
- [x] Remove any legacy build or test tools not compatible with Astro v5.
- [ ] Ensure scripts used in CI are present and up to date.
- [ ] Remove scripts for platforms you no longer use (e.g., old Docker, Datadog, or Netlify scripts if not in use).
- [ ] Document any custom scripts in README.md.
- [ ] Only add peerDependencies if you are publishing a package for others to consume.
- [x] Run `npm prune` to remove extraneous packages.
- [x] Use `npm dedupe` to reduce duplication in node_modules.
