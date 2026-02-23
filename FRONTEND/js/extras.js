// ===== DARK MODE TOGGLE =====
const themeToggle = document.getElementById("themeToggle");
if(themeToggle){
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent =
      document.body.classList.contains("dark") ? "\u2600\uFE0F" : "\uD83C\uDF19";
  });
}

/* ===== CARE TRACKER LOGIC (UPDATED TO USE FIREBASE) ===== */

function normalizeTaskStatus(task) {
  if (task && task.status) return task.status;
  return 'pending';
}

async function markOverdueTasksAsMissed() {
  try {
    var tasks = await getTasksForUser();
    var today = todayStr();
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var status = normalizeTaskStatus(t);
      if (status === 'pending' && t.date && t.date < today) {
        await updateTask(t.id, {
          status: 'missed',
          missedAt: today
        });
      }
    }
  } catch (error) {
    console.error('Error auto-marking missed tasks:', error);
  }
}

async function getTrackerTasks(){
  try {
    await markOverdueTasksAsMissed();
    return await getTasksForUser();
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
}

async function saveTrackerTasks(tasks){
  // Since we're using Firebase, save each task individually
  for (let task of tasks) {
    try {
      await saveTask(task);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task: ' + error.message);
    }
  }
}

// READ ONLY FROM PLANT GALLERY (pct_plants_<username>)
async function getGalleryPlants(){
  try {
    return await getPlantsForUser();
  } catch (error) {
    console.error('Error getting plants:', error);
    return [];
  }
}

async function fillTrackerPlantSelect(){
  var plants = await getGalleryPlants();
  var sel = document.getElementById('trackerPlantSelect');
  if(!sel) return;
  var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
  sel.innerHTML = '<option value="">Select Plant</option>';
  plants.forEach(function(p){
    var o=document.createElement('option');
    o.value = p.id;
    o.textContent = nameMap[String(p.id)] || p.name;
    sel.appendChild(o);
  });
  // Select the first plant by default if available
  if (plants.length > 0) {
    sel.value = plants[0].id;
  }
}

async function addTrackerTask(){
  var trackerPlantSelect = document.getElementById('trackerPlantSelect');
  var trackerTaskType = document.getElementById('trackerTaskType');
  var trackerTaskDate = document.getElementById('trackerTaskDate');
  var pid = trackerPlantSelect.value;
  var type = trackerTaskType.value;
  var date = trackerTaskDate.value;
  if(!pid||!type||!date){ alert('Please fill all fields'); return; }

  var task = {
    plantId: pid,
    title:
      type === 'water' ? 'Watering'
      : type === 'fert' ? 'Fertilizing'
      : type === 'cut' ? 'Cutting Leaf'
      : type === 'prune' ? 'Pruning'
      : type === 'moisture' ? 'Soil Moisture Check'
      : type === 'repot' ? 'Repotting'
      : type === 'pest' ? 'Pest Check'
      : 'Care Task',
    date: date,
    status: 'pending',
    createdAt: todayStr()
  };

  try {
    await saveTask(task);
    alert('Task added successfully!');
    trackerTaskType.value='';
    trackerTaskDate.value='';

    await renderTrackerTasks();
    await renderTrackerCalendar();
  } catch (error) {
    console.error('Error adding task:', error);
    alert('Error adding task: ' + error.message);
  }
}

var smartPlanCache = [];
var sunlightCleanupDone = false;

function createDateSequence(firstDateStr, intervalDays, endDateStr) {
  var dates = [];
  var date = firstDateStr;
  var guard = 0;
  while (date <= endDateStr && guard < 365) {
    dates.push(date);
    date = addDays(date, intervalDays);
    guard++;
  }
  return dates;
}

async function buildSmartPlanForPlant(plantId, rangeDays) {
  var plants = await getGalleryPlants();
  var tasks = await getTrackerTasks();
  var plant = plants.find(function (p) { return String(p.id) === String(plantId); });
  if (!plant) return { tasks: [], summary: 'Select a valid plant first.' };
  var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
  var displayName = nameMap[String(plant.id)] || plant.name;

  var today = todayStr();
  var endDate = addDays(today, rangeDays);
  var baseSchedule = (typeof getScheduleForPlant === 'function')
    ? getScheduleForPlant(plant)
    : (plant.type === 'Outdoor' ? { water: 3, fert: 20 } : { water: 5, fert: 30 });

  function getPlantSeed(value) {
    var s = String(value || '').trim();
    var hash = 0;
    for (var i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  var seed = getPlantSeed(String(plant.id) + '|' + String(plant.name || '') + '|' + String(plant.type || ''));
  var waterEvery = (seed % 4) + 1; // strictly 1,2,3,4 days as requested
  var fertEvery = Math.max(10, (Number(baseSchedule.fert) || 20) + ((seed % 3) - 1) * 2);
  var pruneEvery = [14, 21, 28, 35][seed % 4];
  var moistureEvery = [2, 3, 4, 5][Math.floor(seed / 2) % 4];
  var pestEvery = [4, 5, 7, 10][Math.floor(seed / 3) % 4];
  var isOutdoor = /outdoor/i.test(String(plant.type || ''));
  var isIndoor = /indoor/i.test(String(plant.type || ''));

  var plantTasks = tasks.filter(function (t) { return String(t.plantId) === String(plantId); });
  var waterTasks = plantTasks.filter(function (t) { return /water/i.test(t.title); })
    .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  var fertTasks = plantTasks.filter(function (t) { return /(fertil|feed|manure)/i.test(t.title); })
    .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  var pruneTasks = plantTasks.filter(function (t) { return /prun/i.test(String(t.title || '')); })
    .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  var moistureTasks = plantTasks.filter(function (t) { return /moisture/i.test(String(t.title || '')); })
    .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  var pestTasks = plantTasks.filter(function (t) { return /pest/i.test(String(t.title || '')); })
    .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

  var doneWaterTasks = waterTasks.filter(function (t) { return normalizeTaskStatus(t) === 'done'; });
  var doneFertTasks = fertTasks.filter(function (t) { return normalizeTaskStatus(t) === 'done'; });
  var missedWaterTasks = waterTasks.filter(function (t) { return normalizeTaskStatus(t) === 'missed'; });
  var missedFertTasks = fertTasks.filter(function (t) { return normalizeTaskStatus(t) === 'missed'; });

  var completedCount = doneWaterTasks.length + doneFertTasks.length;
  var missedCount = missedWaterTasks.length + missedFertTasks.length;
  var trackedCount = completedCount + missedCount;
  var missRatio = trackedCount ? (missedCount / trackedCount) : 0;

  if (isOutdoor) {
    // Outdoor profile (requested):
    // Water every 2-3 days, soil alternate days, pest every 7 days,
    // fertilize every 15 days, prune every 25 days.
    waterEvery = 2 + (seed % 2); // 2 or 3
    moistureEvery = 2;
    pestEvery = 7;
    fertEvery = 15;
    pruneEvery = 25;
  } else if (isIndoor) {
    // Indoor profile (requested):
    // Water every 4-5 days, soil every 3 days, pest every 10 days,
    // fertilize every 15 days, prune every 27 days.
    waterEvery = 4 + (seed % 2); // 4 or 5
    moistureEvery = 3;
    pestEvery = 10;
    fertEvery = 15;
    pruneEvery = 27;
  } else {
    // Keep watering interval within 1..4 while adapting slightly by consistency.
    if (missRatio >= 0.45) {
      waterEvery = Math.min(4, waterEvery + 1);
      fertEvery += 4;
    } else if (missRatio <= 0.1 && trackedCount >= 6) {
      waterEvery = Math.max(1, waterEvery - 1);
    }
  }

  var seasonLabel = String(baseSchedule.seasonLabel || 'Off');
  if (!isOutdoor && !isIndoor) {
    if (seasonLabel === 'Summer') {
      moistureEvery = Math.max(2, moistureEvery - 1);
      pestEvery = Math.max(3, pestEvery - 1);
      pruneEvery = Math.max(14, pruneEvery - 7);
    } else if (seasonLabel === 'Monsoon') {
      moistureEvery += 1;
      pestEvery = Math.max(3, pestEvery - 1);
    } else if (seasonLabel === 'Winter') {
      fertEvery += 5;
      moistureEvery += 1;
      pestEvery += 2;
      pruneEvery += 7;
    }
  }

  fertEvery = Math.max(10, Math.min(40, fertEvery));
  pruneEvery = Math.max(14, Math.min(45, pruneEvery));
  moistureEvery = Math.max(2, Math.min(10, moistureEvery));
  pestEvery = Math.max(3, Math.min(14, pestEvery));

  var lastDoneWater = doneWaterTasks.length ? doneWaterTasks[doneWaterTasks.length - 1] : null;
  var lastDoneFert = doneFertTasks.length ? doneFertTasks[doneFertTasks.length - 1] : null;
  var lastAnyWater = waterTasks.length ? waterTasks[waterTasks.length - 1] : null;
  var lastAnyFert = fertTasks.length ? fertTasks[fertTasks.length - 1] : null;

  var waterAnchor = lastDoneWater ? lastDoneWater.date : (lastAnyWater ? lastAnyWater.date : today);
  var fertAnchor = lastDoneFert ? lastDoneFert.date : (lastAnyFert ? lastAnyFert.date : today);

  var nextWater = addDays(waterAnchor, waterEvery);
  var nextFert = addDays(fertAnchor, fertEvery);
  if (nextWater < today) nextWater = today;
  if (nextFert < today) nextFert = addDays(today, 1);

  var lastDonePrune = pruneTasks.filter(function (t) { return normalizeTaskStatus(t) === 'done'; }).slice(-1)[0] || null;
  var lastDoneMoisture = moistureTasks.filter(function (t) { return normalizeTaskStatus(t) === 'done'; }).slice(-1)[0] || null;
  var lastDonePest = pestTasks.filter(function (t) { return normalizeTaskStatus(t) === 'done'; }).slice(-1)[0] || null;
  var lastAnyPrune = pruneTasks.length ? pruneTasks[pruneTasks.length - 1] : null;
  var lastAnyMoisture = moistureTasks.length ? moistureTasks[moistureTasks.length - 1] : null;
  var lastAnyPest = pestTasks.length ? pestTasks[pestTasks.length - 1] : null;

  var pruneAnchor = lastDonePrune ? lastDonePrune.date : (lastAnyPrune ? lastAnyPrune.date : today);
  var moistureAnchor = lastDoneMoisture ? lastDoneMoisture.date : (lastAnyMoisture ? lastAnyMoisture.date : today);
  var pestAnchor = lastDonePest ? lastDonePest.date : (lastAnyPest ? lastAnyPest.date : today);

  var nextPrune = addDays(pruneAnchor, pruneEvery);
  var nextMoisture = addDays(moistureAnchor, moistureEvery);
  var nextPest = addDays(pestAnchor, pestEvery);
  if (nextPrune < today) nextPrune = addDays(today, 1);
  if (nextMoisture < today) nextMoisture = today;
  if (nextPest < today) nextPest = addDays(today, 1);

  var candidate = [];
  createDateSequence(nextWater, waterEvery, endDate).forEach(function (d) {
    candidate.push({ plantId: plantId, title: 'Watering', date: d, status: 'pending', createdAt: today });
  });
  createDateSequence(nextFert, fertEvery, endDate).forEach(function (d) {
    candidate.push({ plantId: plantId, title: 'Fertilizing', date: d, status: 'pending', createdAt: today });
  });
  createDateSequence(nextPrune, pruneEvery, endDate).forEach(function (d) {
    candidate.push({ plantId: plantId, title: 'Pruning', date: d, status: 'pending', createdAt: today });
  });
  createDateSequence(nextMoisture, moistureEvery, endDate).forEach(function (d) {
    candidate.push({ plantId: plantId, title: 'Soil Moisture Check', date: d, status: 'pending', createdAt: today });
  });
  createDateSequence(nextPest, pestEvery, endDate).forEach(function (d) {
    candidate.push({ plantId: plantId, title: 'Pest Check', date: d, status: 'pending', createdAt: today });
  });

  var existingKeys = {};
  plantTasks.forEach(function (t) {
    existingKeys[String(t.date) + '|' + String(t.title).toLowerCase()] = true;
  });

  var unique = [];
  var skipped = 0;
  candidate.forEach(function (t) {
    var key = String(t.date) + '|' + String(t.title).toLowerCase();
    if (existingKeys[key]) {
      skipped++;
      return;
    }
    existingKeys[key] = true;
    unique.push(t);
  });

  unique.sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date)) || String(a.title).localeCompare(String(b.title));
  });

  var waterCount = unique.filter(function (t) { return t.title === 'Watering'; }).length;
  var fertCount = unique.filter(function (t) { return t.title === 'Fertilizing'; }).length;
  var pruneCount = unique.filter(function (t) { return t.title === 'Pruning'; }).length;
  var moistureCount = unique.filter(function (t) { return t.title === 'Soil Moisture Check'; }).length;
  var pestCount = unique.filter(function (t) { return t.title === 'Pest Check'; }).length;

  var summary =
    displayName + ': ' + unique.length + ' new tasks (' +
    waterCount + ' water, ' + fertCount +
    ' fertilizer, ' + pruneCount + ' pruning, ' + moistureCount + ' moisture check, ' + pestCount + ' pest check' +
    '). Skipped ' + skipped + ' duplicates.' +
    ' Interval used: water every ' + waterEvery + ' day(s), fertilizer every ' + fertEvery + ' day(s).' +
    ' Pruning every ' + pruneEvery + ' day(s), moisture check every ' + moistureEvery + ' day(s), pest check every ' + pestEvery + ' day(s).' +
    ' Miss ratio: ' + Math.round(missRatio * 100) + '%.';

  return { tasks: unique, summary: summary, plantName: displayName };
}

