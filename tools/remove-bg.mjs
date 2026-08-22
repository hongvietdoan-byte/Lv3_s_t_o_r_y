// Chạy 1 lần lúc build để tách nền 4 ảnh reference bằng AI cắt nền local (ONNX, offline).
// Output PNG trong suốt commit thẳng vào assets/img/cutout/ — không chạy lúc runtime trên trình duyệt.
// Dùng: node tools/remove-bg.mjs
import { removeBackground } from "@imgly/background-removal-node";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const refDir = path.join(root, "assets", "reference");
const outDir = path.join(root, "assets", "img", "cutout");

// bubu-dudu-final.jpg KHÔNG qua pipeline này nữa — nền phẳng gần như 1 màu khiến AI matting
// cho confidence rỗng ở vùng lông trắng khép kín (chân gấu trúc), xem tools/floodfill-bg.mjs.
const jobs = [
  { src: "bouquet-final.jpg", out: "bouquet-cutout.png", mime: "image/jpeg" },
  { src: "plane-final.png", out: "plane-cutout.png", mime: "image/png" },
  { src: "globe-final.png", out: "globe-cutout.png", mime: "image/png" },
];

await mkdir(outDir, { recursive: true });

for (const job of jobs) {
  const srcPath = path.join(refDir, job.src);
  const outPath = path.join(outDir, job.out);
  console.log(`Đang tách nền: ${job.src} ...`);
  const srcBuffer = await readFile(srcPath);
  const srcBlob = new Blob([srcBuffer], { type: job.mime });
  const blob = await removeBackground(srcBlob);
  const buffer = Buffer.from(await blob.arrayBuffer());
  await writeFile(outPath, buffer);
  console.log(`  -> ${path.relative(root, outPath)} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

console.log("Xong.");
