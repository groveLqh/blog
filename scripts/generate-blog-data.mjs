import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DOC_DIR = path.join(ROOT, "doc");
const OUT_FILE = path.join(ROOT, "src", "data", "blog.ts");

const toDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const slugify = (value) => {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return slug || "post";
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatter(source) {
  if (!source.startsWith("---")) return { data: {}, content: source };

  const end = source.indexOf("\n---", 3);
  if (end === -1) return { data: {}, content: source };

  const raw = source.slice(3, end).trim();
  const content = source.slice(end + 4).trimStart();
  const data = {};
  let currentKey = null;

  for (const line of raw.split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      data[currentKey] = Array.isArray(data[currentKey])
        ? data[currentKey]
        : [];
      data[currentKey].push(listItem[1].trim());
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      data[currentKey] = pair[2].trim() || [];
    }
  }

  return { data, content };
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[>*_~`#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeading(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function normalizeTags(value, fallback) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 6);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  return [fallback].filter(Boolean);
}

function estimateReadTime(markdown) {
  const text = stripMarkdown(markdown);
  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (text.replace(/[\u4e00-\u9fff]/g, " ").match(/\w+/g) || [])
    .length;
  const minutes = Math.max(1, Math.ceil(cjkChars / 500 + latinWords / 220));
  return `${minutes} min read`;
}

async function generate() {
  const files = await walk(DOC_DIR);
  const seenSlugs = new Map();
  const posts = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const { data, content } = parseFrontmatter(raw);
    const base = path.basename(file, ".md");

    if (base.toLowerCase() === "readme" && !data.title) continue;

    const fileStat = await stat(file);
    const category =
      data.category ||
      (Array.isArray(data.categories) ? data.categories[0] : data.categories) ||
      path.basename(path.dirname(file));
    const title = data.title || firstHeading(content) || base;
    const description =
      data.summary || data.description || `${stripMarkdown(content).slice(0, 150)}...`;
    const date = toDate(data.updated || data.date) || toDate(fileStat.mtime);
    const sourcePath = path.relative(ROOT, file);
    const baseSlug = slugify(`${category}-${base}`);
    const duplicateCount = seenSlugs.get(baseSlug) || 0;
    seenSlugs.set(baseSlug, duplicateCount + 1);

    posts.push({
      slug: duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug,
      title,
      description,
      tags: normalizeTags(data.tags, category),
      date,
      readTime: estimateReadTime(content),
      content,
      sourcePath,
    });
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date), "zh-CN"));

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(
    OUT_FILE,
    `export interface Blog {
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  date: string;
  readTime: string;
  sourcePath: string;
}

export const blogs: Blog[] = ${JSON.stringify(posts, null, 2)};
`,
  );

  console.log(`Generated ${posts.length} posts into src/data/blog.ts`);
}

await generate();
