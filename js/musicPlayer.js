(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('music-toggle');
    var player = document.getElementById('gramophone-player');
    var audio = document.getElementById('bg-audio');
    var lyricsEl = document.getElementById('lyrics-line');
    var volumeSlider = document.getElementById('volume-slider');

    audio.volume = volumeSlider ? parseFloat(volumeSlider.value) : 0.8;

    toggle.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().catch(function () { /* autoplay bị chặn, chờ user bấm lại */ });
        player.classList.add('is-playing');
      } else {
        audio.pause();
        player.classList.remove('is-playing');
      }
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
