// Timestamp (giây) đã hiệu chỉnh theo file assets/audio/love-story.mp3 thật:
// - Đọc header MPEG (LAME "Info" frame) => thời lượng chính xác 234.14s (3:54.1), bitrate 320kbps CBR.
// - Đối chiếu 1 mốc timestamp xác thực từ nguồn lyric bên ngoài (dòng đầu tiên ở 0:15.92)
//   rồi nội suy tuyến tính lại toàn bộ mảng theo mốc đó + tổng thời lượng thật.
// Vẫn là ước lượng ở mức câu hát (không phải karaoke từng chữ) — nếu muốn khớp tuyệt đối
// nên nghe lại và tinh chỉnh thêm.
window.LOVE_STORY_LYRICS = [
  { t: 15.9, text: "We were both young when I first saw you" },
  { t: 22.8, text: "I close my eyes and the flashback starts" },
  { t: 27.7, text: "I'm standing there, on a balcony in summer air" },
  { t: 34.5, text: "See the lights, see the party, the ball gowns" },
  { t: 41.4, text: "And say hello, little did I know" },
  { t: 48.3, text: "That you were Romeo, you were throwing pebbles" },
  { t: 55.1, text: "And my daddy said stay away from Juliet" },
  { t: 62.0, text: "Begging you please don't go, and I said" },
  { t: 66.9, text: "Romeo, take me somewhere we can be alone" },
  { t: 73.7, text: "I'll be waiting, all there's left to do is run" },
  { t: 80.6, text: "You'll be the prince and I'll be the princess" },
  { t: 87.5, text: "It's a love story, baby, just say yes" },
  { t: 101.2, text: "'Cause you were Romeo, I was a scarlet letter" },
  { t: 108.0, text: "And my daddy said stay away from Juliet" },
  { t: 114.9, text: "But you were everything to me" },
  { t: 121.8, text: "I was begging you please don't go, and I said" },
  { t: 130.6, text: "Romeo, save me, they try to tell me how to feel" },
  { t: 137.5, text: "This love is difficult but it's real" },
  { t: 144.3, text: "Don't be afraid, we'll make it out of this mess" },
  { t: 151.2, text: "It's a love story, baby, just say yes" },
  { t: 164.9, text: "My faith in you was fading" },
  { t: 171.8, text: "When I met you on the outskirts of town, and I said" },
  { t: 178.6, text: "Romeo, save me, I've been feeling so alone" },
  { t: 185.5, text: "I keep waiting for you, but you never come" },
  { t: 199.2, text: "He knelt to the ground and pulled out a ring, and said" },
  { t: 207.0, text: "Marry me, Juliet, you'll never have to be alone" },
  { t: 213.9, text: "I love you and that's all I really know" },
  { t: 220.8, text: "It's a love story, baby, just say yes" },
  { t: 233.5, text: "'Cause we were both young when I first saw you 💌" }
];

window.getCurrentLyric = function (currentTime) {
  var lines = window.LOVE_STORY_LYRICS;
  var active = null;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].t <= currentTime) active = lines[i];
    else break;
  }
  return active ? active.text : '';
};

// Trả về dòng hiện tại + tỉ lệ tiến độ (0..1) trong khoảng tới dòng kế tiếp,
// dùng để hiện chữ kiểu karaoke (musicPlayer.js).
window.getCurrentLyricState = function (currentTime) {
  var lines = window.LOVE_STORY_LYRICS;
  var idx = -1;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].t <= currentTime) idx = i;
    else break;
  }
  if (idx === -1) return { text: '', progress: 0 };
  var current = lines[idx];
  var next = lines[idx + 1];
  var progress = 1;
  if (next) {
    progress = (currentTime - current.t) / (next.t - current.t);
    progress = Math.max(0, Math.min(1, progress));
  }
  return { text: current.text, progress: progress };
};
