(function () {
  window.goToBoxes = function () {
    document.body.dataset.scene = 'boxes';
  };

  window.goToBox = function (target) {
    if (target === 'gallery') {
      document.body.dataset.scene = 'gallery';
    } else if (target === 'bouquet') {
      if (window.resetBouquetScene) window.resetBouquetScene();
      document.body.dataset.scene = 'bouquet';
      if (window.playBouquetReveal) window.playBouquetReveal();
    } else if (target === 'invite') {
      document.body.dataset.scene = 'invite';
      if (window.startInviteScene) window.startInviteScene();
    }
  };

  function jumpTo(scene) {
    document.body.dataset.scene = scene;
    if (scene === 'flight') {
      if (window.playFlight) window.playFlight(function () { window.goToBoxes(); });
    } else if (scene === 'bouquet') {
      if (window.resetBouquetScene) window.resetBouquetScene();
      if (window.playBouquetReveal) window.playBouquetReveal();
    } else if (scene === 'letter') {
      if (window.debugRevealLetter) window.debugRevealLetter();
    } else if (scene === 'invite') {
      if (window.startInviteScene) window.startInviteScene();
    }
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

  // Chỉ dùng để test cục bộ khi bỏ qua màn passcode qua ?debug=; không phải cơ chế
  // bảo mật thật — người nhận thật luôn phải qua đúng passcode ở js/passcode.js.
  var DEBUG_PASSCODE = 'anhyeuem';

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(location.search);
    // scene: countdown | flight | boxes | gallery | bouquet | quiz | letter | invite
    var debugScene = params.get('debug');
    if (debugScene) {
      var start = function () { window.initExperience(debugScene); };
      if (window.deriveLoveKey) {
        window.deriveLoveKey(DEBUG_PASSCODE).then(function (key) {
          window.__loveKey = key;
          start();
        });
      } else {
        start();
      }
    }
  });
})();
