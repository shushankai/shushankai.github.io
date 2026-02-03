/**
 * @file Blog Build Script — fetches Substack RSS feed and generates rendered post JSON.
 * @description Reads from the configured Substack RSS URL, parses each <item>,
 * extracts metadata (title, slug, date, tags, cover image), sanitizes HTML content
 * with DOMPurify, and writes individual post JSON files to blog/_rendered/ plus
 * a combined index to blog/_posts.json.
 *
 * Inputs:  Substack RSS feed (HTTPS)
 * Outputs: blog/_posts.json (index), blog/_rendered/<slug>.json (per-post)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// DOMPurify needs a DOM window in Node.js — create one via jsdom
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const SUBSTACK_FEED_URL = 'https://shushankrecentendeavors.substack.com/feed';
const OUTPUT_INDEX = join(ROOT, 'blog', '_posts.json');
const OUTPUT_RENDERED = join(ROOT, 'blog', '_rendered');

// Ensure output directory exists
if (!existsSync(OUTPUT_RENDERED)) {
  mkdirSync(OUTPUT_RENDERED, { recursive: true });
}

/**
 * Fetch URL content via HTTPS with redirect support.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} The response body as a string.
 */
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'sushi-lab-blog-builder/1.0' } }, (res) => {
      // Follow 3xx redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Extract the text content of an XML tag, handling CDATA wrappers and namespaced
 * tags (e.g. content:encoded, dc:creator).
 *
 * Regex pattern: <tagName[attrs]>...content...</tagName>
 * The [^>]* allows for XML attributes on the opening tag.
 * The [\s\S]*? non-greedy match captures content across newlines.
 *
 * @param {string} xml - The XML string to search within.
 * @param {string} tag - The tag name (may include namespace prefix like 'content:encoded').
 * @returns {string} The extracted text, or empty string if not found.
 */
function extractTag(xml, tag) {
  // Escape regex special chars in tag name (e.g. the colon in content:encoded)
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, 'i'));
  if (!match) return '';
  let content = match[1].trim();
  // Strip CDATA wrappers: <![CDATA[...]]>
  if (content.startsWith('<![CDATA[')) {
    content = content.slice(9);
    if (content.endsWith(']]>')) content = content.slice(0, -3);
  }
  return content.trim();
}

/**
 * Extract all <item>...</item> blocks from an RSS XML string.
 * Uses a global regex to find each item element.
 * @param {string} xml - The full RSS XML string.
 * @returns {string[]} Array of inner XML strings for each item.
 */
function extractItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

/**
 * Generate a URL-safe slug from a title string.
 * @param {string} title - The post title.
 * @returns {string} A lowercase, hyphen-separated slug (max 80 chars).
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Estimate reading time from HTML content (based on ~230 words/min).
 * @param {string} html - The HTML content string.
 * @returns {string} Human-readable read time (e.g. "5 min read").
 */
function estimateReadTime(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').length;
  const minutes = Math.max(1, Math.round(words / 230));
  return `${minutes} min read`;
}

/**
 * Extract the first <img> src from HTML content for use as cover image.
 * @param {string} html - The HTML content string.
 * @returns {string} The image URL, or empty string if none found.
 */
function extractCoverImage(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

/**
 * Parse a single RSS <item> XML block into a structured post object.
 * Sanitizes the HTML content with DOMPurify to prevent stored XSS.
 * @param {string} itemXml - The inner XML of one <item> element.
 * @returns {object} Parsed post with slug, title, content (sanitized), etc.
 */
function parseItem(itemXml) {
  const title = extractTag(itemXml, 'title');
  const link = extractTag(itemXml, 'link');
  const pubDate = extractTag(itemXml, 'pubDate');
  const description = extractTag(itemXml, 'description');
  const rawContent = extractTag(itemXml, 'content:encoded');
  const creator = extractTag(itemXml, 'dc:creator');

  // Sanitize HTML content from Substack to strip dangerous tags/attributes
  const content = DOMPurify.sanitize(rawContent, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder'],
  });

  // Extract categories/tags from <category> elements (may have CDATA wrappers)
  const tags = [];
  const catRegex = /<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
  let catMatch;
  while ((catMatch = catRegex.exec(itemXml)) !== null) {
    const tag = catMatch[1].trim();
    if (tag) tags.push(tag);
  }

  // Extract enclosure URL (RSS cover image), fall back to first <img> in content
  const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  const coverImage = enclosureMatch ? enclosureMatch[1] : extractCoverImage(content);

  const slug = slugify(title);
  const date = pubDate ? new Date(pubDate).toISOString().split('T')[0] : '';
  const readTime = content ? estimateReadTime(content) : '';

  return {
    slug,
    title,
    description,
    date,
    link,
    creator: creator || 'Shushank Singh',
    tags,
    readTime,
    coverImage,
    content
  };
}

/**
 * Main build function — fetches RSS, parses posts, writes output files.
 */
async function build() {
  console.log(`Fetching Substack RSS: ${SUBSTACK_FEED_URL}`);

  let xml;
  try {
    xml = await fetchURL(SUBSTACK_FEED_URL);
  } catch (err) {
    console.warn(`  Could not fetch RSS feed: ${err.message}`);
    console.log('  Writing empty index.');
    writeFileSync(OUTPUT_INDEX, '[]');
    return;
  }

  const items = extractItems(xml);
  console.log(`  Found ${items.length} post(s) in feed.`);

  if (items.length === 0) {
    writeFileSync(OUTPUT_INDEX, '[]');
    console.log('  No posts found. Empty index written.');
    return;
  }

  const index = [];

  for (const itemXml of items) {
    try {
      const post = parseItem(itemXml);
      if (!post.title || !post.slug) continue;

      // Write rendered post JSON
      writeFileSync(
        join(OUTPUT_RENDERED, `${post.slug}.json`),
        JSON.stringify({
          meta: {
            slug: post.slug,
            title: post.title,
            description: post.description,
            date: post.date,
            link: post.link,
            creator: post.creator,
            tags: post.tags,
            readTime: post.readTime,
            coverImage: post.coverImage
          },
          content: post.content
        }, null, 2)
      );

      // Add to index (without full content)
      index.push({
        slug: post.slug,
        title: post.title,
        description: post.description,
        date: post.date,
        link: post.link,
        creator: post.creator,
        tags: post.tags,
        readTime: post.readTime,
        coverImage: post.coverImage
      });

      console.log(`  Processed: ${post.title} -> ${post.slug}`);
    } catch (err) {
      console.error(`  Error processing item:`, err.message);
    }
  }

  // Sort newest first
  index.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  writeFileSync(OUTPUT_INDEX, JSON.stringify(index, null, 2));
  console.log(`\nBlog build complete: ${index.length} post(s) processed.`);
}

build();
