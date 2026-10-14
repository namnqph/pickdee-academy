/* =========================================================
   PICKDEE – Màn hình chính kiểu app (dùng chung Coach / Học viên)
   Cấu hình: window.PD_LAUNCHER = {
     anchor: "selector chèn khối TRƯỚC phần tử này",
     storageKey: "pd_coach",
     groups: [{ key, icon, title, urgent?, tiles: [{ icon, label, href? | section?, count?, kind? }] }],
     bottom: [{ icon, label, href? | section? | top?, count? }]
   }
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
    background:rgba(7,21,35,.55);border:1px solid rgba(255,255,255,.06);cursor:pointer;
    font:inherit;transition:transform .12s ease,border-color .12s ease}
  .pdl-tile:hover{border-color:rgba(var(--acc),.55)}
  .pdl-tile:active{transform:scale(.96)}
  .pdl-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;
    border-radius:12px;font-size:20px;background:linear-gradient(145deg,rgba(var(--acc),.28),rgba(var(--acc),.08))}
  .pdl-label{font-size:11.5px;font-weight:700;line-height:1.25;text-align:center;
    color:rgba(255,255,255,.9);overflow-wrap:anywhere}
  .pdl-badge{position:absolute;top:4px;right:6px;min-width:19px;height:19px;padding:0 5px;
    display:none;align-items:center;justify-content:center;border-radius:999px;
    background:#ff5c69;color:#fff;font-size:10.5px;font-weight:900;box-shadow:0 0 0 2px #0d1d2f}
  .pdl-badge.is-info{background:#d8ff45;color:#071523}
  .has-count>.pdl-badge{display:flex}
  .pdl-tabs{display:grid;gap:6px;padding:5px;border-radius:16px;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
  .pdl-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;
    padding:8px 2px;border:0;border-radius:12px;background:transparent;
    color:rgba(255,255,255,.7);font:inherit;font-size:11.5px;font-weight:800;cursor:pointer}
  .pdl-tab span:first-child{font-size:18px;line-height:1.1}
  .pdl-tab.is-active{background:rgba(216,255,69,.14);color:#d8ff45}
  .pdl-tab .pdl-badge{top:2px;right:calc(50% - 26px)}
  .pdl-group.is-tab{display:none}
  .pdl-group.is-tab.is-active{display:block}
  .pdl-group.is-tab .pdl-head{display:none}
  .pdl-more{min-height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.04);color:rgba(255,255,255,.85);font:inherit;
    font-size:14px;font-weight:800;cursor:pointer}
  .pdl-hide{display:none !important}
  .pdl-back{position:sticky;top:8px;z-index:20;display:inline-flex;align-items:center;gap:6px;
    margin:0 0 10px;padding:8px 14px;border-radius:999px;border:1px solid rgba(216,255,69,.35);
    background:rgba(7,21,35,.92);color:#d8ff45;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
  @media(min-width:900px){
    .pdl{grid-template-columns:1fr 1fr;align-items:start}
    .pdl-tabs{display:none}
    .pdl-group.is-tab{display:block}
    .pdl-group.is-tab .pdl-head{display:flex}
    .pdl-more{grid-column:1/-1}
  }
  #pdlBottom{display:none}
  @media(max-width:759px){
    #pdlBottom{position:fixed;left:0;right:0;bottom:0;z-index:900;display:grid;
      padding:6px 6px calc(6px + env(safe-area-inset-bottom));
      background:rgba(7,21,35,.97);border-top:1px solid rgba(255,255,255,.1);backdrop-filter:blur(14px)}
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
    box.innerHTML = cfg.groups.map(g => `
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
    if (backBtn) backBtn.classList.toggle("pdl-hide", !focusBlock || expanded);
    const more = document.getElementById("pdlMore");
    if (more) more.textContent = expanded ? "▲ Thu gọn" : (cfg.moreLabel || "📋 Xem tất cả thông tin");
  }

  function findSection(text) {
    const want = text.toLowerCase();
    const box = document.getElementById("pdLauncher");
    const main = box.closest("main") || document.body;
    const cands = [...main.querySelectorAll("h1,h2,h3,h4,[class*='title'],[class*='heading']")]
      .filter(el => !box.contains(el) && el.textContent.trim().toLowerCase().includes(want));
    if (!cands.length) return null;
    const head = cands.sort((a, b) => a.textContent.length - b.textContent.length)[0];
    /* khối = phần tử gần nhất là con cấp ngoài cùng nằm sau launcher */
    const { out } = detailNodes();
    return out.find(el => el === head || el.contains(head)) || head;
  }

  function openSection(text) {
    const block = findSection(text);
    if (!block) return false;
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
      if (!openSection(a.dataset.section)) { expanded = true; applyCollapse(); }
    });
    document.getElementById("pdlMore").addEventListener("click", () => {
      expanded = !expanded;
      focusBlock = null;
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

  function start() {
    mount();
    sync();
    setInterval(sync, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

})();
