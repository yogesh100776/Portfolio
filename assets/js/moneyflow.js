/* =====================================================================
   MoneyFlow MVP — browser port of app.py (Streamlit) from
   moneyflow-product-management-main by Yogesh.
   Same categories, demo data, rules, insights and instrumentation;
   runs fully client-side (no data leaves the browser).
   ===================================================================== */
(function () {
  "use strict";

  const CATEGORIES = ["Income", "Housing", "Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Education", "Travel", "Subscriptions", "Other"];

  const DEMO_DATA = [
    ["2026-08-01", "Salary", 60000, "Income"], ["2026-08-02", "Rent", -18000, "Housing"],
    ["2026-08-03", "Swiggy", -620, "Food"], ["2026-08-04", "Uber", -280, "Transport"],
    ["2026-08-05", "Netflix", -499, "Subscriptions"], ["2026-08-06", "Amazon", -1450, "Shopping"],
    ["2026-08-07", "Electricity", -1800, "Bills"], ["2026-08-08", "Zomato", -740, "Food"],
    ["2026-08-10", "Gym", -1200, "Health"], ["2026-08-11", "College Books", -900, "Education"],
    ["2026-08-13", "Uber", -310, "Transport"], ["2026-08-15", "Restaurant", -1250, "Food"],
    ["2026-08-17", "Amazon", -890, "Shopping"], ["2026-08-19", "Flight Booking", -5200, "Travel"],
    ["2026-08-21", "Electricity", -1650, "Bills"], ["2026-08-23", "Swiggy", -680, "Food"],
    ["2026-08-25", "Uber", -290, "Transport"], ["2026-08-26", "Subscription", -299, "Subscriptions"],
    ["2026-08-27", "Zomato", -560, "Food"], ["2026-08-28", "Shopping", -1750, "Shopping"],
  ];

  const DEFAULT_BUDGETS = { Housing: 18000, Food: 5000, Transport: 2500, Shopping: 4000, Entertainment: 2000, Bills: 3500, Health: 2000, Education: 2000, Travel: 6000, Subscriptions: 1000, Other: 2000 };

  const RULES = [
    ["Income", ["salary", "stipend", "scholarship", "refund", "interest"]],
    ["Housing", ["rent", "hostel", "housing"]],
    ["Food", ["swiggy", "zomato", "restaurant", "cafe", "food", "domino"]],
    ["Transport", ["uber", "ola", "metro", "bus", "fuel", "petrol"]],
    ["Subscriptions", ["netflix", "spotify", "prime", "subscription", "hotstar"]],
    ["Shopping", ["amazon", "flipkart", "myntra", "shopping"]],
    ["Bills", ["electricity", "internet", "mobile", "water", "recharge"]],
    ["Health", ["gym", "pharmacy", "hospital", "health"]],
    ["Education", ["book", "course", "tuition", "college"]],
    ["Travel", ["flight", "hotel", "train", "travel"]],
    ["Entertainment", ["movie", "cinema", "game"]],
  ];

  const STORE_KEY = "moneyflow-mvp-session-v1";
  const fmtInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const money = (x) => "₹" + fmtInt.format(Math.round(Number(x) || 0) === 0 ? 0 : Number(x));
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  let uid = 0;
  const nextId = () => "t" + (++uid) + "-" + Math.random().toString(36).slice(2, 7);

  /* ---------------- Domain logic (mirrors app.py) ---------------- */
  function inferCategory(merchant, amount) {
    const m = String(merchant).toLowerCase();
    for (const [category, keywords] of RULES) {
      if (keywords.some((k) => m.includes(k))) return category;
    }
    return Number(amount) < 0 ? "Other" : "Income";
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function validYMD(y, m, d) {
    if (!(y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  // Returns "YYYY-MM-DD" or null (like pd.to_datetime(errors="coerce"))
  function parseDate(v) {
    const s = String(v == null ? "" : v).trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/);
    if (m) return validYMD(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T].*)?$/);
    if (m) {
      const a = +m[1], b = +m[2], y = +m[3];
      // pandas default is month-first unless the first part cannot be a month
      return a > 12 ? validYMD(y, b, a) : (validYMD(y, a, b) || validYMD(y, b, a));
    }
    const t = Date.parse(s);
    if (!isNaN(t)) { const d = new Date(t); return validYMD(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
    return null;
  }
  function parseAmount(v) {
    if (typeof v === "number") return isFinite(v) ? v : NaN;
    const s = String(v == null ? "" : v).replace(/,/g, "").replace(/[₹$€£\s]/g, "");
    if (!s || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
    return Number(s);
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", q = false;
    text = text.replace(/^\uFEFF/, "");
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
        if (row.some((x) => x !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); if (row.some((x) => x !== "")) rows.push(row); }
    return rows;
  }

  // rows: array of arrays, first is header. Returns { tx, invalid }
  function normalizeTransactions(table) {
    if (!table.length) throw new Error("The CSV file is empty.");
    const header = table[0].map((h) => String(h).trim().toLowerCase());
    const aliases = {
      date: ["date", "transaction_date", "transaction date"],
      merchant: ["merchant", "description", "payee", "transaction", "name"],
      amount: ["amount", "value", "transaction_amount"],
      category: ["category", "type", "spend_category"],
    };
    const mapped = {};
    for (const [target, candidates] of Object.entries(aliases)) {
      for (const c of candidates) { const i = header.indexOf(c); if (i >= 0) { mapped[target] = i; break; } }
    }
    const missing = ["date", "merchant", "amount"].filter((x) => !(x in mapped));
    if (missing.length) throw new Error("CSV is missing required columns: " + missing.join(", ") + ". Required columns: date, merchant, amount. Optional: category.");

    let invalid = 0;
    const out = [];
    for (const r of table.slice(1)) {
      const date = parseDate(r[mapped.date]);
      const merchant = String(r[mapped.merchant] == null ? "" : r[mapped.merchant]).trim();
      const amount = parseAmount(r[mapped.amount]);
      let category = "category" in mapped ? String(r[mapped.category] == null ? "" : r[mapped.category]).trim() : "";
      if (!date || !merchant || isNaN(amount)) { invalid++; continue; }
      if (!CATEGORIES.includes(category)) category = "";
      if (!category) category = inferCategory(merchant, amount);
      if (amount > 0) category = "Income";
      if (amount < 0 && category === "Income") category = inferCategory(merchant, amount);
      out.push({ id: nextId(), date, merchant, amount, category });
    }
    return { tx: sortByDate(out), invalid };
  }

  function sortByDate(arr) {
    return arr.map((t, i) => [t, i]).sort((a, b) => (a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : a[1] - b[1])).map((x) => x[0]);
  }

  function loadDemo() {
    return normalizeTransactions([["date", "merchant", "amount", "category"], ...DEMO_DATA]).tx;
  }

  function getMetrics(tx) {
    let income = 0, expenses = 0;
    for (const t of tx) { if (t.amount > 0) income += t.amount; else if (t.amount < 0) expenses += -t.amount; }
    return { income, expenses, net: income - expenses };
  }

  function getSpending(tx) {
    const m = new Map();
    for (const t of tx) if (t.amount < 0) m.set(t.category, (m.get(t.category) || 0) - t.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]); // [[category, amount]] desc
  }

  function buildInsights(tx, budgets) {
    const { net } = getMetrics(tx);
    const spending = getSpending(tx);
    const spend = Object.fromEntries(spending);
    const items = [];
    if (net > 0) items.push(["💡", "Positive cash flow", `You have ${money(net)} left after recorded expenses.`, "Update savings goal"]);
    else if (net < 0) items.push(["⚠️", "Negative cash flow", `Your recorded expenses exceed income by ${money(Math.abs(net))}.`, "Review transactions"]);
    else items.push(["⚖️", "Cash flow is balanced", "Your recorded income currently equals your recorded expenses.", "Review transactions"]);

    if (spending.length) {
      const [topCat, topAmt] = spending[0];
      items.push(["📌", `${topCat} is your largest spending category`, `You spent ${money(topAmt)} here in the loaded period.`, "Review category"]);
    }
    const sub = spend.Subscriptions || 0;
    if (sub > 1000) items.push(["🔁", "Recurring subscription spend is notable", `You spent ${money(sub)} on subscriptions. Review services you actively use.`, "Review subscriptions"]);

    const pressure = [];
    for (const [category, budget] of Object.entries(budgets)) {
      const spent = spend[category] || 0;
      if (budget > 0 && spent > budget) pressure.push([spent - budget, category, spent, budget]);
    }
    if (pressure.length) {
      const [, category, spent, budget] = pressure.reduce((a, b) => (b[0] > a[0] ? b : a));
      items.push(["📊", `${category} is over its budget`, `You spent ${money(spent)} against a ${money(budget)} planning limit.`, "Review budget"]);
    }
    return items.slice(0, 3);
  }

  /* ---------------- State ---------------- */
  function defaultState() {
    return { tx: loadDemo(), budgets: { ...DEFAULT_BUDGETS }, goal: { name: "Emergency Fund", target: 50000, saved: 15000 }, actions: [], tab: "tx", search: "" };
  }
  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.tx) && s.budgets && s.goal) {
          s.tx.forEach((t) => { if (!t.id) t.id = nextId(); });
          return { ...defaultState(), ...s, search: "" };
        }
      }
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  /* ---------------- UI ---------------- */
  function mount(root, opts) {
    opts = opts || {};
    const toast = opts.toast || (() => {});
    let S = loadState();
    let draft = null; // transaction edits awaiting save
    let msg = null;   // {type, lines[]}

    const save = () => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...S, search: "" })); } catch (e) { /* storage may be unavailable */ } };
    const act = (k) => { if (!S.actions.includes(k)) S.actions.push(k); };
    const setMsg = (type, lines) => { msg = { type, lines: [].concat(lines) }; };

    function freshDraft() { draft = S.tx.map((t) => ({ ...t, amount: String(t.amount) })); }
    freshDraft();

    function render() {
      const { income, expenses, net } = getMetrics(S.tx);
      const spending = getSpending(S.tx);
      const insights = buildInsights(S.tx, S.budgets);
      const max = spending.length ? spending[0][1] : 0;

      root.innerHTML = `
      <div class="mf-layout">
        <aside class="mf-side card">
          <h3>Data</h3>
          <label class="drop" id="mf-drop">
            <input type="file" id="mf-file" accept=".csv,text/csv">
            <span aria-hidden="true">⬆</span>
            <b>Upload a CSV</b>
            Drag & drop or click. Required columns: <code>date</code>, <code>merchant</code>, <code>amount</code>. Optional: <code>category</code>.
          </label>
          <div class="mf-msg ${msg ? "show " + msg.type : ""}" role="status">${msg ? msg.lines.map((l) => `<div>${esc(l)}</div>`).join("") : ""}</div>
          <button class="btn ghost sm" type="button" data-mf="sample">Download sample CSV</button>
          <button class="btn ghost sm" type="button" data-mf="reset">Reset to demo data</button>
          <div class="note">Demo only. Use synthetic or non-sensitive data. Do not upload bank credentials, OTPs, card numbers, or other secrets. Everything runs locally in your browser.</div>
        </aside>

        <div class="mf-main">
          <section>
            <h3 class="block-title" style="margin-bottom:16px">Your financial check-in</h3>
            <div class="kpis">
              <div class="kpi card spot"><small>Income</small><b class="pos">${money(income)}</b></div>
              <div class="kpi card spot"><small>Expenses</small><b>${money(expenses)}</b></div>
              <div class="kpi card spot"><small>Net cash flow</small><b class="${net < 0 ? "neg" : ""}">${money(net)}</b></div>
              <div class="kpi card spot"><small>Illustrative safe-to-spend <span class="hint" title="Demo heuristic only (35% of positive net cash flow), not financial advice.">?</span></small><b>${money(Math.max(net * 0.35, 0))}</b></div>
            </div>
          </section>

          <div class="mf-two">
            <section class="panel card">
              <h3>What changed?</h3>
              ${insights.map(([icon, title, body, action]) => {
                const key = `${title}-${action}`;
                const done = S.actions.includes(key);
                return `<div class="insight"><h4>${icon} ${esc(title)}</h4><p>${esc(body)}</p>
                  <button class="btn ghost sm ${done ? "done" : ""}" type="button" data-mf="insight" data-key="${esc(key)}">${done ? "✓ " : ""}${esc(action)}</button></div>`;
              }).join("")}
            </section>
            <section class="panel card">
              <h3>Spending by category</h3>
              ${spending.length ? `<div class="bars">${spending.map(([c, v]) => `
                <div class="bar-row"><span>${esc(c)}</span><div class="track"><div class="fill" data-w="${max ? (v / max) * 100 : 0}"></div></div><span class="v">${money(v)}</span></div>`).join("")}</div>`
                : `<div class="note">No expenses available.</div>`}
            </section>
          </div>

          <section class="panel card">
            <div class="mf-tabs" role="tablist">
              ${[["tx", "Transactions"], ["plan", "Plan"], ["goal", "Goal"], ["metrics", "Product Metrics"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${S.tab === k}" class="${S.tab === k ? "on" : ""}" data-mf="tab" data-tab="${k}">${l}</button>`).join("")}
            </div>
            <div id="mf-tab">${renderTab(spending, insights)}</div>
          </section>
          <p class="caption">MoneyFlow MVP • Product-management case study • Synthetic/demo data only. Browser port of the Streamlit <code>app.py</code>.</p>
        </div>
      </div>`;

      requestAnimationFrame(() => {
        root.querySelectorAll(".fill[data-w]").forEach((el) => { el.style.width = el.dataset.w + "%"; });
        root.querySelectorAll(".ring .fg").forEach((el) => { el.style.strokeDashoffset = el.dataset.off; });
      });
    }

    function renderTab(spending, insights) {
      const spend = Object.fromEntries(spending);
      if (S.tab === "tx") {
        const q = S.search.trim().toLowerCase();
        const rows = draft.filter((t) => !q || t.merchant.toLowerCase().includes(q));
        return `
          <p class="muted" style="margin:0 0 14px;font-size:14px">Edit Date, Merchant, Amount and Category directly. Positive amounts are income; negative amounts are spending. Click <b>Save</b> to apply.</p>
          <div class="toolbar" style="margin-bottom:14px">
            <div class="field"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35"/></svg>
              <input type="search" id="mf-search" placeholder="Search merchant" value="${esc(S.search)}" aria-label="Search merchant"></div>
            <span class="muted mono" style="font-size:12.5px">${rows.length} of ${draft.length} rows</span>
          </div>
          <div class="tx-wrap"><table class="tx">
            <thead><tr><th style="width:150px">Date</th><th>Merchant</th><th style="width:150px">Amount (₹)</th><th style="width:170px">Category</th><th></th></tr></thead>
            <tbody>${rows.map((t) => {
              const orig = S.tx.find((o) => o.id === t.id);
              const dirty = !orig || orig.date !== t.date || orig.merchant !== t.merchant || String(orig.amount) !== String(t.amount) || orig.category !== t.category;
              return `<tr data-id="${t.id}" class="${dirty ? "dirty" : ""} ${Number(t.amount) > 0 ? "inc" : ""}">
                <td><input type="date" data-f="date" value="${esc(t.date)}" aria-label="Date"></td>
                <td><input type="text" data-f="merchant" value="${esc(t.merchant)}" aria-label="Merchant"></td>
                <td><input type="text" inputmode="decimal" class="amt" data-f="amount" value="${esc(t.amount)}" aria-label="Amount"></td>
                <td><select data-f="category" aria-label="Category">${CATEGORIES.map((c) => `<option ${c === t.category ? "selected" : ""}>${c}</option>`).join("")}</select></td>
                <td class="rm"><button type="button" data-mf="del" title="Remove row" aria-label="Remove row">✕</button></td></tr>`;
            }).join("") || `<tr><td colspan="5" class="muted" style="padding:20px;text-align:center">No transactions match.</td></tr>`}</tbody>
          </table></div>
          <div class="tx-actions">
            <button class="btn primary sm" type="button" data-mf="save">💾 Save transaction changes</button>
            <button class="btn ghost sm" type="button" data-mf="add">+ Add row</button>
            <button class="btn ghost sm" type="button" data-mf="discard">Discard edits</button>
          </div>
          <p class="caption">After saving, Income, Expenses, Net cash flow, insights, category spending and product instrumentation recalculate from the updated transactions.</p>`;
      }
      if (S.tab === "plan") {
        return `<h3 style="margin:0 0 4px;font-family:var(--display)">Flexible budget</h3>
          <p class="muted" style="margin:0 0 10px;font-size:14px">Set monthly category limits. These are planning inputs, not financial advice.</p>
          ${Object.keys(S.budgets).sort().map((c) => {
            const spent = spend[c] || 0, b = Number(S.budgets[c]) || 0;
            const pct = b ? Math.min(spent / b, 1) : 0;
            return `<div class="budget-row"><div>${esc(c)}</div>
              <div class="num-in"><span>₹</span><input type="number" min="0" step="500" value="${b}" data-budget="${esc(c)}" aria-label="Budget for ${esc(c)}"></div>
              <div><div class="pbar ${b && spent > b ? "over" : ""}"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
              <div class="ptext">${money(spent)} spent • ${money(Math.max(b - spent, 0))} remaining</div></div></div>`;
          }).join("")}`;
      }
      if (S.tab === "goal") {
        const g = S.goal;
        const p = Math.min(g.saved / g.target, 1);
        const C = 2 * Math.PI * 92;
        return `<div class="goal-grid">
          <div class="goal-form">
            <h3 style="margin:0;font-family:var(--display)">Savings goal</h3>
            <label>Goal name<input class="txt" type="text" data-goal="name" value="${esc(g.name)}"></label>
            <label>Target amount (₹)<div class="num-in"><span>₹</span><input type="number" min="1" step="1000" data-goal="target" value="${g.target}"></div></label>
            <label>Amount saved so far (₹)<div class="num-in"><span>₹</span><input type="number" min="0" step="500" data-goal="saved" value="${g.saved}"></div></label>
          </div>
          <div style="text-align:center">
            <div class="ring"><svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
              <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
              <circle class="bg" cx="110" cy="110" r="92"/><circle class="fg" cx="110" cy="110" r="92" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - p)}"/></svg>
              <div class="c"><div><b>${Math.round(p * 100)}%</b><small>complete</small></div></div></div>
            <p style="margin:16px 0 0"><span class="muted">${esc(g.name)} · Remaining</span><br><b style="font-family:var(--display);font-size:28px">${money(Math.max(g.target - g.saved, 0))}</b></p>
          </div></div>`;
      }
      // metrics
      const has = (k) => S.actions.includes(k);
      const actionable = S.actions.length;
      const rows = [
        ["Transactions loaded", S.tx.length], ["Actionable insights shown", insights.length], ["Actions completed", actionable],
        ["Transaction edits", +has("transaction_edit")], ["Category corrections", +has("category_correction")], ["Budget adjustments", +has("budget_adjustment")],
        ["Goal updates", +has("goal_update")], ["CSV uploads", +has("csv_upload")],
        ["Activation status", actionable ? '<span class="badge ok">Activated</span>' : '<span class="badge no">Not yet activated</span>'],
      ];
      return `<h3 style="margin:0 0 12px;font-family:var(--display)">Product analytics — demo session</h3>
        <table class="metrics-table">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
        <p class="caption">Session-level product instrumentation only. Values are generated from actual demo-session actions, not manually entered and not customer traction.</p>`;
    }

    function readDraftRow(tr) {
      const t = draft.find((d) => d.id === tr.dataset.id);
      if (!t) return;
      tr.querySelectorAll("[data-f]").forEach((inp) => { t[inp.dataset.f] = inp.value; });
      const orig = S.tx.find((o) => o.id === t.id);
      const dirty = !orig || orig.date !== t.date || orig.merchant !== t.merchant || String(orig.amount) !== String(t.amount) || orig.category !== t.category;
      tr.classList.toggle("dirty", dirty);
      tr.classList.toggle("inc", Number(t.amount) > 0);
    }

    function saveEdits() {
      const errors = [];
      const updated = [];
      draft.forEach((t, i) => {
        const n = i + 1;
        const date = parseDate(t.date);
        const merchant = String(t.merchant).trim();
        const amount = parseAmount(t.amount);
        let category = String(t.category).trim();
        const before = errors.length;
        if (!date) errors.push(`Row ${n}: invalid date.`);
        if (!merchant) errors.push(`Row ${n}: merchant cannot be blank.`);
        if (isNaN(amount)) errors.push(`Row ${n}: amount must be numeric.`);
        if (!CATEGORIES.includes(category)) errors.push(`Row ${n}: invalid category.`);
        if (isNaN(amount) || amount === 0) errors.push(`Row ${n}: amount cannot be ₹0. Use positive for income or negative for spending.`);
        if (errors.length > before) return;
        if (amount > 0) category = "Income";
        else if (category === "Income") category = inferCategory(merchant, amount);
        updated.push({ id: t.id, date, merchant, amount, category });
      });
      if (errors.length) { setMsg("err", errors.slice(0, 8).concat(errors.length > 8 ? [`…and ${errors.length - 8} more`] : [])); toast("Fix the highlighted validation errors"); render(); return; }
      const sorted = sortByDate(updated);
      const byId = new Map(S.tx.map((t) => [t.id, t]));
      const changed = sorted.length !== S.tx.length || sorted.some((t) => { const o = byId.get(t.id); return !o || o.date !== t.date || o.merchant !== t.merchant || o.amount !== t.amount || o.category !== t.category; });
      const categoryChanged = sorted.some((t) => { const o = byId.get(t.id); return o && o.category !== t.category; });
      S.tx = sorted;
      if (changed) act("transaction_edit");
      if (categoryChanged) act("category_correction");
      freshDraft();
      setMsg("ok", changed ? "Transaction changes saved successfully." : "No transaction changes were detected.");
      toast(changed ? "Transactions saved — everything recalculated" : "No transaction changes were detected");
      save(); render();
    }

    function loadFile(file) {
      if (!file) return;
      if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") { setMsg("err", "Please choose a .csv file."); render(); return; }
      if (file.size > 5 * 1024 * 1024) { setMsg("err", "File is larger than 5 MB — please use a smaller demo file."); render(); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const { tx, invalid } = normalizeTransactions(parseCsv(String(reader.result)));
          if (!tx.length) throw new Error("No valid rows were found in the CSV.");
          S.tx = tx; act("csv_upload"); freshDraft();
          const lines = ["CSV loaded successfully."];
          if (invalid) lines.push(`${invalid} row(s) failed validation and were removed.`);
          setMsg(invalid ? "warn" : "ok", lines);
          toast(`Loaded ${tx.length} transactions`);
          save();
        } catch (e) { setMsg("err", e.message || String(e)); }
        render();
      };
      reader.onerror = () => { setMsg("err", "Could not read that file."); render(); };
      reader.readAsText(file);
    }

    function downloadSample() {
      const lines = ["date,merchant,amount,category", ...DEMO_DATA.map((r) => r.map((v) => (/[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(","))];
      const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "moneyflow_sample_transactions.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    /* ---- events (delegated) ---- */
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mf]");
      if (!b) return;
      const kind = b.dataset.mf;
      if (kind === "tab") { S.tab = b.dataset.tab; render(); }
      else if (kind === "insight") { act(b.dataset.key); save(); toast("Action recorded for this demo session."); render(); }
      else if (kind === "reset") { S = defaultState(); freshDraft(); msg = null; save(); toast("Reset to demo data"); render(); }
      else if (kind === "sample") downloadSample();
      else if (kind === "save") saveEdits();
      else if (kind === "discard") { freshDraft(); msg = null; render(); }
      else if (kind === "add") {
        const today = new Date();
        draft.unshift({ id: nextId(), date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`, merchant: "", amount: "", category: "Other" });
        S.search = ""; render();
        const first = root.querySelector('.tx tbody tr [data-f="merchant"]');
        first && first.focus();
      } else if (kind === "del") {
        const tr = b.closest("tr");
        draft = draft.filter((d) => d.id !== tr.dataset.id);
        render();
        toast("Row removed — click Save to apply");
      }
    });
    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.id === "mf-search") {
        S.search = t.value;
        const pos = t.selectionStart;
        const tab = root.querySelector("#mf-tab");
        tab.innerHTML = renderTab(getSpending(S.tx), buildInsights(S.tx, S.budgets));
        const ns = root.querySelector("#mf-search");
        if (ns) { ns.focus(); try { ns.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } }
        return;
      }
      if (t.dataset.f) readDraftRow(t.closest("tr"));
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "mf-file") { loadFile(t.files && t.files[0]); t.value = ""; return; }
      if (t.dataset.f) { readDraftRow(t.closest("tr")); return; }
      if (t.dataset.budget) {
        const v = Math.max(0, Number(t.value) || 0);
        if (v !== Number(S.budgets[t.dataset.budget])) { S.budgets[t.dataset.budget] = v; act("budget_adjustment"); save(); }
        render(); return;
      }
      if (t.dataset.goal) {
        const g = { ...S.goal };
        if (t.dataset.goal === "name") g.name = t.value;
        if (t.dataset.goal === "target") g.target = Math.max(1, Number(t.value) || 1);
        if (t.dataset.goal === "saved") g.saved = Math.max(0, Number(t.value) || 0);
        if (g.name !== S.goal.name || g.target !== S.goal.target || g.saved !== S.goal.saved) { S.goal = g; act("goal_update"); save(); }
        render();
      }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches("[data-budget], [data-goal]")) e.target.dispatchEvent(new Event("change", { bubbles: true }));
    });
    ["dragenter", "dragover"].forEach((ev) => root.addEventListener(ev, (e) => {
      const d = e.target.closest && e.target.closest("#mf-drop");
      if (d) { e.preventDefault(); d.classList.add("over"); }
    }));
    ["dragleave", "drop"].forEach((ev) => root.addEventListener(ev, (e) => {
      const d = e.target.closest && e.target.closest("#mf-drop");
      if (!d) return;
      e.preventDefault(); d.classList.remove("over");
      if (ev === "drop" && e.dataTransfer && e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
    }));

    render();
  }

  window.MoneyFlow = { mount, _test: { inferCategory, normalizeTransactions, parseCsv, buildInsights, getMetrics, getSpending, parseDate, parseAmount, loadDemo, money, DEFAULT_BUDGETS } };
})();