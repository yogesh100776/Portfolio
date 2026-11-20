/* =====================================================================
   PM MULTIVERSE — application (router + views)
   ===================================================================== */
(function () {
  "use strict";

  const DATA = window.PORTFOLIO;
  const app = document.getElementById("app");
  if (!DATA || !app) {
    if (app) app.innerHTML = '<div class="nf"><div><h1 class="h-display h-lg">Data missing</h1><p class="lead">Run <code>node build/build.mjs</code> to generate <code>data/portfolio.js</code>.</p></div></div>';
    return;
  }

  /* ------------------------------------------------------------------ */
  /* Helpers & indexes                                                    */
  /* ------------------------------------------------------------------ */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const DEFAULT_ACCENT = ["#a78bfa", "#22d3ee"];
  const PROJECTS = DATA.projects;
  const P = {};
  for (const p of PROJECTS) {
    P[p.slug] = p;
    p.docMap = new Map(p.docs.map((d) => [d.path, d]));
    p.fileMap = new Map(p.files.map((f) => [f.path, f]));
    p.groupLabel = Object.fromEntries(p.groups.map((g) => [g.key, g.label]));
  }

  const R = {
    home: "#/",
    project: (slug, tab, q) => `#/p/${slug}${tab && tab !== "overview" ? "/" + tab : ""}${q ? "?" + q : ""}`,
    doc: (slug, path, h) => `#/p/${slug}/doc/${encodeURIComponent(path)}${h ? "?h=" + encodeURIComponent(h) : ""}`,
    file: (slug, path) => `#/p/${slug}/file/${encodeURIComponent(path)}`,
    app: "#/moneyflow",
  };

  const KIND_LABEL = { pdf: "PDF", image: "Image", csv: "CSV data", code: "Code", prototype: "Interactive prototype", office: "Office file", dashboard: "BI dashboard", download: "File", doc: "Document" };
  const KIND_CHIPS = [["all", "All"], ["pdf", "PDFs"], ["image", "Images"], ["data", "Data & code"], ["prototype", "Prototypes"], ["office", "Office"], ["dashboard", "Dashboards"]];
  const kindMatch = (f, k) => k === "all" || f.kind === k || (k === "data" && (f.kind === "csv" || f.kind === "code"));

  const fmtSize = (b) => (b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + " KB" : (b / 1048576).toFixed(1) + " MB");
  const readTime = (w) => Math.max(1, Math.round(w / 220)) + " min read";
  const initials = (n) => n.replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "?";
  const ficon = (kindOrFile, ext) => {
    const k = typeof kindOrFile === "string" ? kindOrFile : kindOrFile.kind;
    const e = typeof kindOrFile === "string" ? ext : kindOrFile.ext;
    return `<span class="ficon ${k}" aria-hidden="true">${esc((e || (k === "doc" ? "md" : "txt")).slice(0, 4))}</span>`;
  };
  const prettyName = (f) => f.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  const arrow = '<span class="arrow" aria-hidden="true">→</span>';
  const searchIcon = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35"/></svg>';
  const dlIcon = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>';
  const extIcon = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ------------------------------------------------------------------ */
  /* Nav                                                                 */
  /* ------------------------------------------------------------------ */
  const navLinks = $("#nav-links");
  navLinks.innerHTML = PROJECTS.map((p) => `<a href="${R.project(p.slug)}" data-nav="${p.slug}" style="--c:${p.accent}"><i></i>${esc(p.name)}</a>`).join("") +
    `<a href="${R.app}" data-nav="moneyflow-app" style="--c:#2dd4bf"><i></i>MoneyFlow App</a>`;
  const menuBtn = $("#menu-btn");
  menuBtn.addEventListener("click", () => {
    const open = !navLinks.classList.contains("open");
    navLinks.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  function closeMenus() {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    const side = $(".r-side.open");
    side && side.classList.remove("open");
  }
  function setNavActive(key) {
    $$("[data-nav]", navLinks).forEach((a) => a.classList.toggle("active", a.dataset.nav === key));
  }

  /* ------------------------------------------------------------------ */
  /* Router                                                              */
  /* ------------------------------------------------------------------ */
  function parseHash() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw || raw === "/") return { name: "home" };
    if (raw[0] !== "/") return { name: "home", scrollTo: raw };
    const qi = raw.indexOf("?");
    const pathPart = qi >= 0 ? raw.slice(0, qi) : raw;
    const q = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : "");
    const seg = pathPart.split("/").filter(Boolean);
    if (seg[0] === "moneyflow") return { name: "moneyflow" };
    if (seg[0] === "p" && P[seg[1]]) {
      const slug = seg[1];
      const rest = seg.slice(3).join("/");
      let decoded = rest;
      try { decoded = decodeURIComponent(rest); } catch (e) { /* keep */ }
      if (seg[2] === "doc" && rest) return { name: "doc", slug, path: decoded, h: q.get("h") };
      if (seg[2] === "file" && rest) return { name: "file", slug, path: decoded };
      const tab = ["docs", "files", "gallery"].includes(seg[2]) ? seg[2] : "overview";
      return { name: "project", slug, tab, q };
    }
    return { name: "404" };
  }

  let current = null;
  let cleanup = [];
  function runCleanup() { cleanup.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } }); cleanup = []; }

  function render() {
    const r = parseHash();
    closeMenus();
    closePalette();

    // Same project page, only the tab changed → swap tab panel only
    if (r.name === "project" && current && current.name === "project" && current.slug === r.slug) {
      current = r;
      renderProjectTab(P[r.slug], r, true);
      return;
    }
    // Same doc, only anchor changed
    if (r.name === "doc" && current && current.name === "doc" && current.slug === r.slug && current.path === r.path) {
      current = r;
      if (r.h) scrollToAnchor(r.h);
      return;
    }

    runCleanup();
    current = r;
    const proj = r.slug ? P[r.slug] : null;
    if (proj) FX.setAccent(proj.accent, proj.accent2);
    else if (r.name === "moneyflow") FX.setAccent("#2dd4bf", "#22d3ee");
    else FX.setAccent(DEFAULT_ACCENT[0], DEFAULT_ACCENT[1]);

    let title = "PM Multiverse — Product Management Portfolio by Yogesh";
    try {
      switch (r.name) {
        case "home": app.innerHTML = viewHome(); setNavActive(""); break;
        case "project": app.innerHTML = viewProject(proj, r); setNavActive(proj.slug); title = `${proj.name} — PM Multiverse`; break;
        case "doc": {
          const d = proj.docMap.get(r.path);
          if (!d) { app.innerHTML = view404(); title = "Not found — PM Multiverse"; break; }
          app.innerHTML = viewDoc(proj, d); setNavActive(proj.slug); title = `${d.title} · ${proj.name}`; break;
        }
        case "file": {
          const f = proj.fileMap.get(r.path);
          if (!f) { app.innerHTML = view404(); title = "Not found — PM Multiverse"; break; }
          app.innerHTML = viewFile(proj, f); setNavActive(proj.slug); title = `${f.name} · ${proj.name}`; break;
        }
        case "moneyflow": app.innerHTML = viewMoneyFlow(); setNavActive("moneyflow-app"); title = "MoneyFlow MVP — PM Multiverse"; break;
        default: app.innerHTML = view404(); setNavActive(""); title = "Not found — PM Multiverse";
      }
    } catch (err) {
      console.error(err);
      app.innerHTML = `<div class="nf"><div><h1 class="h-display h-lg">Oops</h1><p class="lead">Something went wrong rendering this page.</p><a class="btn primary" href="#/">Back home</a></div></div>`;
    }
    document.title = title;

    // after-render hooks
    if (r.name === "project") renderProjectTab(proj, r, false);
    if (r.name === "doc" && proj.docMap.get(r.path)) afterDoc(proj, r);
    else if (r.name === "home" && r.scrollTo) { const el = document.getElementById(r.scrollTo); el ? el.scrollIntoView() : window.scrollTo(0, 0); }
    else window.scrollTo(0, 0);
    if (r.name === "home") afterHome();
    if (r.name === "file") afterFile();
    if (r.name === "moneyflow") window.MoneyFlow.mount($("#mf-root"), { toast });
    FX.refresh(app);
    FX.updateScroll && FX.updateScroll();
    app.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* HOME                                                                */
  /* ------------------------------------------------------------------ */
  const LENS = [
    ["Personas & users", /persona|jtbd|jobs to be done|customer journey|user research|voice of customer|segment/i],
    ["PRDs & requirements", /\bprd\b|requirement|user stor|acceptance|wireframe|information architecture|user flow/i],
    ["Metrics & analytics", /metric|kpi|north star|funnel|dashboard|cohort|analytics|nps|net promot/i],
    ["Roadmaps & delivery", /roadmap|release|timeline|burndown|sprint|backlog|jira|kanban|epic/i],
    ["Experiments & validation", /experiment|a\/b|hypothes|usability|validation|prototype/i],
    ["Market & competition", /competit|teardown|positioning|market|value proposition|features and forces/i],
    ["Launch & GTM", /launch|gtm|go-to-market|stakeholder|rollback|post-launch|30-60-90/i],
    ["Risk, trust & learning", /risk|privacy|trust|assumption|lessons|retro|decision log/i],
  ];
  function lensItems(re) {
    const out = [];
    for (const p of PROJECTS) {
      for (const d of p.docs) if (re.test(d.title) || re.test(d.path)) out.push({ p, title: d.title, href: R.doc(p.slug, d.path), type: d.group && p.sections.some((x) => x.image) ? p.groupLabel[d.group] : "Document" });
      for (const f of p.files) if ((f.kind === "pdf" || f.kind === "office" || f.kind === "prototype" || f.kind === "dashboard" || f.kind === "image") && (re.test(f.name) || re.test(f.dir))) out.push({ p, title: prettyName(f), href: R.file(p.slug, f.path), type: KIND_LABEL[f.kind] + (f.dir && p.sections.some((x) => x.image) ? " · " + (p.groupLabel[f.dir.split("/")[0]] || f.dir.split("/")[0]) : "") });
    }
    // interleave portfolios so every project is represented
    const buckets = PROJECTS.map((p) => out.filter((o) => o.p === p));
    const mixed = [];
    for (let i = 0; mixed.length < out.length; i++) for (const b of buckets) if (b[i]) mixed.push(b[i]);
    return mixed;
  }

  function viewHome() {
    const T = DATA.totals;
    const tags = [...new Set(PROJECTS.flatMap((p) => p.tags))];
    const marqueeWords = ["Discovery", "Strategy", ...tags, "Metrics", "Launch"];
    const lensCounts = LENS.map(([, re]) => lensItems(re).length);
    return `
    <div class="view home">
      <section class="hero wrap">
        <div class="eyebrow fade-up">${PROJECTS.length} portfolios · ${T.docs} documents · ${T.files} artifacts</div>
        <h1 class="hero-title" aria-label="Product Management Multiverse">
          <span class="line" style="--i:0"><span>Product</span></span>
          <span class="line outline" style="--i:1"><span>Management</span></span>
          <span class="line grad-line" style="--i:2"><span>Multiverse</span></span>
        </h1>
        <div class="hero-row">
          <div>
            <p class="hero-sub fade-up" style="--d:.5s">Four product-management portfolios by <b>Yogesh</b> — <b>discovery, strategy, PRDs, metrics, prototypes</b> and a <b>working fintech MVP</b> — collected into one explorable universe.</p>
            <div class="hero-cta fade-up" style="--d:.65s">
              <button class="btn primary" type="button" data-scroll="worlds" data-magnetic>Enter the multiverse ${arrow}</button>
              <button class="btn ghost" type="button" data-open-palette data-magnetic>${searchIcon} Search everything</button>
            </div>
          </div>
          <div class="hero-side fade-up" style="--d:.8s">
            ${PROJECTS.map((p) => `<a class="hero-planet" href="${R.project(p.slug)}" style="--c:${p.accent};--c2:${p.accent2}"><span class="orb"></span><span><b>${esc(p.name)}</b><small>Yogesh</small></span></a>`).join("")}
          </div>
        </div>
        <div class="scroll-cue" aria-hidden="true">SCROLL<i></i></div>
      </section>

      <section class="stats-band">
        <div class="wrap stats-grid">
          ${[[T.docs, "Documents"], [T.files, "Artifacts"], [T.pdf, "PDF deliverables"], [T.words, "Words written"], [T.prototype + 1, "Interactive demos"]].map(([n, l], i) => `
          <div class="stat" data-reveal style="--d:${i * 0.08}s"><div class="num" data-count="${n}">0</div><div class="lbl">${l}</div></div>`).join("")}
        </div>
      </section>

      <section class="section" id="worlds">
        <div class="wrap">
          <div class="section-head">
            <div><div class="eyebrow" data-reveal>The portfolios</div><h2 class="h-display h-lg" data-reveal>Four worlds.<br><span class="grad-text">One universe.</span></h2></div>
            <p class="lead" data-reveal>Each portfolio keeps its own identity and artifacts. Open one to read every document, preview every PDF, browse the gallery or run the prototypes.</p>
          </div>
          <div class="worlds">
            ${PROJECTS.map((p, i) => `
            <div data-reveal style="--d:${(i % 2) * 0.05}s">
              <article class="world" data-tilt="3" style="--c:${p.accent};--c2:${p.accent2}">
                <div class="world-body">
                  <div class="world-idx" aria-hidden="true">${p.index}</div>
                  <div class="world-kicker">${esc(p.kicker)}</div>
                  <h3 class="world-name">${esc(p.name)}</h3>
                  <p class="world-tag">${esc(p.tagline)}</p>
                  <div class="world-author"><span class="avatar">${initials("Yogesh")}</span><span>Yogesh</span></div>
                  <div class="world-counts">
                    <div><b>${p.counts.docs}</b><span>Docs</span></div>
                    <div><b>${p.counts.files}</b><span>Files</span></div>
                    <div><b>${p.counts.pdf}</b><span>PDFs</span></div>
                    <div><b>${p.counts.image}</b><span>Visuals</span></div>
                  </div>
                  <div class="world-actions">
                    <a class="btn primary" href="${R.project(p.slug)}">Explore ${arrow}</a>
                    ${p.app ? `<a class="btn ghost" href="${p.app.route}">▶ Live MVP</a>` : `<a class="btn ghost" href="${R.doc(p.slug, p.readme)}">Read overview</a>`}
                  </div>
                </div>
                <a class="world-visual" href="${R.project(p.slug)}" tabindex="-1" aria-hidden="true">
                  ${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : ""}
                  <div class="world-tags">${p.tags.slice(0, 5).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
                </a>
              </article>
            </div>`).join("")}
          </div>
        </div>
      </section>

      <div class="marquee" aria-hidden="true"><div class="marquee-track">${[...marqueeWords, ...marqueeWords].map((w) => `<span>${esc(w)}</span>`).join("")}</div></div>

      <section class="section">
        <div class="wrap">
          <div class="section-head"><div><div class="eyebrow" data-reveal>Not just a gallery</div><h2 class="h-display h-lg" data-reveal>Everything <span class="grad-text">works.</span></h2></div></div>
          <div class="bento">
            <a class="tile card spot t-app" href="${R.app}" data-reveal style="--accent:#2dd4bf;--accent-2:#22d3ee">
              <span class="eyebrow">Live MVP · MoneyFlow</span>
              <h3>Run the personal-finance MVP right here in your browser.</h3>
              <p>Upload a CSV, recategorise transactions, set budgets and savings goals, and watch insights and product metrics recalculate — a faithful port of the original Streamlit app.</p>
              <div class="mini-app" aria-hidden="true">
                <div class="mini-kpis"><div><small>Income</small><b>₹60,000</b></div><div><small>Expenses</small><b>₹38,368</b></div><div><small>Net</small><b>₹21,632</b></div></div>
                <div class="mini-bars">${[18000, 5200, 4090, 3850, 3450, 1200, 900, 880, 798].map((v) => Math.max(4, Math.round((v / 18000) * 100))).map((h, i) => `<i style="height:${h}%;--i:${i}"></i>`).join("")}</div>
              </div>
              <span class="tile-cta">Launch app <span>→</span></span>
            </a>
            <a class="tile card spot t-proto" href="${R.project("case-studies")}" data-reveal style="--d:.05s">
              <span class="eyebrow">Prototypes</span>
              <div class="big grad-text">${T.prototype}</div>
              <h3>Interactive usability prototypes</h3>
              <p>Clickable task flows from the six case studies, embedded live.</p>
              <span class="tile-cta">Try them <span>→</span></span>
            </a>
            <a class="tile card spot t-pdf" href="${R.project("b2b-saas", "files", "kind=pdf")}" data-reveal style="--d:.1s">
              <span class="eyebrow">Deliverables</span>
              <div class="big grad-text">${T.pdf}</div>
              <h3>PDFs, readable inline</h3>
              <p>PRDs, roadmaps, personas, teardowns — no downloads needed.</p>
              <span class="tile-cta">Browse <span>→</span></span>
            </a>
            <button class="tile card spot t-search" type="button" data-open-palette data-reveal style="text-align:left">
              <span class="eyebrow">Instant search</span>
              <div class="kbd-demo"><kbd>Ctrl</kbd><kbd>K</kbd></div>
              <h3>Search ${T.words.toLocaleString()} words across every project.</h3>
              <p>Documents, file names and full text — with highlighted snippets.</p>
            </button>
            <button class="tile card spot t-lens" type="button" data-scroll="lens" data-reveal style="text-align:left;--d:.05s">
              <span class="eyebrow">Cross-project lens</span>
              <h3>Compare how each project tackles the same craft.</h3>
              <p>Personas, PRDs, metrics, roadmaps, experiments — side by side, across portfolios.</p>
              <span class="tile-cta">Open the lens <span>↓</span></span>
            </button>
          </div>
        </div>
      </section>

      <section class="section" id="lens" style="padding-top:20px">
        <div class="wrap">
          <div class="section-head"><div><div class="eyebrow" data-reveal>Cross-project lens</div><h2 class="h-display h-lg" data-reveal>Pick a craft.<br><span class="grad-text">See every take.</span></h2></div>
          <p class="lead" data-reveal>Artifacts from all four portfolios, grouped by the product-management skill they demonstrate.</p></div>
          <div class="lens" data-reveal>
            <div class="lens-topics" role="tablist">${LENS.map(([l], i) => `<button type="button" role="tab" class="lens-topic ${i === 0 ? "on" : ""}" data-lens="${i}" aria-selected="${i === 0}">${esc(l)} <span class="n">${lensCounts[i]}</span></button>`).join("")}</div>
            <div class="lens-results" id="lens-results"></div>
          </div>
        </div>
      </section>

      ${footer()}
    </div>`;
  }

  function renderLens(i) {
    const box = $("#lens-results");
    if (!box) return;
    const items = lensItems(LENS[i][1]);
    const shown = items.slice(0, 24);
    box.innerHTML = shown.map((it, k) => `
      <a class="lens-item card spot" href="${it.href}" style="--c:${it.p.accent};--i:${k}"><span class="dot"></span><span><b>${esc(it.title)}</b><small>${esc(it.p.name)} · ${esc(it.type)}</small></span></a>`).join("") +
      (items.length > shown.length ? `<button type="button" class="lens-item card spot" data-open-palette data-q="${esc(LENS[i][0].split(/[ &,]/)[0])}" style="--c:var(--accent);--i:${shown.length}"><span class="dot"></span><span><b>+${items.length - shown.length} more</b><small>Search to see everything</small></span></button>` : "");
    $$(".lens-topic").forEach((b) => { const on = Number(b.dataset.lens) === i; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
  }
  function afterHome() {
    renderLens(0);
  }

  function footer() {
    return `
    <footer class="footer">
      <div class="wrap">
        <h2 class="footer-big" data-reveal><span class="grad-text">Build.</span> Measure.<br>Learn. Repeat.</h2>
        <div class="credits">
          ${PROJECTS.map((p) => `
          <div class="credit card spot" style="--c:${p.accent}" data-reveal>
            <div class="k">${p.index} · ${esc(p.name)}</div>
            <b>Yogesh</b>
            <p>${esc(p.originalTitle)}</p>
            <a href="${R.project(p.slug)}">Open in this site →</a>
          </div>`).join("")}
        </div>
        <div class="foot-note">
          <span>Portfolio content by Yogesh. Figures marked synthetic, illustrative or demo remain so.</span>
          <span>PM Multiverse · ${new Date(DATA.generated).getFullYear()}</span>
        </div>
      </div>
    </footer>`;
  }

  /* ------------------------------------------------------------------ */
  /* PROJECT                                                             */
  /* ------------------------------------------------------------------ */
  function viewProject(p, r) {
    const c = p.counts;
    return `
    <div class="view project">
      <section class="p-hero wrap">
        <div class="crumbs"><a href="#/">Home</a><span class="sep">/</span><span>${esc(p.name)}</span></div>
        <div class="p-hero-grid">
          <div>
            <div class="p-idx">PORTFOLIO ${p.index} / 0${PROJECTS.length} · ${esc(p.kicker)}</div>
            <h1 class="p-title" data-scramble>${esc(p.name)}</h1>
            <div class="p-orig">Original title: “${esc(p.originalTitle)}”</div>
            <p class="p-tag">${esc(p.tagline)}</p>
            <div class="p-author"><span class="avatar">${initials("Yogesh")}</span><span>by <b>Yogesh</b></span></div>
            <div class="p-actions">
              ${p.app ? `<a class="btn primary" href="${p.app.route}" data-magnetic>▶ ${esc(p.app.label)}</a>` : ""}
              <a class="btn ${p.app ? "ghost" : "primary"}" href="${R.doc(p.slug, p.readme)}" data-magnetic>Read the overview ${arrow}</a>
              <a class="btn ghost" href="${R.project(p.slug, "files")}">Browse ${c.files} files</a>
            </div>
          </div>
          ${p.cover ? `<div class="p-cover"><div class="p-cover-frame"><img src="${esc(p.cover)}" alt="${esc(p.name)} cover visual"></div></div>` : ""}
        </div>
        <div class="p-stats">
          <div><b data-count="${c.docs}">0</b><span>Documents</span></div>
          <div><b data-count="${c.files}">0</b><span>Files</span></div>
          <div><b data-count="${c.pdf}">0</b><span>PDFs</span></div>
          <div><b data-count="${c.image}">0</b><span>Visuals</span></div>
          <div><b data-count="${c.words}">0</b><span>Words</span></div>
        </div>
      </section>
      <div class="tabs-bar" id="tabs-anchor"><div class="wrap tabs" role="tablist" id="p-tabs"></div></div>
      <div class="wrap"><div id="tab-panel"></div></div>
      ${footer()}
    </div>`;
  }

  function renderProjectTab(p, r, isSwitch) {
    const tabs = $("#p-tabs");
    const panel = $("#tab-panel");
    if (!tabs || !panel) return;
    const gallery = p.files.filter((f) => f.kind === "image");
    const T = [["overview", "Overview", null], ["docs", "Documents", p.counts.docs], ["files", "Files", p.counts.files], ["gallery", "Gallery", gallery.length]];
    tabs.innerHTML = T.map(([k, l, n]) => `<a class="tab ${r.tab === k ? "on" : ""}" role="tab" aria-selected="${r.tab === k}" href="${R.project(p.slug, k)}">${l}${n != null ? ` <span class="n">${n}</span>` : ""}</a>`).join("");
    if (r.tab === "docs") panel.innerHTML = tabDocs(p);
    else if (r.tab === "files") panel.innerHTML = tabFiles(p, r.q);
    else if (r.tab === "gallery") panel.innerHTML = tabGallery(p, gallery);
    else panel.innerHTML = tabOverview(p);
    panel.className = "tab-panel";
    void panel.offsetWidth; // restart animation
    if (r.tab === "files") bindFiles(p, r.q);
    if (r.tab === "docs") bindDocFilter();
    FX.refresh(panel);
    if (isSwitch) {
      const bar = $("#tabs-anchor");
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 68;
      const top = bar.getBoundingClientRect().top + window.scrollY - navH;
      if (window.scrollY > top) window.scrollTo({ top, behavior: "auto" });
    }
  }

  function tabOverview(p) {
    let out = "";
    if (p.app) {
      out += `<div class="block"><a class="tile card spot" href="${p.app.route}" style="display:flex;flex-direction:row;align-items:center;gap:24px;flex-wrap:wrap;padding:30px">
        <div style="flex:1;min-width:240px"><span class="eyebrow">Working MVP</span><h3 style="margin-top:10px">The MoneyFlow MVP runs right here.</h3><p>Same rules, demo data, insights and instrumentation as the original Streamlit app — rebuilt to run fully in your browser.</p></div>
        <span class="btn primary">▶ Launch app ${arrow}</span></a></div>`;
    }
    const hasCards = p.sections.some((s) => s.image);
    if (p.sections.length && hasCards) {
      out += `<div class="block"><h2 class="block-title">Inside this portfolio <small>${p.sections.length} case files</small></h2><div class="sections-grid">
        ${p.sections.map((s, i) => `
        <article class="sec-card card spot" data-reveal style="--d:${(i % 3) * 0.06}s">
          <a class="thumb" href="${R.doc(p.slug, s.doc)}" tabindex="-1" aria-hidden="true">${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy">` : ""}</a>
          <div class="body">
            <span class="k">${esc(s.kicker)}</span>
            <h3><a href="${R.doc(p.slug, s.doc)}">${s.emoji ? s.emoji + " " : ""}${esc(s.title)}</a></h3>
            ${s.excerpt ? `<p>${esc(s.excerpt)}</p>` : ""}
            <div class="acts">
              <a class="btn primary sm" href="${R.doc(p.slug, s.doc)}">Read ${arrow}</a>
              ${s.prototype ? `<a class="btn ghost sm" href="${R.file(p.slug, s.prototype)}">▶ Prototype</a>` : ""}
              ${s.prd ? `<a class="btn ghost sm" href="${R.file(p.slug, s.prd)}">PRD</a>` : ""}
              ${s.fileCount > 1 ? `<a class="btn ghost sm" href="${R.project(p.slug, "files", "dir=" + encodeURIComponent(s.dir))}">${s.fileCount} files</a>` : ""}
            </div>
            <div class="meta"><span>${s.docCount} docs</span><span>${s.fileCount} files</span></div>
          </div>
        </article>`).join("")}</div></div>`;
    } else if (p.sections.length) {
      out += `<div class="block"><h2 class="block-title">Product lifecycle <small>${p.sections.length} stages</small></h2><div class="stages-grid">
        ${p.sections.map((s, i) => `
        <a class="stage-card card spot" href="${R.doc(p.slug, s.doc)}" data-reveal style="--d:${(i % 4) * 0.05}s">
          <span class="num">${esc(s.kicker.replace("Stage ", ""))}</span>
          <h3>${esc(s.title)}</h3><p>${esc(s.excerpt)}</p>
          <small class="mono muted" style="margin-top:auto;padding-top:8px;font-size:12px">${s.docCount} docs →</small>
        </a>`).join("")}</div></div>`;
    }
    if (p.counts.docs < 3) {
      const deliv = p.files.filter((f) => f.kind === "pdf" || f.kind === "office");
      if (deliv.length) {
        out += `<div class="block"><h2 class="block-title">Deliverables <small>${deliv.length} files</small></h2><div class="deliv-grid">
          ${deliv.map((f, i) => `<a class="deliv card spot" href="${R.file(p.slug, f.path)}" data-reveal style="--d:${(i % 4) * 0.04}s">${ficon(f)}<span><b>${esc(prettyName(f))}</b><small>${KIND_LABEL[f.kind]} · ${fmtSize(f.size)}</small></span></a>`).join("")}
        </div></div>`;
      }
    }
    const readme = p.docMap.get(p.readme);
    if (readme) {
      out += `<div class="block"><h2 class="block-title">README <small><a href="${R.doc(p.slug, readme.path)}">Open in reader →</a></small></h2>
        <div class="card" style="padding:clamp(22px,4vw,48px)"><article class="prose" data-doc="${esc(readme.path)}">${readme.html}</article></div></div>`;
    }
    return out;
  }

  function tabDocs(p) {
    return `
      <div class="toolbar"><h2 class="block-title" style="margin:0">All documents <small>${p.counts.docs} docs · ${p.counts.words.toLocaleString()} words</small></h2>
        <label class="field">${searchIcon}<input type="search" id="doc-filter" placeholder="Filter documents…" aria-label="Filter documents"></label></div>
      <div class="doc-groups">
        ${p.groups.map((g) => `
        <section class="doc-group" data-group>
          <h3>${esc(g.label)} <span class="mono" style="opacity:.6">${g.docs.length}</span></h3>
          <div class="doc-list">
            ${g.docs.map((path) => { const d = p.docMap.get(path); return `
            <a class="doc-item card spot" href="${R.doc(p.slug, d.path)}" data-text="${esc((d.title + " " + d.path).toLowerCase())}">
              ${ficon("doc", "md")}<span class="di"><b>${esc(d.title)}</b><small>${esc(d.path)} · ${readTime(d.words)}</small></span><span class="go">→</span></a>`; }).join("")}
          </div>
        </section>`).join("")}
      </div>
      <div class="empty" id="doc-empty" hidden>No documents match that filter.</div>`;
  }
  function bindDocFilter() {
    const inp = $("#doc-filter");
    if (!inp) return;
    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      let any = false;
      $$("[data-group]").forEach((g) => {
        let vis = 0;
        $$(".doc-item", g).forEach((a) => { const ok = !q || a.dataset.text.includes(q); a.hidden = !ok; if (ok) vis++; });
        g.hidden = !vis; if (vis) any = true;
      });
      $("#doc-empty").hidden = any;
    });
  }

  function tabFiles(p, q) {
    const kind = (q && q.get("kind")) || "all";
    const dir = (q && q.get("dir")) || "";
    const counts = Object.fromEntries(KIND_CHIPS.map(([k]) => [k, p.files.filter((f) => kindMatch(f, k)).length]));
    return `
      <div class="toolbar">
        <div class="chips" role="group" aria-label="Filter by type">${KIND_CHIPS.filter(([k]) => counts[k] > 0).map(([k, l]) => `<button type="button" class="chip ${k === kind ? "on" : ""}" data-kind="${k}" aria-pressed="${k === kind}">${l} <span class="n">${counts[k]}</span></button>`).join("")}</div>
        <label class="field">${searchIcon}<input type="search" id="file-filter" placeholder="Filter files…" aria-label="Filter files"></label>
      </div>
      ${dir ? `<div class="dir-pill">📁 ${esc(dir)}/ <button type="button" data-cleardir aria-label="Show all folders">✕</button></div>` : ""}
      <div id="file-list"></div>`;
  }
  function bindFiles(p, q) {
    let kind = (q && q.get("kind")) || "all";
    let dir = (q && q.get("dir")) || "";
    const inp = $("#file-filter");
    const list = $("#file-list");
    const draw = () => {
      const text = inp.value.trim().toLowerCase();
      const files = p.files.filter((f) => kindMatch(f, kind) && (!dir || f.path.startsWith(dir + "/")) && (!text || f.path.toLowerCase().includes(text)));
      if (!files.length) { list.innerHTML = `<div class="empty">No files match these filters.</div>`; return; }
      const groups = new Map();
      for (const f of files) { if (!groups.has(f.dir)) groups.set(f.dir, []); groups.get(f.dir).push(f); }
      list.innerHTML = [...groups.entries()].map(([d, fs]) => `
        <div class="file-dir"><h4>📁 ${d ? `<a href="${R.project(p.slug, "files", "dir=" + encodeURIComponent(d))}">${esc(d)}/</a>` : "(project root)"} <span style="opacity:.6">· ${fs.length}</span></h4>
          <div class="file-rows">${fs.map((f) => `
            <div class="file-row card spot">${ficon(f)}
              <a class="fi" href="${R.file(p.slug, f.path)}"><b title="${esc(f.name)}">${esc(f.name)}</b><small>${KIND_LABEL[f.kind]} · ${fmtSize(f.size)}</small></a>
              <a class="dl" href="${esc(f.url)}" download="${esc(f.name)}" title="Download" aria-label="Download ${esc(f.name)}">${dlIcon}</a>
            </div>`).join("")}</div></div>`).join("");
    };
    const syncHash = () => {
      const params = new URLSearchParams();
      if (kind !== "all") params.set("kind", kind);
      if (dir) params.set("dir", dir);
      const h = R.project(p.slug, "files", params.toString());
      history.replaceState(null, "", h);
      current = parseHash();
    };
    $$("[data-kind]").forEach((b) => b.addEventListener("click", () => {
      kind = b.dataset.kind;
      $$("[data-kind]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      syncHash(); draw();
    }));
    const clr = $("[data-cleardir]");
    clr && clr.addEventListener("click", () => { dir = ""; clr.parentElement.remove(); syncHash(); draw(); });
    inp.addEventListener("input", draw);
    draw();
  }

  function tabGallery(p, imgs) {
    if (!imgs.length) return `<div class="empty">This portfolio has no images.</div>`;
    return `<h2 class="block-title">Gallery <small>${imgs.length} visuals · click to zoom</small></h2>
      <div class="gallery">${imgs.map((f, i) => `
        <button type="button" class="g-item" data-gallery="${i}" aria-label="Open ${esc(f.name)}"><img src="${esc(f.url)}" alt="${esc(prettyName(f))}" loading="lazy"><span>${esc(f.path)}</span></button>`).join("")}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* DOC READER                                                          */
  /* ------------------------------------------------------------------ */
  function viewDoc(p, d) {
    const idx = p.docs.indexOf(d);
    const prev = p.docs[idx - 1], next = p.docs[idx + 1];
    const many = p.groups.length > 4;
    return `
    <div class="view reader">
      <aside class="r-side" id="r-side" aria-label="Documents in ${esc(p.name)}">
        <a class="r-side-head" href="${R.project(p.slug)}"><span class="avatar">${initials("Yogesh")}</span><span><b>${esc(p.name)}</b><small>Yogesh</small></span></a>
        <label class="field r-filter">${searchIcon}<input type="search" id="side-filter" placeholder="Filter…" aria-label="Filter documents"></label>
        ${p.groups.map((g) => `
          <div class="r-group ${many && g.key !== d.group ? "closed" : ""}">
            <button type="button" aria-expanded="${!(many && g.key !== d.group)}">${esc(g.label)}</button>
            <ul>${g.docs.map((path) => { const x = p.docMap.get(path); return `<li><a href="${R.doc(p.slug, x.path)}" class="${x === d ? "on" : ""}" ${x === d ? 'aria-current="page"' : ""} data-t="${esc(x.title.toLowerCase())}">${esc(x.title)}</a></li>`; }).join("")}</ul>
          </div>`).join("")}
      </aside>
      <div class="r-main">
        <button class="btn ghost sm side-toggle" type="button" id="side-toggle">☰ Documents</button>
        <header class="r-head">
          <div class="crumbs"><a href="#/">Home</a><span class="sep">/</span><a href="${R.project(p.slug)}">${esc(p.name)}</a><span class="sep">/</span><a href="${R.project(p.slug, "docs")}">Docs</a>${d.group ? `<span class="sep">/</span><span>${esc(p.groupLabel[d.group] || d.group)}</span>` : ""}</div>
          <h1>${esc(d.title)}</h1>
          <div class="r-meta"><span class="chip">${readTime(d.words)}</span><span class="chip">${d.words.toLocaleString()} words</span><span class="chip mono" title="Path in the original project folder">${esc(p.folder)}/${esc(d.path)}</span></div>
        </header>
        <article class="prose" data-doc="${esc(d.path)}">${d.html}</article>
        <nav class="r-pager" aria-label="Previous and next document">
          ${prev ? `<a class="card spot prev" href="${R.doc(p.slug, prev.path)}"><small>← Previous</small><b>${esc(prev.title)}</b></a>` : "<span></span>"}
          ${next ? `<a class="card spot next" href="${R.doc(p.slug, next.path)}"><small>Next →</small><b>${esc(next.title)}</b></a>` : ""}
        </nav>
      </div>
      <aside class="r-toc" aria-label="On this page">
        ${d.headings.length ? `<h5>On this page</h5>${d.headings.map((h) => `<a href="${R.doc(p.slug, d.path, h.id)}" data-anchor="${esc(h.id)}" class="l${h.level}" data-toc="${esc(h.id)}">${esc(h.text)}</a>`).join("")}` : ""}
      </aside>
    </div>`;
  }

  function scrollToAnchor(id) {
    let el = document.getElementById("md-" + id);
    if (!el) {
      // tolerate anchors that differ by case / emoji handling
      const want = String(id).toLowerCase().replace(/[^a-z0-9]+/g, "");
      el = $$(".prose [id^='md-']").find((h) => h.id.slice(3).toLowerCase().replace(/[^a-z0-9]+/g, "") === want);
    }
    if (el) el.scrollIntoView({ behavior: FX.reduced ? "auto" : "smooth", block: "start" });
    return !!el;
  }

  function afterDoc(p, r) {
    if (r.h) setTimeout(() => { if (!scrollToAnchor(r.h)) window.scrollTo(0, 0); }, 60);
    else window.scrollTo(0, 0);

    const side = $("#r-side");
    $$(".r-group > button", side).forEach((b) => b.addEventListener("click", () => {
      const g = b.parentElement; const closed = g.classList.toggle("closed"); b.setAttribute("aria-expanded", String(!closed));
    }));
    const on = $("a.on", side);
    if (on) { const top = on.offsetTop - side.clientHeight / 2; side.scrollTop = Math.max(0, top); }
    $("#side-toggle").addEventListener("click", () => side.classList.toggle("open"));
    const sf = $("#side-filter");
    sf.addEventListener("input", () => {
      const q = sf.value.trim().toLowerCase();
      $$(".r-group", side).forEach((g) => {
        let vis = 0;
        $$("li", g).forEach((li) => { const ok = !q || li.firstElementChild.dataset.t.includes(q); li.hidden = !ok; if (ok) vis++; });
        g.hidden = !vis;
        if (q) g.classList.remove("closed");
      });
    });

    // scrollspy
    const tocLinks = $$("[data-toc]");
    if (tocLinks.length && "IntersectionObserver" in window) {
      const map = new Map(tocLinks.map((a) => [a.dataset.toc, a]));
      const heads = tocLinks.map((a) => document.getElementById("md-" + a.dataset.toc)).filter(Boolean);
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            tocLinks.forEach((a) => a.classList.remove("on"));
            const a = map.get(en.target.id.slice(3));
            if (a) a.classList.add("on");
          }
        });
      }, { rootMargin: "-15% 0px -75% 0px" });
      heads.forEach((h) => obs.observe(h));
      cleanup.push(() => obs.disconnect());
    }
  }

  /* ------------------------------------------------------------------ */
  /* FILE VIEWER                                                         */
  /* ------------------------------------------------------------------ */
  function viewFile(p, f) {
    const dirParts = f.dir ? f.dir.split("/") : [];
    const siblings = p.files.filter((x) => x.dir === f.dir && x !== f);
    const sibDocs = p.docs.filter((d) => (d.path.includes("/") ? d.path.slice(0, d.path.lastIndexOf("/")) : "") === f.dir);
    const OFFICE = {
      xlsx: ["Excel workbook", "Open it with Microsoft Excel, Google Sheets or LibreOffice Calc."],
      docx: ["Word document", "Open it with Microsoft Word, Google Docs or LibreOffice Writer."],
      pptx: ["PowerPoint deck", "Open it with Microsoft PowerPoint, Google Slides or Keynote."],
      pbix: ["Power BI report", "Open it with Power BI Desktop (Windows) to explore the interactive dashboard."],
      twbx: ["Tableau packaged workbook", "Open it with Tableau Desktop or the free Tableau Reader to explore the dashboard."],
    };
    let stage = "";
    switch (f.kind) {
      case "pdf":
        stage = `<div class="fv-stage"><iframe src="${esc(f.url)}#view=FitH" title="${esc(f.name)}"></iframe></div>
          <p class="fv-mobile-pdf muted" style="margin-top:12px;font-size:14px">PDF previews may not display on some mobile browsers — use <b>Open in new tab</b>.</p>`;
        break;
      case "image":
        stage = `<div class="fv-stage fv-img"><img src="${esc(f.url)}" alt="${esc(prettyName(f))}" data-zoom="1"></div>`;
        break;
      case "prototype":
        stage = `<div class="toolbar" style="margin-bottom:14px"><span class="muted" style="font-size:14px">Interactive prototype — click through the flow below. It runs sandboxed, locally.</span>
            <div class="seg" role="group" aria-label="Viewport"><button type="button" class="on" data-vp="desktop">Desktop</button><button type="button" data-vp="mobile">Mobile</button></div></div>
          <div class="fv-stage proto" id="proto-stage"><iframe src="${esc(f.url)}" title="${esc(f.name)}" sandbox="allow-scripts allow-forms allow-downloads allow-modals"></iframe></div>`;
        break;
      case "csv": {
        const c = f.csv;
        if (!c) { stage = binStage(f, ["CSV file", "This file is too large to preview — download it to open in a spreadsheet."]); break; }
        const isNum = c.header.map((_, i) => c.rows.length > 0 && c.rows.every((r) => r[i] === undefined || r[i] === "" || /^-?[\d,.]+%?$/.test(r[i])));
        stage = `<div class="toolbar" style="margin-bottom:14px"><label class="field">${searchIcon}<input type="search" id="csv-filter" placeholder="Filter rows…" aria-label="Filter rows"></label>
            <span class="muted mono" style="font-size:12.5px" id="csv-count">${c.rows.length} of ${c.total} rows · ${c.header.length} columns</span></div>
          <div class="fv-stage"><div class="fv-table"><table><thead><tr><th>#</th>${c.header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
            <tbody>${c.rows.map((r, i) => `<tr><td class="rn">${i + 1}</td>${c.header.map((_, j) => `<td class="${isNum[j] ? "num" : ""}" title="${esc(r[j] || "")}">${esc(r[j] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
            ${c.total > c.rows.length ? `<div class="fv-note"><span>Showing the first ${c.rows.length} of ${c.total} rows.</span><a class="btn ghost sm" href="${esc(f.url)}" download="${esc(f.name)}">${dlIcon} Download full CSV</a></div>` : ""}</div>`;
        break;
      }
      case "code": {
        if (f.code == null) { stage = binStage(f, ["Text file", "This file is too large to preview — download it instead."]); break; }
        const lines = f.lines || 1;
        stage = `<div class="fv-stage"><div class="fv-code"><div class="ln">${Array.from({ length: lines }, (_, i) => i + 1).join("\n")}</div><pre><code class="hljs" id="code-src">${f.code}</code></pre></div>
          <div class="fv-note"><span class="mono">${esc(f.lang || "text")} · ${lines} lines</span><button class="btn ghost sm" type="button" data-copy-target="code-src">Copy code</button></div></div>`;
        break;
      }
      default:
        stage = binStage(f, OFFICE[f.ext] || ["File", "This file type can't be previewed in the browser — download it to open locally."]);
    }
    return `
    <div class="view fv wrap">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">/</span><a href="${R.project(p.slug)}">${esc(p.name)}</a><span class="sep">/</span><a href="${R.project(p.slug, "files")}">Files</a>
        ${dirParts.map((part, i) => `<span class="sep">/</span><a href="${R.project(p.slug, "files", "dir=" + encodeURIComponent(dirParts.slice(0, i + 1).join("/")))}">${esc(part.trim())}</a>`).join("")}</div>
      <div class="fv-head">
        <div class="fv-title">${ficon(f)}<div><span class="eyebrow">${KIND_LABEL[f.kind]} · ${fmtSize(f.size)}</span><h1>${esc(f.name)}</h1></div></div>
        <div class="fv-actions">
          <a class="btn ghost sm" href="${esc(f.url)}" target="_blank" rel="noopener">${extIcon} Open in new tab</a>
          <a class="btn primary sm" href="${esc(f.url)}" download="${esc(f.name)}">${dlIcon} Download</a>
        </div>
      </div>
      ${stage}
      ${siblings.length || sibDocs.length ? `
      <div class="siblings">
        <h2 class="block-title">More in this folder <small>${esc(f.dir || "project root")}</small></h2>
        <div class="file-rows">
          ${sibDocs.map((d) => `<div class="file-row card spot">${ficon("doc", "md")}<a class="fi" href="${R.doc(p.slug, d.path)}"><b>${esc(d.title)}</b><small>Document · ${readTime(d.words)}</small></a></div>`).join("")}
          ${siblings.map((x) => `<div class="file-row card spot">${ficon(x)}<a class="fi" href="${R.file(p.slug, x.path)}"><b title="${esc(x.name)}">${esc(x.name)}</b><small>${KIND_LABEL[x.kind]} · ${fmtSize(x.size)}</small></a><a class="dl" href="${esc(x.url)}" download="${esc(x.name)}" aria-label="Download ${esc(x.name)}">${dlIcon}</a></div>`).join("")}
        </div>
      </div>` : ""}
    </div>`;
  }
  function binStage(f, info) {
    return `<div class="fv-stage"><div class="fv-bin">${ficon(f)}<h3 style="margin:0;font-family:var(--display);font-size:24px">${esc(info[0])}</h3><p>${esc(info[1])}</p>
      <a class="btn primary" href="${esc(f.url)}" download="${esc(f.name)}">${dlIcon} Download ${esc(f.name)} · ${fmtSize(f.size)}</a></div></div>`;
  }
  function afterFile() {
    const stage = $("#proto-stage");
    $$("[data-vp]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-vp]").forEach((x) => x.classList.toggle("on", x === b));
      stage && stage.classList.toggle("mobile", b.dataset.vp === "mobile");
    }));
    const cf = $("#csv-filter");
    if (cf) {
      const rows = $$(".fv-table tbody tr");
      const total = $("#csv-count").textContent.replace(/^\d+ of /, "");
      cf.addEventListener("input", () => {
        const q = cf.value.trim().toLowerCase();
        let n = 0;
        rows.forEach((tr) => { const ok = !q || tr.textContent.toLowerCase().includes(q); tr.hidden = !ok; if (ok) n++; });
        $("#csv-count").textContent = `${n} of ${total}`;
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* MONEYFLOW APP PAGE                                                   */
  /* ------------------------------------------------------------------ */
  function viewMoneyFlow() {
    return `
    <div class="view mf wrap">
      <div class="crumbs"><a href="#/">Home</a><span class="sep">/</span><a href="${R.project("moneyflow")}">MoneyFlow</a><span class="sep">/</span><span>Live MVP</span></div>
      <div class="mf-head">
        <div><span class="eyebrow">Working MVP · Synthetic demo data</span><h1>💸 MoneyFlow</h1><p class="lead" style="margin:0">Privacy-first personal finance check-in. Turn transaction history into a small number of clear, explainable actions.</p></div>
        <div class="p-actions"><a class="btn ghost sm" href="${R.doc("moneyflow", "05-prd/PRD.md")}">Read the PRD</a><a class="btn ghost sm" href="${R.doc("moneyflow", "DEMO_SCRIPT.md")}">Demo script</a><a class="btn ghost sm" href="${R.project("moneyflow")}">Case study ${arrow}</a></div>
      </div>
      <div class="mf-banner"><span>Browser port of the Streamlit <code>app.py</code> by <b>Yogesh</b> — same rules, demo data, insights and instrumentation. Your data never leaves this tab.</span></div>
      <div id="mf-root"></div>
    </div>`;
  }

  function view404() {
    return `<div class="view nf"><div><div class="h-display grad-text">404</div><p class="lead" style="margin:0 auto 30px">This corner of the multiverse doesn't exist (yet).</p><a class="btn primary" href="#/">Back to home ${arrow}</a></div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* LIGHTBOX                                                            */
  /* ------------------------------------------------------------------ */
  const lb = { el: $("#lightbox"), img: $("#lb-img"), cap: $("#lb-cap"), list: [], i: 0, lastFocus: null };
  function lbOpen(list, i) {
    lb.list = list; lb.i = i; lb.lastFocus = document.activeElement;
    lb.el.hidden = false; document.body.classList.add("lock");
    lbShow();
    $(".lb-close", lb.el).focus();
  }
  function lbShow() {
    const it = lb.list[lb.i];
    lb.img.src = it.src; lb.img.alt = it.cap || "";
    lb.cap.textContent = `${it.cap || ""}${lb.list.length > 1 ? `  ·  ${lb.i + 1} / ${lb.list.length}` : ""}`;
    $$(".lb-nav", lb.el).forEach((b) => { b.hidden = lb.list.length < 2; });
  }
  function lbClose() { lb.el.hidden = true; lb.img.removeAttribute("src"); document.body.classList.remove("lock"); lb.lastFocus && lb.lastFocus.focus && lb.lastFocus.focus(); }
  function lbStep(d) { if (lb.list.length < 2) return; lb.i = (lb.i + d + lb.list.length) % lb.list.length; lbShow(); }
  lb.el.addEventListener("click", (e) => {
    const a = e.target.closest("[data-lb]");
    if (a) { const k = a.dataset.lb; k === "close" ? lbClose() : lbStep(k === "next" ? 1 : -1); return; }
    if (e.target === lb.el) lbClose();
  });

  /* ------------------------------------------------------------------ */
  /* COMMAND PALETTE (search)                                            */
  /* ------------------------------------------------------------------ */
  const pal = { el: $("#palette"), input: $("#palette-q"), box: $("#palette-results"), items: [], sel: 0, index: null, lastFocus: null };
  const decodeEntities = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  function buildIndex() {
    const idx = [];
    for (const p of PROJECTS) {
      idx.push({ type: "Portfolios", p, title: p.name, sub: `Yogesh · ${p.kicker}`, text: (p.tagline + " " + p.tags.join(" ") + " " + p.originalTitle).toLowerCase(), raw: p.tagline, href: R.project(p.slug) });
      for (const d of p.docs) {
        const raw = decodeEntities(d.html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
        idx.push({ type: "Documents", p, title: d.title, sub: `${p.name} · ${d.path}`, text: raw.toLowerCase(), raw, href: R.doc(p.slug, d.path) });
      }
      for (const f of p.files) idx.push({ type: "Files", p, title: f.name, sub: `${p.name} · ${KIND_LABEL[f.kind]} · ${f.dir || "root"}`, text: f.path.toLowerCase(), raw: "", href: R.file(p.slug, f.path) });
    }
    idx.push({ type: "Portfolios", p: { accent: "#2dd4bf" }, title: "MoneyFlow — Live MVP app", sub: "Run the personal finance MVP in your browser", text: "moneyflow app mvp budget transactions csv savings goal finance demo live run", raw: "", href: R.app });
    return idx;
  }
  function openPalette(q) {
    if (!pal.index) pal.index = buildIndex();
    pal.lastFocus = document.activeElement;
    pal.el.hidden = false; document.body.classList.add("lock");
    pal.input.value = q || "";
    searchPalette();
    setTimeout(() => pal.input.focus(), 10);
  }
  function closePalette() {
    if (pal.el.hidden) return;
    pal.el.hidden = true; document.body.classList.remove("lock");
    pal.lastFocus && pal.lastFocus.focus && pal.lastFocus.focus({ preventScroll: true });
  }
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function highlightTerms(text, terms) {
    let out = esc(text);
    if (!terms.length) return out;
    const re = new RegExp("(" + terms.map((t) => reEsc(esc(t))).join("|") + ")", "gi");
    return out.replace(re, "<mark>$1</mark>");
  }
  function searchPalette() {
    const q = pal.input.value.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    let results;
    if (!terms.length) {
      results = pal.index.filter((it) => it.type === "Portfolios").map((it) => ({ it, score: 0 }));
      const featured = [["moneyflow", "05-prd/PRD.md"], ["product-thinking", "prds/ai-learning-copilot/README.md"], ["case-studies", "Ecommerce_Conversion_Optimization/README.md"], ["b2b-saas", "README.md"]];
      for (const [slug, path] of featured) { const it = pal.index.find((x) => x.href === R.doc(slug, path)); if (it) results.push({ it: { ...it, type: "Suggested reading" }, score: 0 }); }
    } else {
      results = [];
      for (const it of pal.index) {
        const t = it.title.toLowerCase();
        let score = 0, ok = true;
        for (const term of terms) {
          const inT = t.includes(term), inX = it.text.includes(term);
          if (!inT && !inX) { ok = false; break; }
          if (inT) score += t.startsWith(term) ? 14 : 10;
          if (inX) score += Math.min(6, it.text.split(term).length - 1);
        }
        if (ok) results.push({ it, score: score + (it.type === "Portfolios" ? 6 : it.type === "Documents" ? 2 : 0) });
      }
      results.sort((a, b) => b.score - a.score);
    }
    const caps = { Portfolios: 6, "Suggested reading": 4, Documents: 14, Files: 8 };
    const order = ["Portfolios", "Suggested reading", "Documents", "Files"];
    const grouped = order.map((g) => [g, results.filter((r) => r.it.type === g).slice(0, caps[g])]).filter(([, a]) => a.length);
    pal.items = grouped.flatMap(([, a]) => a.map((r) => r.it));
    pal.sel = 0;
    if (!pal.items.length) { pal.box.innerHTML = `<div class="pr-empty">No results for “${esc(q)}”. Try “persona”, “RICE”, “churn” or “roadmap”.</div>`; return; }
    let k = 0;
    pal.box.innerHTML = grouped.map(([g, arr]) => `<div class="pr-group">${g}</div>` + arr.map(({ it }) => {
      let snippet = esc(it.sub);
      if (terms.length && it.raw && it.type === "Documents") {
        const lower = it.raw.toLowerCase();
        const pos = Math.min(...terms.map((t) => { const i = lower.indexOf(t); return i < 0 ? Infinity : i; }));
        if (isFinite(pos)) {
          const s = Math.max(0, pos - 60), e = Math.min(it.raw.length, pos + 120);
          snippet = `<span style="opacity:.75">${esc(it.p.name)} ·</span> ${s > 0 ? "…" : ""}${highlightTerms(it.raw.slice(s, e), terms)}${e < it.raw.length ? "…" : ""}`;
        }
      }
      const i = k++;
      return `<div class="pr-item ${i === 0 ? "on" : ""}" role="option" data-i="${i}" aria-selected="${i === 0}" style="--c:${it.p.accent}"><span class="dot"></span><div style="min-width:0"><div class="t">${highlightTerms(it.title, terms)}</div><div class="s">${snippet}</div></div><span class="ret">↵</span></div>`;
    }).join("")).join("");
  }
  function palMove(d) {
    if (!pal.items.length) return;
    pal.sel = (pal.sel + d + pal.items.length) % pal.items.length;
    $$(".pr-item", pal.box).forEach((el) => { const on = Number(el.dataset.i) === pal.sel; el.classList.toggle("on", on); el.setAttribute("aria-selected", String(on)); if (on) el.scrollIntoView({ block: "nearest" }); });
  }
  function palGo(i) {
    const it = pal.items[i];
    if (!it) return;
    closePalette();
    if (location.hash === it.href) render(); else location.hash = it.href;
  }
  pal.input.addEventListener("input", searchPalette);
  pal.input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); palMove(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palMove(-1); }
    else if (e.key === "Enter") { e.preventDefault(); palGo(pal.sel); }
  });
  pal.box.addEventListener("click", (e) => { const it = e.target.closest(".pr-item"); if (it) palGo(Number(it.dataset.i)); });
  pal.box.addEventListener("mousemove", (e) => {
    const it = e.target.closest(".pr-item");
    if (it && Number(it.dataset.i) !== pal.sel) { pal.sel = Number(it.dataset.i); $$(".pr-item", pal.box).forEach((el) => el.classList.toggle("on", el === it)); }
  });

  /* ------------------------------------------------------------------ */
  /* Global events                                                       */
  /* ------------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const t = e.target;
    // open palette
    const op = t.closest("[data-open-palette]");
    if (op) { e.preventDefault(); openPalette(op.dataset.q || ""); return; }
    if (t.closest("[data-close-palette]")) { closePalette(); return; }
    // in-page smooth scroll buttons
    const sc = t.closest("[data-scroll]");
    if (sc) { const el = document.getElementById(sc.dataset.scroll); el && el.scrollIntoView({ behavior: FX.reduced ? "auto" : "smooth" }); return; }
    // lens topics
    const lt = t.closest("[data-lens]");
    if (lt) { renderLens(Number(lt.dataset.lens)); return; }
    // copy buttons
    const cb = t.closest(".copy-btn, [data-copy-target]");
    if (cb) {
      const src = cb.dataset.copyTarget ? document.getElementById(cb.dataset.copyTarget) : cb.parentElement.querySelector("pre");
      const text = src ? src.textContent : "";
      const done = () => { const old = cb.textContent; cb.textContent = "Copied ✓"; setTimeout(() => (cb.textContent = old), 1400); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text) && done());
      else if (fallbackCopy(text)) done();
      return;
    }
    // gallery
    const gi = t.closest("[data-gallery]");
    if (gi) {
      const list = $$("[data-gallery]").map((b) => { const im = $("img", b); return { src: im.getAttribute("src"), cap: $("span", b).textContent }; });
      lbOpen(list, Number(gi.dataset.gallery));
      return;
    }
    // zoomable images
    const zi = t.closest("img[data-zoom]");
    if (zi && !t.closest("a[href]")) {
      const scope = zi.closest(".prose") || zi.parentElement;
      const imgs = $$("img[data-zoom]", scope);
      lbOpen(imgs.map((im) => ({ src: im.getAttribute("src"), cap: im.getAttribute("alt") || "" })), Math.max(0, imgs.indexOf(zi)));
      return;
    }
    // in-doc anchors (same document → smooth scroll without re-render)
    const an = t.closest("a[data-anchor]");
    if (an && current && (current.name === "doc" || current.name === "project")) {
      const prose = an.closest(".prose");
      const docPath = prose ? prose.dataset.doc : current.path;
      const href = an.getAttribute("href");
      const sameDoc = current.name === "doc" ? href.startsWith(R.doc(current.slug, current.path) + "?h=") || href === R.doc(current.slug, current.path) : !!prose && href.startsWith(R.doc(current.slug, docPath));
      if (sameDoc && document.getElementById("md-" + an.dataset.anchor)) {
        e.preventDefault();
        scrollToAnchor(an.dataset.anchor);
        if (current.name === "doc") { history.replaceState(null, "", href); current = parseHash(); }
        return;
      }
    }
    // broken links in docs
    if (t.closest("a.md-broken")) { e.preventDefault(); toast("That file isn't included in the original project folder"); return; }
    // close mobile menu when clicking a nav link
    if (t.closest("#nav-links a")) closeMenus();
  });
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    if (!ok) toast("Copy not supported in this browser");
    return ok;
  }

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); pal.el.hidden ? openPalette() : closePalette(); return; }
    if (e.key === "/" && !typing && pal.el.hidden && lb.el.hidden) { e.preventDefault(); openPalette(); return; }
    if (e.key === "Escape") {
      if (!lb.el.hidden) { lbClose(); return; }
      if (!pal.el.hidden) { closePalette(); return; }
      closeMenus();
    }
    if (!lb.el.hidden) {
      if (e.key === "ArrowRight") lbStep(1);
      if (e.key === "ArrowLeft") lbStep(-1);
      if (e.key === "Tab") { // keep focus inside lightbox
        const f = $$("button:not([hidden])", lb.el);
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    }
  });

  // Never let a dropped file navigate the page away
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("hashchange", render);

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  render();
  FX.preload(() => document.body.classList.add("ready"));
})();