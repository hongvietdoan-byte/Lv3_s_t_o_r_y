(function () {
  var FALLBACK_LINES = ['(chưa mở khoá được thư — thử tải lại trang và nhập đúng passcode nhé)'];

  function base64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // Thư được mã hoá AES-GCM (js/letterData.js), khoá suy ra từ passcode lúc mở khoá
  // (window.__loveKey, gán trong js/passcode.js). Không có đúng passcode thì không
  // giải mã được, kể cả khi đọc thẳng source công khai trên GitHub.
  async function decryptLetter() {
    if (!window.LETTER_CIPHERTEXT || !window.__loveKey) return FALLBACK_LINES;
    try {
      var iv = base64ToBytes(window.LETTER_CIPHERTEXT.iv);
      var data = base64ToBytes(window.LETTER_CIPHERTEXT.data);
      var plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, window.__loveKey, data);
      var text = new TextDecoder().decode(plainBuf);
      return text.split('\n').filter(function (line) { return line.trim().length > 0; });
    } catch (e) {
      return FALLBACK_LINES;
    }
  }

  var opened = false;

  async function revealLetterLines() {
    var container = document.getElementById('letter-text');
    var lines = await decryptLetter();
    container.innerHTML = '';
    lines.forEach(function (text) {
      var span = document.createElement('span');
      span.className = 'line';
      span.textContent = text;
      container.appendChild(span);
    });
    gsap.to(container.querySelectorAll('.line'), {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.12,
      ease: 'power2.out'
    });
  }

  // Kéo dây nơ: nơ tháo ra + cuộn giấy mờ dần trong khi thư phẳng "mở cuộn" lớn dần
  // từ trên xuống (scaleY từ transform-origin:top, xem css/scenes.css .letter-paper).
  function untieRibbon(onDone) {
    var ribbon = document.getElementById('ribbon-btn');
    var rolled = document.getElementById('scroll-rolled');
    var paper = document.getElementById('letter-paper');

    gsap.timeline({ onComplete: onDone })
      .to(ribbon, { scale: 1.1, rotate: -10, duration: 0.2, ease: 'power1.out' })
      .to(ribbon, { opacity: 0, y: -16, duration: 0.35, ease: 'power1.in' }, '+=0.05')
      .to(rolled, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power1.in' }, '-=0.25')
      .call(function () {
        rolled.style.display = 'none';
        paper.style.display = 'block';
      })
      .to(paper, { opacity: 1, scaleY: 1, duration: 0.9, ease: 'power2.out' });
  }

  function openEnvelope() {
    if (opened) return;
    opened = true;
    untieRibbon(function () {
      revealLetterLines();
      if (window.spawnHearts) window.spawnHearts(6, { spread: 250 });
    });
  }

  // Dùng cho chế độ debug (?debug=letter) để nhảy thẳng tới thư đã mở.
  window.debugRevealLetter = function () {
    opened = true;
    var rolled = document.getElementById('scroll-rolled');
    var paper = document.getElementById('letter-paper');
    rolled.style.display = 'none';
    paper.style.display = 'block';
    gsap.set(paper, { opacity: 1, scaleY: 1 });
    revealLetterLines();
  };

  // Reset lại hộp bó hoa mỗi lần quay lại từ scene boxes, để có thể mở lại từ đầu.
  window.resetBouquetScene = function () {
    opened = false;
    var envelopeBtn = document.getElementById('envelope-btn');
    var ribbon = document.getElementById('ribbon-btn');
    var rolled = document.getElementById('scroll-rolled');
    var paper = document.getElementById('letter-paper');
    var container = document.getElementById('letter-text');
    if (envelopeBtn) { envelopeBtn.style.opacity = ''; envelopeBtn.style.transform = ''; }
    if (ribbon) { ribbon.style.opacity = ''; ribbon.style.transform = ''; }
    if (rolled) { rolled.style.display = ''; rolled.style.opacity = ''; rolled.style.transform = ''; }
    if (paper) { paper.style.display = 'none'; paper.style.opacity = ''; paper.style.transform = ''; }
    if (container) container.innerHTML = '';
  };

  document.addEventListener('DOMContentLoaded', function () {
    var ribbonBtn = document.getElementById('ribbon-btn');
    ribbonBtn.addEventListener('click', openEnvelope);
  });
})();
