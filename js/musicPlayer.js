(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('music-toggle');
    var player = document.getElementById('gramophone-player');
    var audio = document.getElementById('bg-audio');
    var lyricsEl = document.getElementById('lyrics-line');

    toggle.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().catch(function () { /* autoplay bị chặn, chờ user bấm lại */ });
        player.classList.add('is-playing');
      } else {
        audio.pause();
        player.classList.remove('is-playing');
      }
    });

    audio.addEventListener('timeupdate', function () {
      var text = window.getCurrentLyric ? window.getCurrentLyric(audio.currentTime) : '';
      if (text) {
        if (lyricsEl.textContent !== text) lyricsEl.textContent = text;
        lyricsEl.classList.add('is-visible');
      } else {
        lyricsEl.classList.remove('is-visible');
      }
    });

    audio.addEventListener('ended', function () {
      player.classList.remove('is-playing');
      lyricsEl.classList.remove('is-visible');
    });
  });
})();
