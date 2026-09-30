const { db, send } = require('./_lib');

module.exports = async (req, res) => {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return send(res, 401, { error: 'Unauthorized' });
  const { data, error } = await db.from('bookings')
    .select('id,event_date,event_type,guests,customer_name,customer_phone,customer_email,total_amount,advance_amount,balance_amount,status,razorpay_payment_id,created_at,halls(name)')
    .eq('status', 'confirmed').order('event_date', { ascending: true });
  if (error) return send(res, 500, { error: 'Could not load bookings' });
  send(res, 200, data);
};
