// Dọn nhiễu alpha matting: xoá vệt/mảng "ghost" rời rạc nối bằng cầu mỏng vào chủ thể chính.
// Pipeline: stretch alpha (bỏ nền float thấp) -> erode nhị phân (cắt cầu nối mỏng)
// -> giữ connected component lớn nhất -> dilate phục hồi kích thước gốc -> feather (blur alpha) để mềm biên.
// Dùng: node tools/clean-alpha.mjs
import sharp from "sharp";
import { rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cutoutDir = path.join(root, "assets", "img", "cutout");

const STRETCH_LOW = 60;
const STRETCH_HIGH = 200;
const BINARY_THRESHOLD = 130;
const FEATHER_BLUR = 1.5;

// erodeRadius nhỏ cho ảnh có chi tiết mỏng (cánh máy bay, chân Bubu Dudu) để không cắt mất
// chi tiết. minComponentSize (nếu có): giữ MỌI mảnh liền khối đủ lớn (không chỉ mảnh lớn
// nhất) — dùng khi ảnh có >1 chủ thể tách rời nhau (Bubu + Dudu) để không mất mảnh nhỏ hơn,
// vẫn loại được vệt ghost nhỏ (vd vệt đuôi rời rạc do matting lỗi).
// bubu-dudu-cutout.png không qua đây nữa — xem tools/floodfill-bg.mjs.
const files = [
  { name: "bouquet-cutout.png", erodeRadius: 4 },
  { name: "plane-cutout.png", erodeRadius: 1 },
  { name: "globe-cutout.png", erodeRadius: 4 },
];

function neighborsWithinRadius(radius) {
  const offsets = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) offsets.push([dx, dy]);
    }
  }
  return offsets;
}

function erode(mask, width, height, offsets) {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let keep = 1;
      for (const [dx, dy] of offsets) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !mask[ny * width + nx]) {
          keep = 0;
          break;
        }
      }
      out[y * width + x] = keep;
    }
  }
  return out;
}

function dilate(mask, width, height, offsets) {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (const [dx, dy] of offsets) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) out[ny * width + nx] = 1;
      }
    }
  }
  return out;
}

function largestComponent(mask, width, height) {
  const n = width * height;
  const visited = new Uint8Array(n);
  const stack = new Int32Array(n);
  let bestSize = 0;
  let bestMask = null;
  for (let start = 0; start < n; start++) {
    if (visited[start] || !mask[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    visited[start] = 1;
    const members = [start];
    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % width, y = (idx / width) | 0;
      const cand = [];
      if (x > 0) cand.push(idx - 1);
      if (x < width - 1) cand.push(idx + 1);
      if (y > 0) cand.push(idx - width);
      if (y < height - 1) cand.push(idx + width);
      for (const nb of cand) {
        if (!visited[nb] && mask[nb]) {
          visited[nb] = 1;
          stack[sp++] = nb;
          members.push(nb);
        }
      }
    }
    if (members.length > bestSize) {
      bestSize = members.length;
      bestMask = members;
    }
  }
  const out = new Uint8Array(n);
  if (bestMask) for (const idx of bestMask) out[idx] = 1;
  return out;
}

// Giữ mọi mảnh liền khối có kích thước >= minSize (thay vì chỉ mảnh lớn nhất) — dùng cho
// ảnh có nhiều chủ thể tách rời (2 nhân vật cầm tay nhau vẫn có thể tách 2 blob nếu erode mạnh).
function keepComponentsAbove(mask, width, height, minSize) {
  const n = width * height;
  const visited = new Uint8Array(n);
  const stack = new Int32Array(n);
  const out = new Uint8Array(n);
  for (let start = 0; start < n; start++) {
    if (visited[start] || !mask[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    visited[start] = 1;
    const members = [start];
    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % width, y = (idx / width) | 0;
      const cand = [];
      if (x > 0) cand.push(idx - 1);
      if (x < width - 1) cand.push(idx + 1);
      if (y > 0) cand.push(idx - width);
      if (y < height - 1) cand.push(idx + width);
      for (const nb of cand) {
        if (!visited[nb] && mask[nb]) {
          visited[nb] = 1;
          stack[sp++] = nb;
          members.push(nb);
        }
      }
    }
    if (members.length >= minSize) {
      for (const idx of members) out[idx] = 1;
    }
  }
  return out;
}

async function featherAlpha(data, width, height) {
  const n = width * height;
  const alpha = Buffer.alloc(n);
  for (let i = 0; i < n; i++) alpha[i] = data[i * 4 + 3];
  const { data: blurred } = await sharp(alpha, { raw: { width, height, channels: 1 } })
    .greyscale()
    .blur(FEATHER_BLUR)
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < n; i++) data[i * 4 + 3] = blurred[i];
}

async function cleanFile({ name, erodeRadius, minComponentSize }) {
  const filePath = path.join(cutoutDir, name);
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const n = width * height;
  const offsets = neighborsWithinRadius(erodeRadius);

  const stretched = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    let na;
    if (a <= STRETCH_LOW) na = 0;
    else if (a >= STRETCH_HIGH) na = 255;
    else na = Math.round(((a - STRETCH_LOW) * 255) / (STRETCH_HIGH - STRETCH_LOW));
    stretched[i] = na;
  }

  const binary = new Uint8Array(n);
  for (let i = 0; i < n; i++) binary[i] = stretched[i] >= BINARY_THRESHOLD ? 1 : 0;

  const eroded = erode(binary, width, height, offsets);
  const kept = minComponentSize
    ? keepComponentsAbove(eroded, width, height, minComponentSize)
    : largestComponent(eroded, width, height);
  const restored = dilate(kept, width, height, offsets);

  let keptPixels = 0, droppedPixels = 0;
  for (let i = 0; i < n; i++) {
    if (restored[i]) {
      data[i * 4 + 3] = stretched[i];
      if (stretched[i] > 0) keptPixels++;
    } else {
      if (stretched[i] > 0) droppedPixels++;
      data[i * 4 + 3] = 0;
    }
  }

  await featherAlpha(data, width, height);

  const tmpPath = filePath + ".tmp.png";
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(tmpPath);
  await rename(tmpPath, filePath);
  console.log(`${name}: erodeRadius=${erodeRadius} kept ${keptPixels}px, dropped ${droppedPixels}px ghost pixels`);
}

for (const file of files) {
  await cleanFile(file);
}
console.log("Xong dọn alpha.");
