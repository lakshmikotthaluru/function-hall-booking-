const { send, isTaken } = require('./_lib');

module.exports = async (req, res) => {
  const { hall_id, date } = req.query;
  if (!hall_id || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return send(res, 400, { error: 'hall_id and date (YYYY-MM-DD) required' });
  try { send(res, 200, { available: !(await isTaken(hall_id, date)) }); }
  catch (e) { send(res, 500, { error: 'Availability check failed' }); }
};
