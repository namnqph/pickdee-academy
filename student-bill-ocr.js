/* PickDee Academy — đọc chữ trên bill chuyển khoản ngay trên máy học viên (tesseract.js, tải lần đầu ~3MB).
   Ảnh: 4 lượt đọc ghép lại — vie + eng trên ảnh xám, vie + eng trên ảnh đen/trắng theo vùng (chữ trắng trên
        nền màu / app chế độ tối). eng đọc chữ số chuẩn hơn. Ảnh nhỏ được phóng to, ảnh lớn thu về ~1100px.
   PDF (biên lai ngân hàng): lấy chữ trực tiếp trong file (pdf.js); PDF scan → đọc ảnh trang 1.
   Edge pickdee-payment-submit kiểm điểm trên chữ này. Lỗi / quá lâu → "" (Edge trả học viên gửi lại).
   Dùng: const text = await PDBillOcr.read(file, msg => ...); */
(function () {
  "use strict";

  const TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
  const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const workers = {};
  const loaded = {};

  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (ok, fail) {
        const s = document.createElement("script");
        s.src = src;
        s.onload = function () { ok(); };
        s.onerror = function () { delete loaded[src]; fail(new Error("Không tải được bộ đọc bill.")); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  // psm "11" = dò chữ rải rác khắp ảnh (không bỏ qua thanh tiêu đề màu như chế độ trang mặc định)
  function worker(lang, psm) {
    const key = lang + (psm || "");
    if (!workers[key]) {
      workers[key] = loadScript(TESS).then(async function () {
        const w = await window.Tesseract.createWorker(lang, 1);
        if (psm) await w.setParameters({ tessedit_pageseg_mode: psm });
        return w;
      });
      workers[key].catch(function () { delete workers[key]; });
    }
    return workers[key];
  }

  function loadImage(file) {
    return new Promise(function (ok, fail) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error("Không mở được ảnh.")); };
      img.src = url;
    });
  }

  // Ảnh → canvas xám rộng ~1100px (ảnh nhỏ phóng tối đa 2.5 lần), cắt bớt khoảng trắng thừa phía dưới
  //   + bản đen/trắng theo vùng: vùng chữ sáng trên nền tối/màu (tiêu đề màu, chế độ tối) đảo màu trước, rồi chia đen/trắng
  //   theo nền xung quanh → chữ trắng trên nền màu ("thành công", số tiền) thành chữ đen nền trắng, giữ nét.
  function prepare(source, w, h) {
    const scale = Math.min(2.5, 1100 / w);
    const W = Math.round(w * scale);
    let H = Math.round(h * scale);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const g = new Uint8ClampedArray(W * H);
    for (let i = 0, p = 0; p < g.length; i += 4, p++) {
      g[p] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
    }
    // bỏ các hàng trống đồng màu ở đáy (ảnh chụp dài)
    let last = H - 1;
    for (; last > 0; last--) {
      const row = last * W;
      let mn = 255, mx = 0;
      for (let x = 0; x < W; x += 2) { const v = g[row + x]; if (v < mn) mn = v; if (v > mx) mx = v; }
      if (mx - mn > 25) break;
    }
    H = Math.min(H, last + 40);

    const gray = document.createElement("canvas");
    gray.width = W;
    gray.height = H;
    const gimg = gray.getContext("2d").createImageData(W, H);
    for (let p = 0; p < W * H; p++) {
      gimg.data[p * 4] = gimg.data[p * 4 + 1] = gimg.data[p * 4 + 2] = g[p];
      gimg.data[p * 4 + 3] = 255;
    }
    gray.getContext("2d").putImageData(gimg, 0, 0);

    // ảnh tích phân → tổng cửa sổ nhanh
    function integral(src, pow) {
      const S = new Float64Array((W + 1) * (H + 1));
      for (let y = 0; y < H; y++) {
        let rs = 0;
        for (let x = 0; x < W; x++) {
          const v = src[y * W + x];
          rs += pow === 3 ? v * v * v : pow === 2 ? v * v : v;
          S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + rs;
        }
      }
      return function (x, y, r) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
        return (S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0]) / ((y1 - y0) * (x1 - x0));
      };
    }
    // Nền = màu chiếm đa số trong vùng (~80px), chữ = phần thiểu số. Độ lệch (moment bậc 3) > 0 → phần thiểu số sáng hơn
    //   (chữ sáng trên nền tối/màu). Điểm là chữ khi khác hẳn trung bình vùng THEO ĐÚNG CHIỀU đó → đen, còn lại trắng.
    //   Không đảo màu từng điểm nên chỗ giáp vùng không sinh viền giả; không phụ thuộc nền sáng/tối/màu trung bình.
    const m1 = integral(g, 1), m2 = integral(g, 2), m3 = integral(g, 3);
    const norm = document.createElement("canvas");
    norm.width = W;
    norm.height = H;
    const nimg = norm.getContext("2d").createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const a = m1(x, y, 40), b = m2(x, y, 40), c = m3(x, y, 40);
      const skew = c - 3 * a * b + 2 * a * a * a;
      const sd = Math.sqrt(Math.max(0, b - a * a));
      const k = Math.max(15, sd * 0.35);
      const ink = skew > 0 ? g[p] > a + k : g[p] < a - k;
      const v = ink ? 0 : 255;
      nimg.data[p * 4] = nimg.data[p * 4 + 1] = nimg.data[p * 4 + 2] = v;
      nimg.data[p * 4 + 3] = 255;
    }
    norm.getContext("2d").putImageData(nimg, 0, 0);
    return { gray: gray, norm: norm };
  }

  async function ocrCanvases(v, say) {
    say("Đang đọc bill (lần đầu tải bộ đọc chữ, khoảng 10–20 giây)…");
    const vie = await worker("vie");
    const a = await vie.recognize(v.gray);
    say("Đang kiểm tra số tiền, nội dung chuyển khoản…");
    const b = await (await worker("vie", "11")).recognize(v.norm);
    const c = await (await worker("eng")).recognize(v.gray);
    const d = await (await worker("eng", "11")).recognize(v.norm);
    return [a.data.text, b.data.text, c.data.text, d.data.text].map(function (x) { return String(x || ""); }).join("\n--- ---\n");
  }

  async function readPdf(file, say) {
    say("Đang đọc biên lai PDF…");
    await loadScript(PDFJS);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      let line = "";
      let lastY = null;
      tc.items.forEach(function (it) {
        const y = it.transform ? Math.round(it.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) { text += line + "\n"; line = ""; }
        line += (line && !/\s$/.test(line) ? " " : "") + it.str;
        lastY = y;
      });
      text += line + "\n";
    }
    if (text.replace(/\s/g, "").length >= 40) return text;
    // PDF dạng ảnh scan → đọc ảnh trang 1
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 2 });
    const c = document.createElement("canvas");
    c.width = vp.width;
    c.height = vp.height;
    await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    return text + "\n" + await ocrCanvases(prepare(c, c.width, c.height), say);
  }

  async function readNow(file, say) {
    if (/pdf/i.test(file.type || "") || /\.pdf$/i.test(file.name || "")) return readPdf(file, say);
    const img = await loadImage(file);
    return ocrCanvases(prepare(img, img.naturalWidth, img.naturalHeight), say);
  }

  async function read(file, progress) {
    const say = progress || function () {};
    if (!file) return "";
    try {
      return await Promise.race([
        readNow(file, say),
        new Promise(function (ok) { setTimeout(function () { ok(""); }, 75000); })
      ]);
    } catch (e) {
      console.warn("BILL OCR:", e);
      return "";
    }
  }

  window.PDBillOcr = { read: read };
})();
