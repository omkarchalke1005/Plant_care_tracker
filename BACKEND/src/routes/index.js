const express = require('express');
const healthRoutes = require('./health.routes');
const plantsRoutes = require('./plants.routes');
const tasksRoutes = require('./tasks.routes');
const smartCareRoutes = require('./smart-care.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/plants', plantsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/recommendations/smart-care', smartCareRoutes);

module.exports = router;
