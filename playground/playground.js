/* Playground: four small games in the site's voice. Loaded the first time the playground opens.
   Everything stays in this browser (localStorage). No accounts, no tracking. */
(function () {
  "use strict";
  // ============================================================
  //  core: helpers, saved state, shell, hub
  // ============================================================
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function h(tag, a, kids) {
    var e = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v;
      else if (k === "style") e.style.cssText = v; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function svgEl(markup) { var d = document.createElement("div"); d.innerHTML = markup; return d.firstElementChild; }
  function btn(label, o) {
    o = o || {};
    var b = h("button", { type: "button", class: "pg-btn" + (o.primary ? " primary" : "") + (o.ghost ? " ghost" : ""), text: label });
    if (o.onclick) b.addEventListener("click", o.onclick);
    return b;
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function hashStr(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function fmtNum(n) {                                        // 11,800,000 -> "11.8 million"
    if (!isFinite(n)) return "—";
    var a = Math.abs(n), s;
    if (a >= 1e12) s = trim(n / 1e12) + " trillion"; else if (a >= 1e9) s = trim(n / 1e9) + " billion"; else if (a >= 1e6) s = trim(n / 1e6) + " million";
    else if (a >= 100) s = Math.round(n).toLocaleString("en-US"); else s = trim(n);
    return s;
    function trim(x) { return String(parseFloat(x.toPrecision(3))); }
  }
  function ink() { return ((getComputedStyle(document.documentElement).getPropertyValue("--fg-rgb") || "229,229,229").replace(/\s/g, "")); }
  function copyText(t) {
    var p = (navigator.clipboard && navigator.clipboard.writeText) ? navigator.clipboard.writeText(t) : Promise.reject();
    return p.catch(function () { var ta = document.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); });
  }

  // ---------- saved state (this browser only) ----------
  var KEY = "ray-playground-v1";
  function loadState() {
    try { var o = JSON.parse(localStorage.getItem(KEY)); if (o && typeof o === "object") { o.best = o.best || {}; o.daily = o.daily || {}; o.days = o.days || []; o.tokens = o.tokens || 0; return o; } } catch (e) {}
    return { tokens: 0, best: {}, daily: {}, days: [] };
  }
  var S = loadState();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function markDay() { var t = today(); if (S.days.indexOf(t) < 0) { S.days.push(t); if (S.days.length > 400) S.days.shift(); } save(); }
  function streak() {
    var set = {}; S.days.forEach(function (d) { set[d] = 1; });
    var n = 0, d = new Date(); if (!set[ymd(d)]) d.setDate(d.getDate() - 1);
    while (set[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  var RANKS = [[0, "rookie"], [100, "tinkerer"], [300, "regular"], [700, "sharp"], [1500, "oracle"]];
  function rank() { var r = RANKS[0][1]; RANKS.forEach(function (x) { if (S.tokens >= x[0]) r = x[1]; }); return r; }

  // ---------- shell ----------
  var R, viewEl, crumbEl, rankEl, streakEl, backEl, backLbl, cur = "hub", GAMES = [];

  function refreshChips() {
    rankEl.firstChild && (rankEl.querySelector("b").textContent = S.tokens);
    rankEl.querySelector("span").textContent = rank();
    var st = streak(); streakEl.hidden = st < 1; streakEl.querySelector("b").textContent = st + "d";
  }
  function award(n) {
    if (!n) return;
    S.tokens += n; markDay(); refreshChips();
    var p = h("span", { class: "pg-plus", text: "+" + n }); rankEl.appendChild(p); setTimeout(function () { p.remove(); }, 1200);
    rankEl.classList.remove("bump"); void rankEl.offsetWidth; rankEl.classList.add("bump");
  }
  function burst(x, y, colors, n) {
    if (RM || !R) return;
    n = n || 34;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var c = h("span", { class: "pg-conf" }); c.style.left = x + "px"; c.style.top = y + "px"; c.style.background = colors[i % colors.length];
        var a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 200;
        R.appendChild(c);
        c.animate([{ transform: "translate(0,0) rotate(0deg)", opacity: 1 }, { transform: "translate(" + Math.cos(a) * d + "px," + (Math.sin(a) * d + 90) + "px) rotate(" + (Math.random() * 720 - 360) + "deg)", opacity: 0 }],
          { duration: 900 + Math.random() * 700, easing: "cubic-bezier(.15,.8,.3,1)" }).onfinish = function () { c.remove(); };
      })(i);
    }
  }
  var COLORS = ["#4493f8", "#fbbf24", "#f43f7a", "#34d399", "#a78bfa"];

  // drifting doodles in the background
  function doodles() {
    var shapes = [
      '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M24 7 L42 40 H6 Z"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M24 8V40M8 24H40"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M5 30 C11 14 17 14 23 30 S35 46 43 18"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M6 36 L16 14 L26 36 L36 14 L44 30"/></svg>',
      '<svg viewBox="0 0 48 48"><rect x="10" y="10" width="28" height="28" rx="3"/></svg>',
      '<svg viewBox="0 0 48 48"><path d="M24 6 L29 19 L43 19 L32 28 L36 42 L24 33 L12 42 L16 28 L5 19 L19 19 Z"/></svg>'
    ];
    var r = rng(7), box = h("div", { class: "pg-doodles", "aria-hidden": "true" });
    shapes.forEach(function (m, i) {
      var e = svgEl(m);
      e.style.cssText = "left:" + (4 + Math.round(r() * 88)) + "%;top:" + (8 + Math.round(r() * 84)) + "%;--s:" + (34 + Math.round(r() * 34)) + "px;--dc:" + COLORS[i % COLORS.length] +
        ";--t:" + (14 + Math.round(r() * 14)) + "s;--d:-" + Math.round(r() * 12) + "s;--dx:" + Math.round(r() * 70 - 35) + "px;--dy:" + Math.round(r() * 80 - 40) + "px;--r0:" + Math.round(r() * 60 - 30) + "deg;--r1:" + Math.round(r() * 160 - 80) + "deg";
      box.appendChild(e);
    });
    return box;
  }

  function mount(root) {
    if (R === root && viewEl) return;
    R = root; R.innerHTML = "";
    backLbl = h("span", { text: "site" });
    backEl = h("button", { type: "button", class: "pg-chip", "data-pg-close": "", "aria-label": "Back" }, [svgEl('<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>'), backLbl]);
    backEl.addEventListener("click", function (e) {
      // inside a game this chip means "back to the shelf". Without stopPropagation the page-level handler would also see the
      // chip become "back to the site" mid-click and close the whole playground.
      if (cur !== "hub") { e.stopPropagation(); go("hub"); }
    });
    crumbEl = h("div", { class: "pg-crumb" });
    streakEl = h("span", { class: "pg-chip streak", hidden: "", title: "days in a row you played something" }, [h("i", { style: "background:var(--pink)" }), h("b", { text: "0d" }), h("span", { text: "streak" })]);
    rankEl = h("span", { class: "pg-chip", title: "tokens: earned by playing, spent on nothing" }, [h("i"), h("b", { text: S.tokens }), h("span", { text: rank() })]);
    viewEl = h("div", { class: "pg-view" });
    R.appendChild(doodles());
    R.appendChild(h("div", { class: "pg-top" }, [backEl, crumbEl, streakEl, rankEl]));
    R.appendChild(viewEl);
    refreshChips();
    go("hub");
  }

  function byId(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }

  function go(id) {
    cur = id; viewEl.innerHTML = "";
    var g = byId(id);
    viewEl.appendChild(g ? gameScreen(g) : hubScreen());
    crumbEl.innerHTML = g ? "playground / <b>" + g.name.toLowerCase() + "</b>" : "<b>playground</b>";
    backLbl.textContent = g ? "games" : "site";
    if (g) backEl.removeAttribute("data-pg-close"); else backEl.setAttribute("data-pg-close", "");
    var sp = R.parentNode; if (sp) sp.scrollTop = 0;
    if (!g) setTimeout(function () { var c = viewEl.querySelector(".cart"); if (c && !RM) { /* leave focus alone on touch */ } }, 0);
  }

  function cartStat(g) {
    var d = S.daily[today()] || {}, done = d[g.id] != null;
    var text;
    if (g.id === "call") { var n = 0; try { n = (JSON.parse(localStorage.getItem("ray-calls-v1")) || []).length; } catch (e) {} text = n ? n + " call" + (n === 1 ? "" : "s") + " logged" : "no calls yet"; }
    else text = S.best[g.id] != null ? "best " + S.best[g.id] + "/" + g.max : "no score yet";
    return h("span", { html: text.replace(/(\d+\/\d+|\d+ calls?)/, "<b>$1</b>") + (done ? ' <span class="cart-done">today ✓</span>' : "") });
  }

  function hubScreen() {
    var scr = h("div", { class: "pg-screen" });
    var title = h("h1", { class: "pg-title", "aria-label": "Playground" });
    "Playground".split("").forEach(function (ch, i) {
      var l = h("span", { class: "l", text: ch, "aria-hidden": "true" }); l.style.setProperty("--lc", COLORS[i % COLORS.length]); l.style.setProperty("--rot", (i % 2 ? 7 : -7) + "deg");
      l.addEventListener("pointerenter", function () { l.classList.add("pop"); setTimeout(function () { l.classList.remove("pop"); }, 420); });
      title.appendChild(l);
    });
    var tick = ["estimate", "guess", "overthink", "guess again", "no accounts", "no tracking", "scores stay on this device", "be wrong, but precisely"];
    var tickHtml = ""; tick.forEach(function (t, i) { tickHtml += "<span>" + t + "</span><em>✦</em>"; });
    scr.appendChild(h("div", { class: "pg-hero" }, [
      h("div", { class: "pg-kicker", text: "// four small games" }),
      title,
      svgEl('<svg class="pg-squig" viewBox="0 0 420 18" preserveAspectRatio="none" aria-hidden="true"><path d="M2 12 C 30 2, 50 2, 78 10 S 130 18, 160 8 S 215 2, 245 10 S 300 18, 330 8 S 390 4, 418 10"/></svg>'),
      h("p", { class: "pg-sub", html: "Things I like thinking about, turned into games: <b>calibration</b>, <b>estimation</b> and <b>being delightfully wrong</b>. Nothing here is saved anywhere but your own browser." }),
      h("div", { class: "pg-ticker", "aria-hidden": "true" }, [h("div", { class: "pg-ticker-in", html: tickHtml + tickHtml })])
    ]));
    var grid = h("div", { class: "pg-grid" });
    GAMES.forEach(function (g) {
      var c = h("button", { type: "button", class: "cart", style: "--c:" + g.color, "aria-label": g.name + ": " + g.sub }, [
        h("span", { class: "cart-top" }, [h("span", { class: "cart-no", text: g.no }), h("span", { class: "cart-tag", text: g.tag })]),
        h("span", { class: "cart-art", html: g.art }),
        h("span", { class: "cart-title", text: g.name }),
        h("span", { class: "cart-sub", text: g.sub }),
        h("span", { class: "cart-foot" }, [cartStat(g), h("span", { class: "cart-go" }, [document.createTextNode("play"), svgEl('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>')])])
      ]);
      c.addEventListener("click", function () { go(g.id); });
      grid.appendChild(c);
    });
    scr.appendChild(grid);
    var reset = h("button", { type: "button", text: "reset my scores" });
    reset.addEventListener("click", function () {
      if (!confirm("Wipe tokens, best scores and streak on this device?")) return;
      S = { tokens: 0, best: {}, daily: {}, days: [] }; save(); refreshChips(); go("hub");
    });
    scr.appendChild(h("div", { class: "pg-foot" }, [h("span", { text: "made with questionable confidence" }), reset]));
    return scr;
  }

  function gameScreen(g) {
    var scr = h("div", { class: "pg-screen pg-game", style: "--c:" + g.color + ";--gc:" + g.color });
    scr.appendChild(h("div", { class: "gm-head" }, [h("span", { class: "gm-no", text: g.no }), h("h2", { class: "gm-name", text: g.name }), h("span", { class: "gm-tag", text: g.tag })]));
    var card = h("div", { class: "gm-card" });
    scr.appendChild(card);
    var ctx = {
      el: card, color: g.color, award: award, burst: burst, colors: COLORS, game: g, back: function () { go("hub"); },
      record: function (total, daily) {                 // remember best score; a daily run also counts as "done today"
        if (S.best[g.id] == null || total > S.best[g.id]) S.best[g.id] = total;
        if (daily) { var t = today(); S.daily[t] = S.daily[t] || {}; S.daily[t][g.id] = total; }
        markDay(); save();
      }
    };
    try { g.run(ctx); } catch (e) { card.appendChild(h("p", { class: "gm-note", text: "this game crashed: " + e.message })); }
    return scr;
  }

  // a shared intro: today's set (same for everyone) or a random one
  function intro(ctx, o) {
    var el = ctx.el, d = (S.daily[today()] || {})[ctx.game.id];
    el.innerHTML = "";
    el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: o.kicker }), h("span", { text: o.meta })]));
    el.appendChild(h("p", { class: "gm-q", text: o.title }));
    el.appendChild(h("p", { class: "gm-note", html: o.rules }));
    var row = h("div", { class: "gm-row" });
    var dailyB = btn(d != null ? "replay today's (" + d + "/" + ctx.game.max + ")" : "today's set", { primary: true, onclick: function () { o.start(true); } });
    var randB = btn("random set", { onclick: function () { o.start(false); } });
    row.appendChild(dailyB); row.appendChild(randB); el.appendChild(row);
    el.appendChild(h("p", { class: "gm-note", style: "margin-top:14px", text: "today's set is the same for everyone on " + today() + " and changes at midnight. random sets are for practice." }));
  }
  // ============================================================
  //  01  CALL IT: forecast live Manifold questions, keep a scored record
  // ============================================================
  function runCall(ctx) {
    var API = "https://api.manifold.markets/v0", CK = "ray-calls-v1", DAY = 864e5, el = ctx.el;
    var queue = [], cur = null, locked = false;
    function loadCalls() { try { return JSON.parse(localStorage.getItem(CK)) || []; } catch (e) { return []; } }
    function saveCalls(a) { try { localStorage.setItem(CK, JSON.stringify(a)); } catch (e) {} }
    function pct(x) { return Math.round(x * 100) + "%"; }
    function safeUrl(u) { return typeof u === "string" && u.indexOf("https://manifold.markets/") === 0 ? u : "https://manifold.markets"; }
    function closesIn(t) { var d = Math.ceil((t - Date.now()) / DAY); return d <= 0 ? "closes today" : d === 1 ? "closes tomorrow" : "closes in " + d + " days"; }

    var closeEl = h("span", { html: "&nbsp;" }), linkEl = h("a", { href: "https://manifold.markets", target: "_blank", rel: "noopener noreferrer", text: "on manifold ↗" });
    var q = h("p", { class: "gm-q", text: "pulling a live question…" });
    var num = h("span", { class: "ci-num", text: "50%" });
    var slider = h("input", { type: "range", min: 1, max: 99, value: 50, class: "pg-range", "aria-label": "Your probability that this resolves YES", disabled: "" });
    var crowd = h("div", { class: "ci-crowd", text: "crowd: hidden until you lock it in (no peeking, no anchoring)" }), res = h("p", { class: "ci-res" });
    var lockB = btn("lock it in", { primary: true }), skipB = btn("skip");
    lockB.disabled = skipB.disabled = true;
    var rec = h("div", { class: "ci-rec" });
    el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "<b>forecast real questions</b> from manifold markets" }), h("span", { text: "live" })]));
    el.appendChild(h("div", { class: "ci-meta", style: "margin-top:14px" }, [closeEl, linkEl]));
    el.appendChild(q);
    el.appendChild(h("div", { class: "ci-big" }, [num, h("span", { class: "ci-lab", text: "your call" })]));
    el.appendChild(slider); el.appendChild(h("div", { class: "gm-row" }, [lockB, skipB])); el.appendChild(crowd); el.appendChild(res); el.appendChild(rec);

    function fetchQueue() {
      var url = API + "/search-markets?term=&sort=24-hour-vol&filter=open&contractType=BINARY&limit=80";
      return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (list) {
        var seen = {}; loadCalls().forEach(function (c) { seen[c.id] = 1; }); var now = Date.now();
        var ok = list.filter(function (m) { return !seen[m.id] && m.closeTime > now && (m.uniqueBettorCount || 0) >= 15 && m.probability > 0.03 && m.probability < 0.97; });
        var soon = ok.filter(function (m) { return m.closeTime < now + 75 * DAY; });
        queue = shuffle(soon.length >= 3 ? soon : ok, Math.random);
      });
    }
    function fail(msg) {
      cur = null; q.textContent = msg; closeEl.innerHTML = "&nbsp;"; lockB.disabled = true; slider.disabled = true;
      skipB.textContent = "retry"; skipB.disabled = false; skipB.onclick = function () { next(true); };
    }
    function show(m) {
      cur = m; locked = false; q.textContent = m.question; closeEl.textContent = closesIn(m.closeTime); linkEl.href = safeUrl(m.url);
      slider.value = 50; num.textContent = "50%"; slider.disabled = false; crowd.textContent = "crowd: hidden until you lock it in (no peeking, no anchoring)"; res.textContent = "";
      lockB.disabled = false; skipB.disabled = false; skipB.textContent = "skip"; skipB.onclick = function () { next(); };
    }
    function next(force) {
      lockB.disabled = true; skipB.disabled = true;
      if (queue.length && !force) { show(queue.shift()); return; }
      q.textContent = "pulling a live question…";
      fetchQueue().then(function () { if (!queue.length) fail("nothing fresh to predict right now. check back soon."); else show(queue.shift()); })
        .catch(function () { fail("couldn't reach manifold. check your connection and retry."); });
    }
    slider.addEventListener("input", function () { num.textContent = slider.value + "%"; });
    lockB.addEventListener("click", function () {
      if (!cur || locked) return; locked = true;
      var mine = +slider.value / 100, c = cur.probability, calls = loadCalls();
      calls.unshift({ id: cur.id, q: cur.question, url: safeUrl(cur.url), mine: mine, crowd: c, close: cur.closeTime, t: Date.now(), res: null }); saveCalls(calls);
      var diff = Math.round((mine - c) * 100);
      crowd.innerHTML = "crowd said <b>" + pct(c) + "</b>";
      res.textContent = (diff === 0 ? "dead on the crowd." : Math.abs(diff) + " points " + (diff > 0 ? "above" : "below") + " the crowd.") + " logged. you'll be scored when it resolves.";
      lockB.disabled = true; slider.disabled = true; skipB.textContent = "next question";
      var r = lockB.getBoundingClientRect(); ctx.burst(r.left + r.width / 2, r.top, ctx.colors, 18); ctx.award(5); markDay();
      renderRecord();
    });

    // ---- the record: Brier score against the crowd, plus a calibration chart ----
    function brier(p, o) { return (p - o) * (p - o); }
    function resolveOne(c) {
      var ck = "mkres-" + c.id;
      try { var hit = JSON.parse(sessionStorage.getItem(ck)); if (hit && Date.now() - hit.t < 600000) return Promise.resolve(hit.d); } catch (e) {}
      return fetch(API + "/market/" + c.id).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (m) {
        var d = { done: !!m.isResolved, res: m.resolution || null };
        try { sessionStorage.setItem(ck, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d;
      });
    }
    function drawCal(box, list) {
      var NEED = 5, hint = h("p", { class: "gm-note", style: "margin-top:12px" });
      if (list.length < NEED) { hint.textContent = list.length ? list.length + " of " + NEED + " resolved calls needed for a calibration chart." : "a calibration chart shows up here once " + NEED + " of your calls resolve."; box.appendChild(hint); return; }
      var cv = h("canvas", { class: "pg-cal", role: "img", "aria-label": "Calibration chart: how often your stated probabilities came true" });
      box.appendChild(cv); hint.textContent = "when you say 70%, does it happen about 70% of the time? dots on the dashed diagonal are perfectly calibrated. solid is you, hollow is the crowd."; box.appendChild(hint);
      requestAnimationFrame(function () {
        var w = cv.clientWidth, hh = cv.clientHeight; if (!w) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = w * dpr; cv.height = hh * dpr;
        var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var L = 36, Rr = 10, T = 8, B = 26, pw = w - L - Rr, ph = hh - T - B, I = ink();
        var X = function (p) { return L + p * pw; }, Y = function (p) { return T + (1 - p) * ph; };
        g.font = "10px 'Geist Mono', monospace"; g.lineWidth = 1;
        [0, 0.25, 0.5, 0.75, 1].forEach(function (p) {
          g.strokeStyle = "rgba(" + I + ",0.16)"; g.beginPath(); g.moveTo(L, Y(p)); g.lineTo(L + pw, Y(p)); g.stroke(); g.beginPath(); g.moveTo(X(p), T); g.lineTo(X(p), T + ph); g.stroke();
          g.fillStyle = "rgba(" + I + ",0.55)"; g.textAlign = "right"; g.fillText(Math.round(p * 100) + "%", L - 6, Y(p) + 3); g.textAlign = "center"; g.fillText(Math.round(p * 100) + "%", X(p), hh - 10);
        });
        g.setLineDash([4, 4]); g.strokeStyle = "rgba(" + I + ",0.5)"; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(1)); g.stroke(); g.setLineDash([]);
        function bins(key) {
          var b = [0, 1, 2, 3, 4].map(function () { return { s: 0, o: 0, n: 0 }; });
          list.forEach(function (c) { var p = c[key], i = Math.min(4, Math.floor(p * 5)); b[i].s += p; b[i].o += c.o; b[i].n++; });
          return b.filter(function (x) { return x.n; }).map(function (x) { return { x: x.s / x.n, y: x.o / x.n, n: x.n }; });
        }
        function plot(pts, color, solid) {
          g.strokeStyle = color; g.lineWidth = 1.8; g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(X(p.x), Y(p.y)); else g.moveTo(X(p.x), Y(p.y)); }); g.stroke();
          pts.forEach(function (p) { g.beginPath(); g.arc(X(p.x), Y(p.y), 3.5 + Math.sqrt(p.n) * 1.6, 0, 6.2832); g.fillStyle = solid ? color : getComputedStyle(document.documentElement).getPropertyValue("--bg"); g.fill(); g.lineWidth = 2; g.stroke(); });
        }
        plot(bins("crowd"), "rgba(" + I + ",0.45)", false); plot(bins("mine"), ctx.color, true);
      });
    }
    function renderRecord() {
      var calls = loadCalls(); rec.innerHTML = ""; if (!calls.length) return;
      var n = 0, bm = 0, bc = 0, beat = 0, scored = [], list = h("div");
      calls.forEach(function (c) {
        var s = h("span"), a = h("a", { href: safeUrl(c.url), target: "_blank", rel: "noopener noreferrer", text: c.q }), line = "you " + pct(c.mine) + " · crowd " + pct(c.crowd) + " · ";
        if (c.res === "YES" || c.res === "NO") {
          var o = c.res === "YES" ? 1 : 0, m = brier(c.mine, o), k = brier(c.crowd, o); n++; bm += m; bc += k; if (m < k) beat++; scored.push({ mine: c.mine, crowd: c.crowd, o: o });
          s.textContent = line + c.res + " · brier " + m.toFixed(2) + " vs " + k.toFixed(2); s.className = m < k ? "win" : m > k ? "lose" : "";
        } else if (c.res) s.textContent = line + "voided (" + c.res.toLowerCase() + ")";
        else s.textContent = line + (c.close > Date.now() ? closesIn(c.close) : "awaiting resolution");
        list.appendChild(h("div", { class: "ci-row" }, [a, s]));
      });
      rec.appendChild(h("h3", { text: "your record" }));
      rec.appendChild(h("div", { class: "ci-sum", html: n ? "<b>" + n + "</b> scored · your brier <b>" + (bm / n).toFixed(3) + "</b> vs crowd <b>" + (bc / n).toFixed(3) + "</b> · beat the crowd <b>" + beat + "/" + n + "</b> (lower brier is better)"
        : "<b>" + calls.length + "</b> call" + (calls.length === 1 ? "" : "s") + " logged. scores show up here once they resolve." }));
      rec.appendChild(list);
      drawCal(rec, scored);
      var clear = btn("clear record", { ghost: true, onclick: function () { saveCalls([]); renderRecord(); } }); clear.style.marginTop = "14px"; rec.appendChild(clear);
    }
    function refreshRecord() {
      var calls = loadCalls(), pending = calls.filter(function (c) { return !c.res; }).slice(0, 12); if (!pending.length) return;
      Promise.all(pending.map(function (c) { return resolveOne(c).then(function (d) { if (d.done && d.res) c.res = d.res; }, function () {}); })).then(function () {
        var all = loadCalls(); pending.forEach(function (p) { all.forEach(function (c) { if (c.id === p.id && p.res) c.res = p.res; }); }); saveCalls(all); if (el.isConnected) renderRecord();
      });
    }
    renderRecord(); refreshRecord(); next(true);
  }

  // ============================================================
  //  02  NAPKIN: estimate hard-to-know numbers (no googling, napkin allowed)
  // ============================================================
  var NAPKIN = [
    { q: "How many people live in Ohio?", unit: "people", a: 11800000, math: "The US has ~330 million people. Ohio is around 3.5% of that, so ~11.5 million. (Greater Cincinnati alone is about 2.3 million.)", fun: "More people live in Ohio than in Sweden." },
    { q: "How tall is the Burj Khalifa?", unit: "metres", a: 828, math: "About 160 floors at roughly 4–5 m each lands you just over 800 m.", fun: "That is about two and a half Eiffel Towers stacked up." },
    { q: "How many US gallons of water fill an Olympic swimming pool?", unit: "gallons", a: 660000, math: "50 m × 25 m × 2 m deep = 2,500 m³. One m³ is about 264 gallons, so ~660,000.", fun: "Roughly ten thousand bathtubs." },
    { q: "How many times does a resting heart beat in one year?", unit: "beats", a: 38000000, math: "~72 beats a minute × 60 × 24 × 365 ≈ 37.8 million.", fun: "A year of you is 38 million drum hits you never had to think about." },
    { q: "How far away is the Moon, on average?", unit: "kilometres", a: 384400, math: "Light takes about 1.3 seconds to reach the Moon and travels ~300,000 km every second, so ~390,000 km.", fun: "Roughly 30 Earths would fit side by side between us and it." },
    { q: "How many steps are there in the Empire State Building (street to the 86th floor)?", unit: "steps", a: 1576, math: "86 floors at around 18 steps a floor is about 1,550.", fun: "There is an annual race up all of them." },
    { q: "How much does the Eiffel Tower weigh?", unit: "tonnes", a: 10100, math: "It is a 330 m lattice of roughly 18,000 iron parts. The official total is about 10,100 tonnes.", fun: "Melted down, the iron would reportedly cover its own square base only a few centimetres deep." },
    { q: "How long is the Mississippi River?", unit: "miles", a: 2340, math: "A straight line from its source in northern Minnesota to the Gulf of Mexico is only about 1,250 miles. All those bends nearly double it to ~2,340.", fun: "Its name comes from the Ojibwe words for “great river”." },
    { q: "How many regular-season NFL games get played across the whole league each year?", unit: "games", a: 272, math: "32 teams × 17 games each ÷ 2 (every game has two teams) = 272.", fun: "Plus a few playoff games, and the Bengals hope for several." },
    { q: "What is the capacity of the Bengals' stadium, Paycor Stadium?", unit: "seats", a: 65515, math: "NFL stadiums hold roughly 60,000–80,000. The Bengals' is mid-sized at about 65,500.", fun: "It opened in 2000 as Paul Brown Stadium." },
    { q: "How many years is one billion seconds?", unit: "years", a: 31.7, math: "One year is about 31.5 million seconds, so 1,000,000,000 ÷ 31,500,000 ≈ 32 years.", fun: "A million seconds is only 11.6 days. Billions are a different animal." },
    { q: "How tall is Mount Everest?", unit: "feet", a: 29032, math: "About 8.85 km, and one km is about 3,281 feet → ~29,000 ft.", fun: "The summit sits a bit below where jets cruise (around 35,000 ft)." },
    { q: "What is the population of the city of Cincinnati (not the metro area)?", unit: "people", a: 309317, math: "The metro area is about 2.3 million people, and the city itself is only around a seventh of that.", fun: "The 2020 census counted 309,317." },
    { q: "How long is the Great Wall of China, by the official 2012 survey?", unit: "kilometres", a: 21196, math: "It was surveyed as many wall segments across several dynasties, adding up to roughly half of Earth's 40,000 km circumference.", fun: "Mostly it is not one continuous wall." },
    { q: "About how many Starbucks stores exist worldwide?", unit: "stores", a: 40000, math: "Roughly 16,000 in the US plus ~24,000 abroad (China alone has thousands). The count was about 40,000 in late 2024.", fun: "One of them has a barista still memorizing the drink recipes." },
    { q: "About how many hairs are on a typical human head?", unit: "hairs", a: 100000, math: "Around 1,000 follicles per cm² over about 100 cm² of scalp ≈ 100,000.", fun: "Blondes have more, redheads have fewer." },
    { q: "How many miles of public road are there in the United States?", unit: "miles", a: 4200000, math: "Roughly 4 million miles, enough to circle the Earth (24,900 mi) about 170 times.", fun: "Most of it is not interstates: it is small local roads." },
    { q: "How many Earths would fit inside the Sun (by volume)?", unit: "Earths", a: 1300000, math: "The Sun is about 109 Earths across. Volume scales with the cube: 109³ ≈ 1.3 million.", fun: "And the Sun is just an average star." },
    { q: "How many gallons of gasoline does the US burn every day?", unit: "gallons per day", a: 370000000, math: "~280 million vehicles × ~12,000 miles a year ÷ ~25 mpg ≈ 134 billion gallons a year ≈ 370 million a day.", fun: "That is more than a gallon a day for every man, woman and child in the country." },
    { q: "How old is the universe?", unit: "years", a: 13800000000, math: "Expansion rate and the cosmic microwave background both point to about 13.8 billion years.", fun: "Earth is about a third that age." }
  ];

  // a tiny calculator with no eval(): + - * / ^ ( ), 1e6, and k / m / b / t suffixes
  function calc(src) {
    var s = String(src).replace(/,/g, "").replace(/[×x]/gi, function (c) { return c === "x" || c === "X" ? "*" : "*"; }).replace(/÷/g, "/").replace(/\s+/g, ""), i = 0;
    var SUF = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    function num() {
      var m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?([kmbt])?/i.exec(s.slice(i)); if (!m) throw new Error("number expected");
      i += m[0].length; var v = parseFloat(m[1] + (m[2] || "")); if (m[3]) v *= SUF[m[3].toLowerCase()]; return v;
    }
    function prim() { if (s[i] === "(") { i++; var v = expr(); if (s[i] !== ")") throw new Error("missing )"); i++; return v; } if (s[i] === "-") { i++; return -prim(); } if (s[i] === "+") { i++; return prim(); } return num(); }
    function pow() { var b = prim(); if (s[i] === "^") { i++; return Math.pow(b, pow()); } return b; }
    function term() { var v = pow(); while (s[i] === "*" || s[i] === "/") { var o = s[i++], r = pow(); v = o === "*" ? v * r : v / r; } return v; }
    function expr() { var v = term(); while (s[i] === "+" || s[i] === "-") { var o = s[i++], r = term(); v = o === "+" ? v + r : v - r; } return v; }
    var out = expr(); if (i !== s.length) throw new Error("unexpected " + s[i]); return out;
  }

  function runNapkin(ctx) {
    var el = ctx.el, SIZE = 3;
    intro(ctx, {
      kicker: "<b>napkin math</b> for numbers nobody remembers", meta: SIZE + " questions · one guess each",
      title: "No googling. A napkin is allowed.",
      rules: "Each question asks for a hard-to-know number. You get <b>one guess</b>. Your score is how many <b>times off</b> you were: bullseye is 100, and it <b>halves for every doubling</b> of your error. Open the napkin for a calculator (it understands <b>3e8</b>, <b>12k</b>, <b>4.5m</b>, parentheses and powers).",
      start: function (daily) { play(daily); }
    });

    function play(daily) {
      var r = daily ? rng(hashStr(today() + "napkin")) : Math.random, qs = shuffle(NAPKIN, r).slice(0, SIZE), idx = 0, results = [];
      function question() {
        var Q = qs[idx], done = false; el.innerHTML = "";
        el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "question <b>" + (idx + 1) + "</b> of " + SIZE }), h("span", { text: daily ? "today's set" : "random set" })]));
        el.appendChild(h("p", { class: "gm-q", text: Q.q }));
        var input = h("input", { class: "pg-in", inputmode: "decimal", placeholder: "your guess", autocomplete: "off", "aria-label": "Your guess" });
        el.appendChild(h("div", { class: "nk-row" }, [input, h("span", { class: "nk-unit", text: Q.unit })]));
        var paperSlot = h("div"), actions = h("div", { class: "gm-row" }), out = h("div");
        var napB = btn("open napkin", { onclick: function () { togglePaper(); } }), lockB = btn("lock it in", { primary: true, onclick: lock });
        actions.appendChild(napB); actions.appendChild(lockB);
        el.appendChild(paperSlot); el.appendChild(actions); el.appendChild(out);
        el.appendChild(h("p", { class: "gm-note", style: "margin-top:14px", text: "tip: 3e8, 12k, 4.5m and commas all work" }));
        function parseGuess() { try { var v = calc(input.value); return isFinite(v) && v > 0 ? v : NaN; } catch (e) { return NaN; } }
        function togglePaper() {
          if (paperSlot.firstChild) { paperSlot.innerHTML = ""; napB.textContent = "open napkin"; return; }
          napB.textContent = "close napkin";
          var ex = h("input", { placeholder: "e.g. 330m * 0.035", autocomplete: "off", "aria-label": "Napkin calculator" }), outEl = h("span", { text: "= ?" }), use = h("button", { type: "button", text: "use as my guess", disabled: "" });
          var val = NaN;
          ex.addEventListener("input", function () {
            try { val = calc(ex.value); outEl.textContent = "= " + (isFinite(val) ? fmtNum(val) : "?"); use.disabled = !isFinite(val) || val <= 0; } catch (e) { val = NaN; outEl.textContent = ex.value.trim() ? "…" : "= ?"; use.disabled = true; }
          });
          use.addEventListener("click", function () { input.value = String(parseFloat(val.toPrecision(12))); input.focus(); });
          paperSlot.appendChild(h("div", { class: "nk-paper" }, [h("label", { text: "napkin" }), ex, h("div", { class: "nk-out" }, [outEl, use])]));
          ex.focus();
        }
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); lock(); } });
        function lock() {
          if (done) return; var g = parseGuess();
          if (isNaN(g)) { input.focus(); input.style.boxShadow = "5px 5px 0 #ef4444"; setTimeout(function () { input.style.boxShadow = ""; }, 600); return; }
          done = true; input.disabled = true; lockB.disabled = true; napB.disabled = true;
          var t = Q.a, off = Math.max(g / t, t / g), score = off <= 1.03 ? 100 : Math.round(100 / Math.pow(off, 1)), tier = score >= 90 ? 4 : score >= 66 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
          results.push({ score: score, tier: tier, off: off });
          var label = off <= 1.1 ? "bullseye" : off <= 1.5 ? "very close" : off <= 3 ? "ballpark" : off <= 10 ? "same galaxy" : "different planet";
          var dir = g < t ? "too low" : "too high";
          // log-scale ruler: truth, you, and the "within 3x" ballpark band
          var lo = Math.min(g, t) / 4, hi = Math.max(g, t) * 4, L = Math.log10(lo), H = Math.log10(hi), pos = function (v) { return ((Math.log10(v) - L) / (H - L) * 100); };
          var ruler = h("div", { class: "nk-ruler" }, [h("div", { class: "axis" }), h("div", { class: "band", style: "left:" + pos(t / 3) + "%;width:" + (pos(t * 3) - pos(t / 3)) + "%" }),
            h("div", { class: "pin you", style: "left:" + pos(g) + "%", text: "you" }), h("div", { class: "pin truth", style: "left:" + pos(t) + "%;animation-delay:200ms", text: "truth" })]);
          out.innerHTML = ""; out.appendChild(h("hr", { class: "gm-hr" })); out.appendChild(ruler);
          out.appendChild(h("div", { class: "nk-verdict", html: (off <= 1.02 ? "exactly right" : off.toFixed(off < 10 ? 2 : 0) + "× " + dir) + " · " + label + "<small>the answer: <b>" + fmtNum(t) + " " + Q.unit + "</b> · you said " + fmtNum(g) + "</small>" }));
          out.appendChild(h("div", { class: "gm-row" }, [h("span", { class: "gm-pill", text: "+" + score + " pts" })]));
          out.appendChild(h("div", { class: "nk-math", html: "<b>napkin math</b>" + Q.math }));
          out.appendChild(h("p", { class: "gm-note", style: "margin-top:10px", text: Q.fun }));
          var nb = btn(idx + 1 < SIZE ? "next question" : "see results", { primary: true, onclick: function () { idx++; idx < SIZE ? question() : finish(); } }); nb.style.marginTop = "16px"; out.appendChild(nb); setTimeout(function () { nb.focus(); }, 90);
          if (score >= 90) { var rc = nb.getBoundingClientRect(); ctx.burst(rc.left, rc.top, ctx.colors, 30); }
        }
        input.focus();
      }
      function finish() {
        var total = results.reduce(function (a, x) { return a + x.score; }, 0), avg = Math.exp(results.reduce(function (a, x) { return a + Math.log(x.off); }, 0) / results.length);
        ctx.record(total, daily); ctx.award(Math.round(total / 10));
        el.innerHTML = "";
        el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "<b>napkin</b> results" }), h("span", { text: daily ? "today's set" : "random set" })]));
        el.appendChild(h("div", { class: "gm-bigscore", html: total + "<small>/ " + SIZE * 100 + "</small>" }));
        el.appendChild(h("div", { class: "gm-squares" }, results.map(function (x, i) { var s = h("div", { class: "gm-sq t" + x.tier, text: x.score }); s.style.setProperty("--i", i); return s; })));
        el.appendChild(h("p", { class: "gm-note", html: "On average you were off by a factor of <b>" + avg.toFixed(avg < 10 ? 2 : 0) + "×</b>. " + (avg <= 1.5 ? "That is suspiciously good. Do you do this for fun?" : avg <= 3 ? "Solid. Most people are off by 5–10× on the first try." : "Welcome to estimation. The point is to get less wrong, not right.") }));
        var share = "Napkin " + (daily ? today() : "(random)") + " · " + total + "/" + SIZE * 100 + "\n" + results.map(function (x) { return ["🟥", "🟧", "🟨", "🟩", "🟩"][x.tier]; }).join("") + "\nxiuruichen.github.io";
        var row = h("div", { class: "gm-row" }); var cb = btn("copy result", { onclick: function () { copyText(share).then(function () { cb.textContent = "copied ✓"; setTimeout(function () { cb.textContent = "copy result"; }, 1600); }); } });
        row.appendChild(cb); row.appendChild(btn("again", { primary: true, onclick: function () { play(false); } })); row.appendChild(btn("games", { ghost: true, onclick: ctx.back })); el.appendChild(row);
        var rc = el.getBoundingClientRect(); if (total >= 210) ctx.burst(rc.left + rc.width / 2, rc.top + 60, ctx.colors, 50);
      }
      question();
    }
  }
  // ============================================================
  //  03  SCALE IT: resize a silhouette to its real-world size, next to a reference
  // ============================================================
  // L = longest side in cm; ar = shorter side / longer side (discs are circles)
  var SC_OBJ = [
    { n: "US dime", L: 1.791, k: "disc" }, { n: "US penny", L: 1.905, k: "disc" }, { n: "US quarter", L: 2.426, k: "disc" },
    { n: "ping-pong ball", L: 4.0, k: "disc" }, { n: "golf ball", L: 4.27, k: "disc" }, { n: "billiard ball", L: 5.72, k: "disc" },
    { n: "tennis ball", L: 6.7, k: "disc" }, { n: "baseball", L: 7.4, k: "disc" }, { n: "CD", L: 12.0, k: "disc" },
    { n: "bowling ball", L: 21.8, k: "disc" }, { n: "soccer ball", L: 22.0, k: "disc" }, { n: "basketball", L: 24.0, k: "disc" }, { n: "vinyl LP", L: 30.5, k: "disc" },
    { n: "AA battery", L: 5.05, ar: 1.45 / 5.05, k: "rect" }, { n: "credit card", L: 8.56, ar: 5.40 / 8.56, k: "rect" }, { n: "playing card", L: 8.89, ar: 6.35 / 8.89, k: "rect" },
    { n: "index card (3×5 in)", L: 12.7, ar: 7.62 / 12.7, k: "rect" }, { n: "soda can, lying down", L: 12.2, ar: 6.6 / 12.2, k: "rect" },
    { n: "US dollar bill", L: 15.6, ar: 6.63 / 15.6, k: "rect" }, { n: "US letter paper", L: 27.94, ar: 21.59 / 27.94, k: "rect" }
  ];

  function runScale(ctx) {
    var el = ctx.el, ROUNDS = 5, P = 70, W = 700, H = 330, BASE = 292, RX = 190, TX = 500, NS = "http://www.w3.org/2000/svg";
    intro(ctx, {
      kicker: "<b>scale it</b>: visual estimation", meta: ROUNDS + " rounds",
      title: "How big is it, really?",
      rules: "You get a <b>reference</b> object at its true size and a second object you have to <b>resize by eye</b>. Drag across the stage (or use the slider) until it matches how big you think it really is next to the reference. Within <b>6%</b> is a perfect 100.",
      start: function (daily) { play(daily); }
    });
    function sv(tag, a) { var e = document.createElementNS(NS, tag); Object.keys(a || {}).forEach(function (k) { e.setAttribute(k, a[k]); }); return e; }
    function pickPairs(r) {
      var out = [], used = {}, tries = 0;
      while (out.length < ROUNDS && tries++ < 800) {
        var a = SC_OBJ[Math.floor(r() * SC_OBJ.length)], b = SC_OBJ[Math.floor(r() * SC_OBJ.length)], ratio = b.L / a.L;
        if (a === b || used[a.n] || used[b.n] || ratio < 0.28 || ratio > 3.4) continue;
        used[a.n] = used[b.n] = 1; out.push({ r: a, t: b, ratio: ratio });
      }
      return out;
    }
    function shape(o, px, cx, cls) {                 // sits on the baseline, centred on cx
      var g = sv("g"), w = px, hgt = o.k === "disc" ? px : px * o.ar;
      if (o.k === "disc") { g.appendChild(sv("circle", { cx: cx, cy: BASE - w / 2, r: w / 2, class: cls })); g.appendChild(sv("circle", { cx: cx, cy: BASE - w / 2, r: Math.max(1, w / 2 - Math.max(2, w * 0.08)), fill: "none", stroke: "var(--bg)", "stroke-opacity": 0.28, "stroke-width": 1.5 })); }
      else { g.appendChild(sv("rect", { x: cx - w / 2, y: BASE - hgt, width: w, height: hgt, rx: Math.min(6, hgt * 0.18), class: cls })); g.appendChild(sv("rect", { x: cx - w / 2 + 3, y: BASE - hgt + 3, width: Math.max(1, w - 6), height: Math.max(1, hgt - 6), rx: Math.min(4, hgt * 0.14), fill: "none", stroke: "var(--bg)", "stroke-opacity": 0.28, "stroke-width": 1.5 })); }
      return g;
    }
    function play(daily) {
      var r = daily ? rng(hashStr(today() + "scale")) : Math.random, pairs = pickPairs(r), idx = 0, results = [];
      function round() {
        var pr = pairs[idx], done = false, lo = Math.log(0.15), hi = Math.log(4.2); el.innerHTML = "";
        var g = Math.exp(lo + Math.random() * (Math.log(2.2) - lo)); while (Math.abs(Math.log(g / pr.ratio)) < 0.3) g = Math.exp(lo + Math.random() * (hi - lo));
        el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "round <b>" + (idx + 1) + "</b> of " + ROUNDS }), h("span", { text: daily ? "today's set" : "random set" })]));
        el.appendChild(h("p", { class: "gm-q", html: "Make the <b style='color:var(--c)'>" + pr.t.n + "</b> its true size next to the " + pr.r.n + "." }));
        var stage = h("div", { class: "sc-stage" }), svgR = sv("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "xMidYMid meet" }); stage.appendChild(svgR);
        svgR.appendChild(sv("line", { x1: 24, y1: BASE + 0.5, x2: W - 24, y2: BASE + 0.5, stroke: "var(--fg)", "stroke-width": 2 }));
        svgR.appendChild(shape(pr.r, P, RX, "sc-ref"));
        var t1 = sv("text", { x: RX, y: 34, "text-anchor": "middle", class: "sc-label" }); t1.textContent = "reference"; svgR.appendChild(t1);
        var t2 = sv("text", { x: RX, y: 50, "text-anchor": "middle", class: "sc-label sub" }); t2.textContent = pr.r.n + " · " + (pr.r.L < 10 ? pr.r.L.toFixed(1) : pr.r.L.toFixed(0)) + " cm"; svgR.appendChild(t2);
        var t3 = sv("text", { x: TX, y: 34, "text-anchor": "middle", class: "sc-label" }); t3.textContent = "resize me"; svgR.appendChild(t3);
        var t4 = sv("text", { x: TX, y: 50, "text-anchor": "middle", class: "sc-label sub" }); t4.textContent = pr.t.n; svgR.appendChild(t4);
        var me = sv("g"), ghost = sv("g"), handle = sv("circle", { r: 9, class: "sc-handle" }), hint = sv("text", { x: TX, y: BASE + 24, "text-anchor": "middle", class: "sc-hint" }); hint.textContent = "drag across the stage";
        svgR.appendChild(me); svgR.appendChild(ghost); svgR.appendChild(handle); svgR.appendChild(hint);
        [t1, t2, t3, t4].forEach(function (t) { svgR.appendChild(t); });   // labels stay readable on top, even when you scale past them
        el.appendChild(stage);
        var slider = h("input", { type: "range", min: 0, max: 1000, step: 1, class: "pg-range", "aria-label": "Size of the " + pr.t.n + " compared to the " + pr.r.n }), read = h("b", { text: "" });
        el.appendChild(h("div", { class: "sc-controls" }, [h("span", { class: "lab", text: "size" }), slider, h("span", { class: "lab", style: "min-width:9.5ch;text-align:right" }, [read])]));
        var out = h("div"), lockB = btn("lock it in", { primary: true, onclick: lock }); el.appendChild(h("div", { class: "gm-row" }, [lockB])); el.appendChild(out);
        function draw() {
          me.innerHTML = ""; var px = P * g, w = px, hh = pr.t.k === "disc" ? px : px * pr.t.ar; me.appendChild(shape(pr.t, px, TX, "sc-me"));
          handle.setAttribute("cx", TX + w / 2); handle.setAttribute("cy", BASE - hh / 2); slider.value = Math.round((Math.log(g) - lo) / (hi - lo) * 1000);
          read.textContent = (g < 1 ? g.toFixed(2) : g.toFixed(1)) + "×";
        }
        draw();
        slider.addEventListener("input", function () { g = Math.exp(lo + slider.value / 1000 * (hi - lo)); draw(); });
        var drag = false;
        function setFrom(e) { var b = stage.getBoundingClientRect(), x = (e.clientX - b.left) * W / b.width; g = clamp(2 * Math.abs(x - TX) / P, 0.15, 4.2); draw(); }
        stage.addEventListener("pointerdown", function (e) { if (done) return; drag = true; hint.textContent = ""; stage.setPointerCapture && stage.setPointerCapture(e.pointerId); setFrom(e); });
        stage.addEventListener("pointermove", function (e) { if (drag && !done) setFrom(e); });
        stage.addEventListener("pointerup", function () { drag = false; }); stage.addEventListener("pointercancel", function () { drag = false; });
        function lock() {
          if (done) return; done = true; lockB.disabled = true; slider.disabled = true;
          var err = Math.abs(Math.log(g / pr.ratio)), free = Math.log(1.06), score = err <= free ? 100 : Math.max(0, Math.round(100 * (1 - (err - free) / (Math.log(3) - free)))), tier = score >= 90 ? 4 : score >= 66 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
          results.push({ score: score, tier: tier });
          var px = P * pr.ratio, hh = pr.t.k === "disc" ? px : px * pr.t.ar; ghost.appendChild(shape(pr.t, px, TX, "sc-ghost")); hint.textContent = ""; handle.setAttribute("opacity", 0);
          var offPct = Math.round(Math.abs(g / pr.ratio - 1) * 100);
          out.appendChild(h("hr", { class: "gm-hr" }));
          out.appendChild(h("div", { class: "nk-verdict", html: (offPct <= 6 ? "spot on" : offPct + "% " + (g > pr.ratio ? "too big" : "too small")) + "<small>true size: <b>" + (pr.ratio < 1 ? pr.ratio.toFixed(2) : pr.ratio.toFixed(2)) + "×</b> the " + pr.r.n + " · the " + pr.t.n + " is " + (pr.t.L < 10 ? pr.t.L.toFixed(2) : pr.t.L.toFixed(1)) + " cm long · you said " + (g < 1 ? g.toFixed(2) : g.toFixed(2)) + "×</small>" }));
          out.appendChild(h("div", { class: "gm-row" }, [h("span", { class: "gm-pill", text: "+" + score + " pts" })]));
          var nb = btn(idx + 1 < ROUNDS ? "next round" : "see results", { primary: true, onclick: function () { idx++; idx < ROUNDS ? round() : finish(); } }); nb.style.marginTop = "14px"; out.appendChild(nb); setTimeout(function () { nb.focus(); }, 90);
          if (score >= 90) { var rc = nb.getBoundingClientRect(); ctx.burst(rc.left, rc.top, ctx.colors, 28); }
        }
      }
      function finish() {
        var total = results.reduce(function (a, x) { return a + x.score; }, 0); ctx.record(total, daily); ctx.award(Math.round(total / 10)); el.innerHTML = "";
        el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "<b>scale it</b> results" }), h("span", { text: daily ? "today's set" : "random set" })]));
        el.appendChild(h("div", { class: "gm-bigscore", html: total + "<small>/ " + ROUNDS * 100 + "</small>" }));
        el.appendChild(h("div", { class: "gm-squares" }, results.map(function (x, i) { var s = h("div", { class: "gm-sq t" + x.tier, text: x.score }); s.style.setProperty("--i", i); return s; })));
        el.appendChild(h("p", { class: "gm-note", text: total >= 400 ? "Your eyes are calibrated instruments." : total >= 250 ? "Respectable. Size is sneaky: we judge by area, not by width." : "Most people are off here. Humans are bad at judging size without a ruler." }));
        var share = "Scale It " + (daily ? today() : "(random)") + " · " + total + "/" + ROUNDS * 100 + "\n" + results.map(function (x) { return ["🟥", "🟧", "🟨", "🟩", "🟩"][x.tier]; }).join("") + "\nxiuruichen.github.io";
        var row = h("div", { class: "gm-row" }), cb = btn("copy result", { onclick: function () { copyText(share).then(function () { cb.textContent = "copied ✓"; setTimeout(function () { cb.textContent = "copy result"; }, 1600); }); } });
        row.appendChild(cb); row.appendChild(btn("again", { primary: true, onclick: function () { play(false); } })); row.appendChild(btn("games", { ghost: true, onclick: ctx.back })); el.appendChild(row);
        var rc = el.getBoundingClientRect(); if (total >= 400) ctx.burst(rc.left + rc.width / 2, rc.top + 60, ctx.colors, 50);
      }
      round();
    }
  }

  // ============================================================
  //  04  ODDBALL: name something. the rarer your answer, the more it's worth.
  // ============================================================
  // each answer list is ranked from "everybody says that" down to "deep cut". "/" separates aliases.
  var ODD = [
    { p: "Name a pasta dish", a: "spaghetti/spaghetti and meatballs,lasagna/lasagne,fettuccine alfredo/alfredo,macaroni and cheese/mac and cheese/mac n cheese,spaghetti carbonara/carbonara,ravioli,penne alla vodka/penne vodka,baked ziti/ziti,tortellini,chicken parmesan/chicken parm,pasta primavera/primavera,linguine with clams/linguine and clams/linguine alle vongole,cacio e pepe,pasta e fagioli,bolognese/spaghetti bolognese/tagliatelle bolognese,pesto pasta/pesto,aglio e olio/spaghetti aglio e olio,amatriciana/bucatini all amatriciana,puttanesca/spaghetti alla puttanesca,gnocchi,manicotti,cannelloni,stuffed shells/shells,rigatoni,pasta salad,shrimp scampi/scampi,lobster ravioli,arrabbiata/penne arrabbiata,pasta alla norma/norma,pastitsio,orecchiette/orecchiette with broccoli rabe,pappardelle with boar ragu/pappardelle ragu,trofie al pesto/trofie,casoncelli,pici,strozzapreti,malloreddus,culurgiones,pizzoccheri,spaghetti alla nerano/nerano,spaghetti all assassina/assassina,pasta con le sarde/pasta con sarde,sagne e fagioli" },
    { p: "Name a type of cheese", a: "cheddar,mozzarella,swiss,parmesan/parmigiano reggiano/parmigiano,american,provolone,gouda,brie,feta,pepper jack/pepperjack,blue cheese/bleu cheese,cream cheese,colby/colby jack,monterey jack,ricotta,gruyere,camembert,havarti,goat cheese/chevre,mascarpone,asiago,muenster,halloumi,manchego,gorgonzola,roquefort,stilton,fontina,emmental/emmentaler,edam,paneer,cotija,queso fresco,pecorino/pecorino romano,burrata,jarlsberg,comte,raclette,taleggio,limburger,wensleydale,cheshire,double gloucester,red leicester,epoisses,oaxaca,queso blanco,kasseri,kefalotyri,mimolette,tete de moine,appenzeller,vacherin,humboldt fog,cotswold,caerphilly,lancashire,ossau iraty,reblochon,boursin,cambozola,brillat savarin,casu marzu" },
    { p: "Name a programming language", a: "python,javascript/js,java,c++/cpp,c,c#/csharp,php,ruby,swift,go/golang,rust,typescript,kotlin,sql,r,matlab,perl,scala,haskell,lua,dart,objective c,bash/shell,assembly,fortran,cobol,lisp,scheme/racket,clojure,elixir,erlang,julia,ocaml,f#/fsharp,prolog,smalltalk,ada,haxe,nim,zig,crystal,brainfuck,malbolge,befunge,intercal,whitespace,lolcode,apl,forth,d,groovy,pascal,delphi,visual basic/vb,scratch,solidity,coq,idris,agda,piet,chef" },
    { p: "Name a famous bridge", a: "golden gate bridge/golden gate,brooklyn bridge,london bridge,tower bridge,sydney harbour bridge/sydney harbor bridge,rialto bridge/rialto,bridge of sighs,ponte vecchio,charles bridge,millau viaduct,akashi kaikyo bridge,george washington bridge,verrazzano narrows bridge/verrazzano bridge/verrazzano,bay bridge/san francisco bay bridge,mackinac bridge,humber bridge,forth bridge,iron bridge/ironbridge,pont du gard,pont neuf,pont d avignon/pont saint benezet,khaju bridge,stari most/mostar bridge,henderson waves,helix bridge,oresund bridge,confederation bridge,rainbow bridge,tacoma narrows bridge/galloping gertie,szechenyi chain bridge/chain bridge,ponte sant angelo,chapel bridge/kapellbrucke,pont alexandre iii,kintai bridge,capilano suspension bridge/capilano,royal gorge bridge,new river gorge bridge,bifrost" },
    { p: "Name a breakfast food", a: "eggs/egg,pancakes/pancake,bacon,cereal,toast,waffles/waffle,oatmeal,bagel,french toast,sausage,hash browns/hashbrowns,yogurt/yoghurt,muffin,omelette/omelet,croissant,fruit,donut/doughnut,granola,biscuits and gravy/biscuit,grits,smoothie,breakfast burrito,avocado toast,scrambled eggs,eggs benedict/benedict,crepes/crepe,english muffin,pop tarts/pop tart,cinnamon roll,coffee cake,quiche,huevos rancheros,shakshuka,congee/jook,chilaquiles,kippers,porridge,muesli,full english/fry up,bubble and squeak,black pudding,idli,dosa,natto,arepas,pao de queijo,kedgeree,scrapple,loco moco,spam musubi,pork roll egg and cheese/taylor ham egg and cheese,hangtown fry" },
    { p: "Name a board game", a: "monopoly,scrabble,chess,checkers/draughts,clue/cluedo,risk,sorry,game of life/life,connect four/connect 4,battleship,candy land,trouble,jenga,yahtzee,catan/settlers of catan,ticket to ride,carcassonne,pandemic,scattergories,trivial pursuit,operation,mouse trap,stratego,othello/reversi,backgammon,go,mancala,cranium,pictionary,taboo,dominion,azul,codenames,splendor,wingspan,terraforming mars,gloomhaven,twilight imperium,root,spirit island,brass birmingham,agricola,puerto rico,7 wonders,dixit,betrayal at house on the hill,diplomacy,axis and allies,mahjong,shogi,xiangqi,nine mens morris,hnefatafl,senet,royal game of ur,crokinole,hive,santorini,patchwork" },
    { p: "Name a dog breed", a: "labrador retriever/labrador/lab,golden retriever,german shepherd,bulldog/english bulldog,poodle,beagle,rottweiler,dachshund,chihuahua,husky/siberian husky,boxer,pug,corgi/pembroke welsh corgi,great dane,doberman/doberman pinscher,shih tzu,border collie,pomeranian,french bulldog/frenchie,cocker spaniel,australian shepherd,yorkshire terrier/yorkie,bernese mountain dog,saint bernard/st bernard,bichon frise,maltese,akita,shiba inu,samoyed,greyhound,whippet,basset hound,bloodhound,weimaraner,vizsla,newfoundland,mastiff,irish setter,pit bull/pitbull,jack russell terrier/jack russell,collie,dalmatian,havanese,papillon,schnauzer,airedale terrier,afghan hound,saluki,borzoi,xoloitzcuintli,lagotto romagnolo,pharaoh hound,kuvasz,komondor,puli,bergamasco,norwegian lundehund,azawakh,catahoula leopard dog,otterhound,sloughi,tibetan mastiff,stabyhoun,mudi,cirneco dell etna" },
    { p: "Name a country in Africa", a: "nigeria,egypt,south africa,kenya,ethiopia,morocco,ghana,algeria,tanzania,uganda,senegal,libya,tunisia,sudan,zimbabwe,zambia,angola,mozambique,cameroon,ivory coast/cote d ivoire,madagascar,namibia,botswana,mali,niger,chad,rwanda,somalia,democratic republic of the congo/drc/dr congo/congo,republic of the congo,gabon,mauritania,malawi,burkina faso,benin,togo,sierra leone,liberia,guinea,eritrea,djibouti,burundi,lesotho,eswatini/swaziland,gambia/the gambia,guinea bissau,equatorial guinea,central african republic,south sudan,cape verde/cabo verde,comoros,mauritius,seychelles,sao tome and principe/sao tome" },
    { p: "Name a famous scientist", a: "albert einstein/einstein,isaac newton/newton,marie curie/curie,charles darwin/darwin,galileo galilei/galileo,stephen hawking/hawking,nikola tesla/tesla,thomas edison/edison,louis pasteur/pasteur,alexander fleming/fleming,carl sagan/sagan,neil degrasse tyson/tyson,richard feynman/feynman,niels bohr/bohr,copernicus/nicolaus copernicus,johannes kepler/kepler,michael faraday/faraday,james clerk maxwell/maxwell,max planck/planck,werner heisenberg/heisenberg,erwin schrodinger/schrodinger,ada lovelace/lovelace,alan turing/turing,rosalind franklin/franklin,jane goodall/goodall,gregor mendel/mendel,dmitri mendeleev/mendeleev,robert hooke/hooke,antoine lavoisier/lavoisier,linus pauling/pauling,katherine johnson,barbara mcclintock/mcclintock,emmy noether/noether,srinivasa ramanujan/ramanujan,chien shiung wu,lise meitner/meitner,henrietta leavitt,cecilia payne,subrahmanyan chandrasekhar/chandrasekhar,paul dirac/dirac,hypatia,ibn al haytham/alhazen,al khwarizmi,tu youyou,kary mullis" },
    { p: "Name a US state capital", a: "sacramento,austin,boston,albany,denver,atlanta,phoenix,nashville,columbus,honolulu,springfield,olympia,juneau,santa fe,salt lake city,raleigh,richmond,madison,indianapolis,lansing,saint paul/st paul,des moines,jefferson city,oklahoma city,little rock,baton rouge,jackson,montgomery,tallahassee,columbia,charleston,harrisburg,trenton,dover,annapolis,hartford,providence,montpelier,concord,augusta,helena,boise,cheyenne,bismarck,pierre,lincoln,topeka,carson city,frankfort" },
    { p: "Name a Pixar movie", a: "toy story,finding nemo,the incredibles/incredibles,monsters inc/monsters incorporated,cars,up,inside out,coco,wall e/walle,ratatouille,brave,a bugs life/bugs life,soul,luca,turning red,onward,lightyear,elemental,finding dory,toy story 2,toy story 3,toy story 4,monsters university,cars 2,cars 3,inside out 2,incredibles 2,the good dinosaur/good dinosaur,elio" },
    { p: "Name a musical instrument", a: "guitar,piano,drums,violin,flute,trumpet,saxophone/sax,clarinet,cello,bass/bass guitar,trombone,harp,ukulele,banjo,accordion,harmonica,tuba,oboe,bassoon,viola,french horn/horn,organ,xylophone,tambourine,keyboard/synthesizer/synth,mandolin,bagpipes,recorder,triangle,timpani,piccolo,double bass/upright bass,sitar,didgeridoo,theremin,kalimba/thumb piano,bongos,congas,steel drum/steel pan,harpsichord,lute,zither,hurdy gurdy,glockenspiel,vibraphone,marimba,cajon,djembe,tabla,erhu,koto,shamisen,pipa,oud,bouzouki,balalaika,ocarina,pan flute/panpipes,melodica,glass harmonica,nyckelharpa,hang drum/hang,theorbo,serpent,ondes martenot,waterphone,cristal baschet,sarrusophone,crwth" },
    { p: "Name a Greek god or goddess", a: "zeus,poseidon,athena,apollo,hades,aphrodite,ares,hermes,artemis,hera,demeter,dionysus,hephaestus,persephone,hestia,eros,pan,nike,hecate,nemesis,helios,selene,gaia,uranus,cronus/kronos,rhea,hypnos,thanatos,morpheus,iris,hebe,asclepius,tyche,eos,nyx,chaos,erebus,tartarus,pontus,themis,mnemosyne,oceanus,hyperion,atlas,prometheus,epimetheus,eris,harmonia,triton,amphitrite,nereus,proteus,aeolus,boreas,zephyrus,eileithyia,enyo,momus,ananke,aether,hemera" },
    { p: "Name something you'd find in a classroom", a: "desk,chair,whiteboard/white board,teacher,pencil,book/books,clock,backpack,projector,pen,eraser,markers/marker,chalkboard/blackboard,paper,computer,globe,flag,bulletin board,poster,calculator,ruler,scissors,glue,crayons,notebook,binder,folder,stapler,trash can/garbage can,door,window,bookshelf/bookcase,students,smartboard/smart board,cubbies,hall pass,pencil sharpener,textbook,homework,map,periodic table,microscope,tape,highlighter,lunchbox,bean bag,class pet/hamster,star chart,anchor chart,word wall,abacus,protractor,compass" },
    { p: "Name a type of tree", a: "oak,maple,pine,birch,willow,palm,elm,cedar,redwood/sequoia,apple tree/apple,cherry,spruce,fir,ash,beech,cypress,magnolia,walnut,hickory,aspen,poplar,sycamore,dogwood,hawthorn,juniper,baobab,banyan,eucalyptus,olive,fig,mahogany,teak,ginkgo/gingko,hemlock,larch,linden/lime tree,alder,hornbeam,rowan/mountain ash,yew,tamarack,bald cypress,joshua tree,monkey puzzle,dragon blood tree,sausage tree,jacaranda,kapok,ceiba,ebony,lignum vitae,osage orange,paulownia,katsura,tulip tree/tulip poplar,sassafras,sweetgum,buckeye,ironwood" },
    { p: "Name a famous mountain", a: "everest/mount everest/mt everest,k2,kilimanjaro/mount kilimanjaro/mt kilimanjaro,mont blanc,denali/mount mckinley/mckinley,matterhorn,fuji/mount fuji/mt fuji,kangchenjunga,lhotse,annapurna,elbrus/mount elbrus,aconcagua,vinson massif/mount vinson,rainier/mount rainier/mt rainier,mount st helens/st helens/mount saint helens/mt st helens,mount olympus/olympus,mount sinai/sinai,mount rushmore,pikes peak,half dome,mount washington,mount whitney/whitney/mt whitney,mount shasta/shasta,mount hood,grand teton/teton,mount kosciuszko/kosciuszko,ben nevis,snowdon,table mountain,uluru,eiger,jungfrau,monch,mount cook/aoraki,mount vesuvius/vesuvius,mount etna/etna,mount ararat/ararat,mount kenya,mount logan,huascaran,chimborazo,cotopaxi,ojos del salado,nanda devi,makalu,cho oyu,dhaulagiri,manaslu,nanga parbat,gasherbrum,mount tai/taishan,huangshan,mount kailash/kailash,mount doom" },
    { p: "Name a fruit", a: "apple,banana,orange,strawberry,grapes/grape,watermelon,pineapple,mango,blueberry,peach,pear,cherry,lemon,kiwi,raspberry,lime,plum,pomegranate,papaya,avocado,coconut,blackberry,cantaloupe,grapefruit,apricot,fig,nectarine,cranberry,honeydew,tangerine/clementine/mandarin,passion fruit,dragon fruit/pitaya,guava,lychee,persimmon,starfruit/carambola,durian,jackfruit,rambutan,mangosteen,quince,kumquat,elderberry,gooseberry,boysenberry,huckleberry,loganberry,tamarillo,soursop,cherimoya/custard apple,ackee,salak/snake fruit,jabuticaba,buddhas hand,horned melon/kiwano,miracle fruit,noni,ugli fruit,pawpaw,medlar,sapodilla,longan,langsat,marula" },
    { p: "Name a famous painting", a: "mona lisa,starry night/the starry night,the scream/scream,girl with a pearl earring,the last supper/last supper,the persistence of memory/persistence of memory,the birth of venus/birth of venus,guernica,american gothic,the kiss,las meninas,water lilies,sunflowers,the night watch/night watch,nighthawks,the great wave off kanagawa/great wave,whistlers mother/arrangement in grey and black,the creation of adam/creation of adam,the school of athens/school of athens,the garden of earthly delights/garden of earthly delights,liberty leading the people,the raft of the medusa/raft of the medusa,impression sunrise/impression,a sunday afternoon on the island of la grande jatte/la grande jatte,the arnolfini portrait/arnolfini portrait,the hay wain/hay wain,wanderer above the sea of fog,the third of may 1808/third of may 1808,saturn devouring his son,the card players/card players,luncheon on the grass,olympia,the swing,the gleaners,ophelia,the lady of shalott,the son of man/son of man,golconda,the treachery of images,dogs playing poker" },
    { p: "Name a planet or moon", a: "earth,mars,jupiter,saturn,venus,mercury,uranus,neptune,pluto,moon/the moon/luna,titan,europa,io,ganymede,callisto,enceladus,triton,phobos,deimos,charon,mimas,miranda,oberon,titania,ariel,umbriel,iapetus,rhea,dione,tethys,hyperion,phoebe,nereid,proteus,ceres,eris,haumea,makemake,sedna,kepler 452b,proxima b,trappist 1e" },
    { p: "Name a type of shoe", a: "sneakers/sneaker/trainers,boots,sandals,heels/high heels,flip flops,loafers,slippers,cleats,running shoes,oxfords,flats,crocs,clogs,platforms,wedges,moccasins,espadrilles,ballet flats,stilettos,pumps,mules,brogues,derby,chelsea boots,combat boots,cowboy boots,hiking boots,snow boots,rain boots/wellies/wellington boots,ugg boots/uggs,converse/chucks,vans,slides,tap shoes,ballet shoes/pointe shoes,bowling shoes,golf shoes,ski boots,roller skates,ice skates,geta,zori,huaraches,jelly shoes,mary janes,saddle shoes,monk strap,penny loafers,boat shoes/deck shoes,brothel creepers,winklepickers,platform boots,thigh high boots,galoshes,snowshoes,waders,kitten heels" },
    { p: "Name a famous river", a: "nile,amazon,mississippi,thames,yangtze,danube,rhine,seine,ganges,colorado,hudson,missouri,volga,congo,mekong,tigris,euphrates,jordan,yellow river/huang he,ohio,rio grande,columbia,tiber,rhone,loire,elbe,po,indus,zambezi,niger,orinoco,murray,saint lawrence/st lawrence,yukon,mackenzie,lena,ob,amur,irrawaddy,brahmaputra,limpopo,okavango,potomac,delaware,connecticut,snake,platte,arkansas,tennessee,cumberland,allegheny,monongahela,styx,lethe" },
    { p: "Name a type of dessert", a: "ice cream,cake,cookies/cookie,pie,brownies/brownie,cheesecake,cupcake,pudding,donut/doughnut,tiramisu,apple pie,chocolate cake,cobbler,creme brulee,gelato,flan,macarons/macaron,churros,baklava,eclair,cannoli,panna cotta,mochi,sorbet,trifle,pavlova,baked alaska,banoffee pie,key lime pie,black forest cake,red velvet cake,carrot cake,sticky toffee pudding,rice pudding,bread pudding,gulab jamun,jalebi,halva,kulfi,rasmalai,tres leches,dulce de leche,alfajores,mille feuille,profiteroles,clafoutis,tarte tatin,kouign amann,knafeh,loukoumades,mont blanc,semifreddo,zabaglione,affogato,cassata,sfogliatella" }
  ];
  var ODD_BUILT = false;
  function oddBuild() {
    if (ODD_BUILT) return; ODD_BUILT = true;
    ODD.forEach(function (o) {
      var list = o.a.split(","), map = {}, arr = [];
      list.forEach(function (item, rank) { item.split("/").forEach(function (al) { var n = oddNorm(al); if (n && !(n in map)) { map[n] = rank; arr.push(n); } }); });
      o.map = map; o.arr = arr; o.len = list.length; o.first = list[0].split("/")[0]; o.last = list[list.length - 1].split("/")[0];
    });
  }
  function oddNorm(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/['’`]/g, "").replace(/[^a-z0-9#+ ]+/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an) /, "");
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i]; for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur;
    }
    return prev[b.length];
  }
  function oddMatch(o, text) {                                   // -> rank in the list, or null
    var n = oddNorm(text); if (!n) return null; if (n in o.map) return o.map[n];
    var v = [n.replace(/s$/, ""), n + "s", n.replace(/es$/, ""), n + "es"]; for (var i = 0; i < v.length; i++) if (v[i] in o.map) return o.map[v[i]];
    if (n.length < 5) return null;
    var max = n.length >= 10 ? 2 : 1, best = null, bd = 99;
    for (var k = 0; k < o.arr.length; k++) { var d = lev(o.arr[k], n, max); if (d <= max && d < bd) { bd = d; best = o.map[o.arr[k]]; } }
    return best;
  }
  var ODD_TIERS = [
    { name: "everybody said that", pts: 10 }, { name: "popular pick", pts: 30 }, { name: "uncommon", pts: 60 }, { name: "rare find", pts: 85 }, { name: "one in a million", pts: 100 }
  ];
  function oddTier(rank, len) { if (len >= 20 && rank >= len - 3) return 4;   // the three deepest cuts of any list are always top tier
    var r = len < 30 ? rank * 30 / len : rank; return r < 3 ? 0 : r < 9 ? 1 : r < 18 ? 2 : r < 30 ? 3 : 4; }

  function runOddball(ctx) {
    var el = ctx.el, SIZE = 7, SECS = 25; oddBuild();
    intro(ctx, {
      kicker: "<b>oddball</b>: be uncommon on purpose", meta: SIZE + " prompts · " + SECS + " seconds each",
      title: "Name something. Rarer is worth more.",
      rules: "Each prompt wants <b>one answer</b> and you have <b>" + SECS + " seconds</b>. Everybody's first thought scores <b>10</b>. A deep cut can score <b>100</b>. If your answer isn't in my list, you can claim it on the honor system for <b>30</b>. Spelling doesn't have to be perfect.",
      start: function (daily) { play(daily); }
    });
    function play(daily) {
      var r = daily ? rng(hashStr(today() + "oddball")) : Math.random, qs = shuffle(ODD, r).slice(0, SIZE), idx = 0, results = [];
      function round() {
        var Q = qs[idx], done = false, t0 = performance.now(), raf = 0; el.innerHTML = "";
        el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "prompt <b>" + (idx + 1) + "</b> of " + SIZE }), h("span", { class: "od-secs", text: SECS + "s" })]));
        var bar = h("i"), tm = h("div", { class: "od-timer" }, [bar]);
        el.appendChild(tm); el.appendChild(h("p", { class: "od-prompt", text: Q.p }));
        var input = h("input", { class: "pg-in", placeholder: "type one answer, press enter", autocomplete: "off", spellcheck: "false", "aria-label": "Your answer" }), out = h("div");
        el.appendChild(input); el.appendChild(out);
        var secs = el.querySelector(".od-secs");
        function tick() {
          if (done || !el.isConnected) return; var left = Math.max(0, SECS - (performance.now() - t0) / 1000);
          bar.style.transform = "scaleX(" + left / SECS + ")"; secs.textContent = Math.ceil(left) + "s"; bar.classList.toggle("low", left < 6);
          if (left <= 0) { lock(true); return; } raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); lock(false); } });
        function finishRound(score, tierIdx, badge, extra) {
          results.push({ score: score, tier: tierIdx });
          var pips = h("div", { class: "od-pips" }); for (var i = 0; i < 5; i++) pips.appendChild(h("i", { class: i <= tierIdx && tierIdx >= 0 ? "on" : "" }));
          out.appendChild(h("div", { class: "od-tier" }, [h("span", { class: "od-badge" + (tierIdx === 4 ? " m4" : ""), style: tierIdx >= 0 && tierIdx < 4 ? "background:" + ["#cbd5e1", "#60a5fa", "#34d399", "#fbbf24"][tierIdx] : tierIdx < 0 ? "background:var(--bg);color:var(--fg)" : "", text: badge }), h("span", { class: "od-pts", text: "+" + score }), pips]));
          if (extra) out.appendChild(extra);
          out.appendChild(h("p", { class: "od-others", html: "everyone's first thought: <b>" + Q.first + "</b> · the deepest cut I know: <b>" + Q.last + "</b>" }));
          var nb = btn(idx + 1 < SIZE ? "next prompt" : "see results", { primary: true, onclick: function () { idx++; idx < SIZE ? round() : finish(); } }); nb.style.marginTop = "14px"; out.appendChild(nb); setTimeout(function () { nb.focus(); }, 90);
          if (tierIdx === 4) { var rc = nb.getBoundingClientRect(); ctx.burst(rc.left + 40, rc.top, ctx.colors, 46); }
        }
        function lock(timeUp) {
          if (done) return; var text = input.value.trim(); if (!text && !timeUp) { input.focus(); return; }
          done = true; cancelAnimationFrame(raf); input.disabled = true; bar.classList.remove("low"); if (timeUp) bar.style.transform = "scaleX(0)";
          if (!text) { finishRound(0, -1, "too slow", null); return; }
          var rank = oddMatch(Q, text);
          if (rank != null) { var ti = oddTier(rank, Q.len); finishRound(ODD_TIERS[ti].pts, ti, ODD_TIERS[ti].name, null); return; }
          // not in my list: honor system
          var claim = btn("it counts (honor system +30)", { onclick: function () {
            claim.disabled = true; results[results.length - 1] = { score: 30, tier: 1 }; out.querySelector(".od-pts").textContent = "+30"; out.querySelector(".od-badge").textContent = "claimed";
            out.querySelector(".od-badge").style.background = "#60a5fa"; claim.textContent = "claimed ✓";
          } });
          var ex = h("div", { class: "gm-row" }, [claim]);
          finishRound(0, -1, "not in my list", ex);
        }
        input.focus();
      }
      function finish() {
        var total = results.reduce(function (a, x) { return a + x.score; }, 0); ctx.record(total, daily); ctx.award(Math.round(total / 12)); el.innerHTML = "";
        var title = total < 150 ? "perfectly normal" : total < 300 ? "mildly interesting" : total < 450 ? "suspiciously creative" : total < 600 ? "gloriously unhinged" : "oddball legend";
        el.appendChild(h("div", { class: "gm-kicker" }, [h("span", { html: "<b>oddball</b> results" }), h("span", { text: daily ? "today's set" : "random set" })]));
        el.appendChild(h("div", { class: "gm-bigscore", html: total + "<small>/ " + SIZE * 100 + "</small>" }));
        el.appendChild(h("p", { class: "gm-q", style: "margin-top:4px", text: title }));
        el.appendChild(h("div", { class: "gm-squares" }, results.map(function (x, i) { var s = h("div", { class: "gm-sq t" + Math.max(0, x.tier), text: x.score }); s.style.setProperty("--i", i); if (x.tier < 0) s.style.background = "var(--bg)"; return s; })));
        var share = "Oddball " + (daily ? today() : "(random)") + " · " + total + "/" + SIZE * 100 + " · " + title + "\n" + results.map(function (x) { return x.tier < 0 ? "⬜" : ["🟥", "🟧", "🟨", "🟩", "🟪"][x.tier]; }).join("") + "\nxiuruichen.github.io";
        var row = h("div", { class: "gm-row" }), cb = btn("copy result", { onclick: function () { copyText(share).then(function () { cb.textContent = "copied ✓"; setTimeout(function () { cb.textContent = "copy result"; }, 1600); }); } });
        row.appendChild(cb); row.appendChild(btn("again", { primary: true, onclick: function () { play(false); } })); row.appendChild(btn("games", { ghost: true, onclick: ctx.back })); el.appendChild(row);
        var rc = el.getBoundingClientRect(); if (total >= 450) ctx.burst(rc.left + rc.width / 2, rc.top + 60, ctx.colors, 56);
      }
      round();
    }
  }

  // ============================================================
  //  the shelf
  // ============================================================
  GAMES.push(
    { id: "call", no: "01", name: "Call It", tag: "forecasting", color: "#4493f8", max: 0, sub: "predict real, open questions from manifold markets. the crowd stays hidden until you commit, then you get scored.", run: runCall,
      art: '<svg viewBox="0 0 200 104" aria-hidden="true"><g stroke="currentColor" opacity=".18" stroke-width="1"><path d="M0 26H200M0 52H200M0 78H200"/></g><path class="art-draw" d="M16 84 L52 66 L84 74 L118 40 L148 52 L184 18" fill="none" style="stroke:var(--c)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle class="art-pulse" cx="184" cy="18" r="6" style="fill:var(--c)" stroke="currentColor" stroke-width="2"/><text x="18" y="38" font-family="Playfair Display, serif" font-style="italic" font-weight="900" font-size="34" fill="currentColor" opacity=".9">70%?</text></svg>' },
    { id: "napkin", no: "02", name: "Napkin", tag: "estimation", color: "#fbbf24", max: 300, sub: "estimate numbers nobody remembers: heartbeats a year, gallons in a pool, stars in your bracket. napkin math allowed.", run: runNapkin,
      art: '<svg viewBox="0 0 200 104" aria-hidden="true"><g class="art-wobble"><g transform="rotate(-5 100 52)"><rect x="46" y="12" width="108" height="80" fill="#f6f1e7" stroke="currentColor" stroke-width="2.5"/><path d="M58 32H112M58 50H138M58 68H100" stroke="#2a2520" stroke-opacity=".25" stroke-width="2"/><text x="58" y="38" font-family="monospace" font-weight="700" font-size="15" fill="#2a2520">3e8 ÷ 2</text><text x="58" y="62" font-family="monospace" font-weight="700" font-size="15" style="fill:#d97706">≈ 1.5e8</text></g></g></svg>' },
    { id: "scale", no: "03", name: "Scale It", tag: "visual estimation", color: "#34d399", max: 500, sub: "resize a mystery object to its true size next to a reference. your eyes are about to be humbled.", run: runScale,
      art: '<svg viewBox="0 0 200 104" aria-hidden="true"><line x1="16" y1="90" x2="184" y2="90" stroke="currentColor" stroke-width="2.5"/><circle cx="56" cy="72" r="18" fill="currentColor" opacity=".88"/><circle class="art-pulse" cx="142" cy="60" r="28" style="fill:var(--c)" stroke="currentColor" stroke-width="2.5"/><path d="M92 26H118M92 26l6-5M92 26l6 5M118 26l-6-5M118 26l-6 5" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>' },
    { id: "oddball", no: "04", name: "Oddball", tag: "daily trivia", color: "#f43f7a", max: 700, sub: "name something in 25 seconds. everybody's first thought is worth 10. a deep cut is worth 100.", run: runOddball,
      art: '<svg viewBox="0 0 200 104" aria-hidden="true"><g class="art-bob"><rect x="16" y="14" width="76" height="32" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".5"/><path d="M34 46 L30 60 L48 46" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".5"/><text x="28" y="36" font-size="13" font-family="monospace" fill="currentColor" opacity=".6">spaghetti</text></g><g class="art-bob" style="animation-delay:-1.2s"><rect x="100" y="42" width="84" height="36" style="fill:var(--c)" stroke="currentColor" stroke-width="2.5"/><path d="M158 78 L166 92 L146 78" style="fill:var(--c)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><text x="112" y="66" font-size="15" font-weight="700" font-family="monospace" fill="#0a0a0a">pizzoccheri!</text></g><path class="art-spark" d="M168 14 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" style="fill:var(--c)" stroke="currentColor" stroke-width="1.5"/></svg>' }
  );

  window.Playground = {
    mount: mount,
    show: function () { if (R) go("hub"); },
    open: function (id) { if (R && GAMES.some(function (g) { return g.id === id; })) go(id); },
    ids: function () { return GAMES.map(function (g) { return g.id; }); },
    handleEsc: function () { if (cur !== "hub") { go("hub"); return true; } return false; }
  };
})();
