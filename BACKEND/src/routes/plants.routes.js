const express = require('express');
const plantsController = require('../controllers/plants.controller');

const router = express.Router();

router.get('/', plantsController.listPlants);

module.exports = router;
