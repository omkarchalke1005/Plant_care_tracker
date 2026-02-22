function listTasks(_req, res) {
  res.status(501).json({
    ok: false,
    message: 'Tasks API scaffold is ready. Implement storage logic in controllers/services.'
  });
}

module.exports = {
  listTasks
};
