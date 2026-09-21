import { upsertPayment, verifyPaystackSignature } from '../_shared/paystack.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const body = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';
  if (!await verifyPaystackSignature(body, signature)) return new Response('Invalid signature', { status: 401 });

  try {
    const event = JSON.parse(body);
    if (event.event === 'charge.success' && event.data?.reference) {
      const error = await upsertPayment(event.data);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ received: true });
  } catch (_error) {
    return Response.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }
});
