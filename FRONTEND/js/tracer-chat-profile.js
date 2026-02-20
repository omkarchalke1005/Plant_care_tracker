    /* ---------- TRACER (Overview + Growth + Exact dates) ---------- */
    async function initTracerDropdown() {
      var select = document.getElementById('tracerPlantSelect');
      var plants = await getPlantsForUser();
      if (!select) return;

      select.innerHTML = '<option value="">Select a plant</option>';
      plants.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });

      select.addEventListener('change', async function () {
        await renderTracer();
      });
    }

    async function renderTracer() {
      var plants = await getPlantsForUser();
      var tasks = await getTasksForUser();
      var select = document.getElementById('tracerPlantSelect');

      var imageBox = document.getElementById('tracerPlantImageBox');
      var headerBox = document.getElementById('tracerPlantHeader');
      var metaBox = document.getElementById('tracerPlantMeta');
      var growthChart = document.getElementById('growthChart');
      var trendMeta = document.getElementById('tracerTrendMeta');
      var healthSummary = document.getElementById('tracerHealthSummary');

      if (!select || !imageBox || !headerBox || !metaBox ||
          !growthChart || !trendMeta || !healthSummary) return;

      if (!plants.length) {
        imageBox.textContent = 'Add plants first to use Plant Analytics.';
        headerBox.innerHTML = '';
        metaBox.innerHTML = '';
        growthChart.innerHTML = '';
        trendMeta.textContent = '';
        healthSummary.innerHTML = '';
        return;
      }

      var plantId = select.value || plants[0].id;
      select.value = plantId;

      var plant = null;
      for (var i = 0; i < plants.length; i++) {
        if (String(plants[i].id) === String(plantId)) { plant = plants[i]; break; }
      }
      if (!plant) return;

      var src = plant.imageData || plant.imageUrl ||
        'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600';
      imageBox.innerHTML = '<img src="' + src + '" alt="' + plant.name + '">';

      headerBox.innerHTML =
        '<h2>' + plant.name + '</h2>' +
        '<p><span class="badge">Type: ' + plant.type + '</span>' +
        '<span class="badge">Growth: ' + plant.growthStage + '</span>' +
        '<span class="badge">Started: ' + (plant.createdAt || '-') + '</span></p>';

      var notesCount = (plant.notes && plant.notes.length) ? plant.notes.length : 0;
      metaBox.innerHTML =
        '<p class="tracer-label">Total notes:</p><p>' + notesCount + ' information / care notes saved.</p>' +
        '<p class="tracer-label">History entries:</p><p>' +
        ((plant.history && plant.history.length) ? plant.history.length : 0) +
        ' actions recorded for this plant.</p>';

      // Tasks for this plant
      function tracerTaskStatus(t) {
        return (t && t.status) ? t.status : 'pending';
      }

      var tasksForPlant = tasks.filter(function (t) {
        return String(t.plantId) === String(plant.id);
      });
      var doneCount = tasksForPlant.filter(function (t) { return tracerTaskStatus(t) === 'done'; }).length;
      var missedCount = tasksForPlant.filter(function (t) { return tracerTaskStatus(t) === 'missed'; }).length;
      var pendingCount = tasksForPlant.filter(function (t) { return tracerTaskStatus(t) === 'pending'; }).length;
      var totalCount = tasksForPlant.length;
      var completionPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
      var missedPct = totalCount ? Math.round((missedCount / totalCount) * 100) : 0;

      function getCurrentStreak(tasksArr, todayDate) {
        if (!tasksArr.length) return 0;
        var dayStatusMap = {};

        tasksArr.forEach(function (task) {
          if (!task.date || task.date > todayDate) return;
          var status = tracerTaskStatus(task);
          if (!dayStatusMap[task.date]) {
            dayStatusMap[task.date] = { done: false, bad: false };
          }
          if (status === 'done') dayStatusMap[task.date].done = true;
          if (status === 'missed' || status === 'pending') dayStatusMap[task.date].bad = true;
        });

        var streak = 0;
        var pointer = new Date(todayDate);
        for (var d = 0; d < 60; d++) {
          var key = formatDate(pointer);
          var state = dayStatusMap[key];
          if (!state) {
            pointer.setDate(pointer.getDate() - 1);
            continue;
          }
          if (state.bad || !state.done) break;
          streak++;
          pointer.setDate(pointer.getDate() - 1);
        }
        return streak;
      }

      var currentStreak = getCurrentStreak(tasksForPlant, todayStr());
      var latestHealth = 50 + Math.round((doneCount * 7) - (missedCount * 9) - (pendingCount * 3));
      if (latestHealth > 100) latestHealth = 100;
      if (latestHealth < 5) latestHealth = 5;

      healthSummary.innerHTML =
        '<div class="tracer-health-grid">' +
          '<div class="tracer-health-card metric-completion"><span>Completion %</span><strong>' + completionPct + '%</strong></div>' +
          '<div class="tracer-health-card metric-missed"><span>Missed %</span><strong>' + missedPct + '%</strong></div>' +
          '<div class="tracer-health-card metric-streak"><span>Current streak</span><strong>' + currentStreak + ' days</strong></div>' +
          '<div class="tracer-health-card metric-health"><span>Health score</span><strong>' + latestHealth + '/100</strong></div>' +
        '</div>' +
        '<p class="tracer-risk ' + (missedPct >= 40 ? 'risk-high' : missedPct >= 20 ? 'risk-medium' : 'risk-low') + '">' +
          'User Behaviour Analytics: ' + totalCount + ' tracked tasks' +
        '</p>';

      growthChart.innerHTML = '';
      var phases = ['Seedling', 'Young', 'Growing', 'Mature'];
      var maxHeight = 130;
      var created = plant.createdAt ? new Date(plant.createdAt) : new Date();
      var ageDays = Math.max(0, daysBetween(formatDate(created), todayStr()));
      var plantStage = (plant.growthStage || '').toString().toLowerCase().trim();

      for (var k = 0; k < phases.length; k++) {
        var wrapper = document.createElement('div');
        wrapper.className = 'growth-bar-wrapper';

        var bar = document.createElement('div');
        bar.className = 'growth-bar';

        var base = 30 + k * 15;
        var extra = Math.min(60, Math.floor(ageDays / 3));
        var height = Math.min(maxHeight, base + extra);
        bar.style.height = height + 'px';

        var phaseName = phases[k].toLowerCase().trim();
        bar.style.background = 'linear-gradient(180deg,#004d33,#001a12)';
        bar.style.opacity = '0.5';
        bar.style.boxShadow = 'none';

        if (plantStage === phaseName) {
          bar.style.background = 'linear-gradient(180deg,#ffe066,#ffb300)';
          bar.style.boxShadow = '0 0 20px #ffd54f';
          bar.style.opacity = '1';
        }

        var label = document.createElement('div');
        label.textContent = phases[k];

        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        growthChart.appendChild(wrapper);
      }

      trendMeta.textContent = 'Growth stage graph with 4 bars. Highlighted bar shows current stage.';

      if (!window.__pctTrendResizeBound) {
        window.__pctTrendResizeBound = true;
        window.addEventListener('resize', function () {
          renderTracer();
        });
      }

    }

    /* ---------- CHATBOT ---------- */
    function addChatMessage(type, text) {
      var chatWindow = document.getElementById('chatWindow');
      if (!chatWindow) return;
      var div = document.createElement('div');
      div.className = type === 'user' ? 'chat-msg-user' : 'chat-msg-bot';
      var span = document.createElement('span');
      span.textContent = text;
      div.appendChild(span);
      chatWindow.appendChild(div);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function handleChat(username) {
      var input = document.getElementById('chatInput');
      if (!input) return;
      var question = input.value.trim();
      if (!question) return;
      addChatMessage('user', question);
      input.value = '';

      var plants = await getPlantsForUser();
      var tasks = await getTasksForUser();
      var today = todayStr();
      var q = question.toLowerCase();
      var qClean = q.replace(/[^\w\s]/g, ' ');
      var reply = '';

      function cleanPlantName(name) {
        return String(name || '').toLowerCase().split('(')[0].trim();
      }

      function nextDates(startDateStr, count, stepDays) {
        var out = [];
        var base = startDateStr || today;
        var step = stepDays || 1;
        for (var i = 0; i < count; i++) {
          out.push(addDays(base, i * step));
        }
        return out;
      }

      function findCatalogEntryByName(name) {
        var n = cleanPlantName(name);
        for (var i = 0; i < plantCatalog.length; i++) {
          if (cleanPlantName(plantCatalog[i].name) === n) return plantCatalog[i];
        }
        for (var j = 0; j < plantCatalog.length; j++) {
          if (cleanPlantName(plantCatalog[j].name).indexOf(n) !== -1 || n.indexOf(cleanPlantName(plantCatalog[j].name)) !== -1) return plantCatalog[j];
        }
        return null;
      }

      function detectRequestedPlant() {
        var best = null;
        var bestScore = 0;
        for (var i = 0; i < plants.length; i++) {
          var pname = cleanPlantName(plants[i].name);
          var words = pname.split(/\s+/).filter(function (w) { return w.length > 2; });
          var score = 0;
          if (qClean.indexOf(pname) !== -1) score += 5;
          for (var j = 0; j < words.length; j++) {
            if (qClean.indexOf(words[j]) !== -1) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            best = plants[i];
          }
        }
        return bestScore > 0 ? best : null;
      }

      function detectCatalogPlantFromQuestion() {
        for (var i = 0; i < plantCatalog.length; i++) {
          var cname = cleanPlantName(plantCatalog[i].name);
          if (qClean.indexOf(cname) !== -1) return plantCatalog[i];
          var words = cname.split(/\s+/).filter(function (w) { return w.length > 2; });
          for (var j = 0; j < words.length; j++) {
            if (qClean.indexOf(words[j]) !== -1) return plantCatalog[i];
          }
        }
        return null;
      }

      function buildCareData(plant) {
        var schedule = (typeof getScheduleForPlant === 'function')
          ? getScheduleForPlant(plant)
          : (plant && plant.type === 'Outdoor' ? { water: 3, fert: 20 } : { water: 5, fert: 30 });

        var tasksForPlant = tasks.filter(function (t) {
          return String(t.plantId) === String(plant.id);
        });

        var waterTasks = tasksForPlant.filter(function (t) { return /water/i.test(t.title); })
          .sort(function (a, b) { return a.date.localeCompare(b.date); });
        var fertTasks = tasksForPlant.filter(function (t) { return /(fertil|feed|manure)/i.test(t.title); })
          .sort(function (a, b) { return a.date.localeCompare(b.date); });

        var lastWater = null;
        for (var i = waterTasks.length - 1; i >= 0; i--) {
          if (waterTasks[i].date <= today) { lastWater = waterTasks[i]; break; }
        }
        if (!lastWater) lastWater = waterTasks[waterTasks.length - 1] || null;

        var lastFert = null;
        for (var j = fertTasks.length - 1; j >= 0; j--) {
          if (fertTasks[j].date <= today) { lastFert = fertTasks[j]; break; }
        }
        if (!lastFert) lastFert = fertTasks[fertTasks.length - 1] || null;

        var nextWaterDate = lastWater ? addDays(lastWater.date, schedule.water) : addDays(today, schedule.water);
        var nextFertDate = lastFert ? addDays(lastFert.date, schedule.fert) : addDays(today, schedule.fert);

        var sunlightStart = today;
        var sunlightDates = nextDates(sunlightStart, 5, 1).join(', ');

        var catalog = findCatalogEntryByName(plant.name);
        var sunlightText = plant.type === 'Outdoor'
          ? 'Full to partial direct sun (prefer morning sun 4-6 hours).'
          : 'Bright indirect sunlight, avoid harsh noon direct sun.';
        if (catalog && /full sun/i.test(catalog.info)) sunlightText = 'Needs full sun for better growth.';
        else if (catalog && /low light|indirect light/i.test(catalog.info)) sunlightText = 'Performs best in bright indirect to medium light.';

        return {
          schedule: schedule,
          nextWaterDate: nextWaterDate,
          nextFertDate: nextFertDate,
          sunlightDates: sunlightDates,
          sunlightText: sunlightText
        };
      }

      var asksWebsite =
        q.indexOf('how to use') !== -1 ||
        q.indexOf('how do i use') !== -1 ||
        q.indexOf('use this website') !== -1 ||
        q.indexOf('what is this website') !== -1 ||
        q.indexOf('why is this website') !== -1 ||
        (q.indexOf('useful') !== -1 && q.indexOf('website') !== -1);

      if (asksWebsite) {
        reply =
          'Use Plant Care Tracker like this: Add plants in Add Plants, create watering/fertilizer tasks in Care Tracker, review exact dates in Plant Analytics, and open Plant Gallery for each plant dashboard.';
        addChatMessage('bot', reply);
        return;
      }

      if (!plants.length) {
        addChatMessage('bot',
          'You have no plants added yet. Add at least one plant in Add Plants, then ask me: "water date for my rose", "sunlight needed for aloe", or "full care info for my money plant".');
        return;
      }

      var wantsAllPlants = q.indexOf('all plants') !== -1 || q.indexOf('all my plants') !== -1;
      var asksWater = q.indexOf('water') !== -1;
      var asksFert = q.indexOf('fert') !== -1 || q.indexOf('manure') !== -1 || q.indexOf('feed') !== -1;
      var asksSun = q.indexOf('sun') !== -1 || q.indexOf('light') !== -1;
      var asksDates = q.indexOf('date') !== -1 || q.indexOf('when') !== -1 || q.indexOf('next') !== -1 || q.indexOf('schedule') !== -1;
      var asksInfo = q.indexOf('info') !== -1 || q.indexOf('about') !== -1 || q.indexOf('required') !== -1 || q.indexOf('care') !== -1;

      var targetPlants = [];
      if (wantsAllPlants) {
        targetPlants = plants.slice(0, 6);
      } else {
        var exactPlant = detectRequestedPlant();
        if (exactPlant) {
          targetPlants = [exactPlant];
        } else {
          var catalogPlant = detectCatalogPlantFromQuestion();
          if (catalogPlant) {
            addChatMessage('bot',
              catalogPlant.name + ': ' + catalogPlant.info + ' Watering and fertilizer dates can be calculated after you add this plant in Add Plants and create tasks in Care Tracker.');
            return;
          }
          targetPlants = [plants[0]];
        }
      }

      var lines = [];
      for (var t = 0; t < targetPlants.length; t++) {
        var plant = targetPlants[t];
        if (!plant) continue;
        var care = buildCareData(plant);
        var showFull = asksInfo || (!asksWater && !asksFert && !asksSun);
        var parts = [];
        parts.push(plant.name + ' (' + plant.type + '):');

        if (showFull || asksWater || asksDates) {
          parts.push('Water every ' + care.schedule.water + ' days, next watering date: ' + care.nextWaterDate + '.');
        }
        if (showFull || asksFert || asksDates) {
          parts.push('Fertilize every ' + care.schedule.fert + ' days, next fertilizer date: ' + care.nextFertDate + '.');
        }
        if (showFull || asksSun || asksDates) {
          parts.push('Sunlight: ' + care.sunlightText + ' Upcoming sunlight dates: ' + care.sunlightDates + '.');
        }
        lines.push(parts.join(' '));
      }

      if (!lines.length) {
        reply = 'Please ask with a plant name, for example: "care details for aloe vera".';
      } else {
        reply = lines.join('\n');
      }

      addChatMessage('bot', reply);
    }

    /* ---------- PROFILE RENDER ---------- */
    async function renderProfile() {
      var user = currentUser;
      var plants = await getPlantsForUser();

      var userData = null;
      if (user) {
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            userData = doc.data();
          }
        } catch (error) {
          console.error('Error getting user data:', error);
        }
      }

      var fullName = userData && userData.name ? userData.name : 'User';

      var avatarEl = document.getElementById('profileAvatar');
      if (avatarEl) {
        avatarEl.textContent = (fullName || 'U').charAt(0).toUpperCase();
      }

      var displayNameEl = document.getElementById('profileDisplayName');
      if (displayNameEl) {
        displayNameEl.textContent = fullName || 'Plant lover';
      }

      function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = (value !== undefined && value !== null && value !== '') ? value : '-';
      }

      setText('profileNameView', fullName);
      setText('profileUsernameView', userData && userData.username);
      setText('profileEmailView', user && user.email);
      setText('profilePhoneView', userData && userData.phone);
      setText('profileMemberSince', userData && userData.createdAt ? userData.createdAt : '-');

      var total = plants.length;
      var indoor = 0;
      var outdoor = 0;
      for (var i = 0; i < plants.length; i++) {
        if (plants[i].type === 'Indoor') indoor++;
        else if (plants[i].type === 'Outdoor') outdoor++;
      }

      setText('profilePlantsMain', total);
      setText('profilePlantsCount', total);
      setText('profileIndoorCount', indoor);
      setText('profileOutdoorCount', outdoor);
      setText('profileLastPlant', total ? plants[plants.length - 1].name : '-');
    }

    /* ---------- PROFILE EDIT UI ---------- */
    async function initProfileUI() {
      var editBtn = document.getElementById('editProfileBtn');
      var cancelBtn = document.getElementById('cancelEditProfileBtn');
      var editCard = document.getElementById('profileEditCard');
      var form = document.getElementById('editProfileForm');

      if (!editBtn || !cancelBtn || !editCard || !form) return;

      editBtn.addEventListener('click', async function () {
        var user = getCurrentUser();
        if (!user) return;

        // Get current user data from Firestore
        var userData = null;
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            userData = doc.data();
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          return;
        }

        var fullNameInput = document.getElementById('editFullName');
        var emailInput = document.getElementById('editEmail');
        var phoneInput = document.getElementById('editPhone');
        var passInput = document.getElementById('editPassword');

        if (fullNameInput) fullNameInput.value = userData.name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        if (passInput) passInput.value = '';

        editCard.classList.remove('hidden');
        cancelBtn.classList.remove('hidden');
      });

      cancelBtn.addEventListener('click', function () {
        editCard.classList.add('hidden');
        cancelBtn.classList.add('hidden');
      });

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var user = getCurrentUser();
        if (!user) return;

        var fullNameInput = document.getElementById('editFullName');
        var emailInput = document.getElementById('editEmail');
        var phoneInput = document.getElementById('editPhone');
        var passInput = document.getElementById('editPassword');

        var updatedData = {};
        if (fullNameInput && fullNameInput.value.trim()) updatedData.name = fullNameInput.value.trim();
        if (emailInput && emailInput.value.trim()) updatedData.email = emailInput.value.trim();
        if (phoneInput && phoneInput.value.trim()) updatedData.phone = phoneInput.value.trim();

        // Update password if provided
        if (passInput && passInput.value.trim()) {
          try {
            await user.updatePassword(passInput.value.trim());
          } catch (error) {
            console.error('Error updating password:', error);
            alert('Error updating password: ' + error.message);
            return;
          }
        }

        // Update other data in Firestore
        try {
          await db.collection('users').doc(user.uid).update(updatedData);
          editCard.classList.add('hidden');
          cancelBtn.classList.add('hidden');
          await renderProfile();
          alert('Profile updated successfully!');
        } catch (error) {
          console.error('Error updating profile:', error);
          alert('Error updating profile: ' + error.message);
        }
      });
    }

    /* ---------- APP INIT FOR USER ---------- */
    async function initAppForUser(user) {
      var preAuthLanding = document.getElementById('preAuthLanding');
      var authWrapper = document.getElementById('authWrapper');
      var appWrapper = document.getElementById('appWrapper');
      if (preAuthLanding) preAuthLanding.classList.add('hidden');
      if (authWrapper) authWrapper.classList.add('hidden');
      if (appWrapper) appWrapper.classList.remove('hidden');

      var headerName = document.getElementById('usernameDisplay');
      if (headerName) {
        headerName.textContent = '';
      }

      await initDashboardMain();
      await initPlantDashboard();

      await initTracerDropdown();

      await renderPlantLibrary();
      await renderPlantDashboard();

      await renderTracer();
      await renderProfile();
      await refreshHeaderStats();


      var initialSection = getInitialSectionFromUrl();
      showAppSection(initialSection);
      await loadSectionData(initialSection);
    }

    /* ---------- NAVIGATION ---------- */
    async function initNav() {
      var links = document.querySelectorAll('.nav-link');
      links.forEach(function (link) {
        link.addEventListener('click', async function (e) {
          e.preventDefault();
          var section = this.getAttribute('data-section');
          if (section) showAppSection(section);
          await loadSectionData(section);
        });
      });
    }

    /* ---------- CHATBOT FLOATING UI ---------- */
    function initChatbotUI() {
      var btn = document.getElementById('chatSendBtn');
      var input = document.getElementById('chatInput');
      var fab = document.getElementById('chatFab');
      var popup = document.getElementById('chatbotSection');
      var closeBtn = document.getElementById('chatCloseBtn');

      if (fab && popup) {
        fab.addEventListener('click', function () {
          popup.classList.toggle('hidden');
        });
      }

      if (closeBtn && popup) {
        closeBtn.addEventListener('click', function () {
          popup.classList.add('hidden');
        });
      }

      if (btn && input) {
        btn.addEventListener('click', function () {
          var u = getCurrentUser();
          if (!u) {
            alert('Please login first.');
            return;
          }
          handleChat(u);
        });

        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var u2 = getCurrentUser();
            if (!u2) {
              alert('Please login first.');
              return;
            }
            handleChat(u2);
          }
        });
      }
    }

    /* ---------- CONTACT FORM (WhatsApp link) ---------- */
    function initContactForm() {
      var form = document.getElementById('contactForm');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('yourName').value.trim();
        var email = document.getElementById('yourEmail').value.trim();
        var msg = document.getElementById('yourMessage').value.trim();

        if (!name || !email || !msg) {
          alert('Please fill all the fields before sending.');
          return;
        }

        var fullMessage =
          'Plant Care Tracker message:%0A' +
          'Name: ' + encodeURIComponent(name) + '%0A' +
          'Email: ' + encodeURIComponent(email) + '%0A' +
          'Message: ' + encodeURIComponent(msg);

        // Your WhatsApp number with country code
        var waUrl = 'https://wa.me/918956676259?text=' + fullMessage;
        window.open(waUrl, '_blank');
      });
    }





