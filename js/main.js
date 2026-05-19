/* ATD Mobile Automotive — footer year + tap-to-reveal phone + Google reviews loader. */

document.getElementById('year').textContent = new Date().getFullYear();

/* Tap-to-reveal phone. Edit phone parts in the array below. */
(function () {
  var p = ['027', '515', '1399'];
  var tel = p.join('');
  var display = p.join(' ');
  document.querySelectorAll('.js-reveal-phone').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (el.classList.contains('revealed')) return;
      e.preventDefault();
      el.classList.add('revealed');
      el.href = 'tel:' + tel;
      var text = el.querySelector('.js-phone-text');
      if (text) text.textContent = display;
    });
  });
})();

/* Reviews loader. Fetches from the Places API and renders cards into
   #reviews. Section stays hidden if the fetch fails. Cached in
   localStorage for 24h — bump CACHE_KEY when the response shape or
   rendering changes. Place ID + API key come from data attributes on
   the section. */
(function () {
  var section = document.getElementById('reviews');
  if (!section) return;

  var PLACE_ID = section.dataset.placeId;
  var API_KEY = section.dataset.apiKey;
  if (!PLACE_ID || !API_KEY) return;

  var CACHE_KEY = 'atd-reviews-v1';
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  var MAX_CARDS = 4;

  var cached = readCache();
  if (cached) {
    render(cached);
    return;
  }

  fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(PLACE_ID), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews'
    }
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      writeCache(data);
      render(data);
    })
    .catch(function (err) {
      console.warn('Reviews load failed:', err);
    });

  function render(data) {
    if (!data || !Array.isArray(data.reviews) || data.reviews.length === 0) return;

    var rating = (typeof data.rating === 'number') ? data.rating.toFixed(1) : '';
    var count = data.userRatingCount || data.reviews.length;
    var ratingEl = section.querySelector('.js-reviews-rating');
    var countEl = section.querySelector('.js-reviews-count');
    if (ratingEl) ratingEl.textContent = rating;
    if (countEl) countEl.textContent = count + (count === 1 ? ' review' : ' reviews');

    var grid = section.querySelector('.js-reviews-grid');
    grid.innerHTML = '';
    var visible = data.reviews
      .filter(function (r) { return r && r.text && r.text.text; })
      .slice(0, MAX_CARDS);

    if (visible.length === 0) return;
    visible.forEach(function (review) { grid.appendChild(buildCard(review)); });

    section.removeAttribute('hidden');
  }

  function buildCard(review) {
    var card = document.createElement('article');
    card.className = 'review-card';

    var stars = document.createElement('div');
    stars.className = 'review-stars';
    var starCount = review.rating || 5;
    stars.setAttribute('aria-label', starCount + ' out of 5 stars');
    stars.textContent = renderStars(starCount);

    var text = document.createElement('p');
    text.className = 'review-text';
    text.textContent = (review.text && review.text.text) || '';

    var meta = document.createElement('div');
    meta.className = 'review-meta';

    var author = document.createElement('span');
    author.className = 'review-author';
    author.textContent = (review.authorAttribution && review.authorAttribution.displayName) || 'Google reviewer';

    var date = document.createElement('span');
    date.className = 'review-date';
    date.textContent = review.relativePublishTimeDescription || '';

    meta.appendChild(author);
    meta.appendChild(date);

    card.appendChild(stars);
    card.appendChild(text);
    card.appendChild(meta);

    return card;
  }

  function renderStars(n) {
    var rounded = Math.max(0, Math.min(5, Math.round(n)));
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || !entry.timestamp || !entry.data) return null;
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      /* storage full or disabled — non-fatal */
    }
  }
})();
