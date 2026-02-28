const PlayerManager = (() => {
  const players = {};
  let currentIndex = -1;
  let isMuted = true;
  let apiReady = false;
  let apiReadyResolve = null;
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
          // Video unavailable — show a message on the slide
          const slide = document.querySelector('.slide[data-index="' + index + '"]');
          if (slide) {
            const container = slide.querySelector('.player-container');
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:14px;text-align:center;padding:20px;">This video is unavailable</div>';
          }
        }
      }
    });
  }

  function destroyPlayer(index) {
    if (players[index]) {
      try { players[index].destroy(); } catch (e) {}
      delete players[index];
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

  function onSlideVisible(index, videoId, totalVideos) {
    if (index === currentIndex) return;
    const prevIndex = currentIndex;
    currentIndex = index;

    // Create players for current and neighbors
    const toLoad = [index - 1, index, index + 1];
    toLoad.forEach((i) => {
      if (i >= 0 && i < totalVideos && !players[i]) {
        const slide = document.querySelector('.slide[data-index="' + i + '"]');
        if (slide) createPlayer(i, slide.dataset.videoId);
      }
    });

    // Play current
    playPlayer(index);

    // Pause previous
    if (prevIndex >= 0 && prevIndex !== index) {
      pausePlayer(prevIndex);
    }

    // Destroy far-away players to save memory
    Object.keys(players).forEach((key) => {
      const k = parseInt(key);
      if (Math.abs(k - index) > 2) {
        destroyPlayer(k);
      }
    });
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
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const slide = entry.target;
          const index = parseInt(slide.dataset.index);
          const videoId = slide.dataset.videoId;
          onSlideVisible(index, videoId, totalVideos);
        }
      });
    }, {
      root: feed,
      threshold: 0.5
    });

    feed.querySelectorAll('.slide').forEach((slide) => observer.observe(slide));
    return observer;
  }

  function getIsMuted() {
    return isMuted;
  }

  return { loadAPI, observeSlides, toggleMute, createPlayer, getIsMuted, apiReady: apiReadyPromise };
})();
