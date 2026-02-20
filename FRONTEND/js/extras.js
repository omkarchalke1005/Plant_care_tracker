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
  sel.innerHTML = '<option value="">Select Plant</option>';
  plants.forEach(function(p){
    var o=document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
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
    title: type === 'water' ? 'Watering' : type === 'fert' ? 'Fertilizing' : 'Cutting Leaf',
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

async function renderTrackerTasks(){
  var trackerPlantSelect = document.getElementById('trackerPlantSelect');
  var trackerTaskList = document.getElementById('trackerTaskList');
  var pid = trackerPlantSelect ? trackerPlantSelect.value : '';
  var tasks = await getTrackerTasks();
  var plants = await getGalleryPlants();
  var filteredTasks = pid ? tasks.filter(t=>String(t.plantId)===String(pid)) : tasks;
  filteredTasks.sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });

  if(trackerTaskList) trackerTaskList.innerHTML='';
  filteredTasks.forEach(function(t){
    var plant = plants.find(p=>String(p.id)===String(t.plantId));
    var status = normalizeTaskStatus(t);
    var li=document.createElement('li');
    var baseCls = t.title.toLowerCase().includes('water')?'task-water':t.title.toLowerCase().includes('fert')?'task-fert':'task-other';
    li.className = baseCls + (status === 'done' ? ' task-done-row' : '') + (status === 'missed' ? ' task-missed-row' : '');

    var row = document.createElement('div');
    row.className = 'tracker-task-row';

    var text = document.createElement('span');
    text.textContent = t.date+' - '+(plant? plant.name:'Plant')+' - '+t.title;

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

async function renderTrackerCalendar(){
  var grid = document.getElementById('trackerCalendarGrid');
  var trackerPlantSelect = document.getElementById('trackerPlantSelect');
  if(!grid) return;
  grid.innerHTML='';

  var pid = trackerPlantSelect ? trackerPlantSelect.value : '';
  var tasks = await getTrackerTasks();
  var filteredTasks = pid ? tasks.filter(t=> String(t.plantId)===String(pid)) : tasks;

  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth()+1).padStart(2,'0');

  for(var i=1;i<=31;i++){
    var cell=document.createElement('div');
    cell.className='calendar-cell';
    cell.innerHTML='<span>'+i+'</span>';

    var d = y+'-'+m+'-'+String(i).padStart(2,'0');
    var dayTasks = filteredTasks.filter(function(t){
      return t.date===d && normalizeTaskStatus(t) !== 'done' && normalizeTaskStatus(t) !== 'missed';
    });
    var types = dayTasks.map(t=>t.title.toLowerCase());

    if(types.some(t=>t.includes('water')) && types.some(t=>t.includes('fert'))) cell.classList.add('both-task');
    else if(types.some(t=>t.includes('water'))) cell.classList.add('water-task');
    else if(types.some(t=>t.includes('fert'))) cell.classList.add('fert-task');
    else if(types.some(t=>t.includes('cut'))) cell.style.background = '#f8bbd0';

    grid.appendChild(cell);
  }
}

document.addEventListener('change', async function(e){
  if(e.target && e.target.id==='trackerPlantSelect'){
    await renderTrackerTasks();
    await renderTrackerCalendar();
  }
});

document.addEventListener('click', async function(e){
  if(e.target && e.target.id==='trackerAddBtn'){
    await addTrackerTask();
  }
});

document.addEventListener('click', async function(e){
  if(e.target && e.target.dataset && e.target.dataset.section==='trackerSection'){
    await fillTrackerPlantSelect();
    await renderTrackerTasks();
    await renderTrackerCalendar();
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
  var filter = filterEl ? filterEl.value : 'all';
  var selectedPlantId = plantFilterEl ? plantFilterEl.value : 'all';

  if (plantFilterEl) {
    var currentValue = selectedPlantId || 'all';
    plantFilterEl.innerHTML = '<option value="all">All Plants</option>';
    plants.forEach(function(p){
      var opt = document.createElement('option');
      opt.value = String(p.id);
      opt.textContent = p.name;
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
      '<strong>' + t.date + '</strong> - ' + (plant ? plant.name : 'Plant') + ' - ' + t.title +
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
async function checkTodayNotifications(){

  try {

    var tasks = await getTrackerTasks();
    var plants = await getGalleryPlants();
    var today = todayStr();

   var notifiedTasks = JSON.parse(localStorage.getItem("notifiedTasks") || "[]");

tasks.forEach(function(t){

  if (normalizeTaskStatus(t) !== 'pending') return;

  if(t.date === today){

    var uniqueKey = t.id + "_" + t.date;

    if(!notifiedTasks.includes(uniqueKey)){

      var plant = plants.find(p => String(p.id) === String(t.plantId));

      if(plant){

        setTimeout(function(){

          alert(
            "🌿 Plant Care Reminder\n\n" +
            "Plant: " + plant.name + "\n" +
            "Task: " + t.title + "\n" +
            "Date: " + t.date
          );

        }, 1500);

        notifiedTasks.push(uniqueKey);
        localStorage.setItem("notifiedTasks", JSON.stringify(notifiedTasks));

      }

    }

  }

});


  } catch(e){
    console.log("Notification check error", e);
  }

}

setTimeout(function(){
  checkTodayNotifications();
}, 3000);

updateAnalytics();


/******** PLANT MOOD FINAL ********/

async function loadPlantMoodPlants(){

  try{

    let plants = await getPlantsForUser() || [];
    let select = document.getElementById("plantMoodSelect");

    if(!select) return;

    select.innerHTML = "<option value=''>Select Plant</option>";

    plants.forEach(p=>{
      select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
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

    let plant = plants.find(p=> String(p.id) === String(plantId));
    let plantTasks = tasks.filter(t=> String(t.plantId) === String(plantId));

    let totalTasks = plantTasks.length;
    let doneTasks = plantTasks.filter(t => normalizeTaskStatus(t) === 'done').length;
    let missedTasks = plantTasks.filter(t => normalizeTaskStatus(t) === 'missed').length;
    let pendingTasks = plantTasks.filter(t => normalizeTaskStatus(t) === 'pending').length;

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

    document.getElementById("plantMoodResult").innerHTML = `
    <div class="mood-box ${moodClass}">
      <div class="mood-header">
        <h3 class="mood-plant-name">${plant.name}</h3>
        <span class="mood-pill">LIVE STATUS</span>
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
          <span class="mood-stat-value">${totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0}%</span>
        </div>
      </div>

      <div class="mood-quick-counts">
        <span class="mood-count-pill">✅ Done: ${doneTasks}</span>
        <span class="mood-count-pill">❌ Missed: ${missedTasks}</span>
        <span class="mood-count-pill">⏳ Pending: ${pendingTasks}</span>
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




function sendPlantDoctor(){

  let input = document.getElementById("plantDoctorInput").value.toLowerCase();
  let chat = document.getElementById("plantDoctorChatWindow");

  if(!input) return;

  chat.innerHTML += `<div class="chat-msg-user"><span>${input}</span></div>`;

  let reply = "🌿 General Care: Check watering, sunlight and soil health.";

  /* 🌿 10 UNIVERSAL SYMPTOMS */

  if(input.includes("yellow")){
    reply = "Yellow Leaves → Overwatering or nutrient deficiency.\nSolution: Reduce watering, check drainage, add fertilizer.";
  }

  else if(input.includes("brown")){
    reply = "Brown Tips → Low humidity or too much sunlight.\nSolution: Mist leaves, move to indirect light.";
  }

  else if(input.includes("drooping") || input.includes("wilting")){
    reply = "Drooping Plant → Underwatering OR root rot.\nSolution: Check soil moisture before watering.";
  }

  else if(input.includes("spots")){
    reply = "Leaf Spots → Fungal or bacterial infection.\nSolution: Remove infected leaves, apply neem oil.";
  }

  else if(input.includes("fungus") || input.includes("mold")){
    reply = "Fungus Issue → Too much moisture.\nSolution: Improve airflow and reduce watering.";
  }

  else if(input.includes("no growth") || input.includes("slow growth")){
    reply = "Slow Growth → Low light or lack of nutrients.\nSolution: Increase sunlight and fertilize monthly.";
  }

  else if(input.includes("leaf falling") || input.includes("leaves falling")){
    reply = "Leaf Drop → Stress from temperature or watering changes.\nSolution: Keep stable environment.";
  }

  else if(input.includes("pale")){
    reply = "Pale Leaves → Nitrogen deficiency.\nSolution: Use balanced fertilizer.";
  }

  else if(input.includes("holes")){
    reply = "Leaf Holes → Pest attack (caterpillars or insects).\nSolution: Use organic pest spray.";
  }

  else if(input.includes("root rot")){
    reply = "Root Rot → Overwatering and poor drainage.\nSolution: Repot plant and remove rotten roots.";
  }

  chat.innerHTML += `<div class="chat-msg-bot"><span>${reply}</span></div>`;

  document.getElementById("plantDoctorInput").value="";
  chat.scrollTop = chat.scrollHeight;
}



