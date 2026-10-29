/* PickDee — sheet "Gần bạn" (#pdaSheet) kéo được như app.
   Bám ngón 1:1 · thả ra chiếu quán tính tới mốc gần nhất (nửa / đầy) · spring tắt dần mang theo vận tốc ngón tay ·
   chạm lúc đang chạy thì bắt lại ngay · vượt mốc thì cản dần (rubber-band). Chạm không kéo vẫn bật/tắt như cũ (onclick của #pdaHandle). */
(function () {
  var sheet = document.getElementById("pdaSheet"), handle = document.getElementById("pdaHandle");
  if (!sheet || !handle || !window.PointerEvent) return;
  var head = sheet.querySelector(".pda-sheet-head");
  var zones = head ? [handle, head] : [handle];
  var RM = matchMedia("(prefers-reduced-motion: reduce)");
  var HALF = 0.52, FULL = 0.86;          /* khớp max-height trong CSS */
  var DECEL = 0.998, RESPONSE = 0.3;     /* quán tính cuộn chuẩn · spring damping 1.0, response 0.3s */
  var raf = 0, drag = null, suppress = false, programmatic = false;

  function detents() { var P = (sheet.offsetParent || sheet.parentElement).clientHeight; return { half: P * HALF, full: P * FULL, P: P }; }
  /* càng vượt xa mốc càng bị cản: thứ thật chậm dần rồi mới dừng */
  function rubber(over, dim) { return (over * dim * 0.55) / (dim + 0.55 * over); }

  function down(e) {
    if (e.button > 0 || e.target.closest("a,button")) return;
    var animating = raf !== 0;
    cancelAnimationFrame(raf); raf = 0;
    var D = detents();
    /* luôn bắt đầu từ giá trị đang hiện trên màn hình, không phải đích */
    var h = sheet.style.maxHeight ? parseFloat(sheet.style.maxHeight) : (sheet.classList.contains("full") ? D.full : D.half);
    drag = { id: e.pointerId, y0: e.clientY, h0: h, D: D, moved: false, animating: animating, pts: [[e.timeStamp, e.clientY]] };
    suppress = false;
    try { this.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = drag.y0 - e.clientY;
    if (!drag.moved) {
      if (Math.abs(dy) < 6) return;      /* ngưỡng ~6px mới coi là kéo */
      drag.moved = true;
      sheet.style.transition = "none";
    }
    drag.pts.push([e.timeStamp, e.clientY]);
    if (drag.pts.length > 6) drag.pts.shift();
    var D = drag.D, h = drag.h0 + dy;
    if (h > D.full) h = D.full + rubber(h - D.full, D.P - D.full);   /* tối đa chạm mép khung chứa */
    else if (h < D.half) h = D.half - rubber(D.half - h, D.half * 0.4);
    sheet.style.maxHeight = h + "px";
  }

  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    var x = parseFloat(sheet.style.maxHeight);
    if (!d.moved) {
      /* chạm để bắt sheet đang chạy: thả thì chạy tiếp tới mốc gần nhất */
      if (d.animating && !isNaN(x)) spring(x, nearest(x, d.D), 0);
      return;
    }
    suppress = true; setTimeout(function () { suppress = false; }, 400);   /* nuốt click sinh ra sau cú kéo */
    var p = d.pts, last = p[p.length - 1], first = last;
    for (var i = 0; i < p.length; i++) if (last[0] - p[i][0] <= 100) { first = p[i]; break; }
    var dt = last[0] - first[0];
    var v = dt > 0 ? (first[1] - last[1]) / dt * 1000 : 0;               /* px/s, dương = kéo lên */
    var projected = x + (v / 1000) * DECEL / (1 - DECEL);                 /* nơi sheet sẽ dừng nếu cứ trôi */
    spring(x, nearest(projected, d.D), v);
  }

  function nearest(h, D) { return h > (D.half + D.full) / 2 ? D.full : D.half; }

  /* spring damping 1.0: không nảy vì cú vuốt chỉ có một hướng, vận tốc ngón tay được trao thẳng vào */
  function spring(x, target, v) {
    if (RM.matches) { finish(target); return; }
    var k = Math.pow(2 * Math.PI / RESPONSE, 2), c = 2 * Math.sqrt(k), t0 = performance.now();
    function step(now) {
      var dt = Math.min((now - t0) / 1000, 0.032); t0 = now;
      var n = Math.max(1, Math.ceil(dt / 0.004)), s = dt / n;
      for (var i = 0; i < n; i++) { v += (-k * (x - target) - c * v) * s; x += v * s; }
      sheet.style.maxHeight = x + "px";
      if (Math.abs(x - target) < 0.4 && Math.abs(v) < 8) { finish(target); return; }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }

  /* trả quyền lại cho CSS; trạng thái "full" đổi qua onclick cũ để bản đồ/lưu trạng thái vẫn đúng */
  function finish(target) {
    raf = 0;
    var wantFull = target === detents().full;
    sheet.style.transition = "none";
    sheet.style.maxHeight = "";
    if (wantFull !== sheet.classList.contains("full")) { programmatic = true; handle.click(); programmatic = false; }
    void sheet.offsetHeight;
    sheet.style.transition = "";
  }

  zones.forEach(function (z) {
    z.style.touchAction = "none";
    z.addEventListener("pointerdown", down);
    z.addEventListener("pointermove", move);
    z.addEventListener("pointerup", up);
    z.addEventListener("pointercancel", up);
  });
  handle.addEventListener("click", function (e) {
    if (suppress && !programmatic) { e.stopImmediatePropagation(); e.preventDefault(); suppress = false; }
  }, true);
})();
