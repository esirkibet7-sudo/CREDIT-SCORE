import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type PaymentRecord = {
  id?: string;
  phone: string;
  email?: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  created_at?: string;
};

const LOCAL_PAYMENTS_KEY = 'CRB_ALL_PAYMENTS_HISTORY';

// Keep a local receipt after the server has verified the payment.
export async function recordPaymentToSupabase(payment: PaymentRecord) {
  // Ensure timestamp
  const recordToSave: PaymentRecord = {
    ...payment,
    created_at: payment.created_at || new Date().toISOString(),
  };

  // 1. Save locally to AsyncStorage
  try {
    const existingStr = await AsyncStorage.getItem(LOCAL_PAYMENTS_KEY);
    let existing: PaymentRecord[] = [];
    if (existingStr) {
      existing = JSON.parse(existingStr);
    }
    // Filter out duplicate references
    const filtered = existing.filter((p) => p.reference !== recordToSave.reference);
    const updated = [recordToSave, ...filtered];
    await AsyncStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Local payment save error:', e);
  }

  return { data: recordToSave, error: null };
}

// Fetch all successful payments (Combines Supabase DB + Local AsyncStorage)
export async function fetchSuccessfulPaymentsFromSupabase(): Promise<PaymentRecord[]> {
  let supabasePayments: PaymentRecord[] = [];
  let localPayments: PaymentRecord[] = [];

  // 1. Get from AsyncStorage
  try {
    const localStr = await AsyncStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (localStr) {
      localPayments = JSON.parse(localStr);
    }
  } catch (e) {
    console.log('Local payment read notice:', e);
  }

  // 2. Get from Supabase
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      supabasePayments = data;
    }
  } catch (err) {
    console.log('Supabase fetch exception:', err);
  }

  // 3. Merge & Deduplicate by reference
  const map = new Map<string, PaymentRecord>();

  // Add local payments first
  localPayments.forEach((p) => {
    if (p.reference) map.set(p.reference, p);
  });

  // Add/override with Supabase remote payments
  supabasePayments.forEach((p) => {
    if (p.reference) map.set(p.reference, p);
  });

  const merged = Array.from(map.values());

  // Sort descending by date
  merged.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return merged;
}
