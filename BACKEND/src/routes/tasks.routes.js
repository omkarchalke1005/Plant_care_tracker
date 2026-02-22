const express = require('express');
const tasksController = require('../controllers/tasks.controller');

const router = express.Router();

router.get('/', tasksController.listTasks);

module.exports = router;
