(async function () {
  const feed = document.getElementById('feed');
  const loader = document.getElementById('loader');
  const muteHint = document.getElementById('mute-hint');

  // Fisher-Yates shuffle
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatCategory(cat) {
    return cat.replace(/-/g, ' ');
  }

  const HEART_SVG = '<svg class="heart-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

  const BURST_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#fe2c55" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

  const shuffled = shuffle(VIDEOS);

  // Build all slides
  shuffled.forEach((video, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.dataset.index = index;
    slide.dataset.videoId = video.id;

    slide.innerHTML =
      '<div class="player-container"><div id="player-' + index + '"></div></div>' +
      '<div class="overlay" id="overlay-' + index + '">' +
        '<div class="video-info">' +
          '<h2 class="video-title">' + escapeHtml(video.title) + '</h2>' +
          '<p class="video-desc">' + escapeHtml(video.description) + '</p>' +
          '<div class="video-meta">' +
            '<span class="video-year">' + video.year + '</span>' +
            '<span class="video-category">' + formatCategory(video.category) + '</span>' +
          '</div>' +
        '</div>' +
        '<button class="heart-btn ' + (Hearts.isHearted(video.id) ? 'hearted' : '') + '" data-video-id="' + video.id + '" aria-label="Heart this video">' +
          HEART_SVG +
        '</button>' +
      '</div>' +
      '<div class="heart-burst" id="burst-' + index + '">' + BURST_SVG + '</div>';

    // Gesture handlers
    Gestures.attach(slide, {
      onSingleTap: () => {
        const overlay = document.getElementById('overlay-' + index);
        const isHidden = overlay.classList.contains('hidden');
        overlay.classList.toggle('hidden');
        if (isHidden) {
          // Auto-hide after 3 seconds
          clearTimeout(slide._overlayTimer);
          slide._overlayTimer = setTimeout(() => {
            overlay.classList.add('hidden');
          }, 3000);
        }
      },
      onDoubleTap: () => {
        const isNowHearted = Hearts.toggle(video.id);
        const btn = slide.querySelector('.heart-btn');

        if (isNowHearted) {
          btn.classList.add('hearted');
          // Trigger burst animation
          const burst = document.getElementById('burst-' + index);
          burst.classList.remove('animate');
          void burst.offsetWidth; // force reflow
          burst.classList.add('animate');
        } else {
          btn.classList.remove('hearted');
        }
      }
    });

    // Direct heart button click
    const heartBtn = slide.querySelector('.heart-btn');
    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isNowHearted = Hearts.toggle(video.id);
      heartBtn.classList.toggle('hearted', isNowHearted);
      if (isNowHearted) {
        const burst = document.getElementById('burst-' + index);
        burst.classList.remove('animate');
        void burst.offsetWidth;
        burst.classList.add('animate');
      }
    });

    feed.appendChild(slide);
  });

  // Auto-hide overlays after 3 seconds
  setTimeout(() => {
    document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
  }, 3000);

  // Add swipe hint for first-time visitors
  if (!localStorage.getItem('swipingupdown_visited')) {
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.id = 'swipe-hint';
    hint.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg><p>Swipe up for more</p>';
    document.body.appendChild(hint);

    // Dismiss on first scroll
    feed.addEventListener('scroll', () => {
      hint.classList.add('dismissed');
      localStorage.setItem('swipingupdown_visited', '1');
      setTimeout(() => hint.remove(), 300);
    }, { once: true });
  }

  // Load YouTube API and start
  await PlayerManager.loadAPI();
  PlayerManager.observeSlides(feed, shuffled.length);

  // Create first player immediately
  if (shuffled.length > 0) {
    PlayerManager.createPlayer(0, shuffled[0].id);
  }

  // Dismiss loader
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 500);

  // Mute hint handler
  muteHint.addEventListener('click', () => {
    PlayerManager.toggleMute();
    muteHint.classList.add('dismissed');
    setTimeout(() => muteHint.remove(), 400);
  });

  // Keyboard navigation: arrow keys to scroll between videos
  document.addEventListener('keydown', (e) => {
    var current = PlayerManager.getCurrentIndex();
    var total = PlayerManager.getTotalCount();
    var target = -1;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (current < total - 1) target = current + 1;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (current > 0) target = current - 1;
    }

    if (target >= 0) {
      var slide = feed.querySelector('.slide[data-index="' + target + '"]');
      if (slide) slide.scrollIntoView({ behavior: 'smooth' });
    }
  });
})();
