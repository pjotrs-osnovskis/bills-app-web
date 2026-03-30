(function () {
  var container = document.getElementById('auth-login');
  var el = document.getElementById('auth-login-particles');
  if (!container || !el || typeof particlesJS !== 'function') return;

  var config = {
    particles: {
      number: { value: 120, density: { enable: true, value_area: 900 } },
      color: { value: '#ffffff' },
      shape: { type: 'circle' },
      opacity: { value: 0.35, random: true },
      size: { value: 3, random: true },
      line_linked: {
        enable: true,
        distance: 140,
        color: '#ffffff',
        opacity: 0.15,
        width: 1
      },
      move: {
        enable: true,
        speed: 0.3,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false
      }
    },
    interactivity: {
      detect_on: 'window',
      events: {
        onhover: { enable: true, mode: 'repulse' },
        onclick: { enable: false },
        resize: true
      },
      modes: {
        repulse: {
          distance: 50,
          duration: 2.5
        }
      }
    },
    retina_detect: true
  };

  function start() {
    if (el.getAttribute('data-particles-inited')) return;
    el.setAttribute('data-particles-inited', '1');
    particlesJS('auth-login-particles', config);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!container.classList.contains('hidden')) start();
    });
  } else if (!container.classList.contains('hidden')) {
    start();
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === 'class' && !container.classList.contains('hidden')) start();
    });
  });
  observer.observe(container, { attributes: true });
})();
