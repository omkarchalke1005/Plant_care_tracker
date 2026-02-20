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
       imageUrl:'https://images.pexels.com/photos/672142/pexels-photo-672142.jpeg?auto=compress&cs=tinysrgb&w=600'}
    ];

    /* ---------- FIREBASE STORAGE HELPERS ---------- */
    let currentUser = null;

    function setCurrentUser(user) {
      currentUser = user;
    }

    function getCurrentUser() {
      return currentUser;
    }

    async function getPlantsForUser() {
      if (!currentUser) return [];
      try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('plants').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error getting plants:', error);
        return [];
      }
    }

    async function savePlant(plant) {
      if (!currentUser) throw new Error('No user logged in');
      const docRef = await db.collection('users').doc(currentUser.uid).collection('plants').add(plant);
      return docRef.id;
    }

    async function updatePlant(plantId, plant) {
      if (!currentUser) throw new Error('No user logged in');
      await db.collection('users').doc(currentUser.uid).collection('plants').doc(plantId).update(plant);
    }

    async function deletePlantFromDB(plantId) {
  if (!currentUser) throw new Error('No user logged in');
  await db.collection('users')
    .doc(currentUser.uid)
    .collection('plants')
    .doc(plantId)
    .delete();
}


    async function getTasksForUser() {
      if (!currentUser) return [];
      try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('tasks').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
      }
    }

    async function saveTask(task) {
      if (!currentUser) throw new Error('No user logged in');
      const docRef = await db.collection('users').doc(currentUser.uid).collection('tasks').add(task);
      return docRef.id;
    }

    async function deleteTask(taskId) {
      if (!currentUser) throw new Error('No user logged in');
      await db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).delete();
    }

    function setCurrentPlantId(id) {
      if (!currentUser) return;
      localStorage.setItem('pct_current_plant_' + currentUser.uid, String(id));
    }

    function getCurrentPlantId() {
      if (!currentUser) return null;
      return localStorage.getItem('pct_current_plant_' + currentUser.uid);
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
        'plantMoodSection',
        'profileSection',
        'contactSection',
        'aboutSection',
        'plantDashboardSection'
      ];
    }

    function getInitialSectionFromUrl() {
      try {
        var params = new URLSearchParams(window.location.search);
        var section = params.get('section');
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
      } else if (section === 'profileSection') {
        await renderProfile(username);
      } else if (section === 'trackerSection') {
        await fillTrackerPlantSelect();
        await renderTrackerTasks();
        await renderTrackerCalendar();
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

