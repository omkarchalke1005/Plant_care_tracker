function listPlants(_req, res) {
  res.status(501).json({
    ok: false,
    message: 'Plants API scaffold is ready. Implement storage logic in controllers/services.'
  });
}

module.exports = {
  listPlants
};
