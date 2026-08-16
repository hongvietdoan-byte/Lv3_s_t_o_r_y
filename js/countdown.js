(function () {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // Đếm ngược tới 00:00 ngày 03/09/2026, giờ Hà Nội (UTC+7).
  window.startCountdown = function (onComplete) {
    var target = new Date('2026-09-03T00:00:00+07:00').getTime();
    var elDays = document.getElementById('cd-days');
    var elHours = document.getElementById('cd-hours');
    var elMins = document.getElementById('cd-mins');
    var elSecs = document.getElementById('cd-secs');
    var intervalId;

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        elDays.textContent = '00';
        elHours.textContent = '00';
        elMins.textContent = '00';
        elSecs.textContent = '00';
        clearInterval(intervalId);
        if (onComplete) onComplete();
        return;
      }
      var totalSec = Math.floor(diff / 1000);
      elDays.textContent = pad(Math.floor(totalSec / 86400));
      elHours.textContent = pad(Math.floor((totalSec % 86400) / 3600));
      elMins.textContent = pad(Math.floor((totalSec % 3600) / 60));
      elSecs.textContent = pad(totalSec % 60);
    }

    tick();
    intervalId = setInterval(tick, 1000);
  };
})();
