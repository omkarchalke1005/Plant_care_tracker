/* ---------- Global custom alert (replaces dull browser alert) ---------- */
(function installCustomAlert() {
  if (window.__pctCustomAlertInstalled) return;
  window.__pctCustomAlertInstalled = true;

  var nativeAlert = window.alert;

  function ensureAlertStyles() {
    if (document.getElementById('pctAlertStyles')) return;

    var style = document.createElement('style');
    style.id = 'pctAlertStyles';
    style.textContent =
      '.pct-alert-overlay{' +
        'position:fixed;inset:0;background:rgba(8,22,13,.44);backdrop-filter:blur(2px);' +
        'display:flex;align-items:center;justify-content:center;padding:18px;z-index:10000;' +
      '}' +
      '.pct-alert-card{' +
        'width:min(440px,100%);background:linear-gradient(145deg,#f6fff7,#e3f5e9);' +
        'border:1px solid #b7ddc2;border-radius:18px;padding:16px 16px 14px;' +
        'box-shadow:0 16px 40px rgba(13,61,33,.30);color:#154a2d;font-family:Segoe UI,Tahoma,sans-serif;' +
        'transform:translateY(10px) scale(.98);opacity:0;transition:all .22s ease;' +
      '}' +
      '.pct-alert-card.show{transform:translateY(0) scale(1);opacity:1;}' +
      '.pct-alert-head{display:flex;align-items:center;justify-content:space-between;gap:10px;}' +
      '.pct-alert-title{margin:0;font-size:18px;font-weight:800;letter-spacing:.2px;}' +
      '.pct-alert-close{' +
        'border:0;background:#1d6d40;color:#fff;width:28px;height:28px;border-radius:999px;' +
        'font-size:17px;line-height:1;cursor:pointer;' +
      '}' +
      '.pct-alert-msg{margin:10px 0 0 0;white-space:pre-wrap;font-size:15px;line-height:1.5;color:#123f27;}' +
      '.pct-alert-actions{margin-top:12px;display:flex;justify-content:flex-end;}' +
      '.pct-alert-ok{' +
        'border:0;background:linear-gradient(180deg,#2fa45f,#248348);color:#fff;font-weight:700;' +
        'padding:8px 18px;border-radius:10px;cursor:pointer;box-shadow:0 8px 18px rgba(27,106,58,.26);' +
      '}';
    document.head.appendChild(style);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.alert = function (message) {
    if (!document.body) {
      nativeAlert(message);
      return;
    }

    ensureAlertStyles();

    var existing = document.getElementById('pctAlertOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'pctAlertOverlay';
    overlay.className = 'pct-alert-overlay';
    overlay.innerHTML =
      '<div class="pct-alert-card" role="alertdialog" aria-modal="true" aria-label="Notification">' +
        '<div class="pct-alert-head">' +
          '<h3 class="pct-alert-title">Plant Care Tracker</h3>' +
          '<button class="pct-alert-close" type="button" aria-label="Close">&times;</button>' +
        '</div>' +
        '<p class="pct-alert-msg">' + escapeHtml(message) + '</p>' +
        '<div class="pct-alert-actions"><button class="pct-alert-ok" type="button">OK</button></div>' +
      '</div>';

    document.body.appendChild(overlay);

    var card = overlay.querySelector('.pct-alert-card');
    var closeBtn = overlay.querySelector('.pct-alert-close');
    var okBtn = overlay.querySelector('.pct-alert-ok');

    requestAnimationFrame(function () {
      if (card) card.classList.add('show');
      if (okBtn) okBtn.focus();
    });

    function closeAlert() {
      if (!overlay.parentNode) return;
      if (card) card.classList.remove('show');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 180);
      document.removeEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Enter') closeAlert();
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeAlert();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeAlert);
    if (okBtn) okBtn.addEventListener('click', closeAlert);
    document.addEventListener('keydown', onKeyDown);
  };
})();
/* ---------- Helper date functions ---------- */
    function formatDate(d) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }

    function addDays(dateStr, n) {
      var d = new Date(dateStr);
      d.setDate(d.getDate() + n);
      return formatDate(d);
    }

    function todayStr() {
      return formatDate(new Date());
    }

    function daysBetween(startStr, endStr) {
      var a = new Date(startStr);
      var b = new Date(endStr);
      return Math.round((b - a) / (1000 * 60 * 60 * 24));
    }

    /* ---------- Simple "image analysis" for growth stage ----------
       NOTE: In real life, to truly analyze the picture (leaf size, stem etc.)
       you MUST call an AI vision API from a backend.
       Here we can only GUESS using the file name / URL text.
    -------------------------------------------------------------- */
    function guessGrowthStageFromImageMeta(options) {
      var text = '';
      if (options && options.fileName) text += ' ' + options.fileName.toLowerCase();
      if (options && options.url) text += ' ' + options.url.toLowerCase();

      var stage = 'Mature';

      if (text.match(/seed|sprout|seedling|tiny|small/)) {
        stage = 'Seedling';
      } else if (text.match(/cutting|propagat|stem|branch|node/)) {
        stage = 'New cutting';
      } else {
        stage = 'Mature';
      }

      var field = document.getElementById('growthStage');
      // Only auto-fill if user has not typed anything
      if (field && !field.value.trim()) {
        field.value = stage;
      }
    }

    /* ---------- Plant catalog (added more plants) ---------- */
    var plantCatalog = [
      {name:'Money Plant (Pothos)', type:'Indoor',
       info:'Fast-growing indoor vine that tolerates low light. Keep soil slightly moist and allow top layer to dry between waterings.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Snake Plant (Sansevieria)', type:'Indoor',
       info:'Very hardy plant that survives low light and irregular watering. Let soil dry fully between waterings.',
       imageUrl:'https://images.pexels.com/photos/883465/pexels-photo-883465.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Spider Plant', type:'Indoor',
       info:'Arching leaves with baby plantlets. Likes bright indirect light and evenly moist soil.',
       imageUrl:'https://images.pexels.com/photos/2123482/pexels-photo-2123482.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Peace Lily', type:'Indoor',
       info:'Flowering indoor plant that enjoys low to medium light. Keep soil consistently moist, not soggy.',
       imageUrl:'https://images.pexels.com/photos/3639479/pexels-photo-3639479.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Aloe Vera', type:'Indoor',
       info:'Succulent with medicinal gel in the leaves. Needs bright light and very little water.',
       imageUrl:'https://images.pexels.com/photos/2124380/pexels-photo-2124380.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Areca Palm', type:'Indoor',
       info:'Graceful palm for living rooms. Likes bright light and evenly moist soil, avoid cold drafts.',
       imageUrl:'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Rubber Plant', type:'Indoor',
       info:'Glossy large leaves, prefers bright indirect light. Water when top soil dries.',
       imageUrl:'https://images.pexels.com/photos/1048039/pexels-photo-1048039.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'ZZ Plant', type:'Indoor',
       info:'Very low-maintenance plant for low light corners. Water sparingly, as rhizomes store water.',
       imageUrl:'https://images.pexels.com/photos/2070980/pexels-photo-2070980.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Jade Plant', type:'Indoor',
       info:'Succulent with thick leaves, symbol of good luck. Loves bright light and infrequent deep watering.',
       imageUrl:'https://images.pexels.com/photos/450326/pexels-photo-450326.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Boston Fern', type:'Indoor',
       info:'Feathery fronds, likes high humidity and moist soil. Avoid direct harsh sunlight.',
       imageUrl:'https://images.pexels.com/photos/1506665/pexels-photo-1506665.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Tulsi (Holy Basil)', type:'Outdoor',
       info:'Sacred herb widely grown in Indian homes. Needs full sun and regular watering.',
       imageUrl:'https://images.pexels.com/photos/4505169/pexels-photo-4505169.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Rose', type:'Outdoor',
       info:'Classic flowering shrub that loves full sun and rich soil. Water deeply and prune spent flowers.',
       imageUrl:'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Hibiscus', type:'Outdoor',
       info:'Tropical shrub with large colorful flowers. Needs full sun and frequent watering in summer.',
       imageUrl:'https://images.pexels.com/photos/60597/hibiscus-flower-red-pink-60597.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Marigold', type:'Outdoor',
       info:'Bright orange and yellow flowers used in garlands. Thrives in full sun and well-drained soil.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Bougainvillea', type:'Outdoor',
       info:'Woody climber covered in colored bracts. Requires strong sunlight and minimal water once established.',
       imageUrl:'https://images.pexels.com/photos/699963/pexels-photo-699963.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Chrysanthemum', type:'Outdoor',
       info:'Popular winter flowering plant with many colors. Likes cool temperatures and regular watering.',
       imageUrl:'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Orchid (Phalaenopsis)', type:'Indoor',
       info:'Elegant flowers that last for weeks. Needs bright filtered light and good air circulation.',
       imageUrl:'https://images.pexels.com/photos/602580/pexels-photo-602580.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Geranium', type:'Outdoor',
       info:'Colorful flowering plant for balconies. Enjoys sunny spots and moderate watering.',
       imageUrl:'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Lavender', type:'Outdoor',
       info:'Fragrant herb with purple spikes. Needs full sun and very well-drained soil.',
       imageUrl:'https://images.pexels.com/photos/672142/pexels-photo-672142.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Mint', type:'Outdoor',
       info:'Fast spreading herb used in tea and chutneys. Likes moist soil and partial sun.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Basil', type:'Outdoor',
       info:'Aromatic herb used in many cuisines. Needs warm weather, full sun and regular water.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Tomato Plant', type:'Outdoor',
       info:'Common kitchen garden plant. Requires full sun, staking support and consistent watering.',
       imageUrl:'https://images.pexels.com/photos/128420/pexels-photo-128420.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Chili Plant', type:'Outdoor',
       info:'Small shrub with spicy fruits. Likes warm conditions, full sun and regular feed.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Sunflower', type:'Outdoor',
       info:'Tall plant with large yellow heads. Needs direct sun and rich soil.',
       imageUrl:'https://images.pexels.com/photos/1169084/pexels-photo-1169084.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Succulent Mix', type:'Indoor',
       info:'Small rosette succulents suited for desks and shelves. Need bright light and very little water.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Banana Plant', type:'Outdoor',
       info:'Large tropical plant with big leaves. Needs lots of sun, water and rich soil.',
       imageUrl:'https://images.pexels.com/photos/236969/pexels-photo-236969.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Areca Palm (Table Size)', type:'Indoor',
       info:'Smaller areca palm for desks and side tables. Likes bright light and regular watering.',
       imageUrl:'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Ficus Bonsai', type:'Indoor',
       info:'Miniature tree style plant. Needs bright indirect light and regular pruning.',
       imageUrl:'https://images.pexels.com/photos/4751972/pexels-photo-4751972.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Pothos Marble Queen', type:'Indoor',
       info:'Variegated pothos with white and green leaves. Likes bright, indirect light and moderate watering.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Croton', type:'Indoor',
       info:'Colorful foliage plant with red, yellow and orange leaves. Needs bright light for best color.',
       imageUrl:'https://images.pexels.com/photos/5699668/pexels-photo-5699668.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Areca Nut Palm', type:'Outdoor',
       info:'Tall palm often grown in gardens. Needs sunlight and regular watering when young.',
       imageUrl:'https://images.pexels.com/photos/1956982/pexels-photo-1956982.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Neem Tree', type:'Outdoor',
       info:'Traditional Indian tree with medicinal properties. Needs full sun and moderate watering once established.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Curry Leaf Plant', type:'Outdoor',
       info:'Common kitchen plant used in Indian cooking. Likes full sun and regular watering, but soil must be well-drained.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Aparajita (Butterfly Pea)', type:'Outdoor',
       info:'Climber with blue flowers, often used for tea and pooja. Needs support, full sun and regular watering.',
       imageUrl:'https://images.pexels.com/photos/60597/hibiscus-flower-red-pink-60597.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Coleus', type:'Outdoor',
       info:'Colorful foliage plant with many leaf patterns. Likes bright light and slightly moist soil.',
       imageUrl:'https://images.pexels.com/photos/5699668/pexels-photo-5699668.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Philodendron', type:'Indoor',
       info:'Popular indoor climbing plant that loves bright indirect light and evenly moist soil.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Chinese Evergreen', type:'Indoor',
       info:'Hardy indoor plant that tolerates low light. Water when the top soil feels dry.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Calathea', type:'Indoor',
       info:'Prayer plant with patterned leaves that close at night. Likes high humidity and low to medium light.',
       imageUrl:'https://images.pexels.com/photos/1506665/pexels-photo-1506665.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Rubber Fig (Ficus elastica)', type:'Indoor',
       info:'Large glossy leaves, good for living rooms. Needs bright indirect light and watering after top soil dries.',
       imageUrl:'https://images.pexels.com/photos/1048039/pexels-photo-1048039.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Poinsettia', type:'Indoor',
       info:'Colorful red bracts around winter. Needs bright light and careful watering to avoid root rot.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Ixora', type:'Outdoor',
       info:'Shrub with clusters of small bright flowers, common in Indian gardens. Needs sun and regular watering.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Jasmine (Mogra)', type:'Outdoor',
       info:'Fragrant white flowers, often used in garlands. Needs full sun and frequent watering in hot weather.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Adenium (Desert Rose)', type:'Outdoor',
       info:'Succulent-like plant with swollen trunk and colorful flowers. Loves strong sunlight and low watering.',
       imageUrl:'https://images.pexels.com/photos/672142/pexels-photo-672142.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Monstera Deliciosa', type:'Indoor',
       info:'Large split leaves, ideal for bright indirect light. Water when top 2 inches of soil are dry.',
       imageUrl:'https://images.pexels.com/photos/5699668/pexels-photo-5699668.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Dracaena Marginata', type:'Indoor',
       info:'Upright narrow leaves with red edges. Tolerates medium light and occasional missed watering.',
       imageUrl:'https://images.pexels.com/photos/2123482/pexels-photo-2123482.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Anthurium', type:'Indoor',
       info:'Glossy leaves and red/pink spathes. Likes warmth, humidity, and bright filtered light.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Dieffenbachia', type:'Indoor',
       info:'Attractive variegated foliage plant. Keep in medium light and water when topsoil dries slightly.',
       imageUrl:'https://images.pexels.com/photos/1506665/pexels-photo-1506665.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Syngonium', type:'Indoor',
       info:'Arrowhead vine with soft leaves. Performs well in bright indirect light and moderate watering.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Peperomia', type:'Indoor',
       info:'Compact ornamental foliage plant for desks. Prefers light watering and airy potting mix.',
       imageUrl:'https://images.pexels.com/photos/450326/pexels-photo-450326.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Hoya (Wax Plant)', type:'Indoor',
       info:'Thick leaves and fragrant clusters when mature. Likes bright indirect light and less frequent watering.',
       imageUrl:'https://images.pexels.com/photos/2124380/pexels-photo-2124380.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Parlor Palm', type:'Indoor',
       info:'Classic indoor palm for low to medium light. Keep soil lightly moist and avoid overwatering.',
       imageUrl:'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Nerve Plant (Fittonia)', type:'Indoor',
       info:'Small veined leaves with strong color contrast. Needs humidity and regular but light watering.',
       imageUrl:'https://images.pexels.com/photos/1506665/pexels-photo-1506665.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Asparagus Fern', type:'Indoor',
       info:'Soft airy foliage, likes bright filtered light. Keep slightly moist and trim old stems regularly.',
       imageUrl:'https://images.pexels.com/photos/1506665/pexels-photo-1506665.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Tradescantia (Wandering Dude)', type:'Indoor',
       info:'Fast trailing plant with purple-green leaves. Likes bright indirect light and regular pinching.',
       imageUrl:'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Bird of Paradise (Indoor)', type:'Indoor',
       info:'Large tropical foliage plant. Give high light and deep watering when topsoil becomes dry.',
       imageUrl:'https://images.pexels.com/photos/5699668/pexels-photo-5699668.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Mandevilla', type:'Outdoor',
       info:'Flowering climber with trumpet blooms. Loves sun, regular feeding, and support for vines.',
       imageUrl:'https://images.pexels.com/photos/60597/hibiscus-flower-red-pink-60597.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Plumeria (Frangipani)', type:'Outdoor',
       info:'Tropical flowering tree with fragrant blooms. Needs full sun and well-drained soil.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Petunia', type:'Outdoor',
       info:'Long-season flowering annual for beds and pots. Needs sunlight and deadheading for more flowers.',
       imageUrl:'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Dahlia', type:'Outdoor',
       info:'Showy blooms in many sizes and colors. Provide full sun, staking, and consistent moisture.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Zinnia', type:'Outdoor',
       info:'Easy flowering plant with bright blooms. Thrives in warm weather and direct sunlight.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Cosmos', type:'Outdoor',
       info:'Light airy flowering annual. Needs sun and moderate watering with well-drained soil.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Portulaca (Moss Rose)', type:'Outdoor',
       info:'Heat-loving succulent flowering plant. Great for sunny spots with minimal watering.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Periwinkle (Vinca)', type:'Outdoor',
       info:'Hardy flowering plant for hot climates. Needs sunlight and occasional deep watering.',
       imageUrl:'https://images.pexels.com/photos/60597/hibiscus-flower-red-pink-60597.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Hydrangea', type:'Outdoor',
       info:'Large ornamental flower clusters. Prefers morning sun, afternoon shade, and evenly moist soil.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Gardenia', type:'Outdoor',
       info:'Fragrant white flowers and glossy leaves. Likes warm weather, acidic soil, and regular moisture.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Lantana', type:'Outdoor',
       info:'Clustered multicolor flowers that attract pollinators. Drought tolerant once established.',
       imageUrl:'https://images.pexels.com/photos/434840/pexels-photo-434840.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Jasminum Sambac', type:'Outdoor',
       info:'Evergreen jasmine with strong fragrance. Needs sunlight and steady watering for bloom.',
       imageUrl:'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=600'},

      {name:'Rangoon Creeper', type:'Outdoor',
       info:'Vigorous climber with color-changing flowers. Needs support, sunlight, and seasonal pruning.',
       imageUrl:'https://images.pexels.com/photos/60597/hibiscus-flower-red-pink-60597.jpeg?auto=compress&cs=tinysrgb&w=600'}
    ];

    /* ---------- FIREBASE STORAGE HELPERS ---------- */
    let currentUser = null;
    const CACHE_TTL_MS = 5000;
    let plantsCache = { uid: null, data: null, fetchedAt: 0, pending: null };
    let tasksCache = { uid: null, data: null, fetchedAt: 0, pending: null };

    function resetUserCaches() {
      plantsCache = { uid: null, data: null, fetchedAt: 0, pending: null };
      tasksCache = { uid: null, data: null, fetchedAt: 0, pending: null };
    }

    function invalidatePlantsCache() {
      plantsCache.data = null;
      plantsCache.fetchedAt = 0;
      plantsCache.pending = null;
    }

    function invalidateTasksCache() {
      tasksCache.data = null;
      tasksCache.fetchedAt = 0;
      tasksCache.pending = null;
    }

    function setCurrentUser(user) {
      currentUser = user;
      resetUserCaches();
    }

    function getCurrentUser() {
      return currentUser;
    }

    async function getPlantsForUser(options) {
      if (!currentUser) return [];
      var uid = currentUser.uid;
      var forceRefresh = !!(options && options.forceRefresh);
      var now = Date.now();

      if (plantsCache.uid !== uid) {
        plantsCache = { uid: uid, data: null, fetchedAt: 0, pending: null };
      }
      if (!forceRefresh && plantsCache.data && (now - plantsCache.fetchedAt) < CACHE_TTL_MS) {
        return plantsCache.data;
      }
      if (plantsCache.pending) {
        return plantsCache.pending;
      }

      try {
        plantsCache.pending = db.collection('users').doc(uid).collection('plants').get()
          .then(function (snapshot) {
            var data = snapshot.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
            plantsCache.data = data;
            plantsCache.fetchedAt = Date.now();
            return data;
          })
          .catch(function (error) {
            console.error('Error getting plants:', error);
            return [];
          })
          .finally(function () {
            plantsCache.pending = null;
          });
        return await plantsCache.pending;
      } catch (error) {
        console.error('Error getting plants:', error);
        return [];
      }
    }

    async function savePlant(plant) {
      if (!currentUser) throw new Error('No user logged in');
      const docRef = await db.collection('users').doc(currentUser.uid).collection('plants').add(plant);
      invalidatePlantsCache();
      return docRef.id;
    }

    async function updatePlant(plantId, plant) {
      if (!currentUser) throw new Error('No user logged in');
      await db.collection('users').doc(currentUser.uid).collection('plants').doc(plantId).update(plant);
      invalidatePlantsCache();
    }

