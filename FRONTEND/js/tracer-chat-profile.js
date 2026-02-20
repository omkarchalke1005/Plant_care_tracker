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
      var waterList = document.getElementById('tracerWaterDates');
      var fertList = document.getElementById('tracerFertilizerDates');
      var nextInfo = document.getElementById('tracerNextInfo');
      var growthChart = document.getElementById('growthChart');
      var healthSummary = document.getElementById('tracerHealthSummary');
      var recentActivity = document.getElementById('tracerRecentActivity');

      if (!select || !imageBox || !headerBox || !metaBox ||
          !waterList || !fertList || !nextInfo || !growthChart ||
          !healthSummary || !recentActivity) return;

      if (!plants.length) {
        imageBox.textContent = 'Add plants first to use Growth Tracking.';
        headerBox.innerHTML = '';
        metaBox.innerHTML = '';
        waterList.innerHTML = '';
        fertList.innerHTML = '';
        growthChart.innerHTML = '';
        healthSummary.innerHTML = '';
        recentActivity.innerHTML = '';
        nextInfo.textContent = '';
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
      var waterTasks = tasksForPlant.filter(function (t) {
        return /water/i.test(t.title);
      }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      var fertTasks = tasksForPlant.filter(function (t) {
        return /(fertil|feed)/i.test(t.title);
      }).sort(function (a, b) { return a.date.localeCompare(b.date); });

      var doneCount = tasksForPlant.filter(function (t) { return tracerTaskStatus(t) === 'done'; }).length;
      var missedCount = tasksForPlant.filter(function (t) { return tracerTaskStatus(t) === 'missed'; }).length;
      var pendingCount = tasksForPlant.filter(function (t) { return tracerTaskStatus(t) === 'pending'; }).length;
      var trackedCount = doneCount + missedCount;
      var adherence = trackedCount ? Math.round((doneCount / trackedCount) * 100) : 0;
      var risk = missedCount >= 3 ? 'High' : missedCount >= 1 ? 'Medium' : 'Low';
      var riskClass = risk === 'High' ? 'risk-high' : risk === 'Medium' ? 'risk-medium' : 'risk-low';

      healthSummary.innerHTML =
        '<div class="tracer-health-grid">' +
          '<div class="tracer-health-card"><span>Done</span><strong>' + doneCount + '</strong></div>' +
          '<div class="tracer-health-card"><span>Missed</span><strong>' + missedCount + '</strong></div>' +
          '<div class="tracer-health-card"><span>Pending</span><strong>' + pendingCount + '</strong></div>' +
          '<div class="tracer-health-card"><span>Adherence</span><strong>' + adherence + '%</strong></div>' +
        '</div>' +
        '<p class="tracer-risk ' + riskClass + '">Care Risk: ' + risk + '</p>';

      waterList.innerHTML = '';
      fertList.innerHTML = '';

      if (!waterTasks.length) {
        waterList.innerHTML = '<li>No watering tasks recorded yet.</li>';
      } else {
        waterTasks.forEach(function (w) {
          var li = document.createElement('li');
          li.textContent = w.date + ' — ' + w.title + ' (' + tracerTaskStatus(w).toUpperCase() + ')';
          waterList.appendChild(li);
        });
      }

      if (!fertTasks.length) {
        fertList.innerHTML = '<li>No fertilizer tasks recorded yet.</li>';
      } else {
        fertTasks.forEach(function (f) {
          var li2 = document.createElement('li');
          li2.textContent = f.date + ' — ' + f.title + ' (' + tracerTaskStatus(f).toUpperCase() + ')';
          fertList.appendChild(li2);
        });
      }

      // Next watering / fertilizing info
      var schedule = getScheduleForPlant(plant);
      var today = todayStr();

      var lastWater = null;
      for (var i2 = waterTasks.length - 1; i2 >= 0; i2--) {
        if (waterTasks[i2].date <= today) { lastWater = waterTasks[i2]; break; }
      }
      if (!lastWater) lastWater = waterTasks[waterTasks.length - 1] || null;

      var lastFert = null;
      for (var j = fertTasks.length - 1; j >= 0; j--) {
        if (fertTasks[j].date <= today) { lastFert = fertTasks[j]; break; }
      }
      if (!lastFert) lastFert = fertTasks[fertTasks.length - 1] || null;

      var nextWaterDate = lastWater ? addDays(lastWater.date, schedule.water) : addDays(today, schedule.water);
      var nextFertDate = lastFert ? addDays(lastFert.date, schedule.fert) : addDays(today, schedule.fert);

      nextInfo.textContent =
        'For ' + plant.name + ' (' + plant.type +
        '): next watering is on ' + nextWaterDate +
        ' and next fertilizer date is ' + nextFertDate + '.';

      recentActivity.innerHTML = '';
      var recentTasks = tasksForPlant.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      }).slice(0, 5);
      if (!recentTasks.length) {
        recentActivity.innerHTML = '<li>No recent care activity yet.</li>';
      } else {
        recentTasks.forEach(function (t) {
          var li3 = document.createElement('li');
          li3.textContent = t.date + ' — ' + t.title + ' (' + tracerTaskStatus(t).toUpperCase() + ')';
          recentActivity.appendChild(li3);
        });
      }

      // Growth phase diagram (4 phases based on plant age)
      // Growth phase diagram (4 phases based on plant age)
