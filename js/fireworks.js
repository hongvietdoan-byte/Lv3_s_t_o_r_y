(function () {
  // Lâu đài giờ là ảnh cutout tách riêng (không còn pháo hoa vẽ sẵn trong ảnh nền) — phục hồi
  // hệ particle pháo hoa thật để pháo hoa chuyển động được, cộng thêm hiệu ứng cửa sổ lâu đài
  // sáng đèn dần. Ken Burns áp lên #invite-kenburns (bọc chung trời/sao/lâu đài/pháo hoa) để
  // các lớp không bị trôi lệch nhau khi zoom.

  var FW_COLORS = ['#ffd166', '#ff6b9d', '#7fd8ff', '#c792ff', '#ffffff'];

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

  // Các đốm sáng cửa sổ đặt sẵn trong HTML (toạ độ % đặt tay theo ảnh cutout thật) — sáng dần
  // từng cái một lúc vào scene, không nhấp nháy liên tục.
  function lightUpCastleWindows() {
    var windows = document.querySelectorAll('.castle-window');
    if (!windows.length) return;
    gsap.to(windows, {
      opacity: 1, duration: 0.7, ease: 'power1.out',
      stagger: { each: 0.35, from: 'random' }
    });
  }

  function startKenBurns() {
    var wrap = document.getElementById('invite-kenburns');
    if (!wrap || wrap.dataset.kenburns) return;
    wrap.dataset.kenburns = '1';
    gsap.to(wrap, {
      scale: 1.08, x: '-1.5%', y: '1%', duration: 26, ease: 'sine.inOut',
      repeat: -1, yoyo: true, transformOrigin: '50% 55%'
    });
  }

  function startFlashLoop() {
    var flash = document.getElementById('invite-flash');
    if (!flash || flash.dataset.looping) return;
    flash.dataset.looping = '1';
    function scheduleFlash() {
      var delay = 4000 + Math.random() * 4000;
      setTimeout(function () {
        gsap.timeline({ onComplete: scheduleFlash })
          .to(flash, { opacity: 1, duration: 0.18, ease: 'power1.in' })
          .to(flash, { opacity: 0, duration: 0.22, ease: 'power1.out' });
      }, delay);
    }
    scheduleFlash();
  }

  function startCoupleWalk() {
    var couple = document.getElementById('ambient-couple');
    var bob = document.getElementById('couple-bob');
    if (!couple || !bob || couple.dataset.walking) return;
    couple.dataset.walking = '1';

    gsap.to(couple, { left: '58%', duration: 17, ease: 'sine.inOut', repeat: -1, yoyo: true });

    // nhấp nhô 2 chu kỳ lệch pha (thời lượng khác nhau, không phải bội số của nhau)
    // mô phỏng bước trái/phải không lướt đều đều.
    gsap.to(bob, { y: -6, duration: 0.42, ease: 'sine.inOut', repeat: -1, yoyo: true });
    gsap.to(bob, { rotate: 2.4, duration: 0.63, ease: 'sine.inOut', repeat: -1, yoyo: true, transformOrigin: '50% 100%' });
  }

  var inviteStarted = false;
  window.startInviteScene = function () {
    if (inviteStarted) return;
    inviteStarted = true;
    startKenBurns();
    startFlashLoop();
    startFireworksLoop();
    lightUpCastleWindows();
    startCoupleWalk();
    if (window.startHeartLoop) window.startHeartLoop(3000);
  };
})();
