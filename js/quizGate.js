(function () {
  var TOASTS = {
    no: ['Ơ kìa, thử nghĩ lại xem 🥲', 'Nút này trốn giỏi lắm đó nha 😏', 'Không được đâu nè 😤'],
    yes: ['Gần đúng rồi, thử x100 xem sao 😏', 'Yes thôi chưa đủ đâu!', 'Cố lên, còn 1 nút nữa kìa 👀']
  };

  function randomToast(kind) {
    var arr = TOASTS[kind];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function dodge(btn, container) {
    var cRect = container.getBoundingClientRect();
    var bRect = btn.getBoundingClientRect();
    var maxLeft = Math.max(cRect.width - bRect.width, 0);
    var maxTop = Math.max(cRect.height - bRect.height, 0);
    btn.classList.add('is-dodging');
    btn.style.left = (Math.random() * maxLeft) + 'px';
    btn.style.top = (Math.random() * maxTop) + 'px';
    btn.classList.remove('is-shaking');
    void btn.offsetWidth; // restart animation
    btn.classList.add('is-shaking');
  }

  var toastTimer;
  function showToast(text) {
    var toast = document.getElementById('quiz-toast');
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 1800);
  }

  window.openQuiz = function () {
    document.body.dataset.scene = 'quiz';
  };

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('quiz-buttons');
    var noBtn = container.querySelector('.quiz-btn--no');
    var yesBtn = container.querySelector('.quiz-btn--yes');
    var yes100Btn = container.querySelector('.quiz-btn--yes100');

    [noBtn, yesBtn].forEach(function (btn) {
      var kind = btn.dataset.answer;
      btn.addEventListener('pointerenter', function () { dodge(btn, container); });
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        dodge(btn, container);
        showToast(randomToast(kind));
      });
    });

    yes100Btn.addEventListener('click', function () {
      showToast('Yeaaay 100 sao luôn nè 🌟');
      if (window.spawnHearts) window.spawnHearts(10, { spread: 100 });
      document.body.dataset.scene = 'envelope-out';
      gsap.to('#envelope-btn', {
        scale: 1.3,
        opacity: 0,
        duration: 0.7,
        ease: 'power1.in',
        onComplete: function () {
          document.body.dataset.scene = 'letter-reveal';
        }
      });
    });
  });
})();
