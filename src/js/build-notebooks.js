import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const NOTEBOOKS_DIR = join(ROOT, 'tutorials', 'notebooks');
const OUTPUT_INDEX = join(ROOT, 'tutorials', '_notebooks.json');
const OUTPUT_RENDERED = join(ROOT, 'tutorials', '_rendered');

// Ensure output directories exist
if (!existsSync(OUTPUT_RENDERED)) {
  mkdirSync(OUTPUT_RENDERED, { recursive: true });
}

// Parse frontmatter from first cell source
function parseFrontmatter(source) {
  const text = Array.isArray(source) ? source.join('') : source;
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const meta = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1].trim();
    let value = kv[2].trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Parse arrays like ["a", "b"]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value);
      } catch {
        // Leave as string if JSON parse fails
      }
    }
    meta[key] = value;
  }
  return meta;
}

// Extract date and slug from filename
function parseFilename(filename) {
  const base = basename(filename, '.ipynb');
  const dateMatch = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (dateMatch) {
    return { date: dateMatch[1], slug: dateMatch[2] };
  }
  return { date: '', slug: base };
}

// Process a single notebook
function processNotebook(filepath) {
  const raw = readFileSync(filepath, 'utf-8');
  const nb = JSON.parse(raw);
  const filename = basename(filepath);
  const { date, slug } = parseFilename(filename);

  const cells = nb.cells || [];
  if (cells.length === 0) return null;

  // Extract frontmatter from first cell
  const firstCell = cells[0];
  const firstSource = Array.isArray(firstCell.source) ? firstCell.source.join('') : (firstCell.source || '');
  const hasFrontmatter = firstSource.trim().startsWith('---');
  const meta = hasFrontmatter ? parseFrontmatter(firstSource) : {};

  // Process remaining cells (skip frontmatter cell)
  const startIdx = hasFrontmatter ? 1 : 0;
  const processedCells = [];

  for (let i = startIdx; i < cells.length; i++) {
    const cell = cells[i];
    const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');

    if (cell.cell_type === 'markdown') {
      processedCells.push({ type: 'markdown', source });
    } else if (cell.cell_type === 'code') {
      const outputs = (cell.outputs || []).map(output => {
        if (output.output_type === 'stream') {
          return {
            type: 'text',
            text: Array.isArray(output.text) ? output.text.join('') : (output.text || '')
          };
        } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
          const data = output.data || {};
          if (data['image/png']) {
            return { type: 'image', data: `data:image/png;base64,${data['image/png']}` };
          } else if (data['text/html']) {
            const html = Array.isArray(data['text/html']) ? data['text/html'].join('') : data['text/html'];
            return { type: 'html', html };
          } else if (data['text/plain']) {
            const text = Array.isArray(data['text/plain']) ? data['text/plain'].join('') : data['text/plain'];
            return { type: 'text', text };
          }
          return null;
        } else if (output.output_type === 'error') {
          return {
            type: 'error',
            ename: output.ename || '',
            evalue: output.evalue || '',
            traceback: (output.traceback || []).join('\n')
          };
        }
        return null;
      }).filter(Boolean);

      processedCells.push({
        type: 'code',
        source,
        executionCount: cell.execution_count || null,
        outputs
      });
    }
  }

  const renderedData = {
    meta: {
      slug,
      date,
      title: meta.title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: meta.description || '',
      tags: meta.tags || [],
      difficulty: meta.difficulty || '',
      duration: meta.duration || '',
      filename
    },
    cells: processedCells
  };

  // Write rendered JSON
  writeFileSync(join(OUTPUT_RENDERED, `${slug}.json`), JSON.stringify(renderedData, null, 2));

  // Return index entry
  return {
    slug,
    date,
    title: renderedData.meta.title,
    description: renderedData.meta.description,
    tags: renderedData.meta.tags,
    difficulty: renderedData.meta.difficulty,
    duration: renderedData.meta.duration,
    cellCount: processedCells.length,
    filename
  };
}

// Main build
function build() {
  if (!existsSync(NOTEBOOKS_DIR)) {
    console.log('No tutorials/notebooks directory found. Creating empty index.');
    writeFileSync(OUTPUT_INDEX, '[]');
    return;
  }

  const files = readdirSync(NOTEBOOKS_DIR)
    .filter(f => f.endsWith('.ipynb'))
    .sort()
    .reverse(); // newest first (date prefix sort)

  const index = [];
  for (const file of files) {
    const filepath = join(NOTEBOOKS_DIR, file);
    try {
      const entry = processNotebook(filepath);
      if (entry) {
        index.push(entry);
        console.log(`  Processed: ${file} -> ${entry.slug}`);
      }
    } catch (err) {
      console.error(`  Error processing ${file}:`, err.message);
    }
  }

  writeFileSync(OUTPUT_INDEX, JSON.stringify(index, null, 2));
  console.log(`\nBuild complete: ${index.length} notebook(s) processed.`);
}

console.log('Building notebook index...');
build();
