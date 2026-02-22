const express = require('express');
const healthRoutes = require('./health.routes');
const plantsRoutes = require('./plants.routes');
const tasksRoutes = require('./tasks.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/plants', plantsRoutes);
router.use('/tasks', tasksRoutes);

module.exports = router;
