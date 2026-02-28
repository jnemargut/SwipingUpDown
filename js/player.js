const PlayerManager = (() => {
  const players = {};
  let currentIndex = -1;
  let isMuted = true;
  let apiReady = false;
  let apiReadyResolve = null;
  let settleTimer = null;
  let neighborTimer = null;
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
          if (index === currentIndex) {
            // autoplay: 1 handles play; just unmute if needed
            if (!isMuted) {
              try { event.target.unMute(); event.target.setVolume(100); } catch (e) {}
            }
          } else {
            // Neighbor preload — pause immediately so it doesn't play off-screen
            try { event.target.pauseVideo(); } catch (e) {}
          }
        },
        onStateChange: (event) => {
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

  function playPlayer(index) {
    var p = players[index];
    if (!p || typeof p.playVideo !== 'function') return;
    p.playVideo();
    if (!isMuted) {
      try { p.unMute(); p.setVolume(100); } catch (e) {}
    }
  }

  function pausePlayer(index) {
    var p = players[index];
    if (!p || typeof p.pauseVideo !== 'function') return;
    try { p.pauseVideo(); } catch (e) {}
  }

  function onSlideVisible(index) {
    if (index === currentIndex) return;
    var prevIndex = currentIndex;
    currentIndex = index;

    // Immediately pause the previous video
    if (prevIndex >= 0) {
      pausePlayer(prevIndex);
    }

    // If a player already exists (pre-loaded as neighbor), play instantly
    if (players[index] && typeof players[index].playVideo === 'function') {
      playPlayer(index);
    }

    // Cancel any pending timers
    clearTimeout(settleTimer);
    clearTimeout(neighborTimer);

    // Debounce — only create a player for the slide we settle on
    settleTimer = setTimeout(function () {
      if (!players[index]) {
        var slide = document.querySelector('.slide[data-index="' + index + '"]');
        if (slide) createPlayer(index, slide.dataset.videoId);
      } else {
        playPlayer(index);
      }

      // Destroy ALL other players except current one
      Object.keys(players).forEach(function (key) {
        var k = parseInt(key);
        if (k !== index) {
          destroyPlayer(k);
        }
      });
    }, 200);

    // Preload only the NEXT slide after a long delay (1s after settling)
    neighborTimer = setTimeout(function () {
      if (currentIndex !== index) return; // user scrolled away
      var next = index + 1;
      if (next < totalVideoCount && !players[next]) {
        var s = document.querySelector('.slide[data-index="' + next + '"]');
        if (s) createPlayer(next, s.dataset.videoId);
      }
    }, 1200);
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
