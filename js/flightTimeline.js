import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ---- toạ độ địa lý ----
var HANOI = { lat: 21.0285, lng: 105.8542 };
var LINCOLN = { lat: 53.2307, lng: -0.5406 };

// Quy ước khớp UV mặc định của THREE.SphereGeometry cho texture equirectangular.
function latLngToVector3(lat, lng, radius) {
  var phi = (90 - lat) * (Math.PI / 180);
  var theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Góc xoay quanh trục Y để hướng 1 điểm trên mặt cầu (đã chuẩn hoá) ra chính diện camera (+Z).
function frontYawFor(dir) {
  return Math.atan2(-dir.x, dir.z);
}

var SPHERE_RADIUS = 0.95;
var GLOW_SIZE = 6.4;
var CHASE_NEAR = 0.55; // khoảng cách camera-máy bay lúc cất/hạ cánh
var CHASE_FAR = 4.2; // khoảng cách lúc giữa hành trình (lùi ra thấy cả quả cầu)
var MAX_BANK = 0.5; // radian, nghiêng cánh tối đa giữa hành trình

// Nhãn tên vùng/nước hiện dọc hành trình (toạ độ gần đúng, chỉ để đặt nhãn — không cần chính
// xác tuyệt đối biên giới).
var ROUTE_LABELS = [
  { name: 'VIỆT NAM', lat: 15.5, lng: 106.5 },
  { name: 'CHINA', lat: 33, lng: 106 },
  { name: 'INDIA', lat: 21, lng: 80 },
  { name: 'THAILAND', lat: 13, lng: 101 },
  { name: 'EUROPE', lat: 50, lng: 12 },
  { name: 'FRANCE', lat: 46.5, lng: 2 },
  { name: 'ITALY', lat: 43, lng: 12.5 },
  { name: 'UK', lat: 54, lng: -2.5 }
];

var scene, camera, renderer, composer, bloomPass;
var globeGroup, earthSphere, planeGroup, flashMesh, curve, pathGroup;
var hanoiDir, lincolnDir, hanoiYaw = 0, lincolnYawTarget = 0;
var labelEls = [];
var labelAnchors = [];
var initPromise = null;

// Sprite glow toả tròn dựng bằng canvas radial-gradient (không phải khối màu phẳng)
// — tránh cháy sáng đều cả khung hình khi cộng dồn Bloom.
function makeRadialGlowTexture(rgb) {
  var size = 256;
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext('2d');
  var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(' + rgb + ',0.85)');
  g.addColorStop(0.4, 'rgba(' + rgb + ',0.35)');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Máy bay đồ chơi bụ bẫm dựng bằng khối hình học Three.js thuần (không texture ảnh) — mũi tròn
// to, cánh quạt quay liên tục, chở 1 chồng hộp quà trên lưng, giống ảnh tham khảo storyboard.
// Quy ước trục cục bộ: +X = mũi (hướng bay), +Y = lên, +Z = sang phải.
function buildPlaneMesh() {
  var group = new THREE.Group();
  // transparent:true ngay từ đầu (dù opacity=1) để fade ra lúc hạ cánh không cần đổi
  // "transparent" giữa chừng — đổi thuộc tính đó lúc runtime ép Three.js biên dịch lại shader,
  // dễ giật hình 1 frame.
  var bodyMat = new THREE.MeshStandardMaterial({ color: 0xf3f6fb, roughness: 0.5, metalness: 0.03, transparent: true });
  var accentMat = new THREE.MeshStandardMaterial({ color: 0xe0546f, roughness: 0.5, metalness: 0.03, transparent: true });
  var propMat = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.4, metalness: 0.1, transparent: true });
  var giftMats = [
    new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5, transparent: true }),
    new THREE.MeshStandardMaterial({ color: 0x7fd8ff, roughness: 0.5, transparent: true }),
    new THREE.MeshStandardMaterial({ color: 0xc792ff, roughness: 0.5, transparent: true })
  ];
  var ribbonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true });

  // thân bụ bẫm: mũi cầu to + thân capsule ngắn (tỉ lệ tròn/ngắn hơn bản trước rất nhiều)
  var noseRadius = 0.075;
  var nose = new THREE.Mesh(new THREE.SphereGeometry(noseRadius, 16, 12), bodyMat);
  nose.position.x = 0.09;
  group.add(nose);

  var fuselageGeo = typeof THREE.CapsuleGeometry === 'function'
    ? new THREE.CapsuleGeometry(0.058, 0.09, 4, 12)
    : new THREE.CylinderGeometry(0.058, 0.058, 0.2, 12);
  var fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
  fuselage.rotation.z = Math.PI / 2; // mặc định dọc theo Y -> xoay để mũi hướng +X
  fuselage.position.x = -0.03;
  group.add(fuselage);

  // cánh quạt: xoay nhanh liên tục quanh trục mũi (+X), tách biệt animation hướng bay/nghiêng
  var propGroup = new THREE.Group();
  propGroup.position.x = 0.09 + noseRadius + 0.005;
  var bladeGeo = new THREE.BoxGeometry(0.008, 0.11, 0.018);
  for (var bi = 0; bi < 3; bi++) {
    var blade = new THREE.Mesh(bladeGeo, propMat);
    blade.rotation.x = (bi / 3) * Math.PI * 2;
    propGroup.add(blade);
  }
  var hub = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), propMat);
  propGroup.add(hub);
  group.add(propGroup);
  group.userData.propeller = propGroup;

  var wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.4), accentMat);
  wing.position.set(-0.02, -0.01, 0);
  group.add(wing);

  var tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.055), accentMat);
  tailFin.position.set(-0.1, 0.045, 0);
  group.add(tailFin);

  var stab = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.01, 0.17), accentMat);
  stab.position.set(-0.1, 0.005, 0);
  group.add(stab);

  // chồng hộp quà nhỏ trên lưng máy bay
  var giftGroup = new THREE.Group();
  var giftSizes = [0.075, 0.06, 0.05];
  var giftY = 0.075;
  for (var gi = 0; gi < giftSizes.length; gi++) {
    var s = giftSizes[gi];
    giftY += s / 2;
    var box = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), giftMats[gi % giftMats.length]);
    box.position.set(-0.01 + gi * 0.004, giftY, 0);
    box.rotation.y = gi * 0.35;
    giftGroup.add(box);
    var ribbonX = new THREE.Mesh(new THREE.BoxGeometry(s * 1.06, s * 0.16, s * 1.06), ribbonMat);
    ribbonX.position.copy(box.position);
    giftGroup.add(ribbonX);
    giftY += s / 2 + 0.006;
  }
  group.add(giftGroup);

  group.userData.materials = [bodyMat, accentMat, propMat, ribbonMat].concat(giftMats);
  return group;
}

