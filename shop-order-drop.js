/* PickDee Shop — Bong bóng "📷 Thả ảnh đơn" (tab Đơn hàng /shop-admin, chỉ owner + shop_admin)
   Thả/chọn/dán nhiều ảnh chat → đọc chữ trên máy → AI tách TỪNG ĐƠN (khách khác = đơn khác) →
   ✅ đủ & chắc: tự tạo sau 5 giây (có nút Huỷ) · ⚠️ thiếu/mơ hồ/trùng: sửa ngay trong thẻ rồi bấm Tạo.
   Dùng chung: shop-address.js (đổi địa chỉ cũ → mới), shop-order-photo.js (đọc ảnh + tạo đơn). */
(function () {
  "use strict";

  if (window.__pdOrderDrop) return;
  window.__pdOrderDrop = true;

  const V = "20261017-drop2";
  const AUTO_SECONDS = 5;
  const AUTO_NOTE = "Tạo tự động từ ảnh chat";
  const MANUAL_NOTE = "Tạo từ ảnh chat (đã kiểm tra tay)";
  // Ảnh bill ngân hàng (chữ đã bỏ dấu): "Chuyển tiền thành công", "Giao dịch thành công", "Mã giao dịch"...
  const BILL_RE = /(chuyen tien|chuyen khoan|giao dich|thanh toan|ck) thanh cong|ma giao dich|so tham chieu|ma tham chieu|transfer successful|successful transfer|transaction successful/;
  const SOURCES = { zalo: "Zalo", tiktok: "TikTok", facebook: "Facebook", phone: "Điện thoại", other: "Khác" };

  const sb = window.sb;
  if (!sb) return;

  let fab, tray, listEl, statusEl, fileInput, dragOverlay;
  let products = [], variants = [];
  let readyP = null;
  let busy = false;
  let createdCount = 0;
  let seq = 0;
  const cards = [];
  let createChain = Promise.resolve();

  /* ---------- tiện ích ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return Number(n || 0).toLocaleString("vi-VN") + "đ"; }
  function moneyIn(v) {
    const n = Number(String(v == null ? "" : v).replace(/[^\d]/g, ""));
    return n > 0 || String(v == null ? "" : v).trim() === "0" ? n : null;
  }
  function fmtIn(n) { return n == null ? "" : Number(n).toLocaleString("vi-VN").replace(/,/g, "."); }
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      const s = document.createElement("script");
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error("Không tải được " + src.split("?")[0])); };
      document.head.appendChild(s);
    });
  }
  function onOrdersTab() { return !document.body.classList.contains("pd-not-orders"); }
  function variantOf(id) { return variants.find(function (v) { return String(v.id) === String(id); }); }
  function productOf(v) { return v && products.find(function (p) { return String(p.id) === String(v.product_id); }); }
  function variantLabel(v) {
    if (!v) return "";
    const p = productOf(v);
    const opt = [v.option1_value, v.option2_value].filter(Boolean).join(" / ") || (v.variant_name && v.variant_name !== "Mặc định" ? v.variant_name : "");
    return (p ? p.name : "Sản phẩm") + (opt ? " • " + opt : "");
  }

  /* ---------- quyền: chỉ owner / shop_admin ---------- */
  async function canManage() {
    const sess = (await sb.auth.getSession()).data.session;
    if (!sess) return false;
    const { data } = await sb.from("shop_user_roles").select("role")
      .eq("user_id", sess.user.id).eq("is_active", true).in("role", ["owner", "shop_admin"]).limit(1);
    return !!(data && data.length);
  }

  /* ---------- chuẩn bị: thư viện + danh mục + địa chỉ ---------- */
  function prepare() {
    if (!readyP) {
      readyP = (async function () {
        const jobs = [];
        if (!window.PDAddress) jobs.push(loadScript("/shop-address.js?v=" + V));
        if (!window.PDOrderPhoto || !window.PDOrderPhoto.runMulti) jobs.push(loadScript("/shop-order-photo.js?v=" + V));
        await Promise.all(jobs);
        const [pr, vr] = await Promise.all([
          sb.from("shop_products").select("id,name,status").eq("status", "active").order("name", { ascending: true }),
          sb.from("shop_product_variants")
            .select("id,product_id,variant_name,option1_value,option2_value,price,is_active,sort_order,is_sold_out")
            .eq("is_active", true).order("sort_order", { ascending: true }),
          window.PDAddress.load()
        ]);
        if (pr.error) throw pr.error;
        if (vr.error) throw vr.error;
        products = pr.data || [];
        const ok = new Set(products.map(function (p) { return String(p.id); }));
        variants = (vr.data || []).filter(function (v) { return ok.has(String(v.product_id)); });
      })();
      readyP.catch(function () { readyP = null; });
    }
    return readyP;
  }

  /* ---------- giao diện ---------- */
  function injectCss() {
    const st = document.createElement("style");
    st.id = "pdDropCss";
    st.textContent = `
#pdDropFab{position:fixed;right:24px;bottom:24px;z-index:72;display:flex;align-items:center;gap:6px;min-height:50px;padding:0 18px;border:0;border-radius:999px;
  background:#d8ff45;color:#071523;font-family:inherit;font-size:15px;font-weight:900;line-height:1;box-shadow:0 8px 24px rgba(0,0,0,.45),0 0 0 1px rgba(7,21,35,.6);cursor:pointer}
#pdDropFab .pd-badge{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#ff5a5f;color:#fff;font-size:12px;line-height:20px;display:none}
#pdDropFab.has-badge .pd-badge{display:inline-block}
body.pd-not-orders #pdDropFab{display:none}
@media (max-width:760px){#pdDropFab{right:14px;bottom:calc(138px + env(safe-area-inset-bottom));min-height:46px;padding:0 15px;font-size:14px}}
#pdDropTray{position:fixed;inset:0;z-index:1000001;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}
#pdDropTray.open{display:flex}
#pdDropSheet{width:min(560px,100%);max-height:90vh;display:flex;flex-direction:column;background:#0d1d2f;color:#fff;border-radius:20px 20px 0 0;
  border:1px solid rgba(255,255,255,.1);box-shadow:0 -10px 40px rgba(0,0,0,.5);font-family:inherit;animation:pdDropUp .22s ease}
@keyframes pdDropUp{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
#pdDropSheet .pdd-head{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.08)}
#pdDropSheet .pdd-title{flex:1;font-size:16px;font-weight:900}
#pdDropSheet .pdd-x{width:36px;height:36px;border:0;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-size:20px;cursor:pointer}
#pdDropSheet .pdd-body{overflow:auto;padding:12px 14px calc(16px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}
.pdd-zone{display:block;width:100%;padding:16px 12px;border:2px dashed rgba(216,255,69,.45);border-radius:16px;background:rgba(216,255,69,.06);color:#fff;text-align:center;cursor:pointer;font-family:inherit}
.pdd-zone b{display:block;font-size:15px;color:#d8ff45;margin-bottom:4px}
.pdd-zone span{font-size:12.5px;color:rgba(255,255,255,.65)}
.pdd-status{margin:10px 2px 0;font-size:13px;color:rgba(255,255,255,.8);white-space:pre-line}
.pdd-status:empty{display:none}
.pdd-card{margin-top:12px;padding:12px;border-radius:16px;background:#071523;border:1px solid rgba(255,255,255,.1)}
.pdd-card.ok{border-color:rgba(216,255,69,.5)}
.pdd-card.warn{border-color:rgba(255,183,77,.6)}
.pdd-card.done{border-color:rgba(76,217,100,.6);opacity:.92}
.pdd-card.err{border-color:rgba(255,90,95,.7)}
.pdd-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.pdd-tag{font-size:12px;font-weight:900;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.1);white-space:nowrap}
.pdd-card.ok .pdd-tag{background:rgba(216,255,69,.16);color:#d8ff45}
.pdd-card.warn .pdd-tag{background:rgba(255,183,77,.16);color:#ffb74d}
.pdd-card.done .pdd-tag{background:rgba(76,217,100,.16);color:#4cd964}
.pdd-card.err .pdd-tag{background:rgba(255,90,95,.16);color:#ff8a8d}
.pdd-thumbs{display:flex;gap:4px;margin-left:auto}
.pdd-thumbs img{width:30px;height:42px;object-fit:cover;border-radius:5px;border:1px solid rgba(255,255,255,.15)}
.pdd-line{font-size:13.5px;line-height:1.45;color:rgba(255,255,255,.9)}
.pdd-line b{color:#fff}
.pdd-muted{color:rgba(255,255,255,.6);font-size:12.5px}
.pdd-items{margin:6px 0;padding:0;list-style:none}
.pdd-items li{font-size:13.5px;padding:3px 0;border-top:1px dashed rgba(255,255,255,.08)}
.pdd-sum{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:13.5px}
.pdd-sum b{color:#d8ff45;font-size:15px}
.pdd-probs{margin:8px 0 0;padding:8px 10px;border-radius:10px;background:rgba(255,183,77,.1);color:#ffd08a;font-size:12.5px;line-height:1.5}
.pdd-act{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.pdd-btn{flex:1;min-height:42px;padding:0 12px;border:0;border-radius:12px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;text-decoration:none;display:flex;align-items:center;justify-content:center}
.pdd-btn.main{background:#d8ff45;color:#071523}
.pdd-btn:disabled{opacity:.5}
.pdd-count{height:4px;margin-top:8px;border-radius:4px;background:rgba(216,255,69,.15);overflow:hidden}
.pdd-count i{display:block;height:100%;background:#d8ff45;width:100%;transition:width 1s linear}
.pdd-f{display:grid;gap:6px;margin-top:8px}
.pdd-f label{font-size:11.5px;font-weight:800;color:rgba(255,255,255,.6);margin-top:2px}
.pdd-f input,.pdd-f select{width:100%;min-height:40px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:#0d1d2f;color:#fff;font-size:16px;font-family:inherit;box-sizing:border-box}
.pdd-f .bad{border-color:#ffb74d}
.pdd-row{display:flex;gap:6px;align-items:center}
.pdd-row select{flex:1;min-width:0}
.pdd-row input.q{width:64px;flex:none;text-align:center}
.pdd-row button{flex:none;width:36px;height:40px;border:0;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;font-size:16px;cursor:pointer}
.pdd-raw{font-size:11.5px;color:#ffd08a;margin:-2px 0 2px}
.pdd-add{min-height:36px;border:1px dashed rgba(255,255,255,.25);border-radius:10px;background:transparent;color:#fff;font-family:inherit;font-weight:800;cursor:pointer}
.pdd-two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#pdDropDrag{position:fixed;inset:0;z-index:1000002;display:none;align-items:center;justify-content:center;background:rgba(7,21,35,.82);border:4px dashed #d8ff45;color:#d8ff45;font-family:inherit;font-size:22px;font-weight:900;pointer-events:none}
#pdDropDrag.show{display:flex}
@media (min-width:761px){#pdDropTray{align-items:center}#pdDropSheet{border-radius:20px;max-height:86vh}}
`;
    document.head.appendChild(st);
  }

  function buildUi() {
    injectCss();
    fab = document.createElement("button");
    fab.id = "pdDropFab";
    fab.type = "button";
    fab.innerHTML = '📷 Thả ảnh đơn <span class="pd-badge"></span>';
    fab.addEventListener("click", function () { openTray(); });
    document.body.appendChild(fab);

    tray = document.createElement("div");
    tray.id = "pdDropTray";
    tray.innerHTML =
      '<div id="pdDropSheet" role="dialog" aria-label="Thả ảnh đơn">' +
        '<div class="pdd-head"><div class="pdd-title">📷 Thả ảnh chat → tự tạo đơn</div><button type="button" class="pdd-x" aria-label="Đóng">×</button></div>' +
        '<div class="pdd-body">' +
          '<button type="button" class="pdd-zone"><b>Chọn ảnh chat (nhiều ảnh, nhiều khách)</b>' +
          '<span>Máy tính: kéo-thả ảnh vào đây hoặc Ctrl+V. Đủ thông tin → tự tạo sau ' + AUTO_SECONDS + ' giây.</span></button>' +
          '<div class="pdd-status"></div><div class="pdd-list"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(tray);
    listEl = tray.querySelector(".pdd-list");
    statusEl = tray.querySelector(".pdd-status");
    tray.querySelector(".pdd-x").addEventListener("click", closeTray);
    tray.addEventListener("click", function (e) { if (e.target === tray) closeTray(); });

    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.id = "pdDropInput";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
    tray.querySelector(".pdd-zone").addEventListener("click", function () {
      if (busy) return;
      fileInput.value = "";
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length) handleFiles(fileInput.files);
    });

    dragOverlay = document.createElement("div");
    dragOverlay.id = "pdDropDrag";
    dragOverlay.textContent = "📷 Thả ảnh chat để tạo đơn";
    document.body.appendChild(dragOverlay);

    // Máy tính: kéo-thả ảnh từ bất kỳ đâu trên tab Đơn hàng
    let dragDepth = 0;
    const hasFiles = function (e) { return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files"); };
    document.addEventListener("dragenter", function (e) {
      if (!hasFiles(e) || !onOrdersTab()) return;
      dragDepth++;
      dragOverlay.classList.add("show");
    });
    document.addEventListener("dragleave", function (e) {
      if (!hasFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) dragOverlay.classList.remove("show");
    });
    document.addEventListener("dragover", function (e) {
      if (hasFiles(e) && onOrdersTab()) e.preventDefault();
    });
    document.addEventListener("drop", function (e) {
      if (!hasFiles(e) || !onOrdersTab()) return;
      e.preventDefault();
      dragDepth = 0;
      dragOverlay.classList.remove("show");
      const imgs = Array.from(e.dataTransfer.files || []).filter(function (f) { return /^image\//.test(f.type); });
      if (imgs.length) { openTray(); handleFiles(imgs); }
    });
    // Ctrl+V ảnh (chụp màn hình rồi dán)
    document.addEventListener("paste", function (e) {
      if (!onOrdersTab()) return;
      const imgs = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(function (f) { return /^image\//.test(f.type); });
      if (!imgs.length) return;
      e.preventDefault();
      openTray();
      handleFiles(imgs);
    });
  }

  function openTray() {
    tray.classList.add("open");
    document.documentElement.style.overflow = "hidden";
    prepare().catch(function (e) { statusEl.textContent = "⚠️ " + (e.message || e); });
  }
  function closeTray() {
    tray.classList.remove("open");
    document.documentElement.style.overflow = "";
    if (createdCount) {
      createdCount = 0;
      window.dispatchEvent(new CustomEvent("pd-orders-changed"));
    }
  }
  function updateBadge() {
    const n = cards.filter(function (c) { return c.state === "warn" || c.state === "err"; }).length;
    fab.classList.toggle("has-badge", n > 0);
    fab.querySelector(".pd-badge").textContent = n || "";
  }

  /* ---------- xử lý ảnh ---------- */
  async function handleFiles(files) {
    if (busy) { statusEl.textContent = "⏳ Đang xử lý lượt ảnh trước, chờ chút rồi thả tiếp."; return; }
    busy = true;
    const zone = tray.querySelector(".pdd-zone");
    zone.disabled = true;
    try {
      statusEl.textContent = "Đang chuẩn bị…";
      await prepare();
      const list = Array.from(files).filter(function (f) { return /^image\//.test(f.type); });
      if (list.length > 10) statusEl.textContent = "Chỉ xử lý 10 ảnh đầu, thả tiếp phần còn lại sau.";
      const r = await window.PDOrderPhoto.runMulti(list, function (m) { statusEl.textContent = "⏳ " + m; });
      if (!r.orders.length) throw new Error("Không thấy đơn hàng nào trong ảnh.");
      const urls = r.files.map(function (f) { return URL.createObjectURL(f); });
      statusEl.textContent = "Đang đổi địa chỉ, kiểm tra đơn trùng…";
      const built = [];
      for (const o of r.orders) built.push(await buildCard(o, urls, r.texts));
      statusEl.textContent = "Tách được " + built.length + " đơn từ " + r.files.length + " ảnh.";
      built.forEach(function (c) {
        cards.push(c);
        listEl.insertBefore(c.el, listEl.firstChild);
        render(c);
        if (c.state === "ok") startCountdown(c);
      });
      updateBadge();
    }
    catch (e) {
      statusEl.textContent = "⚠️ " + (e && e.message || e) + "\nThử lại, hoặc dùng nút 📷 trong trang Tạo đơn.";
    }
    finally {
      busy = false;
      zone.disabled = false;
    }
  }

  async function buildCard(o, urls, texts) {
    // Thanh toán: có bill → CK · khách nói đã/sẽ CK mà không có bill → hỏi xác nhận · còn lại → COD
    const ocr = (o.image_indexes || []).map(function (n) { return (texts || [])[n - 1] || ""; }).join("\n");
    const plainOcr = ocr.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
    const evidence = o.payment_evidence === "bill" || BILL_RE.test(plainOcr) ? "bill" : o.payment_evidence === "claimed" ? "claimed" : "none";
    const c = {
      id: ++seq,
      el: document.createElement("div"),
      thumbs: (o.image_indexes || []).map(function (n) { return urls[n - 1]; }).filter(Boolean),
      name: o.customer_name || "",
      phone: o.phone || "",
      phones: o.phones || [],
      street: "", provinceId: "", provinceName: "", wardName: "", addrHint: "",
      legacy: o.address_text || "",
      items: (o.items || []).map(function (i) {
        return { variant_id: i.variant_id && variantOf(i.variant_id) ? i.variant_id : null, quantity: i.quantity || 1, raw: i.raw_text || "", unit: i.agreed_unit_price };
      }),
      payEvidence: evidence,
      paidAmount: o.paid_amount || null,
      payment: evidence === "bill" ? "bank_transfer" : evidence === "claimed" ? "" : "cod",
      payStatus: "unpaid",
      payNote: "",
      source: o.source || localStorage.getItem("pickdee_quick_order_source") || "zalo",
      note: o.note || "",
      aiWarnings: (o.warnings || []).filter(Boolean),
      dealGoods: null, dealShip: o.shipping_fee,
      dup: null, dupOk: false,
      state: "warn", edit: false, error: "", code: "", orderId: null
    };
    c.el.className = "pdd-card";
    if (o.address_text) {
      try {
        const a = await window.PDAddress.resolveParsed(o.address_text, o.address_parts);
        c.street = a.street || "";
        c.provinceId = a.provinceId || "";
        c.provinceName = a.provinceName || "";
        c.wardName = a.wardName || "";
        c.addrHint = a.wardName ? "" : (a.hint || "Chưa nhận ra phường/xã.");
      } catch (_) { c.addrHint = "Không đổi được địa chỉ – chọn tay."; }
    }
    // Giá chốt: tổng tiền hàng nói rõ, hoặc mọi món đều có giá/cái; trùng giá web thì bỏ
    let goods = o.agreed_items_total;
    const known = c.items.filter(function (i) { return i.variant_id; });
    if (goods == null && known.length && known.length === c.items.length && known.every(function (i) { return i.unit; })) {
      goods = known.reduce(function (s, i) { return s + i.unit * i.quantity; }, 0);
    }
    c.dealGoods = goods != null && goods !== webGoods(c) ? goods : null;
    await checkDuplicate(c);
    c.state = problems(c).length ? "warn" : "ok";
    // Chỉ còn hỏi "đã nhận tiền chưa" → thẻ gọn, 3 nút ngay trước mắt; thiếu thứ khác mới mở ô sửa
    c.edit = problems(c).some(function (x) { return !/đã nhận tiền chưa\?$/.test(x); });
    return c;
  }

  function webGoods(c) {
    return c.items.reduce(function (s, i) { const v = variantOf(i.variant_id); return s + (v ? Number(v.price) * Number(i.quantity || 0) : 0); }, 0);
  }

  // Chống trùng: cùng SĐT + cùng sản phẩm trong 48 giờ (đơn chưa huỷ)
  async function checkDuplicate(c) {
    c.dup = null;
    const ids = c.items.map(function (i) { return String(i.variant_id); });
    if (!/^0\d{9}$/.test(c.phone) || !ids.length) return;
    const { data } = await sb.from("shop_orders")
      .select("id, order_code, order_status, created_at, shop_order_items(variant_id)")
      .eq("phone", c.phone)
      .gte("created_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
      .neq("order_status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(10);
    const hit = (data || []).find(function (od) {
      return (od.shop_order_items || []).some(function (it) { return ids.includes(String(it.variant_id)); });
    });
    if (hit) c.dup = { id: hit.id, code: hit.order_code };
  }

  // Điều kiện để TỰ tạo: đủ & chắc
  function problems(c) {
    const p = [];
    if (!/^0\d{9}$/.test(c.phone)) p.push("Thiếu SĐT người nhận.");
    else if (c.phones.length > 1) p.push("Ảnh có " + c.phones.length + " SĐT: " + c.phones.join(", ") + " – kiểm tra đúng số người nhận.");
    if (!c.name.trim()) p.push("Thiếu tên người nhận.");
    if (!c.street.trim()) p.push("Thiếu số nhà/đường/thôn.");
    if (!c.provinceName || !c.wardName) p.push(c.addrHint || "Chưa có tỉnh + phường/xã mới.");
    if (!c.legacy.trim()) p.push("Thiếu địa chỉ khách gửi.");
    if (!c.items.length) p.push("Chưa có sản phẩm.");
    c.items.forEach(function (i) {
      const v = variantOf(i.variant_id);
      if (!v) p.push("Chưa nhận ra sản phẩm: «" + (i.raw || "?") + "».");
      else if (v.is_sold_out) p.push(variantLabel(v) + " đang TẠM HẾT.");
    });
    if (!c.payment && c.payEvidence === "claimed") p.push("Khách nói chuyển khoản nhưng chưa thấy bill – đã nhận tiền chưa?");
    else if (!c.payment) p.push("Chưa rõ COD hay chuyển khoản.");
    if (c.payEvidence === "bill" && c.paidAmount && c.paidAmount < totals(c).goods) p.push("Bill " + money(c.paidAmount) + " ít hơn tiền hàng " + money(totals(c).goods) + " – kiểm tra lại.");
    c.aiWarnings.forEach(function (w) { p.push(w); });
    if (c.dup && !c.dupOk) p.push("Đơn này đã có " + c.dup.code + " (cùng SĐT + sản phẩm trong 48h) – vẫn tạo?");
    return p;
  }

  // Bắt buộc để bấm Tạo tay (cảnh báo khác chỉ để xem)
  function hardMissing(c) {
    const p = [];
    if (!/^0\d{9}$/.test(c.phone)) p.push("SĐT (10 số)");
    if (!c.name.trim()) p.push("tên");
    if (!c.street.trim()) p.push("số nhà/đường");
    if (!c.provinceName || !c.wardName) p.push("tỉnh + phường/xã");
    if (!c.legacy.trim()) p.push("địa chỉ khách gửi");
    if (!c.items.length || c.items.some(function (i) { return !variantOf(i.variant_id); })) p.push("sản phẩm");
    if (!c.payment) p.push(c.payEvidence === "claimed" ? "xác nhận đã nhận tiền chưa" : "cách thanh toán");
    return p;
  }

  /* ---------- thẻ đơn ---------- */
  function render(c) {
    const el = c.el;
    el.className = "pdd-card " + ({ ok: "ok", counting: "ok", creating: "ok", done: "done", err: "err" }[c.state] || "warn");
    const tag = {
      ok: "✅ Đủ & chắc", counting: "✅ Tự tạo sau " + AUTO_SECONDS + " giây", creating: "⏳ Đang tạo…",
      done: "✅ Đã tạo " + esc(c.code), err: "❌ Lỗi", warn: "⚠️ Cần kiểm tra"
    }[c.state];
    const thumbs = '<div class="pdd-thumbs">' + c.thumbs.map(function (u) { return '<img alt="" src="' + esc(u) + '">'; }).join("") + "</div>";
    let html = '<div class="pdd-top"><span class="pdd-tag">' + tag + "</span>" + thumbs + "</div>";

    if (c.edit && c.state !== "done" && c.state !== "creating") html += editHtml(c);
    else html += viewHtml(c);

    const probs = c.state === "done" ? [] : problems(c);
    if (c.error) html += '<div class="pdd-probs">❌ ' + esc(c.error) + "</div>";
    else if (probs.length && c.state !== "creating") html += '<div class="pdd-probs">⚠️ ' + probs.map(esc).join("<br>⚠️ ") + "</div>";

    if (needPayConfirm(c) && c.state !== "counting") {
      html += '<div class="pdd-act">' +
        '<button type="button" class="pdd-btn main" data-a="paid">✅ Đã nhận tiền</button>' +
        '<button type="button" class="pdd-btn" data-a="waitpay">⏳ Tạo, chờ tiền</button>' +
        '<button type="button" class="pdd-btn" data-a="cod">🚚 Chưa – COD</button></div>';
    }
    if (c.state === "counting") {
      html += '<div class="pdd-count"><i></i></div><div class="pdd-act"><button type="button" class="pdd-btn" data-a="cancel">Huỷ – để em xem lại</button></div>';
    } else if (c.state === "done") {
      html += '<div class="pdd-act"><a class="pdd-btn main" href="/shop-admin-order?id=' + encodeURIComponent(c.orderId) + '">Mở đơn ' + esc(c.code) + "</a></div>";
    } else if (c.state !== "creating") {
      const label = c.dup && !c.dupOk ? "Vẫn tạo đơn" : "Tạo đơn";
      html += '<div class="pdd-act">' +
        (c.edit ? "" : '<button type="button" class="pdd-btn" data-a="edit">Sửa</button>') +
        '<button type="button" class="pdd-btn" data-a="drop">Bỏ</button>' +
        (needPayConfirm(c) ? "" : '<button type="button" class="pdd-btn main" data-a="create">' + label + "</button>") + "</div>";
    }
    el.innerHTML = html;
    bindCard(c);
    if (c.state === "counting") {
      const bar = el.querySelector(".pdd-count i");
      const left = Math.max(0, c.deadline - Date.now());
      bar.style.width = (left / (AUTO_SECONDS * 1000) * 100) + "%";
      requestAnimationFrame(function () { bar.style.transition = "width " + left + "ms linear"; bar.style.width = "0%"; });
    }
  }

  function needPayConfirm(c) {
    return c.payEvidence === "claimed" && !c.payment && c.state !== "done" && c.state !== "creating";
  }

  function payLabel(c) {
    if (c.payment === "cod") return "COD – khách trả";
    if (c.payment === "bank_transfer") {
      if (c.payStatus === "paid") return "CK – đã nhận tiền";
      if (c.payEvidence === "bill") return "CK – có bill" + (c.paidAmount ? " " + money(c.paidAmount) : "");
      return "CK – chờ tiền";
    }
    return "Thanh toán ?";
  }

  // Chọn cách thanh toán khi khách nói CK mà không có bill → đủ thì tự tạo như thẻ ✅
  function resolvePay(c, how) {
    c.payment = how === "cod" ? "cod" : "bank_transfer";
    c.payStatus = how === "paid" ? "paid" : "unpaid";
    c.payNote = how === "paid" ? "Đã xác nhận nhận tiền CK khi tạo đơn"
      : how === "waitpay" ? "Khách hẹn CK, chưa nhận tiền – nhận tiền rồi mới giao"
      : "Khách nói CK nhưng chưa nhận tiền → chuyển COD";
    c.error = "";
    if (!problems(c).length) { c.edit = false; startCountdown(c); }
    else render(c);
    updateBadge();
  }

  function totals(c) {
    const web = webGoods(c);
    const goods = c.dealGoods != null ? Math.min(c.dealGoods, web) : web;
    return { web: web, goods: goods, pay: goods + (c.dealShip || 0) };
  }

  function viewHtml(c) {
    const t = totals(c);
    const items = c.items.map(function (i) {
      const v = variantOf(i.variant_id);
      return "<li>" + (v ? esc(variantLabel(v)) + " × <b>" + i.quantity + "</b> <span class=\"pdd-muted\">(" + money(v.price) + ")</span>" : "❓ " + esc(i.raw)) + "</li>";
    }).join("");
    return '<div class="pdd-line"><b>' + esc(c.name || "?") + "</b> · " + esc(c.phone || "chưa có SĐT") + "</div>" +
      '<div class="pdd-line">' + esc([c.street, c.wardName, c.provinceName].filter(Boolean).join(", ") || "?") + "</div>" +
      (c.legacy ? '<div class="pdd-muted">Khách gửi: ' + esc(c.legacy) + "</div>" : "") +
      '<ul class="pdd-items">' + items + "</ul>" +
      '<div class="pdd-sum"><span>Tiền hàng' + (c.dealGoods != null ? " (chốt, web " + money(t.web) + ")" : "") + "</span><span>" + money(t.goods) + "</span></div>" +
      '<div class="pdd-sum"><span>Ship</span><span>' + (c.dealShip != null ? money(c.dealShip) + " (chốt)" : "theo hệ thống") + "</span></div>" +
      '<div class="pdd-sum"><span>' + esc(payLabel(c)) + " · " + esc(SOURCES[c.source] || c.source) + "</span><b>" + money(t.pay) + (c.dealShip == null ? " + ship" : "") + "</b></div>" +
      (c.note ? '<div class="pdd-muted">Ghi chú: ' + esc(c.note) + "</div>" : "");
  }

  function editHtml(c) {
    const provs = window.PDAddress.provinces();
    const wards = c.provinceId ? window.PDAddress.wardsOfProvince(c.provinceId) : [];
    const name = window.PDAddress.addressName;
    const varOpts = function (sel) {
      return '<option value="">— Chọn sản phẩm —</option>' + variants.map(function (v) {
        return '<option value="' + v.id + '"' + (String(v.id) === String(sel) ? " selected" : "") + ">" +
          esc(variantLabel(v) + " — " + money(v.price) + (v.is_sold_out ? " (tạm hết)" : "")) + "</option>";
      }).join("");
    };
    const bad = function (cond) { return cond ? ' class="bad"' : ""; };
    return '<div class="pdd-f">' +
      '<div class="pdd-two"><div><label>Tên người nhận</label><input data-f="name" value="' + esc(c.name) + '"' + bad(!c.name.trim()) + "></div>" +
      '<div><label>SĐT</label><input data-f="phone" inputmode="tel" value="' + esc(c.phone) + '"' + bad(!/^0\d{9}$/.test(c.phone)) + "></div></div>" +
      "<label>Số nhà, đường, thôn</label><input data-f=\"street\" value=\"" + esc(c.street) + '"' + bad(!c.street.trim()) + ">" +
      '<div class="pdd-two"><div><label>Tỉnh/thành (mới)</label><select data-f="province"' + bad(!c.provinceName) + '><option value="">Chọn tỉnh</option>' +
        provs.map(function (p) { return '<option value="' + esc(p.id) + '"' + (String(p.id) === String(c.provinceId) ? " selected" : "") + ">" + esc(name(p)) + "</option>"; }).join("") +
      "</select></div>" +
      '<div><label>Phường/xã (mới)</label><select data-f="ward"' + bad(!c.wardName) + (c.provinceId ? "" : " disabled") + '><option value="">Chọn phường/xã</option>' +
        wards.map(function (w) { const n = name(w); return '<option value="' + esc(n) + '"' + (n === c.wardName ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") +
      "</select></div></div>" +
      '<label>Địa chỉ khách gửi (địa chỉ cũ cho bên vận chuyển)</label><input data-f="legacy" value="' + esc(c.legacy) + '"' + bad(!c.legacy.trim()) + ">" +
      "<label>Sản phẩm</label>" +
      c.items.map(function (i, k) {
        return (variantOf(i.variant_id) ? "" : '<div class="pdd-raw">Chat ghi: «' + esc(i.raw) + "»</div>") +
          '<div class="pdd-row"><select data-i="' + k + '" data-f="variant"' + bad(!variantOf(i.variant_id)) + ">" + varOpts(i.variant_id) + "</select>" +
          '<input class="q" data-i="' + k + '" data-f="qty" inputmode="numeric" value="' + esc(i.quantity) + '">' +
          '<button type="button" data-i="' + k + '" data-a="rm" aria-label="Bỏ">×</button></div>';
      }).join("") +
      '<button type="button" class="pdd-add" data-a="add">+ Thêm sản phẩm</button>' +
      '<div class="pdd-two"><div><label>Giá chốt tiền hàng (trống = giá web ' + money(webGoods(c)) + ')</label><input data-f="goods" inputmode="numeric" value="' + fmtIn(c.dealGoods) + '"></div>' +
      '<div><label>Ship chốt (trống = theo hệ thống)</label><input data-f="ship" inputmode="numeric" value="' + fmtIn(c.dealShip) + '"></div></div>' +
      '<div class="pdd-two"><div><label>Thanh toán</label><select data-f="payment"' + bad(!c.payment) + '><option value="">Chọn</option>' +
        '<option value="cod"' + (c.payment === "cod" ? " selected" : "") + ">COD (thu hộ)</option>" +
        '<option value="bank_transfer"' + (c.payment === "bank_transfer" ? " selected" : "") + ">Chuyển khoản</option></select></div>" +
      '<div><label>Nguồn</label><select data-f="source">' +
        Object.keys(SOURCES).map(function (k) { return '<option value="' + k + '"' + (k === c.source ? " selected" : "") + ">" + SOURCES[k] + "</option>"; }).join("") +
      "</select></div></div>" +
      '<label>Ghi chú khách</label><input data-f="note" value="' + esc(c.note) + '">' +
      "</div>";
  }

  function bindCard(c) {
    const el = c.el;
    el.querySelectorAll("[data-f]").forEach(function (inp) {
      const f = inp.dataset.f;
      const ev = inp.tagName === "SELECT" ? "change" : "input";
      inp.addEventListener(ev, function () {
        const v = inp.value;
        const i = Number(inp.dataset.i);
        if (f === "name") c.name = v;
        else if (f === "phone") c.phone = v.replace(/\D/g, "").replace(/^84/, "0");
        else if (f === "street") c.street = v;
        else if (f === "legacy") c.legacy = v;
        else if (f === "note") c.note = v;
        else if (f === "goods") c.dealGoods = moneyIn(v);
        else if (f === "ship") c.dealShip = moneyIn(v);
        else if (f === "payment") { c.payment = v; c.payStatus = "unpaid"; c.payNote = ""; }
        else if (f === "source") c.source = v;
        else if (f === "qty") c.items[i].quantity = Math.max(1, Math.min(9999, parseInt(v, 10) || 1));
        else if (f === "variant") { c.items[i].variant_id = v ? Number(v) : null; c.dupOk = false; recheck(c); return; }
        else if (f === "province") {
          const p = window.PDAddress.provinces().find(function (x) { return String(x.id) === v; });
          c.provinceId = p ? p.id : "";
          c.provinceName = p ? window.PDAddress.addressName(p) : "";
          c.wardName = "";
          c.addrHint = "";
          render(c);
          return;
        }
        else if (f === "ward") { c.wardName = v; c.addrHint = ""; render(c); return; }
        if (f === "phone") { c.phones = []; c.dupOk = false; }
        if (ev === "change") render(c);
      });
      // Ô chữ: vẽ lại khi rời ô (giữ con trỏ khi đang gõ)
      if (ev === "input") inp.addEventListener("change", function () {
        if (f === "phone" || f === "qty") recheck(c); else render(c);
      });
    });
    el.querySelectorAll("[data-a]").forEach(function (b) {
      b.addEventListener("click", function () {
        const a = b.dataset.a;
        if (a === "cancel") { stopCountdown(c); c.state = "warn"; c.edit = true; render(c); updateBadge(); }
        else if (a === "edit") { c.edit = true; render(c); }
        else if (a === "drop") { stopCountdown(c); c.el.remove(); cards.splice(cards.indexOf(c), 1); updateBadge(); }
        else if (a === "rm") { c.items.splice(Number(b.dataset.i), 1); recheck(c); }
        else if (a === "add") { c.items.push({ variant_id: null, quantity: 1, raw: "", unit: null }); render(c); }
        else if (a === "create") manualCreate(c);
        else if (a === "paid" || a === "waitpay" || a === "cod") resolvePay(c, a);
      });
    });
  }

  async function recheck(c) {
    try { await checkDuplicate(c); } catch (_) {}
    render(c);
  }

  /* ---------- tạo đơn ---------- */
  function startCountdown(c) {
    c.state = "counting";
    c.deadline = Date.now() + AUTO_SECONDS * 1000;
    render(c);
    c.timer = setTimeout(function () {
      c.timer = null;
      if (c.state !== "counting") return;
      if (problems(c).length) { c.state = "warn"; c.edit = true; render(c); updateBadge(); return; }
      queueCreate(c, AUTO_NOTE);
    }, AUTO_SECONDS * 1000);
  }
  function stopCountdown(c) {
    if (c.timer) { clearTimeout(c.timer); c.timer = null; }
  }

  function manualCreate(c) {
    const miss = hardMissing(c);
    if (miss.length) { c.error = "Còn thiếu: " + miss.join(", ") + "."; c.edit = true; render(c); return; }
    if (c.dup && !c.dupOk) { c.dupOk = true; }
    queueCreate(c, MANUAL_NOTE);
  }

  // Tạo lần lượt từng đơn (không chạy song song)
  function queueCreate(c, internalNote) {
    c.state = "creating";
    c.error = "";
    render(c);
    createChain = createChain.then(function () { return doCreate(c, internalNote); });
  }

  async function doCreate(c, internalNote) {
    try {
      const data = await window.PDOrderPhoto.createOrderFromParsed(sb, {
        customer_name: c.name.trim(),
        phone: c.phone,
        address_line: c.street.trim(),
        ward: c.wardName,
        province: c.provinceName,
        legacy_address: c.legacy.trim(),
        payment_method: c.payment,
        payment_status: c.payStatus,
        customer_note: c.note.trim(),
        source: c.source,
        items: c.items,
        deal_goods: c.dealGoods,
        deal_ship: c.dealShip,
        internal_note: [
          internalNote,
          c.payEvidence === "bill" && c.payStatus !== "paid"
            ? "Khách gửi bill CK trong chat" + (c.paidAmount ? " " + money(c.paidAmount) : "") + " – đối chiếu TK rồi bấm Đã nhận tiền"
            : "",
          c.payNote
        ].filter(Boolean).join(" · ")
      });
      c.state = "done";
      c.code = data.order_code;
      c.orderId = data.order_id;
      createdCount++;
    }
    catch (e) {
      console.error("PD ORDER DROP CREATE:", e);
      if (e && e.order && e.order.order_id) {
        // Đơn đã có, chỉ bước áp địa chỉ cũ/giá chốt lỗi → mở đơn sửa tay, không tạo lại
        c.state = "done";
        c.code = e.order.order_code;
        c.orderId = e.order.order_id;
        c.error = "Đã tạo nhưng chưa áp xong địa chỉ cũ/giá chốt (" + ((e && e.message) || "lỗi") + ") – mở đơn sửa tay.";
        createdCount++;
        render(c);
        updateBadge();
        return;
      }
      c.state = "err";
      c.edit = true;
      c.error = (e && e.message) || "Không tạo được đơn.";
    }
    render(c);
    updateBadge();
  }

  /* ---------- khởi động ---------- */
  async function start() {
    try {
      if (!(await canManage())) return;
      buildUi();
    } catch (e) { console.warn("pd-order-drop", e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
