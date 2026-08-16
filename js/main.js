(function () {
  var SCENE_ALIASES = { letter: 'letter-reveal' };

  function resolveScene(name) {
    return SCENE_ALIASES[name] || name;
  }

  function jumpTo(scene) {
    document.body.dataset.scene = scene;
    if (scene === 'flight') {
      if (window.playFlight) window.playFlight(function () { jumpTo('gift'); });
    } else if (scene === 'gift') {
      if (window.openGiftBox) window.openGiftBox();
    } else if (scene === 'ambient') {
      if (window.debugRevealLetter) window.debugRevealLetter();
    }
    // scene === 'letter-reveal': không cần thêm gì, envelope-open-wrap
    // hiện sẵn qua CSS, wax-seal-btn đã được letterReveal.js wire sẵn.
  }

  // Gọi sau khi qua được màn passcode (hoặc trực tiếp ở chế độ debug).
  window.initExperience = function (startScene) {
    if (startScene === 'countdown') {
      document.body.dataset.scene = 'countdown';
      if (window.startCountdown) {
        window.startCountdown(function () { jumpTo('flight'); });
      }
    } else {
      jumpTo(startScene);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(location.search);
    var debugScene = params.get('debug');
    if (debugScene) {
      window.initExperience(resolveScene(debugScene));
    }
  });
})();
