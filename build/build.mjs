// Builds website/data/portfolio.js + website/content/** from the four project folders.
// Usage:  cd website/build && npm install && node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { marked } = require("marked");
import GithubSlugger from "github-slugger";
const hljs = require("highlight.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const ROOT = path.resolve(SITE, "..");
const OUT_CONTENT = path.join(SITE, "content");
const OUT_DATA = path.join(SITE, "data");

/* ------------------------------------------------------------------ */
/* Project metadata (display info; all content comes from the folders) */
/* ------------------------------------------------------------------ */
const PROJECTS = [
  {
    folder: "ProductManagementPortfolio-main",
    slug: "b2b-saas",
    index: "01",
    name: "B2B SaaS Lifecycle",
    originalTitle: "Product Management Portfolio",
    kicker: "B2B SaaS · Frameworks · Agile delivery",
    tagline: "End-to-end product lifecycle for a B2B SaaS project-management platform — PRDs, personas, wireframes, metrics dashboards and sprint tooling.",
    author: "Yogesh",
    authorNote: "",
    accent: "#fbbf24",
    accent2: "#f97316",
    tags: ["PRD", "Personas", "Wireframes", "NPS", "Burndown", "Kanban", "5 Whys"],
    links: [],
  },
  {
    folder: "moneyflow-product-management-main",
    slug: "moneyflow",
    index: "02",
    name: "MoneyFlow",
    originalTitle: "MoneyFlow — Personal Finance Product Strategy & Launch",
    kicker: "FinTech · Discovery → Strategy → MVP → GTM",
    tagline: "A privacy-first personal finance product taken from discovery to a working MVP that turns transactions into clear, explainable actions.",
    author: "Yogesh",
    authorNote: "",
    accent: "#2dd4bf",
    accent2: "#22d3ee",
    tags: ["JTBD", "RICE", "PRD", "North Star", "GTM", "Experimentation", "Risk"],
    app: { label: "Launch the MoneyFlow MVP", route: "#/moneyflow" },
    links: [],
  },
  {
    folder: "product-management-portfolio-main",
    slug: "product-thinking",
    index: "03",
    name: "Product Thinking Lab",
    originalTitle: "Product Management Portfolio",
    kicker: "Teardowns · PRDs · Strategy",
    tagline: "Product teardowns of YouTube and Swiggy, PRDs for an AI Learning Copilot and Smart Trip Planner, and a retention strategy case.",
    author: "Yogesh",
    authorNote: "",
    accent: "#f472b6",
    accent2: "#c084fc",
    tags: ["Teardowns", "AI PRD", "Personalization", "Retention", "A/B Tests", "Growth loops"],
    links: [],
  },
  {
    folder: "product-manager-portfolio-main",
    slug: "case-studies",
    index: "04",
    name: "Six Case Studies",
    originalTitle: "Product Manager Portfolio",
    kicker: "Conversion · Adoption · Marketplace · Pricing · Churn · Journeys",
    tagline: "Six end-to-end PM case studies with PRDs, wireframes, SQL, Python, dashboards, Jira artifacts and interactive prototypes.",
    author: "Yogesh",
    authorNote: "",
    accent: "#38bdf8",
    accent2: "#818cf8",
    tags: ["SQL", "Python", "Power BI", "Tableau", "Jira", "Prototypes", "Release gates"],
    links: [],
  },
];

const EXCLUDE_DIRS = new Set([".git", ".github", "node_modules", "__pycache__", ".venv", "venv"]);
const EXCLUDE_FILES = new Set([".gitignore", ".DS_Store", "Thumbs.db"]);
const LICENSE_FILE_RE = /^licen[cs]e(\..+)?$/i;

const UNWANTED_HEADING_RE = /\b(licen[cs]e|authors?|contacts?|get in touch|connect|social|external links|credits?|about the author)\b/i;

const AUTHOR_PATTERNS = [
  /\bAbhishek\s+Kumar\s+Gond\b/gi,
  /\babhi-iitg\b/gi,
  /\bSabavat\s+Manoj\b/gi,
  /\bJamie\s+Christian\s+II\b/gi,
  /\bJamie\s+Christian\b/gi,
  /\bJamieChristian22\b/gi,
  /\bfarhansadeed\b/gi,
  /\bFarhan\s+Sadeed\b/gi,
];

const REMOVE_LINE_PATTERNS = [
  /^\s*#{0,6}\s*licen[cs]e\b.*$/i,
  /released under the\b.*licen[cs]e/i,
  /\b(mit|apache|gnu|gpl|bsd|isc|cc-by)\s+licen[cs]e\b/i,
  /\blicen[cs]ed under\b/i,
  /\ball rights reserved\b/i,
  /\bcopyright\s*(©|\(c\))?/i,
  /b\.?\s*tech\b.*iit\s+guwahati/i,
  /\biit\s+guwahati\b/i,
  /^\s*(\*\*)?author(\*\*)?\s*:?\s*$/i,
  /^\s*[-*]?\s*(\*\*)?(author|created by|maintained by|contact|email|linkedin|github|twitter|portfolio|website)(\*\*)?\s*:/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(mailto:|tel:|linkedin\.com|github\.com|twitter\.com|x\.com|streamlit\.app)\b/i,
];

const KIND_BY_EXT = {
  md: "doc",
  pdf: "pdf",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image",
  csv: "csv",
  sql: "code", py: "code", json: "code", yml: "code", yaml: "code", txt: "code", js: "code", "": "code",
  html: "prototype",
  xlsx: "office", docx: "office", pptx: "office",
  pbix: "dashboard", twbx: "dashboard",
};
const LANG_BY_EXT = { sql: "sql", py: "python", json: "json", yml: "yaml", yaml: "yaml", js: "javascript", txt: "plaintext", "": "plaintext" };

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
const posix = path.posix;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const extOf = (p) => { const b = posix.basename(p); const i = b.lastIndexOf("."); return i > 0 ? b.slice(i + 1).toLowerCase() : ""; };

function stripUnwantedSections(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let skipLevel = null;
  for (const line of lines) {
    // Match markdown headings with or without space after # (e.g. "#License" or "## Author")
    const m = line.match(/^\s*(#{1,6})\s*(.+?)\s*$/);
    if (m) {
      const level = m[1].length;
      const headingText = stripMd(m[2]);
      if (UNWANTED_HEADING_RE.test(headingText)) {
        skipLevel = level;
        continue;
      }
      if (skipLevel !== null && level <= skipLevel) {
        skipLevel = null;
      }
    }
    if (skipLevel === null) out.push(line);
  }
  return out.join("\n");
}

function cleanContent(md) {
  let out = stripUnwantedSections(md);
  // Remove standalone "Author\n<name>\n<bio>" blocks even without '#'
  out = out.replace(/^\s*(?:\*\*)?Author(?:\*\*)?\s*\r?\n(?:[^\r\n]+\r?\n?){1,3}/gim, "");
  // Filter out license, contact, bio, and external-profile lines
  out = out
    .split(/\r?\n/)
    .filter((line) => !REMOVE_LINE_PATTERNS.some((re) => re.test(line)))
    .join("\n");
  // Replace any remaining author names/handles with Yogesh
  for (const re of AUTHOR_PATTERNS) {
    out = out.replace(re, "Yogesh");
  }
  // Remove raw bare external URLs (http/https) left in prose
  out = out.replace(/https?:\/\/[^\s)>"']+/gi, "");
  return out;
}

function walk(dir, base = "") {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      out.push(...walk(path.join(dir, ent.name), rel));
    } else if (ent.isFile()) {
      if (EXCLUDE_FILES.has(ent.name) || LICENSE_FILE_RE.test(ent.name)) continue;
      out.push(rel);
    }
  }
  return out;
}

function sanitizeSegment(seg) {
  const ext = extOf(seg);
  let stem = ext ? seg.slice(0, -(ext.length + 1)) : seg;
  stem = stem.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  if (!stem) stem = "file";
  return ext ? `${stem}.${ext}` : stem;
}

function prettify(seg) {
  const s = seg.replace(/\.md$/i, "");
  const m = s.match(/^(\d{1,2})[-_ ](.*)$/);
  const words = (m ? m[2] : s).replace(/[_-]+/g, " ").trim();
  const ACR = { prd: "PRD", prds: "PRDs", ux: "UX", ai: "AI", saas: "SaaS", kpi: "KPI", mvp: "MVP", gtm: "GTM", jtbd: "JTBD", sql: "SQL", csv: "CSV" };
  const titled = words.split(" ").map((w) => ACR[w.toLowerCase()] || w.replace(/^([a-z])/, (c) => c.toUpperCase())).join(" ");
  return m ? `${m[1]} · ${titled}` : titled;
}

const naturalCmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function stripMd(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.length > 1 || row[0] !== "") rows.push(row); }
  return rows;
}

