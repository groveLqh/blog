import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOC_DIR = path.join(ROOT, 'doc');
const DIST_DIR = path.join(ROOT, 'dist');
const SITE = {
  title: '饮水的博客',
  description: '记录技术、产品、组织与自我认知的持续演化。',
  author: '饮水',
  repoPath: 'doc',
  githubUrl: process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : '',
};

const CATEGORY_INTROS = {
  '技术与系统': '拆解 Agent、AI Coding、系统架构与工程实践。',
  '产品与平台': '思考 AI Native 产品、数字员工与企业平台能力。',
  '组织与成长': '记录技术人成长、组织协作与影响力建设。',
  '产业与资本': '理解 AI 基础设施与产业结构变化。',
  '认知演化': '沉淀长期观察、个人判断与认知变化。',
  'AI 观察': '观察 AI 技术扩散、需求创造与社会影响。',
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const slugify = (value) => encodeURIComponent(
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/-+/g, '-')
);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseFrontmatter(source) {
  if (!source.startsWith('---')) return { data: {}, content: source };
  const end = source.indexOf('\n---', 3);
  if (end === -1) return { data: {}, content: source };
  const raw = source.slice(3, end).trim();
  const content = source.slice(end + 4).trimStart();
  const data = {};
  let currentKey = null;

  for (const line of raw.split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      data[currentKey] = Array.isArray(data[currentKey]) ? data[currentKey] : [];
      data[currentKey].push(listItem[1].trim());
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      const value = pair[2].trim();
      data[currentKey] = value || [];
    }
  }

  return { data, content };
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function inlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = null;
  let blockquote = [];
  let code = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      html.push(`<${list.type}>${list.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  };
  const flushQuote = () => {
    if (blockquote.length) {
      html.push(`<blockquote>${blockquote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join('')}</blockquote>`);
      blockquote = [];
    }
  };

  for (const line of lines) {
    const fence = line.match(/^```\s*(.*)$/);
    if (fence) {
      if (code) {
        html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
        code = null;
      } else {
        flushParagraph(); flushList(); flushQuote();
        code = { lang: fence[1], lines: [] };
      }
      continue;
    }
    if (code) {
      code.lines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph(); flushList(); flushQuote();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList(); flushQuote();
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${slugify(text)}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(); flushList();
      blockquote.push(quote[1]);
      continue;
    }
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph(); flushQuote();
      const type = unordered ? 'ul' : 'ol';
      if (!list || list.type !== type) flushList();
      list = list || { type, items: [] };
      list.items.push((unordered || ordered)[1]);
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushQuote();
  if (code) html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
  return html.join('\n');
}

function formatDate(date) {
  if (!date) return '未标注日期';
  return date;
}

