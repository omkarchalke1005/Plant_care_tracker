const express = require('express');
const smartCareController = require('../controllers/smart-care.controller');

const router = express.Router();

router.get('/', smartCareController.getSmartCareRecommendation);

module.exports = router;

