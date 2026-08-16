(function () {
  var EMOJIS = ['💗', '💕', '💖', '💓'];

  // Bắn 1 chùm tim, dùng cho các khoảnh khắc cao trào (quiz Yes x100, mở thư).
  window.spawnHearts = function (count, opts) {
    opts = opts || {};
    var layer = document.getElementById('heart-layer');
    if (!layer) return;
    var n = count || 8;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var delay = (opts.spread || 120) * i + Math.random() * 200;
        setTimeout(function () {
          var el = document.createElement('span');
          el.className = 'floating-heart';
          el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          el.style.left = (opts.left != null ? opts.left : (10 + Math.random() * 80)) + '%';
          el.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
          el.style.fontSize = (16 + Math.random() * 16) + 'px';
          var duration = 3 + Math.random() * 2;
          el.style.animation = 'heart-float ' + duration.toFixed(2) + 's ease-out forwards';
          layer.appendChild(el);
          setTimeout(function () { el.remove(); }, duration * 1000 + 100);
        }, delay);
      })(i);
    }
  };

  // Vòng lặp tim nhẹ nhàng, dùng khi ở cảnh ambient (đọc thư + nhạc nền).
  window.startHeartLoop = function (intervalMs) {
    return setInterval(function () {
      window.spawnHearts(2, { spread: 300 });
    }, intervalMs || 2600);
  };

  window.stopHeartLoop = function (id) {
    clearInterval(id);
  };
})();
