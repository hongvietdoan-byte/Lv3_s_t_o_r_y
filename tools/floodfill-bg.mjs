// Tách nền bằng flood-fill theo màu (không dùng AI matting) — dùng cho ảnh có nền PHẲNG 1
// màu gần như đồng nhất. Ưu điểm so với AI matting: xử lý đúng các vùng màu gần giống nền
// nhưng bị KHÉP KÍN bên trong đường viền chủ thể (vd lông trắng của nhân vật trên nền trắng/hồng
// nhạt) — AI matting theo alpha thường cho confidence thấp/rỗng ở vùng này vì màu quá giống nền,
// trong khi flood-fill từ viền ảnh chỉ xoá nền THẬT SỰ nối liền ra mép ảnh, giữ nguyên phần bị bao
// kín dù cùng màu.
// Dùng: node tools/floodfill-bg.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const refDir = path.join(root, "assets", "reference");
const outDir = path.join(root, "assets", "img", "cutout");

const jobs = [
  { src: "bubu-dudu-final.jpg", out: "bubu-dudu-cutout.png", threshold: 26, feather: 1.0 },
];

function colorDistance(data, ch, idx, br, bg, bb) {
  const dr = data[idx] - br, dg = data[idx + 1] - bg, db = data[idx + 2] - bb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function floodFillCutout({ src, out, threshold, feather }) {
  const srcPath = path.join(refDir, src);
  const outPath = path.join(outDir, out);
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const n = w * h;

  const corners = [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]];
  let br = 0, bgc = 0, bb = 0;
  for (const [x, y] of corners) {
    const i = (y * w + x) * ch;
    br += data[i]; bgc += data[i + 1]; bb += data[i + 2];
  }
  br /= 4; bgc /= 4; bb /= 4;

  const isBg = (x, y) => colorDistance(data, ch, (y * w + x) * ch, br, bgc, bb) < threshold;

  const visited = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const idx = y * w + x;
      if (!visited[idx] && isBg(x, y)) { visited[idx] = 1; stack[sp++] = idx; }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const idx = y * w + x;
      if (!visited[idx] && isBg(x, y)) { visited[idx] = 1; stack[sp++] = idx; }
    }
  }
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % w, y = (idx / w) | 0;
    const cand = [];
    if (x > 0) cand.push(idx - 1);
    if (x < w - 1) cand.push(idx + 1);
    if (y > 0) cand.push(idx - w);
    if (y < h - 1) cand.push(idx + w);
    for (const nb of cand) {
      if (!visited[nb]) {
        const nx = nb % w, ny = (nb / w) | 0;
        if (isBg(nx, ny)) { visited[nb] = 1; stack[sp++] = nb; }
      }
    }
  }

  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = data[i * ch];
    rgba[i * 4 + 1] = data[i * ch + 1];
    rgba[i * 4 + 2] = data[i * ch + 2];
    rgba[i * 4 + 3] = visited[i] ? 0 : 255;
  }

  if (feather > 0) {
    const alpha = Buffer.alloc(n);
    for (let i = 0; i < n; i++) alpha[i] = rgba[i * 4 + 3];
    const { data: blurred } = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
      .greyscale().blur(feather).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < n; i++) rgba[i * 4 + 3] = blurred[i];
  }

  await mkdir(outDir, { recursive: true });
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).png().toFile(outPath);
  const transparentCount = visited.reduce((a, b) => a + b, 0);
  console.log(`${out}: bg=(${br.toFixed(0)},${bgc.toFixed(0)},${bb.toFixed(0)}) transparent ${transparentCount}/${n}px`);
}

for (const job of jobs) {
  await floodFillCutout(job);
}
console.log("Xong flood-fill.");
