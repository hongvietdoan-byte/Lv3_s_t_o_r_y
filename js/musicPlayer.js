(function () {
  var audio, player;

  // Dùng chung giữa nút bấm thủ công và lệnh tự phát khi máy bay bắt đầu bay
  // (js/flightTimeline.js). Trình duyệt cho phép play() có âm thanh vì người
  // dùng đã tương tác trước đó (bấm nút mở khoá passcode).
  window.playMusic = function () {
    if (!audio) return;
    audio.play().catch(function () { /* bị chặn thì chờ user bấm nút thủ công */ });
    if (player) player.classList.add('is-playing');
  };

  window.pauseMusic = function () {
    if (!audio) return;
    audio.pause();
    if (player) player.classList.remove('is-playing');
  };

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('music-toggle');
    player = document.getElementById('gramophone-player');
    audio = document.getElementById('bg-audio');
    var lyricsEl = document.getElementById('lyrics-line');
    var volumeSlider = document.getElementById('volume-slider');

    audio.volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.8;

    toggle.addEventListener('click', function () {
      if (audio.paused) window.playMusic();
      else window.pauseMusic();
    });

    if (volumeSlider) {
      volumeSlider.addEventListener('input', function () {
        audio.volume = parseFloat(volumeSlider.value);
      });
    }

    var lastLineText = '';
    audio.addEventListener('timeupdate', function () {
      if (!window.getCurrentLyricState) return;
      var state = window.getCurrentLyricState(audio.currentTime);
      if (!state.text) {
        lyricsEl.classList.remove('is-visible');
        return;
      }
      if (state.text !== lastLineText) {
        lastLineText = state.text;
        lyricsEl.innerHTML = '';
        state.text.split(' ').forEach(function (word, i) {
          var span = document.createElement('span');
          span.className = 'word';
          span.textContent = word + (i < state.text.split(' ').length - 1 ? ' ' : '');
          lyricsEl.appendChild(span);
        });
      }
      var words = lyricsEl.querySelectorAll('.word');
      var sungCount = Math.round(state.progress * words.length);
      words.forEach(function (w, i) {
        w.classList.toggle('is-sung', i < sungCount);
      });
      lyricsEl.classList.add('is-visible');
    });

    audio.addEventListener('ended', function () {
      player.classList.remove('is-playing');
      lyricsEl.classList.remove('is-visible');
    });
  });
})();