async function cleanupDeprecatedSunlightTasks() {
  if (sunlightCleanupDone) return 0;
  sunlightCleanupDone = true;
  var tasks = await getTasksForUser();
  var bad = tasks.filter(function (t) { return /sunlight\s*check/i.test(String(t.title || '')); });
  for (var i = 0; i < bad.length; i++) {
    try {
      await deleteTask(bad[i].id);
    } catch (e) {
      console.error('Failed to delete deprecated sunlight task:', bad[i], e);
    }
  }
  return bad.length;
}

function renderSmartPlanPreview(previewTasks, summaryText) {
  var list = document.getElementById('smartPlanPreviewList');
  var summary = document.getElementById('smartPlanSummary');
  if (!list || !summary) return;
  list.innerHTML = '';
  summary.textContent = summaryText || '';

  if (!previewTasks || !previewTasks.length) {
    list.innerHTML = '<li>No new smart tasks to add for selected range.</li>';
    return;
  }

  previewTasks.slice(0, 20).forEach(function (t) {
    var li = document.createElement('li');
    li.textContent = t.date + ' - ' + t.title;
    list.appendChild(li);
  });
  if (previewTasks.length > 20) {
    var liMore = document.createElement('li');
    liMore.textContent = '...and ' + (previewTasks.length - 20) + ' more tasks.';
    list.appendChild(liMore);
  }
}

