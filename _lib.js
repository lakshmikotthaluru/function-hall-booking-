const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const send = (res, code, body) => res.status(code).json(body);

// Blocks a date if a confirmed booking exists, or a pending one whose hold is still valid
async function isTaken(hallId, date) {
  const { data, error } = await db.from('bookings')
    .select('id,status,hold_expires_at')
    .eq('hall_id', hallId).eq('event_date', date)
    .in('status', ['confirmed', 'pending']);
  if (error) throw error;
  const now = Date.now();
  return data.some(b => b.status === 'confirmed' || new Date(b.hold_expires_at).getTime() > now);
}

module.exports = { db, send, isTaken };
