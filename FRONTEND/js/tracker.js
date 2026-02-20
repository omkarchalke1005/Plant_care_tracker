    /* ---------- CARE TRACKER ---------- */
    async function fillTaskPlantDropdown(username) {
      var select = document.getElementById('taskPlant');
      var timerSelect = document.getElementById('timerPlantSelect');
      var plants = await getPlantsForUser();
      if (select) {
        select.innerHTML = '<option value="">Select a plant</option>';
        plants.forEach(function (p) {
          var opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          select.appendChild(opt);
        });
      }
      if (timerSelect) {
        timerSelect.innerHTML = '<option value="">Select a plant</option>';
        plants.forEach(function (p) {
          var opt2 = document.createElement('option');
          opt2.value = p.id;
          opt2.textContent = p.name;
          timerSelect.appendChild(opt2);
        });
      }
      var calSelect = document.getElementById('calendarPlantSelect');
      if (calSelect) {
        calSelect.innerHTML = '<option value="">Select a plant</option>';
        plants.forEach(function (p) {
          var optc = document.createElement('option'); optc.value = p.id; optc.textContent = p.name; calSelect.appendChild(optc);
        });
        calSelect.addEventListener('change', async function () {
          var sel = calSelect.value || (plants[0] && plants[0].id);
          var tasks = await getTasksForUser() || [];
          var filtered = tasks.filter(function(t){ return String(t.plantId) === String(sel); });
          renderCalendar(filtered);
        });
      }
    }

    async function renderWaterFertLists(username) {
      var tasks = await getTasksForUser();
      var plants = await getPlantsForUser();
      var waterList = document.getElementById('waterDatesList');
      var fertList = document.getElementById('fertDatesList');
      if (!waterList || !fertList) return;
      waterList.innerHTML = '';
      fertList.innerHTML = '';

      function plantNameById(id) {
        for (var i = 0; i < plants.length; i++) {
          if (String(plants[i].id) === String(id)) return plants[i].name;
        }
        return 'Unknown plant';
      }

      var waterTasks = [];
      var fertTasks = [];

      tasks.forEach(function (t) {
        if (/water/i.test(t.title)) waterTasks.push(t);
        if (/(fertil|feed)/i.test(t.title)) fertTasks.push(t);
      });

      waterTasks.sort(function(a,b){return a.date.localeCompare(b.date);});
      fertTasks.sort(function(a,b){return a.date.localeCompare(b.date);});

      if (!waterTasks.length) {
        waterList.innerHTML = '<li>No watering tasks yet.</li>';
      } else {
        waterTasks.forEach(function (w) {
          var li = document.createElement('li');
          li.className = 'task-water';
          li.textContent = w.date + ' — ' + plantNameById(w.plantId) + ' — ' + w.title;
          waterList.appendChild(li);
        });
      }

      if (!fertTasks.length) {
        fertList.innerHTML = '<li>No fertilizer tasks yet.</li>';
      } else {
        fertTasks.forEach(function (f) {
          var li2 = document.createElement('li');
          li2.className = 'task-fert';
          li2.textContent = f.date + ' — ' + plantNameById(f.plantId) + ' — ' + f.title;
          fertList.appendChild(li2);
        });
      }
    }

    function getScheduleForPlant(plant) {
      // Indoor: water 5d, fertilize 30d; Outdoor: 3d / 20d
      if (!plant || plant.type === 'Outdoor') {
        return { water: 3, fert: 20 };
      }
      return { water: 5, fert: 30 };
    }

    function updateTimerForPlant(username) {
      var timerSelect = document.getElementById('timerPlantSelect');
      if (!timerSelect) return;
      var plants = getPlantsForUser(username);
      var tasks = getTasksForUser(username);
      var timerInfo = document.getElementById('timerInfo');
      var timerDetails = document.getElementById('timerDetails');
      timerDetails.innerHTML = '';

      if (!plants.length) {
        timerInfo.textContent = 'Add plants first to see timer details.';
        return;
      }

      var plantId = timerSelect.value || plants[0].id;
      timerSelect.value = plantId;

      var plant = null;
      for (var i = 0; i < plants.length; i++) {
        if (String(plants[i].id) === String(plantId)) { plant = plants[i]; break; }
      }
      if (!plant) return;

      var schedule = getScheduleForPlant(plant);
      timerInfo.textContent = 'Selected plant: ' + plant.name +
        ' (' + plant.type + '). Water every ' + schedule.water +
        ' days, fertilize every ' + schedule.fert + ' days.';

      var tasksForPlant = tasks.filter(function (t) {
        return Number(t.plantId) === Number(plant.id);
      });
      var waterTasks = tasksForPlant.filter(function (t) {
        return /water/i.test(t.title);
      }).sort(function(a,b){return a.date.localeCompare(b.date);});
      var fertTasks = tasksForPlant.filter(function (t) {
        return /(fertil|feed)/i.test(t.title);
      }).sort(function(a,b){return a.date.localeCompare(b.date);});

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

      var li1 = document.createElement('li');
      li1.textContent = 'Last watering: ' +
        (lastWater ? lastWater.date + ' (' + lastWater.title + ')' : 'not recorded') +
        ' | Next watering: ' + nextWaterDate +
        ' (in ' + Math.max(0, daysBetween(today, nextWaterDate)) + ' days).';
      timerDetails.appendChild(li1);

      var li2 = document.createElement('li');
      li2.textContent = 'Last fertilizer: ' +
        (lastFert ? lastFert.date + ' (' + lastFert.title + ')' : 'not recorded') +
        ' | Next fertilizer: ' + nextFertDate +
        ' (in ' + Math.max(0, daysBetween(today, nextFertDate)) + ' days).';
      timerDetails.appendChild(li2);
    }

    function renderCalendar(tasksArr) {
      var monthLabel = document.getElementById('calendarMonth');
      var calendarGrid = document.getElementById('calendarGrid');
      if (!monthLabel || !calendarGrid) return;

      var today = new Date();
      var year = today.getFullYear();
      var month = today.getMonth();
      var firstDay = new Date(year, month, 1).getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      monthLabel.textContent = monthNames[month] + ' ' + year;
      calendarGrid.innerHTML = '';

      // Map tasks by day for this month
      var dayTypes = {}; // {day: {water:bool,fert:bool}}
      tasksArr.forEach(function (t) {
        if (!t.date) return;
        var d = new Date(t.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
          var day = d.getDate();
          if (!dayTypes[day]) dayTypes[day] = { water: false, fert: false };
          if (/water/i.test(t.title)) dayTypes[day].water = true;
          if (/(fertil|feed)/i.test(t.title)) dayTypes[day].fert = true;
        }
      });

      // Empty cells before 1st
      for (var i = 0; i < firstDay; i++) {
        var emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell';
        calendarGrid.appendChild(emptyCell);
      }

      // Actual days
      for (var dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        var cell = document.createElement('div');
        cell.className = 'calendar-cell';
        var span = document.createElement('span');
        span.textContent = dayNum;
        cell.appendChild(span);

        var info = dayTypes[dayNum];
        if (info) {
          if (info.water && info.fert) {
            cell.classList.add('both-task');
          } else if (info.water) {
            cell.classList.add('water-task');
          } else if (info.fert) {
            cell.classList.add('fert-task');
          }
        }
        calendarGrid.appendChild(cell);
      }
    }

    async function renderTasksAndCalendar(username) {
      var tasks = await getTasksForUser();
      var plants = await getPlantsForUser();
      var upcomingList = document.getElementById('upcomingTasks');
      var pastList = document.getElementById('pastTasks');
      if (!upcomingList || !pastList) return;

      upcomingList.innerHTML = '';
      pastList.innerHTML = '';

      function plantNameById(id) {
        for (var i = 0; i < plants.length; i++) {
          if (String(plants[i].id) === String(id)) return plants[i].name;
        }
        return 'Unknown plant';
      }

      var today = todayStr();
      tasks.sort(function (a, b) { return a.date.localeCompare(b.date); });

      tasks.forEach(function (t) {
        var li = document.createElement('li');
        var isWater = /water/i.test(t.title);
        var isFert = /(fertil|feed)/i.test(t.title);
        if (isWater) li.className = 'task-water';
        else if (isFert) li.className = 'task-fert';
        else li.className = 'task-other';

        li.textContent = t.date + ' — ' + plantNameById(t.plantId) + ' — ' + t.title;

        if (t.date >= today) {
          upcomingList.appendChild(li);
        } else {
          pastList.appendChild(li);
        }
      });

      if (!upcomingList.children.length) {
        upcomingList.innerHTML = '<li class="task-other">No upcoming tasks.</li>';
      }
      if (!pastList.children.length) {
        pastList.innerHTML = '<li class="task-other">No past activities yet.</li>';
      }

      await renderWaterFertLists(username);
      // Render calendar for selected plant (or all tasks if none selected)
      var calSelectEl = document.getElementById('calendarPlantSelect');
      if (calSelectEl && calSelectEl.options.length) {
        var selId = calSelectEl.value || (plants[0] && plants[0].id);
        if (selId) {
          var tasksForCal = tasks.filter(function(t){ return String(t.plantId) === String(selId); });
          renderCalendar(tasksForCal);
        } else {
          renderCalendar(tasks);
        }
      } else {
        renderCalendar(tasks);
      }

    }

    async function initCareTracker() {
      await fillTaskPlantDropdown();
      // ensure calendar select has a default and triggers initial render
      setTimeout(function(){
        var cs = document.getElementById("calendarPlantSelect");
        if (cs && cs.options.length) {
          if (!cs.value) cs.value = cs.options[0].value || cs.options[0].value;
          var evt = new Event("change");
          cs.dispatchEvent(evt);
        }
      }, 50);


      var taskForm = document.getElementById('taskForm');
      var timerSelect = document.getElementById('timerPlantSelect');

      if (taskForm) {
        taskForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var plantId = document.getElementById('taskPlant').value;
          var title = document.getElementById('taskTitle').value.trim();
          var date = document.getElementById('taskDate').value;

          if (!plantId || !title || !date) {
            alert('Please select a plant, task and date.');
            return;
          }

          var task = {
            plantId: plantId,
            title: title,
            date: date
          };

          try {
            await saveTask(task);
            alert('Task added!');
            taskForm.reset();

            await refreshHeaderStats();
            await renderTracer();
            await renderProfile();
          } catch (error) {
            console.error('Error adding task:', error);
            alert('Error adding task: ' + error.message);
          }
        });
      }

      if (timerSelect) {
        timerSelect.addEventListener('change', function () {

        });
      }
    }

