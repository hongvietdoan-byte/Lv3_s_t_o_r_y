(function () {
  gsap.registerPlugin(MotionPathPlugin);

  window.playFlight = function (onComplete) {
    var plane = document.getElementById('plane-icon');
    var path = document.getElementById('flight-path');

    // Bỏ transform tĩnh ban đầu để MotionPath toàn quyền điều khiển vị trí,
    // tránh cộng dồn translate (transform gốc trùng điểm bắt đầu của path).
    plane.removeAttribute('transform');
    gsap.set(plane, { opacity: 0 });

    gsap.timeline({ onComplete: onComplete })
      .to(plane, { opacity: 1, duration: 0.4 })
      .to(plane, {
        duration: 3.4,
        ease: 'power1.inOut',
        motionPath: {
          path: path,
          align: path,
          alignOrigin: [0.5, 0.5],
          autoRotate: true
        }
      })
      .to(plane, { opacity: 0, duration: 0.6 }, '+=0.4');
  };
})();
