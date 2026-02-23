    /* ---------- TRACER (Overview + Growth + Exact dates) ---------- */
    async function initTracerDropdown() {
      var select = document.getElementById('tracerPlantSelect');
      var plants = await getPlantsForUser();
      if (!select) return;
      var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};

      select.innerHTML = '<option value="">Select a plant</option>';
      plants.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = nameMap[String(p.id)] || p.name;
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
      var stagePill = document.getElementById('tracerStagePill');

      if (!select || !imageBox || !headerBox || !metaBox ||
          !growthChart || !trendMeta || !healthSummary) return;

      if (!plants.length) {
        imageBox.textContent = 'Add plants first to use Plant Analytics.';
        headerBox.innerHTML = '';
        metaBox.innerHTML = '';
        growthChart.innerHTML = '';
        trendMeta.textContent = '';
        healthSummary.innerHTML = '';
        if (stagePill) stagePill.textContent = 'Stage insight';
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

      metaBox.innerHTML = '';

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
      var today = todayStr();
      var next7Date = addDays(today, 7);
      var upcoming7Count = tasksForPlant.filter(function (t) {
        var status = tracerTaskStatus(t);
        return status === 'pending' && t.date && t.date >= today && t.date <= next7Date;
      }).length;

      healthSummary.innerHTML =
        '<div class="tracer-health-grid">' +
          '<div class="tracer-health-card metric-completion"><span>Completion %</span><strong>' + completionPct + '%</strong></div>' +
          '<div class="tracer-health-card metric-missed"><span>Missed %</span><strong>' + missedPct + '%</strong></div>' +
          '<div class="tracer-health-card metric-streak"><span>Upcoming (7 days)</span><strong>' + upcoming7Count + ' tasks</strong></div>' +
        '</div>' +
        '<p class="tracer-risk ' + (missedPct >= 40 ? 'risk-high' : missedPct >= 20 ? 'risk-medium' : 'risk-low') + '">' +
          'Care Rhythm: ' + totalCount + ' tracked tasks' +
        '</p>';

      growthChart.innerHTML = '';
      var phases = ['Seedling', 'Young', 'Growing', 'Mature'];
      var maxHeight = 130;
      var created = plant.createdAt ? new Date(plant.createdAt) : new Date();
      var ageDays = Math.max(0, daysBetween(formatDate(created), todayStr()));
      var plantStage = (plant.growthStage || '').toString().toLowerCase().trim();
      if (stagePill) {
        stagePill.textContent = plant.growthStage || 'Unknown stage';
      }

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

    /* ---------- PROFILE RENDER ---------- */
    async function renderProfile() {
      var user = currentUser;
      var plants = await getPlantsForUser();
      var tasks = await getTasksForUser();

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

      var done = 0;
      var pending = 0;
      var missed = 0;
      for (var j = 0; j < tasks.length; j++) {
        var status = tasks[j] && tasks[j].status ? String(tasks[j].status) : 'pending';
        if (status === 'done') done++;
        else if (status === 'missed') missed++;
        else pending++;
      }
      var completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      setText('profileCompletionPct', completion + '%');
      setText('profilePendingCount', pending);
      setText('profileMissedCount', missed);

      var indoorPct = total ? Math.round((indoor / total) * 100) : 0;
      var outdoorPct = total ? 100 - indoorPct : 0;
      setText('profileIndoorPct', indoorPct + '%');
      setText('profileOutdoorPct', outdoorPct + '%');

      var indoorBar = document.getElementById('profileIndoorBar');
      if (indoorBar) indoorBar.style.width = indoorPct + '%';
      var outdoorBar = document.getElementById('profileOutdoorBar');
      if (outdoorBar) outdoorBar.style.width = outdoorPct + '%';
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

      await Promise.all([
        initDashboardMain(),
        initPlantDashboard(),
        initTracerDropdown()
      ]);

      var params = new URLSearchParams(window.location.search);
      var initialSection = params.get('auth') === 'login' ? 'homeSection' : getInitialSectionFromUrl();
      if (params.get('auth') === 'login') {
        clearUrlParam('auth');
        clearUrlParam('section');
      }
      showAppSection(initialSection);
      await loadSectionData(initialSection);

      Promise.all([
        renderProfile(),
        refreshHeaderStats()
      ]).catch(function (error) {
        console.error('Post-init refresh error:', error);
      });
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