async function previewSmartPlan() {
  await cleanupDeprecatedSunlightTasks();
  var plantSel = document.getElementById('trackerPlantSelect');
  var rangeSel = document.getElementById('smartPlanRange');
  if (!plantSel || !rangeSel || !plantSel.value) {
    alert('Please select a plant first.');
    return;
  }
  var rangeDays = parseInt(rangeSel.value, 10) || 30;
  var result = await buildSmartPlanForPlant(plantSel.value, rangeDays);
  smartPlanCache = result.tasks || [];
  renderSmartPlanPreview(smartPlanCache, result.summary || '');
}

async function saveSmartPlan() {
  await cleanupDeprecatedSunlightTasks();
  if (!smartPlanCache || !smartPlanCache.length) {
    await previewSmartPlan();
    if (!smartPlanCache.length) return;
  }

  var saved = 0;
  for (var i = 0; i < smartPlanCache.length; i++) {
    try {
      await saveTask(smartPlanCache[i]);
      saved++;
    } catch (e) {
      console.error('Smart plan save failed for task:', smartPlanCache[i], e);
    }
  }

  await renderTrackerTasks();
  await renderTrackerCalendar();
  await renderTaskHistory();
  await refreshHeaderStats();
  if (typeof renderTracer === 'function') await renderTracer();
  if (typeof renderProfile === 'function') await renderProfile();

  var summary = document.getElementById('smartPlanSummary');
  if (summary) summary.textContent = 'Saved ' + saved + ' smart tasks successfully.';
  alert('Smart plan generated and saved: ' + saved + ' tasks.');
  smartPlanCache = [];
}

async function renderTrackerTasks(){
  var trackerPlantSelect = document.getElementById('trackerPlantSelect');
  var trackerTaskList = document.getElementById('trackerTaskList');
  var pid = trackerPlantSelect ? trackerPlantSelect.value : '';
  var tasks = await getTrackerTasks();
  var plants = await getGalleryPlants();
  var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
  var filteredTasks = pid ? tasks.filter(function (t) { return String(t.plantId) === String(pid); }) : tasks;
  var today = todayStr();
  var tenDaysAhead = addDays(today, 10);
  filteredTasks = filteredTasks.filter(function (t) {
    var date = String(t && t.date ? t.date : '');
    var status = normalizeTaskStatus(t);
    return date >= today && date <= tenDaysAhead && status !== 'done';
  });
  filteredTasks.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });

  if(trackerTaskList) trackerTaskList.innerHTML='';
  if (!filteredTasks.length) {
    if (trackerTaskList) {
      trackerTaskList.innerHTML = '<li class="task-other">No pending tasks for the upcoming 10 days.</li>';
    }
    return;
  }
  filteredTasks.forEach(function(t){
    var plant = plants.find(p=>String(p.id)===String(t.plantId));
    var status = normalizeTaskStatus(t);
    var li=document.createElement('li');
    var title = String(t.title || '').toLowerCase();
    var baseCls = 'task-other';
    if (title.indexOf('water') !== -1) baseCls = 'task-water';
    else if (title.indexOf('fert') !== -1 || title.indexOf('feed') !== -1) baseCls = 'task-fert';
    else if (title.indexOf('prun') !== -1) baseCls = 'task-prune';
    else if (title.indexOf('moisture') !== -1) baseCls = 'task-moisture';
    li.className = baseCls + (status === 'done' ? ' task-done-row' : '') + (status === 'missed' ? ' task-missed-row' : '');

    var row = document.createElement('div');
    row.className = 'tracker-task-row';

    var text = document.createElement('span');
    text.textContent = t.date+' - '+(plant ? (nameMap[String(plant.id)] || plant.name) : 'Plant')+' - '+t.title;

    var actions = document.createElement('div');
    actions.className = 'task-actions';

    var badge = document.createElement('span');
    badge.className = 'task-status ' + status;
    badge.textContent = status.toUpperCase();
    actions.appendChild(badge);

    if (status === 'pending') {
      var doneBtn = document.createElement('button');
      doneBtn.className = 'btn-task-done';
      doneBtn.textContent = 'Mark Done';
      doneBtn.addEventListener('click', async function () {
        try {
          await updateTask(t.id, {
            status: 'done',
            completedAt: todayStr()
          });
          await renderTrackerTasks();
          await renderTrackerCalendar();
          await renderTaskHistory();
        } catch (error) {
          console.error('Error marking task done:', error);
          alert('Could not mark task done.');
        }
      });
      actions.appendChild(doneBtn);
    }

    row.appendChild(text);
    row.appendChild(actions);
    li.appendChild(row);

    if(trackerTaskList) trackerTaskList.appendChild(li);
  });
}

