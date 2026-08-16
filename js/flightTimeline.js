(function () {
  var GLOBE_RADIUS = 2;
  var HANOI = { lat: 21.0285, lng: 105.8542 };
  var LINCOLN = { lat: 53.2307, lng: -0.5406 };

  // Toạ độ lat/lng (độ) -> vị trí trên mặt cầu bán kính radius. Quy ước khớp
  // với UV mặc định của THREE.SphereGeometry cho texture equirectangular.
  function latLngToVector3(lat, lng, radius) {
    var phi = (90 - lat) * (Math.PI / 180);
    var theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  var scene, camera, renderer, curve;
  var initPromise = null;

  function initScene() {
    if (initPromise) return initPromise;
    initPromise = new Promise(function (resolve) {
      var canvas = document.getElementById('globe-canvas');
      var wrap = document.getElementById('map-wrap');
      var width = wrap.clientWidth, height = wrap.clientHeight;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      var globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
      var loader = new THREE.TextureLoader();
      var settled = false;
      var texture = loader.load(
        'assets/img/earth-texture.jpg',
        function () { if (!settled) { settled = true; resolve(true); } },
        undefined,
        function () { if (!settled) { settled = true; resolve(false); } }
      );
      var globeMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
      scene.add(new THREE.Mesh(globeGeo, globeMat));

      // hào quang khí quyển mờ bao ngoài quả cầu
      var glowGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 64, 64);
      var glowMat = new THREE.MeshBasicMaterial({ color: 0x6fb3ff, transparent: true, opacity: 0.18, side: THREE.BackSide });
      scene.add(new THREE.Mesh(glowGeo, glowMat));

      scene.add(new THREE.AmbientLight(0x5a6a9a, 1.4));
      var sun = new THREE.DirectionalLight(0xffffff, 1.7);
      sun.position.set(3, 2, 4);
      scene.add(sun);

      // sao lấp lánh quanh quả cầu
      var starGeo = new THREE.BufferGeometry();
      var starCount = 400;
      var positions = new Float32Array(starCount * 3);
      for (var i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 60;
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: 0.85 });
      scene.add(new THREE.Points(starGeo, starMat));

      camera.position.set(0, 0, GLOBE_RADIUS * 3.4);
      camera.lookAt(0, 0, 0);

      var hanoiPos = latLngToVector3(HANOI.lat, HANOI.lng, GLOBE_RADIUS * 1.03);
      var lincolnPos = latLngToVector3(LINCOLN.lat, LINCOLN.lng, GLOBE_RADIUS * 1.03);
      var mid = hanoiPos.clone().add(lincolnPos).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 1.75);
      curve = new THREE.QuadraticBezierCurve3(hanoiPos, mid, lincolnPos);

      function onResize() {
        var w = wrap.clientWidth, h = wrap.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener('resize', onResize);

      function tick() {
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
      }
      tick();

      // an toàn: nếu sự kiện load/error của texture không bắn vì lý do gì đó
      setTimeout(function () { if (!settled) { settled = true; resolve(true); } }, 4000);
    });
    return initPromise;
  }

  function dirFromLatLng(pt) {
    return latLngToVector3(pt.lat, pt.lng, 1);
  }

  function updatePlanePosition(t, planeEl) {
    var pos = curve.getPoint(t);
    var projected = pos.clone().project(camera);
    var x = (projected.x * 0.5 + 0.5) * 100;
    var y = (1 - (projected.y * 0.5 + 0.5)) * 100;
    planeEl.style.left = x + '%';
    planeEl.style.top = y + '%';

    var aheadT = Math.min(t + 0.01, 1);
    var aheadProjected = curve.getPoint(aheadT).project(camera);
    var dx = aheadProjected.x - projected.x;
    var dy = -(aheadProjected.y - projected.y);
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);
    planeEl.style.transform = 'translate(-50%, -50%) rotate(' + angle + 'deg)';
  }

  window.playFlight = function (onComplete) {
    var planeEl = document.getElementById('plane-icon-2d');
    planeEl.style.opacity = 0;

    initScene().then(function (textureOk) {
      if (!textureOk) {
        // ảnh texture không tải được (hiếm khi xảy ra vì đã lưu local) —
        // quả cầu vẫn hiện nhưng chỉ có màu phẳng, không vỡ layout.
        console.warn('Không tải được texture Trái Đất, quả cầu hiện không có bản đồ.');
      }

      if (window.playMusic) window.playMusic();

      var hanoiDir = dirFromLatLng(HANOI);
      var lincolnDir = dirFromLatLng(LINCOLN);
      var closeDist = GLOBE_RADIUS * 1.55;
      var farDist = GLOBE_RADIUS * 3.4;

      var startPos = hanoiDir.clone().multiplyScalar(closeDist);
      camera.position.copy(startPos);
      camera.lookAt(0, 0, 0);

      var farPos = hanoiDir.clone().multiplyScalar(farDist);
      var lincolnClosePos = lincolnDir.clone().multiplyScalar(closeDist);
      var progress = { t: 0 };

      gsap.timeline({ onComplete: onComplete })
        // zoom out để lộ toàn cảnh quả cầu từ vị trí Hà Nội
        .to(camera.position, {
          x: farPos.x, y: farPos.y, z: farPos.z, duration: 1.3, ease: 'power2.inOut',
          onUpdate: function () { camera.lookAt(0, 0, 0); }
        }, 0.3)
        .to(planeEl, { opacity: 1, duration: 0.4 }, '-=0.4')
        .to(progress, {
          t: 1, duration: 3.2, ease: 'power1.inOut',
          onUpdate: function () { updatePlanePosition(progress.t, planeEl); }
        })
        // zoom vào Lincoln khi máy bay gần tới nơi
        .to(camera.position, {
          x: lincolnClosePos.x, y: lincolnClosePos.y, z: lincolnClosePos.z, duration: 1.2, ease: 'power2.inOut',
          onUpdate: function () { camera.lookAt(0, 0, 0); }
        }, '-=1')
        .to(planeEl, { opacity: 0, duration: 0.5 }, '-=0.3');
    });
  };
})();
