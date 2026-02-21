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