var trackerCalendarDate = new Date();
trackerCalendarDate.setDate(1);

function shiftTrackerCalendarMonth(delta) {
  trackerCalendarDate.setMonth(trackerCalendarDate.getMonth() + delta);
}

function getTaskTypeFlags(task) {
  var title = String(task && task.title ? task.title : '').toLowerCase();
  return {
    water: title.indexOf('water') !== -1,
    fert: title.indexOf('fertil') !== -1 || title.indexOf('feed') !== -1,
    cut: title.indexOf('cut') !== -1,
    prune: title.indexOf('prun') !== -1,
    moisture: title.indexOf('moisture') !== -1,
    repot: title.indexOf('repot') !== -1,
    pest: title.indexOf('pest') !== -1
  };
}

async function renderTrackerCalendar(){
  var grid = document.getElementById('trackerCalendarGrid');
  var monthLabel = document.getElementById('trackerCalMonthLabel');
  var trackerPlantSelect = document.getElementById('trackerPlantSelect');
  if(!grid || !monthLabel) return;
  grid.innerHTML='';

  var pid = trackerPlantSelect ? trackerPlantSelect.value : '';
  var tasks = await getTrackerTasks();
  var filteredTasks = pid ? tasks.filter(t=> String(t.plantId)===String(pid)) : tasks;

  var y = trackerCalendarDate.getFullYear();
  var monthIndex = trackerCalendarDate.getMonth();
  var monthNumber = String(monthIndex + 1).padStart(2,'0');
  var firstDay = new Date(y, monthIndex, 1).getDay();
  var daysInMonth = new Date(y, monthIndex + 1, 0).getDate();
  var monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  monthLabel.textContent = monthNames[monthIndex] + ' ' + y;

  for(var blank=0; blank<firstDay; blank++){
    var blankCell = document.createElement('div');
    blankCell.className = 'calendar-cell';
    grid.appendChild(blankCell);
  }

  for(var i=1;i<=daysInMonth;i++){
    var cell=document.createElement('div');
    cell.className='calendar-cell';
    cell.innerHTML='<span>'+i+'</span>';

    var d = y+'-'+monthNumber+'-'+String(i).padStart(2,'0');
    var dayTasks = filteredTasks.filter(function(t){
      return t.date===d && normalizeTaskStatus(t) !== 'done' && normalizeTaskStatus(t) !== 'missed';
    });
    var hasWater = false;
    var hasFert = false;
    var hasCut = false;
    var hasPrune = false;
    var hasMoisture = false;
    var hasRepot = false;
    var hasPest = false;

    dayTasks.forEach(function(t){
      var flags = getTaskTypeFlags(t);
      hasWater = hasWater || flags.water;
      hasFert = hasFert || flags.fert;
      hasCut = hasCut || flags.cut;
      hasPrune = hasPrune || flags.prune;
      hasMoisture = hasMoisture || flags.moisture;
      hasRepot = hasRepot || flags.repot;
      hasPest = hasPest || flags.pest;
    });

    if(hasWater && hasFert) cell.classList.add('both-task');
    else if(hasWater) cell.classList.add('water-task');
    else if(hasFert) cell.classList.add('fert-task');
    else if(hasCut) cell.classList.add('cut-task');
    else if(hasPrune) cell.classList.add('prune-task');
    else if(hasMoisture) cell.classList.add('moisture-task');
    else if(hasRepot) cell.classList.add('repot-task');
    else if(hasPest) cell.classList.add('pest-task');

    grid.appendChild(cell);
  }
}

document.addEventListener('change', async function(e){
  if(e.target && e.target.id==='trackerPlantSelect'){
    smartPlanCache = [];
    renderSmartPlanPreview([], '');
    await renderTrackerTasks();
    await renderTrackerCalendar();
  }
});

document.addEventListener('click', async function(e){
  if(e.target && e.target.id==='trackerAddBtn'){
    await addTrackerTask();
  }
  if(e.target && e.target.id==='trackerCalPrev'){
    shiftTrackerCalendarMonth(-1);
    await renderTrackerCalendar();
  }
  if(e.target && e.target.id==='trackerCalNext'){
    shiftTrackerCalendarMonth(1);
    await renderTrackerCalendar();
  }
  if(e.target && e.target.id==='smartPlanPreviewBtn'){
    await previewSmartPlan();
  }
  if(e.target && e.target.id==='smartPlanSaveBtn'){
    await saveSmartPlan();
  }
});

document.addEventListener('click', async function(e){
  if(e.target && e.target.dataset && e.target.dataset.section==='trackerSection'){
    var removed = await cleanupDeprecatedSunlightTasks();
    await fillTrackerPlantSelect();
    smartPlanCache = [];
    renderSmartPlanPreview([], '');
    await renderTrackerTasks();
    await renderTrackerCalendar();
    if (removed > 0) {
      var summary = document.getElementById('smartPlanSummary');
      if (summary) summary.textContent = 'Removed old Sunlight Check tasks: ' + removed + '.';
    }
  }
});

