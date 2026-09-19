// netlify/functions/paystack-challenge-webhook.js
//
// Set this URL as your Paystack webhook: https://YOUR-SITE.netlify.app/.netlify/functions/paystack-challenge-webhook
// Env vars needed in Netlify: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  const signature = event.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(event.body)
    .digest('hex');

  if (hash !== signature) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const payload = JSON.parse(event.body);

  if (payload.event === 'charge.success') {
    const { reference, customer } = payload.data;
    const email = (customer.email || '').toLowerCase().trim();

    const { error } = await supabase
      .from('challenge_participants')
      .update({ payment_status: 'paid', paystack_reference: reference })
      .eq('email', email)
      .eq('payment_status', 'pending');

    if (error) {
      console.error(error);
      return { statusCode: 500, body: 'DB error' };
    }
  }

  return { statusCode: 200, body: 'ok' };
};