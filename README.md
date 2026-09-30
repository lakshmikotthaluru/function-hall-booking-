# Function Hall Booking (Vercel + Supabase + Razorpay)

Static frontend (`public/`), serverless API (`api/`), Postgres schema (`sql/schema.sql`).

## Setup
1. **Supabase**: create a free project, open SQL Editor, paste and run `sql/schema.sql` (creates tables and 3 sample halls; edit names/prices as needed).
2. **Razorpay**: create an account, copy the Test Key ID and Key Secret (Dashboard > Account & Settings > API Keys). Switch to Live keys after KYC.
3. **GitHub**: create a repo and push this folder (`git init && git add . && git commit -m "init" && git remote add origin <url> && git push -u origin main`).
4. **Vercel**: Import the repo. Framework preset: Other. Add these Environment Variables (see `.env.example`):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ADMIN_KEY`. Deploy.
5. If anything fails, open `/api/health` on your site: it lists missing environment variables and database problems.
6. Test payment with Razorpay test card/UPI, then open `/admin` and enter your `ADMIN_KEY` to see confirmed bookings.

## How payments stay correct
- Prices and the advance amount are calculated on the server from the database, never from the browser.
- Razorpay order amount is in paise (rupees x 100).
- Payment is confirmed only after the server verifies Razorpay's HMAC-SHA256 signature.
- A unique index allows only one confirmed booking per hall per date; a 15-minute hold blocks others while someone pays.
- The service-role key is used only on the server; tables have RLS enabled with no public policies.

## Known limits
- If two people pay for the same date within the hold window, the second is rejected and must be refunded from the Razorpay dashboard (logged in Vercel function logs).
- Add a Razorpay webhook (`payment.captured`) if you want confirmation even when a customer closes the browser right after paying.
- No customer email/SMS is sent; add Resend or Twilio in `verify-payment.js` if needed.
