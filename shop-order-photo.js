/* PickDee Shop — Tạo đơn từ ảnh chụp chat (Zalo / TikTok / Facebook)
   1. Điện thoại tự đọc chữ trong ảnh (tesseract.js, tải lần đầu ~3MB rồi trình duyệt nhớ). Ảnh không gửi đi đâu.
   2. Che SĐT thành [SĐT1], [SĐT2]... (SĐT giữ trên máy), gửi chữ cho Edge shop-order-parse (Gemini free) tách đơn.
   3. Trả kết quả + SĐT thật để trang Tạo đơn tự điền.
   Dùng: const r = await PDOrderPhoto.run(files, msg => ...);            (1 đơn, trang Tạo đơn)
         const { orders } = await PDOrderPhoto.runMulti(files, msg => ...); (nhiều đơn, bong bóng Thả ảnh đơn)
         await PDOrderPhoto.createOrderFromParsed(sb, {...});               (tạo đơn + áp giá chốt) */
(function () {
  "use strict";

  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  const HOTLINE = "0926629966";
  const workers = {};

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.Tesseract) return ok();
      const s = document.createElement("script");
      s.src = src;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error("Không tải được bộ đọc chữ (kiểm tra mạng).")); };
      document.head.appendChild(s);
    });
  }

  // lang "vie" đọc chữ; "eng" chỉ để đọc lại CHỮ SỐ (bộ vie hay nhầm 3↔5 với font mảnh iPhone)
  async function worker(progress, lang) {
    lang = lang || "vie";
    if (!workers[lang]) {
      workers[lang] = (async function () {
        await loadScript(TESS);
        return window.Tesseract.createWorker(lang, 1, {
          logger: function (m) {
            if (m && m.status === "loading language traineddata" && progress) progress("Đang tải bộ đọc chữ (lần đầu)…");
          }
        });
      })();
      workers[lang].catch(function () { delete workers[lang]; });
    }
    return workers[lang];
  }

  // Sửa số theo lượt đọc "eng": ghép dòng vie ↔ dòng eng giống nhau nhất (bỏ dấu, bỏ số),
  // cùng số lượng cụm số thì lấy số của eng; khác nhau → ghi doubts để thẻ nhắc so với ảnh
  const NUM_RE = /\d+(?:[\/.\-]\d+)*/g;
  function letters(s) {
    return String(s).toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
  }
  function similar(a, b) {
    if (a.length < 4 || b.length < 4) return 0;
    const grams = {};
    for (let i = 0; i < a.length - 1; i++) { const g = a.substr(i, 2); grams[g] = (grams[g] || 0) + 1; }
    let hit = 0;
    for (let i = 0; i < b.length - 1; i++) { const g = b.substr(i, 2); if (grams[g] > 0) { grams[g]--; hit++; } }
    return 2 * hit / (a.length + b.length - 2);
  }
  // Chỉ thay khi 2 số gần giống: cùng độ dài, ≥ 2 chữ số, khác ≤ 1/3 số chữ số (65/5/47 ↔ 63/5/47, không phải 7:28 ↔ 6:47)
  function nearNum(a, b) {
    if (a.length !== b.length || a.replace(/\D/g, "").length < 2) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { if (/\D/.test(a[i] + b[i])) return false; diff++; }
    return diff <= Math.max(1, Math.floor(a.replace(/\D/g, "").length / 3));
  }
  function fixDigits(vie, eng) {
    const doubts = [];
    const engLines = String(eng || "").split("\n").map(function (l) { return { l: l, k: letters(l), n: l.match(NUM_RE) || [] }; });
    let from = 0; // dòng eng đi theo thứ tự trên → dưới như dòng vie
    const text = String(vie || "").split("\n").map(function (line) {
      const nums = line.match(NUM_RE);
      if (!nums) return line;
      const k = letters(line);
      let best = -1, score = 0;
      for (let j = from; j < engLines.length; j++) { const sc = similar(k, engLines[j].k); if (sc > score) { score = sc; best = j; } }
      if (best < 0 || score < 0.6) return line;
      from = best + 1;
      const en = engLines[best].n;
      if (en.length !== nums.length) return line;
      let i = 0;
      return line.replace(NUM_RE, function (m) {
        const e = en[i++];
        if (e === m || !nearNum(m, e)) return m;
        doubts.push({ vie: m, eng: e });
        return e;
      });
    }).join("\n");
    return { text: text, doubts: doubts };
  }

  // Thu nhỏ ảnh chụp màn hình (iPhone 1170px+) → đọc nhanh hơn, đủ nét
  function shrink(file) {
    return new Promise(function (ok, fail) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        const scale = Math.min(1, 1100 / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error("Không mở được ảnh.")); };
      img.src = url;
    });
  }

  function maskPhones(text) {
    const phones = [];
    const masked = text.replace(/(?:\+?84|0)(?:[\s.\-]?\d){9}/g, function (m) {
      const p = m.replace(/\D/g, "").replace(/^84/, "0");
      if (p === HOTLINE) return "[SĐT PickDee]";
      let i = phones.indexOf(p);
      if (i < 0) { phones.push(p); i = phones.length - 1; }
      return "[SĐT" + (i + 1) + "]";
    });
    return { masked: masked, phones: phones };
  }

  // Đọc chữ từng ảnh trên máy; nhiều ảnh thì giữ ranh giới "--- Ảnh n ---"
  async function readImages(files, progress, max, alwaysMark) {
    const list = Array.from(files || []).filter(function (f) { return /^image\//.test(f.type); }).slice(0, max);
    if (!list.length) throw new Error("Chưa chọn ảnh.");
    const say = progress || function () {};
    say("Đang chuẩn bị bộ đọc chữ…");
    const w = await worker(say);
    const wEng = await worker(say, "eng").catch(function () { return null; });
    const texts = [], doubts = [];
    for (let i = 0; i < list.length; i++) {
      say("Đang đọc chữ ảnh " + (i + 1) + "/" + list.length + "…");
      const canvas = await shrink(list[i]);
      const r = await w.recognize(canvas);
      const re = wEng ? await wEng.recognize(canvas).catch(function () { return null; }) : null;
      const fixed = re ? fixDigits(r.data.text, re.data.text) : { text: String(r.data.text || ""), doubts: [] };
      doubts.push(fixed.doubts);
      // Bỏ dòng nút quay lại app của iPhone ("< Facebook") – không phải nguồn chat
      const text = fixed.text.replace(/^\s*[<◀‹«]\s*(Facebook|Messenger|Zalo|TikTok|Instagram|Safari)\s*$/gim, "");
      texts.push((alwaysMark || list.length > 1 ? "--- Ảnh " + (i + 1) + " ---\n" : "") + text);
    }
    return { files: list, texts: texts, doubts: doubts };
  }

  async function parse(masked, multi, say) {
    say("AI đang tách tên, địa chỉ, sản phẩm…");
    const sess = (await window.sb.auth.getSession()).data.session;
    if (!sess) throw new Error("Phiên đăng nhập hết hạn, đăng nhập lại.");
    const res = await fetch(window.PICKDEE_CONFIG.SUPABASE_URL + "/functions/v1/shop-order-parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: window.PICKDEE_CONFIG.SUPABASE_PUBLISHABLE_KEY,
        Authorization: "Bearer " + sess.access_token
      },
      body: JSON.stringify(multi ? { text: masked, multi: true } : { text: masked })
    });
    const d = await res.json().catch(function () { return {}; });
    if (!res.ok || !d.ok) throw new Error(d.error || "Không tách được đơn, thử lại.");
    return d;
  }

  async function run(files, progress) {
    const say = progress || function () {};
    const texts = (await readImages(files, say, 4, false)).texts;
    const m = maskPhones(texts.join("\n"));
    const r = (await parse(m.masked, false, say)).result;
    const idx = Number(r.phone_ref) - 1;
    r.phone = m.phones[idx] || (m.phones.length === 1 ? m.phones[0] : "");
    r.phones = m.phones;
    r.ocr_text = texts.join("\n");
    return r;
  }

  // Nhiều ảnh, nhiều khách → orders[] (mỗi đơn có image_indexes, phone thật, phones = SĐT trong ảnh của đơn)
  async function runMulti(files, progress) {
    const say = progress || function () {};
    const read = await readImages(files, say, 10, true);
    const m = maskPhones(read.texts.join("\n"));
    // SĐT nào nằm trong ảnh nào (theo token [SĐTn] sau khi che)
    const perImage = m.masked.split(/^--- Ảnh \d+ ---$/m).slice(1).map(function (chunk) {
      return Array.from(new Set((chunk.match(/\[SĐT(\d+)\]/g) || []).map(function (t) { return m.phones[Number(t.match(/\d+/)[0]) - 1]; })));
    });
    const d = await parse(m.masked, true, say);
    const orders = (d.orders || []).map(function (o) {
      const imgs = (o.image_indexes || []).filter(function (n) { return n >= 1 && n <= read.files.length; });
      const own = Array.from(new Set(imgs.reduce(function (a, n) { return a.concat(perImage[n - 1] || []); }, [])));
      const ref = m.phones[Number(o.phone_ref) - 1];
      o.image_indexes = imgs;
      // Số hai lượt đọc khác nhau (đã lấy theo "eng") → thẻ nhắc so với ảnh
      o.digit_doubts = imgs.reduce(function (a, n) { return a.concat(read.doubts[n - 1] || []); }, []);
      o.phones = own;
      o.phone = ref && (!own.length || own.includes(ref)) ? ref : (own.length === 1 ? own[0] : "");
      return o;
    });
    return { orders: orders, files: read.files, texts: read.texts };
  }

  /* Tạo đơn (owner/shop_admin): RPC shop_admin_create_order → địa chỉ cũ + trạng thái tiền (+ ghi chú nội bộ)
     → áp giá chốt chat (giảm giá đơn / phí ship). total_amount do trigger shop_calculate_order_total tự tính.
     o = { customer_name, phone, address_line, ward, province, legacy_address, payment_method, payment_status,
           customer_note, source, items:[{variant_id, quantity}], deal_goods, deal_ship, internal_note } */
  async function createOrderFromParsed(client, o) {
    const money = function (n) { return Number(n || 0).toLocaleString("vi-VN") + "đ"; };
    const { data, error } = await client.rpc("shop_admin_create_order", {
      p_customer_name: o.customer_name,
      p_phone: o.phone,
      p_email: null,
      p_address_line: o.address_line,
      p_ward: o.ward,
      p_province: o.province,
      p_payment_method: o.payment_method,
      p_customer_note: o.customer_note || null,
      p_order_source: o.source,
      p_items: o.items.map(function (l) { return { variant_id: Number(l.variant_id), quantity: Number(l.quantity || 1) }; })
    });
    if (error) throw error;
    if (!data?.success || !data?.order_id) {
      console.error("ADMIN ORDER RESULT:", data);
      throw new Error("Không tạo được đơn hàng.");
    }
    // Đơn đã tạo: lỗi bước sau không được làm tạo lại đơn → gắn mã đơn vào lỗi
    try {
      const first = { legacy_address: o.legacy_address, payment_status: o.payment_status || "unpaid" };
      if (o.internal_note) first.internal_note = o.internal_note;
      const { error: upErr } = await client.from("shop_orders").update(first).eq("id", data.order_id);
      if (upErr) throw upErr;
      // Giá chốt trong chat: tiền hàng thấp hơn giá web → giảm giá đơn; phí ship chốt → ghi đè ship
      if (o.deal_goods != null || o.deal_ship != null) {
        const { data: od, error: odErr } = await client.from("shop_orders").select("subtotal").eq("id", data.order_id).single();
        if (odErr) throw odErr;
        const patch = {};
        if (o.deal_goods != null) {
          patch.order_discount_amount = Math.max(0, Number(od.subtotal || 0) - o.deal_goods);
          patch.order_discount_note = "Giá chốt qua chat: " + money(o.deal_goods);
        }
        if (o.deal_ship != null) {
          patch.shipping_fee = o.deal_ship;
          patch.shipping_discount = 0;
          patch.shipping_pricing_mode = null;
        }
        const { error: dealErr } = await client.from("shop_orders").update(patch).eq("id", data.order_id);
        if (dealErr) throw dealErr;
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(e?.message || String(e));
      err.order = data;
      throw err;
    }
    return data;
  }

  window.PDOrderPhoto = { run: run, runMulti: runMulti, createOrderFromParsed: createOrderFromParsed };
})();
