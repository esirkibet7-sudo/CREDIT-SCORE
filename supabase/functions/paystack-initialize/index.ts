import { paystackRequest } from '../_shared/paystack.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { phone, amountKes, email } = await request.json();
    const amount = Number(amountKes);
    if (!phone || !email || ![100, 200].includes(amount)) {
      return Response.json({ error: 'Invalid payment details.' }, { status: 400 });
    }

    const reference = `CRB_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const response = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        currency: 'KES',
        reference,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paystack-callback`,
        metadata: { phone, amountKes: amount },
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      return Response.json({ error: result.message || 'Paystack initialization failed.' }, { status: 502 });
    }
    return Response.json({ authorization_url: result.data.authorization_url, reference });
  } catch (_error) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
});
