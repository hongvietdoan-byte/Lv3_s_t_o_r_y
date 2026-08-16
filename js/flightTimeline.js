(function () {
  gsap.registerPlugin(MotionPathPlugin);

  // Toạ độ SVG (viewBox 640x440) của tâm quả cầu, Hà Nội và Lincoln —
  // phải khớp với index.html (#globe-camera, #flight-path, 2 map-pin).
  var VIEW_CENTER = { x: 320, y: 220 };
  var HANOI = { x: 445, y: 235 };
  var LINCOLN = { x: 195, y: 235 };
  var ZOOM_SCALE = 2.3;

  // translate(tx,ty) scale(s) áp lên điểm p cho ra s*p + t; muốn p trùng tâm
  // khung hình thì t = center - s*p.
  function zoomTo(point, scale) {
    return {
      x: VIEW_CENTER.x - scale * point.x,
      y: VIEW_CENTER.y - scale * point.y,
      scale: scale
    };
  }

  window.playFlight = function (onComplete) {
    var camera = document.getElementById('globe-camera');
    var plane = document.getElementById('plane-icon');
    var path = document.getElementById('flight-path');

    plane.removeAttribute('transform');
    gsap.set(plane, { opacity: 0 });

    var hanoiZoom = zoomTo(HANOI, ZOOM_SCALE);
    var lincolnZoom = zoomTo(LINCOLN, ZOOM_SCALE);
    gsap.set(camera, { x: hanoiZoom.x, y: hanoiZoom.y, scale: hanoiZoom.scale });

    gsap.timeline({ onComplete: onComplete })
      // zoom vào đúng vị trí Hà Nội trên quả cầu trước
      .to(camera, { x: hanoiZoom.x, y: hanoiZoom.y, scale: hanoiZoom.scale, duration: 0.6 })
      // rồi zoom out để lộ toàn cảnh quả cầu
      .to(camera, { x: 0, y: 0, scale: 1, duration: 1.1, ease: 'power2.inOut' }, '+=0.3')
      .to(plane, { opacity: 1, duration: 0.4 }, '-=0.3')
      .to(plane, {
        duration: 3.2,
        ease: 'power1.inOut',
        motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true }
      })
      // zoom vào Lincoln khi máy bay gần tới nơi
      .to(camera, { x: lincolnZoom.x, y: lincolnZoom.y, scale: lincolnZoom.scale, duration: 1.1, ease: 'power2.inOut' }, '-=1')
      .to(plane, { opacity: 0, duration: 0.5 }, '-=0.3');
  };
})();
