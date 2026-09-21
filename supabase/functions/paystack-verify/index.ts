import { paystackRequest, upsertPayment } from '../_shared/paystack.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const { reference, expectedAmountKes, phone } = await request.json();
    if (!reference || ![100, 200].includes(Number(expectedAmountKes))) {
      return Response.json({ error: 'Invalid verification details.' }, { status: 400 });
    }

    const response = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    const result = await response.json();
    const transaction = result.data;
    const verified = response.ok && result.status && transaction?.status === 'success'
      && transaction.currency === 'KES'
      && Number(transaction.amount) === Number(expectedAmountKes) * 100
      && transaction.reference === reference;

    if (!verified) return Response.json({ verified: false }, { status: 402 });
    const error = await upsertPayment(transaction, phone);
    if (error) return Response.json({ error: 'Payment was verified but could not be saved.' }, { status: 500 });
    return Response.json({ verified: true, reference });
  } catch (_error) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
});
