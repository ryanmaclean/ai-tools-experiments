import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { load } from 'cheerio';
import { globSync } from 'glob';

// Find all built HTML files
const htmlFiles = globSync('dist/**/*.html');

describe('All internal links work', async () => {
  await Promise.all(
    htmlFiles.map(async (file) => {
      const html = readFileSync(file, 'utf-8');
      const $ = load(html);
      const links = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (
          href &&
          !href.startsWith('http') &&
          !href.startsWith('#') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('tel:')
        ) {
          links.push(href);
        }
      });
      await Promise.all(
        links.map(async (href) => {
          let target = join('dist', href.replace(/^\//, ''));
          if (!target.endsWith('.html')) {
            target = join(target, 'index.html');
          }
          it.concurrent(`Link ${href} in ${file} should exist`, () => {
            expect(existsSync(target)).toBe(true);
          });
        })
      );
    })
  );
}); 