// Toà nhà đồ chơi nhỏ đánh dấu điểm Hà Nội (mái cong kiểu Việt) / Lincoln (tháp nhọn kiểu nhà
// thờ) — cụm khối hộp/nón đơn giản, đặt đứng trên bề mặt cầu tại đúng toạ độ (trục "lên" của
// cụm = pháp tuyến bề mặt tại điểm đó, gán ở nơi gọi hàm này).
function buildLandmark(style) {
  var group = new THREE.Group();
  var wallMat = new THREE.MeshStandardMaterial({ color: style === 'pagoda' ? 0xf2c879 : 0xe9e2d6, roughness: 0.6 });
  var roofMat = new THREE.MeshStandardMaterial({ color: style === 'pagoda' ? 0xd1495b : 0x7a6f8a, roughness: 0.55 });

  if (style === 'pagoda') {
    for (var i = 0; i < 3; i++) {
      var s = 1 - i * 0.26;
      var y = i * 0.045;
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.05 * s, 0.03, 8), wallMat);
      body.position.y = y;
      group.add(body);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.035, 8), roofMat);
      roof.position.y = y + 0.03;
      group.add(roof);
    }
    var flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 4), wallMat);
    flagPole.position.set(0.09, 0.04, 0);
    group.add(flagPole);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xda251d, side: THREE.DoubleSide }));
    flag.position.set(0.1, 0.07, 0);
    group.add(flag);
  } else {
    var base = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.09), wallMat);
    base.position.y = 0.055;
    group.add(base);
    var spire = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 6), roofMat);
    spire.position.y = 0.11 + 0.065;
    group.add(spire);
    var sideA = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.045), wallMat);
    sideA.position.set(0.075, 0.035, 0);
    group.add(sideA);
    var sideB = sideA.clone();
    sideB.position.x = -0.075;
    group.add(sideB);
  }
  return group;
}

// Đặt 1 object3D đứng trên bề mặt cầu tại toạ độ lat/lng — trục lên (+Y cục bộ) trùng pháp
// tuyến bề mặt tại điểm đó, cha là globeGroup nên tự xoay theo quả cầu.
function placeOnSphere(object, lat, lng, radius) {
  var pos = latLngToVector3(lat, lng, radius);
  object.position.copy(pos);
  var normal = pos.clone().normalize();
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return object;
}

