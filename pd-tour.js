/* pd-tour.js — PickDee onboarding tour engine v2 */
(function () {
  'use strict';

  var STORE = 'pd_tours_v1';

  function saved() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; }
  }
  function markDone(id) {
    var s = saved(); s[id] = 1;
    localStorage.setItem(STORE, JSON.stringify(s));
  }
  function isDone(id) { return !!saved()[id]; }

  var els = null;
  var fab = null;
  var tourId, steps, idx;

  /* ─ FAB "?" button ─────────────────────────────────── */

  function showFab(onClick) {
    if (fab) return;
    fab = document.createElement('button');
    fab.id = 'pd-tour-fab';
    fab.textContent = '?';
    fab.title = 'Hướng dẫn sử dụng';
    fab.setAttribute('style', [
      'position:fixed',
      'z-index:9980',
      'bottom:80px',
      'right:14px',
      'width:40px',
      'height:40px',
      'border-radius:50%',
      'background:rgba(24,24,24,.92)',
      'border:1.5px solid rgba(255,201,52,.55)',
      'color:#ffc934',
      'font-size:18px',
      'font-weight:900',
      'cursor:pointer',
      'box-shadow:0 2px 12px rgba(0,0,0,.5)',
      'font-family:system-ui,-apple-system,Arial,sans-serif',
      'transition:transform .15s,opacity .15s',
      'opacity:.72',
      'line-height:1',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';'));
    fab.onmouseenter = function () { fab.style.opacity = '1'; fab.style.transform = 'scale(1.1)'; };
    fab.onmouseleave = function () { fab.style.opacity = '.72'; fab.style.transform = ''; };
    fab.onclick = function () {
      hideFab();
      onClick();
    };
    document.body.appendChild(fab);
  }

  function hideFab() {
    if (fab) { fab.remove(); fab = null; }
  }

  /* ─ Tour overlay ────────────────────────────────────── */

  function mount() {
    if (els) return;
    var spot = document.createElement('div');
    spot.id = 'pd-tour-spot';
    spot.setAttribute('style', [
      'position:fixed',
      'z-index:99990',
      'pointer-events:none',
      'border-radius:12px',
      'transition:top .26s cubic-bezier(.4,0,.2,1),left .26s cubic-bezier(.4,0,.2,1),width .26s cubic-bezier(.4,0,.2,1),height .26s cubic-bezier(.4,0,.2,1)',
      'box-shadow:0 0 0 9999px rgba(0,0,0,.76)',
    ].join(';'));

    var card = document.createElement('div');
    card.id = 'pd-tour-card';
    card.setAttribute('style', [
      'position:fixed',
      'z-index:99991',
      'left:14px',
      'right:14px',
      'bottom:20px',
      'padding:18px 18px 14px',
      'border-radius:18px',
      'background:#181818',
      'border:1.5px solid rgba(255,201,52,.38)',
      'color:#fff',
      'font-family:system-ui,-apple-system,Arial,sans-serif',
      'font-size:15px',
      'line-height:1.55',
      'box-shadow:0 8px 40px rgba(0,0,0,.7)',
      'transition:opacity .18s',
      'max-width:480px',
      'margin:0 auto',
    ].join(';'));

    document.body.appendChild(spot);
    document.body.appendChild(card);
    els = { spot: spot, card: card };
  }

  function unmount() {
    if (!els) return;
    els.spot.remove();
    els.card.remove();
    els = null;
    /* Show ? button again for replay */
    if (tourId && steps) {
      showFab(function () { runTour(); });
    }
  }

  function getEl(step) {
    return step.target ? document.querySelector(step.target) : null;
  }

  function go(i) {
    idx = i;
    var step = steps[i];
    var total = steps.length;
    var target = getEl(step);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function () {
      if (!els) return;
      var spot = els.spot;
      var card = els.card;

      if (target) {
        var r = target.getBoundingClientRect();
        var pad = 10;
        spot.style.top    = (r.top    - pad) + 'px';
        spot.style.left   = (r.left   - pad) + 'px';
        spot.style.width  = (r.width  + pad * 2) + 'px';
        spot.style.height = (r.height + pad * 2) + 'px';
        spot.style.opacity = '1';
        var midY = r.top + r.height / 2;
        var vh = window.innerHeight;
        if (midY > vh * 0.55) { card.style.bottom = 'auto'; card.style.top = '20px'; }
        else { card.style.top = 'auto'; card.style.bottom = '20px'; }
      } else {
        spot.style.top = '0px'; spot.style.left = '0px';
        spot.style.width = '0px'; spot.style.height = '0px';
        card.style.top = 'auto'; card.style.bottom = '20px';
      }

      var dots = steps.map(function (_, j) {
        var active = (j === i);
        return '<span style="display:inline-block;height:6px;border-radius:3px;transition:all .2s;' +
          'width:' + (active ? '18px' : '6px') + ';' +
          'background:' + (active ? '#ffc934' : 'rgba(255,255,255,.28)') + ';"></span>';
      }).join('');

      var eyebrow  = step.eyebrow || ((i + 1) + ' / ' + total);
      var prevBtn  = i > 0 ? '<button onclick="window.pdTour.prev()" style="' + btnStyle('ghost') + '">← Lại</button>' : '';
      var nextLabel = i === total - 1 ? 'Hiểu rồi ✓' : 'Tiếp →';

      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:11px;">' +
          '<span style="color:#ffc934;font-size:11px;font-weight:900;letter-spacing:1px;">' + eyebrow + '</span>' +
          '<button onclick="window.pdTour.end()" style="' + btnStyle('skip') + '">Bỏ qua</button>' +
        '</div>' +
        (step.title ? '<div style="font-size:17px;font-weight:900;margin-bottom:8px;line-height:1.3;">' + step.title + '</div>' : '') +
        '<div style="color:rgba(255,255,255,.82);font-size:14px;line-height:1.65;">' + step.body + '</div>' +
        '<div style="margin-top:15px;display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
          '<div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">' + dots + '</div>' +
          '<div style="display:flex;gap:8px;flex-shrink:0;">' + prevBtn +
            '<button onclick="window.pdTour.next()" style="' + btnStyle('primary') + '">' + nextLabel + '</button>' +
          '</div>' +
        '</div>';
    }, target ? 230 : 0);
  }

  function btnStyle(type) {
    var base = 'border:0;border-radius:9px;font-size:13px;font-weight:900;cursor:pointer;padding:9px 16px;white-space:nowrap;';
    if (type === 'primary') return base + 'background:#ffc934;color:#111;';
    if (type === 'ghost')   return base + 'background:rgba(255,255,255,.1);color:#fff;';
    if (type === 'skip')    return 'background:none;border:none;color:rgba(255,255,255,.38);cursor:pointer;font-size:12px;padding:4px 2px;font-family:inherit;';
    return base;
  }

  function runTour() {
    mount();
    go(0);
  }

  /* ─ PUBLIC ──────────────────────────────────────────── */

  window.pdTour = {
    /* Auto-mở lần đầu (trang nhập môn: student-register, apply-coach) */
    start: function (id, tourSteps, force) {
      tourId = id; steps = tourSteps;
      if (!force && isDone(id)) {
        /* Đã xem rồi → chỉ hiện nút ? để xem lại */
        showFab(function () { runTour(); });
        return;
      }
      runTour();
    },
    /* Chỉ hiện nút ? — không auto-mở (các trang còn lại) */
    setup: function (id, tourSteps) {
      tourId = id; steps = tourSteps;
      showFab(function () { runTour(); });
    },
    next: function () {
      if (idx < steps.length - 1) go(idx + 1);
      else this.end();
    },
    prev: function () {
      if (idx > 0) go(idx - 1);
    },
    end: function () {
      markDone(tourId);
      unmount();
    },
    reset: function (id) {
      var s = saved();
      if (id) delete s[id];
      else { var k; for (k in s) delete s[k]; }
      localStorage.setItem(STORE, JSON.stringify(s));
    }
  };
})();
