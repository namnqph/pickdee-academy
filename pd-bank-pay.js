/* PickDee — chuyển khoản không phải gõ tay (24/11, anh Nam).
   Mã QR VietQR đã chứa SẴN số tiền + nội dung. Khách đặt trên điện thoại không quét được QR
   trên chính máy mình → nút "Lưu ảnh QR" + mở app ngân hàng → Quét QR → chọn ảnh → app TỰ ĐIỀN.
   Lưu ý trung thực: link mở app (dl.vietqr.io) CHỈ mở app, không tự điền — tự điền là nhờ QR.
   Dùng: pdBankPay.html({ qrSelector: "#paddleQr", fileName: "PD000207" }) chèn sau ảnh QR. */
(function () {
  if (window.pdBankPay) return;

  const BANKS = [
    ["vcb", "Vietcombank"], ["tcb", "Techcombank"], ["mb", "MB Bank"], ["bidv", "BIDV"],
    ["icb", "VietinBank"], ["vba", "Agribank"], ["acb", "ACB"], ["tpb", "TPBank"], ["vpb", "VPBank"]
  ];
  const MORE = [
    ["shb", "SHB"], ["hdb", "HDBank"], ["vib-2", "VIB"], ["ocb", "OCB"], ["lpb", "LPBank"],
    ["seab", "SeABank"], ["scb", "SCB"], ["eib", "Eximbank"], ["cake", "Cake"],
    ["timo", "Timo"], ["abb", "ABBank"], ["ncb", "NCB"], ["mbv", "MBV"], ["shbvn", "Shinhan"]
  ];

  const css = `
.pdbp{margin:12px 0 4px;border:1.5px solid #111;border-radius:14px;padding:12px;background:#fff;text-align:left}
.pdbp-t{font-weight:800;font-size:14px;margin:0 0 8px;color:#111}
.pdbp-steps{margin:0 0 10px;padding-left:20px;font-size:13px;line-height:1.5;color:#222}
.pdbp-steps b{color:#111}
.pdbp-save{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;border:0;border-radius:12px;background:#ffc934;color:#111;font-family:inherit;font-size:15px;font-weight:800;line-height:1.2;cursor:pointer;transition:transform .12s ease-out}
.pdbp-save:active{transform:scale(.97)}
.pdbp-save svg{width:18px;height:18px}
.pdbp-sub{font-size:12px;color:#555;margin:10px 0 6px}
.pdbp-banks{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pdbp-banks a{display:flex;align-items:center;justify-content:center;min-height:38px;border:1px solid #d6d6d6;border-radius:10px;font-size:12.5px;font-weight:700;color:#111;text-decoration:none;background:#fafafa}
.pdbp-banks a:active{background:#ffc934}
.pdbp details{margin-top:6px}
.pdbp summary{font-size:12.5px;color:#111;cursor:pointer;padding:4px 0}
.pdbp-note{font-size:12px;color:#444;margin-top:8px;line-height:1.45}
.pdbp-desk{display:none;font-size:13px;color:#222;margin-top:8px}
@media (hover:hover) and (pointer:fine) and (min-width:900px){.pdbp-mob{display:none}.pdbp-desk{display:block}.pdbp{padding:10px 12px}}
`;
  function addCss() {
    if (document.getElementById("pdBankPayCss")) return;
    const s = document.createElement("style");
    s.id = "pdBankPayCss"; s.textContent = css;
    document.head.appendChild(s);
  }

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const link = ([id, name]) => `<a href="https://dl.vietqr.io/pay?app=${encodeURIComponent(id)}" rel="noopener">${esc(name)}</a>`;

  function html(opts) {
    addCss();
    const o = opts || {};
    return `
<div class="pdbp" data-pdbp-qr="${esc(o.qrSelector || ".bank-qr")}" data-pdbp-name="${esc(o.fileName || "PickDee-QR")}">
  <div class="pdbp-mob">
    <div class="pdbp-t">Đặt bằng điện thoại? KHÔNG cần gõ số tiền</div>
    <ol class="pdbp-steps">
      <li>Bấm <b>Lưu ảnh QR</b> bên dưới.</li>
      <li>Mở app ngân hàng → <b>Quét QR</b> → chọn <b>ảnh</b> vừa lưu.</li>
      <li>App tự điền <b>số tiền + nội dung</b> → anh/chị chỉ việc <b>xác nhận</b>.</li>
    </ol>
    <button type="button" class="pdbp-save" data-pdbp-save>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
      Lưu ảnh QR
    </button>
    <div class="pdbp-sub">Mở nhanh app ngân hàng của anh/chị:</div>
    <div class="pdbp-banks">${BANKS.map(link).join("")}</div>
    <details><summary>Ngân hàng khác</summary><div class="pdbp-banks" style="margin-top:6px">${MORE.map(link).join("")}</div></details>
    <div class="pdbp-note">Nếu app không cho chọn ảnh: chụp màn hình mã QR rồi chọn ảnh đó. Số tiền trong app phải đúng như trên trang này — <b>không tự sửa</b>; lệch thì gọi 0926 629 966.</div>
  </div>
  <div class="pdbp-desk">Dùng app ngân hàng trên điện thoại <b>quét mã QR</b> — số tiền và nội dung tự điền, không cần gõ.</div>
</div>`;
  }

  function loadPng(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const w = Math.max((img.naturalWidth || 0) * 2, 800), h = Math.round(w * ((img.naturalHeight || 1) / (img.naturalWidth || 1)));
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const g = c.getContext("2d");
          g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
          g.drawImage(img, 0, 0, w, h);
          c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png");
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error("load"));
      // img.vietqr.io: .png trả 301 sang .svg KHÔNG kèm CORS → gọi thẳng .svg (có CORS) để vẽ ra PNG.
      img.src = /img\.vietqr\.io\//.test(url) ? url.replace(/\.png(\?|$)/, ".svg$1") : url;
    });
  }

  async function save(btn) {
    const box = btn.closest(".pdbp");
    const sel = box?.getAttribute("data-pdbp-qr") || ".bank-qr";
    const qr = document.querySelector(sel) || box?.parentElement?.querySelector(".bank-qr");
    const url = qr?.currentSrc || qr?.src;
    if (!url) return;
    const name = (box?.getAttribute("data-pdbp-name") || "PickDee-QR").replace(/[^A-Za-z0-9_-]/g, "") + ".png";
    const old = btn.innerHTML;
    btn.disabled = true; btn.textContent = "Đang tạo ảnh…";
    try {
      const blob = await loadPng(url);
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Mã QR chuyển khoản PickDee" }); }
        catch (e) { if (e && e.name === "AbortError") return; throw e; }
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      btn.textContent = "Đã lưu — mở app ngân hàng để quét";
      setTimeout(() => { btn.innerHTML = old; btn.disabled = false; }, 3500);
      return;
    } catch (_) {
      // Không tạo được ảnh → mở ảnh QR để khách giữ ngón tay lưu.
      window.open(url, "_blank", "noopener");
    } finally {
      if (btn.disabled && btn.textContent === "Đang tạo ảnh…") { btn.innerHTML = old; btn.disabled = false; }
    }
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-pdbp-save]");
    if (b) { e.preventDefault(); save(b); }
  });

  window.pdBankPay = { html };
})();
