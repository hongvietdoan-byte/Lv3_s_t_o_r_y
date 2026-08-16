(function () {
  // Tự động mở nắp hộp quà khi vào cảnh gift (được main.js gọi).
  window.openGiftBox = function (onDone) {
    var lid = document.getElementById('gift-box-lid');
    var contents = document.getElementById('gift-contents');

    gsap.timeline({ onComplete: onDone })
      .to(lid, { rotate: -35, y: -18, duration: 0.8, ease: 'back.out(1.4)' }, 0.3)
      .add(function () { contents.classList.add('is-visible'); })
      .to(contents, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, '<')
      .call(function () { if (window.spawnHearts) window.spawnHearts(4, { spread: 200 }); });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var envelopeBtn = document.getElementById('envelope-btn');
    envelopeBtn.addEventListener('click', function () {
      if (window.openQuiz) window.openQuiz();
    });
  });
})();
