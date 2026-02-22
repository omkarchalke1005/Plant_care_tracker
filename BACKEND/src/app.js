const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const paths = require('./config/paths');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');
const corsConfig = require('./config/cors');

const app = express();

app.use(cors(corsConfig.buildCorsOptions()));
app.use(express.json({ limit: env.jsonLimit }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/api', notFoundHandler);

app.use(express.static(paths.frontendDir));

app.get('/backend', function (_req, res) {
  res.redirect('/');
});

app.get('*', function (_req, res) {
  res.sendFile(paths.frontendDir + '/index.html');
});

app.use(errorHandler);

module.exports = app;
