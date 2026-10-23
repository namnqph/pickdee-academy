/* pd-onboard.js v2 - PickDee smart "Bước tiếp theo" guide */
(function () {
  'use strict';

  var STORE = 'pd_onboard_v2';

  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function saveStore(obj) { localStorage.setItem(STORE, JSON.stringify(obj)); }

  function getText(id) {
    var el = document.getElementById(id);
    return el ? (el.textContent || '').trim() : '';
  }
  function isLoading(s) {
    return !s || s === 'Đang tải...' || s === '—' || s === '-' || s === '';
  }

  /* ─── STUDENT: detect step ─────────────────────────── */

  function detectStudentStep() {
    var pkg       = getText('dashboardPackageName');
    var coach     = getText('dashboardCoachName');
    var nextSess  = getText('dashboardNextSession');
    var payStatus = getText('dashboardPaymentStatus');
    var reqCount  = parseInt(getText('studentRequestCount') || '0', 10);

    if (isLoading(pkg)) return null;

    if (pkg.indexOf('Chưa có gói') !== -1) {
      return { step: 1, icon: '📝', title: 'Bắt đầu hành trình pickleball của bạn',
        msg: 'Đăng ký gói học để PickDee ghép Coach phù hợp — không cần tự tìm.',
        cta: 'Đăng ký học ngay', href: './student-register', accent: '#ffc934' };
    }
    if (payStatus && payStatus.indexOf('Chưa thanh toán') !== -1) {
      return { step: 2, icon: '💳', title: 'Thanh toán học phí để bắt đầu',
        msg: 'Gói học đã đăng ký. Quét QR + tải bill → xác nhận tự động. Sau đó PickDee ghép Coach trong vài phút.',
        cta: 'Thanh toán ngay', href: './student-payment-checkout', accent: '#ffc934' };
    }
    if (coach.indexOf('Chưa có Coach') !== -1 || coach.indexOf('Chưa phân công') !== -1) {
      return { step: 3, icon: '⏳', title: 'PickDee đang ghép Coach cho bạn',
        msg: 'Học phí đã xác nhận. PickDee đang tìm Coach theo khu vực và lịch bạn đã chọn. Thường chỉ vài phút — bật thông báo để nhận ngay.',
        cta: null, accent: '#60b8ff' };
    }
    if (nextSess.indexOf('Chưa') !== -1) {
      if (reqCount > 0) {
        return { step: 4, icon: '📋', title: reqCount + ' yêu cầu đang chờ Coach xác nhận',
          msg: 'Coach chưa duyệt lịch. Kiểm tra trạng thái và chờ thông báo.',
          cta: 'Xem yêu cầu của tôi', href: './student-session-requests', accent: '#60b8ff' };
      }
      return { step: 4, icon: '🏓', title: 'Coach đã sẵn sàng — Đặt buổi học đầu tiên!',
        msg: 'Coach ' + coach + ' đang chờ bạn. Chọn ngày, giờ và khu vực.',
        cta: 'Đặt buổi học ngay', href: './student-book-session', accent: '#ffc934' };
    }
    return { step: 5, icon: '✅', title: 'Bạn đang học tốt!',
      msg: 'Buổi học tiếp theo đã được xếp lịch. Nhớ báo trước ít nhất 12 tiếng nếu cần nghỉ hoặc đổi buổi.',
      cta: 'Xem lịch học', href: './student-sessions', accent: '#4dff9e', dismissable: true };
  }

  /* ─── STUDENT: render banner ──────────────────────── */

  function renderStudentBanner(state) {
    if (!state) return;
    var s = loadStore();
    if (state.dismissable && s['sv_done']) return;

    var existing = document.getElementById('pd-next-step');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'pd-next-step';
    wrap.style.cssText = [
      'position:relative',
      'margin:0 0 20px',
      'padding:18px 20px 16px',
      'border-radius:16px',
      'background:#181818',
      'border-left:4px solid ' + (state.accent || '#ffc934'),
      'border-top:1px solid rgba(255,255,255,.09)',
      'border-right:1px solid rgba(255,255,255,.09)',
      'border-bottom:1px solid rgba(255,255,255,.09)',
      'box-shadow:0 4px 20px rgba(0,0,0,.45)',
      'font-family:system-ui,-apple-system,Arial,sans-serif',
      'color:#fff',
    ].join(';');

    var ctaHtml = (state.cta && state.href)
      ? '<a href="' + state.href + '" style="display:inline-block;margin-top:12px;padding:10px 20px;border-radius:10px;background:' + state.accent + ';color:#111;font-size:14px;font-weight:900;text-decoration:none;">' + state.cta + ' →</a>'
      : '';

    wrap.innerHTML =
      '<div style="font-size:10px;font-weight:900;letter-spacing:1.2px;color:' + (state.accent || '#ffc934') + ';margin-bottom:10px;">BƯỚC TIẾP THEO</div>' +
      '<div style="display:flex;gap:13px;align-items:flex-start;">' +
        '<div style="font-size:26px;flex-shrink:0;line-height:1.2;">' + state.icon + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:16px;font-weight:900;margin-bottom:5px;line-height:1.3;">' + state.title + '</div>' +
          '<div style="color:rgba(255,255,255,.72);font-size:13px;line-height:1.6;">' + state.msg + '</div>' +
          ctaHtml +
        '</div>' +
      '</div>';

    if (state.dismissable) {
      var xBtn = document.createElement('button');
      xBtn.textContent = '×';
      xBtn.style.cssText = 'position:absolute;top:12px;right:14px;background:none;border:none;color:rgba(255,255,255,.38);cursor:pointer;font-size:20px;line-height:1;padding:2px 4px;';
      xBtn.onclick = function () {
        var st = loadStore(); st['sv_done'] = 1; saveStore(st);
        wrap.remove();
      };
      wrap.appendChild(xBtn);
    }

    var grid = document.querySelector('.dashboard-grid');
    if (grid) grid.parentNode.insertBefore(wrap, grid);
  }

  /* ─── COACH: detect checklist ─────────────────────── */

  function detectCoachChecklist() {
    var avatarImg         = document.getElementById('avatarImage');
    var avatarPlaceholder = document.getElementById('avatarPlaceholder');
    var hasAvatar = !!(
      avatarImg && avatarImg.src &&
      avatarImg.style.display !== 'none' &&
      avatarPlaceholder && avatarPlaceholder.style.display === 'none'
    );

    var sessionRate = getText('sessionRate');
    var hasProfile = !!(sessionRate && sessionRate !== '—' && !isLoading(sessionRate) && sessionRate.indexOf('Chưa') === -1);

    var notifOn = (typeof Notification !== 'undefined' && Notification.permission === 'granted');

    var studentCount  = parseInt(getText('studentCount')  || '0', 10);
    var overdueCount  = parseInt(getText('overdueCount')  || '0', 10);
    var upcomingCount = parseInt(getText('upcomingCount') || '0', 10);
    var workUnpaidTxt = getText('workUnpaid');
    var hasUnpaid     = !!(workUnpaidTxt && workUnpaidTxt !== '0đ' && !isLoading(workUnpaidTxt));

    var doneCount = 1 + (hasAvatar ? 1 : 0) + (hasProfile ? 1 : 0) + (notifOn ? 1 : 0);

    return {
      hasAvatar: hasAvatar, hasProfile: hasProfile, notifOn: notifOn,
      studentCount: studentCount, overdueCount: overdueCount, upcomingCount: upcomingCount,
      hasUnpaid: hasUnpaid, workUnpaidTxt: workUnpaidTxt,
      doneCount: doneCount, totalSteps: 4
    };
  }

  /* ─── COACH: render panel ─────────────────────────── */

  function renderCoachPanel(ch) {
    var existing = document.getElementById('pd-coach-onboard');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'pd-coach-onboard';
    wrap.style.cssText = [
      'margin:0 0 20px',
      'border-radius:16px',
      'background:#181818',
      'border:1px solid rgba(255,201,52,.28)',
      'box-shadow:0 4px 20px rgba(0,0,0,.45)',
      'font-family:system-ui,-apple-system,Arial,sans-serif',
      'color:#fff',
      'overflow:hidden',
    ].join(';');

    /* Alert strips */
    var strips = '';
    if (ch.overdueCount > 0) {
      strips += '<div style="padding:10px 18px;background:rgba(255,80,80,.15);border-bottom:1px solid rgba(255,80,80,.25);font-size:13px;font-weight:900;">' +
        '⚠️ ' + ch.overdueCount + ' buổi cần xử lý ngay <a href="./coach-sessions" style="color:#ffc934;margin-left:8px;">Xem ngay →</a></div>';
    } else if (ch.upcomingCount > 0) {
      strips += '<div style="padding:10px 18px;background:rgba(96,184,255,.1);border-bottom:1px solid rgba(96,184,255,.2);font-size:13px;">' +
        '📅 Bạn có <b>' + ch.upcomingCount + '</b> buổi dạy sắp tới <a href="./coach-sessions" style="color:#ffc934;margin-left:8px;">Xem lịch →</a></div>';
    }
    if (ch.hasUnpaid) {
      strips += '<div style="padding:10px 18px;background:rgba(77,255,158,.08);border-bottom:1px solid rgba(77,255,158,.15);font-size:13px;">' +
        '💰 Còn <b>' + ch.workUnpaidTxt + '</b> chưa được thanh toán <a href="./coach-my-work" style="color:#ffc934;margin-left:8px;">Xem công →</a></div>';
    }

    /* Progress header */
    var pct   = Math.round(ch.doneCount / ch.totalSteps * 100);
    var allDone = (ch.doneCount >= ch.totalSteps);
    var s = loadStore();
    var collapsed = !!s['coach_collapsed'];

    var header = document.createElement('div');
    header.style.cssText = 'padding:16px 18px 12px;cursor:pointer;user-select:none;';
    header.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:11px;font-weight:900;letter-spacing:1.2px;color:#ffc934;">' +
          (allDone ? '✅ HỒ SƠ HOÀN THIỆN' : 'ĐỂ BẮT ĐẦU NHẬN HỌC VIÊN VÀ KIẾM TIỀN') +
        '</span>' +
        '<span id="pd-coach-toggle" style="font-size:12px;color:rgba(255,255,255,.42);">' + (collapsed ? 'Mở rộng ↓' : 'Thu gọn ↑') + '</span>' +
      '</div>' +
      '<div style="margin-top:8px;height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;">' +
        '<div style="height:100%;width:' + pct + '%;border-radius:3px;background:#ffc934;transition:width .4s;"></div>' +
      '</div>' +
      '<div style="margin-top:5px;font-size:12px;color:rgba(255,255,255,.5);">' +
        ch.doneCount + '/' + ch.totalSteps + ' bước' +
        (allDone ? ' hoàn thành — PickDee đang ghép học viên cho bạn!' : ' — Hoàn thành để PickDee bắt đầu ghép học viên') +
      '</div>';

    /* Body */
    var body = document.createElement('div');
    body.id = 'pd-coach-body';
    body.style.display = collapsed ? 'none' : 'block';

    function makeItem(done, label, detail, href, ctaLabel, isNotif) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;align-items:flex-start;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.06);';
      var icon = document.createElement('span');
      icon.style.cssText = 'font-size:16px;flex-shrink:0;margin-top:1px;';
      icon.textContent = done ? '✅' : '⬜';
      var text = document.createElement('div');
      text.style.cssText = 'flex:1;min-width:0;';
      text.innerHTML =
        '<div style="font-size:14px;font-weight:' + (done ? '600' : '900') + ';color:' + (done ? 'rgba(255,255,255,.5)' : '#fff') + ';line-height:1.3;">' + label + '</div>' +
        (detail ? '<div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:2px;line-height:1.45;">' + detail + '</div>' : '');
      row.appendChild(icon);
      row.appendChild(text);
      if (!done && ctaLabel) {
        var btn = document.createElement(href ? 'a' : 'button');
        btn.textContent = ctaLabel;
        btn.style.cssText = 'flex-shrink:0;border-radius:7px;background:#ffc934;color:#111;font-size:12px;font-weight:900;padding:6px 12px;text-decoration:none;border:0;cursor:pointer;white-space:nowrap;align-self:center;';
        if (href) { btn.href = href; }
        if (isNotif) {
          btn.onclick = function () {
            Notification.requestPermission().then(function (p) {
              if (p === 'granted') {
                icon.textContent = '✅';
                text.querySelector('div').style.color = 'rgba(255,255,255,.5)';
                text.querySelector('div').style.fontWeight = '600';
                btn.remove();
                /* re-render to update progress bar */
                setTimeout(function () {
                  var updated = detectCoachChecklist();
                  renderCoachPanel(updated);
                }, 300);
              }
            });
          };
        }
        row.appendChild(btn);
      }
      return row;
    }

    body.appendChild(makeItem(true,          'Hồ sơ được PickDee duyệt',                       null,                              null,           null,                 false));
    body.appendChild(makeItem(ch.hasAvatar,  'Thêm ảnh đại diện',                              'Học viên xem ảnh khi tìm Coach',  './coach#ho-so','Cập nhật ảnh →',     false));
    body.appendChild(makeItem(ch.hasProfile, 'Điền giới thiệu, sân dạy và ngày dạy',           'Hồ sơ đầy đủ = hiện trên bản đồ "Gần bạn"', './coach#ho-so', 'Cập nhật hồ sơ →', false));
    body.appendChild(makeItem(ch.notifOn,    'Bật thông báo',                                  'Nhận ngay khi có học viên mới và yêu cầu đặt lịch', null, 'Bật thông báo', true));

    /* Earning note */
    var note = document.createElement('div');
    note.style.cssText = 'padding:12px 18px 14px;font-size:12px;color:rgba(255,255,255,.5);line-height:1.6;border-top:1px solid rgba(255,255,255,.07);';
    note.innerHTML = '💰 <b style="color:#ffc934;">Cách kiếm tiền:</b> Dạy buổi nào → PickDee ghi công buổi đó → thanh toán theo kỳ lương. Xem chi tiết trong <a href="./coach-my-work" style="color:#ffc934;">Công của tôi</a>.';
    body.appendChild(note);

    /* Toggle collapse */
    header.onclick = function () {
      var isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      var tog = document.getElementById('pd-coach-toggle');
      if (tog) tog.textContent = isHidden ? 'Thu gọn ↑' : 'Mở rộng ↓';
      var st = loadStore(); st['coach_collapsed'] = !isHidden; saveStore(st);
    };

    wrap.innerHTML = strips;
    wrap.appendChild(header);
    wrap.appendChild(body);

    var grid = document.querySelector('.dashboard-grid');
    if (grid) grid.parentNode.insertBefore(wrap, grid);
  }

  /* ─── PUBLIC ───────────────────────────────────────── */

  function poll(detectFn, renderFn, readyFn) {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      if (readyFn()) {
        clearInterval(t);
        var data = detectFn();
        if (data) renderFn(data);
      }
      if (tries > 20) clearInterval(t);
    }, 400);
  }

  window.pdOnboard = {
    studentDash: function () {
      poll(
        detectStudentStep,
        renderStudentBanner,
        function () {
          var pkg = getText('dashboardPackageName');
          return !!(pkg && pkg !== 'Đang tải...');
        }
      );
    },
    coachDash: function () {
      poll(
        detectCoachChecklist,
        renderCoachPanel,
        function () {
          var name = getText('coachIdentityName') || getText('coachName');
          return !!(name && name !== 'Đang tải Coach...' && name !== '—');
        }
      );
    }
  };
})();