async function deletePlantFromDB(plantId) {
  if (!currentUser) throw new Error('No user logged in');
  await db.collection('users')
    .doc(currentUser.uid)
    .collection('plants')
    .doc(plantId)
    .delete();
  invalidatePlantsCache();
}


    async function getTasksForUser(options) {
      if (!currentUser) return [];
      var uid = currentUser.uid;
      var forceRefresh = !!(options && options.forceRefresh);
      var now = Date.now();

      if (tasksCache.uid !== uid) {
        tasksCache = { uid: uid, data: null, fetchedAt: 0, pending: null };
      }
      if (!forceRefresh && tasksCache.data && (now - tasksCache.fetchedAt) < CACHE_TTL_MS) {
        return tasksCache.data;
      }
      if (tasksCache.pending) {
        return tasksCache.pending;
      }

      try {
        tasksCache.pending = db.collection('users').doc(uid).collection('tasks').get()
          .then(function (snapshot) {
            var data = snapshot.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
            tasksCache.data = data;
            tasksCache.fetchedAt = Date.now();
            return data;
          })
          .catch(function (error) {
            console.error('Error getting tasks:', error);
            return [];
          })
          .finally(function () {
            tasksCache.pending = null;
          });
        return await tasksCache.pending;
      } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
      }
    }

    async function saveTask(task) {
      if (!currentUser) throw new Error('No user logged in');
      const docRef = await db.collection('users').doc(currentUser.uid).collection('tasks').add(task);
      invalidateTasksCache();
      return docRef.id;
    }

    async function updateTask(taskId, updates) {
      if (!currentUser) throw new Error('No user logged in');
      await db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).update(updates);
      invalidateTasksCache();
    }

    async function deleteTask(taskId) {
      if (!currentUser) throw new Error('No user logged in');
      await db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).delete();
      invalidateTasksCache();
    }

    function setCurrentPlantId(id) {
      if (!currentUser) return;
      localStorage.setItem('pct_current_plant_' + currentUser.uid, String(id));
    }

    function getCurrentPlantId() {
      if (!currentUser) return null;
      return localStorage.getItem('pct_current_plant_' + currentUser.uid);
    }

    function getPlantBaseName(plant) {
      if (!plant) return 'Unknown plant';
      return String(plant.name || 'Plant').trim();
    }

    function buildPlantNameMap(plants) {
      var map = {};
      var grouped = {};

      (plants || []).forEach(function (plant) {
        if (!plant || !plant.id) return;
        var base = getPlantBaseName(plant);
        var key = base.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(plant);
      });

      Object.keys(grouped).forEach(function (key) {
        var list = grouped[key];
        list.sort(function (a, b) {
          var aDate = String(a.createdAt || '');
          var bDate = String(b.createdAt || '');
          var dateCmp = aDate.localeCompare(bDate);
          if (dateCmp !== 0) return dateCmp;
          return String(a.id || '').localeCompare(String(b.id || ''));
        });

        if (list.length === 1) {
          map[String(list[0].id)] = getPlantBaseName(list[0]);
          return;
        }

        for (var i = 0; i < list.length; i++) {
          map[String(list[i].id)] = String(i + 1) + '. ' + getPlantBaseName(list[i]);
        }
      });

      return map;
    }

    /* ---------- HOME SLIDER ---------- */
    function initHomeSlider() {
      var slider = document.getElementById('homeSlider');
      if (!slider) return;
      var imgs = slider.querySelectorAll('img');
      if (!imgs.length) return;
      var index = 0;
      imgs.forEach(function (img, i) {
        img.classList.toggle('active', i === 0);
      });
      setInterval(function () {
        imgs[index].classList.remove('active');
        index = (index + 1) % imgs.length;
        imgs[index].classList.add('active');
      }, 2500);
    }

    /* ---------- AUTH UI ---------- */
    function showLogin() {
      document.getElementById('loginCard').classList.remove('hidden');
      document.getElementById('registerCard').classList.add('hidden');
    }
    function showRegister() {
      document.getElementById('loginCard').classList.add('hidden');
      document.getElementById('registerCard').classList.remove('hidden');
    }

    /* ---------- NAV / SECTIONS ---------- */
    function showAppSection(id) {
      document.querySelectorAll('.app-section').forEach(function (s) {
        s.style.display = 'none';
      });
      var el = document.getElementById(id);
      if (el) el.style.display = 'block';

      // Keep navigation predictable: always jump to top when switching tabs.
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      } catch (_e) {
        window.scrollTo(0, 0);
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      document.querySelectorAll('.nav-link').forEach(function (l) {
        if (l.getAttribute('data-section') === id) l.classList.add('active');
        else l.classList.remove('active');
      });
    }

    function getAllowedSections() {
      return [
        'homeSection',
        'dashboardSection',
        'trackerSection',
        'librarySection',
        'tracerSection',
        'growthTimelineSection',
        'taskHistorySection',
        'plantMoodSection',
        'profileSection',
        'contactSection',
        'aboutSection',
        'plantDashboardSection'
      ];
    }

    function clearUrlParam(paramName) {
      try {
        var url = new URL(window.location.href);
        if (!url.searchParams.has(paramName)) return;
        url.searchParams.delete(paramName);
        var next =
          url.pathname +
          (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') +
          url.hash;
        window.history.replaceState({}, '', next);
      } catch (e) {
        console.log('URL cleanup error', e);
      }
    }

    function getInitialSectionFromUrl() {
      try {
        var params = new URLSearchParams(window.location.search);
        var section = params.get('section');
        if (section) clearUrlParam('section');
        if (section && getAllowedSections().indexOf(section) !== -1) {
          return section;
        }
      } catch (e) {
        console.log('URL parse error', e);
      }
      return 'homeSection';
    }

    async function loadSectionData(section) {
      var username = getCurrentUser();
      if (!username) return;

      if (section === 'librarySection') {
        await renderPlantLibrary(username);
      } else if (section === 'plantDashboardSection') {
        await renderPlantDashboard(username);
      } else if (section === 'tracerSection') {
        await initTracerDropdown(username);
        await renderTracer(username);
      } else if (section === 'growthTimelineSection') {
        if (typeof initGrowthTimelineSection === 'function') await initGrowthTimelineSection();
        if (typeof renderGrowthTimelineSection === 'function') await renderGrowthTimelineSection();
      } else if (section === 'profileSection') {
        await renderProfile(username);
      } else if (section === 'trackerSection') {
        await fillTrackerPlantSelect();
        await renderTrackerTasks();
        await renderTrackerCalendar();
      } else if (section === 'taskHistorySection') {
        await renderTaskHistory();
      }
    }

    async function refreshHeaderStats() {
      var plants = await getPlantsForUser();
      var tasks = await getTasksForUser();
      var plantCountEl = document.getElementById('plantCount');
      var upcomingCountEl = document.getElementById('upcomingCount');
      if (plantCountEl) plantCountEl.textContent = plants.length;
      var today = todayStr();
      var upcoming = 0;
      for (var i = 0; i < tasks.length; i++) {
        if (tasks[i].date >= today) upcoming++;
      }
      if (upcomingCountEl) upcomingCountEl.textContent = upcoming;
    }


