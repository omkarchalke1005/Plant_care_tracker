require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5500),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jsonLimit: process.env.JSON_LIMIT || '2mb'
};

module.exports = env;