function initScene() {
  if (initPromise) return initPromise;
  initPromise = new Promise(function (resolve) {
    var canvas = document.getElementById('globe-canvas');
    var wrap = document.getElementById('map-wrap');
    var width = wrap.clientWidth, height = wrap.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05040f);
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    // ---- sao nền, tự dựng, độc lập với texture Trái Đất ----
    var starGeo = new THREE.BufferGeometry();
    var starCount = 500;
    var starPos = new Float32Array(starCount * 3);
    for (var i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 60;
      starPos[i + 1] = (Math.random() - 0.5) * 60;
      starPos[i + 2] = (Math.random() - 0.5) * 60 - 10;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeo, starMat));

    scene.add(new THREE.AmbientLight(0x8894c9, 0.95));
    var sun = new THREE.DirectionalLight(0xfff2de, 0.55);
    sun.position.set(3, 2, 4);
    scene.add(sun);
    var planeLight = new THREE.DirectionalLight(0xffffff, 0.2);
    planeLight.position.set(-2, 1, 2);
    scene.add(planeLight);

    var loader = new THREE.TextureLoader();
    var earthTexture = loader.load('assets/img/earth-toy-texture.jpg', function () {
      if (!settled) { settled = true; resolve(true); }
    }, undefined, function () {
      if (!settled) { settled = true; resolve(true); }
    });
    earthTexture.encoding = THREE.sRGBEncoding;
    var settled = false;

    // ---- hào quang tròn phía sau quả cầu ----
    var glowGeo = new THREE.PlaneGeometry(GLOW_SIZE, GLOW_SIZE);
    var glowMat = new THREE.MeshBasicMaterial({
      map: makeRadialGlowTexture('111,179,255'), transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = -0.3;
    scene.add(glowMesh);

    // ---- quả cầu Trái Đất thật, xoay được, hiện xuyên suốt (không còn pha ảnh phẳng) ----
    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    var sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
    var sphereMat = new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.85, metalness: 0.05 });
    earthSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthSphere);

    hanoiDir = latLngToVector3(HANOI.lat, HANOI.lng, 1);
    lincolnDir = latLngToVector3(LINCOLN.lat, LINCOLN.lng, 1);
    hanoiYaw = frontYawFor(hanoiDir);
    var lincolnYaw = frontYawFor(lincolnDir);
    var delta = lincolnYaw - hanoiYaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    lincolnYawTarget = hanoiYaw + delta;
    globeGroup.rotation.y = hanoiYaw;

    // ---- toà nhà đồ chơi đánh dấu Hà Nội / Lincoln, đứng trên bề mặt cầu ----
    var hanoiLandmark = buildLandmark('pagoda');
    placeOnSphere(hanoiLandmark, HANOI.lat, HANOI.lng, SPHERE_RADIUS);
    globeGroup.add(hanoiLandmark);
    var lincolnLandmark = buildLandmark('cathedral');
    placeOnSphere(lincolnLandmark, LINCOLN.lat, LINCOLN.lng, SPHERE_RADIUS);
    globeGroup.add(lincolnLandmark);

    // ---- neo 3D cho nhãn tên vùng/nước (chiếu sang HTML overlay mỗi frame) ----
    var labelLayer = document.getElementById('journey-labels');
    ROUTE_LABELS.forEach(function (info) {
      var anchor = new THREE.Object3D();
      placeOnSphere(anchor, info.lat, info.lng, SPHERE_RADIUS * 1.01);
      globeGroup.add(anchor);
      labelAnchors.push(anchor);

      var el = document.createElement('span');
      el.className = 'journey-label';
      el.textContent = info.name;
      if (labelLayer) labelLayer.appendChild(el);
      labelEls.push(el);
    });

    planeGroup = buildPlaneMesh();
    planeGroup.visible = false;
    // Máy bay KHÔNG parent vào globeGroup — quỹ đạo tính trực tiếp trong world-space (xem
    // playFlight) để không bao giờ bị quả cầu đang xoay che khuất giữa chừng.
    scene.add(planeGroup);

    // flash bừng sáng nhẹ lúc máy bay hạ cánh, dựa vào Bloom để bung sáng thật
    var flashMat = new THREE.MeshBasicMaterial({
      map: makeRadialGlowTexture('255,243,214'), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), flashMat);
    flashMesh.visible = false;
    scene.add(flashMesh);

    camera.position.set(-1.3, 0.55, 2.4);
    camera.lookAt(0, 0, 0);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.4, 0.72);
    composer.addPass(bloomPass);

    function onResize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    function tick() {
      if (planeGroup.visible && planeGroup.userData.propeller) {
        planeGroup.userData.propeller.rotation.x += 0.9;
      }
      composer.render();
      requestAnimationFrame(tick);
    }
    tick();

    // an toàn: nếu sự kiện load/error của texture không bắn vì lý do gì đó
    setTimeout(function () { if (!settled) { settled = true; resolve(true); } }, 4000);
  });
  return initPromise;
}

