(function () {
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.pick-box').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.dataset.target;
        var lid = btn.querySelector('.pick-box-lid');
        gsap.timeline()
          .to(lid, { rotate: -50, y: -14, duration: 0.5, ease: 'back.out(1.6)' })
          .call(function () {
            if (window.spawnHearts) window.spawnHearts(4, { spread: 150 });
          })
          .call(function () {
            if (window.goToBox) window.goToBox(target);
          }, null, '+=0.25');
      });
    });

    document.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (window.goToBoxes) window.goToBoxes();
      });
    });

    // Wire phong thư trong hộp bó hoa (mở quiz), tách khỏi logic mở hộp ở trên.
    var envelopeBtn = document.getElementById('envelope-btn');
    if (envelopeBtn) {
      envelopeBtn.addEventListener('click', function () {
        if (window.openQuiz) window.openQuiz();
      });
    }
  });
})();
