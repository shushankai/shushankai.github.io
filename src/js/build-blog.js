import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';

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

// Fetch URL content via https
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'sushi-lab-blog-builder/1.0' } }, (res) => {
      // Follow redirects
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

// Simple XML tag extractor (works for well-formed RSS)
function extractTag(xml, tag) {
  // Handle namespaced tags like content:encoded
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, 'i'));
  if (!match) return '';
  let content = match[1].trim();
  // Strip CDATA wrappers
  if (content.startsWith('<![CDATA[')) {
    content = content.slice(9);
    if (content.endsWith(']]>')) content = content.slice(0, -3);
  }
  return content.trim();
}

// Extract all items from RSS
function extractItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

// Generate slug from title
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// Estimate read time from HTML content
function estimateReadTime(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').length;
  const minutes = Math.max(1, Math.round(words / 230));
  return `${minutes} min read`;
}

// Extract first image from HTML content
function extractCoverImage(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

// Parse a single RSS item
function parseItem(itemXml) {
  const title = extractTag(itemXml, 'title');
  const link = extractTag(itemXml, 'link');
  const pubDate = extractTag(itemXml, 'pubDate');
  const description = extractTag(itemXml, 'description');
  const content = extractTag(itemXml, 'content:encoded');
  const creator = extractTag(itemXml, 'dc:creator');

  // Extract categories/tags
  const tags = [];
  const catRegex = /<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
  let catMatch;
  while ((catMatch = catRegex.exec(itemXml)) !== null) {
    const tag = catMatch[1].trim();
    if (tag) tags.push(tag);
  }

  // Extract enclosure (cover image from RSS)
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

// Main build
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

      // Write rendered post
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
