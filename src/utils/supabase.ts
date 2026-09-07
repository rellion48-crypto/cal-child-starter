// Supabase 클라이언트 초기화 및 설정
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
};

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export async function getAuthUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getAuthSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signOut();
}

export async function isAdmin(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return false;
  const role = user.app_metadata?.role;
  return role === 'admin';
}
