const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');

function startServer() {
  app.listen(env.port, function () {
    logger.logInfo('Plant Care Tracker backend running on http://localhost:' + env.port);
  });
}

module.exports = {
  startServer
};
