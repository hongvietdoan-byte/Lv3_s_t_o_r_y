(function () {
  var FW_COLORS = ['#ffd166', '#ff6b9d', '#7fd8ff', '#c792ff', '#ffffff'];

  function buildCastleWindows() {
    var windowsGroup = document.getElementById('castle-windows');
    var glowGroup = document.getElementById('castle-window-glow');
    if (!windowsGroup || !glowGroup || windowsGroup.childElementCount) return;
    var blocks = [
      { x: 70, y: 365, w: 310, h: 55 },
      { x: 520, y: 365, w: 310, h: 55 },
      { x: 112, y: 296, w: 62, h: 200 },
      { x: 730, y: 296, w: 62, h: 200 },
      { x: 252, y: 228, w: 66, h: 268 },
      { x: 586, y: 228, w: 66, h: 268 },
      { x: 364, y: 174, w: 58, h: 322 },
      { x: 482, y: 174, w: 58, h: 322 },
      { x: 402, y: 118, w: 96, h: 378 }
    ];
    var svgns = 'http://www.w3.org/2000/svg';
    blocks.forEach(function (b) {
      var cols = Math.max(2, Math.round(b.w / 24));
      var rows = Math.max(2, Math.round(b.h / 28));
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (Math.random() < 0.22) continue;
          var wx = b.x + (c + 0.5) * (b.w / cols);
          var wy = b.y + (r + 0.5) * (b.h / rows);
          var rect = document.createElementNS(svgns, 'rect');
          rect.setAttribute('x', wx - 3);
          rect.setAttribute('y', wy - 4);
          rect.setAttribute('width', 6);
          rect.setAttribute('height', 8);
          rect.setAttribute('rx', 1.5);
          windowsGroup.appendChild(rect);
          if (Math.random() < 0.65) {
            // glow đôi: quầng sát + quầng lan toả xa hơn cho cảm giác lung linh
            var glowNear = document.createElementNS(svgns, 'circle');
            glowNear.setAttribute('cx', wx);
            glowNear.setAttribute('cy', wy);
            glowNear.setAttribute('r', 6);
            glowGroup.appendChild(glowNear);
            var glowFar = document.createElementNS(svgns, 'circle');
            glowFar.setAttribute('cx', wx);
            glowFar.setAttribute('cy', wy);
            glowFar.setAttribute('r', 13);
            glowFar.setAttribute('opacity', '0.5');
            glowGroup.appendChild(glowFar);
          }
        }
      }
    });
  }

  function spawnParticle(layer, cx, cy, dx, dy, color, duration) {
    var el = document.createElement('span');
    el.className = 'firework-particle';
    var size = 3 + Math.random() * 2;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background = color;
    el.style.left = cx + 'px';
    el.style.top = cy + 'px';
    el.style.boxShadow = '0 0 6px ' + color;
    layer.appendChild(el);
    gsap.fromTo(el,
      { x: 0, y: 0, opacity: 1, scale: 1 },
      {
        x: dx, y: dy, opacity: 0, scale: 0.3, duration: duration, ease: 'power2.out',
        onComplete: function () { el.remove(); }
      }
    );
  }

  function burstRound(layer, cx, cy, color) {
    var n = 24;
    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2;
      var dist = 60 + Math.random() * 30;
      spawnParticle(layer, cx, cy, Math.cos(angle) * dist, Math.sin(angle) * dist, color, 1.1);
    }
  }

  function burstChrysanthemum(layer, cx, cy, color) {
    for (var ring = 0; ring < 2; ring++) {
      var n = 18;
      var dist = 40 + ring * 35;
      for (var i = 0; i < n; i++) {
        var angle = (i / n) * Math.PI * 2 + ring * 0.15;
        spawnParticle(layer, cx, cy, Math.cos(angle) * dist, Math.sin(angle) * dist, color, 1.4 + ring * 0.3);
      }
    }
  }

  function burstWillow(layer, cx, cy, color) {
    var n = 16;
    for (var i = 0; i < n; i++) {
      var angle = (i / n) * Math.PI * 2;
      var dist = 50 + Math.random() * 20;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist + 45;
      spawnParticle(layer, cx, cy, dx, dy, color, 1.8);
    }
  }

  var BURSTS = [burstRound, burstChrysanthemum, burstWillow];

  function launchFirework(layer) {
    var rect = layer.getBoundingClientRect();
    if (!rect.width) return;
    var cx = rect.width * (0.15 + Math.random() * 0.7);
    var cy = rect.height * (0.1 + Math.random() * 0.35);
    var color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
    var burst = BURSTS[Math.floor(Math.random() * BURSTS.length)];
    burst(layer, cx, cy, color);
  }

  var fireworksTimer = null;
  function startFireworksLoop() {
    var layer = document.getElementById('fireworks-layer');
    if (!layer || fireworksTimer) return;
    launchFirework(layer);
    fireworksTimer = setInterval(function () { launchFirework(layer); }, 1400);
  }

  function startCoupleWalk() {
    var couple = document.getElementById('bubu-dudu');
    if (!couple || couple.dataset.walking) return;
    couple.dataset.walking = '1';
    gsap.to(couple, { left: '55%', duration: 18, ease: 'sine.inOut', repeat: -1, yoyo: true });
    ['dudu-leg-l', 'dudu-leg-r', 'bubu-leg-l', 'bubu-leg-r'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      gsap.to(el, {
        rotate: i % 2 === 0 ? 16 : -16,
        transformOrigin: 'top center',
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.12
      });
    });
  }

  var inviteStarted = false;
  window.startInviteScene = function () {
    if (inviteStarted) return;
    inviteStarted = true;
    buildCastleWindows();
    startFireworksLoop();
    startCoupleWalk();
    if (window.startHeartLoop) window.startHeartLoop(3000);
  };
})();