// Hướng máy bay theo tiếp tuyến thật của quỹ đạo (khối 3D thật nên có thể xoay/nghiêng thật,
// không cần "luôn quay mặt về camera" như billboard nữa) + nghiêng cánh (bank) vào cua giữa
// hành trình, thẳng cánh lúc cất/hạ cánh.
function updatePlaneOrientation(t) {
  var tangent = curve.getTangent(t).normalize();
  var worldUp = new THREE.Vector3(0, 1, 0);
  var right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
  if (right.lengthSq() < 1e-6) right.set(0, 0, 1);
  var up = new THREE.Vector3().crossVectors(right, tangent).normalize();
  var basis = new THREE.Matrix4().makeBasis(tangent, up, right);
  planeGroup.quaternion.setFromRotationMatrix(basis);
  planeGroup.rotateX(MAX_BANK * Math.sin(t * Math.PI));
}

// Camera bám theo máy bay xuyên suốt trọn hành trình: gần lúc cất/hạ cánh, lùi xa (thấy cả
// máy bay + quả cầu đang xoay) ở giữa hành trình rồi tiến lại gần — 1 hàm liên tục theo t,
// không tách rời thành các pha camera tĩnh/động riêng biệt.
// Hướng lùi camera = chủ yếu THEO TRỤC XUYÊN TÂM (ra khỏi tâm quả cầu) chứ không phải ngược
// tiếp tuyến — vì ở t gần 0/1 (máy bay còn sát mặt cầu lúc cất/hạ cánh), lùi ngược tiếp tuyến
// dễ đẩy camera thụt vào TRONG quả cầu (tiếp tuyến lúc đó hướng dọc theo mặt cầu, không hướng ra
// ngoài). Xuyên tâm đảm bảo camera luôn ở ngoài mặt cầu tại mọi t.
function computeChasePos(t, pos, tangent) {
  var worldUp = new THREE.Vector3(0, 1, 0);
  var radialDir = pos.clone().normalize();
  var dist = CHASE_NEAR + (CHASE_FAR - CHASE_NEAR) * Math.sin(t * Math.PI);
  // "up" chiếm trọng số lớn và KHÔNG phụ thuộc hướng xuyên tâm — nếu chỉ đẩy camera theo đúng
  // trục xuyên tâm, camera/máy bay/tâm quả cầu sẽ thẳng hàng và quả cầu che khuất máy bay giữa
  // hành trình (đã gặp bug này). Trọng số "up" lớn phá thế thẳng hàng đó, cho góc nhìn chếch từ
  // trên xuống thay vì xuyên thẳng qua tâm.
  var offsetDir = radialDir.multiplyScalar(0.3)
    .add(tangent.clone().multiplyScalar(-0.3))
    .add(worldUp.multiplyScalar(0.85))
    .normalize();
  return pos.clone().add(offsetDir.multiplyScalar(dist));
}

function updateFlight(t) {
  var pos = curve.getPoint(t);
  planeGroup.position.copy(pos);
  globeGroup.rotation.y = hanoiYaw + (lincolnYawTarget - hanoiYaw) * t;
  updatePlaneOrientation(t);

  var tangent = curve.getTangent(t).normalize();
  camera.position.copy(computeChasePos(t, pos, tangent));
  camera.lookAt(pos);
  updateLabels();
}