function pageShell({ title, description = SITE.description, content, canonical = './', extraClass = '' }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · ${escapeHtml(SITE.title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="${extraClass}">
  <header class="site-header">
    <a class="brand" href="/">
      <span class="brand-mark">饮</span>
      <span><strong>${SITE.title}</strong><small>${SITE.description}</small></span>
    </a>
    <nav aria-label="主导航">
      <a href="/#articles">文章</a>
      <a href="/#categories">分类</a>
      <a href="/feed.xml">RSS</a>
      ${SITE.githubUrl ? `<a href="${SITE.githubUrl}" rel="noreferrer">GitHub</a>` : ''}
    </nav>
  </header>
  ${content}
  <footer class="site-footer">
    <p>© ${new Date().getFullYear()} ${SITE.author}. Built from Markdown and deployed by GitHub Actions.</p>
  </footer>
</body>
</html>`;
}

function articleCard(article) {
  return `<article class="card">
    <a class="card-link" href="/${article.outputPath}">
      <p class="eyebrow">${escapeHtml(article.category)} · ${formatDate(article.date)}</p>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(article.summary)}</p>
      <div class="tags">${article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    </a>
  </article>`;
}

async function loadArticles() {
  const files = await walk(DOC_DIR);
  const articles = [];
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { data, content } = parseFrontmatter(raw);
    const rel = path.relative(ROOT, file);
    const base = path.basename(file, '.md');
    if (base.toLowerCase() === 'readme' && !data.title) continue;

    const category = data.category || (Array.isArray(data.categories) ? data.categories[0] : data.categories) || path.basename(path.dirname(file));
    const title = data.title || firstHeading(content) || base;
    const summary = data.summary || stripMarkdown(content).slice(0, 120) + '…';
    const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
    const date = data.updated || data.date || '';
    const slug = `${slugify(category)}-${slugify(base)}`;

    articles.push({ rel, file, category, title, summary, tags, date, content, slug, outputPath: `posts/${slug}.html` });
  }
  return articles.sort((a, b) => String(b.date).localeCompare(String(a.date), 'zh-CN'));
}

function buildIndex(articles) {
  const categories = [...new Set(articles.map((article) => article.category))];
  const featured = articles.slice(0, 3);
  const content = `<main>
    <section class="hero">
      <div>
        <p class="eyebrow">AI · 产品 · 技术组织 · 产业观察</p>
        <h1>把技术问题，写成理解产品、组织与自己的线索。</h1>
        <p class="hero-copy">${SITE.description} 很多文章从技术开始，最终却在讨论产品、组织与人。</p>
        <div class="hero-actions"><a class="button" href="#articles">开始阅读</a>${SITE.githubUrl ? `<a class="button secondary" href="${SITE.githubUrl}">查看源码</a>` : ''}</div>
      </div>
      <aside class="hero-panel">
        <strong>${articles.length}</strong>
        <span>篇文章已归档</span>
        <small>持续更新 Markdown，自动发布到 GitHub Pages。</small>
      </aside>
    </section>

    <section class="section" aria-labelledby="featured-title">
      <div class="section-heading"><p class="eyebrow">Featured</p><h2 id="featured-title">最新文章</h2></div>
      <div class="grid featured-grid">${featured.map(articleCard).join('')}</div>
    </section>

    <section class="section" id="categories" aria-labelledby="categories-title">
      <div class="section-heading"><p class="eyebrow">Topics</p><h2 id="categories-title">分类主线</h2></div>
      <div class="category-grid">${categories.map((category) => {
        const count = articles.filter((article) => article.category === category).length;
        return `<a class="category" href="#${slugify(category)}"><strong>${escapeHtml(category)}</strong><span>${escapeHtml(CATEGORY_INTROS[category] || '持续沉淀相关主题文章。')}</span><em>${count} 篇</em></a>`;
      }).join('')}</div>
    </section>

    <section class="section" id="articles" aria-labelledby="articles-title">
      <div class="section-heading"><p class="eyebrow">Archive</p><h2 id="articles-title">全部文章</h2></div>
      ${categories.map((category) => `<div class="archive-group" id="${slugify(category)}"><h3>${escapeHtml(category)}</h3><div class="grid">${articles.filter((article) => article.category === category).map(articleCard).join('')}</div></div>`).join('')}
    </section>
  </main>`;
  return pageShell({ title: '首页', content, canonical: '/', extraClass: 'home' });
}

function buildArticle(article) {
  const content = `<main class="article-layout">
    <article class="article">
      <a class="back-link" href="/">← 返回首页</a>
      <header class="article-header">
        <p class="eyebrow">${escapeHtml(article.category)} · ${formatDate(article.date)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p>${escapeHtml(article.summary)}</p>
        <div class="tags">${article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      </header>
      <div class="prose">${renderMarkdown(article.content)}</div>
      <footer class="article-source">原始 Markdown：<code>${escapeHtml(article.rel)}</code></footer>
    </article>
  </main>`;
  return pageShell({ title: article.title, description: article.summary, content, canonical: `/${article.outputPath}`, extraClass: 'article-page' });
}

function buildFeed(articles) {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE.title)}</title>
    <description>${escapeHtml(SITE.description)}</description>
    <link>/</link>
    ${articles.map((article) => `<item><title>${escapeHtml(article.title)}</title><description>${escapeHtml(article.summary)}</description><link>/${article.outputPath}</link><guid>/${article.outputPath}</guid><pubDate>${article.date || ''}</pubDate></item>`).join('\n    ')}
  </channel>
</rss>`;
}

async function copyStatic() {
  await mkdir(path.join(DIST_DIR, 'assets'), { recursive: true });
  await writeFile(path.join(DIST_DIR, 'assets', 'styles.css'), CSS);
  await writeFile(path.join(DIST_DIR, '.nojekyll'), '');
  await writeFile(path.join(DIST_DIR, '404.html'), pageShell({ title: '未找到页面', content: '<main class="not-found"><h1>404</h1><p>这个页面暂时不存在。</p><a class="button" href="/">返回首页</a></main>' }));
}

async function build() {
  const articles = await loadArticles();
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(path.join(DIST_DIR, 'posts'), { recursive: true });
  await copyStatic();
  await writeFile(path.join(DIST_DIR, 'index.html'), buildIndex(articles));
  await writeFile(path.join(DIST_DIR, 'feed.xml'), buildFeed(articles));
  for (const article of articles) {
    await writeFile(path.join(DIST_DIR, article.outputPath), buildArticle(article));
  }
  console.log(`Built ${articles.length} articles into dist/`);
}

const CSS = `:root{color-scheme:light;--bg:#f7f3eb;--surface:#fffaf2;--ink:#1f1a17;--muted:#756b60;--line:#e5d8c8;--accent:#9b4d2d;--accent-dark:#6d321f;--card:#fffdf8;--shadow:0 24px 80px rgba(89,57,32,.12)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#fff7e7 0,#f7f3eb 36rem);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;line-height:1.75}.site-header{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1rem clamp(1rem,4vw,4rem);border-bottom:1px solid rgba(229,216,200,.7);backdrop-filter:blur(16px);background:rgba(247,243,235,.82)}.brand{display:flex;align-items:center;gap:.8rem;color:inherit;text-decoration:none}.brand-mark{display:grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:1rem;background:var(--ink);color:#fff;font-weight:800}.brand small{display:block;color:var(--muted);font-size:.8rem}.site-header nav{display:flex;gap:1rem;flex-wrap:wrap}.site-header nav a,.back-link{color:var(--muted);text-decoration:none}.site-header nav a:hover,.back-link:hover{color:var(--accent)}main{width:min(1120px,calc(100% - 2rem));margin:auto}.hero{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:2rem;align-items:center;padding:6rem 0 4rem}.eyebrow{margin:0 0 .6rem;color:var(--accent);font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.hero h1{margin:0;max-width:820px;font-size:clamp(2.4rem,7vw,5.6rem);line-height:1.04;letter-spacing:-.08em}.hero-copy{max-width:680px;color:var(--muted);font-size:1.15rem}.hero-actions{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:2rem}.button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:.8rem 1.25rem;background:var(--accent);color:#fff;text-decoration:none;font-weight:700}.button.secondary{background:transparent;color:var(--accent);border:1px solid var(--line)}.hero-panel{padding:2rem;border:1px solid var(--line);border-radius:2rem;background:linear-gradient(145deg,#fffdf8,#f6eadb);box-shadow:var(--shadow)}.hero-panel strong{display:block;font-size:4rem;line-height:1}.hero-panel span{display:block;font-size:1.2rem;font-weight:800}.hero-panel small{color:var(--muted)}.section{padding:2rem 0 4rem}.section-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:1.2rem}.section-heading h2{margin:0;font-size:2rem}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.card{border:1px solid var(--line);border-radius:1.4rem;background:var(--card);box-shadow:0 12px 40px rgba(89,57,32,.07);transition:.2s ease}.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}.card-link{display:block;height:100%;padding:1.25rem;color:inherit;text-decoration:none}.card h3{margin:.2rem 0 .7rem;font-size:1.25rem;line-height:1.35}.card p:not(.eyebrow){color:var(--muted);margin:.2rem 0 1rem}.tags{display:flex;flex-wrap:wrap;gap:.45rem}.tags span{border:1px solid var(--line);border-radius:999px;padding:.15rem .55rem;color:var(--muted);font-size:.78rem;background:#fffaf4}.category-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.category{display:grid;gap:.25rem;padding:1.25rem;border:1px solid var(--line);border-radius:1.3rem;background:#fffaf4;color:inherit;text-decoration:none}.category strong{font-size:1.2rem}.category span{color:var(--muted)}.category em{color:var(--accent);font-style:normal;font-weight:800}.archive-group{scroll-margin-top:7rem;margin-top:2rem}.archive-group>h3{font-size:1.5rem}.article-layout{width:min(880px,calc(100% - 2rem));padding:3rem 0}.article{padding:clamp(1.2rem,4vw,3rem);border:1px solid var(--line);border-radius:2rem;background:var(--surface);box-shadow:var(--shadow)}.article-header{padding:2rem 0;border-bottom:1px solid var(--line);margin-bottom:2rem}.article-header h1{margin:.3rem 0 1rem;font-size:clamp(2rem,5vw,3.8rem);line-height:1.12;letter-spacing:-.05em}.article-header p:not(.eyebrow){color:var(--muted);font-size:1.08rem}.prose{font-size:1.05rem}.prose h1,.prose h2,.prose h3,.prose h4{line-height:1.3;margin:2.2rem 0 .8rem}.prose h1{font-size:2.2rem}.prose h2{font-size:1.65rem;border-bottom:1px solid var(--line);padding-bottom:.35rem}.prose p{margin:1rem 0}.prose a{color:var(--accent-dark);font-weight:700}.prose blockquote{margin:1.4rem 0;padding:1rem 1.2rem;border-left:4px solid var(--accent);background:#fff5e8;border-radius:.8rem;color:#584438}.prose pre{overflow:auto;padding:1rem;border-radius:1rem;background:#221a16;color:#fff7ef}.prose code{font-family:"SFMono-Regular",Consolas,monospace}.prose :not(pre)>code{padding:.1rem .35rem;border-radius:.35rem;background:#f1e2d0;color:#7e351f}.prose img{max-width:100%;border-radius:1rem}.article-source{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}.site-footer{padding:2rem 1rem;text-align:center;color:var(--muted)}.not-found{min-height:55vh;display:grid;place-items:center;text-align:center}@media (max-width:860px){.site-header{position:static;align-items:flex-start;flex-direction:column}.hero{grid-template-columns:1fr;padding:3rem 0}.grid,.category-grid{grid-template-columns:1fr}.section-heading{display:block}}`;

await build();

if (process.argv.includes('--watch')) {
  console.log('Watching doc/ and README.md. Run npm run serve in another terminal to preview.');
  const rebuild = debounce(() => build().catch((error) => console.error(error)), 200);
  watch(DOC_DIR, { recursive: true }, rebuild);
  if (existsSync(path.join(ROOT, 'README.md'))) watch(path.join(ROOT, 'README.md'), rebuild);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
