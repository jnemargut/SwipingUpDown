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
      host: 'https://www.youtube-nocookie.com',
      videoId: videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
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
        enablejsapi: 1
      },
      events: {
        onReady: (event) => {
          if (index === currentIndex && !isMuted) {
            try { event.target.unMute(); event.target.setVolume(100); } catch (e) {}
          }
          // Wire up our play button as a user-gesture fallback for mobile
          var playBtn = document.getElementById('play-btn-' + index);
          if (playBtn) {
            playBtn.onclick = function () {
              event.target.playVideo();
              playBtn.classList.add('hidden');
            };
          }
        },
        onStateChange: (event) => {
          var playBtn = document.getElementById('play-btn-' + index);
          if (event.data === YT.PlayerState.PLAYING) {
            // Video is playing — hide the play button
            if (playBtn) playBtn.classList.add('hidden');
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.CUED) {
            // Video paused or cued but not playing — show the play button
            if (playBtn && index === currentIndex) playBtn.classList.remove('hidden');
          }
          if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(0);
            event.target.playVideo();
          }
        },
        onError: () => {
          var slide = document.querySelector('.slide[data-index="' + index + '"]');
          if (slide) {
            var cont = slide.querySelector('.player-container');
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
    // Restore placeholder div so we can recreate the player later
    var slide = document.querySelector('.slide[data-index="' + index + '"]');
    if (slide) {
      var cont = slide.querySelector('.player-container');
      if (cont && !document.getElementById('player-' + index)) {
        cont.innerHTML = '<div id="player-' + index + '"></div>';
      }
    }
  }

  function onSlideVisible(index) {
    if (index === currentIndex) return;
    var prevIndex = currentIndex;
    currentIndex = index;

    // Hide play button on the slide we're leaving
    var prevBtn = document.getElementById('play-btn-' + prevIndex);
    if (prevBtn) prevBtn.classList.add('hidden');

    // Show play button on the new slide (will auto-hide if autoplay works)
    var newBtn = document.getElementById('play-btn-' + index);
    if (newBtn) newBtn.classList.remove('hidden');

    // Cancel any pending timer
    clearTimeout(settleTimer);

    // Debounce — destroy everything, create a fresh player for the settled slide.
    // Fresh players with autoplay: 1 + mute: 1 autoplay reliably on mobile.
    // Calling playVideo() on a paused player does NOT work on mobile (no user gesture).
    settleTimer = setTimeout(function () {
      // Destroy ALL existing players
      Object.keys(players).forEach(function (key) {
        destroyPlayer(parseInt(key));
      });

      // Create fresh player — autoplay: 1 handles playback on all platforms
      var slide = document.querySelector('.slide[data-index="' + index + '"]');
      if (slide) createPlayer(index, slide.dataset.videoId);
    }, 200);
  }

  function toggleMute() {
    isMuted = !isMuted;
    var p = players[currentIndex];
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

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          var index = parseInt(entry.target.dataset.index);
          onSlideVisible(index);
        }
      });
    }, {
      root: feed,
      threshold: 0.5
    });

    feed.querySelectorAll('.slide').forEach(function (slide) { observer.observe(slide); });
    return observer;
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function getTotalCount() {
    return totalVideoCount;
  }

  return { loadAPI, observeSlides, toggleMute, createPlayer, getCurrentIndex, getTotalCount, apiReady: apiReadyPromise };
})();
