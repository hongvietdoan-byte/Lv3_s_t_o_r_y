import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

var FLOWER_COUNT = 99;
var GRIP_Y = 0.05;

var scene, camera, renderer, composer;
var bouquetGroup, flowerMeshes = [], sparkleMeshes = [];
var initPromise = null;
var breatheTween = null;

function makeRadialGlowTexture(rgb) {
  var size = 128;
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext('2d');
  var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(' + rgb + ',0.9)');
  g.addColorStop(0.5, 'rgba(' + rgb + ',0.35)');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ---- hình học từng loại hoa, dựng 1 lần rồi tái dùng cho mọi bông cùng loại (giữ hiệu năng) ----
function makeTulipGeometry() {
  var pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.022, 0.018),
    new THREE.Vector2(0.05, 0.055),
    new THREE.Vector2(0.058, 0.095),
    new THREE.Vector2(0.044, 0.125),
    new THREE.Vector2(0.05, 0.14)
  ];
  return new THREE.LatheGeometry(pts, 8);
}

function makeRoseOuterGeometry() {
  var pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.05, 0.01),
    new THREE.Vector2(0.068, 0.04),
    new THREE.Vector2(0.06, 0.075),
    new THREE.Vector2(0.03, 0.09)
  ];
  return new THREE.LatheGeometry(pts, 8);
}
function makeRoseInnerGeometry() {
  return new THREE.ConeGeometry(0.026, 0.05, 7, 1, true);
}

function makeDaisyPetalsGeometry() {
  var shape = new THREE.Shape();
  var petals = 8, outerR = 0.062, innerR = 0.02;
  for (var i = 0; i <= petals * 2; i++) {
    var ang = (i / (petals * 2)) * Math.PI * 2;
    var r = i % 2 === 0 ? outerR : innerR;
    var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  var geo = new THREE.ShapeGeometry(shape, 2);
  geo.rotateX(-Math.PI / 2);
  return geo;
}
function makeDaisyCenterGeometry() {
  var geo = new THREE.CircleGeometry(0.02, 10);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function makeLeafGeometry() {
  var shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.02, 0.06, 0, 0.14);
  shape.quadraticCurveTo(-0.02, 0.06, 0, 0);
  var geo = new THREE.ShapeGeometry(shape, 4);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function buildRabbit() {
  var group = new THREE.Group();
  var furMat = new THREE.MeshStandardMaterial({ color: 0xfdf9f2, roughness: 0.6 });
  var pinkMat = new THREE.MeshStandardMaterial({ color: 0xffc2d1, roughness: 0.5 });
  var body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), furMat);
  body.scale.set(1, 1.1, 0.85);
  group.add(body);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), furMat);
  head.position.y = 0.13;
  group.add(head);
  var hasCapsule = typeof THREE.CapsuleGeometry === 'function';
  [-1, 1].forEach(function (side) {
    var earGeo = hasCapsule ? new THREE.CapsuleGeometry(0.014, 0.07, 3, 6) : new THREE.CylinderGeometry(0.014, 0.014, 0.09, 6);
    var ear = new THREE.Mesh(earGeo, furMat);
    ear.position.set(side * 0.028, 0.21, -0.005);
    ear.rotation.z = side * 0.18;
    group.add(ear);
    var innerEarGeo = hasCapsule ? new THREE.CapsuleGeometry(0.007, 0.045, 3, 6) : new THREE.CylinderGeometry(0.007, 0.007, 0.06, 6);
    var innerEar = new THREE.Mesh(innerEarGeo, pinkMat);
    innerEar.position.set(side * 0.028, 0.2, 0.008);
    innerEar.rotation.z = side * 0.18;
    group.add(innerEar);
  });
  var nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), pinkMat);
  nose.position.set(0, 0.12, 0.058);
  group.add(nose);
  return group;
}

// PerspectiveCamera.fov là FOV DỌC — trên màn hình dọc (mobile portrait, aspect < 1) FOV NGANG
// sẽ hẹp hơn nhiều, dễ cắt mất 2 bên bó hoa nếu chỉ đặt khoảng cách camera cố định. Tính
// khoảng cách theo CẢ 2 chiều (rộng/cao nội dung), lấy giá trị xa hơn để không bị cắt dù màn
// hình dọc hay ngang.
function fitCameraToContent() {
  var halfWidth = 0.75, top = 0.82, bottom = -0.32;
  var centerY = (top + bottom) / 2;
  var halfHeight = (top - bottom) / 2;
  var vFov = camera.fov * Math.PI / 180;
  var distForHeight = halfHeight / Math.tan(vFov / 2);
  var hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  var distForWidth = halfWidth / Math.tan(hFov / 2);
  var dist = Math.max(distForHeight, distForWidth) * 1.12;
  camera.position.set(0, centerY, dist);
  camera.lookAt(0, centerY, 0);
}

