const env = require('./env');

function buildCorsOptions() {
  if (!env.corsOrigin || env.corsOrigin === '*') {
    return { origin: true, credentials: true };
  }

  const allowedOrigins = env.corsOrigin
    .split(',')
    .map(function (item) { return item.trim(); })
    .filter(Boolean);

  return {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS not allowed for origin: ' + origin));
    },
    credentials: true
  };
}

module.exports = {
  buildCorsOptions
};
