// -------------------- DASHBOARD (PER PLANT) --------------------
async function initDashboardPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();

  var user = getCurrentUser();
  var plantId = getCurrentPlantId();
  var infoBox = document.getElementById('plantInfo');
  var notesList = document.getElementById('notesList');
  var historyList = document.getElementById('historyList');
  var updateForm = document.getElementById('updatePlantForm');
  var noteForm = document.getElementById('addNoteForm');
  var imageBox = document.getElementById('plantImageBox');

  if (!plantId) {
    if (infoBox) infoBox.textContent = 'No plant selected. Please go to Plant Library and click a plant.';
    return;
  }

  var plants = await getPlantsForUser();
  var plant = null;
  for (var i = 0; i < plants.length; i++) {
    if (String(plants[i].id) === String(plantId)) {
      plant = plants[i];
      break;
    }
  }

  if (!plant) {
    if (infoBox) infoBox.textContent = 'Plant not found.';
    return;
  }

  function renderPlant() {
    if (infoBox) {
      infoBox.innerHTML =
        '<h2>' + plant.name + '</h2>' +
        '<p><span class="badge">Type: ' + plant.type + '</span>' +
        '<span class="badge">Growth: ' + plant.growthStage + '</span>' +
        '<span class="badge">Started: ' + (plant.createdAt || '-') + '</span></p>';
    }

    if (imageBox) {
      if (plant.imageUrl) {
        imageBox.innerHTML = '<img src="' + plant.imageUrl + '" alt="' + plant.name + '">';
      } else {
        imageBox.textContent = 'No picture yet. Edit plant to add an image URL.';
      }
    }

    if (notesList) {
      notesList.innerHTML = '';
      if (!plant.notes || !plant.notes.length) {
        notesList.innerHTML = '<li>No care notes yet.</li>';
      } else {
        for (var i = 0; i < plant.notes.length; i++) {
          var n = plant.notes[i];
          var li = document.createElement('li');
          li.textContent = n.date + ' — ' + n.text;
          notesList.appendChild(li);
        }
      }
    }

    if (historyList) {
      historyList.innerHTML = '';
      if (!plant.history || !plant.history.length) {
        historyList.innerHTML = '<li>No care history yet.</li>';
      } else {
        for (var j = 0; j < plant.history.length; j++) {
          var h = plant.history[j];
          var li2 = document.createElement('li');
          li2.textContent = h.date + ' — ' + h.action;
          historyList.appendChild(li2);
        }
      }
    }

    // Fill update form defaults
    if (updateForm) {
      updateForm.plantName.value = plant.name;
      updateForm.plantType.value = plant.type;
      updateForm.growthStage.value = plant.growthStage;
      updateForm.plantImageUrl.value = plant.imageUrl || '';
    }
  }

  renderPlant();

  if (updateForm) {
    updateForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var updatedPlant = {
        ...plant,
        name: updateForm.plantName.value.trim() || plant.name,
        type: updateForm.plantType.value.trim() || plant.type,
        growthStage: updateForm.growthStage.value.trim() || plant.growthStage,
        imageUrl: updateForm.plantImageUrl.value.trim(),
        history: plant.history || []
      };
      updatedPlant.history.push({
        date: new Date().toISOString().slice(0, 10),
        action: 'Plant details updated'
      });

      try {
        await updatePlant(plantId, updatedPlant);
        plant = updatedPlant;
        alert('Plant updated!');
        renderPlant();
      } catch (error) {
        alert('Error updating plant: ' + error.message);
      }
    });
  }

  if (noteForm) {
    noteForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var text = noteForm.noteText.value.trim();
      if (!text) {
        alert('Enter a note.');
        return;
      }
      var updatedPlant = {
        ...plant,
        notes: plant.notes || [],
        history: plant.history || []
      };
      var today = new Date().toISOString().slice(0, 10);
      updatedPlant.notes.push({ text: text, date: today });
      updatedPlant.history.push({ action: 'Care note added', date: today });

      try {
        await updatePlant(plantId, updatedPlant);
        plant = updatedPlant;
        noteForm.reset();
        renderPlant();
      } catch (error) {
        alert('Error adding note: ' + error.message);
      }
    });
  }
}

// -------------------- CARE TRACKER --------------------
async function initCareTrackerPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();

  var user = getCurrentUser();
  var plants = await getPlantsForUser();
  var tasks = await getTasksForUser();

  var plantSelect = document.getElementById('taskPlant');
  var taskForm = document.getElementById('taskForm');
  var upcomingList = document.getElementById('upcomingTasks');
  var pastList = document.getElementById('pastTasks');
  var monthLabel = document.getElementById('calendarMonth');
  var calendarGrid = document.getElementById('calendarGrid');

  // Fill plant dropdown
  if (plantSelect) {
    plantSelect.innerHTML = '<option value="">Select a plant</option>';
    for (var i = 0; i < plants.length; i++) {
      var opt = document.createElement('option');
      opt.value = plants[i].id;
      opt.textContent = plants[i].name;
      plantSelect.appendChild(opt);
    }
  }

  if (taskForm) {
    taskForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var plantId = taskForm.taskPlant.value;
      var title = taskForm.taskTitle.value.trim();
      var date = taskForm.taskDate.value;

      if (!plantId || !title || !date) {
        alert('Please fill all fields.');
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
        tasks = await getTasksForUser();
        renderTasksAndCalendar();
      } catch (error) {
        alert('Error adding task: ' + error.message);
      }
    });
  }

  function renderTasksAndCalendar() {
    var todayStr = new Date().toISOString().slice(0, 10);

    if (upcomingList) {
      upcomingList.innerHTML = '';
    }
    if (pastList) {
      pastList.innerHTML = '';
    }

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      var plantName = '';
      for (var j = 0; j < plants.length; j++) {
        if (String(plants[j].id) === String(t.plantId)) {
          plantName = plants[j].name;
          break;
        }
      }
      var text = t.date + ' — ' + plantName + ' — ' + t.title;

      var li = document.createElement('li');
      li.textContent = text;

      if (t.date >= todayStr) {
        if (upcomingList) upcomingList.appendChild(li);
      } else {
        if (pastList) pastList.appendChild(li);
      }
    }

    renderCalendar(tasks);
  }

  function renderCalendar(tasksArr) {
    if (!calendarGrid || !monthLabel) return;

    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth(); // 0-11
    var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    monthLabel.textContent = monthNames[month] + ' ' + year;

    calendarGrid.innerHTML = '';

    // Empty cells before first day
    for (var e = 0; e < firstDay; e++) {
      var emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-cell';
      calendarGrid.appendChild(emptyCell);
    }

    // Build a set of days that have tasks
    var daysWithTasks = {};
    for (var i = 0; i < tasksArr.length; i++) {
      var d = new Date(tasksArr[i].date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        var dayNum = d.getDate();
        daysWithTasks[dayNum] = true;
      }
    }

    // Day cells
    for (var day = 1; day <= daysInMonth; day++) {
      var cell = document.createElement('div');
      cell.className = 'calendar-cell';
      if (daysWithTasks[day]) {
        cell.className += ' has-task';
      }
      var span = document.createElement('span');
      span.textContent = day;
      cell.appendChild(span);
      calendarGrid.appendChild(cell);
    }
  }

  renderTasksAndCalendar();
}

