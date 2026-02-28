const Gestures = (() => {
  const DOUBLE_TAP_DELAY = 300;

  function attach(element, { onSingleTap, onDoubleTap }) {
    let lastTapTime = 0;
    let singleTapTimer = null;

    element.addEventListener('click', (e) => {
      // Don't handle taps on the heart button (it has its own handler)
      if (e.target.closest('.heart-btn')) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;

      if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
        clearTimeout(singleTapTimer);
        lastTapTime = 0;
        if (onDoubleTap) onDoubleTap(e);
      } else {
        lastTapTime = now;
        singleTapTimer = setTimeout(() => {
          if (onSingleTap) onSingleTap(e);
          lastTapTime = 0;
        }, DOUBLE_TAP_DELAY);
      }
    });
  }

  return { attach };
})();
