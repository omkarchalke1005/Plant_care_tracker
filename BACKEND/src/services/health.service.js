function getHealthPayload() {
  return {
    ok: true,
    service: 'plant-care-tracker-backend',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getHealthPayload
};
