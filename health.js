// Open /api/health on your deployed site to see what is misconfigured (no secrets are shown)
module.exports = async (req, res) => {
  const need = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'ADMIN_KEY'];
  const missing = need.filter(k => !process.env[k]);
  let database = 'skipped (Supabase variables missing)';
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { db } = require('./_lib');
      const { error, count } = await db.from('halls').select('id', { count: 'exact', head: true });
      database = error ? 'error: ' + error.message + ' (did you run sql/schema.sql?)' : 'ok, ' + count + ' halls found';
    } catch (e) { database = 'error: ' + e.message; }
  }
  res.status(200).json({ missing_env: missing, database });
};
