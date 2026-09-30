const crypto = require('crypto');
const { db, send } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body || {};
  if (!oid || !pid || !sig) return send(res, 400, { error: 'Missing payment details' });

  // Razorpay signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${oid}|${pid}`).digest('hex');
  const a = Buffer.from(expected), c = Buffer.from(String(sig));
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return send(res, 400, { error: 'Payment verification failed' });

  const { data: booking } = await db.from('bookings').select('*').eq('razorpay_order_id', oid).single();
  if (!booking) return send(res, 404, { error: 'Booking not found' });
  if (booking.status === 'confirmed') return send(res, 200, { ok: true, booking_id: booking.id });

  const { error } = await db.from('bookings').update({
    status: 'confirmed', razorpay_payment_id: pid, paid_at: new Date().toISOString(), hold_expires_at: null
  }).eq('id', booking.id);

  if (error) {
    // 23505 = the date was confirmed by someone else first: payment must be refunded
    console.error('CONFIRM FAILED, refund payment', pid, error);
    return send(res, 409, { error: 'Date was booked by someone else. Your payment will be refunded.' });
  }
  send(res, 200, { ok: true, booking_id: booking.id });
};