async function renderTaskHistory() {
  var list = document.getElementById('taskHistoryList');
  var stats = document.getElementById('taskHistoryStats');
  var filterEl = document.getElementById('taskHistoryFilter');
  var plantFilterEl = document.getElementById('taskHistoryPlantFilter');
  if (!list) return;

  await markOverdueTasksAsMissed();
  var tasks = await getTasksForUser();
  var plants = await getPlantsForUser();
  var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
  var filter = filterEl ? filterEl.value : 'all';
  var selectedPlantId = plantFilterEl ? plantFilterEl.value : 'all';

  if (plantFilterEl) {
    var currentValue = selectedPlantId || 'all';
    plantFilterEl.innerHTML = '<option value="all">All Plants</option>';
    plants.forEach(function(p){
      var opt = document.createElement('option');
      opt.value = String(p.id);
      opt.textContent = nameMap[String(p.id)] || p.name;
      plantFilterEl.appendChild(opt);
    });
    plantFilterEl.value = currentValue;
    selectedPlantId = plantFilterEl.value || 'all';
  }

  var scopedTasks = tasks.filter(function(t){
    if (selectedPlantId === 'all') return true;
    return String(t.plantId) === String(selectedPlantId);
  });

  var doneCount = 0;
  var missedCount = 0;
  var pendingCount = 0;

  scopedTasks.forEach(function(t){
    var status = normalizeTaskStatus(t);
    if (status === 'done') doneCount++;
    else if (status === 'missed') missedCount++;
    else pendingCount++;
  });

  if (stats) {
    stats.innerHTML =
      '<strong>Completed:</strong> ' + doneCount +
      ' &nbsp;|&nbsp; <strong>Missed:</strong> ' + missedCount +
      ' &nbsp;|&nbsp; <strong>Pending:</strong> ' + pendingCount;
  }

  list.innerHTML = '';
  var rows = scopedTasks.slice().sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });

  rows.forEach(function(t){
    var status = normalizeTaskStatus(t);
    if (filter !== 'all' && status !== filter) return;

    var plant = plants.find(function(p){ return String(p.id) === String(t.plantId); });
    var li = document.createElement('li');
    li.className = status === 'done' ? 'task-done-row' : status === 'missed' ? 'task-missed-row' : '';
    li.innerHTML =
      '<strong>' + t.date + '</strong> - ' + (plant ? (nameMap[String(plant.id)] || plant.name) : 'Plant') + ' - ' + t.title +
      ' <span class="task-status ' + status + '">' + status.toUpperCase() + '</span>';
    list.appendChild(li);
  });

  if (!list.children.length) {
    list.innerHTML = '<li>No tasks found for selected filter.</li>';
  }
}

document.addEventListener('change', async function(e){
  if (e.target && e.target.id === 'taskHistoryFilter') {
    await renderTaskHistory();
  }
  if (e.target && e.target.id === 'taskHistoryPlantFilter') {
    await renderTaskHistory();
  }
});

document.addEventListener('click', async function(e){
  if (e.target && e.target.dataset && e.target.dataset.section === 'taskHistorySection') {
    await renderTaskHistory();
  }
});
// ===== DAILY TASK NOTIFICATION SYSTEM =====
var plantReminderToastTimer = null;
var plantReminderQueue = [];
var plantReminderShowing = false;

function ensurePlantReminderStyles() {
  if (document.getElementById('plantReminderStyles')) return;

  var style = document.createElement('style');
  style.id = 'plantReminderStyles';
  style.textContent =
    '.plant-reminder-wrap{' +
      'position:fixed;top:22px;right:22px;z-index:9999;pointer-events:none;' +
    '}' +
    '.plant-reminder{' +
      'width:min(360px,calc(100vw - 28px));' +
      'background:linear-gradient(135deg,#f6fff7 0%,#e6f7ec 52%,#d9f0e1 100%);' +
      'border:1px solid #b6dec4;border-radius:16px;box-shadow:0 12px 36px rgba(23,89,44,.24);' +
      'padding:14px 14px 12px;color:#124227;font-family:Segoe UI,Tahoma,sans-serif;' +
      'pointer-events:auto;transform:translateY(-12px) scale(.98);opacity:0;' +
      'transition:all .28s ease;' +
    '}' +
    '.plant-reminder.show{' +
      'transform:translateY(0) scale(1);opacity:1;' +
    '}' +
    '.plant-reminder-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}' +
    '.plant-reminder-title{margin:0;font-size:17px;font-weight:700;letter-spacing:.2px;}' +
    '.plant-reminder-sub{margin:4px 0 0 0;font-size:12px;opacity:.84;}' +
    '.plant-reminder-close{' +
      'border:0;background:#1d6d40;color:#fff;border-radius:999px;width:26px;height:26px;' +
      'font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center;' +
      'box-shadow:0 6px 14px rgba(18,66,39,.3);' +
    '}' +
    '.plant-reminder-body{margin-top:10px;font-size:15px;line-height:1.45;}' +
    '.plant-reminder-row{margin:4px 0;}' +
    '.plant-reminder-label{font-weight:700;margin-right:5px;}' +
    '.plant-reminder-ok{' +
      'margin-top:10px;border:0;background:#2f8f58;color:#fff;padding:8px 14px;border-radius:10px;' +
      'font-weight:700;cursor:pointer;' +
    '}' +
    '.plant-reminder-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}' +
    '.plant-reminder-done{' +
      'border:0;background:#1f6fbe;color:#fff;padding:8px 14px;border-radius:10px;' +
      'font-weight:700;cursor:pointer;' +
    '}' +
    '.plant-reminder-done[disabled]{opacity:.7;cursor:wait;}' +
    '.plant-reminder-ok[disabled]{opacity:.7;cursor:wait;' +
    '}';
  document.head.appendChild(style);
}

function escapeReminderText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showPlantReminderNotification(plantName, taskTitle, dateStr, taskId, onDismiss) {
  ensurePlantReminderStyles();

  var oldWrap = document.getElementById('plantReminderWrap');
  if (oldWrap) oldWrap.remove();
  if (plantReminderToastTimer) clearTimeout(plantReminderToastTimer);

  var wrap = document.createElement('div');
  wrap.id = 'plantReminderWrap';
  wrap.className = 'plant-reminder-wrap';

  var card = document.createElement('div');
  card.className = 'plant-reminder';
  card.innerHTML =
    '<div class="plant-reminder-head">' +
      '<div>' +
        '<p class="plant-reminder-title">Plant Care</p>' +
        '<p class="plant-reminder-sub">Your task is due today</p>' +
      '</div>' +
      '<button class="plant-reminder-close" type="button" aria-label="Close notification">&times;</button>' +
    '</div>' +
    '<div class="plant-reminder-body">' +
      '<p class="plant-reminder-row"><span class="plant-reminder-label">Plant:</span>' + escapeReminderText(plantName) + '</p>' +
      '<p class="plant-reminder-row"><span class="plant-reminder-label">Task:</span>' + escapeReminderText(taskTitle) + '</p>' +
      '<p class="plant-reminder-row"><span class="plant-reminder-label">Date:</span>' + escapeReminderText(dateStr) + '</p>' +
      '<div class="plant-reminder-actions">' +
        '<button class="plant-reminder-done" type="button">Done</button>' +
        '<button class="plant-reminder-ok" type="button">Got it</button>' +
      '</div>' +
    '</div>';

  wrap.appendChild(card);
  document.body.appendChild(wrap);

  requestAnimationFrame(function () {
    card.classList.add('show');
  });

  var dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    if (plantReminderToastTimer) clearTimeout(plantReminderToastTimer);
    card.classList.remove('show');
    setTimeout(function () {
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (typeof onDismiss === 'function') onDismiss();
    }, 220);
  }

  var closeBtn = card.querySelector('.plant-reminder-close');
  var okBtn = card.querySelector('.plant-reminder-ok');
  var doneBtn = card.querySelector('.plant-reminder-done');
  if (closeBtn) closeBtn.addEventListener('click', dismiss);
  if (okBtn) okBtn.addEventListener('click', dismiss);
  if (doneBtn) {
    doneBtn.addEventListener('click', async function () {
      if (!taskId) {
        dismiss();
        return;
      }
      doneBtn.disabled = true;
      if (okBtn) okBtn.disabled = true;
      try {
        await updateTask(taskId, {
          status: 'done',
          completedAt: todayStr()
        });
        if (typeof renderTrackerTasks === 'function') await renderTrackerTasks();
        if (typeof renderTrackerCalendar === 'function') await renderTrackerCalendar();
        if (typeof renderTaskHistory === 'function') await renderTaskHistory();
        if (typeof renderTracer === 'function') await renderTracer();
        if (typeof renderProfile === 'function') await renderProfile();
      } catch (error) {
        console.error('Error marking reminder task done:', error);
        alert('Could not mark this task as done.');
      } finally {
        dismiss();
      }
    });
  }

  plantReminderToastTimer = setTimeout(dismiss, 9000);
}

