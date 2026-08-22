// Timestamp (giây) đã hiệu chỉnh theo file assets/audio/love-story.mp3 thật:
// - Đọc header MPEG (LAME "Info" frame) => thời lượng chính xác 234.14s (3:54.1), bitrate 320kbps CBR.
// - Đối chiếu 4 mốc timestamp xác thực từ 1 file LRC synced-lyrics bên ngoài (bản Fearless
//   gốc, không phải Taylor's Version — tổng thời lượng LRC 233.98s khớp bản của mình):
//   dòng đầu ~15.88s, "...tell me how to feel" ~132.92s, "faith in you was fading" ~172.03s,
//   "Marry me Juliet" ~197.14s, dòng cuối ~225.62s — rồi nội suy tuyến tính lại TỪNG ĐOẠN
//   giữa các mốc (không phải 1 đường tuyến tính chung cho cả bài), vì bài có đoạn nhạc dạo/bridge
//   dài hơn phần còn lại khiến nội suy đơn mốc trước đây bị lệch dần ở nửa sau bài hát.
// Không copy nguyên văn lyric từ nguồn ngoài, chỉ lấy mốc thời gian để hiệu chỉnh.
// Vẫn là ước lượng ở mức câu hát (không phải karaoke từng chữ).
window.LOVE_STORY_LYRICS = [
  { t: 15.9, text: "We were both young when I first saw you" },
  { t: 22.9, text: "I close my eyes and the flashback starts" },
  { t: 27.9, text: "I'm standing there, on a balcony in summer air" },
  { t: 34.9, text: "See the lights, see the party, the ball gowns" },
  { t: 41.9, text: "And say hello, little did I know" },
  { t: 48.9, text: "That you were Romeo, you were throwing pebbles" },
  { t: 55.9, text: "And my daddy said stay away from Juliet" },
  { t: 62.9, text: "Begging you please don't go, and I said" },
  { t: 67.9, text: "Romeo, take me somewhere we can be alone" },
  { t: 74.9, text: "I'll be waiting, all there's left to do is run" },
  { t: 81.9, text: "You'll be the prince and I'll be the princess" },
  { t: 88.9, text: "It's a love story, baby, just say yes" },
  { t: 102.9, text: "'Cause you were Romeo, I was a scarlet letter" },
  { t: 109.9, text: "And my daddy said stay away from Juliet" },
  { t: 116.9, text: "But you were everything to me" },
  { t: 123.9, text: "I was begging you please don't go, and I said" },
  { t: 132.9, text: "Romeo, save me, they try to tell me how to feel" },
  { t: 140.8, text: "This love is difficult but it's real" },
  { t: 148.5, text: "Don't be afraid, we'll make it out of this mess" },
  { t: 156.4, text: "It's a love story, baby, just say yes" },
  { t: 172.0, text: "My faith in you was fading" },
  { t: 176.2, text: "When I met you on the outskirts of town, and I said" },
  { t: 180.2, text: "Romeo, save me, I've been feeling so alone" },
  { t: 184.3, text: "I keep waiting for you, but you never come" },
  { t: 192.5, text: "He knelt to the ground and pulled out a ring, and said" },
  { t: 197.1, text: "Marry me, Juliet, you'll never have to be alone" },
  { t: 204.6, text: "I love you and that's all I really know" },
  { t: 212.0, text: "It's a love story, baby, just say yes" },
  { t: 225.6, text: "'Cause we were both young when I first saw you 💌" }
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