// Chiếu neo 3D (con của globeGroup, tự xoay theo quả cầu) sang toạ độ màn hình mỗi frame; ẩn
// nhãn khi điểm neo đang ở mặt khuất của quả cầu (pháp tuyến bề mặt quay lưng lại camera).
var __labelWorldPos = new THREE.Vector3();
function updateLabels() {
  var wrap = document.getElementById('map-wrap');
  if (!wrap) return;
  var w = wrap.clientWidth, h = wrap.clientHeight;
  for (var i = 0; i < labelAnchors.length; i++) {
    var anchor = labelAnchors[i];
    var el = labelEls[i];
    anchor.getWorldPosition(__labelWorldPos);
    var normal = __labelWorldPos.clone().normalize();
    var toCamera = camera.position.clone().sub(__labelWorldPos).normalize();
    var facing = normal.dot(toCamera);
    if (facing < 0.12) { el.style.opacity = 0; continue; }
    var ndc = __labelWorldPos.clone().project(camera);
    if (ndc.z > 1) { el.style.opacity = 0; continue; }
    var x = (ndc.x * 0.5 + 0.5) * w;
    var y = (1 - (ndc.y * 0.5 + 0.5)) * h;
    el.style.transform = 'translate(-50%, -50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    el.style.opacity = Math.min(1, (facing - 0.12) * 3.5);
  }
}

window.playFlight = function (onComplete) {
  initScene().then(function () {
    if (window.playMusic) window.playMusic();

    globeGroup.rotation.y = hanoiYaw;
    planeGroup.visible = false;
    planeGroup.scale.setScalar(1);
    planeGroup.userData.materials.forEach(function (m) { m.opacity = 1; });
    flashMesh.visible = false;
    flashMesh.material.opacity = 0;

    // Điểm đầu/cuối = vị trí world-space thật của Hà Nội/Lincoln đúng lúc chúng hướng ra
    // camera (khớp với globeGroup.rotation.y tại t=0 và t=1) — điểm giữa đẩy hẳn về phía
    // camera (+Z) để cung bay luôn nổi phía trước quả cầu, không lo bị che khuất khi quả
    // cầu xoay dở chừng.
    var yAxis = new THREE.Vector3(0, 1, 0);
    var startPos = hanoiDir.clone().multiplyScalar(SPHERE_RADIUS * 1.05).applyAxisAngle(yAxis, hanoiYaw);
    var endPos3D = lincolnDir.clone().multiplyScalar(SPHERE_RADIUS * 1.05).applyAxisAngle(yAxis, lincolnYawTarget);
    var midPos3D = startPos.clone().add(endPos3D).multiplyScalar(0.5);
    midPos3D.z += SPHERE_RADIUS * 1.7;
    midPos3D.y += SPHERE_RADIUS * 0.35;
    curve = new THREE.QuadraticBezierCurve3(startPos, midPos3D, endPos3D);
    planeGroup.position.copy(curve.getPoint(0));

    // đường bay nét đứt dọc quỹ đạo — chuỗi chấm tròn nhỏ (bền hơn LineDashedMaterial vốn phụ
    // thuộc device pixel ratio), cùng world-space với curve/planeGroup nên không cần cha globeGroup.
    if (pathGroup) scene.remove(pathGroup);
    pathGroup = new THREE.Group();
    var dotGeo = new THREE.SphereGeometry(0.014, 8, 8);
    var dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    var dotCount = 26;
    for (var di = 1; di < dotCount; di++) {
      if (di % 2 === 0) continue; // cách quãng cho hiệu ứng nét đứt
      var dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(curve.getPoint(di / dotCount));
      pathGroup.add(dot);
    }
    scene.add(pathGroup);

    // camera bắt đầu đúng ở vị trí chase-cam tại t=0 — cận cảnh Hà Nội, không cắt cảnh khi
    // máy bay xuất hiện và bắt đầu bay.
    var tangent0 = curve.getTangent(0).normalize();
    camera.position.copy(computeChasePos(0, curve.getPoint(0), tangent0));
    camera.lookAt(curve.getPoint(0));
    updateLabels();

    gsap.timeline({ onComplete: onComplete })
      // giữ khung cận cảnh Hà Nội 1 nhịp trước khi máy bay xuất hiện
      .to({}, { duration: 0.5 })
      .call(function () { planeGroup.visible = true; updateFlight(0); })
      .from(planeGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.4, ease: 'back.out(2)' })
      .to({}, {
        duration: 5.5, ease: 'power1.inOut',
        onUpdate: function () { updateFlight(this.progress()); }
      })
      .to({}, { duration: 0.3 })
      .call(function () {
        flashMesh.position.copy(planeGroup.position);
        flashMesh.visible = true;
      })
      .to(flashMesh.material, { opacity: 0.6, duration: 0.18, ease: 'power1.in' })
      .to(planeGroup.userData.materials, { opacity: 0, duration: 0.3 }, '<')
      .to(flashMesh.material, { opacity: 0, duration: 0.45, ease: 'power1.out' })
      .call(function () { planeGroup.visible = false; flashMesh.visible = false; });
  });
};
