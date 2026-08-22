// Dựng texture quả cầu phong cách đồ chơi (chạy 1 lần lúc build) — tô lại màu 1 bản đồ thế giới
// vector CÓ SẴN hình lục địa đúng (không tự vẽ blob ước lượng): BlankMap-World-Equirectangular.svg
// từ Wikimedia Commons, Public Domain / CC0 (gốc CIA World Factbook + Natural Earth, không cần
// ghi nguồn) — https://commons.wikimedia.org/wiki/File:BlankMap-World-Equirectangular.svg
// Dùng: node tools/build-toy-globe.mjs
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "assets", "img", "earth-toy-texture.jpg");

const SVG_URL = "https://upload.wikimedia.org/wikipedia/commons/9/9f/BlankMap-World-Equirectangular.svg";
const OCEAN_COLOR = "#5ec9e8";
const LAND_COLOR = "#8bc686";
const BORDER_COLOR = "#fbf9ee";

async function main() {
  console.log("Đang tải bản đồ nền...");
  const res = await fetch(SVG_URL);
  if (!res.ok) throw new Error("Tải SVG thất bại: " + res.status);
  let svg = await res.text();

  // Tô lại màu đồ chơi: đại dương xanh dương sáng, đất liền xanh lá, viền trắng ngà dày hơn.
  svg = svg.replace(
    /\.ocean\s*\{[^}]*\}/,
    `.ocean { opacity: 1; fill:${OCEAN_COLOR}; fill-opacity:1; stroke:none; }`
  );
  svg = svg.replace(
    /\.land\s*\{[^}]*\}/,
    `.land { fill: ${LAND_COLOR}; fill-opacity: 1; stroke:${BORDER_COLOR}; stroke-opacity: 1; stroke-width:2.2; stroke-miterlimit: 3.97446823; stroke-dasharray: none; }`
  );
  svg = svg.replace(
    /\.lake\s*\{[^}]*\}/,
    `.lake { fill:${OCEAN_COLOR}; fill-opacity:1; stroke:${OCEAN_COLOR}; stroke-opacity: 1; stroke-width:0.3; }`
  );
  svg = svg.replace(/\.aq\s*\{[^}]*\}/, `.aq { fill:#f4f6f0; }`);
  // Vài quốc gia (vd Sudan) có style inline ghi đè fill:#b9b9b9 riêng thay vì dùng class .land
  // — thay thế trực tiếp mã màu đó ở mọi chỗ để không sót mảng xám.
  svg = svg.split("#b9b9b9").join(LAND_COLOR);

  await mkdir(path.dirname(outPath), { recursive: true });

  // Kéo đúng tỉ lệ equirectangular chuẩn 2:1 (viewBox gốc ~1.79:1 — méo dọc nhẹ ~11%, không
  // đáng kể với quả cầu phong cách đồ chơi, không cần crop/pad phức tạp).
  const buffer = Buffer.from(svg);
  await sharp(buffer, { density: 220 })
    .resize(2048, 1024, { fit: "fill" })
    .flatten({ background: OCEAN_COLOR })
    .jpeg({ quality: 90 })
    .toFile(outPath);

  console.log("-> " + path.relative(root, outPath));
}

main();