function processPlantReminderQueue() {
  if (plantReminderShowing) return;
  if (!plantReminderQueue.length) return;

  plantReminderShowing = true;
  var item = plantReminderQueue.shift();
  showPlantReminderNotification(item.plantName, item.taskTitle, item.dateStr, item.taskId, function () {
    plantReminderShowing = false;
    processPlantReminderQueue();
  });
}

function enqueuePlantReminder(plantName, taskTitle, dateStr, taskId) {
  plantReminderQueue.push({
    plantName: plantName,
    taskTitle: taskTitle,
    dateStr: dateStr,
    taskId: taskId
  });
  processPlantReminderQueue();
}

async function checkTodayNotifications(){

  try {

    var tasks = await getTrackerTasks();
    var plants = await getGalleryPlants();
    var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
    var today = todayStr();

   var notifiedTasks = JSON.parse(localStorage.getItem("notifiedTasks") || "[]");
   var remindersToShow = [];

tasks.forEach(function(t){

  if (normalizeTaskStatus(t) !== 'pending') return;

  if(t.date === today){

    var uniqueKey = t.id + "_" + t.date;

    if(!notifiedTasks.includes(uniqueKey)){

      var plant = plants.find(p => String(p.id) === String(t.plantId));

      if(plant){
        remindersToShow.push({
          plantName: nameMap[String(plant.id)] || plant.name,
          taskTitle: t.title,
          dateStr: t.date,
          taskId: t.id
        });

        notifiedTasks.push(uniqueKey);
        localStorage.setItem("notifiedTasks", JSON.stringify(notifiedTasks));

      }

    }

  }

});

if(remindersToShow.length){
  setTimeout(function(){
    remindersToShow.forEach(function(r){
      enqueuePlantReminder(r.plantName, r.taskTitle, r.dateStr, r.taskId);
    });
  }, 1500);
}


  } catch(e){
    console.log("Notification check error", e);
  }

}

setTimeout(function(){
  checkTodayNotifications();
}, 3000);

updateAnalytics();


/******** PLANT MOOD FINAL ********/

function getMoodHistoryStorageKey(plantId) {
  var user = getCurrentUser();
  var userKey = user && user.uid ? user.uid : String(user || 'guest');
  return 'pct_mood_history_' + userKey + '_' + String(plantId);
}

