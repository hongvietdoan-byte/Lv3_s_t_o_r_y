// Mã hoá nội dung thư (letter-source.txt, KHÔNG commit) thành js/letterData.js
// (ciphertext, an toàn để commit public). Chỉ ai biết đúng passcode mới giải mã được
// trên trình duyệt — xem js/passcode.js (deriveLoveKey) và js/letterReveal.js (decryptLetter).
//
// Cách dùng: node tools/encrypt-letter.js <passcode> [đường-dẫn-file-nguồn]
// Mặc định đọc từ letter-source.txt ở gốc dự án.
//
// QUAN TRỌNG: SALT và ITERATIONS ở đây phải khớp với hằng số trong js/passcode.js,
// nếu đổi 1 bên thì phải đổi cả 2.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SALT = Buffer.from('love-story-hn-lincoln-2026', 'utf8');
const ITERATIONS = 150000;

const passcode = process.argv[2];
if (!passcode) {
  console.error('Thiếu passcode. Dùng: node tools/encrypt-letter.js <passcode> [file nguồn]');
  process.exit(1);
}

const srcPath = process.argv[3] || path.join(__dirname, '..', 'letter-source.txt');
const outPath = path.join(__dirname, '..', 'js', 'letterData.js');

const plaintext = fs.readFileSync(srcPath, 'utf8');
const key = crypto.pbkdf2Sync(passcode.trim().toLowerCase(), SALT, ITERATIONS, 32, 'sha256');
const iv = crypto.randomBytes(12);

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
// Web Crypto AES-GCM decrypt mong đợi auth tag nối liền sau ciphertext.
const payload = Buffer.concat([encrypted, cipher.getAuthTag()]);

const out = `// Tự động sinh bởi tools/encrypt-letter.js — KHÔNG chỉnh tay, không chứa plaintext.
window.LETTER_CIPHERTEXT = {
  iv: "${iv.toString('base64')}",
  data: "${payload.toString('base64')}"
};
`;

fs.writeFileSync(outPath, out);
console.log('Đã ghi ' + outPath + ' từ ' + srcPath);
