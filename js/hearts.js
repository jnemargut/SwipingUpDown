const Hearts = (() => {
  const STORAGE_KEY = 'swipingupdown_hearts';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function isHearted(videoId) {
    return !!getAll()[videoId];
  }

  function toggle(videoId) {
    const hearts = getAll();
    if (hearts[videoId]) {
      delete hearts[videoId];
    } else {
      hearts[videoId] = Date.now();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hearts));
    return !!hearts[videoId];
  }

  return { isHearted, toggle };
})();
