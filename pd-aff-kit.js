/* =========================================================
   PICKDEE - BỘ BÁN HỘ CHO CỘNG TÁC VIÊN (pd-aff-kit.js)
   Nạp ở /cong-tac-vien, dựng sau khi aff_dashboard trả về.
   Gồm: ảnh QR mời khách (tải được), ảnh sản phẩm tải được,
   link có video review, 5 câu khách hay hỏi (có nút sao chép).
   0 đồng: QR vẽ bằng qrcode-generator (CDN), ảnh lấy từ
   Storage công khai, không gọi dịch vụ trả tiền nào.
========================================================= */

(function () {
  "use strict";

  var QR_LIB = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";

  /* Chữ bán hàng theo từng cây vợt. Chỉ ghi đúng chính sách
     đang chạy (giá lấy từ DB, quà lấy đúng danh sách prod). */
  var COPY = {
    "vot-ess-on-pickleball": {
      short: "VỢT ESS/ON STRIKE ON",
      photo: 0,
      lines: ["Tặng áo chính hãng ESS/ON", "Freeship toàn quốc", "Bảo hành 3 tháng lỗi NSX"]
    },
    "vot-ess-on-mvp-pro": {
      short: "VỢT ESS/ON MVP PRO",
      photo: 5,
      lines: ["Đặt trước · giao từ 28/11", "Tặng áo + khăn + quấn cán + dán viền", "Cọc 70% hoặc trả 100%"]
    }
  };

  var FAQ = [
    {
      q: "Mua vợt có được thử trước không? Nhận hàng kiểm thế nào?",
      a: "Vợt không cho thử trước ạ. Khi shipper tới thì mình đồng kiểm: mở hộp xem đủ vợt + quà tặng, vợt không lỗi rồi hãy nhận. Bảo hành 3 tháng nếu lỗi từ nhà sản xuất."
    },
    {
      q: "Có giao hàng thu tiền hộ (COD) không?",
      a: "Vợt thì chuyển khoản trước ạ, không có COD. Bù lại được freeship toàn quốc. Đặt trên web xong mình đính ảnh chuyển khoản vào đơn là PickDee xử lý luôn."
    },
    {
      q: "Bao lâu nhận được vợt? Lấy trực tiếp ở Hà Nội được không?",
      a: "Hàng giao Hà Nội 1–2 ngày, các tỉnh khác 2–3 ngày ạ. Hiện không có hình thức tới lấy trực tiếp ở Hà Nội."
    },
    {
      q: "Chọn dáng Elongate hay Hybrid? Vợt nặng bao nhiêu?",
      a: "Elongate đầu dài: tầm với xa, lực đánh mạnh, hợp ai thích tấn công. Hybrid: nhanh, linh hoạt, đánh êm tay, dễ làm quen. Vợt 220–225g, cả 2 dáng đều hợp mọi trình độ nên chọn theo lối chơi mình thích."
    },
    {
      q: "Nhập mã của em để làm gì?",
      a: "Mã để PickDee biết đơn này do em giới thiệu, giá vợt giữ nguyên như niêm yết, mã không làm thay đổi tiền anh/chị phải trả. Nhập mã ở bước thanh toán, hoặc đặt qua link của em thì web tự điền. Mã ghi nhận cho khách lần đầu mua vợt tại PickDee."
    }
  ];

  var ESCALATE =
    "Khách hỏi nguồn gốc / chính hãng, xuất xứ hay khuyến mãi khác thì đừng tự trả lời. " +
    "Nhờ khách nhắn PickDee 0926 629 966 hoặc chat ngay trên pickdee.vn.";

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "đ";
  }

  function css() {
    if (document.getElementById("pdAffKitCss")) return;
    var s = document.createElement("style");
    s.id = "pdAffKitCss";
    s.textContent =
      ".pdk-sub{margin:0 0 12px;color:rgba(255,255,255,.6);font-size:13px;line-height:1.5}" +
      ".pdk-item{padding:12px 0;border-top:1px solid rgba(255,255,255,.07)}" +
      ".pdk-item:first-of-type{border-top:0;padding-top:0}" +
      ".pdk-name{margin:0 0 8px;font-size:14.5px;font-weight:900}" +
      ".pdk-meta{margin:0 0 10px;color:rgba(255,255,255,.62);font-size:13px;line-height:1.5}" +
      ".pdk-row{display:flex;flex-wrap:wrap;gap:8px}" +
      ".pdk-poster{display:block;width:100%;max-width:260px;margin:0 0 10px;border-radius:14px;background:#0f0f0f}" +
      ".pdk-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px;margin:0 0 10px}" +
      ".pdk-thumbs a{display:block;position:relative;border-radius:11px;overflow:hidden;background:#0f0f0f;aspect-ratio:1/1}" +
      ".pdk-thumbs img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".pdk-q{margin:0 0 6px;font-size:14.5px;font-weight:900;color:#ffc934}" +
      ".pdk-a{white-space:pre-wrap;font-size:14px;line-height:1.55;padding:11px 12px;border-radius:12px;background:#0f0f0f;color:rgba(255,255,255,.88);margin:0 0 9px}" +
      ".pdk-note{margin:12px 0 0;padding:11px 12px;border-radius:12px;background:rgba(255,190,60,.1);color:#ffd98a;font-size:13px;line-height:1.5}" +
      "@media (min-width:760px){.pdk-poster{max-width:300px}}";
    document.head.appendChild(s);
  }

  function copy(text, btn) {
    var old = btn.textContent;
    var done = function () {
      btn.textContent = "✓ Đã chép";
      setTimeout(function () { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt("Sao chép:", text); });
    else prompt("Sao chép:", text);
  }

  function loadQrLib() {
    if (window.qrcode) return Promise.resolve(true);
    if (window.__pdQrLoading) return window.__pdQrLoading;
    window.__pdQrLoading = new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = QR_LIB;
      s.async = true;
      s.onload = function () { resolve(!!window.qrcode); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return window.__pdQrLoading;
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  /* Vẽ chữ nhiều dòng, trả về y sau dòng cuối */
  function wrap(ctx, text, x, y, maxW, lineH) {
    var words = String(text).split(/\s+/);
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lineH; }
    return y;
  }

  /* Ảnh QR mời khách: 1080x1350, ảnh vợt + giá + mã + QR link riêng */
  async function poster(p, link, code) {
    var ok = await loadQrLib();
    if (!ok) return null;

    var W = 1080, H = 1350;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");

    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, W, H);

    /* Ảnh sản phẩm phía trên (nền mờ + ảnh vừa khung) */
    var pick = p.images[p.copy.photo] || p.images[0];
    var photo = pick ? await loadImage(pick.url) : null;
    var photoH = 620;
    if (photo) {
      /* Ảnh vừa khung trên nền đen (không nhân đôi ảnh làm nền mờ:
         ảnh banner có sẵn chữ sẽ bị nhoè chữ ra hai bên) */
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, photoH); ctx.clip();
      var r2 = Math.min(W / photo.width, photoH / photo.height);
      var fw = photo.width * r2, fh = photo.height * r2;
      ctx.drawImage(photo, (W - fw) / 2, (photoH - fh) / 2, fw, fh);
      ctx.restore();
      var g = ctx.createLinearGradient(0, photoH - 140, 0, photoH);
      g.addColorStop(0, "rgba(15,15,15,0)");
      g.addColorStop(1, "#0f0f0f");
      ctx.fillStyle = g;
      ctx.fillRect(0, photoH - 140, W, 140);
    }

    var y = photo ? photoH + 20 : 120;

    ctx.fillStyle = "#ffc934";
    ctx.font = '900 30px "Be Vietnam Pro", sans-serif';
    ctx.fillText("PICKDEE.VN", 80, y);
    y += 62;

    ctx.fillStyle = "#ffffff";
    ctx.font = '900 58px "Be Vietnam Pro", sans-serif';
    y = wrap(ctx, p.copy.short, 80, y, 580, 70);

    ctx.fillStyle = "#ffc934";
    ctx.font = '900 54px "Be Vietnam Pro", sans-serif';
    y += 10;
    ctx.fillText(money(p.price), 80, y);
    y += 50;

    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = '600 28px "Be Vietnam Pro", sans-serif';
    for (var i = 0; i < p.copy.lines.length; i++) {
      ctx.fillText("• " + p.copy.lines[i], 80, y);
      y += 40;
    }

    /* Khối mã giảm giá chảy tiếp theo chữ ở trên (không đặt cứng
       theo đáy, nếu không tên vợt 2 dòng sẽ đè lên) */
    y += 28;
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 34px "Be Vietnam Pro", sans-serif';
    ctx.fillText("QUÉT MÃ ĐỂ ĐẶT", 80, y);
    y += 56;
    ctx.fillStyle = "#ffc934";
    ctx.font = '900 42px "Be Vietnam Pro", sans-serif';
    ctx.fillText("MÃ " + code, 80, y);
    y += 42;
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = '600 26px "Be Vietnam Pro", sans-serif';
    ctx.fillText("hoặc nhập mã này khi thanh toán", 80, y);

    /* QR neo góc dưới phải, cột chữ trái rộng tối đa 600 nên không đè */
    var qr = window.qrcode(0, "M");
    qr.addData(link);
    qr.make();
    var n = qr.getModuleCount();
    /* Ô vuông phải là số nguyên pixel, nếu không viền ô lệch nhau
       và máy quét đọc không ra (đã dính với mã ngắn hơn) */
    var cell = Math.floor(300 / n);
    var box = cell * n, pad = 16;
    var qx = W - box - 80, qy = H - box - 110;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qx - pad, qy - pad, box + pad * 2, box + pad * 2);
    ctx.fillStyle = "#0f0f0f";
    for (var row = 0; row < n; row++) {
      for (var col = 0; col < n; col++) {
        if (qr.isDark(row, col)) ctx.fillRect(qx + col * cell, qy + row * cell, cell, cell);
      }
    }

    return cv;
  }

  function download(blobOrUrl, name) {
    var a = document.createElement("a");
    a.href = blobOrUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadUrl(url, name) {
    try {
      var res = await fetch(url);
      if (!res.ok) throw new Error("http " + res.status);
      var blob = await res.blob();
      var u = URL.createObjectURL(blob);
      download(u, name);
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      return true;
    } catch (_) {
      window.open(url, "_blank", "noopener");
      return false;
    }
  }

  async function fetchProducts(sb) {
    var pr = await sb
      .from("shop_products")
      .select("id,name,slug,review_video_id,status,product_group")
      .eq("status", "active")
      .eq("product_group", "paddles");
    var rows = (pr.data || []).filter(function (p) { return COPY[p.slug]; });
    if (!rows.length) return [];

    var ids = rows.map(function (p) { return p.id; });
    var res = await Promise.all([
      sb.from("shop_product_images").select("product_id,storage_path,sort_order").in("product_id", ids).order("sort_order", { ascending: true }),
      sb.from("shop_product_variants").select("product_id,price,is_active").in("product_id", ids).eq("is_active", true)
    ]);
    var imgs = res[0].data || [];
    var vars = res[1].data || [];

    return rows.map(function (p) {
      var pics = imgs.filter(function (i) { return i.product_id === p.id; }).map(function (i) {
        var full = sb.storage.from("shop-products").getPublicUrl(i.storage_path);
        var thumb = sb.storage.from("shop-products").getPublicUrl(i.storage_path, {
          transform: { width: 180, height: 180, resize: "cover", quality: 70 }
        });
        return {
          url: (full.data && full.data.publicUrl) || "",
          thumb: (thumb.data && thumb.data.publicUrl) || "",
          name: i.storage_path.split("/").pop()
        };
      }).filter(function (i) { return i.url; });

      var prices = vars.filter(function (v) { return v.product_id === p.id; }).map(function (v) { return Number(v.price); });
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        video: /^[0-9]{8,25}$/.test(String(p.review_video_id || "")) ? String(p.review_video_id) : "",
        price: prices.length ? Math.min.apply(null, prices) : 0,
        images: pics,
        copy: COPY[p.slug]
      };
    }).sort(function (a, b) { return a.id - b.id; });
  }

  async function render(opts) {
    var sb = window.sb;
    var mount = opts && opts.mount;
    if (!sb || !mount || !opts.code) return;

    css();
    var code = opts.code;
    var origin = location.origin;
    var products = [];
    try {
      products = await fetchProducts(sb);
    } catch (_) {
      products = [];
    }
    if (!products.length) return;

    products.forEach(function (p) {
      p.link = origin + "/shop-product?slug=" + encodeURIComponent(p.slug) + "&ref=" + encodeURIComponent(code);
    });

    var html = "";

    /* 1. Ảnh QR mời khách */
    html +=
      '<div class="card"><details id="pdkQr"><summary>Ảnh QR mời khách (tải về, đăng luôn)</summary>' +
      '<p class="pdk-sub">Ảnh đã có QR link riêng của anh/chị. Khách quét là vào đúng trang vợt và đơn tự gắn mã của anh/chị. Đăng Zalo, Facebook, dán ở sân đều được.</p>' +
      products.map(function (p, i) {
        return '<div class="pdk-item"><div class="pdk-name">' + esc(p.copy.short) + "</div>" +
          '<canvas class="pdk-poster" data-poster="' + i + '" width="1080" height="1350"></canvas>' +
          '<div class="pdk-row"><button class="btn sm" type="button" data-dlposter="' + i + '">Tải ảnh QR</button>' +
          '<button class="btn sm ghost" type="button" data-copytext="' + i + '">Sao chép link vợt này</button></div></div>';
      }).join("") +
      "</details></div>";

    /* 2. Ảnh sản phẩm */
    html +=
      '<div class="card"><details><summary>Ảnh sản phẩm để đăng bài</summary>' +
      '<p class="pdk-sub">Ảnh thật của PickDee, tải về đăng kèm bài. Bấm vào ảnh để xem cỡ lớn.</p>' +
      products.map(function (p, i) {
        return '<div class="pdk-item"><div class="pdk-name">' + esc(p.copy.short) + "</div>" +
          '<div class="pdk-thumbs">' + p.images.map(function (im) {
            return '<a href="' + esc(im.url) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(im.thumb) + '" alt="' + esc(p.copy.short) + '"></a>';
          }).join("") + "</div>" +
          '<div class="pdk-row"><button class="btn sm" type="button" data-dlimgs="' + i + '">Tải ' + p.images.length + " ảnh</button></div></div>";
      }).join("") +
      "</details></div>";

    /* 3. Video review */
    var MSG = [];
    var withVideo = products.filter(function (p) { return p.video; });
    if (withVideo.length) {
      html +=
        '<div class="card"><details><summary>Video review để gửi khách</summary>' +
        '<p class="pdk-sub">Link dưới đây mở trang vợt có sẵn video review thật, và vẫn tính đơn cho anh/chị. Gửi khách link này thay vì gửi video rời.</p>' +
        withVideo.map(function (p) {
          var i = products.indexOf(p);
          var mi = MSG.push("Video review " + p.copy.short + " đây ạ, xem xong còn thắc mắc gì cứ nhắn em:\n" + p.link) - 1;
          return '<div class="pdk-item"><div class="pdk-name">' + esc(p.copy.short) + "</div>" +
            '<div class="pdk-meta">' + esc(p.link) + "</div>" +
            '<div class="pdk-row"><button class="btn sm" type="button" data-copytext="' + i + '">Sao chép link</button>' +
            '<button class="btn sm ghost" type="button" data-copymsg="' + mi + '">Sao chép tin kèm link</button></div></div>';
        }).join("") +
        "</details></div>";
    }

    /* 4. 5 câu khách hay hỏi */
    html +=
      '<div class="card"><details><summary>5 câu khách hay hỏi · trả lời sẵn</summary>' +
      '<p class="pdk-sub">Trả lời đúng chính sách PickDee đang chạy. Bấm sao chép rồi gửi khách.</p>' +
      FAQ.map(function (f, i) {
        return '<div class="pdk-item"><div class="pdk-q">' + esc(f.q) + "</div>" +
          '<div class="pdk-a" id="pdkFaq' + i + '">' + esc(f.a) + "</div>" +
          '<button class="btn sm ghost" type="button" data-copyfaq="' + i + '">Sao chép câu trả lời</button></div>';
      }).join("") +
      '<div class="pdk-note">' + esc(ESCALATE) + "</div>" +
      "</details></div>";

    mount.innerHTML = html;

    /* Vẽ ảnh QR khi mở mục (canvas nặng, không vẽ sẵn) */
    var drawn = false;
    var qrBox = document.getElementById("pdkQr");
    var drawPosters = async function () {
      if (drawn) return;
      drawn = true;
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
      for (var i = 0; i < products.length; i++) {
        var cv = await poster(products[i], products[i].link, code);
        var target = mount.querySelector('canvas[data-poster="' + i + '"]');
        if (!target) continue;
        if (!cv) { target.remove(); continue; }
        products[i].canvas = cv;
        var c2 = target.getContext("2d");
        target.width = cv.width; target.height = cv.height;
        c2.drawImage(cv, 0, 0);
      }
    };
    if (qrBox) qrBox.addEventListener("toggle", function () { if (qrBox.open) drawPosters(); });

    mount.addEventListener("click", function (ev) {
      var t = ev.target.closest("button");
      if (!t) return;

      var raw = t.getAttribute("data-copymsg");
      if (raw != null) { copy(MSG[Number(raw)], t); return; }

      var faq = t.getAttribute("data-copyfaq");
      if (faq != null) { copy(FAQ[Number(faq)].a, t); return; }

      var ct = t.getAttribute("data-copytext");
      if (ct != null) { copy(products[Number(ct)].link, t); return; }

      var dp = t.getAttribute("data-dlposter");
      if (dp != null) {
        var p = products[Number(dp)];
        if (!p.canvas) { t.textContent = "Đang vẽ ảnh…"; drawPosters().then(function () { t.textContent = "Tải ảnh QR"; }); return; }
        p.canvas.toBlob(function (b) {
          if (!b) return;
          var u = URL.createObjectURL(b);
          download(u, "pickdee-" + p.slug + "-" + code + ".png");
          setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        }, "image/png");
        return;
      }

      var di = t.getAttribute("data-dlimgs");
      if (di != null) {
        var pp = products[Number(di)];
        t.disabled = true;
        var old = t.textContent;
        (async function () {
          for (var i = 0; i < pp.images.length; i++) {
            t.textContent = "Đang tải " + (i + 1) + "/" + pp.images.length + "…";
            await downloadUrl(pp.images[i].url, "pickdee-" + pp.slug + "-" + (i + 1) + "-" + pp.images[i].name);
            await new Promise(function (r) { setTimeout(r, 400); });
          }
          t.textContent = "✓ Đã tải " + pp.images.length + " ảnh";
          setTimeout(function () { t.textContent = old; t.disabled = false; }, 2000);
        })();
      }
    });
  }

  window.pdAffKit = { render: render };
})();
