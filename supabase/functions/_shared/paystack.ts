import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function paystackRequest(path: string, init: RequestInit = {}) {
  return fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')!}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export async function upsertPayment(transaction: Record<string, unknown>, phone?: string) {
  const customer = (transaction.customer || {}) as Record<string, unknown>;
  const metadata = (transaction.metadata || {}) as Record<string, unknown>;
  const { error } = await supabaseAdmin.from('payments').upsert({
    phone: phone || String(metadata.phone || customer.phone || ''),
    email: String(customer.email || ''),
    amount: Number(transaction.amount || 0) / 100,
    currency: String(transaction.currency || 'KES'),
    reference: String(transaction.reference),
    status: String(transaction.status || 'success'),
    metadata: transaction,
    paid_at: transaction.paid_at || new Date().toISOString(),
  }, { onConflict: 'reference' });
  return error;
}

export async function verifyPaystackSignature(body: string, signature: string) {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return expected === signature.toLowerCase();
}
