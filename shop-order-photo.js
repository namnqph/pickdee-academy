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
  //   Số 1 chữ số (vd "5 set" ↔ "3 set": bộ vie hay đọc 3 thành 5) chỉ thay khi cả dòng khớp gần tuyệt đối (one=true)
  function nearNum(a, b, one) {
    if (a.length !== b.length || a.replace(/\D/g, "").length < (one ? 1 : 2)) return false;
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
        if (e === m || !nearNum(m, e, score >= 0.85)) return m;
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
        c.naturalW = img.naturalWidth;
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error("Không mở được ảnh.")); };
      img.src = url;
    });
  }

  // Chữ trắng trên bong bóng màu (tin PickDee gửi: xanh/tím, chế độ tối) bộ đọc thường bỏ sót.
  //   Ảnh đen-trắng theo vùng (giống student-bill-ocr.js): nền = màu đa số quanh điểm (~80px), chữ = phần thiểu số,
  //   chiều sáng/tối theo độ lệch (moment bậc 3) → chữ luôn đen trên nền trắng, kể cả chữ trắng trên nền màu.
  function normalize(src) {
    const W = src.width, H = src.height;
    const d = src.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, W, H).data;
    const g = new Float64Array(W * H);
    for (let i = 0, p = 0; p < g.length; i += 4, p++) g[p] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
    function integral(pow) {
      const S = new Float64Array((W + 1) * (H + 1));
      for (let y = 0; y < H; y++) {
        let rs = 0;
        for (let x = 0; x < W; x++) { const v = g[y * W + x]; rs += pow === 3 ? v * v * v : pow === 2 ? v * v : v; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + rs; }
      }
      return function (x, y, r) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
        return (S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0]) / ((y1 - y0) * (x1 - x0));
      };
    }
    const m1 = integral(1), m2 = integral(2), m3 = integral(3);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d"), o = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, a = m1(x, y, 40), b = m2(x, y, 40), cc = m3(x, y, 40);
      const skew = cc - 3 * a * b + 2 * a * a * a, sd = Math.sqrt(Math.max(0, b - a * a)), k = Math.max(15, sd * 0.35);
      const v = (skew > 0 ? g[p] > a + k : g[p] < a - k) ? 0 : 255;
      o.data[p * 4] = o.data[p * 4 + 1] = o.data[p * 4 + 2] = v; o.data[p * 4 + 3] = 255;
    }
    ctx.putImageData(o, 0, 0);
    return c;
  }

  // Ảnh đại diện tròn đầu tin nhắn (Zalo/Messenger) hay bị đọc thành "9", "@", "®" đứng đầu dòng
  //   → "9 Thôn Đông Thái" giả. Nhận ra: chữ đầu dòng ≤ 2 ký tự, gần vuông, cao ≥ 1.5 lần chữ còn lại của dòng → bỏ.
  function dropIcons(data) {
    const lines = String(data.text || "").split("\n");
    let from = 0;
    (data.lines || []).forEach(function (ln) {
      const ws = ln.words || [];
      if (ws.length < 2) return;
      const w0 = ws[0], b = w0.bbox, h0 = b.y1 - b.y0, wd = b.x1 - b.x0;
      const hs = ws.slice(1).map(function (w) { return w.bbox.y1 - w.bbox.y0; }).sort(function (a, c) { return a - c; });
      const hm = hs[Math.floor(hs.length / 2)];
      if (String(w0.text).trim().length > 2 || h0 < 1.5 * hm || wd < 0.6 * h0 || wd > 1.6 * h0) return;
      const want = String(ln.text || "").trim();
      for (let i = from; i < lines.length; i++) {
        if (lines[i].trim() !== want) continue;
        lines[i] = lines[i].replace(/^\s*\S+\s+/, "");
        from = i + 1;
        return;
      }
    });
    return lines.join("\n");
  }

  // Ảnh gốc là chính (ảnh đen-trắng làm hỏng chữ nền sáng: "tran hung" → "tranhung", SĐT sai). Chỉ chèn dòng của ảnh
  //   đen-trắng mà ảnh gốc KHÔNG có (≥ 5 chữ cái, không giống dòng nào), đúng vị trí theo thứ tự trên → dưới.
  function mergeLines(base, extra) {
    const B = String(base || "").split("\n"), keys = B.map(letters), out = [];
    let j = 0;
    String(extra || "").split("\n").forEach(function (e) {
      const k = letters(e);
      if (k.length < 3) return;
      // dòng ngắn (vd "Hòa" — tên bị xuống dòng) so khớp nguyên chữ; dòng dài so gần giống
      const same = function (i) { return k.length < 5 ? keys[i] === k : similar(k, keys[i]) >= 0.6; };
      let hit = -1;
      for (let i = j; i < B.length; i++) if (same(i)) { hit = i; break; }
      if (hit >= 0) { for (; j <= hit; j++) out.push(B[j]); return; }
      for (let i = 0; i < j; i++) if (same(i)) return; // đã có ở phía trên
      out.push(e.replace(/^[^0-9A-Za-zÀ-ỹ]+|[^0-9A-Za-zÀ-ỹ.,)]+$/g, ""));
    });
    for (; j < B.length; j++) out.push(B[j]);
    return out.join("\n");
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
  /* ---------- Đối chiếu kết quả AI với chữ trong ảnh ----------
     Mọi chữ/số AI trả về (tên, số nhà, đường, xã, huyện, tỉnh) bỏ dấu phải có trong ảnh.
     AI chỉ được THÊM DẤU (le lai → Lê Lai), không được đổi chữ (le lai → Lê Lợi) hay đổi số.
     Lệch → lấy đúng chữ/số khách viết ở vị trí đó (fixes); không dò được → untraced (thẻ chặn tự tạo). */
  // Chữ AI tự thêm cho rõ loại đơn vị/địa chỉ – không cần có trong ảnh
  const ADDED = { phuong: 1, xa: 1, thi: 1, tran: 1, quan: 1, huyen: 1, tinh: 1, thanh: 1, pho: 1, tp: 1, tx: 1, p: 1, q: 1, so: 1, ngo: 1, ngach: 1, hem: 1, kiet: 1, duong: 1, pho_: 1, thon: 1, xom: 1, ap: 1, to: 1, khu: 1, cum: 1, khom: 1, ban: 1, lang: 1, nha: 1, toa: 1, tang: 1, phong: 1, can: 1, ho: 1, chung: 1, cu: 1, kdt: 1 };
  function wkey(w) { return String(w).toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function ocrWords(text) {
    return (String(text || "").match(/\d+(?:[\/.\-]\d+)*|[\p{L}]+/gu) || []).map(function (w) { return { raw: w, k: wkey(w), num: /^\d/.test(w) }; });
  }
  // Chữ khớp: giống hệt (bỏ dấu); chữ ≥ 5 ký tự cho lệch 1 ký tự (AI sửa lỗi đọc như "gianh" → "Giang")
  function wordMatch(fk, ok) { return fk === ok || (fk.length >= 5 && ok.length >= 4 && lev(fk, ok) <= 1); }
  // Khách viết tắt tỉnh/thành → AI viết đầy đủ là đúng
  const ABBR = { hn: "ha noi", hcm: "ho chi minh", tphcm: "ho chi minh", sg: "sai gon ho chi minh", hp: "hai phong", dn: "da nang", ct: "can tho", brvt: "ba ria vung tau", bd: "binh duong" };
  function anchorField(value, words, label, out) {
    if (!value) return value;
    const abbr = {};
    words.forEach(function (w) { if (ABBR[w.k]) ABBR[w.k].split(" ").forEach(function (x) { abbr[x] = 1; }); });
    let last = -1;
    return String(value).replace(/\d+(?:[\/.\-]\d+)*|[\p{L}]+/gu, function (tok) {
      const fk = wkey(tok), num = /^\d/.test(tok);
      if (!num && (ADDED[fk] || abbr[fk])) return tok;
      // tìm từ khớp, ưu tiên sau từ khớp trước (giữ thứ tự khách viết)
      let hit = -1;
      for (let pass = 0; pass < 2 && hit < 0; pass++) {
        for (let j = pass ? 0 : last + 1; j < words.length; j++) {
          if (num ? words[j].k === fk : (!words[j].num && wordMatch(fk, words[j].k))) { hit = j; break; }
        }
      }
      if (hit >= 0) { last = hit; return tok; }
      // không có trong ảnh → lấy từ đứng ngay sau từ khớp trước (cùng loại chữ/số, độ dài gần bằng)
      const cand = last >= 0 ? words[last + 1] : null;
      if (cand && cand.num === num && Math.abs(cand.k.length - fk.length) <= 2) {
        last = last + 1;
        const fixed = num ? cand.raw : (tok[0] === tok[0].toUpperCase() ? cand.raw[0].toUpperCase() + cand.raw.slice(1) : cand.raw);
        out.fixes.push(label + ": «" + tok + "» → «" + fixed + "»");
        return fixed;
      }
      // số chưa neo được vị trí: trong ảnh có đúng 1 số gần giống (65/5/47 ↔ 63/5/47) → lấy số đó
      if (num) {
        const near = words.filter(function (w) { return w.num && nearNum(fk, w.k); })
          .filter(function (w, i, arr) { return arr.findIndex(function (x) { return x.k === w.k; }) === i; });
        if (near.length === 1) {
          last = words.indexOf(near[0]);
          out.fixes.push(label + ": «" + tok + "» → «" + near[0].raw + "»");
          return near[0].raw;
        }
      }
      out.untraced.push(label + ": «" + tok + "» không có trong ảnh");
      return tok;
    });
  }
  // Chiều ngược: AI bỏ rơi mã số nhà/khu khách viết ngay trước địa chỉ ("K1 tổ8 ấp…" → "Tổ 8 ấp…").
  // Tìm dòng ảnh có 2 từ đầu của địa chỉ; từ đứng ngay trước là mã (K1, 12A, 36/8, B5) mà địa chỉ chưa có → thêm lại đúng chữ khách.
  const LEAD_RE = /(?:^|[\s,.;])([a-z]{1,3}\d{1,4}[a-h]?|\d{1,4}[a-h]?(?:[\/\-]\d{1,4}[a-h]?)*)[\s,.]*$/;
  function keepLeadCode(value, text, label, out) {
    if (!value) return value;
    const vk = wkey(value);
    const head = (vk.match(/[a-z0-9]+/g) || []).slice(0, 2);
    if (head.length < 2) return value;
    const re = new RegExp(head.map(function (t) { return t.replace(/[^a-z0-9]/g, ""); }).join("[\\s,.]*"));
    const lines = String(text || "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lk = wkey(lines[i]);
      const m = lk.match(re);
      if (!m) continue;
      const lead = lk.slice(0, m.index).match(LEAD_RE);
      if (!lead) return value;
      const code = lead[1];
      if ((vk.match(/[a-z0-9\/\-]+/g) || []).indexOf(code) >= 0) return value;
      const raw = (lines[i].match(new RegExp(code.replace(/[\/\-]/g, "\\$&"), "i")) || [code.toUpperCase()])[0];
      out.fixes.push(label + ": thêm «" + raw + "» khách ghi ở đầu địa chỉ");
      return raw + " " + value;
    }
    return value;
  }
  /* ---------- Tên người nhận: giữ ĐÚNG chữ khách viết (không tự thêm/đổi dấu) ----------
     Khách viết "Minh Duc" → giữ "Minh Duc" (AI/OCR không được biến thành "Minh Dục"/"Minh Đức"). */
  function nameKeys(name) { return (String(name || "").match(/[\p{L}]+/gu) || []).map(wkey); }
  // Chỗ trong dãy từ (ocrWords hoặc words của Tesseract) có đủ các từ của tên đứng liền nhau
  function findName(list, keys, keyOf) {
    const hits = [];
    for (let j = 0; j + keys.length <= list.length; j++) {
      let ok = true;
      for (let t = 0; t < keys.length && ok; t++) ok = keyOf(list[j + t]) === keys[t];
      if (ok) hits.push(j);
    }
    return hits;
  }
  // Thay dấu từng từ của tên theo chữ đọc được (raws), giữ kiểu viết hoa của tên hiện tại
  function applyName(name, raws) {
    let t = 0;
    return String(name).replace(/[\p{L}]+/gu, function (tok) {
      const r = String(raws[t++] || tok);
      return tok[0] === tok[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1).toLowerCase() : r.toLowerCase();
    });
  }
  function nameAsWritten(o, words, out) {
    const keys = nameKeys(o.customer_name);
    if (!keys.length) return;
    const forms = {};
    findName(words, keys, function (w) { return w.k; }).forEach(function (j) {
      const raws = words.slice(j, j + keys.length).map(function (w) { return w.raw; });
      forms[raws.join(" ").toLowerCase()] = raws;
    });
    const all = Object.keys(forms);
    if (all.length !== 1) return; // không thấy, hoặc ảnh có nhiều kiểu dấu khác nhau → giữ nguyên
    const fixed = applyName(o.customer_name, forms[all[0]]);
    if (fixed !== o.customer_name) { out.fixes.push("Tên: «" + o.customer_name + "» → «" + fixed + "» (đúng chữ khách viết)"); o.customer_name = fixed; }
  }
  // Ảnh thu nhỏ hay đọc sai dấu tên ("Duc" → "Dục"): cắt đúng vùng tên ở ảnh GỐC, phóng to, đọc lại → lấy dấu theo lần đọc này.
  async function recheckName(o, read, idxs, out) {
    const keys = nameKeys(o.customer_name);
    if (!keys.length || !read.words) return;
    const keyOf = function (w) { return wkey(String(w.text || "").replace(/[^\p{L}]/gu, "")); };
    for (const n of idxs) {
      const info = read.words[n];
      if (!info) continue;
      for (const list of info.lists) {
        const j = findName(list, keys, keyOf)[0];
        if (j === undefined) continue;
        const bs = list.slice(j, j + keys.length).map(function (w) { return w.bbox; });
        const x0 = Math.min.apply(null, bs.map(function (b) { return b.x0; })) / info.scale;
        const x1 = Math.max.apply(null, bs.map(function (b) { return b.x1; })) / info.scale;
        const y0 = Math.min.apply(null, bs.map(function (b) { return b.y0; })) / info.scale;
        const y1 = Math.max.apply(null, bs.map(function (b) { return b.y1; })) / info.scale;
        try {
          const img = await createImageBitmap(read.files[n]);
          const pad = (y1 - y0) * 0.6, k = Math.min(3, Math.max(1, 64 / (y1 - y0)));
          const sx = Math.max(0, x0 - pad), sy = Math.max(0, y0 - pad);
          const sw = Math.min(img.width, x1 + pad) - sx, sh = Math.min(img.height, y1 + pad) - sy;
          const c = document.createElement("canvas");
          c.width = Math.round(sw * k); c.height = Math.round(sh * k);
          c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
          const r = await (await worker()).recognize(c);
          const ws = ocrWords(r.data.text);
          const h = findName(ws, keys, function (w) { return w.k; })[0];
          if (h === undefined) continue;
          const fixed = applyName(o.customer_name, ws.slice(h, h + keys.length).map(function (w) { return w.raw; }));
          if (fixed !== o.customer_name) { out.fixes.push("Tên: «" + o.customer_name + "» → «" + fixed + "» (đọc lại vùng tên ở ảnh gốc)"); o.customer_name = fixed; }
          return;
        } catch (e) { console.warn("PickDee đọc lại tên:", e); }
      }
    }
  }
  // o = 1 đơn AI trả về; text = chữ các ảnh của đơn đó. Sửa tại chỗ, trả { fixes, untraced }
  function verifyParsed(o, text) {
    const words = ocrWords(text);
    const out = { fixes: [], untraced: [] };
    if (!words.length || !o) return out;
    o.customer_name = anchorField(o.customer_name, words, "Tên", out);
    nameAsWritten(o, words, out);
    // Tên người Việt không có chữ 1 ký tự ("Nguyễn Văn T") → tên bị cắt/đọc thiếu
    String(o.customer_name || "").split(/\s+/).forEach(function (w) {
      if (w.length === 1) out.untraced.push("Tên: «" + o.customer_name + "» có chữ viết tắt «" + w + "», có thể đọc thiếu");
    });
    const ap = o.address_parts || {};
    ap.street = anchorField(ap.street, words, "Số nhà/đường", out);
    ap.ward = anchorField(ap.ward, words, "Xã/phường", out);
    ap.district = anchorField(ap.district, words, "Huyện/quận", out);
    ap.province = anchorField(ap.province, words, "Tỉnh", out);
    o.address_text = anchorField(o.address_text, words, "Địa chỉ khách gửi", out);
    ap.street = keepLeadCode(ap.street, text, "Số nhà/đường", out);
    o.address_text = keepLeadCode(o.address_text, text, "Địa chỉ khách gửi", out);
    (o.items || []).forEach(function (i) {
      // số lượng phải có trong chữ món đó (raw_text) hoặc = 1 khi khách không ghi số
      const q = Number(i.quantity || 1);
      const raw = String(i.raw_text || "");
      if (q > 1 && !(raw.match(/\d+/g) || []).some(function (n) { return Number(n) === q; })
          && !words.some(function (w) { return w.num && Number(w.raw) === q; })) {
        out.untraced.push("Số lượng " + q + " không có trong ảnh");
      }
    });
    out.untraced = Array.from(new Set(out.untraced));
    return out;
  }

  async function readImages(files, progress, max, alwaysMark) {
    const list = Array.from(files || []).filter(function (f) { return /^image\//.test(f.type); }).slice(0, max);
    if (!list.length) throw new Error("Chưa chọn ảnh.");
    const say = progress || function () {};
    say("Đang chuẩn bị bộ đọc chữ…");
    const w = await worker(say);
    const wEng = await worker(say, "eng").catch(function () { return null; });
    const texts = [], doubts = [], words = [];
    for (let i = 0; i < list.length; i++) {
      say("Đang đọc chữ ảnh " + (i + 1) + "/" + list.length + "…");
      const canvas = await shrink(list[i]);
      const r = await w.recognize(canvas);
      const re = wEng ? await wEng.recognize(canvas).catch(function () { return null; }) : null;
      const t1 = dropIcons(r.data);
      const base = re ? fixDigits(t1, re.data.text) : { text: t1, doubts: [] };
      const ws = [r.data.words || []];
      // Lượt 2: ảnh đen-trắng → lấy thêm dòng bị sót (chữ trắng trên bong bóng màu)
      let fixed = base;
      try {
        const nc = normalize(canvas);
        const r2 = await w.recognize(nc);
        const re2 = wEng ? await wEng.recognize(nc).catch(function () { return null; }) : null;
        const t2 = dropIcons(r2.data);
        ws.push(r2.data.words || []);
        const extra = re2 ? fixDigits(t2, re2.data.text) : { text: t2, doubts: [] };
        const merged = mergeLines(base.text, extra.text);
        fixed = { text: merged, doubts: base.doubts.concat(extra.doubts.filter(function (x) { return merged.indexOf(x.eng) >= 0; })) };
      } catch (e) { console.warn("PickDee OCR lượt 2:", e); }
      doubts.push(fixed.doubts);
      words.push({ lists: ws, scale: canvas.width / canvas.naturalW });
      // Bỏ dòng nút quay lại app của iPhone ("< Facebook") – không phải nguồn chat
      const text = fixed.text.replace(/^\s*[<◀‹«]\s*(Facebook|Messenger|Zalo|TikTok|Instagram|Safari)\s*$/gim, "");
      texts.push((alwaysMark || list.length > 1 ? "--- Ảnh " + (i + 1) + " ---\n" : "") + text);
    }
    return { files: list, texts: texts, doubts: doubts, words: words };
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
    const read = await readImages(files, say, 4, false);
    const texts = read.texts;
    const m = maskPhones(texts.join("\n"));
    const r = (await parse(m.masked, false, say)).result;
    const idx = Number(r.phone_ref) - 1;
    r.phone = m.phones[idx] || (m.phones.length === 1 ? m.phones[0] : "");
    r.phones = m.phones;
    r.ocr_text = texts.join("\n");
    const chk = verifyParsed(r, r.ocr_text);
    await recheckName(r, read, read.files.map(function (f, i) { return i; }), chk);
    r.fixes = chk.fixes;
    r.warnings = (r.warnings || []).concat(chk.untraced.map(function (x) { return "Kiểm tra lại – " + x; }));
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
    const orders = [];
    for (const o of (d.orders || [])) {
      const imgs = (o.image_indexes || []).filter(function (n) { return n >= 1 && n <= read.files.length; });
      const own = Array.from(new Set(imgs.reduce(function (a, n) { return a.concat(perImage[n - 1] || []); }, [])));
      const ref = m.phones[Number(o.phone_ref) - 1];
      o.image_indexes = imgs;
      const chk = verifyParsed(o, imgs.map(function (n) { return read.texts[n - 1] || ""; }).join("\n"));
      await recheckName(o, read, imgs.map(function (n) { return n - 1; }), chk);
      o.fixes = chk.fixes;
      o.warnings = (o.warnings || []).concat(chk.untraced.map(function (x) { return "Kiểm tra lại – " + x; }));
      // Số hai lượt đọc khác nhau (đã lấy theo "eng") → thẻ nhắc so với ảnh
      o.digit_doubts = imgs.reduce(function (a, n) { return a.concat(read.doubts[n - 1] || []); }, []);
      o.phones = own;
      o.phone = ref && (!own.length || own.includes(ref)) ? ref : (own.length === 1 ? own[0] : "");
      orders.push(o);
    }
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

  window.PDOrderPhoto = { run: run, runMulti: runMulti, createOrderFromParsed: createOrderFromParsed, verifyParsed: verifyParsed };
})();