function readMoodHistory(plantId) {
  try {
    var raw = localStorage.getItem(getMoodHistoryStorageKey(plantId));
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeMoodHistory(plantId, score, moodText) {
  var history = readMoodHistory(plantId);
  var today = todayStr();
  var last = history.length ? history[history.length - 1] : null;

  if (!last || String(last.date) !== today || Math.abs(Number(last.score || 0) - Number(score || 0)) >= 3) {
    history.push({
      date: today,
      score: Number(score) || 0,
      mood: String(moodText || '')
    });
  } else {
    last.score = Number(score) || 0;
    last.mood = String(moodText || '');
  }

  var trimmed = history.slice(-7);
  try {
    localStorage.setItem(getMoodHistoryStorageKey(plantId), JSON.stringify(trimmed));
  } catch (_error) {}
  return trimmed;
}

function getMoodTrend(history) {
  if (!history || history.length < 2) return { label: 'Stable', delta: 0, cls: 'stable' };
  var latest = Number(history[history.length - 1].score) || 0;
  var prev = Number(history[history.length - 2].score) || 0;
  var delta = latest - prev;
  if (delta >= 3) return { label: 'Improving', delta: delta, cls: 'up' };
  if (delta <= -3) return { label: 'Declining', delta: delta, cls: 'down' };
  return { label: 'Stable', delta: delta, cls: 'stable' };
}

function getMoodRisk(score, missedRate) {
  if (score < 40 || missedRate >= 45) return { label: 'Critical', cls: 'critical' };
  if (score < 70 || missedRate >= 25) return { label: 'Watch', cls: 'watch' };
  return { label: 'Stable', cls: 'stable' };
}

function buildMoodActionPlan(data) {
  var actions = [];
  if (data.pendingTasks > 0) {
    actions.push('Complete at least 1 pending care task today.');
  }
  if (data.missedTasks > 0) {
    actions.push('Recover missed tasks: start with watering/moisture check first.');
  }
  if (data.score < 70) {
    actions.push('Run a quick plant check: soil + leaf condition + sunlight placement.');
  }
  if (data.completionRate < 60) {
    actions.push('Use Smart Auto Planner for the next 14 or 30 days.');
  }
  if (!actions.length) {
    actions.push('Keep current routine and maintain daily consistency.');
  }
  return actions.slice(0, 3);
}

async function loadPlantMoodPlants(){

  try{

    let plants = await getPlantsForUser() || [];
    let select = document.getElementById("plantMoodSelect");

    if(!select) return;

    select.innerHTML = "<option value=''>Select Plant</option>";

    var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
    plants.forEach(p=>{
      select.innerHTML += `<option value="${p.id}">${nameMap[String(p.id)] || p.name}</option>`;
    });

  }catch(e){
    console.log("Mood plant load error", e);
  }

}

async function showSelectedPlantMood(){

  try{

    let plantId = document.getElementById("plantMoodSelect").value;
    if(!plantId) return;

    await markOverdueTasksAsMissed();

    let plants = await getPlantsForUser() || [];
    let tasks = await getTasksForUser() || [];
    let nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};

    let plant = plants.find(p=> String(p.id) === String(plantId));
    let plantTasks = tasks.filter(t=> String(t.plantId) === String(plantId));

    let totalTasks = plantTasks.length;
    let doneTasks = plantTasks.filter(t => normalizeTaskStatus(t) === 'done').length;
    let missedTasks = plantTasks.filter(t => normalizeTaskStatus(t) === 'missed').length;
    let pendingTasks = plantTasks.filter(t => normalizeTaskStatus(t) === 'pending').length;
    let completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    let missedRate = totalTasks ? Math.round((missedTasks / totalTasks) * 100) : 0;

    /* SCORE (status-based) */
    // Done increases health, missed decreases it, pending gives a small neutral buffer.
    let score = 20 + (doneTasks * 30) + (pendingTasks * 5) - (missedTasks * 25);
    if (score > 100) score = 100;
    if (score < 5) score = 5;

    /* MOOD */
    let mood="", reason="", tips="", moodClass="";

    if(score >= 95){
      mood="🌟 Divine Growth";
      reason="Perfect care maintained";
      tips="Keep same routine.";
      moodClass="mood-divine";
    }
    else if(score >= 80){
      mood="💚 Thriving";
      reason="Plant is very healthy";
      tips="Maintain watering schedule.";
      moodClass="mood-thriving";
    }
    else if(score >= 70){
      mood="🌱 Stable";
      reason="Plant is stable";
      tips="Monitor soil moisture.";
      moodClass="mood-stable";
    }
    else if(score >= 40){
      mood="🍂 Struggling";
      reason="Plant needs attention";
      tips="Check sunlight & watering.";
      moodClass="mood-struggling";
    }
    else{
      mood="🚨 Critical Survival";
      reason="Plant needs urgent care";
      tips="Water + fertilizer.";
      moodClass="mood-critical";
    }

    let latestTask = plantTasks.sort((a,b)=> new Date(b.date)-new Date(a.date))[0];
    let moodHistory = writeMoodHistory(plantId, score, mood);
    let trend = getMoodTrend(moodHistory);
    let risk = getMoodRisk(score, missedRate);
    let actionPlan = buildMoodActionPlan({
      score: score,
      completionRate: completionRate,
      missedTasks: missedTasks,
      pendingTasks: pendingTasks
    });
    let trendSign = trend.delta > 0 ? '+' + trend.delta : String(trend.delta);
    let historyHtml = moodHistory.map(function (entry) {
      return '<div class="mood-history-item"><span class="mood-history-date">' + entry.date + '</span><strong>' + entry.score + '%</strong></div>';
    }).join('');
    let trendBarsHtml = moodHistory.map(function (entry) {
      var h = Math.max(8, Math.min(100, Number(entry.score) || 0));
      var shortDate = String(entry.date || '').slice(5);
      return '<div class="mood-trend-col"><i style="height:' + h + '%"></i><span>' + shortDate + '</span></div>';
    }).join('');
    let actionHtml = actionPlan.map(function (item) {
      return '<li>' + item + '</li>';
    }).join('');

    document.getElementById("plantMoodResult").innerHTML = `
    <div class="mood-box ${moodClass}">
      <div class="mood-header">
        <h3 class="mood-plant-name">${nameMap[String(plant.id)] || plant.name}</h3>
        <div class="mood-header-pills">
          <span class="mood-pill">LIVE STATUS</span>
          <span class="mood-risk-badge mood-risk-${risk.cls}">Risk: ${risk.label}</span>
        </div>
      </div>

      <p class="mood-main"><strong>${mood}</strong></p>
      <p class="mood-reason">${reason}</p>

      <div class="progress-container">
        <div class="progress-bar" id="moodProgressBar"></div>
      </div>

      <div class="mood-score-row">
        <span>Health Score</span>
        <span class="mood-score-value">${score}%</span>
      </div>

      <p class="mood-tip">💡 ${tips}</p>

      <hr class="mood-divider">

      <div class="mood-stats">
        <div class="mood-stat">
          <span class="mood-stat-label">Last Task</span>
          <span class="mood-stat-value">${latestTask ? latestTask.title : "No tasks yet"}</span>
        </div>
        <div class="mood-stat">
          <span class="mood-stat-label">Last Date</span>
          <span class="mood-stat-value">${latestTask ? latestTask.date : "N/A"}</span>
        </div>
        <div class="mood-stat">
          <span class="mood-stat-label">Total Tasks</span>
          <span class="mood-stat-value">${totalTasks}</span>
        </div>
        <div class="mood-stat">
          <span class="mood-stat-label">Completion Rate</span>
          <span class="mood-stat-value">${completionRate}%</span>
        </div>
      </div>

      <div class="mood-quick-counts">
        <span class="mood-count-pill">✅ Done: ${doneTasks}</span>
        <span class="mood-count-pill">❌ Missed: ${missedTasks}</span>
        <span class="mood-count-pill">⏳ Pending: ${pendingTasks}</span>
      </div>

      <div class="mood-history-wrap">
        <div class="mood-history-head">
          <span>Mood Timeline (Last 7 checks)</span>
          <span class="mood-trend-pill mood-trend-${trend.cls}">${trend.label} (${trendSign})</span>
        </div>
        <div class="mood-history-list">${historyHtml || '<div class="mood-history-empty">No history yet</div>'}</div>
        <div class="mood-trend-chart">${trendBarsHtml || ''}</div>
      </div>

      <div class="mood-action-wrap">
        <div class="mood-history-head">
          <span>Recommended Next Actions</span>
        </div>
        <ul class="mood-action-list">${actionHtml}</ul>
      </div>
    </div>
    `;

    setTimeout(()=>{
      document.getElementById("moodProgressBar").style.width = score + "%";
    },200);

  }
  catch(e){
    console.log("Mood error", e);
  }
}


/* NAV SECTION LOAD HOOK */
document.addEventListener("click", function(e){

  if(e.target.matches('[data-section="plantMoodSection"]')){
    setTimeout(()=>{
      loadPlantMoodPlants();
    },500);
  }

});

/* SELECT CHANGE EVENT */
document.addEventListener("change", function(e){
  if(e.target.id === "plantMoodSelect"){
    showSelectedPlantMood();
  }
});


document.getElementById("plantDoctorFab").onclick = function(){
  document.getElementById("plantDoctorPopup").classList.remove("hidden");
}

var taskHistoryFab = document.getElementById("taskHistoryFab");
if (taskHistoryFab) {
  taskHistoryFab.onclick = async function () {
    if (!getCurrentUser()) {
      alert("Please login first.");
      return;
    }
    showAppSection("taskHistorySection");
    await renderTaskHistory();
  };
}

function closePlantDoctor(){
  document.getElementById("plantDoctorPopup").classList.add("hidden");
}




function addPlantDoctorMessage(type, text){
  var chat = document.getElementById("plantDoctorChatWindow");
  if(!chat) return;
  var cls = type === "user" ? "chat-msg-user" : "chat-msg-bot";
  var safe = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
  chat.innerHTML += '<div class="' + cls + '"><span>' + safe + '</span></div>';
  chat.scrollTop = chat.scrollHeight;
}

function getPlantDoctorFallbackReply(symptomText){
  var input = String(symptomText || "").toLowerCase();
  var reason = "Stress from watering/light/nutrient imbalance.";
  var change = "Check drainage, remove damaged leaves, and keep routine stable for 7 days.";
  var water = "Water only when top 1-2 inches of soil feels dry.";

  if(input.includes("yellow")){
    reason = "Overwatering, poor drainage, or nutrient deficiency.";
    change = "Reduce watering, ensure drainage holes, and add mild balanced fertilizer.";
    water = "Water after top soil dries. Avoid daily watering.";
  } else if(input.includes("brown")){
    reason = "Low humidity, salt buildup, or sun scorch.";
    change = "Shift to indirect light, flush soil once, and raise humidity.";
    water = "Keep soil lightly moist, not soggy.";
  } else if(input.includes("drooping") || input.includes("wilting")){
    reason = "Either underwatering or root stress/rot.";
    change = "Check soil before watering. If soggy, reduce water and improve airflow.";
    water = "If dry, deep-water once. Then follow interval based watering.";
  } else if(input.includes("spots") || input.includes("fungus") || input.includes("mold")){
    reason = "Fungal/bacterial issue due to excess moisture.";
    change = "Remove affected leaves and improve airflow.";
    water = "Water at root only, avoid wet leaves.";
  }

  return "Possible reason:\n" + reason +
    "\n\nWhat to change:\n" + change +
    "\n\nWatering advice:\n" + water;
}

function getPlantDoctorContactsByPlacement(placement){
  var indoorDoctors = [
    {
      name: "Dr. Asha Verma (Indoor Plant Clinic)",
      phone: "+91 98765 12001",
      address: "12 Green Park Extension, New Delhi 110016"
    },
    {
      name: "Dr. Rahul Menon (Urban Leaf Care)",
      phone: "+91 98765 12002",
      address: "28 Indiranagar 100 Feet Road, Bengaluru 560038"
    },
    {
      name: "Dr. Neha Kulkarni (Balcony Plant Doctor)",
      phone: "+91 98765 12003",
      address: "204 FC Road, Shivajinagar, Pune 411005"
    }
  ];

  var outdoorDoctors = [
    {
      name: "Dr. Vikram Patil (Outdoor Crop & Garden Care)",
      phone: "+91 98765 22001",
      address: "88 Baner Road, Pune 411045"
    },
    {
      name: "Dr. Meera Reddy (Landscape Plant Specialist)",
      phone: "+91 98765 22002",
      address: "44 Jubilee Hills Main Road, Hyderabad 500033"
    },
    {
      name: "Dr. Karan Singh (Field & Nursery Doctor)",
      phone: "+91 98765 22003",
      address: "76 SG Highway, Ahmedabad 380015"
    }
  ];

  if (placement === "Indoor") return indoorDoctors;
  if (placement === "Outdoor") return outdoorDoctors;
  return indoorDoctors.slice(0, 2).concat(outdoorDoctors.slice(0, 2));
}

function buildPlantDoctorContactReply(placement){
  var doctors = getPlantDoctorContactsByPlacement(placement);
  var title = placement === "Indoor" || placement === "Outdoor"
    ? placement + " plant doctor contacts:"
    : "Plant doctor contacts (indoor/outdoor mix):";

  var lines = [
    "I could not confidently identify this disease from the current symptoms.",
    "",
    title
  ];

  for (var i = 0; i < doctors.length; i++) {
    lines.push(
      (i + 1) + ". " + doctors[i].name +
      "\n   Phone: " + doctors[i].phone +
      "\n   Address: " + doctors[i].address
    );
  }

  lines.push("");
  lines.push("Share plant type (Indoor/Outdoor), leaf photos, and watering routine with the doctor for faster diagnosis.");

  return lines.join("\n");
}

function inferPlacementFromText(symptomText){
  var input = String(symptomText || "").toLowerCase();
  if (/\bindoor\b|\broom\b|\bbalcony\b|\bapartment\b/.test(input)) return "Indoor";
  if (/\boutdoor\b|\bgarden\b|\byard\b|\bterrace\b|\bfarm\b/.test(input)) return "Outdoor";
  return "";
}

function getKnownDoctorDiagnosis(symptomText){
  var input = String(symptomText || "").toLowerCase();
  if (!input) return "";

  var hasAnySymptomWord = /(yellow|brown|drooping|wilting|spots|fungus|mold|rot|blight|rust|curl|powdery|mildew|pest|insect|aphid|mites)/.test(input);
  if (!hasAnySymptomWord) return "";

  return getPlantDoctorFallbackReply(symptomText);
}

async function sendPlantDoctor(){
  var inputEl = document.getElementById("plantDoctorInput");
  var raw = inputEl ? inputEl.value.trim() : "";
  if(!raw) return;

  addPlantDoctorMessage("user", raw);
  if(inputEl) inputEl.value = "";
  addPlantDoctorMessage("bot", "Analyzing symptom...");

  var chat = document.getElementById("plantDoctorChatWindow");
  if(chat && chat.lastElementChild){
    chat.lastElementChild.remove();
  }

  var knownDiagnosis = getKnownDoctorDiagnosis(raw);
  if (knownDiagnosis) {
    addPlantDoctorMessage("bot", knownDiagnosis);
    return;
  }

  var placement = inferPlacementFromText(raw);
  addPlantDoctorMessage("bot", buildPlantDoctorContactReply(placement));
}

var plantDoctorInputEl = document.getElementById("plantDoctorInput");
if (plantDoctorInputEl) {
  plantDoctorInputEl.addEventListener("keydown", function(e){
    if (e.key === "Enter") {
      e.preventDefault();
      sendPlantDoctor();
    }
  });
}





