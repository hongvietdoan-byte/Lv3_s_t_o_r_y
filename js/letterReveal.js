(function () {
  // TODO: thay nội dung thư thật vào đây khi có, giữ nguyên cấu trúc mảng từng dòng.
  var PLACEHOLDER_LETTER = [
    'Gửi em,',
    '(Đây là đoạn thư mẫu để xem trước bố cục —',
    'nội dung thật sẽ được thay vào đây sau nhé.)',
    'Từ Hà Nội xa xôi, có một người vẫn luôn nghĩ về em mỗi ngày.',
    'Mong một ngày không xa mình sẽ được nắm tay nhau đi dạo,',
    'giống như Bubu và Dudu phía sau kia vậy.',
    'Yêu em, nhiều lắm.'
  ];

  var opened = false;

  function revealLetterLines() {
    var container = document.getElementById('letter-text');
    container.innerHTML = '';
    PLACEHOLDER_LETTER.forEach(function (text) {
      var span = document.createElement('span');
      span.className = 'line';
      span.textContent = text;
      container.appendChild(span);
    });
    gsap.to(container.querySelectorAll('.line'), {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.35,
      ease: 'power2.out'
    });
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

  function openEnvelope() {
    if (opened) return;
    opened = true;

    var flap = document.getElementById('envelope-flap');
    var wrap = document.getElementById('envelope-open-wrap');
    var paper = document.getElementById('letter-paper');

    gsap.timeline()
      .to(flap, { rotate: -160, y: -14, opacity: 0, duration: 0.7, ease: 'power2.in' })
      .to(wrap, { opacity: 0, duration: 0.5 }, '-=0.2')
      .call(function () {
        paper.style.display = 'block';
        revealLetterLines();
        if (window.spawnHearts) window.spawnHearts(6, { spread: 250 });
      })
      .to(paper, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.4)' })
      .call(function () {
        document.body.dataset.scene = 'ambient';
        startCoupleWalk();
        if (window.startHeartLoop) window.startHeartLoop(3000);
      });
  }

  // Dùng cho chế độ debug (?debug=letter / ?debug=ambient) để nhảy thẳng
  // tới trạng thái thư đã mở, không cần click seal thật.
  window.debugRevealLetter = function () {
    opened = true;
    var wrap = document.getElementById('envelope-open-wrap');
    var paper = document.getElementById('letter-paper');
    wrap.style.display = 'none';
    paper.style.display = 'block';
    gsap.set(paper, { opacity: 1, y: 0, scale: 1 });
    revealLetterLines();
    document.body.dataset.scene = 'ambient';
    startCoupleWalk();
    if (window.startHeartLoop) window.startHeartLoop(3000);
  };

  document.addEventListener('DOMContentLoaded', function () {
    var sealBtn = document.getElementById('wax-seal-btn');
    sealBtn.addEventListener('click', openEnvelope);
  });
})();
