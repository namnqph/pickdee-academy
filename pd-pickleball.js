/* =========================================================
   PICKDEE PICKLEBALL MINI — engine thật: di chuyển 2D tự do,
   kỹ thuật Dink/Drive/Lob/Smash, luật 2 chạm (double bounce),
   cấm volley trong Kitchen (NVZ), giao chéo sân, tính điểm
   side-out (chỉ bên giao mới ghi điểm), thắng 11 cách 2.
   API: window.PDPickleball.mount(container, { onClose }) -> {destroy}
========================================================= */
(function () {
  if (window.PDPickleball) return;

  function injectStyle() {
    if (document.getElementById('pdpbStyle')) return;
    var css = `
    .pdpb-root{position:absolute;inset:0;background:#0f0f0f;overflow:hidden;font-family:'Be Vietnam Pro',ui-sans-serif,system-ui,sans-serif;color:#fff;touch-action:none;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
    .pdpb-canvas{display:block;position:absolute;left:0;top:0;touch-action:none}
    .pdpb-hud{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:3;pointer-events:none}
    .pdpb-hud-top{top:0;height:50px;padding-top:env(safe-area-inset-top)}
    .pdpb-hud-bottom{bottom:0;height:56px;padding-bottom:env(safe-area-inset-bottom)}
    .pdpb-score{display:flex;align-items:center;gap:8px}
    .pdpb-score b{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}
    .pdpb-score span{font-size:11px;color:rgba(255,255,255,.5);font-weight:600;letter-spacing:.02em}
    .pdpb-serve-dot{width:7px;height:7px;border-radius:50%;background:#ffc934;box-shadow:0 0 8px rgba(255,201,52,.8);opacity:0;transition:opacity .2s}
    .pdpb-serve-dot.on{opacity:1}
    .pdpb-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:8;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px 18px;font-size:14px;font-weight:700;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;white-space:nowrap;text-align:center}
    .pdpb-toast.show{opacity:1}
    .pdpb-toast.fault{color:#ff8a8a;border-color:rgba(255,100,100,.3)}
    .pdpb-toast.good{color:#ffc934;border-color:rgba(255,201,52,.3)}
    .pdpb-screen{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 24px calc(28px + env(safe-area-inset-bottom));text-align:center;background:rgba(15,15,15,.97)}
    .pdpb-screen.hidden{display:none}
    .pdpb-brand{display:flex;align-items:center;gap:8px;margin-bottom:4px}
    .pdpb-brand-logo{width:32px;height:32px;background:#ffc934;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#0f0f0f}
    .pdpb-brand-name{font-size:16px;font-weight:700}
    .pdpb-brand-name span{color:#ffc934}
    .pdpb-title{font-size:25px;font-weight:800;letter-spacing:-.03em;margin:6px 0 2px}
    .pdpb-sub{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:20px;max-width:300px;line-height:1.5}
    .pdpb-rules{display:grid;grid-template-columns:1fr 1fr;gap:9px;width:100%;max-width:320px;margin-bottom:22px}
    .pdpb-rule{background:rgba(255,255,255,.05);border-radius:13px;padding:11px 10px;font-size:11.5px;line-height:1.45;color:rgba(255,255,255,.68);text-align:left}
    .pdpb-rule b{display:block;font-size:13px;color:#fff;margin-bottom:3px}
    .pdpb-btn{width:100%;max-width:270px;padding:15px;border-radius:15px;background:#ffc934;color:#0f0f0f;font-size:15px;font-weight:700;border:none;cursor:pointer;transition:transform .12s,filter .12s}
    .pdpb-btn:active{transform:scale(.97);filter:brightness(.9)}
    .pdpb-btn-ghost{width:100%;max-width:270px;padding:13px;border-radius:15px;background:transparent;color:rgba(255,255,255,.65);font-size:14px;font-weight:600;border:1.5px solid rgba(255,255,255,.14);cursor:pointer;margin-top:10px}
    .pdpb-end-icon{font-size:52px;margin-bottom:4px}
    .pdpb-end-title{font-size:26px;font-weight:800;letter-spacing:-.03em;margin-bottom:4px}
    .pdpb-end-score{font-size:44px;font-weight:800;color:#ffc934;margin-bottom:4px;font-variant-numeric:tabular-nums}
    .pdpb-end-msg{font-size:13.5px;color:rgba(255,255,255,.58);margin-bottom:22px}
    .pdpb-reward{width:100%;max-width:290px;background:linear-gradient(135deg,rgba(255,201,52,.12),rgba(255,201,52,.04));border:1px solid rgba(255,201,52,.3);border-radius:14px;padding:13px 16px;margin-bottom:18px;text-align:left}
    .pdpb-reward b{font-size:13px;color:#ffc934;display:block}
    .pdpb-reward p{font-size:12px;color:rgba(255,255,255,.65);margin-top:3px;line-height:1.45}
    .pdpb-close{position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;z-index:30;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;font-size:19px;display:flex;align-items:center;justify-content:center;cursor:pointer}
    .pdpb-close:active{background:rgba(255,255,255,.2)}
    .pdpb-back{position:absolute;top:calc(12px + env(safe-area-inset-top));left:12px;z-index:30;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;color:#fff;font-size:19px;text-decoration:none}
    `;
    var s = document.createElement('style');
    s.id = 'pdpbStyle';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mount(container, opts) {
    opts = opts || {};
    injectStyle();

    container.classList.add('pdpb-root');
    container.innerHTML =
      '<canvas class="pdpb-canvas"></canvas>' +
      '<div class="pdpb-hud pdpb-hud-top">' +
        '<div class="pdpb-score"><span class="pdpb-serve-dot" id="pdpbDotAi"></span><span>ĐỐI THỦ</span><b id="pdpbScoreAi">0</b></div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.3)">11 điểm · cách 2</div>' +
      '</div>' +
      '<div class="pdpb-hud pdpb-hud-bottom">' +
        '<b id="pdpbScoreMe">0</b><span>BẠN</span><span class="pdpb-serve-dot" id="pdpbDotMe"></span>' +
        '<div style="flex:1"></div>' +
      '</div>' +
      '<div class="pdpb-toast" id="pdpbToast"></div>' +
      '<div class="pdpb-screen" id="pdpbStart">' +
        '<div class="pdpb-brand"><div class="pdpb-brand-logo">P</div><div class="pdpb-brand-name">Pick<span>Dee</span></div></div>' +
        '<div class="pdpb-title">Pickleball Mini</div>' +
        '<div class="pdpb-sub">Chơi theo đúng luật Pickleball thật — kéo để di chuyển, vuốt để đánh.</div>' +
        '<div class="pdpb-rules">' +
          '<div class="pdpb-rule"><b>☝️ Di chuyển</b>Kéo ngón tay để chạy khắp sân của bạn</div>' +
          '<div class="pdpb-rule"><b>👋 Đánh bóng</b>Vuốt khi bóng gần: nhẹ=Dink · mạnh=Drive · dài=Lốp</div>' +
          '<div class="pdpb-rule"><b>🟨 Kitchen (NVZ)</b>Không vô-lê (đánh trước khi nảy) trong vùng bếp</div>' +
          '<div class="pdpb-rule"><b>⚡ Luật 2 chạm</b>Giao bóng & trả giao phải để bóng nảy 1 lần trước</div>' +
        '</div>' +
        '<button class="pdpb-btn" id="pdpbBtnStart">Bắt đầu chơi</button>' +
      '</div>' +
      '<div class="pdpb-screen hidden" id="pdpbEnd">' +
        '<div class="pdpb-end-icon" id="pdpbEndIcon">🏆</div>' +
        '<div class="pdpb-end-title" id="pdpbEndTitle">Bạn thắng!</div>' +
        '<div class="pdpb-end-score" id="pdpbEndScore">11 – 7</div>' +
        '<div class="pdpb-end-msg" id="pdpbEndMsg"></div>' +
        '<div class="pdpb-reward" id="pdpbReward"><b>🎁 Phần thưởng đang đến...</b><p>Đăng ký khoá học PickDee Academy để nhận ưu đãi dành riêng cho người chơi giỏi.</p></div>' +
        '<button class="pdpb-btn" id="pdpbBtnReplay">Chơi lại</button>' +
        '<button class="pdpb-btn-ghost" id="pdpbBtnHome">' + (opts.onClose ? 'Đóng' : 'Về trang chủ') + '</button>' +
      '</div>';

    if (opts.onClose) {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'pdpb-close';
      closeBtn.setAttribute('aria-label', 'Đóng game');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function () { opts.onClose(); });
      container.appendChild(closeBtn);
    } else {
      var back = document.createElement('a');
      back.className = 'pdpb-back';
      back.href = '/';
      back.setAttribute('aria-label', 'Về trang chủ');
      back.textContent = '‹';
      container.appendChild(back);
    }

    var canvas = container.querySelector('.pdpb-canvas');
    var ctx = canvas.getContext('2d');
    var elToast = container.querySelector('#pdpbToast');
    var elScoreMe = container.querySelector('#pdpbScoreMe');
    var elScoreAi = container.querySelector('#pdpbScoreAi');
    var elDotMe = container.querySelector('#pdpbDotMe');
    var elDotAi = container.querySelector('#pdpbDotAi');
    var elStart = container.querySelector('#pdpbStart');
    var elEnd = container.querySelector('#pdpbEnd');

    // ── PALETTE ──
    var C = {
      court:'#14302a', nvz:'#0e2420', nvzLine:'rgba(255,255,255,.7)',
      courtLine:'rgba(255,255,255,.85)', net:'rgba(255,255,255,.92)',
      netShadow:'rgba(0,0,0,.4)', ball:'#ffc934', ballGlow:'rgba(255,201,52,.4)',
      ballHole:'rgba(180,130,0,.55)', playerPad:'#ffc934', playerGlow:'rgba(255,201,52,.5)',
      aiPad:'#8aacb8', aiGlow:'rgba(138,172,184,.3)', trailCol:'rgba(255,201,52,'
    };

    // ── LAYOUT ──
    var W,H,CW,CX,CT,CB,NET,NVZ,dpr;
    function layout() {
      W = container.clientWidth; H = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio||1, 2.2);
      canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
      canvas.style.width = W+'px'; canvas.style.height = H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);

      var hudTop = 50, hudBottom = 56, pad = 14;
      var availH = H - hudTop - hudBottom - pad*2;
      var cwWant = W*0.86;
      var chWant = cwWant*2.05;
      var ch = Math.min(chWant, availH);
      var cw = ch/2.05;
      if (cw > W*0.9) { cw = W*0.9; ch = cw*2.05; }
      CW = cw; CT = hudTop+pad+(availH-ch)/2; CB = CT+ch;
      CX = (W-CW)/2;
      NET = (CT+CB)/2;
      NVZ = ch*0.159;
    }

    // ── CONSTANTS ──
    var G = 0.85, NET_H = 34, SMASH_Z = 55, HIT_R = 44, BALL_R = 8;
    var AVATAR_FW = 30, AVATAR_FH = 9;
    var WIN_SCORE = 11;
    var T_DINK=19, T_DRIVE=24, T_LOB=40, T_SMASH=13;

    // ── STATE ──
    var gs, trail, aud;
    function initState() {
      var midX = CX+CW/2;
      gs = {
        phase:'start', // start|serving|playing|scored|end
        serverSide:'player',
        player:{x:midX,y:CB-70,score:0},
        ai:{x:midX,y:CT+70,score:0},
        ball:null,
        toastTimer:null
      };
      trail = [];
    }

    function ensureAudio(){ if(!aud){ try{aud=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } }
    function beep(freq,dur,type,vol){
      if(!aud) return;
      try{
        var o=aud.createOscillator(), g=aud.createGain();
        o.connect(g); g.connect(aud.destination);
        o.type=type||'square';
        o.frequency.setValueAtTime(freq,aud.currentTime);
        g.gain.setValueAtTime(vol||0.25,aud.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001,aud.currentTime+dur);
        o.start(); o.stop(aud.currentTime+dur);
      }catch(e){}
    }
    var sndHit=function(){beep(620,.06,'square',.2)};
    var sndDink=function(){beep(820,.05,'sine',.18)};
    var sndSmash=function(){beep(300,.1,'sawtooth',.28)};
    var sndFault=function(){beep(160,.22,'square',.22)};
    var sndScore=function(){beep(220,.26,'sine',.22)};
    var sndWin=function(){[600,760,940,1200].forEach(function(f,i){setTimeout(function(){beep(f,.15,'sine',.26)},i*90)})};

    function toast(msg, kind) {
      elToast.textContent = msg;
      elToast.className = 'pdpb-toast show' + (kind?(' '+kind):'');
      clearTimeout(gs.toastTimer);
      gs.toastTimer = setTimeout(function(){ elToast.classList.remove('show'); }, 1200);
    }

    // ── DRAW HELPERS ──
    function rrect(x,y,w,h,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
      ctx.closePath();
    }

    function drawCourt() {
      ctx.fillStyle = C.court;
      rrect(CX,CT,CW,CB-CT,10); ctx.fill();

      ctx.fillStyle = C.nvz;
      ctx.fillRect(CX+2, NET-NVZ, CW-4, NVZ-2);
      ctx.fillRect(CX+2, NET+2, CW-4, NVZ);

      ctx.save();
      ctx.fillStyle='rgba(255,255,255,.18)'; ctx.font='10px "Be Vietnam Pro",sans-serif';
      ctx.textAlign='center'; ctx.letterSpacing='2px';
      ctx.fillText('KITCHEN', CX+CW/2, NET-NVZ/2+4);
      ctx.fillText('KITCHEN', CX+CW/2, NET+NVZ/2+4);
      ctx.restore();

      ctx.strokeStyle=C.courtLine; ctx.lineWidth=2;
      rrect(CX,CT,CW,CB-CT,10); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(CX,NET-NVZ); ctx.lineTo(CX+CW,NET-NVZ);
      ctx.moveTo(CX,NET+NVZ); ctx.lineTo(CX+CW,NET+NVZ);
      ctx.strokeStyle=C.nvzLine; ctx.lineWidth=1.5; ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(CX+CW/2,CT); ctx.lineTo(CX+CW/2,CB);
      ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=1; ctx.stroke();

      ctx.fillStyle=C.netShadow; ctx.fillRect(CX,NET+4,CW,5);
      ctx.fillStyle='#ccc'; ctx.fillRect(CX-4,NET-3,7,15); ctx.fillRect(CX+CW-3,NET-3,7,15);
      ctx.fillStyle=C.net; ctx.fillRect(CX,NET,CW,4);
      ctx.strokeStyle='rgba(180,180,180,.35)'; ctx.lineWidth=.7;
      for(var x=CX+7;x<CX+CW;x+=7){ ctx.beginPath(); ctx.moveTo(x,NET); ctx.lineTo(x,NET+4); ctx.stroke(); }
      ctx.fillStyle='#fff'; ctx.fillRect(CX+CW/2-14,NET-1,28,6);
    }

    function drawAvatar(x,y,isPlayer) {
      var dir = isPlayer ? 1 : -1;
      var hw = 15, hh = 15;
      ctx.save();
      ctx.shadowColor = isPlayer ? C.playerGlow : C.aiGlow;
      ctx.shadowBlur = isPlayer ? 20 : 11;
      ctx.fillStyle = isPlayer ? C.playerPad : C.aiPad;
      rrect(x-AVATAR_FW/2, y-AVATAR_FH/2, AVATAR_FW, AVATAR_FH, 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      var neckW = hw+5, neckY = dir>0 ? y+AVATAR_FH/2-2 : y-AVATAR_FH/2-2;
      ctx.fillStyle = isPlayer ? '#c9980a' : '#6a8a96';
      ctx.fillRect(x-neckW/2, neckY, neckW, 4);

      var handleY = dir>0 ? y+AVATAR_FH/2+2 : y-AVATAR_FH/2-hh-2;
      ctx.fillStyle='#141414';
      rrect(x-hw/2, handleY, hw, hh, 3); ctx.fill();

      ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=1;
      for(var i=1;i<=2;i++){
        var ty = handleY + i*(hh/3);
        ctx.beginPath(); ctx.moveTo(x-hw/2+2,ty); ctx.lineTo(x+hw/2-2,ty); ctx.stroke();
      }

      ctx.strokeStyle = isPlayer ? 'rgba(0,0,0,.28)' : 'rgba(0,0,0,.2)';
      ctx.lineWidth=1.3;
      rrect(x-AVATAR_FW/2, y-AVATAR_FH/2, AVATAR_FW, AVATAR_FH, 5); ctx.stroke();

      if (isPlayer) {
        ctx.font='bold 5.5px "Be Vietnam Pro",sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='rgba(0,0,0,.35)';
        ctx.fillText('PickDee', x, y+0.5);
      }
      ctx.restore();
    }

    function drawBall() {
      if (!gs.ball) return;
      var b = gs.ball;
      var zOff = b.z * 0.9;
      trail.forEach(function(t,i){
        var a = (i+1)/trail.length*0.3;
        ctx.beginPath();
        ctx.arc(t.x, t.y - t.z*0.9, BALL_R*((i+1)/trail.length), 0, Math.PI*2);
        ctx.fillStyle = C.trailCol+a+')'; ctx.fill();
      });
      // ground shadow
      var shrink = Math.max(0.35, 1 - b.z/160);
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, BALL_R*shrink, BALL_R*0.5*shrink, 0, 0, Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,'+(0.35*shrink)+')'; ctx.fill();

      ctx.save();
      ctx.shadowColor=C.ballGlow; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(b.x, b.y-zOff, BALL_R, 0, Math.PI*2);
      ctx.fillStyle=C.ball; ctx.fill();
      ctx.restore();

      ctx.beginPath(); ctx.arc(b.x-3,b.y-zOff-3,BALL_R*.38,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fill();

      ctx.fillStyle=C.ballHole;
      [[-3,2],[1,-3],[3,2]].forEach(function(h){
        ctx.beginPath(); ctx.arc(b.x+h[0], b.y-zOff+h[1], 1.6, 0, Math.PI*2); ctx.fill();
      });
    }

    // ── PHYSICS ──
    function newBall(x,y,vx,vy,vz) {
      return {x:x,y:y,z:0,vx:vx,vy:vy,vz:vz,bouncedSinceHit:true,bounceStreak:0,lastHit:null,shotsInRally:0};
    }

    function startRally() {
      gs.phase='serving';
      var parity = gs[gs.serverSide].score % 2; // 0=right,1=left
      var isPlayer = gs.serverSide==='player';
      var boxX = parity===0 ? CX+CW*0.75 : CX+CW*0.25;
      if (isPlayer) { gs.player.x = boxX; gs.player.y = CB-30; }
      else { gs.ai.x = boxX; gs.ai.y = CT+30; }
      var srv = isPlayer ? gs.player : gs.ai;
      gs.ball = newBall(srv.x, srv.y, 0,0,0);
      gs.ball.bouncedSinceHit = true;
      gs.serveParity = parity;
      if (!isPlayer) {
        setTimeout(function(){ if(gs.phase==='serving' && gs.serverSide==='ai') doServe('ai'); }, 850);
        toast('Đối thủ giao bóng', null);
      } else {
        toast('Vuốt để giao bóng chéo sân ▶', null);
      }
    }

    function targetBoxX(forSide, parity) {
      // forSide = who is RECEIVING; diagonal from server's parity box
      var receiverRightBox = CX+CW*0.75, receiverLeftBox = CX+CW*0.25;
      return parity===0 ? receiverLeftBox : receiverRightBox; // server right(0)->receiver left, server left(1)->receiver right
    }

    function launch(ball, fromX, fromY, toX, toY, T, apexBoost) {
      var vz0 = 0.5*G*T*(apexBoost||1);
      ball.vx = (toX-fromX)/T;
      ball.vy = (toY-fromY)/T;
      ball.vz = vz0;
      ball.x = fromX; ball.y = fromY; ball.z = Math.max(ball.z,0.1);
      ball.bouncedSinceHit = false;
    }

    function doServe(side) {
      if (gs.phase!=='serving') return;
      ensureAudio();
      var srv = side==='player' ? gs.player : gs.ai;
      var b = gs.ball;
      var targetX = targetBoxX(null, gs.serveParity) + (Math.random()-0.5)*CW*0.12;
      var receiverDepthMin = (side==='player') ? CT+NVZ+16 : NET+NVZ+16;
      var receiverDepthMax = (side==='player') ? NET-NVZ-10 : CB-NVZ-16;
      var targetY = receiverDepthMin + Math.random()*(receiverDepthMax-receiverDepthMin);
      launch(b, srv.x, srv.y, targetX, targetY, 24);
      b.lastHit = side; b.shotsInRally = 1;
      gs.phase='playing';
      sndHit();
    }

    function playerServe(swipeX) {
      if (gs.phase!=='serving' || gs.serverSide!=='player') return;
      ensureAudio();
      var b = gs.ball, srv = gs.player;
      var baseX = targetBoxX(null, gs.serveParity);
      var targetX = clamp(baseX + swipeX*0.9, CX+CW*(gs.serveParity===0?0.08:0.5)+10, CX+CW*(gs.serveParity===0?0.5:0.92)-10);
      var targetY = CT+NVZ+20 + Math.random()*((NET-NVZ-10)-(CT+NVZ+20));
      launch(b, srv.x, srv.y, targetX, targetY, 24);
      b.lastHit='player'; b.shotsInRally=1;
      gs.phase='playing';
      sndHit();
    }

    function classifyShot(speed, dragLen) {
      if (speed >= 0.85 && dragLen > 70) return 'lob';
      if (speed < 0.32) return 'dink';
      if (speed >= 0.85) return 'drive';
      return 'drive';
    }

    function computeShot(ball, hitter, isPlayer, type, aimX, opts) {
      opts = opts || {};
      var netY = NET;
      var oppHalfTop = isPlayer ? CT : NET;
      var oppHalfBottom = isPlayer ? NET : CB;
      var T, ly, forceSmash = false;

      if (ball.z > SMASH_Z && (type==='drive'||type==='smash')) { type='smash'; forceSmash=true; }

      if (type==='dink') {
        T = T_DINK;
        ly = isPlayer ? (NET - NVZ*0.75) : (NET + NVZ*0.75);
      } else if (type==='lob') {
        T = T_LOB;
        ly = isPlayer ? (oppHalfTop + (oppHalfBottom-oppHalfTop)*0.12) : (oppHalfBottom - (oppHalfBottom-oppHalfTop)*0.12);
      } else if (type==='smash') {
        T = T_SMASH;
        ly = isPlayer ? (oppHalfTop + (oppHalfBottom-oppHalfTop)*0.35) : (oppHalfBottom - (oppHalfBottom-oppHalfTop)*0.35);
      } else { // drive
        T = T_DRIVE;
        var depthRand = 0.3+Math.random()*0.55;
        ly = isPlayer ? (oppHalfTop + (NET-NVZ-oppHalfTop)*0 + (oppHalfBottom-oppHalfTop)*depthRand*0 + (oppHalfTop + (oppHalfBottom-oppHalfTop)*depthRand)) : (oppHalfBottom - (oppHalfBottom-oppHalfTop)*depthRand);
      }

      var lx = clamp(hitter.x + aimX, CX+22, CX+CW-22);
      launch(ball, ball.x, ball.y, lx, ly, T, forceSmash?0.85:1);
      ball.lastHit = isPlayer?'player':'ai';
      ball.shotsInRally++;
      return type;
    }

    function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

    function inKitchen(x,y,isPlayer) {
      return isPlayer ? (y > NET && y < NET+NVZ) : (y < NET && y > NET-NVZ);
    }
    function inCourtX(x){ return x>=CX && x<=CX+CW; }

    function endRally(winnerSide, reason, kind) {
      gs.phase='scored';
      toast(reason, kind||'fault');
      if (kind!=='fault') sndScore(); else sndFault();

      var wasServer = gs.serverSide===winnerSide;
      if (wasServer) {
        gs[winnerSide].score++;
      }
      elScoreMe.textContent = gs.player.score;
      elScoreAi.textContent = gs.ai.score;

      var ps=gs.player.score, as=gs.ai.score;
      if ((ps>=WIN_SCORE||as>=WIN_SCORE) && Math.abs(ps-as)>=2) {
        setTimeout(function(){ endGame(ps>as); }, 950);
        return;
      }
      if (!wasServer) gs.serverSide = winnerSide;
      elDotMe.classList.toggle('on', gs.serverSide==='player');
      elDotAi.classList.toggle('on', gs.serverSide==='ai');
      setTimeout(startRally, 950);
    }

    function updatePhysics() {
      if (gs.phase!=='playing' || !gs.ball) return;
      var b = gs.ball;
      trail.push({x:b.x,y:b.y,z:b.z}); if (trail.length>6) trail.shift();

      var prevY = b.y;
      b.x += b.vx; b.y += b.vy;
      b.vz -= G; b.z += b.vz;

      // net crossing check
      if ((prevY<NET && b.y>=NET) || (prevY>NET && b.y<=NET)) {
        if (b.z < NET_H) {
          var faulted = b.lastHit; // who hit it into the net
          var winner = faulted==='player' ? 'ai' : 'player';
          endRally(winner, 'Chạm lưới!', 'fault');
          return;
        }
      }

      if (b.z<=0 && b.vz<0) {
        b.z=0; b.vz=-b.vz*0.52;
        if (!inCourtX(b.x) || b.y<CT-4 || b.y>CB+4) {
          var hitter=b.lastHit, winner=hitter==='player'?'ai':'player';
          endRally(winner,'Bóng ra ngoài!','fault');
          return;
        }
        b.bouncedSinceHit = true;
        b.bounceStreak = (b.bounceStreak||0)+1;
        if (b.bounceStreak>=2) {
          // double bounce: side the ball is currently on fails to return
          var faultSide = b.y < NET ? 'ai' : 'player';
          var winner2 = faultSide==='ai' ? 'player' : 'ai';
          endRally(winner2, 'Bóng nảy 2 lần!', 'fault');
          return;
        }
        if (Math.abs(b.vz) < 0.6) b.vz = 0;
      }

      tryHit(gs.player, true);
      tryHit(gs.ai, false);
    }

    function tryHit(av, isPlayer, swipe) {
      var b = gs.ball;
      if (!b || gs.phase!=='playing') return false;
      var dx=b.x-av.x, dy=b.y-av.y;
      var sideOk = isPlayer ? (b.y>NET-4) : (b.y<NET+4);
      if (!sideOk) return false;
      if (Math.hypot(dx,dy) > HIT_R) return false;
      if (b.lastHit === (isPlayer?'player':'ai')) return false; // can't hit own ball twice

      var wasVolley = !b.bouncedSinceHit;

      if (wasVolley && b.shotsInRally < 2) {
        var winnerA = isPlayer?'ai':'player';
        endRally(winnerA, 'Lỗi: phải để bóng nảy trước!', 'fault');
        return true;
      }
      if (wasVolley && inKitchen(av.x, av.y, isPlayer)) {
        var winnerB = isPlayer?'ai':'player';
        endRally(winnerB, 'Lỗi: Volley trong Kitchen!', 'fault');
        return true;
      }

      var type, aimX;
      if (swipe) { type = swipe.type; aimX = swipe.aimX; }
      else {
        // AI heuristic
        var nearNet = isPlayer ? false : (NET-av.y < NVZ*1.6);
        var r = Math.random();
        if (b.z > SMASH_Z && nearNet) type='smash';
        else if (nearNet && b.z<35) type = r<0.55 ? 'dink' : 'drive';
        else if (r<0.14) type='lob';
        else type='drive';
        var openX = (isPlayer ? gs.ai.x : gs.player.x); // opponent avoid
        var diff = Math.min(0.14+gs.player.score*0.02+gs.ai.score*0.02, 0.6);
        aimX = (av.x < CX+CW/2 ? 1 : -1)*(CW*0.22)*diff + (Math.random()-0.5)*40*(1-diff);
      }

      if (type==='dink') sndDink(); else if (type==='smash') sndSmash(); else sndHit();
      computeShot(b, av, isPlayer, type, aimX);
      trail = [];
      return true;
    }

    // ── AI MOVEMENT ──
    function updateAI() {
      var ai = gs.ai, b = gs.ball;
      if (!b) return;
      var targetX = ai.x, targetY = CT+70;
      if (gs.phase==='playing') {
        if (b.vy < 0 || b.y < NET) {
          targetX = b.x;
          targetY = clamp(b.y - 26, CT+18, NET-8);
          if (b.bouncedSinceHit===false && inKitchen(ai.x,ai.y,false) && b.shotsInRally>=2) {
            targetY = NET-NVZ-20; // step back out of kitchen before ball bounces
          }
        } else {
          targetX = CX+CW/2 + (b.x-(CX+CW/2))*0.3;
          targetY = CT+60;
        }
      }
      var total = gs.player.score+gs.ai.score;
      var spd = Math.min(3.2+total*0.17, 8.5);
      var dxp = targetX-ai.x, dyp = targetY-ai.y;
      ai.x += Math.sign(dxp)*Math.min(Math.abs(dxp), spd);
      ai.y += Math.sign(dyp)*Math.min(Math.abs(dyp), spd);
      ai.x = clamp(ai.x, CX+20, CX+CW-20);
      ai.y = clamp(ai.y, CT+16, NET-6);

      if (gs.phase==='playing') tryHit(ai, false);
    }

    function endGame(playerWon) {
      gs.phase='end';
      playerWon ? sndWin() : sndScore();
      container.querySelector('#pdpbEndIcon').textContent = playerWon?'🏆':'😅';
      container.querySelector('#pdpbEndTitle').textContent = playerWon?'Bạn thắng!':'Lần sau nhé!';
      container.querySelector('#pdpbEndScore').textContent = gs.player.score+' – '+gs.ai.score;
      container.querySelector('#pdpbEndMsg').textContent = playerWon
        ? 'Tuyệt vời! Bạn chơi đúng luật và thắng xứng đáng!'
        : 'Đừng nản — luyện thêm kỹ thuật dink & third-shot là thắng!';
      container.querySelector('#pdpbReward').style.display = playerWon?'':'none';
      elEnd.classList.remove('hidden');
    }

    // ── CONTROLS ──
    var dragging=false, lastPts=[], avX=0, avY=0;
    function localPos(e) {
      var t = e.touches ? e.touches[0] : e;
      var r = canvas.getBoundingClientRect();
      return { x:(t.clientX-r.left), y:(t.clientY-r.top) };
    }
    function onDown(e) {
      e.preventDefault();
      ensureAudio();
      if (gs.phase==='start') { startGame(); return; }
      if (gs.phase==='end') { startGame(); return; }
      var p = localPos(e);
      dragging = true;
      lastPts = [{x:p.x,y:p.y,t:performance.now()}];
      moveAvatarTo(p.x,p.y);
    }
    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      var p = localPos(e);
      lastPts.push({x:p.x,y:p.y,t:performance.now()});
      if (lastPts.length>6) lastPts.shift();
      moveAvatarTo(p.x,p.y);
    }
    function onUp(e) {
      if (!dragging) return;
      dragging=false;
      if (lastPts.length>=2) {
        var a = lastPts[0], c = lastPts[lastPts.length-1];
        var dt = Math.max(c.t-a.t, 16);
        var dx = c.x-a.x, dy=c.y-a.y;
        var dragLen = Math.hypot(dx,dy);
        var speed = dragLen/dt;
        attemptHit(speed, dragLen, dx);
      }
    }
    function moveAvatarTo(x,y) {
      var p = gs.player;
      p.x = clamp(x, CX+18, CX+CW-18);
      p.y = clamp(y, NET+6, CB-14);
    }
    function attemptHit(speed, dragLen, dx) {
      if (gs.phase==='serving' && gs.serverSide==='player') {
        playerServe(dx*0.8);
        return;
      }
      if (gs.phase!=='playing') return;
      var type = classifyShot(speed, dragLen);
      var aimX = dx*0.9;
      tryHit(gs.player, true, {type:type, aimX:aimX});
    }

    canvas.addEventListener('touchstart', onDown, {passive:false});
    canvas.addEventListener('touchmove', onMove, {passive:false});
    canvas.addEventListener('touchend', onUp, {passive:false});
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // ── FLOW ──
    function startGame() {
      elStart.classList.add('hidden');
      elEnd.classList.add('hidden');
      gs.player.score=0; gs.ai.score=0; gs.serverSide='player';
      elScoreMe.textContent='0'; elScoreAi.textContent='0';
      elDotMe.classList.add('on'); elDotAi.classList.remove('on');
      trail=[];
      startRally();
    }
    container.querySelector('#pdpbBtnStart').addEventListener('click', function(){ ensureAudio(); startGame(); });
    container.querySelector('#pdpbBtnReplay').addEventListener('click', function(){ elEnd.classList.add('hidden'); startGame(); });
    container.querySelector('#pdpbBtnHome').addEventListener('click', function(){
      if (opts.onClose) opts.onClose(); else window.location.href='/';
    });

    // ── LOOP ──
    var raf;
    function loop() {
      raf = requestAnimationFrame(loop);
      ctx.fillStyle='#0f0f0f'; ctx.fillRect(0,0,W,H);
      drawCourt();
      drawBall();
      drawAvatar(gs.player.x, gs.player.y, true);
      drawAvatar(gs.ai.x, gs.ai.y, false);

      if (gs.phase==='playing') { updatePhysics(); updateAI(); }
      else if (gs.phase==='serving') {
        updateAI();
        if (gs.serverSide==='player' && gs.ball) { gs.ball.x=gs.player.x; gs.ball.y=gs.player.y; }
      }
    }

    function onResize() {
      var prevCW=CW, prevCT=CT;
      layout();
      if (gs.player) {
        gs.player.x = clamp(gs.player.x, CX+18, CX+CW-18);
        gs.player.y = clamp(gs.player.y, NET+6, CB-14);
        gs.ai.x = clamp(gs.ai.x, CX+20, CX+CW-20);
        gs.ai.y = clamp(gs.ai.y, CT+16, NET-6);
      }
    }
    window.addEventListener('resize', onResize);
    var ro = window.ResizeObserver ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(container);

    layout();
    initState();
    gs.player.x = CX+CW/2; gs.player.y = CB-70;
    gs.ai.x = CX+CW/2; gs.ai.y = CT+70;
    loop();

    return {
      destroy: function() {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (ro) ro.disconnect();
        container.innerHTML='';
        container.classList.remove('pdpb-root');
      }
    };
  }

  window.PDPickleball = { mount: mount };
})();
