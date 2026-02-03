/**
 * @file Sitemap Generator — produces sitemap.xml for all site pages.
 * @description Scans static HTML pages plus generated blog post and tutorial slugs,
 * then writes a sitemap.xml to `public/` for search engine indexing.
 * Run as part of the prebuild/predev hook.
 * @module build-sitemap
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const BASE_URL = 'https://shushankai.github.io';

/** Static pages with their relative paths */
const STATIC_PAGES = [
  '/',
  '/about/',
  '/blog/',
  '/projects/',
  '/tutorials/',
];

/**
 * Read JSON file safely, returning an empty array on failure.
 * @param {string} filePath - Absolute path to JSON file.
 * @returns {Array} Parsed array or empty array.
 */
function readJsonSafe(filePath) {
  try {
    if (!existsSync(filePath)) return [];
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Generate sitemap.xml content from page URLs.
 * @param {string[]} urls - Array of full URLs.
 * @returns {string} XML sitemap string.
 */
function buildSitemap(urls) {
  const entries = urls.map(url =>
    `  <url>\n    <loc>${url}</loc>\n  </url>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

// Collect all URLs
const urls = [];

// Static pages
STATIC_PAGES.forEach(path => {
  urls.push(`${BASE_URL}${path}`);
});

// Blog post slugs
const posts = readJsonSafe(resolve(ROOT, 'public/blog/_posts.json'));
posts.forEach(post => {
  if (post.slug) {
    urls.push(`${BASE_URL}/blog/post.html?slug=${encodeURIComponent(post.slug)}`);
  }
});

// Tutorial slugs
const tutorials = readJsonSafe(resolve(ROOT, 'public/tutorials/_notebooks.json'));
tutorials.forEach(t => {
  if (t.slug) {
    urls.push(`${BASE_URL}/tutorials/view.html?nb=${encodeURIComponent(t.slug)}`);
  }
});

// Write sitemap
const sitemap = buildSitemap(urls);
const outPath = resolve(ROOT, 'public/sitemap.xml');
writeFileSync(outPath, sitemap, 'utf-8');
console.log(`[build-sitemap] Generated ${outPath} with ${urls.length} URLs`);
