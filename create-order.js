const { db, send, isTaken } = require('./_lib');

const HOLD_MINUTES = 15;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const b = req.body || {};
  const name = String(b.name || '').trim();
  const phone = String(b.phone || '').replace(/[\s-]/g, '');
  const email = String(b.email || '').trim();
  const eventType = String(b.event_type || '').trim();
  const guests = parseInt(b.guests, 10);
  const date = String(b.event_date || '');

  if (name.length < 2) return send(res, 400, { error: 'Enter your full name' });
  if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) return send(res, 400, { error: 'Enter a valid 10-digit Indian mobile number' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: 'Enter a valid email address' });
  if (!eventType) return send(res, 400, { error: 'Choose an event type' });
  if (!Number.isInteger(guests) || guests < 1) return send(res, 400, { error: 'Enter the number of guests' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return send(res, 400, { error: 'Choose an event date' });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(date + 'T00:00:00') <= today) return send(res, 400, { error: 'Choose a future date' });

  try {
    const { data: hall } = await db.from('halls').select('*').eq('id', b.hall_id).eq('active', true).single();
    if (!hall) return send(res, 404, { error: 'Hall not found' });
    if (guests > hall.capacity) return send(res, 400, { error: `This hall holds up to ${hall.capacity} guests` });
    if (await isTaken(hall.id, date)) return send(res, 409, { error: 'This date is no longer available' });

    // Amounts are always calculated on the server from the database price
    const total = hall.price_per_day;
    const advance = Math.round(total * hall.advance_percent / 100);
    const balance = total - advance;

    const { data: booking, error } = await db.from('bookings').insert({
      hall_id: hall.id, event_date: date, event_type: eventType, guests,
      customer_name: name, customer_phone: phone, customer_email: email,
      total_amount: total, advance_amount: advance, balance_amount: balance,
      hold_expires_at: new Date(Date.now() + HOLD_MINUTES * 60000).toISOString()
    }).select().single();
    if (error) throw error;

    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const rp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: advance * 100,           // paise
        currency: 'INR',
        receipt: booking.id.slice(0, 36),
        notes: { booking_id: booking.id, hall: hall.name, date }
      })
    });
    const order = await rp.json();
    if (!rp.ok) {
      await db.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
      return send(res, 502, { error: 'Payment provider error. Please try again.' });
    }
    await db.from('bookings').update({ razorpay_order_id: order.id }).eq('id', booking.id);

    send(res, 200, {
      key: process.env.RAZORPAY_KEY_ID, order_id: order.id, amount: order.amount, currency: 'INR',
      booking_id: booking.id, hall: hall.name, total, advance, balance, name, email, phone
    });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Could not start payment' });
  }
};
