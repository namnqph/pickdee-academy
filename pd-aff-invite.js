// pd-aff-invite.js — khối mời khách vừa mua vợt thành Cộng tác viên PickDee.
// Dùng ở: shop-checkout.html (màn "Đặt hàng thành công"), shop-track.html (trang theo dõi đơn),
// shop-product.html (cuối trang vợt — CÔNG KHAI, ai cũng đọc được).
// Chỉ hiện với đơn CÓ VỢT.
// 18/11/2026 anh Nam chốt: KHỐI NÀY KHÔNG ĐƯỢC NÊU SỐ TIỀN HOA HỒNG. Khách được bạn bè
// giới thiệu mà đọc thấy "250.000đ" sẽ hiểu là bạn mình ăn tiền trên đầu mình → chạnh lòng,
// không mua nữa. Số tiền chỉ nằm ở /cong-tac-vien, sau một cú bấm, và trang đó đã noindex.
// Khách đến từ mã của CTV khác thì KHÔNG hiện khối này (cờ `referred` của aff_prefill_order).

(function (global) {
  "use strict";

  var STYLE_ID = "pdAffInviteCss";

  /* Link CTV `?ref=MÃ` đổ về TRANG VỢT — trang này không nạp support-widget.js nên
     trước 18/11/2026 mã bị rơi và khách phải tự gõ lại ở bước thanh toán. Nhớ 30 ngày,
     cùng khoá `pickdee_aff_ref` mà shop-checkout.html đọc. */
  try {
    var qref = new URLSearchParams(location.search).get("ref");
    if (qref && /^[A-Za-z0-9-]{3,20}$/.test(qref)) {
      localStorage.setItem(
        "pickdee_aff_ref",
        JSON.stringify({ code: qref.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), ts: Date.now() })
      );
    }
  } catch (_) {}

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      ".pd-aff-invite{width:100%;max-width:420px;margin:18px auto 56px;padding:16px;border-radius:18px;text-align:left;" +
        "background:linear-gradient(135deg,#141208 0%,#0d0d0d 60%,#191405 100%);border:1px solid rgba(255,201,52,.34);box-shadow:0 12px 28px rgba(0,0,0,.32)}" +
      ".pd-aff-invite__top{display:flex;align-items:center;gap:9px;margin-bottom:9px}" +
      ".pd-aff-invite__ico{flex:0 0 32px;width:32px;height:32px;border-radius:10px;background:#ffc934;display:flex;align-items:center;justify-content:center}" +
      ".pd-aff-invite__ico svg{width:19px;height:19px;display:block}" +
      ".pd-aff-invite__title{margin:0;font-size:15px;font-weight:900;color:#fff;line-height:1.25;letter-spacing:.01em}" +
      ".pd-aff-invite__money{margin:0 0 7px;font-size:13.5px;font-weight:800;color:#ffc934;line-height:1.5}" +
      ".pd-aff-invite__text{margin:0;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.72);line-height:1.6}" +
      ".pd-aff-invite__btn{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;min-height:46px;margin-top:12px;padding:0 14px;" +
        "border-radius:13px;background:#ffc934;color:#0b0b0b;font-size:13.5px;font-weight:900;letter-spacing:.02em;text-decoration:none;" +
        "transition:transform .18s cubic-bezier(.23,1,.32,1),box-shadow .18s ease-out}" +
      ".pd-aff-invite__btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(255,201,52,.26)}" +
      ".pd-aff-invite__btn:active{transform:translateY(0)}" +
      ".pd-aff-invite__note{margin:9px 0 0;font-size:11.5px;font-weight:600;color:rgba(255,255,255,.5);line-height:1.5}" +
      "@media(min-width:900px){.pd-aff-invite{max-width:560px;padding:20px 22px}.pd-aff-invite__title{font-size:16.5px}" +
        ".pd-aff-invite__money{font-size:14.5px}.pd-aff-invite__text{font-size:13px}}" +
      "@media(prefers-reduced-motion:reduce){.pd-aff-invite__btn{transition:none}.pd-aff-invite__btn:hover{transform:none}}";
    document.head.appendChild(st);
  }

  /* token = public_tracking_token của đơn (để /cong-tac-vien điền sẵn tên + SĐT). */
  function cardHtml(token, opts) {
    var o = opts || {};
    injectStyle();
    var href = "/cong-tac-vien" + (token ? "?order=" + encodeURIComponent(token) : "");
    var lead = o.lead || "Anh/chị vừa mua vợt — giới thiệu lại cho hội chơi cùng.";
    return (
      '<div class="pd-aff-invite">' +
        '<div class="pd-aff-invite__top">' +
          '<span class="pd-aff-invite__ico" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' +
              '<path d="M19 8v6M22 11h-6"/>' +
            "</svg>" +
          "</span>" +
          '<h3 class="pd-aff-invite__title">Giới thiệu người quen mua vợt</h3>' +
        "</div>" +
        '<p class="pd-aff-invite__money">Mã riêng của anh/chị giảm 50.000đ/cây vợt cho người quen (vẫn miễn phí vận chuyển) — anh/chị còn được PickDee gửi thưởng sau khi họ nhận hàng.</p>' +
        '<p class="pd-aff-invite__text">' + esc(lead) + " PickDee cấp mã + link riêng, người quen đặt vợt bằng link đó là anh/chị được ghi nhận. " +
          "Không ôm hàng, không cần vốn, không phải giao hàng.</p>" +
        '<a class="pd-aff-invite__btn" href="' + esc(href) + '">XEM MỨC THƯỞNG VÀ LẤY LINK</a>' +
        '<p class="pd-aff-invite__note">Đăng ký miễn phí' +
          (token ? ", tên và số điện thoại đã điền sẵn theo đơn này" : "") +
          " — chỉ cần thêm số tài khoản nhận tiền.</p>" +
      "</div>"
    );
  }

  function mount(host, token, opts) {
    var el = typeof host === "string" ? document.getElementById(host) : host;
    if (!el) return null;
    injectStyle();
    el.innerHTML = cardHtml(token, opts);
    return el;
  }

  global.pdAffInvite = { cardHtml: cardHtml, mount: mount, injectStyle: injectStyle };
})(window);
