const smartCareService = require('../services/smart-care.service');

async function getSmartCareRecommendation(req, res, next) {
  try {
    var payload = await smartCareService.getSmartCarePlan(req.query || {});
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSmartCareRecommendation
};

