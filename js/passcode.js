(function () {
  // SHA-256 hex của passcode "anhyeuem" (chữ thường, đã trim), để plaintext không nằm trong view-source.
  var PASSCODE_HASH = '8fcb25879a66b007def5cf63d7960fdfa2ee1f2b056d9e8e6008e7873a7af202';

  // Phải khớp với SALT/ITERATIONS trong tools/encrypt-letter.js.
  var KDF_SALT = new TextEncoder().encode('love-story-hn-lincoln-2026');
  var KDF_ITERATIONS = 150000;

  // Suy ra khoá AES-GCM từ passcode để letterReveal.js giải mã thư — đây là lớp
  // bảo mật thật (không đọc được thư nếu không có đúng passcode), khác với việc
  // chỉ ẩn/hiện bằng CSS.
  window.deriveLoveKey = async function (passcode) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(passcode.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: KDF_SALT, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  };

  var params = new URLSearchParams(location.search);
  if (params.get('debug')) return; // main.js tự xử lý debug bypass

  var input = document.getElementById('passcode-input');
  var submitBtn = document.getElementById('passcode-submit');
  var errorEl = document.getElementById('passcode-error');

  async function sha256Hex(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
    input.classList.remove('is-shaking');
    void input.offsetWidth; // restart animation
    input.classList.add('is-shaking');
  }

  async function tryUnlock() {
    var value = input.value.trim().toLowerCase();
    if (!value) return;
    var hash = await sha256Hex(value);
    if (hash === PASSCODE_HASH) {
      window.__loveKey = await window.deriveLoveKey(value);
      document.body.dataset.scene = 'countdown';
      if (window.initExperience) window.initExperience('countdown');
    } else {
      showError('mật khẩu chưa đúng, thử lại nhé 🥺');
    }
  }

  submitBtn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryUnlock();
  });
})();
