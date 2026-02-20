// app.js

// -------------------- FIREBASE AUTH HELPERS --------------------
let currentUser = null;

function setCurrentUser(user) {
  currentUser = user;
}

function getCurrentUser() {
  return currentUser;
}

function logout() {
  firebase.auth().signOut().then(() => {
    currentUser = null;
    window.location.href = 'login.html';
  });
}

// -------------------- FIREBASE DATA HELPERS --------------------
function getPlantsForUser() {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      resolve([]);
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('plants').get()
      .then(snapshot => {
        const plants = [];
        snapshot.forEach(doc => {
          plants.push({ id: doc.id, ...doc.data() });
        });
        resolve(plants);
      })
      .catch(error => {
        console.error('Error getting plants:', error);
        resolve([]);
      });
  });
}

function savePlant(plant) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    const plantRef = db.collection('users').doc(currentUser.uid).collection('plants').doc();
    plantRef.set(plant)
      .then(() => resolve(plantRef.id))
      .catch(error => reject(error));
  });
}

function updatePlant(plantId, plant) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('plants').doc(plantId).update(plant)
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

function deletePlant(plantId) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('plants').doc(plantId).delete()
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

function getTasksForUser() {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      resolve([]);
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('tasks').get()
      .then(snapshot => {
        const tasks = [];
        snapshot.forEach(doc => {
          tasks.push({ id: doc.id, ...doc.data() });
        });
        resolve(tasks);
      })
      .catch(error => {
        console.error('Error getting tasks:', error);
        resolve([]);
      });
  });
}

function saveTask(task) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    const taskRef = db.collection('users').doc(currentUser.uid).collection('tasks').doc();
    taskRef.set(task)
      .then(() => resolve(taskRef.id))
      .catch(error => reject(error));
  });
}

function deleteTask(taskId) {
  return new Promise((resolve, reject) => {
    if (!currentUser) {
      reject('No user logged in');
      return;
    }
    db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).delete()
      .then(() => resolve())
      .catch(error => reject(error));
  });
}

function setCurrentPlantId(id) {
  if (!currentUser) return;
  localStorage.setItem('pct_current_plant_' + currentUser.uid, String(id));
}

function getCurrentPlantId() {
  if (!currentUser) return null;
  return localStorage.getItem('pct_current_plant_' + currentUser.uid);
}

// -------------------- PAGE INITIALIZERS --------------------
function initLoginPage() {
  var form = document.getElementById('loginForm');
  var messageBox = document.getElementById('authMessage');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = form.username.value.trim();
    var password = form.password.value.trim();

    if (!username || !password) {
      messageBox.textContent = 'Please fill all fields.';
      messageBox.style.color = 'red';
      return;
    }

    // Use Firebase Auth with email (username + domain)
    var email = username + '@planttracker.com';
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        messageBox.textContent = 'Login successful!';
        messageBox.style.color = 'green';
        setCurrentUser(userCredential.user);
        window.location.href = 'home.html';
      })
      .catch((error) => {
        messageBox.textContent = error.message;
        messageBox.style.color = 'red';
      });
  });
}

function initRegisterPage() {
  var form = document.getElementById('registerForm');
  var messageBox = document.getElementById('authMessage');

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var username = form.username.value.trim();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var password = form.password.value.trim();

    if (!username || !name || !email || !password) {
      messageBox.textContent = 'Please fill all fields.';
      messageBox.style.color = 'red';
      return;
    }

    // Use Firebase Auth
    var authEmail = username + '@planttracker.com';
    firebase.auth().createUserWithEmailAndPassword(authEmail, password)
      .then((userCredential) => {
        // Save user profile to Firestore
        return db.collection('users').doc(userCredential.user.uid).set({
          username: username,
          name: name,
          email: email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        messageBox.textContent = 'Registered successfully! You can login now.';
        messageBox.style.color = 'green';
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      })
      .catch((error) => {
        messageBox.textContent = error.message;
        messageBox.style.color = 'red';
      });
  });
}

function setupNavbarForLoggedInUser() {
  var user = getCurrentUser();
  if (!user) return;
  var display = document.getElementById('usernameDisplay');
  var logoutBtn = document.getElementById('logoutBtn');
  if (display) {
    display.textContent = 'Hi, ' + (user.displayName || user.email.split('@')[0]);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      logout();
    });
  }
}