growthChart.innerHTML = '';

var phases = ['Seedling', 'Young', 'Growing', 'Mature'];
var maxHeight = 130;
var created = plant.createdAt ? new Date(plant.createdAt) : new Date();
var ageDays = Math.max(0, daysBetween(formatDate(created), todayStr()));

var plantStage = (plant.growthStage || "").toLowerCase();

for (var k = 0; k < phases.length; k++) {

  var wrapper = document.createElement('div');
  wrapper.className = 'growth-bar-wrapper';

  var bar = document.createElement('div');
  bar.className = 'growth-bar';

  // height increases with phase and age
  var base = 30 + k * 15;
  var extra = Math.min(60, Math.floor(ageDays / 3));
  var height = Math.min(maxHeight, base + extra);
  bar.style.height = height + 'px';

  // ⭐ COLOR LOGIC (THIS IS YOUR FEATURE)
  var phaseName = phases[k].toLowerCase();

var plantStageClean = (plantStage || "")
    .toString()
    .toLowerCase()
    .trim();

var phaseNameClean = (phases[k] || "")
    .toString()
    .toLowerCase()
    .trim();

bar.style.background = "linear-gradient(180deg,#004d33,#001a12)";
bar.style.opacity = "0.5";
bar.style.boxShadow = "none";

if (plantStageClean === phaseNameClean) {

    bar.style.background = "linear-gradient(180deg,#ffe066,#ffb300)";
    bar.style.boxShadow = "0 0 20px #ffd54f";
    bar.style.opacity = "1";

}


  var label = document.createElement('div');
  label.textContent = phases[k];

  wrapper.appendChild(bar);
  wrapper.appendChild(label);

  growthChart.appendChild(wrapper);
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
      var schedulePlant = plants[0] || null; // use first plant for schedule answers if needed
      var today = todayStr();
      var reply = '';

      var q = question.toLowerCase();

      // ===== UNIVERSAL PLANT ANSWERS =====

if (plants && plants.length) {

  let plant = plants[0]; // takes first plant user added

  if (q.includes("sun") || q.includes("light")) {
    reply = plant.name + " needs bright indirect sunlight if indoor. If outdoor, give morning sunlight.";
  }

  else if (q.includes("cut") || q.includes("prune") || q.includes("leaf")) {
    reply = "For " + plant.name + ", remove yellow, dry or damaged leaves using clean scissors.";
  }

  else if (q.includes("info") || q.includes("about")) {
    reply = plant.name + " is a plant that needs proper watering, sunlight and fertilizer to grow healthy.";
  }

}


      /* 1) Guess which plant it might be (from words) */
      var guesses = [];
      var qClean = q.replace(/[^\w\s]/g, ' ');
      plantCatalog.forEach(function (p) {
        var nameLower = p.name.toLowerCase();
        var mainWord = nameLower.split('(')[0].trim();
        if (qClean.indexOf(mainWord.split(' ')[0]) !== -1 || qClean.indexOf(mainWord) !== -1) {
          guesses.push(p.name);
        }
      });

      /* 2) Detect if user is asking about website usage / usefulness */
      var asksWebsite =
        q.indexOf('how to use') !== -1 ||
        q.indexOf('how do i use') !== -1 ||
        q.indexOf('use this website') !== -1 ||
        q.indexOf('use this web') !== -1 ||
        q.indexOf('what is this website') !== -1 ||
        q.indexOf('why is this website') !== -1 ||
        q.indexOf('how this web is useful') !== -1 ||
        q.indexOf('how is this site useful') !== -1 ||
        (q.indexOf('useful') !== -1 && q.indexOf('website') !== -1);

      if (asksWebsite) {
        reply =
          'Plant Care Tracker keeps all your plant details in one place:\n' +
          '- Add each plant with photo, type and growth stage in “Add Plants”.\n' +
          '- See notes, images and history in “Plant Gallery” and “Plant Dashboard”.\n' +
          '- Use “Care Tracker” to plan watering and fertilizer and see them in a calendar.\n' +
          '- “Growth Tracking” shows exact watering / fertilizer dates and growth phases.\n' +
          '- This floating AI Assistant helps you whenever you are confused or want quick tips.';
        addChatMessage('bot', reply);
        return;
      }

      /* 3) If user asks schedule questions, use first plant or guessed plant if possible */
      var plantForAnswer = schedulePlant;
      if (guesses.length && plants.length) {
        for (var gi = 0; gi < guesses.length; gi++) {
          for (var pi = 0; pi < plants.length; pi++) {
            if (plants[pi].name.toLowerCase().indexOf(guesses[gi].toLowerCase().split('(')[0].trim()) !== -1) {
              plantForAnswer = plants[pi];
              break;
            }
          }
        }
      }

      var schedule = plantForAnswer ? getScheduleForPlant(plantForAnswer) : { water: 5, fert: 30 };

      var tasksForPlant = plantForAnswer ? tasks.filter(function (t) {
        return Number(t.plantId) === Number(plantForAnswer.id);
      }) : [];

      var waterTasks = tasksForPlant.filter(function (t) { return /water/i.test(t.title); })
        .sort(function (a, b) { return a.date.localeCompare(b.date); });
      var fertTasks = tasksForPlant.filter(function (t) { return /(fertil|feed)/i.test(t.title); })
        .sort(function (a, b) { return a.date.localeCompare(b.date); });

      var lastWater = null;
      for (var i2 = waterTasks.length - 1; i2 >= 0; i2--) {
        if (waterTasks[i2].date <= today) { lastWater = waterTasks[i2]; break; }
      }
      if (!lastWater) lastWater = waterTasks[waterTasks.length - 1] || null;
      var nextWaterDate = lastWater ? addDays(lastWater.date, schedule.water) : addDays(today, schedule.water);

      var lastFert = null;
      for (var j = fertTasks.length - 1; j >= 0; j--) {
        if (fertTasks[j].date <= today) { lastFert = fertTasks[j]; break; }
      }
      if (!lastFert) lastFert = fertTasks[fertTasks.length - 1] || null;
      var nextFertDate = lastFert ? addDays(lastFert.date, schedule.fert) : addDays(today, schedule.fert);

      /* 4) Smart replies – ALWAYS answer something */
      if (q.indexOf('water') !== -1 && plantForAnswer) {
        reply = 'For ' + plantForAnswer.name + ' (' + plantForAnswer.type +
          '), water roughly every ' + schedule.water + ' days. Based on your data, the next watering date is ' +
          nextWaterDate + '.';
      } else if (
        (q.indexOf('fert') !== -1 ||
         q.indexOf('manure') !== -1 ||
         q.indexOf('feed') !== -1) && plantForAnswer
      ) {
        reply = 'For ' + plantForAnswer.name + ' (' + plantForAnswer.type +
          '), add fertilizer about every ' + schedule.fert +
          ' days. Based on your data, the next fertilizer date is ' + nextFertDate + '.';
      } else if (guesses.length) {
        reply =
          'I think you are talking about: ' + guesses.join(', ') + '.\n' +
          'Add this plant in “Add Plants” and use “Care Tracker” to create watering / fertilizer tasks.';
      } else if (!plants.length) {
        reply =
          'You have not added any plants yet, but your question is still valid.\n' +
          'General tip: most indoor plants like slightly moist soil (not fully wet) and bright indirect light.\n' +
          'Add at least one plant in “Add Plants” so I can give you more exact dates and schedules based on your data.';
      } else {
        // Generic fallback – answer anything in a helpful way
        reply =
          'Here is a helpful answer for you:\n' +
          '- Your question: "' + question + '"\n' +
          '- My suggestion: keep checking the “Add Plants”, “Care Tracker” and “Growth Tracking” tabs for your plants.\n' +
          'I may not fully understand every detail, but I will always try to give a useful reply.\n' +
          'You can also ask directly: “When to water my ' + plants[0].name +
          '?” or “How is this website useful for project?”.';
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
      var authWrapper = document.getElementById('authWrapper');
      var appWrapper = document.getElementById('appWrapper');
      if (authWrapper) authWrapper.classList.add('hidden');
      if (appWrapper) appWrapper.classList.remove('hidden');

      var headerName = document.getElementById('usernameDisplay');
      if (headerName) {
        headerName.textContent = user.displayName || user.email || 'User';
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

