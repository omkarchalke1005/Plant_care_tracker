    /* ---------- PLANT CATALOG UI (with search) ---------- */
    function setupPlantCatalogUI() {
      var select = document.getElementById('catalogPlantSelect');
      var infoBox = document.getElementById('catalogPlantInfoBox');
      var searchInput = document.getElementById('catalogSearch');
      if (!select || !infoBox) return;

      function renderOptions(filterText) {
        select.innerHTML = '<option value="">-- Choose a plant from the list --</option>';
        var text = (filterText || '').toLowerCase();
        plantCatalog.forEach(function (p, index) {
          if (!text || p.name.toLowerCase().indexOf(text) !== -1) {
            var opt = document.createElement('option');
            opt.value = index;
            opt.textContent = p.name + ' (' + p.type + ')';
            select.appendChild(opt);
          }
        });
      }

      renderOptions('');

      if (searchInput) {
        searchInput.addEventListener('input', function () {
          renderOptions(this.value);
          infoBox.innerHTML =
            '<h3>Plant information</h3><p>Select a plant above to view description and care tips.</p>';
        });
      }

      select.addEventListener('change', function () {
        var idx = this.value;
        if (idx === '') {
          infoBox.innerHTML = '<h3>Plant information</h3><p>Select a plant above to view description and care tips.</p>';
          return;
        }
        var plant = plantCatalog[idx];

        infoBox.innerHTML =
          '<h3>' + plant.name + '</h3>' +
          '<p><strong>Type:</strong> ' + plant.type + '</p>' +
          '<p style="margin-top:0.4rem;">' + plant.info + '</p>';

        document.getElementById('plantName').value = plant.name;
        document.getElementById('plantType').value = plant.type;
        document.getElementById('initialNote').value = plant.info;
        document.getElementById('plantImageUrl').value = plant.imageUrl || '';

        // If growth stage empty, we can auto-set to Seedling or Mature
        var gs = document.getElementById('growthStage');
        if (gs && !gs.value.trim()) {
          gs.value = 'Mature';
        }
      });
    }

    async function initDashboardMain() {
      await refreshHeaderStats();
      setupPlantCatalogUI();

      // Attach growth stage auto-detect events
      var fileInput = document.getElementById('plantImageFile');
      var urlInput = document.getElementById('plantImageUrl');

      if (fileInput) {
        fileInput.addEventListener('change', function () {
          var file = this.files[0];
          if (file) {
            guessGrowthStageFromImageMeta({ fileName: file.name });
          }
        });
      }

      if (urlInput) {
        urlInput.addEventListener('change', function () {
          var url = this.value.trim();
          if (url) {
            guessGrowthStageFromImageMeta({ url: url });
          }
        });
      }

      var form = document.getElementById('addPlantForm');
      if (!form) return;
      

var form = document.getElementById('addPlantForm');
if (!form) return;

form.onsubmit = async function (e) {
  e.preventDefault();

  var name = document.getElementById('plantName').value.trim();
  var type = document.getElementById('plantType').value.trim();
  var imageUrl = document.getElementById('plantImageUrl').value.trim();
  var growth = document.getElementById('growthStage').value.trim();
  var note = document.getElementById('initialNote').value.trim();
  var fileInput = document.getElementById('plantImageFile');
  var file = fileInput.files[0];

  if (!name || !type) {
    alert('Please enter plant name and select type.');
    return;
  }

  var plant = {
    name: name,
    type: type,
    imageUrl: imageUrl || '',
    imageData: '',
    growthStage: growth || 'Seedling',
    notes: [],
    history: [],
    createdAt: todayStr()
  };

  if (note) {
    plant.notes.push({ text: note, date: plant.createdAt });
    plant.history.push({ action: 'Information note added', date: plant.createdAt });
  }

  try {
    if (file) {
      var reader = new FileReader();
      reader.onload = async function (evt) {
        plant.imageData = evt.target.result;
        await savePlant(plant);
        alert('Plant added!');
        form.reset();
        await renderPlantLibrary();
      };
      reader.readAsDataURL(file);
    } else {
      await savePlant(plant);
      alert('Plant added!');
      form.reset();
      await renderPlantLibrary();
    }
  } catch (error) {
    alert('Error saving plant.');
  }
};

    }

    /* ---------- DELETE PLANT ---------- */
    async function deletePlant(plantId) {

  if (!confirm('Are you sure you want to delete this plant? All its tasks will also be removed.')) {
    return;
  }

  try {

    await deletePlantFromDB(plantId);  // ✅ NOW THIS WILL WORK

    var currentId = getCurrentPlantId();
    if (String(currentId) === String(plantId)) {
      setCurrentPlantId('');
    }

    await renderPlantLibrary();
    await refreshHeaderStats();
    await fillTaskPlantDropdown();
    await initTracerDropdown();
    await renderTracer();
    await renderProfile();
    await renderPlantDashboard();

    alert("Plant deleted successfully!");

  } catch (error) {
    console.log(error);
    alert("Error deleting plant");
  }

}

    /* ---------- PLANT LIBRARY ---------- */
    async function renderPlantLibrary() {
      var container = document.getElementById('plantLibrary');
      if (!container) return;
      var plants = await getPlantsForUser();
      container.innerHTML = '';
      if (!plants.length) {
        container.innerHTML = '<p>You have no plants yet. Add plants from the Add Plants tab.</p>';
        return;
      }
      plants.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'plant-card';
        card.dataset.id = p.id;

        var img = document.createElement('img');
        var defaultSrc = 'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600';
        var src = p.imageData || p.imageUrl || defaultSrc;
        img.src = src;
        img.onerror = function() { this.src = defaultSrc; };

        var body = document.createElement('div');
        body.className = 'plant-card-body';

        var deleteWrapper = document.createElement('div');
        deleteWrapper.className = 'plant-delete-wrapper';
        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          await deletePlant(p.id);
          await renderPlantLibrary();
          await refreshHeaderStats();
        });
        deleteWrapper.appendChild(deleteBtn);
        body.appendChild(deleteWrapper);

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
          setCurrentPlantId(p.id);
          renderPlantDashboard();
          showAppSection('plantDashboardSection');
        });
        container.appendChild(card);
      });
    }

    /* ---------- PLANT DASHBOARD (DETAIL PAGE) ---------- */
    async function renderPlantDashboard(username) {
      var plantId = getCurrentPlantId(username);
      var infoBox = document.getElementById('plantInfo');
      var imageBox = document.getElementById('plantImageBox');
      var notesList = document.getElementById('notesList');
      var historyList = document.getElementById('historyList');
      var plants = await getPlantsForUser();
      var plant = null;
      for (var i = 0; i < plants.length; i++) {
        if (String(plants[i].id) === String(plantId)) {
          plant = plants[i];
          break;
        }
      }
      if (!plant) {
        if (imageBox) imageBox.textContent = 'Select a plant from the Plant Gallery to view its dashboard.';
        if (infoBox) infoBox.textContent = '';
        if (notesList) notesList.innerHTML = '';
        if (historyList) historyList.innerHTML = '';
        return;
      }

      var src = plant.imageData || plant.imageUrl ||
        'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600';
      imageBox.innerHTML = '<img src="' + src + '" alt="' + plant.name + '" onerror="this.src=\'https://images.pexels.com/photos/3076899/pexels-photo-3076899.jpeg?auto=compress&cs=tinysrgb&w=600\'">';

      infoBox.innerHTML =
        '<h2>' + plant.name + '</h2>' +
        '<p><span class="badge">Type: ' + plant.type + '</span>' +
        '<span class="badge">Growth: ' + plant.growthStage + '</span>' +
        '<span class="badge">Started: ' + (plant.createdAt || '-') + '</span></p>';

      notesList.innerHTML = '';
      if (!plant.notes || !plant.notes.length) {
        notesList.innerHTML = '<li>No information notes yet.</li>';
      } else {
        plant.notes.forEach(function (n) {
          var li = document.createElement('li');
          li.textContent = n.date + ' — ' + n.text;
          notesList.appendChild(li);
        });
      }

      historyList.innerHTML = '';
      if (!plant.history || !plant.history.length) {
        historyList.innerHTML = '<li>No care history yet.</li>';
      } else {
        plant.history.forEach(function (h) {
          var li2 = document.createElement('li');
          li2.textContent = h.date + ' — ' + h.action;
          historyList.appendChild(li2);
        });
      }

      document.getElementById('plantNameDash').value = plant.name;
      document.getElementById('plantTypeDash').value = plant.type;
      document.getElementById('growthStageDash').value = plant.growthStage;
      document.getElementById('plantImageUrlDash').value = plant.imageUrl || '';
    }

    async function initPlantDashboard(username) {
      var updateForm = document.getElementById('updatePlantForm');
      var noteForm = document.getElementById('addNoteFormDash');

      updateForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var plantId = getCurrentPlantId(username);
        var plants = await getPlantsForUser();
        var plant = null;
        for (var i = 0; i < plants.length; i++) {
          if (String(plants[i].id) === String(plantId)) {
            plant = plants[i];
            break;
          }
        }
        if (!plant) { alert('No plant selected from library.'); return; }

        var updatedPlant = {
          ...plant,
          name: document.getElementById('plantNameDash').value.trim() || plant.name,
          type: document.getElementById('plantTypeDash').value.trim() || plant.type,
          growthStage: document.getElementById('growthStageDash').value.trim() || plant.growthStage,
          imageUrl: document.getElementById('plantImageUrlDash').value.trim() || plant.imageUrl,
          history: [...(plant.history || []), { action: 'Plant details updated', date: todayStr() }]
        };

        try {
          await updatePlant(plantId, updatedPlant);
          alert('Plant updated!');
          await renderPlantLibrary(username);
          await renderPlantDashboard(username);
          await renderTracer(username);
          await renderProfile(username);
        } catch (error) {
          console.error('Error updating plant:', error);
          alert('Error updating plant. Please try again.');
        }
      });

      noteForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        var text = document.getElementById('noteTextDash').value.trim();
        if (!text) { alert('Enter a note.'); return; }
        var plantId = getCurrentPlantId(username);
        var plants = await getPlantsForUser();
        var plant = null;
        for (var i = 0; i < plants.length; i++) {
          if (String(plants[i].id) === String(plantId)) {
            plant = plants[i];
            break;
          }
        }
        if (!plant) { alert('No plant selected.'); return; }
        var today = todayStr();
        var updatedPlant = {
          ...plant,
          notes: [...(plant.notes || []), { text: text, date: today }],
          history: [...(plant.history || []), { action: 'Information / care note added', date: today }]
        };

        try {
          await updatePlant(plantId, updatedPlant);
          document.getElementById('noteTextDash').value = '';
          await renderPlantDashboard(username);
          await renderTracer(username);
          await renderProfile(username);
        } catch (error) {
          console.error('Error adding note:', error);
          alert('Error adding note. Please try again.');
        }
      });
    }