function initScene() {
  if (initPromise) return initPromise;
  initPromise = new Promise(function (resolve) {
    var canvas = document.getElementById('bouquet-canvas');
    var wrap = document.getElementById('bouquet-hero');
    var width = wrap.clientWidth || 400, height = wrap.clientHeight || 400;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 20);
    fitCameraToContent();

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene.add(new THREE.AmbientLight(0xffe8ee, 1.0));
    var key = new THREE.DirectionalLight(0xfff4e8, 0.75);
    key.position.set(1.2, 1.6, 1.8);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xffd6e6, 0.35);
    fill.position.set(-1.4, 0.6, 1.0);
    scene.add(fill);

    bouquetGroup = new THREE.Group();
    scene.add(bouquetGroup);

    // ---- giấy gói hình phễu + nơ ru-băng ----
    var wrapMat = new THREE.MeshStandardMaterial({ color: 0xffc9dc, roughness: 0.6, side: THREE.DoubleSide });
    var wrapCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 24, 1, true), wrapMat);
    wrapCone.position.y = -0.22;
    bouquetGroup.add(wrapCone);

    var ribbonMat = new THREE.MeshStandardMaterial({ color: 0xe0546f, roughness: 0.45 });
    [-1, 1].forEach(function (side) {
      var loop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16), ribbonMat);
      loop.position.set(side * 0.045, GRIP_Y + 0.02, 0.06);
      loop.rotation.y = side * 0.5;
      bouquetGroup.add(loop);
    });
    var ribbonKnot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), ribbonMat);
    ribbonKnot.position.set(0, GRIP_Y + 0.02, 0.06);
    bouquetGroup.add(ribbonKnot);

    // ---- thỏ trắng đơn giản, ló ra trước miệng giấy gói ----
    var rabbit = buildRabbit();
    rabbit.position.set(0, GRIP_Y - 0.02, 0.14);
    rabbit.scale.setScalar(0.9);
    bouquetGroup.add(rabbit);

    // ---- 99 bông hoa, 3 loại, toả hình quạt/dome hội tụ về điểm cầm ----
    var tulipGeo = makeTulipGeometry();
    var roseOuterGeo = makeRoseOuterGeometry();
    var roseInnerGeo = makeRoseInnerGeometry();
    var daisyPetalGeo = makeDaisyPetalsGeometry();
    var daisyCenterGeo = makeDaisyCenterGeometry();
    var leafGeo = makeLeafGeometry();
    var stemGeo = new THREE.CylinderGeometry(0.006, 0.008, 1, 5);
    stemGeo.translate(0, 0.5, 0); // gốc tại đáy để scale theo chiều dài dễ dàng
    var stemMat = new THREE.MeshStandardMaterial({ color: 0x4f8f52, roughness: 0.7 });
    var leafMat = new THREE.MeshStandardMaterial({ color: 0x5aa15c, roughness: 0.65, side: THREE.DoubleSide });

    var palettes = {
      tulip: [0xffffff, 0xff8a6b, 0xffffff, 0xffb0c4],
      rose: [0xe0546f, 0xff8fab, 0xd1495b],
      daisy: [0xffffff, 0xfff0d6]
    };
    var daisyCenterColor = 0xffd166;

    var types = [];
    for (var ti = 0; ti < FLOWER_COUNT; ti++) types.push(ti % 3 === 0 ? 'tulip' : ti % 3 === 1 ? 'rose' : 'daisy');
    // xáo trộn để xen kẽ ngẫu nhiên nhưng vẫn cân đối 33/33/33
    for (var sw = types.length - 1; sw > 0; sw--) {
      var j = Math.floor(Math.random() * (sw + 1));
      var tmp = types[sw]; types[sw] = types[j]; types[j] = tmp;
    }

    var grip = new THREE.Vector3(0, GRIP_Y, 0);
    var golden = Math.PI * (3 - Math.sqrt(5));
    var slots = [];
    for (var i = 0; i < FLOWER_COUNT; i++) {
      var t = (i + 0.5) / FLOWER_COUNT;
      var incl = Math.min(Math.acos(1 - t * 1.15), Math.PI * 0.4);
      var azimuth = i * golden;
      var dir = new THREE.Vector3(
        Math.sin(incl) * Math.cos(azimuth),
        Math.cos(incl),
        Math.sin(incl) * Math.sin(azimuth) * 0.65 + 0.35
      ).normalize();
      var stemLen = 0.5 + Math.random() * 0.16;
      var tip = grip.clone().add(dir.clone().multiplyScalar(stemLen));
      slots.push({ dir: dir, tip: tip, stemLen: stemLen, type: types[i] });
    }
    // sắp theo chiều cao đầu hoa để mọc từ dưới lên
    slots.sort(function (a, b) { return a.tip.y - b.tip.y; });

    slots.forEach(function (slot) {
      var stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.copy(grip);
      stem.scale.y = slot.stemLen;
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), slot.dir);
      bouquetGroup.add(stem);

      var flowerGroup = new THREE.Group();
      flowerGroup.position.copy(slot.tip);
      flowerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), slot.dir);
      flowerGroup.rotation.y += Math.random() * Math.PI * 2;

      if (slot.type === 'tulip') {
        var color = palettes.tulip[Math.floor(Math.random() * palettes.tulip.length)];
        var mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.55, side: THREE.DoubleSide });
        flowerGroup.add(new THREE.Mesh(tulipGeo, mat));
      } else if (slot.type === 'rose') {
        var rcolor = palettes.rose[Math.floor(Math.random() * palettes.rose.length)];
        var rmat = new THREE.MeshStandardMaterial({ color: rcolor, roughness: 0.5, side: THREE.DoubleSide });
        flowerGroup.add(new THREE.Mesh(roseOuterGeo, rmat));
        var inner = new THREE.Mesh(roseInnerGeo, rmat);
        inner.position.y = 0.02;
        inner.rotation.y = 0.6;
        flowerGroup.add(inner);
      } else {
        var dcolor = palettes.daisy[Math.floor(Math.random() * palettes.daisy.length)];
        var dmat = new THREE.MeshStandardMaterial({ color: dcolor, roughness: 0.55, side: THREE.DoubleSide });
        flowerGroup.add(new THREE.Mesh(daisyPetalGeo, dmat));
        var centerMat = new THREE.MeshStandardMaterial({ color: daisyCenterColor, roughness: 0.5 });
        var center = new THREE.Mesh(daisyCenterGeo, centerMat);
        center.position.y = 0.002;
        flowerGroup.add(center);
      }

      bouquetGroup.add(flowerGroup);
      flowerMeshes.push(flowerGroup);
    });

    // ---- vài lá xanh xen giữa cuống ----
    for (var li = 0; li < 14; li++) {
      var t2 = Math.random();
      var incl2 = Math.min(Math.acos(1 - t2 * 1.1), Math.PI * 0.4);
      var az2 = Math.random() * Math.PI * 2;
      var dir2 = new THREE.Vector3(Math.sin(incl2) * Math.cos(az2), Math.cos(incl2), Math.sin(incl2) * Math.sin(az2) * 0.65 + 0.35).normalize();
      var leafPos = grip.clone().add(dir2.multiplyScalar(0.3 + Math.random() * 0.2));
      var leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.copy(leafPos);
      leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      leaf.rotation.y += Math.random() * Math.PI * 2;
      leaf.scale.setScalar(0.8 + Math.random() * 0.5);
      bouquetGroup.add(leaf);
    }

    // ---- sparkle lấp lánh quanh bó hoa ----
    var sparkleTex = makeRadialGlowTexture('255,255,255');
    for (var si = 0; si < 10; si++) {
      var sMat = new THREE.MeshBasicMaterial({ map: sparkleTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      var sMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), sMat);
      var ang = Math.random() * Math.PI * 2;
      var rad = 0.35 + Math.random() * 0.25;
      sMesh.position.set(Math.cos(ang) * rad, 0.15 + Math.random() * 0.55, Math.sin(ang) * rad * 0.5 + 0.15);
      scene.add(sMesh);
      sparkleMeshes.push(sMesh);
    }

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    var bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.5, 0.78);
    composer.addPass(bloom);

    function onResize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fitCameraToContent();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    function tick() {
      composer.render();
      requestAnimationFrame(tick);
    }
    tick();

    resolve(true);
  });
  return initPromise;
}

