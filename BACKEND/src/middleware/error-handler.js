const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.logError('Request failed: ' + req.method + ' ' + req.originalUrl, err);

  var statusCode = err && err.statusCode ? err.statusCode : 500;
  var message = err && err.message ? err.message : 'Internal server error';

  res.status(statusCode).json({
    ok: false,
    message: message
  });
}

module.exports = errorHandler;
