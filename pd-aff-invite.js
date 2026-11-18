// pd-aff-invite.js — khối mời khách vừa mua vợt thành Cộng tác viên PickDee.
// Dùng ở: shop-checkout.html (màn "Đặt hàng thành công"), shop-track.html (trang theo dõi đơn).
// Chỉ hiện với đơn CÓ VỢT. Số tiền trong khối này phải khớp chính sách /cong-tac-vien:
//   250.000đ/cây (MVP Pro 200.000đ) · từ 5 cây trong tháng cộng thêm 50.000đ/cây
//   · tính sau khi khách nhận hàng 7 ngày
//   · chuyển ngày 5 tháng sau · khách nhập mã được giảm 50.000đ cho cây vợt đầu tiên.

(function (global) {
  "use strict";

  var STYLE_ID = "pdAffInviteCss";

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
    var lead = o.lead || "Anh/chị vừa mua vợt — giới thiệu lại là có tiền về.";
    return (
      '<div class="pd-aff-invite">' +
        '<div class="pd-aff-invite__top">' +
          '<span class="pd-aff-invite__ico" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#0b0b0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' +
              '<path d="M19 8v6M22 11h-6"/>' +
            "</svg>" +
          "</span>" +
          '<h3 class="pd-aff-invite__title">Thành cộng tác viên PickDee</h3>' +
        "</div>" +
        '<p class="pd-aff-invite__money">250.000đ mỗi cây vợt anh/chị giới thiệu (MVP Pro 200.000đ) · từ 5 cây trong tháng cộng thêm 50.000đ/cây.</p>' +
        '<p class="pd-aff-invite__text">' + esc(lead) + " PickDee cấp mã + link riêng; người anh/chị giới thiệu nhập mã được giảm 50.000đ cho cây vợt đầu tiên. " +
          "Hoa hồng tính sau khi khách nhận hàng 7 ngày và chuyển vào ngày 5 tháng sau.</p>" +
        '<a class="pd-aff-invite__btn" href="' + esc(href) + '">LẤY LINK GIỚI THIỆU CỦA TÔI</a>' +
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