// Require login for protected pages
function requireLogin() {
  var user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// -------------------- HOME (ADD PLANT) --------------------
async function initHomePage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();

  var user = getCurrentUser();
  var form = document.getElementById('addPlantForm');
  var plantCount = document.getElementById('plantCount');
  var upcomingCount = document.getElementById('upcomingCount');

  // Update stats
  var plants = await getPlantsForUser();
  if (plantCount) plantCount.textContent = plants.length;

  var tasks = await getTasksForUser();
  var today = new Date().toISOString().slice(0, 10);
  var upcoming = 0;
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].date >= today) upcoming++;
  }
  if (upcomingCount) upcomingCount.textContent = upcoming;

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var name = form.plantName.value.trim();
    var type = form.plantType.value.trim();
    var imageUrl = form.plantImageUrl.value.trim();
    var growth = form.growthStage.value.trim();
    var note = form.initialNote.value.trim();

    if (!name || !type) {
      alert('Please enter at least plant name and type.');
      return;
    }

    var plant = {
      name: name,
      type: type,
      imageUrl: imageUrl || '',
      growthStage: growth || 'Seedling',
      notes: [],
      history: [],
      createdAt: new Date().toISOString().slice(0, 10)
    };

    if (note) {
      plant.notes.push({
        text: note,
        date: new Date().toISOString().slice(0, 10)
      });
      plant.history.push({
        action: 'Initial note added',
        date: new Date().toISOString().slice(0, 10)
      });
    }

    try {
      await savePlant(plant);
      alert('Plant added to your library!');
      form.reset();
      var updatedPlants = await getPlantsForUser();
      if (plantCount) plantCount.textContent = updatedPlants.length;
    } catch (error) {
      alert('Error adding plant: ' + error.message);
    }
  });
}

// -------------------- PLANT LIBRARY --------------------
async function initLibraryPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();

  var user = getCurrentUser();
  var plants = await getPlantsForUser();
  var container = document.getElementById('plantLibrary');

  if (!container) return;

  if (!plants.length) {
    container.innerHTML = '<p>You have no plants yet. Add plants from the Home page.</p>';
    return;
  }

  container.innerHTML = '';

  for (var i = 0; i < plants.length; i++) {
    var p = plants[i];
    var card = document.createElement('div');
    card.className = 'plant-card';
    card.setAttribute('data-id', p.id);

    var img = document.createElement('img');
    img.src = p.imageUrl || 'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600';
    img.alt = p.name;

    var body = document.createElement('div');
    body.className = 'plant-card-body';

    var nameEl = document.createElement('div');
    nameEl.className = 'plant-name';
    nameEl.textContent = p.name;

    var meta = document.createElement('div');
    meta.className = 'plant-meta';
    meta.textContent = p.type + ' • ' + (p.growthStage || 'Unknown stage');

    body.appendChild(nameEl);
    body.appendChild(meta);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener('click', function () {
      var id = this.getAttribute('data-id');
      setCurrentPlantId(id);
      window.location.href = 'dashboard.html';
    });

    container.appendChild(card);
  }
}

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

// -------------------- CONTACT PAGE --------------------
function initContactPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();

  var form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.yourName.value.trim();
    var email = form.yourEmail.value.trim();
    var message = form.yourMessage.value.trim();

    if (!name || !email || !message) {
      alert('Please fill all fields before sending.');
      return;
    }

    // Use mailto link to open default email app
    var subject = encodeURIComponent('Plant Care Tracker Support Request');
    var body = encodeURIComponent(
      'Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + message
    );
    var mailto = 'mailto:omkarplantcaretracker@gmail.com?subject=' + subject + '&body=' + body;
    window.location.href = mailto;

    alert('Your message is prepared in your email app. Thank you!');
    form.reset();
  });
}

// -------------------- ABOUT PAGE --------------------
function initAboutPage() {
  if (!requireLogin()) return;
  setupNavbarForLoggedInUser();
  // Static content only
}

// -------------------- MAIN ROUTER --------------------
document.addEventListener('DOMContentLoaded', function () {
  var page = document.body.getAttribute('data-page');

  if (page === 'login') {
    initLoginPage();
  } else if (page === 'register') {
    initRegisterPage();
  } else if (page === 'home') {
    initHomePage();
  } else if (page === 'library') {
    initLibraryPage();
  } else if (page === 'dashboard') {
    initDashboardPage();
  } else if (page === 'care-tracker') {
    initCareTrackerPage();
  } else if (page === 'contact') {
    initContactPage();
  } else if (page === 'about') {
    initAboutPage();
  }
});