function highlight(code, lang) {
  try {
    if (lang && hljs.getLanguage(lang) && lang !== "plaintext" && lang !== "text") {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
  } catch { /* fall through */ }
  return esc(code);
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */
fs.rmSync(OUT_CONTENT, { recursive: true, force: true });
fs.mkdirSync(OUT_CONTENT, { recursive: true });
fs.mkdirSync(OUT_DATA, { recursive: true });

const report = { broken: [], copied: 0, bytes: 0 };
const result = { generated: new Date().toISOString(), projects: [] };

for (const meta of PROJECTS) {
  const srcRoot = path.join(ROOT, meta.folder);
  if (!fs.existsSync(srcRoot)) throw new Error(`Missing project folder: ${srcRoot}`);
  const all = walk(srcRoot).sort(naturalCmp);

  // Directory set (for directory links)
  const dirs = new Set([""]);
  for (const f of all) { let d = posix.dirname(f); while (d && d !== ".") { dirs.add(d); d = posix.dirname(d); } }

  // ---- files (non-markdown) ----
  const files = [];
  const fileMap = new Map();
  const usedOut = new Set();
  for (const rel of all) {
    const ext = extOf(rel);
    if (ext === "md") continue;
    const kind = KIND_BY_EXT[ext] || "download";
    let outRel = rel.split("/").map(sanitizeSegment).join("/");
    while (usedOut.has(outRel.toLowerCase())) outRel = outRel.replace(/(\.[^./]+)?$/, (m) => `-1${m}`);
    usedOut.add(outRel.toLowerCase());
    const srcAbs = path.join(srcRoot, ...rel.split("/"));
    const dstAbs = path.join(OUT_CONTENT, meta.slug, ...outRel.split("/"));
    fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
    fs.copyFileSync(srcAbs, dstAbs);
    const size = fs.statSync(srcAbs).size;
    report.copied++; report.bytes += size;
    const url = `content/${meta.slug}/${outRel}`;
    const entry = { path: rel, name: posix.basename(rel).trim(), dir: posix.dirname(rel) === "." ? "" : posix.dirname(rel), ext, kind, size, url };
    if ((kind === "code" || kind === "csv") && size < 400_000) {
      const text = fs.readFileSync(srcAbs, "utf8").replace(/^\uFEFF/, "");
      if (kind === "csv") {
        const rows = parseCsv(text);
        entry.csv = { header: rows[0] || [], rows: rows.slice(1, 301), total: Math.max(rows.length - 1, 0) };
      } else {
        let code = text;
        if (ext === "json") { try { code = JSON.stringify(JSON.parse(text), null, 2); } catch { /* keep raw */ } }
        entry.code = highlight(code, LANG_BY_EXT[ext] || "plaintext");
        entry.lang = LANG_BY_EXT[ext] || "plaintext";
        entry.lines = code.split("\n").length;
      }
    }
    files.push(entry);
    fileMap.set(rel, entry);
  }

  // ---- docs (markdown) ----
  // skip empty markdown files (some folders contain blank README.md placeholders)
  const mdPaths = all.filter((p) => extOf(p) === "md" && fs.readFileSync(path.join(srcRoot, ...p.split("/")), "utf8").trim().length > 0);
  const docSet = new Set(mdPaths);
  const lowerDoc = new Map(mdPaths.map((p) => [p.toLowerCase(), p]));
  const lowerFile = new Map([...fileMap.keys()].map((p) => [p.toLowerCase(), p]));
  const lowerDirs = new Map([...dirs].map((d) => [d.toLowerCase(), d]));

  const docRoute = (p, anchor) => `#/p/${meta.slug}/doc/${encodeURIComponent(p)}${anchor ? `?h=${encodeURIComponent(anchor)}` : ""}`;
  const fileRoute = (p) => `#/p/${meta.slug}/file/${encodeURIComponent(p)}`;
  const dirRoute = (d) => `#/p/${meta.slug}/files?dir=${encodeURIComponent(d)}`;

  function resolve(docDir, raw, docPath) {
    let href = raw.trim().replace(/^<|>$/g, "").replace(/&amp;/g, "&");
    if (/^(https?:|mailto:|tel:|data:)/i.test(href)) return { type: "external", href };
    let hash = "";
    const hi = href.indexOf("#");
    if (hi >= 0) { hash = href.slice(hi + 1); href = href.slice(0, hi); }
    try { href = decodeURIComponent(href); } catch { /* keep */ }
    try { hash = decodeURIComponent(hash); } catch { /* keep */ }
    if (!href) return hash ? { type: "anchor", anchor: hash } : { type: "broken" };
    let target = href.startsWith("/") ? posix.normalize(href.slice(1)) : posix.normalize(posix.join(docDir, href));
    target = target.replace(/\/+$/, "").replace(/^\.\/?/, "");
    if (target.startsWith("..")) return { type: "broken" };
    const asDoc = docSet.has(target) ? target : lowerDoc.get(target.toLowerCase());
    if (asDoc) return { type: "doc", path: asDoc, anchor: hash };
    const asFile = fileMap.has(target) ? target : lowerFile.get(target.toLowerCase());
    if (asFile) return { type: "file", path: asFile, entry: fileMap.get(asFile) };
    const asDir = dirs.has(target) ? target : lowerDirs.get(target.toLowerCase());
    if (asDir !== undefined) {
      const readme = mdPaths.find((p) => p.toLowerCase() === (asDir ? `${asDir}/readme.md` : "readme.md").toLowerCase());
      if (readme) return { type: "doc", path: readme, anchor: hash };
      return { type: "dir", path: asDir };
    }
    report.broken.push(`${meta.folder}/${docPath} -> ${raw}`);
    return { type: "broken" };
  }

  function rewriteHtml(html, docPath) {
    const docDir = posix.dirname(docPath) === "." ? "" : posix.dirname(docPath);
    // images (remove external badge/profile images, keep local project images)
    html = html.replace(/<img\b([^>]*?)\bsrc="([^"]*)"([^>]*)>/gi, (m, a, src, b) => {
      const r = resolve(docDir, src, docPath);
      if (r.type === "external") return "";
      if (r.type === "file") return `<img${a}src="${esc(r.entry.url)}"${b} loading="lazy" data-zoom="1">`;
      return `<span class="md-missing">[image unavailable]</span>`;
    });
    // links — strip every external/contact/license link completely (unwrap plain text if meaningful)
    html = html.replace(/<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi, (m, a, href, b, inner) => {
      const rest = `${a}${b}`.replace(/\s*target="[^"]*"/g, "").replace(/\s*rel="[^"]*"/g, "");
      const r = resolve(docDir, href, docPath);
      switch (r.type) {
        case "external": {
          const text = stripMd(inner);
          if (!text || /^(https?:|mailto:|tel:|github|linkedin|twitter|email|contact|licen[cs]e|mit|streamlit|portfolio)/i.test(text)) return "";
          return text;
        }
        case "anchor": return `<a${rest} href="${esc(docRoute(docPath, r.anchor))}" data-anchor="${esc(r.anchor)}">${inner}</a>`;
        case "doc": return `<a${rest} href="${esc(docRoute(r.path, r.anchor))}">${inner}</a>`;
        case "file": return `<a${rest} href="${esc(fileRoute(r.path))}">${inner}</a>`;
        case "dir": return `<a${rest} href="${esc(dirRoute(r.path))}">${inner}</a>`;
        default: {
          if (/licen[cs]e/i.test(href)) return "";
          return `<a${rest} class="md-broken" title="This link points to a file that is not in the project folder" tabindex="-1">${inner}</a>`;
        }
      }
    });
    return html;
  }

  const docs = [];
  for (const p of mdPaths) {
    const rawSrc = fs.readFileSync(path.join(srcRoot, ...p.split("/")), "utf8").replace(/^\uFEFF/, "");
    const src = cleanContent(rawSrc);
    const slugger = new GithubSlugger();
    const headings = [];
    let title = "";
    const renderer = new marked.Renderer();
    renderer.heading = (text, level, raw) => {
      const id = slugger.slug(raw);
      const plain = stripMd(text).replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      if (!title && level <= 2) title = plain;
      if (level >= 2 && level <= 3) headings.push({ id, text: plain, level });
      return `<h${level} id="md-${esc(id)}"><a class="h-anchor" href="#${esc(id)}" aria-hidden="true">#</a>${text}</h${level}>\n`;
    };
    renderer.code = (code, lang) => {
      const l = (lang || "").trim().split(/\s+/)[0].toLowerCase();
      const label = l && l !== "text" ? l : "";
      return `<div class="code-block"${label ? ` data-lang="${esc(label)}"` : ""}><button class="copy-btn" type="button">Copy</button><pre><code class="hljs">${highlight(code, l === "sh" ? "bash" : l)}</code></pre></div>\n`;
    };
    renderer.table = (header, body) => `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
    let html = marked.parse(src, { renderer, gfm: true, breaks: false, async: false });
    html = rewriteHtml(html, p);
    if (!title) title = prettify(posix.basename(p));
    title = title.replace(/\s+-{2,3}\s+/g, " — ");
    const dir = posix.dirname(p) === "." ? "" : posix.dirname(p);
    const top = dir.split("/")[0] || "";
    const words = stripMd(src).split(" ").length;
    docs.push({ path: p, title, group: top, html, headings, words, isReadme: /^readme\.md$/i.test(posix.basename(p)) });
  }

  // order: root README first, then natural by path with READMEs first inside each dir
  docs.sort((a, b) => {
    if (a.path.toLowerCase() === "readme.md") return -1;
    if (b.path.toLowerCase() === "readme.md") return 1;
    if (a.group !== b.group) { if (!a.group) return -1; if (!b.group) return 1; return naturalCmp(a.group, b.group); }
    const da = posix.dirname(a.path), db = posix.dirname(b.path);
    if (da === db) { if (a.isReadme !== b.isReadme) return a.isReadme ? -1 : 1; return naturalCmp(a.path, b.path); }
    return naturalCmp(a.path, b.path);
  });

  // groups
  const groups = [];
  for (const d of docs) {
    let g = groups.find((x) => x.key === d.group);
    if (!g) { g = { key: d.group, label: d.group ? prettify(d.group) : "Overview", docs: [] }; groups.push(g); }
    g.docs.push(d.path);
  }

  // sections: sub-READMEs become showcase cards; else numbered top-level dirs
  const sections = [];
  const candidates = docs.filter((d) => d.isReadme && d.path.includes("/") && !/^images\//i.test(d.path));
  // only the outermost README of each sub-tree (avoid nested READMEs becoming extra cards)
  const subReadmes = candidates.filter((d) => !candidates.some((o) => o !== d && d.path.startsWith(posix.dirname(o.path) + "/")));
  for (const d of subReadmes) {
    const dir = posix.dirname(d.path);
    const srcMd = cleanContent(fs.readFileSync(path.join(srcRoot, ...d.path.split("/")), "utf8"));
    const para = srcMd.split(/\n\s*\n/)
      .map((s) => s.split("\n").filter((l) => !/^\s*#/.test(l)).join(" ").trim())
      .find((s) => s.length > 60 && !/^(!\[|---|\||>|<|```|\*\*(Focus|Status|Author)|\[|[-*] )/.test(s) && !/Author:/.test(s)) || "";
    const imgs = files.filter((f) => f.kind === "image" && (f.dir === dir || f.dir.startsWith(dir + "/")));
    const preferred = imgs.find((f) => /results_snapshot/i.test(f.name)) || imgs.find((f) => f.dir === `${dir}/assets`) || imgs.find((f) => f.dir === dir) || imgs[0];
    const proto = files.find((f) => f.kind === "prototype" && f.path.startsWith(dir + "/"));
    const prd = files.find((f) => /prd/i.test(f.name) && f.kind === "pdf" && f.path.startsWith(dir + "/"));
    sections.push({
      title: d.title.replace(/^[^\w(]+/u, "").trim(),
      emoji: (d.title.match(/^\p{Extended_Pictographic}/u) || [""])[0],
      dir,
      kicker: prettify(dir.split("/")[0]),
      excerpt: stripMd(para).slice(0, 230),
      doc: d.path,
      image: preferred ? preferred.url : null,
      prototype: proto ? proto.path : null,
      prd: prd ? prd.path : null,
      docCount: docs.filter((x) => x.path.startsWith(dir + "/")).length,
      fileCount: files.filter((x) => x.path.startsWith(dir + "/")).length,
    });
  }
  if (!sections.length) {
    for (const g of groups) {
      if (!/^\d/.test(g.key)) continue;
      const first = docs.find((d) => d.group === g.key);
      sections.push({ title: g.label.replace(/^\d+ · /, ""), dir: g.key, kicker: `Stage ${g.label.split(" · ")[0]}`, excerpt: g.docs.map((p) => docs.find((d) => d.path === p).title).join(" · "), doc: first.path, image: null, docCount: g.docs.length, fileCount: 0 });
    }
  }

  const readme = docs.find((d) => d.path.toLowerCase() === "readme.md");
  const rootReadme = readme ? cleanContent(fs.readFileSync(path.join(srcRoot, "README.md"), "utf8")) : "";
  const counts = {
    docs: docs.length,
    files: files.length,
    pdf: files.filter((f) => f.kind === "pdf").length,
    image: files.filter((f) => f.kind === "image").length,
    prototype: files.filter((f) => f.kind === "prototype").length,
    data: files.filter((f) => f.kind === "csv" || f.kind === "code").length,
    words: docs.reduce((s, d) => s + d.words, 0),
  };
  const cover = files.find((f) => /dashboard_overview|moneyflow-dashboard|MetricsDasboardDesign/i.test(f.name)) || files.find((f) => f.kind === "image" && f.ext !== "svg");

  result.projects.push({
    ...meta,
    readme: readme ? readme.path : docs[0]?.path,
    cover: cover ? cover.url : null,
    counts,
    groups,
    sections,
    docs,
    files,
    hasReadmeImages: /!\[/.test(rootReadme),
  });
  console.log(`✔ ${meta.folder}: ${docs.length} docs, ${files.length} files`);
}

const totals = result.projects.reduce((t, p) => {
  for (const [k, v] of Object.entries(p.counts)) t[k] = (t[k] || 0) + v;
  return t;
}, {});
result.totals = totals;

const js = `/* Generated by build/build.mjs — do not edit by hand. */
window.PORTFOLIO = ${JSON.stringify(result)};
`;
fs.writeFileSync(path.join(OUT_DATA, "portfolio.js"), js);

console.log(`\nCopied ${report.copied} files (${(report.bytes / 1048576).toFixed(1)} MB).`);
console.log("Totals:", totals);
if (report.broken.length) {
  console.log(`\n⚠ ${report.broken.length} link(s) in the source docs point to files that do not exist in the folders:`);
  for (const b of report.broken) console.log("   " + b);
}