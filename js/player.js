const PlayerManager = (() => {
  const players = {};
  let currentIndex = -1;
  let isMuted = true;
  let apiReady = false;
  let apiReadyResolve = null;
  let settleTimer = null;
  let totalVideoCount = 0;
  const apiReadyPromise = new Promise((resolve) => { apiReadyResolve = resolve; });

  function loadAPI() {
    if (window.YT && window.YT.Player) {
      apiReady = true;
      apiReadyResolve();
      return apiReadyPromise;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    return apiReadyPromise;
  }

  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    apiReadyResolve();
  };

  function createPlayer(index, videoId) {
    if (players[index]) return;
    const container = document.getElementById('player-' + index);
    if (!container) return;

    players[index] = new YT.Player('player-' + index, {
      videoId: videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        mute: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        playsinline: 1,
        loop: 1,
        playlist: videoId,
        iv_load_policy: 3,
        fs: 0,
        disablekb: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        onReady: (event) => {
          if (index === currentIndex) {
            event.target.playVideo();
          }
        },
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(0);
            event.target.playVideo();
          }
        },
        onError: (event) => {
          const slide = document.querySelector('.slide[data-index="' + index + '"]');
          if (slide) {
            const cont = slide.querySelector('.player-container');
            cont.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:14px;text-align:center;padding:20px;">This video is unavailable</div>';
          }
        }
      }
    });
  }

  function destroyPlayer(index) {
    if (!players[index]) return;
    try { players[index].destroy(); } catch (e) {}
    delete players[index];
    // Restore the placeholder div so we can recreate the player later
    const slide = document.querySelector('.slide[data-index="' + index + '"]');
    if (slide) {
      const cont = slide.querySelector('.player-container');
      if (cont && !document.getElementById('player-' + index)) {
        cont.innerHTML = '<div id="player-' + index + '"></div>';
      }
    }
  }

  function playPlayer(index) {
    const p = players[index];
    if (!p || typeof p.playVideo !== 'function') return;
    p.playVideo();
    if (!isMuted) {
      try { p.unMute(); p.setVolume(100); } catch (e) {}
    }
  }

  function pausePlayer(index) {
    const p = players[index];
    if (!p || typeof p.pauseVideo !== 'function') return;
    try { p.pauseVideo(); } catch (e) {}
  }

  // Called after scrolling settles — does the actual player creation and playback
  function settle(index) {
    const slide = document.querySelector('.slide[data-index="' + index + '"]');
    if (!slide) return;
    const videoId = slide.dataset.videoId;

    // Destroy everything except neighbors of the settled index
    Object.keys(players).forEach((key) => {
      const k = parseInt(key);
      if (Math.abs(k - index) > 1) {
        destroyPlayer(k);
      }
    });

    // Create players for current and immediate neighbors
    [index - 1, index, index + 1].forEach((i) => {
      if (i >= 0 && i < totalVideoCount && !players[i]) {
        const s = document.querySelector('.slide[data-index="' + i + '"]');
        if (s) createPlayer(i, s.dataset.videoId);
      }
    });

    // Play current, pause others
    playPlayer(index);
    Object.keys(players).forEach((key) => {
      const k = parseInt(key);
      if (k !== index) pausePlayer(k);
    });
  }

  function onSlideVisible(index) {
    if (index === currentIndex) return;
    currentIndex = index;

    // Pause all currently playing players immediately (don't wait for debounce)
    Object.keys(players).forEach((key) => {
      pausePlayer(parseInt(key));
    });

    // Debounce: wait for scrolling to stop before creating/loading players
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => settle(index), 200);
  }

  function toggleMute() {
    isMuted = !isMuted;
    const p = players[currentIndex];
    if (p && typeof p.mute === 'function') {
      if (isMuted) {
        p.mute();
      } else {
        p.unMute();
        p.setVolume(100);
      }
    }
    return isMuted;
  }

  function observeSlides(feed, totalVideos) {
    totalVideoCount = totalVideos;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const index = parseInt(entry.target.dataset.index);
          onSlideVisible(index);
        }
      });
    }, {
      root: feed,
      threshold: 0.5
    });

    feed.querySelectorAll('.slide').forEach((slide) => observer.observe(slide));
    return observer;
  }

  return { loadAPI, observeSlides, toggleMute, createPlayer, apiReady: apiReadyPromise };
})();