// Hiệu ứng "mọc từng lớp" từ dưới lên (flowerMeshes đã sắp theo chiều cao) + lắc nhẹ liên tục
// sau khi mọc xong, cho cả cụm hoa "sinh động" — 1 lệnh gsap.stagger duy nhất, không phải 99
// tween riêng lẻ, vẫn giữ hiệu năng.
window.playBouquetReveal = function () {
  initScene().then(function () {
    if (breatheTween) { breatheTween.kill(); breatheTween = null; }
    if (!flowerMeshes.length) return;

    gsap.set(flowerMeshes.map(function (f) { return f.scale; }), { x: 0.001, y: 0.001, z: 0.001 });
    gsap.set(bouquetGroup.scale, { x: 1, y: 1, z: 1 });
    gsap.set(sparkleMeshes.map(function (s) { return s.material; }), { opacity: 0 });

    var tl = gsap.timeline();
    tl.to(flowerMeshes.map(function (f) { return f.scale; }), {
      x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(2)',
      stagger: { each: 0.012, from: 'start' }
    })
      .call(function () {
        breatheTween = gsap.to(bouquetGroup.scale, {
          x: 1.02, y: 1.02, z: 1.02, duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true
        });
        gsap.to(flowerMeshes.map(function (f) { return f.rotation; }), {
          z: '+=0.05', duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true,
          stagger: { each: 0.02, from: 'random' }
        });
        sparkleMeshes.forEach(function (s, idx) {
          gsap.to(s.material, {
            opacity: 0.85, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true,
            delay: idx * 0.35, repeatDelay: 1.2
          });
        });
      }, null, '-=0.1');
  });
};
