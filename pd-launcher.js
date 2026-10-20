/* =========================================================
   PICKDEE – Màn hình chính kiểu app (dùng chung Coach / Học viên)
   Cấu hình: window.PD_LAUNCHER = {
     anchor: "selector chèn khối TRƯỚC phần tử này",
     storageKey: "pd_coach",
     groups: [{ key, icon, title, urgent?, tiles: [{ icon, label, href? | section?, count?, kind? }] }],
     bottom: [{ icon, label, href? | section? | top?, count? }],
     summary?: { icon, title, section, main: "id", sub?: "id", refs?: [{ label, from: "id" }] }
   }
   - summary: thẻ tóm tắt luôn hiện đầu màn hình chính, chép chữ từ các id có sẵn; bấm mở section.
   - Hàng urgent luôn hiện; các nhóm còn lại là tab (điện thoại).
   - Ô "section" mở đúng phần trong trang (tìm theo tiêu đề), phần khác vẫn thu gọn.
   - Số đếm đọc từ các phần tử id có sẵn trên trang (cập nhật mỗi 2 giây).
========================================================= */
(function () {

  const cfg = window.PD_LAUNCHER;
  if (!cfg) return;

  const css = `
  .pdl{display:grid;gap:12px;margin:10px 0 16px}
  .pdl-group{--acc:216,255,69;padding:13px 11px 11px;border-radius:20px;
    border:1px solid rgba(var(--acc),.22);
    background:linear-gradient(160deg,rgba(var(--acc),.10),rgba(255,255,255,.02) 55%);
    box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .pdl-group.c-orange{--acc:255,150,80}.pdl-group.c-blue{--acc:91,200,255}
  .pdl-group.c-lime{--acc:216,255,69}.pdl-group.c-teal{--acc:64,224,176}
  .pdl-group.c-purple{--acc:190,140,255}
  .pdl-head{display:flex;align-items:center;gap:8px;margin:0 2px 11px}
  .pdl-head-icon{width:30px;height:30px;display:flex;align-items:center;justify-content:center;
    border-radius:9px;background:rgba(var(--acc),.18);font-size:16px}
  .pdl-head-title{font-size:15px;font-weight:800;color:#fff}
  .pdl-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
  .pdl-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;
    padding:10px 2px 9px;border-radius:14px;min-width:0;color:#fff;text-decoration:none;
    background:rgba(15,15,15,.55);border:1px solid rgba(255,255,255,.06);cursor:pointer;
    font:inherit;transition:transform .12s ease,border-color .12s ease}
  .pdl-tile:hover{border-color:rgba(var(--acc),.55)}
  .pdl-tile:active{transform:scale(.96)}
  .pdl-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;
    border-radius:12px;font-size:20px;background:linear-gradient(145deg,rgba(var(--acc),.28),rgba(var(--acc),.08))}
  .pdl-label{font-size:11.5px;font-weight:700;line-height:1.25;text-align:center;
    color:rgba(255,255,255,.9);overflow-wrap:anywhere}
  .pdl-badge{position:absolute;top:4px;right:6px;min-width:19px;height:19px;padding:0 5px;
    display:none;align-items:center;justify-content:center;border-radius:999px;
    background:#ff5c69;color:#fff;font-size:10.5px;font-weight:900;box-shadow:0 0 0 2px #151515}
  .pdl-badge.is-info{background:#ffc934;color:#0f0f0f}
  .has-count>.pdl-badge{display:flex}
  .pdl-tabs{display:grid;gap:6px;padding:5px;border-radius:16px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .pdl-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;
    padding:8px 2px;border:0;border-radius:12px;background:transparent;
    color:rgba(255,255,255,.7);font:inherit;font-size:11.5px;font-weight:800;cursor:pointer}
  .pdl-tab span:first-child{font-size:18px;line-height:1.1}
  .pdl-tab.is-active{background:rgba(255,255,255,.098);color:#ffc934}
  .pdl-tab .pdl-badge{top:2px;right:calc(50% - 26px)}
  .pdl-group.is-tab{display:none}
  .pdl-group.is-tab.is-active{display:block}
  .pdl-group.is-tab .pdl-head{display:none}
  .pdl-more{min-height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.04);color:rgba(255,255,255,.85);font:inherit;
    font-size:14px;font-weight:800;cursor:pointer}
  .pdl-sum{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:20px;
    color:#fff;text-decoration:none;border:1px solid rgba(255,201,52,.35);
    background:linear-gradient(135deg,rgba(255,255,255,.112),rgba(64,224,176,.06) 60%,rgba(255,255,255,.02));
    box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .pdl-sum:active{transform:scale(.98)}
  .pdl-sum-icon{flex:0 0 44px;height:44px;display:flex;align-items:center;justify-content:center;
    border-radius:13px;background:rgba(255,255,255,.126);font-size:22px}
  .pdl-sum-body{flex:1;min-width:0}
  .pdl-sum-title{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#ffc934}
  .pdl-sum-main{margin-top:2px;font-size:19px;font-weight:900;line-height:1.2;overflow-wrap:anywhere}
  .pdl-sum-sub{margin-top:3px;font-size:12px;line-height:1.35;color:rgba(255,255,255,.72)}
  .pdl-sum-refs{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
  .pdl-sum-ref{padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.07);
    font-size:11px;font-weight:700;color:rgba(255,255,255,.8)}
  .pdl-sum-ref b{color:#fff}
  .pdl-sum-go{flex:0 0 auto;font-size:22px;color:rgba(255,201,52,.8)}
  .pdl-hide{display:none !important}
  .pdl-hide-focus{display:none !important}
  .pdl-back{position:sticky;top:8px;z-index:20;display:inline-flex;align-items:center;gap:6px;
    margin:0 0 10px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,201,52,.35);
    background:rgba(15,15,15,.92);color:#ffc934;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
  @media(min-width:900px){
    .pdl{grid-template-columns:1fr 1fr;align-items:start}
    .pdl-tabs{display:none}
    .pdl-group.is-tab{display:block}
    .pdl-group.is-tab .pdl-head{display:flex}
    .pdl-more,.pdl-sum{grid-column:1/-1}
  }
  #pdlBottom{display:none}
  @media(max-width:759px){
    #pdlBottom{position:fixed;left:0;right:0;bottom:0;z-index:900;display:grid;
      padding:6px 6px calc(6px + env(safe-area-inset-bottom));
      background:rgba(15,15,15,.97);border-top:1px solid rgba(255,255,255,.1);backdrop-filter:blur(14px)}
    #pdlBottom .pdl-bt{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;
      padding:4px 0;border:0;background:transparent;color:rgba(255,255,255,.75);
      text-decoration:none;font:inherit;font-size:11px;font-weight:700;cursor:pointer}
    #pdlBottom .pdl-bt span:first-child{font-size:20px;line-height:1.1}
    #pdlBottom .pdl-badge{top:0;right:calc(50% - 22px)}
    body{padding-bottom:76px !important}
    [id$="NotificationRoot"]{position:absolute !important}
    #pickdeeSupportRoot{bottom:84px !important}
  }`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(cfg.storageKey + "_" + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(cfg.storageKey + "_" + k, v); } catch (e) {} }
  };

  function tileHtml(t) {
    const attrs = t.href
      ? `href="${esc(t.href)}"`
      : `href="#" data-section="${esc(t.section)}"`;
    const cnt = t.count ? ` data-count-from="${esc(t.count)}"` : "";
    const badge = t.count ? `<span class="pdl-badge${t.kind === "info" ? " is-info" : ""}"></span>` : "";
    return `<a class="pdl-tile" ${attrs}${cnt}><span class="pdl-icon">${t.icon}</span><span class="pdl-label">${esc(t.label)}</span>${badge}</a>`;
  }

  function mount() {
    const anchor = document.querySelector(cfg.anchor);
    if (!anchor || document.getElementById("pdLauncher")) return !!anchor;

    const box = document.createElement("nav");
    box.id = "pdLauncher";
    box.className = "pdl";
    const sm = cfg.summary;
    const sumHtml = sm ? `
      <a class="pdl-sum pdl-hide" href="#" data-section="${esc(sm.section)}" data-summary="1">
        <span class="pdl-sum-icon">${sm.icon || "🎯"}</span>
        <span class="pdl-sum-body">
          <span class="pdl-sum-title">${esc(sm.title)}</span>
          <span class="pdl-sum-main" data-copy="${esc(sm.main)}" style="display:block"></span>
          ${sm.sub ? `<span class="pdl-sum-sub" data-copy="${esc(sm.sub)}" style="display:block"></span>` : ""}
          ${(sm.refs || []).length ? `<span class="pdl-sum-refs">${sm.refs.map(r => `<span class="pdl-sum-ref">${esc(r.label)} <b data-copy="${esc(r.from)}"></b></span>`).join("")}</span>` : ""}
        </span>
        <span class="pdl-sum-go">›</span>
      </a>` : "";
    box.innerHTML = sumHtml + cfg.groups.map(g => `
      <section class="pdl-group c-${g.color || "lime"}${g.urgent ? " is-urgent" : ""}">
        <div class="pdl-head"><span class="pdl-head-icon">${g.icon}</span><span class="pdl-head-title">${esc(g.title)}</span></div>
        <div class="pdl-tiles">${g.tiles.map(tileHtml).join("")}</div>
      </section>`).join("") + `<button type="button" class="pdl-more" id="pdlMore"></button>`;
    anchor.parentNode.insertBefore(box, anchor);

    const tabGroups = [...box.querySelectorAll(".pdl-group:not(.is-urgent)")];
    const tabs = document.createElement("div");
    tabs.className = "pdl-tabs";
    tabs.style.gridTemplateColumns = `repeat(${tabGroups.length},1fr)`;
    let active = Math.min(tabGroups.length - 1, Math.max(0, parseInt(store.get("tab") || "0", 10) || 0));
    tabGroups.forEach((g, i) => {
      g.classList.add("is-tab");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pdl-tab";
      b.innerHTML = `<span>${g.querySelector(".pdl-head-icon").textContent}</span><span>${esc(g.querySelector(".pdl-head-title").textContent)}</span><span class="pdl-badge"></span>`;
      b.addEventListener("click", () => { active = i; store.set("tab", String(i)); renderTabs(); });
      tabs.appendChild(b);
    });
    function renderTabs() {
      tabGroups.forEach((g, i) => g.classList.toggle("is-active", i === active));
      [...tabs.children].forEach((b, i) => b.classList.toggle("is-active", i === active));
    }
    if (tabGroups[0]) tabGroups[0].before(tabs);
    renderTabs();

    if (cfg.bottom?.length) {
      const bar = document.createElement("nav");
      bar.id = "pdlBottom";
      bar.style.gridTemplateColumns = `repeat(${cfg.bottom.length},1fr)`;
      bar.innerHTML = cfg.bottom.map(b => {
        const attrs = b.href ? `href="${esc(b.href)}"` : b.top ? `href="#" data-top="1"` : `href="#" data-section="${esc(b.section)}"`;
        const cnt = b.count ? ` data-count-from="${esc(b.count)}"` : "";
        return `<a class="pdl-bt" ${attrs}${cnt}><span>${b.icon}</span><span>${esc(b.label)}</span>${b.count ? `<span class="pdl-badge${b.kind === "info" ? " is-info" : ""}"></span>` : ""}</a>`;
      }).join("");
      document.body.appendChild(bar);
    }

    wire(box, tabs);
    return true;
  }

  /* ---------- thu gọn phần chi tiết ---------- */
  let expanded = store.get("more") === "1";
  let focusBlock = null;
  let backBtn = null;

  function detailNodes() {
    const box = document.getElementById("pdLauncher");
    const main = box.closest("main") || document.body;
    const out = [];
    let node = box;
    while (node && node !== main) {
      for (let s = node.nextElementSibling; s; s = s.nextElementSibling) {
        if (!s.matches("script,style,.pdl-back")) out.push(s);
      }
      node = node.parentElement;
    }
    return { out, main };
  }

  function applyCollapse() {
    const box = document.getElementById("pdLauncher");
    if (!box) return;
    const { out } = detailNodes();
    out.forEach(el => {
      const show = expanded || (focusBlock && (el === focusBlock || el.contains(focusBlock)));
      el.classList.toggle("pdl-hide", !show);
    });
    box.classList.toggle("pdl-hide", !!focusBlock && !expanded);
    if (cfg.heroSelector) document.querySelectorAll(cfg.heroSelector).forEach(h => h.classList.toggle("pdl-hide", !!focusBlock && !expanded));
    if (backBtn) backBtn.classList.toggle("pdl-hide", !focusBlock || expanded);
    const more = document.getElementById("pdlMore");
    if (more) more.textContent = expanded ? "▲ Thu gọn" : (cfg.moreLabel || "📋 Xem tất cả thông tin");
  }

  function findSection(text) {
    const want = text.toLowerCase();
    const box = document.getElementById("pdLauncher");
    const main = box.closest("main") || document.body;
    const cands = [...main.querySelectorAll("h1,h2,h3,h4,[class*='title'],[class*='heading']")]
      .filter(el => !box.contains(el)
        && !el.closest("[hidden],[role='dialog'],[aria-modal='true'],dialog,[class*='modal'],[class*='overlay'],[class*='popup'],[id*='Modal'],[id*='Overlay']")
        && el.textContent.trim().toLowerCase().includes(want));
    if (!cands.length) return null;
    const head = cands.sort((a, b) => a.textContent.length - b.textContent.length)[0];
    /* khối = phần tử gần nhất là con cấp ngoài cùng nằm sau launcher */
    const { out } = detailNodes();
    return out.find(el => el === head || el.contains(head)) || head;
  }

  function clearFocusIsolation() {
    document.querySelectorAll(".pdl-hide-focus").forEach(el => el.classList.remove("pdl-hide-focus"));
  }

  /* Thẻ nhỏ nhất chứa tiêu đề (card/section/panel…) để chỉ hiện đúng mục đó */
  function cardOf(head, block) {
    let el = head;
    while (el && el !== block) {
      const cls = (el.className && typeof el.className === "string") ? el.className : "";
      if (el !== head && (/card|panel|box|section|block|item/i.test(cls) || el.tagName === "SECTION" || el.tagName === "ARTICLE")) return el;
      el = el.parentElement;
    }
    return block;
  }

  function isolate(card, block) {
    clearFocusIsolation();
    let el = card;
    while (el && el !== block) {
      for (const s of el.parentElement ? el.parentElement.children : []) {
        if (s !== el && !s.matches("script,style")) s.classList.add("pdl-hide-focus");
      }
      el = el.parentElement;
    }
  }

  function openSection(text) {
    const block = findSection(text);
    if (!block) return false;
    const want0 = text.toLowerCase();
    const head0 = [...block.querySelectorAll("h1,h2,h3,h4,[class*='title'],[class*='heading']")]
      .filter(el => el.textContent.trim().toLowerCase().includes(want0))
      .sort((a, b) => a.textContent.length - b.textContent.length)[0] || block;
    isolate(cardOf(head0, block), block);
    focusBlock = block;
    expanded = false;
    if (!backBtn) {
      backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "pdl-back";
      backBtn.textContent = "← Về màn hình chính";
      backBtn.addEventListener("click", goHome);
      const box = document.getElementById("pdLauncher");
      box.parentNode.insertBefore(backBtn, box);
    }
    applyCollapse();
    /* cuộn tới đúng tiêu đề bên trong khối */
    const want = text.toLowerCase();
    const head = [...block.querySelectorAll("h1,h2,h3,h4,[class*='title'],[class*='heading']")]
      .find(el => el.textContent.trim().toLowerCase().includes(want)) || block;
    head.style.scrollMarginTop = "64px";
    setTimeout(() => head.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    return true;
  }

  function goHome() {
    focusBlock = null;
    clearFocusIsolation();
    applyCollapse();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function wire(box) {
    document.addEventListener("click", e => {
      const a = e.target.closest("[data-section],[data-top]");
      if (!a) return;
      if (!a.closest("#pdLauncher,#pdlBottom")) return;
      e.preventDefault();
      if (a.dataset.top) return goHome();
      if (!openSection(a.dataset.section)) a.classList.add("pdl-hide");
    });
    document.getElementById("pdlMore").addEventListener("click", () => {
      expanded = !expanded;
      focusBlock = null;
      clearFocusIsolation();
      store.set("more", expanded ? "1" : "0");
      applyCollapse();
    });
  }

  /* ---------- số đếm ---------- */
  function readCount(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const n = parseInt(String(el.textContent || "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function sync() {
    if (!document.getElementById("pdLauncher") && !mount()) return;
    document.querySelectorAll("#pdLauncher [data-count-from], #pdlBottom [data-count-from]").forEach(t => {
      const n = readCount(t.dataset.countFrom);
      const b = t.querySelector(".pdl-badge");
      if (b) b.textContent = n > 99 ? "99+" : String(n);
      t.classList.toggle("has-count", n > 0);
    });
    document.querySelectorAll("#pdLauncher [data-copy]").forEach(el => {
      const src = document.getElementById(el.dataset.copy);
      const txt = src ? String(src.textContent || "").replace(/\s+/g, " ").trim() : "";
      if (el.textContent !== txt) el.textContent = txt;
    });
    document.querySelectorAll("#pdLauncher [data-section], #pdlBottom [data-section]").forEach(t => {
      const missing = !findSection(t.dataset.section)
        || (!!t.dataset.summary && !document.getElementById(cfg.summary.main));
      t.classList.toggle("pdl-hide", missing);
    });
    const tabs = document.querySelector("#pdLauncher .pdl-tabs");
    const groups = [...document.querySelectorAll("#pdLauncher .pdl-group.is-tab")];
    groups.forEach((g, i) => {
      let sum = 0;
      g.querySelectorAll(".pdl-tile.has-count .pdl-badge:not(.is-info)").forEach(b => { sum += parseInt(b.textContent, 10) || 0; });
      const tb = tabs?.children[i];
      if (tb) {
        tb.querySelector(".pdl-badge").textContent = String(sum);
        tb.classList.toggle("has-count", sum > 0);
      }
    });
    applyCollapse();
  }

  /* Mở thẳng 1 mục khi vào trang với #hash (vd. /coach#ho-so từ trang con) */
  function openFromHash() {
    const sec = cfg.hashSections && cfg.hashSections[location.hash];
    if (!sec) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (document.getElementById("pdLauncher") && openSection(sec)) {
        clearInterval(timer);
        try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      }
      if (++tries > 40) clearInterval(timer);
    }, 250);
  }

  function start() {
    mount();
    sync();
    setInterval(sync, 2000);
    openFromHash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

})();
