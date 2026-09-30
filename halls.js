const { db, send } = require('./_lib');

module.exports = async (req, res) => {
  const { data, error } = await db.from('halls')
    .select('id,name,description,capacity,price_per_day,advance_percent')
    .eq('active', true).order('price_per_day', { ascending: false });
  if (error) return send(res, 500, { error: 'Could not load halls' });
  send(res, 200, data);
};
