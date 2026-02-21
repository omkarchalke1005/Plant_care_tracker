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
      refreshHeaderStats();
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

      function readFileAsDataURL(file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (evt) { resolve(evt.target.result || ''); };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      function compressImageFile(file) {
        return new Promise(function (resolve, reject) {
          var objectUrl = URL.createObjectURL(file);
          var img = new Image();
          img.onload = function () {
            try {
              var maxSize = 1280;
              var width = img.naturalWidth || img.width;
              var height = img.naturalHeight || img.height;
              var ratio = Math.min(1, maxSize / Math.max(width, height));
              var canvas = document.createElement('canvas');
              canvas.width = Math.max(1, Math.round(width * ratio));
              canvas.height = Math.max(1, Math.round(height * ratio));
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              var compressed = canvas.toDataURL('image/jpeg', 0.75);
              URL.revokeObjectURL(objectUrl);
              resolve(compressed);
            } catch (e) {
              URL.revokeObjectURL(objectUrl);
              reject(e);
            }
          };
          img.onerror = function () {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image processing failed.'));
          };
          img.src = objectUrl;
        });
      }

      form.onsubmit = async function (e) {
        e.preventDefault();

        var name = document.getElementById('plantName').value.trim();
        var type = document.getElementById('plantType').value.trim();
        var imageUrl = document.getElementById('plantImageUrl').value.trim();
        var growth = document.getElementById('growthStage').value.trim();
        var note = document.getElementById('initialNote').value.trim();
        var fileInputEl = document.getElementById('plantImageFile');
        var file = fileInputEl && fileInputEl.files ? fileInputEl.files[0] : null;
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalBtnText = submitBtn ? submitBtn.textContent : '';

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
          progressPhotos: [],
          createdAt: todayStr()
        };

        if (note) {
          plant.notes.push({ text: note, date: plant.createdAt });
          plant.history.push({ action: 'Information note added', date: plant.createdAt });
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
          }

          if (file) {
            var imageData = '';
            try {
              imageData = await compressImageFile(file);
            } catch (compressErr) {
              imageData = await readFileAsDataURL(file);
            }
            plant.imageData = imageData;
            plant.progressPhotos.push({
              date: plant.createdAt,
              caption: 'Initial photo',
              imageData: imageData,
              imageUrl: ''
            });
          } else if (plant.imageUrl) {
            plant.progressPhotos.push({
              date: plant.createdAt,
              caption: 'Initial photo',
              imageData: '',
              imageUrl: plant.imageUrl
            });
          }

          await savePlant(plant);
          await Promise.all([renderPlantLibrary(), refreshHeaderStats()]);
          form.reset();
          alert('Plant added!');
        } catch (error) {
          console.error('Error saving plant:', error);
          alert('Error saving plant.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText || 'Add Plant';
          }
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
          await renderGrowthTimelineSection();
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
          await renderGrowthTimelineSection();
          await renderTracer(username);
          await renderProfile(username);
        } catch (error) {
          console.error('Error adding note:', error);
          alert('Error adding note. Please try again.');
        }
      });
    }

    var growthTimelineInitDone = false;

    async function renderGrowthTimelineSection() {
      var select = document.getElementById('timelinePlantSelectMain');
      var gallery = document.getElementById('timelineGalleryMain');
      if (!select || !gallery) return;

      var plants = await getPlantsForUser();
      if (!plants.length) {
        select.innerHTML = '<option value="">No plants found</option>';
        gallery.innerHTML = '<p class="small-text">Add plants first to start a visual growth timeline.</p>';
        return;
      }

      var previous = select.value;
      select.innerHTML = '';
      plants.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
      select.value = previous || plants[0].id;

      var plant = plants.find(function (p) { return String(p.id) === String(select.value); }) || plants[0];
      if (!plant) return;

      var photos = (plant.progressPhotos || []).slice().sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      });

      if (!photos.length) {
        gallery.innerHTML = '<p class="small-text">No timeline photos yet for <strong>' + plant.name + '</strong>. Add your first one above.</p>';
        return;
      }

      gallery.innerHTML = '';
      photos.forEach(function (entry) {
        var card = document.createElement('div');
        card.className = 'timeline-item';
        var src = entry.imageData || entry.imageUrl || '';
        var img = document.createElement('img');
        img.src = src;
        img.alt = plant.name + ' timeline photo';
        img.onerror = function () { this.style.display = 'none'; };
        card.appendChild(img);

        var meta = document.createElement('div');
        meta.className = 'timeline-meta';
        var dt = document.createElement('div');
        dt.className = 'timeline-date';
        dt.textContent = entry.date || '-';
        var cap = document.createElement('div');
        cap.textContent = entry.caption || 'Progress update';
        meta.appendChild(dt);
        meta.appendChild(cap);
        card.appendChild(meta);
        gallery.appendChild(card);
      });
    }

    async function initGrowthTimelineSection() {
      if (growthTimelineInitDone) return;
      growthTimelineInitDone = true;

      var select = document.getElementById('timelinePlantSelectMain');
      var form = document.getElementById('growthTimelineFormMain');
      var dateInput = document.getElementById('timelineDateMain');
      if (dateInput) dateInput.value = todayStr();

      if (select) {
        select.addEventListener('change', async function () {
          await renderGrowthTimelineSection();
        });
      }

      if (!form) return;

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var plants = await getPlantsForUser();
        var plantId = select ? select.value : '';
        var plant = plants.find(function (p) { return String(p.id) === String(plantId); });
        if (!plant) { alert('Please select a valid plant first.'); return; }

        var photoDate = (document.getElementById('timelineDateMain').value || todayStr()).trim();
        var caption = document.getElementById('timelineCaptionMain').value.trim() || 'Progress update';
        var fileInput = document.getElementById('timelineImageFileMain');
        var urlInput = document.getElementById('timelineImageUrlMain');
        var imageUrl = (urlInput && urlInput.value ? urlInput.value.trim() : '');
        var file = fileInput && fileInput.files ? fileInput.files[0] : null;

        if (!file && !imageUrl) {
          alert('Upload an image file or provide an image URL.');
          return;
        }

        async function saveTimeline(imageData) {
          var updatedPlant = {
            ...plant,
            progressPhotos: [...(plant.progressPhotos || []), {
              date: photoDate,
              caption: caption,
              imageData: imageData || '',
              imageUrl: imageData ? '' : imageUrl
            }],
            history: [...(plant.history || []), { action: 'Timeline photo added', date: todayStr() }]
          };
          await updatePlant(plant.id, updatedPlant);
          form.reset();
          var dInput = document.getElementById('timelineDateMain');
          if (dInput) dInput.value = todayStr();
          await renderPlantDashboard();
          await renderGrowthTimelineSection();
          await renderTracer();
        }

        try {
          if (file) {
            var reader = new FileReader();
            reader.onload = async function (evt) {
              await saveTimeline(evt.target.result);
            };
            reader.readAsDataURL(file);
          } else {
            await saveTimeline('');
          }
        } catch (error) {
          console.error('Timeline save error:', error);
          alert('Error adding timeline photo.');
        }
      });
    }

