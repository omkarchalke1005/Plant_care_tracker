    /* ---------- PLANT CATALOG UI (with search) ---------- */
    function setupPlantCatalogUI() {
      var select = document.getElementById('catalogPlantSelect');
      var infoBox = document.getElementById('catalogPlantInfoBox');
      var searchInput = document.getElementById('catalogSearch');
      if (!select || !infoBox) return;

      function renderOptions(filterText) {
        select.innerHTML = '<option value="">-- Choose a plant from the list --</option>';
        var text = (filterText || '').toLowerCase();
        var count = 0;
        plantCatalog.forEach(function (p, index) {
          if (!text || p.name.toLowerCase().indexOf(text) !== -1) {
            var opt = document.createElement('option');
            opt.value = index;
            opt.textContent = p.name + ' (' + p.type + ')';
            select.appendChild(opt);
            count++;
          }
        });

        var raw = (filterText || '').trim();
        if (raw && count === 0) {
          var customOpt = document.createElement('option');
          customOpt.value = '__custom__';
          customOpt.textContent = 'Use "' + raw + '" as custom plant';
          select.appendChild(customOpt);
        }

        return {
          matches: count,
          raw: raw
        };
      }

      renderOptions('');

      if (searchInput) {
        searchInput.addEventListener('input', function () {
          var result = renderOptions(this.value);
          var raw = this.value.trim();
          if (raw) {
            if (result.matches === 0) {
              select.value = '__custom__';
              document.getElementById('plantName').value = raw;
              infoBox.innerHTML =
                '<h3>Custom plant mode</h3><p>No library match found. Your custom plant name is ready. Fill remaining fields and click Add Plant.</p>';
              if (typeof refreshAddPlantPreview === 'function') refreshAddPlantPreview();
            } else {
              infoBox.innerHTML =
                '<h3>Plant information</h3><p>Select a plant above to view description and care tips.</p>';
            }
          } else {
            infoBox.innerHTML =
              '<h3>Plant information</h3><p>Select a plant above to view description and care tips.</p>';
          }
        });

        searchInput.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          var result = renderOptions(this.value);
          var raw = this.value.trim();
          if (raw && result.matches === 0) {
            select.value = '__custom__';
            document.getElementById('plantName').value = raw;
            infoBox.innerHTML =
              '<h3>Custom plant mode</h3><p>No library match found. Your custom plant name is ready. Fill remaining fields and click Add Plant.</p>';
            if (typeof refreshAddPlantPreview === 'function') refreshAddPlantPreview();
          }
        });
      }

      select.addEventListener('change', function () {
        var idx = this.value;
        if (idx === '') {
          infoBox.innerHTML = '<h3>Plant information</h3><p>Select a plant above to view description and care tips.</p>';
          return;
        }
        if (idx === '__custom__') {
          var rawName = searchInput ? searchInput.value.trim() : '';
          if (rawName) document.getElementById('plantName').value = rawName;
          infoBox.innerHTML =
            '<h3>Custom plant selected</h3><p>Fill plant type, growth stage and notes, then click Add Plant.</p>';
          if (typeof refreshAddPlantPreview === 'function') refreshAddPlantPreview();
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

        // If growth stage empty, we can auto-set to Seedling or Mature
        var gs = document.getElementById('growthStage');
        if (gs && !gs.value.trim()) {
          gs.value = 'Mature';
        }
        if (typeof refreshAddPlantPreview === 'function') refreshAddPlantPreview();
      });
    }

    function refreshAddPlantPreview() {
      var preview = document.getElementById('addPlantPreview');
      if (!preview) return;
      var name = (document.getElementById('plantName') || {}).value || '';
      var type = (document.getElementById('plantType') || {}).value || '';
      var stage = (document.getElementById('growthStage') || {}).value || '';
      var note = (document.getElementById('initialNote') || {}).value || '';
      var fileInput = document.getElementById('plantImageFile');
      var hasFile = !!(fileInput && fileInput.files && fileInput.files[0]);

      var safeName = name.trim() || 'Plant name not set';
      var safeType = type.trim() || 'Type not selected';
      var safeStage = stage.trim() || 'Growth stage not set';
      var source = hasFile ? 'Uploaded image file' : 'No image provided';
      var notePreview = note.trim() ? note.trim().slice(0, 120) : 'No note yet.';

      preview.innerHTML =
        '<h3>Plant Preview</h3>' +
        '<p><strong>Name:</strong> ' + safeName + '</p>' +
        '<p><strong>Type:</strong> ' + safeType + '</p>' +
        '<p><strong>Growth:</strong> ' + safeStage + '</p>' +
        '<p><strong>Image:</strong> ' + source + '</p>' +
        '<p><strong>Note:</strong> ' + notePreview + '</p>';
    }

    async function initDashboardMain() {
      refreshHeaderStats();
      setupPlantCatalogUI();

      // Attach growth stage auto-detect events
      var fileInput = document.getElementById('plantImageFile');

      if (fileInput) {
        fileInput.addEventListener('change', function () {
          var file = this.files[0];
          if (file) {
            guessGrowthStageFromImageMeta({ fileName: file.name });
          }
        });
      }

      var form = document.getElementById('addPlantForm');
      if (!form) return;
      var nameInput = document.getElementById('plantName');
      var typeInput = document.getElementById('plantType');
      var stageInput = document.getElementById('growthStage');
      var noteInput = document.getElementById('initialNote');
      var imageFileInput = document.getElementById('plantImageFile');

      [nameInput, typeInput, stageInput, noteInput, imageFileInput].forEach(function (el) {
        if (!el) return;
        el.addEventListener('input', refreshAddPlantPreview);
        el.addEventListener('change', refreshAddPlantPreview);
      });

      document.querySelectorAll('.quick-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          var type = this.getAttribute('data-plant-type');
          var stage = this.getAttribute('data-growth-stage');
          if (type && typeInput) typeInput.value = type;
          if (stage && stageInput) stageInput.value = stage;
          refreshAddPlantPreview();
        });
      });
      refreshAddPlantPreview();

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
          imageUrl: '',
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
          }

          await savePlant(plant);
          await Promise.all([renderPlantLibrary(), refreshHeaderStats()]);
          form.reset();
          refreshAddPlantPreview();
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

    function resetWeatherPanel() {
      var risk = document.getElementById('weatherRiskMain');
      var nextWater = document.getElementById('weatherNextWaterMain');
      var frequency = document.getElementById('weatherFrequencyMain');
      var fertilizer = document.getElementById('weatherFertilizerMain');
      var summary = document.getElementById('weatherSummaryMain');
      var notes = document.getElementById('weatherNotesMain');

      if (risk) risk.textContent = '-';
      if (nextWater) nextWater.textContent = '-';
      if (frequency) frequency.textContent = '-';
      if (fertilizer) fertilizer.textContent = '-';
      if (summary) summary.innerHTML = '<p class="small-text">Fill details and click <strong>Get Weather Advice</strong>.</p>';
      if (notes) notes.innerHTML = '';
    }

    function renderWeatherResult(payload) {
      var recommendation = payload && payload.recommendation ? payload.recommendation : null;
      var weather = payload && payload.weatherSnapshot ? payload.weatherSnapshot : null;

      var risk = document.getElementById('weatherRiskMain');
      var nextWater = document.getElementById('weatherNextWaterMain');
      var frequency = document.getElementById('weatherFrequencyMain');
      var fertilizer = document.getElementById('weatherFertilizerMain');
      var summary = document.getElementById('weatherSummaryMain');
      var notes = document.getElementById('weatherNotesMain');

      if (!recommendation) {
        resetWeatherPanel();
        return;
      }

      if (risk) risk.textContent = String(recommendation.hydrationRiskScore) + '/100';
      if (nextWater) nextWater.textContent = recommendation.suggestedNextWaterDate || '-';
      if (frequency) frequency.textContent = String(recommendation.suggestedWaterFrequencyDays || '-') + ' days';
      if (fertilizer) fertilizer.textContent = String(recommendation.suggestedFertilizerAfterDays || '-') + ' days';

      if (summary) {
        var maxTemp = weather ? weather.avgMaxTempNext2Days : '-';
        var minTemp = weather ? weather.avgMinTempNext2Days : '-';
        var rain = weather ? weather.rainMmNext2Days : '-';
        summary.innerHTML =
          '<p><strong>Weather Snapshot (next 2 days):</strong></p>' +
          '<p class="small-text">Max Temp: ' + maxTemp + ' | Min Temp: ' + minTemp + ' | Rain: ' + rain + ' mm</p>' +
          '<p class="small-text mt-03"><strong>Confidence:</strong> ' + String(recommendation.confidence || 'medium').toUpperCase() + '</p>';
      }

      if (notes) {
        notes.innerHTML = '';
        (recommendation.notes || []).forEach(function (note) {
          var li = document.createElement('li');
          li.textContent = note;
          notes.appendChild(li);
        });
      }
    }

    async function populateWeatherPlantSelect() {
      var select = document.getElementById('weatherPlantSelectMain');
      if (!select) return;

      var plants = await getPlantsForUser();
      if (!plants.length) {
        select.innerHTML = '<option value="">No plants found</option>';
        return;
      }

      var previous = select.value;
      var nameMap = typeof buildPlantNameMap === 'function' ? buildPlantNameMap(plants) : {};
      select.innerHTML = '';
      plants.forEach(function (plant) {
        var option = document.createElement('option');
        option.value = plant.id;
        option.textContent = nameMap[String(plant.id)] || plant.name || 'Plant';
        select.appendChild(option);
      });
      select.value = previous || plants[0].id;
    }

    function buildSmartCareUrl(baseOrigin, params) {
      var query = new URLSearchParams(params);
      var path = '/api/recommendations/smart-care?' + query.toString();
      if (!baseOrigin) return path;
      return String(baseOrigin).replace(/\/+$/, '') + path;
    }

    function getSmartCareApiCandidates() {
      var currentOrigin = window.location.origin || '';
      var list = [currentOrigin, 'http://localhost:5500', 'http://127.0.0.1:5500'];
      return list.filter(function (origin, idx, arr) {
        return !!origin && arr.indexOf(origin) === idx;
      });
    }

    function computeFallbackPayload(params, weatherSnapshot, sourceName) {
      var moisture = String(params.moisturePreference || 'medium').toLowerCase();
      var isIndoor = String(params.isIndoor || 'true') === 'true';
      var rain = Number(weatherSnapshot.rainMmNext2Days || 0);
      var maxTemp = Number(weatherSnapshot.avgMaxTempNext2Days || 28);
      var minTemp = Number(weatherSnapshot.avgMinTempNext2Days || 20);

      var risk = 50;
      if (maxTemp >= 34) risk += 20;
      else if (maxTemp >= 29) risk += 12;
      else if (maxTemp <= 20) risk -= 8;
      if (rain >= 12) risk -= 22;
      else if (rain >= 6) risk -= 12;
      else if (rain <= 1) risk += 8;
      if (moisture === 'high') risk += 10;
      if (moisture === 'low') risk -= 10;
      if (isIndoor) risk -= 10;
      if (minTemp <= 10) risk -= 8;
      risk = Math.max(0, Math.min(100, Math.round(risk)));

      var freq = 4;
      if (moisture === 'high') freq = 2;
      if (moisture === 'low') freq = 6;
      if (isIndoor) freq += 1;
      if (risk >= 75) freq = Math.max(1, freq - 1);
      if (risk <= 30) freq += 1;

      var baseDate = new Date((params.lastWateredDate || todayStr()) + 'T00:00:00');
      if (Number.isNaN(baseDate.getTime())) baseDate = new Date();
      var nextWaterDate = new Date(baseDate);
      nextWaterDate.setDate(nextWaterDate.getDate() + freq);
      var fertilizerDays = isIndoor ? 28 : 21;
      if (rain >= 10) fertilizerDays += 7;

      var notes = [];
      if (maxTemp >= 32) notes.push('High heat expected; check topsoil daily.');
      if (rain >= 8) notes.push('Rain expected; reduce watering volume.');
      if (isIndoor) notes.push('Indoor mode active; avoid overwatering.');
      if (!notes.length) notes.push('Normal conditions; keep regular care cycle.');

      return {
        ok: true,
        feature: 'weather-aware-smart-care',
        source: sourceName || 'frontend-fallback',
        weatherSnapshot: weatherSnapshot,
        recommendation: {
          suggestedNextWaterDate: nextWaterDate.toISOString().slice(0, 10),
          suggestedWaterFrequencyDays: freq,
          suggestedFertilizerAfterDays: fertilizerDays,
          hydrationRiskScore: risk,
          confidence: (risk >= 70 || risk <= 30) ? 'high' : 'medium',
          notes: notes
        }
      };
    }

    async function fetchDirectWeatherFallback(params) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' +
        encodeURIComponent(params.latitude) +
        '&longitude=' + encodeURIComponent(params.longitude) +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=2&timezone=auto';

      try {
        var response = await fetch(url);
        var payload = await response.json().catch(function () { return null; });
        var daily = payload && payload.daily ? payload.daily : {};
        var maxArr = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
        var minArr = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
        var rainArr = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [];

        var weatherSnapshot = {
          rainMmNext2Days: Number(((Number(rainArr[0]) || 0) + (Number(rainArr[1]) || 0)).toFixed(2)),
          avgMaxTempNext2Days: Number((((Number(maxArr[0]) || 0) + (Number(maxArr[1]) || 0)) / 2).toFixed(1)),
          avgMinTempNext2Days: Number((((Number(minArr[0]) || 0) + (Number(minArr[1]) || 0)) / 2).toFixed(1))
        };
        return computeFallbackPayload(params, weatherSnapshot, 'frontend-open-meteo');
      } catch (_error) {
        var localSnapshot = {
          rainMmNext2Days: 3,
          avgMaxTempNext2Days: 29,
          avgMinTempNext2Days: 21
        };
        return computeFallbackPayload(params, localSnapshot, 'frontend-default');
      }
    }

    async function fetchSmartCarePayload(params) {
      var candidates = getSmartCareApiCandidates();
      var lastError = null;

      for (var i = 0; i < candidates.length; i++) {
        var origin = candidates[i];
        var url = buildSmartCareUrl(origin, params);
        try {
          var response = await fetch(url);
          var contentType = String(response.headers.get('content-type') || '').toLowerCase();
          var payload = await response.json().catch(function () { return null; });

          if (response.ok && payload && payload.ok !== false) {
            return payload;
          }

          if (response.ok && !payload && contentType.indexOf('text/html') !== -1) {
            throw new Error('Weather API route not found on ' + origin + '. Start backend on http://localhost:5500.');
          }

          throw new Error((payload && payload.message) ? payload.message : ('Weather API failed on ' + origin));
        } catch (error) {
          lastError = error;
        }
      }

      return fetchDirectWeatherFallback(params).catch(function () {
        throw (lastError || new Error('Could not reach weather API.'));
      });
    }

    async function renderGrowthTimelineSection() {
      var form = document.getElementById('weatherSmartCareFormMain');
      if (!form) return;
      await populateWeatherPlantSelect();
      resetWeatherPanel();
    }

    async function initGrowthTimelineSection() {
      if (growthTimelineInitDone) return;
      growthTimelineInitDone = true;

      var form = document.getElementById('weatherSmartCareFormMain');
      var useLocationBtn = document.getElementById('weatherUseLocationMain');
      var plantSelect = document.getElementById('weatherPlantSelectMain');
      var moistureSelect = document.getElementById('weatherMoisturePrefMain');
      var lastWateredInput = document.getElementById('weatherLastWateredMain');
      var indoorSelect = document.getElementById('weatherIndoorMain');
      var latInput = document.getElementById('weatherLatitudeMain');
      var lonInput = document.getElementById('weatherLongitudeMain');
      var summary = document.getElementById('weatherSummaryMain');

      if (lastWateredInput) lastWateredInput.value = todayStr();

      if (useLocationBtn) {
        useLocationBtn.addEventListener('click', function () {
          if (!navigator.geolocation) {
            alert('Geolocation is not supported in this browser.');
            return;
          }
          navigator.geolocation.getCurrentPosition(
            function (position) {
              if (latInput) latInput.value = String(position.coords.latitude.toFixed(6));
              if (lonInput) lonInput.value = String(position.coords.longitude.toFixed(6));
            },
            function () {
              alert('Could not fetch location. Please enter latitude and longitude manually.');
            }
          );
        });
      }

      if (!form) return;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        var lat = (latInput && latInput.value ? latInput.value.trim() : '');
        var lon = (lonInput && lonInput.value ? lonInput.value.trim() : '');
        if (!lat || !lon) {
          alert('Please provide latitude and longitude.');
          return;
        }

        var plants = await getPlantsForUser();
        var selectedPlant = plants.find(function (p) {
          return String(p.id) === String(plantSelect ? plantSelect.value : '');
        }) || null;

        var params = {
          latitude: lat,
          longitude: lon,
          plantType: selectedPlant ? String(selectedPlant.name || selectedPlant.type || 'General') : 'General',
          moisturePreference: moistureSelect ? moistureSelect.value : 'medium',
          lastWateredDate: lastWateredInput ? lastWateredInput.value : todayStr(),
          isIndoor: indoorSelect ? indoorSelect.value : 'true'
        };

        try {
          if (summary) summary.innerHTML = '<p class="small-text">Fetching weather recommendation...</p>';
          var payload = await fetchSmartCarePayload(params);
          renderWeatherResult(payload);
        } catch (error) {
          console.error('Weather advice error:', error);
          var reason = error && error.message ? error.message : 'Unknown error';
          if (summary) summary.innerHTML = '<p class="small-text">Could not fetch weather advice: ' + reason + '</p>';
        }
      });
    }

