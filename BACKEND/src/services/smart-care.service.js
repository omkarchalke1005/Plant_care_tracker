const https = require('https');

function httpGetJson(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, function (res) {
      var raw = '';
      res.on('data', function (chunk) {
        raw += chunk;
      });
      res.on('end', function () {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('Weather API failed with status ' + res.statusCode));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (_e) {
          reject(new Error('Invalid weather API response'));
        }
      });
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function normalizePreference(preference) {
  var value = String(preference || 'medium').toLowerCase().trim();
  if (value === 'low' || value === 'high') return value;
  return 'medium';
}

function buildWeatherUrl(lat, lon) {
  return (
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + encodeURIComponent(lat) +
    '&longitude=' + encodeURIComponent(lon) +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
    '&forecast_days=5&timezone=auto'
  );
}

function getFallbackWeatherFromCoords(lat, lon) {
  // Offline-safe fallback so API can still return usable recommendation.
  var month = new Date().getMonth() + 1;
  var warmBias = Math.max(0, 1 - (Math.abs(Number(lat) || 0) / 90));
  var seasonal = (month >= 3 && month <= 6) ? 3 : (month >= 11 || month <= 1 ? -3 : 0);
  var avgMax = 24 + (warmBias * 10) + seasonal;
  var avgMin = Math.max(8, avgMax - 10);
  var rain = month >= 6 && month <= 9 ? 7 : 2;
  return {
    daily: {
      temperature_2m_max: [avgMax, avgMax + 0.5],
      temperature_2m_min: [avgMin, avgMin + 0.5],
      precipitation_sum: [rain, rain]
    }
  };
}

function calculateRisk(weather, moisturePreference, isIndoor) {
  var daily = weather && weather.daily ? weather.daily : {};
  var maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  var minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  var rain = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [];

  var firstTwoDaysRain = (Number(rain[0]) || 0) + (Number(rain[1]) || 0);
  var firstTwoDaysMaxTemp = ((Number(maxTemps[0]) || 0) + (Number(maxTemps[1]) || 0)) / 2;
  var firstTwoDaysMinTemp = ((Number(minTemps[0]) || 0) + (Number(minTemps[1]) || 0)) / 2;

  var score = 50;
  if (firstTwoDaysMaxTemp >= 34) score += 20;
  else if (firstTwoDaysMaxTemp >= 29) score += 12;
  else if (firstTwoDaysMaxTemp <= 20) score -= 8;

  if (firstTwoDaysRain >= 15) score -= 25;
  else if (firstTwoDaysRain >= 8) score -= 15;
  else if (firstTwoDaysRain <= 1) score += 8;

  if (isIndoor) score -= 10;

  if (moisturePreference === 'high') score += 10;
  if (moisturePreference === 'low') score -= 10;

  if (firstTwoDaysMinTemp <= 10) score -= 8;

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return {
    score: score,
    rainMmNext2Days: Number(firstTwoDaysRain.toFixed(2)),
    avgMaxTempNext2Days: Number(firstTwoDaysMaxTemp.toFixed(1)),
    avgMinTempNext2Days: Number(firstTwoDaysMinTemp.toFixed(1))
  };
}

function addDays(baseDate, days) {
  var next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function buildRecommendation(input, risk) {
  var now = new Date();
  var lastWatered = input.lastWateredDate ? new Date(input.lastWateredDate + 'T00:00:00') : now;
  if (Number.isNaN(lastWatered.getTime())) {
    lastWatered = now;
  }

  var frequencyDays = 4;
  if (input.moisturePreference === 'high') frequencyDays = 2;
  if (input.moisturePreference === 'low') frequencyDays = 6;
  if (input.isIndoor) frequencyDays += 1;

  if (risk.score >= 75) frequencyDays = Math.max(1, frequencyDays - 1);
  if (risk.score <= 30) frequencyDays += 1;

  var nextWaterDate = addDays(lastWatered, frequencyDays);
  var fertilizerDays = input.isIndoor ? 28 : 21;
  if (risk.rainMmNext2Days >= 10) fertilizerDays += 7;

  var confidence = 'medium';
  if (risk.score >= 70 || risk.score <= 30) confidence = 'high';

  var notes = [];
  if (risk.avgMaxTempNext2Days >= 32) notes.push('High heat expected; check topsoil daily.');
  if (risk.rainMmNext2Days >= 8) notes.push('Rain expected; reduce watering volume.');
  if (input.isIndoor) notes.push('Indoor mode active; avoid overwatering.');
  if (!notes.length) notes.push('Normal conditions; keep regular care cycle.');

  return {
    suggestedNextWaterDate: nextWaterDate,
    suggestedWaterFrequencyDays: frequencyDays,
    suggestedFertilizerAfterDays: fertilizerDays,
    hydrationRiskScore: risk.score,
    confidence: confidence,
    notes: notes
  };
}

async function getSmartCarePlan(options) {
  var lat = Number(options.latitude);
  var lon = Number(options.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    var badLocationError = new Error('latitude and longitude are required numeric values');
    badLocationError.statusCode = 400;
    throw badLocationError;
  }

  var input = {
    plantType: String(options.plantType || 'General').trim() || 'General',
    moisturePreference: normalizePreference(options.moisturePreference),
    lastWateredDate: String(options.lastWateredDate || '').trim(),
    isIndoor: String(options.isIndoor || 'false').toLowerCase() === 'true',
    latitude: lat,
    longitude: lon
  };

  var weatherUrl = buildWeatherUrl(lat, lon);
  var weatherSource = 'open-meteo';
  var weather = null;
  try {
    weather = await httpGetJson(weatherUrl);
  } catch (_error) {
    weather = getFallbackWeatherFromCoords(lat, lon);
    weatherSource = 'fallback';
  }
  var risk = calculateRisk(weather, input.moisturePreference, input.isIndoor);
  var recommendation = buildRecommendation(input, risk);

  return {
    ok: true,
    feature: 'weather-aware-smart-care',
    source: weatherSource,
    input: input,
    weatherSnapshot: {
      rainMmNext2Days: risk.rainMmNext2Days,
      avgMaxTempNext2Days: risk.avgMaxTempNext2Days,
      avgMinTempNext2Days: risk.avgMinTempNext2Days
    },
    recommendation: recommendation
  };
}

module.exports = {
  getSmartCarePlan
};
